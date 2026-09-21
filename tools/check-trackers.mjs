#!/usr/bin/env node
/**
 * check-trackers.mjs — every page carries every tracker from the legacy index.
 *
 * WHY
 * ---
 * `legacy_index.html` is the original site's home page, kept in the repository
 * as the reference for what the site used to emit. It carried an analytics tag
 * and a set of meta tags. During the rebuild the analytics tag was dropped, and
 * nothing noticed for four rounds of work — precisely the failure this script
 * exists to prevent.
 *
 * It reads the legacy file, works out what has to be present, and checks each
 * page of the new site against that list.
 *
 * WHAT IT CHECKS
 *   - the Google Analytics property ID appears in the page
 *   - the gtag loader script is present
 *   - the gtag('config', …) call is present
 *   - each required meta tag is present (and, where the value must be the same
 *     on every page, that it matches)
 *   - the sequential navigation the legacy page declared, <link rel="prev"> and
 *     <link rel="next">, is still there and still points at a real page
 *
 * Per-page values — title, description, og:title, og:url, canonical — are
 * deliberately NOT required to match the legacy file. They should differ; that
 * is what makes each page findable on its own.
 *
 * USAGE
 *     node tools/check-trackers.mjs         # from the site root
 *     echo $?                               # 0 = all present, 1 = something missing
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] || '.';
const LEGACY = 'legacy_index.html';

const legacy = readFileSync(join(ROOT, LEGACY), 'utf8');

/* ---- what the legacy page declared ------------------------------------- */

const propertyId = (legacy.match(/\b(UA-\d+-\d+|G-[A-Z0-9]+)\b/) || [])[1];
if (!propertyId) {
  console.log(`No analytics property ID found in ${LEGACY} — nothing to enforce.`);
  process.exit(0);
}

/**
 * The properties added SINCE the legacy page, which by definition cannot be
 * discovered from it.
 *
 * The legacy file is the reference for everything the old site declared, and
 * that is the right reference for "did the port lose anything". It is the wrong
 * one for "is everything we have added still here", because it does not know
 * about any of it. So new properties are listed here, and the rule is the same
 * for all of them: present on every page, with their own `gtag('config', …)`.
 *
 * ADDING A PROPERTY: put its ID in this array and in the analytics block of all
 * seven pages. This check will name any page you miss. README §10.
 */
const EXTRA_PROPERTIES = ['G-2CEQVFDFL0', 'G-PVGHBG4LVB', 'G-HX1R37Y863'];
const ALL_PROPERTIES = [propertyId, ...EXTRA_PROPERTIES];

/**
 * Meta tags whose value must still MATCH THE LEGACY FILE exactly. These are the
 * identity and tracking tags; if one of them drifts, something is wrong.
 */
const LEGACY_META = [
  ['name', 'theme-color'],
  ['name', 'keywords'],
  ['http-equiv', 'X-UA-Compatible'],
  ['property', 'og:site_name'],
  ['property', 'og:type'],
  ['property', 'og:image:type'],
  ['property', 'og:image:alt'],
];

/**
 * Meta tags that must be present and IDENTICAL ACROSS THE NEW PAGES, but are
 * not compared against the legacy file. `og:image` is here because the image
 * itself is unchanged while its path moved during the restructure — pinning it
 * to the legacy path would produce a social card pointing at a 404.
 */
const CONSISTENT_META = [
  ['property', 'og:image'],
];

/** Meta tags that must exist but SHOULD differ per page. */
const PER_PAGE_META = [
  ['property', 'og:title'],
  ['property', 'og:url'],
  ['property', 'og:description'],
];

/**
 * The legacy page also declared sequential navigation:
 *
 *     <link rel="prev" title="Academic services" href="/Academic services/">
 *     <link rel="next" title="Background" href="/Background/">
 *
 * Those particular URLs were WordPress pagination and are gone, but the
 * declaration is part of what the original emitted, so the rebuild carries it
 * with targets that exist. Every page needs at least one — the first has only a
 * next, the last only a prev — and whatever it points at has to be a real file.
 */
