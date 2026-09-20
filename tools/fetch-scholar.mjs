#!/usr/bin/env node
/**
 * fetch-scholar.mjs — refresh `data/scholar.json` from the Google Scholar profile.
 *
 * WHY THIS IS A TOOL AND NOT SOMETHING THE PAGE DOES
 * --------------------------------------------------
 * Three reasons, any one of which would be enough.
 *
 *   1. It is not possible. Scholar sends no `Access-Control-Allow-Origin`, so a
 *      browser on hsadeghi.org cannot read the response even when it arrives.
 *      There is no public API to use instead.
 *
 *   2. It would break the site's one hard rule. `tools/check-offline.mjs` fails
 *      the build if a page loads anything from a host other than the analytics
 *      tag, and README §9 is a chapter about why. A live call to Google from
 *      the page would put a second host on the critical path of a page that
 *      currently has none.
 *
 *   3. It is the answer to the requirement. A visitor in a country that blocks
 *      Google sees the numbers anyway, because the numbers came with the page
 *      instead of from Google. Nobody waits on a request that will time out.
 *
 * So the fetch happens here, on a machine that can reach Google, whenever the
 * numbers are worth refreshing. The site reads a local file like it reads every
 * other local file.
 *
 * WHAT IT WILL NOT DO
 * -------------------
 * It never writes a snapshot it is not sure of. A captcha, a consent page, a
 * timeout, a profile with no summary table, a metrics figure that came back
 * zero — each of those aborts with a message and leaves the existing
 * `data/scholar.json` exactly as it was. The failure mode is "the numbers are
 * a month old", never "the numbers are wrong" and never "the numbers vanished".
 *
 * USAGE
 *     node tools/fetch-scholar.mjs                 # from the site root
 *     node tools/fetch-scholar.mjs --dry-run       # print, write nothing
 *     node tools/fetch-scholar.mjs --user XXXXXXX  # a different profile
 *     echo $?                                      # 0 = written, 1 = left alone
 *
 * Needs Node 18 or newer (for `fetch`). No packages, no lockfile, nothing to
 * install — the same as every other script in this folder.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  rejectionReason,
  parseMetrics,
  parseArticles,
  buildSnapshot,
} from './lib/scholar.mjs';
/* The badge threshold, read from the module that draws the badges rather than
   repeated here. The report below is about papers that WOULD earn a badge if
   their titles matched, so the two have to be the same number — and when the
   threshold moved from ten to one, a copy here would have gone quietly stale
   and under-reported the gaps. `scholar.js` has no imports and touches no DOM
   at load time, so Node reads it as happily as a browser does. */
import { MIN_CITED_BY } from '../assets/js/modules/scholar.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The profile. Also written into the snapshot, and linked from the page. */
const DEFAULT_USER = 'Hoxz8ckAAAAJ';

/** Articles per request. 100 is Scholar's maximum. */
const PAGE_SIZE = 100;

/** Give up rather than hang a terminal for a minute. */
const TIMEOUT_MS = 20_000;

/**
 * A plain desktop browser's User-Agent.
 *
 * Not a disguise — it is the same request a person makes by opening the profile
 * in Chrome, made once a month. Node's default `undici` agent string gets an
 * immediate captcha, which would make the tool useless without telling you
 * anything true about whether the profile is reachable.
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const USER = value('--user', DEFAULT_USER);
const PROFILE_URL = `https://scholar.google.com/citations?user=${USER}&hl=en`;

/** Stop with a reason, having changed nothing. */
function abort(why, detail) {
  console.error(`\nfetch-scholar: ${why}`);
  if (detail) console.error(`  ${detail}`);
  console.error('\ndata/scholar.json was NOT changed. The site keeps showing the');
  console.error('numbers it already had; if it has never had any, it shows none.');
  process.exit(1);
}

async function getPage(cstart) {
  const url = `https://scholar.google.com/citations?user=${encodeURIComponent(USER)}`
    + `&hl=en&oi=ao&cstart=${cstart}&pagesize=${PAGE_SIZE}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
    });
    if (!res.ok) abort(`Scholar answered HTTP ${res.status} for ${url}`);
    return await res.text();
  } catch (err) {
    abort(
      'could not reach scholar.google.com.',
      err && err.name === 'AbortError'
        ? `no answer within ${TIMEOUT_MS / 1000}s — blocked, or offline`
        : (err && err.message) || String(err),
    );
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`fetch-scholar: reading ${PROFILE_URL}`);

  const first = await getPage(0);
  const bad = rejectionReason(first);
  if (bad) abort(bad, 'Open the profile in a browser and try again in a few minutes.');

  const metrics = parseMetrics(first);
  if (!metrics) abort('the summary table could not be read — Scholar may have changed its markup.');
  if (!metrics.citations || !metrics.hIndex) {
    abort(
      'the summary table read as zero, which is almost certainly a parse failure.',
      `got citations=${metrics.citations}, h=${metrics.hIndex}, i10=${metrics.i10Index}`,
    );
  }

  // Page through the article list. Scholar stops sending rows past the end, so
  // an empty page is the end; the hard cap is a guard against a markup change
  // turning this into an infinite loop against someone else's server.
  const articles = parseArticles(first);
  for (let cstart = PAGE_SIZE; cstart <= 1000; cstart += PAGE_SIZE) {
    if (articles.length < cstart) break;
    const page = await getPage(cstart);
    const more = parseArticles(page);
    if (!more.length) break;
    articles.push(...more);
  }

  if (!articles.length) abort('no articles were found on the profile.');

  const publications = JSON.parse(readFileSync(join(ROOT, 'data', 'publications.json'), 'utf8'));

  // Optional, and its absence is not a problem — see the notes inside it.
  let aliases = {};
  try {
    aliases = JSON.parse(readFileSync(join(ROOT, 'data', 'scholar-aliases.json'), 'utf8'));
  } catch {
    console.log('  (no data/scholar-aliases.json — matching on titles alone)');
  }

  const { snapshot, report } = buildSnapshot({
    metrics, articles, publications, aliases, profileUrl: PROFILE_URL,
  });

  /* ---- the report ------------------------------------------------------- */
  console.log(`\n  citations ${metrics.citations}   h-index ${metrics.hIndex}   `
    + `i10-index ${metrics.i10Index}`);
  console.log(`  ${articles.length} articles on the profile, ${report.total} of them cited`);

  if (report.joined.length) {
    console.log('\n  Joined despite a spelling difference — check these read as the same paper:');
    for (const j of report.joined) {
      console.log(`    ${j.score.toFixed(3)}  scholar: ${j.scholar}`);
      console.log(`           site: ${j.site}`);
    }
  }

  if (report.aliased.length) {
    console.log('\n  Joined by hand, from data/scholar-aliases.json:');
    for (const a of report.aliased) console.log(`    ${a.site}`);
  }

  const missed = report.unmatched.filter((u) => u.citedBy >= MIN_CITED_BY);
  if (missed.length) {
    console.log(`\n  Cited ${MIN_CITED_BY}+ on Scholar but not found in data/publications.json.`);
    console.log('  These get no badge. Either the paper is not listed here, or the two');
    console.log('  titles differ enough to need an entry in data/scholar-aliases.json:');
    for (const u of missed) console.log(`    ${String(u.citedBy).padStart(4)}  ${u.title}`);
  }

  /* ---- writing ---------------------------------------------------------- */
  if (flag('--dry-run')) {
    console.log('\n--dry-run: nothing written.');
    return;
  }

  const out = join(ROOT, 'data', 'scholar.json');
  writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`\n  wrote data/scholar.json (${snapshot.papers.length} papers)`);
}

main();
