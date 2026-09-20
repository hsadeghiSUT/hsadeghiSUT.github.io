#!/usr/bin/env node
/**
 * check-scholar.mjs — prove the citation figures are sound, without the network.
 *
 * WHY THIS EXISTS SEPARATELY FROM fetch-scholar.mjs
 * -------------------------------------------------
 * The fetcher needs Google. This does not, so it can run on any machine, at any
 * time, including one that could never reach Google — which is exactly the
 * machine most likely to be wondering why the figures are not on the page.
 *
 * It checks four things:
 *
 *   1. `data/scholar.json` parses, and carries the shape the browser expects.
 *   2. It is not past the age limit the browser enforces, so "why have the
 *      numbers disappeared?" has an answer here rather than in a console.
 *   3. `normaliseTitle` in `assets/js/modules/scholar.js` is still character-for-
 *      character the same function as the one in `tools/lib/scholar.mjs`. The
 *      tool writes keys with one and the browser reads them with the other; if
 *      they drift, every badge silently stops appearing and nothing errors.
 *   4. Every paper in the snapshot at or above the badge threshold still finds
 *      its publication — a report of exactly which badges the site will draw.
 *
 * USAGE
 *     node tools/check-scholar.mjs      # from the site root
 *     echo $?                           # 0 = sound, 1 = something to look at
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normaliseTitle } from './lib/scholar.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8');

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  ok    ${msg}`);

console.log('check-scholar');

/* -- 1. the snapshot parses and has the right shape ------------------------ */

let snapshot = null;
try {
  snapshot = JSON.parse(read('data', 'scholar.json'));
  pass('data/scholar.json parses');
} catch (err) {
  // Not a failure. A site that has never run the fetcher is in a valid state:
  // the figures simply do not appear. Saying so and stopping is the whole
  // report, because everything below is about a file that is not there.
  console.log(`  note  data/scholar.json is missing or unreadable (${err.code || err.message}).`);
  console.log('        The site renders without the citation figures, which is by design.');
  console.log('        Run `node tools/fetch-scholar.mjs` to create it.');
  process.exit(0);
}

const m = snapshot.metrics;
if (!m || !(m.citations > 0) || !(m.hIndex > 0) || !(m.i10Index >= 0)) {
  fail('metrics are missing or read as zero — the hero figures will not render');
} else {
  pass(`metrics: ${m.citations} citations, h ${m.hIndex}, i10 ${m.i10Index}`);
}

const papers = Array.isArray(snapshot.papers) ? snapshot.papers : [];
if (!papers.length) fail('no papers in the snapshot — no badge can be drawn');
else pass(`${papers.length} cited papers`);

/* -- 2. age -------------------------------------------------------------- */

// Read from the browser module rather than repeated here, so there is one
// number and this script cannot disagree with the page about it.
const runtime = read('assets', 'js', 'modules', 'scholar.js');
const maxAge = Number((runtime.match(/MAX_AGE_DAYS\s*=\s*(\d+)/) || [])[1]);
const minCited = Number((runtime.match(/MIN_CITED_BY\s*=\s*(\d+)/) || [])[1]);

const age = (Date.now() - Date.parse(snapshot.fetched)) / 86_400_000;
if (!Number.isFinite(age)) {
  fail(`"fetched" is not a date: ${JSON.stringify(snapshot.fetched)}`);
} else if (age > maxAge) {
  fail(`the snapshot is ${Math.round(age)} days old, past the ${maxAge}-day limit — `
    + 'the site is deliberately showing no figures. Re-run tools/fetch-scholar.mjs');
} else {
  pass(`${Math.round(age)} days old, within the ${maxAge}-day limit`);
}

/* -- 3. the two copies of normaliseTitle agree ---------------------------- */

/**
 * Compare the two implementations by behaviour rather than by text.
 *
 * Comparing source would fail on a comment; comparing output on the titles this
 * site actually carries fails only when they would really disagree about a key,
 * which is the thing that breaks the feature.
 */
const browserNormalise = (() => {
  const body = runtime.match(
    /export function normaliseTitle\(title\) \{([\s\S]*?)\n\}/,
  );
  if (!body) return null;
  try {
    // eslint-disable-next-line no-new-func
    return new Function('title', body[1]);
  } catch {
    return null;
  }
})();

if (!browserNormalise) {
  fail('could not read normaliseTitle out of assets/js/modules/scholar.js');
} else {
  const publications = JSON.parse(read('data', 'publications.json'));
  const titles = [
    ...publications.sections.flatMap((s) => s.items.map((i) => i.title)),
    ...papers.map((p) => p.title),
  ];
  const drifted = titles.find((t) => browserNormalise(t) !== normaliseTitle(t));
  if (drifted) {
    fail('the two copies of normaliseTitle disagree — no badge would ever match.\n'
      + `        first difference on: ${drifted}\n`
      + `        tools/lib/scholar.mjs      → ${JSON.stringify(normaliseTitle(drifted))}\n`
      + `        assets/js/modules/scholar.js → ${JSON.stringify(browserNormalise(drifted))}`);
  } else {
    pass(`normaliseTitle agrees across ${titles.length} titles`);
  }
}

/* -- 4. what the site will actually draw ---------------------------------- */

const publications = JSON.parse(read('data', 'publications.json'));
// The empty key is dropped deliberately. Every title in the Persian section is
// Persian script, and `normaliseTitle` keeps only [a-z0-9] — so all twenty-one
// of them reduce to "". Left in the set, that one key makes `siteKeys.has('')`
// true, and every paper whose `match` field is absent then looks matched.
// `buildSnapshot` and `citedByIndex` guard against the same thing at the point
// where they build their maps.
const siteKeys = new Set(
  publications.sections
    .flatMap((s) => s.items.map((i) => normaliseTitle(i.title)))
    .filter(Boolean),
);

const eligible = papers.filter((p) => p.citedBy >= minCited);
const orphans = eligible.filter(
  (p) => !siteKeys.has(normaliseTitle(p.title)) && !(p.match && siteKeys.has(p.match)),
);

console.log(`\n  ${eligible.length - orphans.length} of ${eligible.length} papers cited `
  + `${minCited}+ will show a badge.`);

if (orphans.length) {
  console.log('\n  No badge — the snapshot has these but data/publications.json does not:');
  for (const o of orphans) console.log(`    ${String(o.citedBy).padStart(4)}  ${o.title}`);
  console.log('\n  Add the paper, or map the two titles in data/scholar-aliases.json.');
  console.log('  This is a note, not a failure: a profile may legitimately list work');
  console.log('  that this site does not.');
}

console.log(failures ? `\n${failures} problem(s).` : '\nAll good.');
process.exit(failures ? 1 : 0);