const SEQUENTIAL = /<link[^>]*\brel\s*=\s*["'](prev|next)["'][^>]*>/gi;
const HREF = /\bhref\s*=\s*["']([^"']+)["']/i;

const metaValue = (html, attr, name) => {
  const re = new RegExp(`<meta[^>]*\\b${attr}\\s*=\\s*["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
  const tag = (html.match(re) || [])[0];
  if (!tag) return null;
  return ((tag.match(/\bcontent\s*=\s*["']([\s\S]*?)["']/i) || [])[1] ?? '').trim();
};

const legacyRequired = [];
for (const [attr, name] of LEGACY_META) {
  const v = metaValue(legacy, attr, name);
  if (v !== null) legacyRequired.push({ attr, name, value: v });
}

/** First page seen becomes the reference for the consistent-across-pages set. */
const consistentRef = new Map();

/* ---- check each page ---------------------------------------------------- */

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== LEGACY).sort();
if (!pages.length) { console.log('No pages found.'); process.exit(1); }

let failures = 0;
console.log(`Properties: ${ALL_PROPERTIES.join(', ')}   Reference: ${LEGACY}   Pages: ${pages.length}\n`);

for (const page of pages) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  const problems = [];

  for (const id of ALL_PROPERTIES) {
    if (!html.includes(id)) problems.push(`property ID ${id} absent`);
    if (!new RegExp(`gtag\\(\\s*['"]config['"]\\s*,\\s*['"]${id}['"]`).test(html)) {
      problems.push(`gtag('config', '${id}') absent`);
    }
  }
  if (!/<script[^>]+googletagmanager\.com\/gtag\/js/i.test(html)) problems.push('gtag loader <script> absent');


  for (const { attr, name, value } of legacyRequired) {
    const got = metaValue(html, attr, name);
    if (got === null) problems.push(`<meta ${attr}="${name}"> missing`);
    else if (got !== value) problems.push(`<meta ${attr}="${name}"> differs from ${LEGACY} ("${got}" vs "${value}")`);
  }
  for (const [attr, name] of CONSISTENT_META) {
    const key = `${attr}:${name}`;
    const got = metaValue(html, attr, name);
    if (got === null) { problems.push(`<meta ${attr}="${name}"> missing`); continue; }
    if (!consistentRef.has(key)) consistentRef.set(key, { page, value: got });
    else if (consistentRef.get(key).value !== got)
      problems.push(`<meta ${attr}="${name}"> differs from ${consistentRef.get(key).page}`);
  }
  for (const [attr, name] of PER_PAGE_META) {
    if (metaValue(html, attr, name) === null) problems.push(`<meta ${attr}="${name}"> missing`);
  }

  // Comments are stripped first: the pages explain this block in a comment that
  // quotes the very tags being looked for, and a checker that reads its own
  // documentation as evidence is worse than no checker.
  const sequential = html.replace(/<!--[\s\S]*?-->/g, ' ').match(SEQUENTIAL) || [];
  if (!sequential.length) {
    problems.push('<link rel="prev"/"next"> missing — the legacy page declared both');
  }
  for (const tag of sequential) {
    const href = (tag.match(HREF) || [])[1];
    if (!href) { problems.push(`${tag.slice(0, 40)}… has no href`); continue; }
    if (!pages.includes(href)) problems.push(`<link rel="…" href="${href}"> points at a page that does not exist`);
  }

  if (problems.length) {
    failures += problems.length;
    console.log(`  FAIL  ${page}`);
    for (const p of problems) console.log(`          ${p}`);
  } else {
    console.log(`  ok    ${page}`);
  }
}

console.log();
if (failures) { console.log(`TRACKER CHECK FAILED — ${failures} problem(s).`); process.exit(1); }
console.log('TRACKER CHECK PASSED — every page carries every legacy tracker.');
