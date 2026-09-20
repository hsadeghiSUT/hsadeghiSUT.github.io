#!/usr/bin/env node
/**
 * check-offline.mjs — prove the site loads nothing from the internet.
 *
 * WHY
 * ---
 * The site has to render correctly on a machine with no external network
 * access. That is easy to achieve once and easy to break later: one `@import`,
 * one CDN <script>, one `url()` pointing at a font host, and the site silently
 * depends on the internet again.
 *
 * This script scans every HTML, CSS and JS file for references that the BROWSER
 * WOULD FETCH, and fails if any of them point off-site.
 *
 * It deliberately ignores plain hyperlinks (`<a href>`, DOIs in the data files).
 * Those are destinations a visitor clicks, not assets the page loads; a site
 * with no outbound links would be useless.
 *
 * One external reference is expected and allowed: the analytics tag. It is
 * listed explicitly in ALLOWED below so that it shows up as a deliberate
 * decision rather than an oversight.
 *
 * USAGE
 *     node tools/check-offline.mjs          # from the site root
 *     echo $?                               # 0 = clean, 1 = found something
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.argv[2] || '.';

/** Hosts the site is permitted to reference in a loaded asset. */
const ALLOWED = [
  { host: 'www.googletagmanager.com', why: 'analytics tag, ported from legacy_index.html (async, non-blocking)' },
];

/** Files and folders that are not part of the shipped site. */
const SKIP = new Set(['legacy_index.html', 'legacy', 'node_modules', '.git', 'tools']);

/**
 * Patterns that represent something the browser fetches.
 * Plain <a href="…"> is deliberately absent.
 */
const LOADERS = [
  [/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi,                       'script src'],
  [/<link\b[^>]*\brel\s*=\s*["'](?:stylesheet|preload|prefetch|preconnect|dns-prefetch|modulepreload)["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi, 'link'],
  [/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["'](?:stylesheet|preload|prefetch|preconnect|dns-prefetch|modulepreload)["']/gi, 'link'],
  [/<(?:img|iframe|video|audio|source|track|embed)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, 'media src'],
  [/<use\b[^>]*\b(?:xlink:)?href\s*=\s*["']([^"']+)["']/gi,              'svg use'],
  [/@import\s+(?:url\()?["']([^"')]+)["']/gi,                            'css @import'],
  [/url\(\s*["']?([^"')]+)["']?\s*\)/gi,                                 'css url()'],
  [/\bfetch\(\s*["'`]([^"'`]+)["'`]/gi,                                  'fetch()'],
  [/\bimport\s+[^'"]*from\s*["']([^"']+)["']/gi,                         'js import'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.html', '.css', '.js', '.mjs'].includes(extname(p))) out.push(p);
  }
  return out;
}

const findings = [];
const allowedHits = [];

for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  for (const [re, kind] of LOADERS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const url = m[1].trim();
      if (!/^(https?:)?\/\//i.test(url)) continue;      // relative → local, fine
      const host = url.replace(/^(https?:)?\/\//i, '').split('/')[0];
      const allow = ALLOWED.find((a) => a.host === host);
      const line = text.slice(0, m.index).split('\n').length;
      const row = { file: relative(ROOT, file), line, kind, host, url };
      (allow ? allowedHits : findings).push(allow ? { ...row, why: allow.why } : row);
    }
  }
}

if (allowedHits.length) {
  console.log(`Allowed external references (${allowedHits.length}):`);
  const byHost = new Map();
  for (const h of allowedHits) byHost.set(h.host, (byHost.get(h.host) || 0) + 1);
  for (const [host, n] of byHost) {
    console.log(`  ${host}  ×${n}  — ${ALLOWED.find((a) => a.host === host).why}`);
  }
  console.log();
}

/* -------------------------------------------------------------------------- */
/* PORTABILITY — the same files have to work at two addresses                  */
/* -------------------------------------------------------------------------- */
/*
 * The site is served from two places: `https://hsadeghi.org/`, at a domain
 * root, and `http://sharif.edu/~hsadeghi/`, several levels down someone else's
 * host. One set of files, two very different prefixes — which works only as
 * long as every internal reference is RELATIVE.
 *
 * Two things break it, and both are easy to write by accident:
 *
 *   a leading slash   `/assets/…` means "the root of whatever host this is",
 *                     which on the university path is sharif.edu's root and not
 *                     the site's. It is correct on one of the two homes and
 *                     silently wrong on the other.
 *
 *   an absolute URL   a link that names hsadeghi.org sends a reader on the
 *                     university mirror out to the internet — and out of Iran,
 *                     which is the one thing that mirror exists to avoid.
 *
 * Metadata is the exception, and deliberately: `<link rel="canonical">` and the
 * Open Graph tags are supposed to name ONE preferred address. That is what they
 * are for, and it is why the two copies do not compete with each other in
 * search results.
 */
const PORTABLE = [
  [/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi, 'link'],
  [/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, 'script src'],
  [/<(?:img|iframe|video|audio|source|track|embed)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi, 'media src'],
  [/<use\b[^>]*\b(?:xlink:)?href\s*=\s*["']([^"']+)["']/gi, 'svg use'],
  [/\bfetch\(\s*["'`]([^"'`]+)["'`]/gi, 'fetch()'],
  [/\bimport\(\s*["']([^"']+)["']/gi, 'dynamic import'],
  [/\bimport\s+[^'"]*from\s*["']([^"']+)["']/gi, 'js import'],
];

/** Where naming one address is the whole point. */
const METADATA = /<(?:link\b[^>]*\brel\s*=\s*["']canonical["']|meta\b[^>]*\bproperty\s*=\s*["']og:)/i;

/** The site's own homes: naming either of them from inside the site is a bug. */
const OWN_HOMES = /(?:^|\.)hsadeghi\.org$|sharif\.edu$/i;

const unportable = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  for (const [re, kind] of PORTABLE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const url = m[1].trim();
      const line = text.slice(0, m.index).split('\n').length;
      const row = { file: relative(ROOT, file), line, kind, url };

      if (/^\//.test(url) && !/^\/\//.test(url)) {
        unportable.push({ ...row, why: 'root-relative — resolves to the host root, not the site' });
        continue;
      }
      const absolute = url.match(/^(?:https?:)?\/\/([^/]+)/i);
      if (!absolute) continue;
      // Metadata may name the canonical home; nothing else may.
      if (METADATA.test(text.slice(Math.max(0, m.index - 200), m.index + 1))) continue;
      const host = absolute[1].toLowerCase().replace(/:\d+$/, '');
      if (OWN_HOMES.test(host)) {
        unportable.push({ ...row, why: 'names one of the site’s own addresses — use a relative path' });
      }
    }
  }
}

if (unportable.length) {
  console.log(`PORTABILITY CHECK FAILED — ${unportable.length} reference(s) tied to one address:`);
  for (const u of unportable) console.log(`  ${u.file}:${u.line}  [${u.kind}]  ${u.url}\n      ${u.why}`);
  process.exit(1);
}
console.log('Portability: every internal reference is relative — the same files work at both addresses.\n');

if (findings.length === 0) {
  console.log('OFFLINE CHECK PASSED — no unexpected external assets.');
  process.exit(0);
}

console.log(`OFFLINE CHECK FAILED — ${findings.length} external asset reference(s):`);
for (const f of findings) console.log(`  ${f.file}:${f.line}  [${f.kind}]  ${f.url}`);
process.exit(1);
