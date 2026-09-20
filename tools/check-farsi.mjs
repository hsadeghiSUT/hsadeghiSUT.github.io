#!/usr/bin/env node
/**
 * check-farsi.mjs — the Persian typography guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Persian publication typography is the one part of this site that is not
 * open to redesign: the family, the sizes, the weights and the line heights are
 * final, and every later round of work has to leave them exactly as they are.
 * `assets/css/farsi.css` enforces that in the stylesheet. This script proves it
 * in a real browser, which is the only place the claim can actually be checked —
 * a stylesheet can be correct and still be overridden by something loaded after
 * it, or by a rule with more specificity, or by an inherited property nobody
 * thought about.
 *
 * It has already earned its keep twice. The 2026 redesign set
 * `.pub__title { font-weight: 600 }` site-wide, which pulled the Persian titles
 * off 700, and set `font-feature-settings` on `body`, which inherited into the
 * masthead's Persian name from outside `.rtl`. Both were caught here.
 *
 * WHAT IT CHECKS
 * --------------
 * The computed styles of every Persian element on the Publications page and of
 * the masthead name, against the table below — which is the measured state of
 * the site BEFORE any of the redesign work, not a set of fresh decisions.
 *
 * USAGE
 *     node tools/check-farsi.mjs            # exits non-zero on any drift
 *
 * Requires Playwright. If it is not installed the script says so and exits 0,
 * so it never blocks someone who just wants to edit the site.
 */

import { ROOT, serve, loadPlaywright } from './lib/browser.mjs';

const PORT = 8123;

/* -----------------------------------------------------------------------------
   The locked values. Sizes are in px at the default 16px root.
   -------------------------------------------------------------------------- */
const BLOCK = 14.3;   /* 0.89375rem */
const LINE  = 17.16;  /* 1.0725rem  */

const EXPECT = [
  { sel: '.rtl',                what: 'Persian block',   size: BLOCK, lh: BLOCK * 1.5,   weight: 400 },
  { sel: '.rtl .pubs > li',     what: 'list item',       size: BLOCK, lh: BLOCK * 1.385, weight: null },
  { sel: '.rtl .pub__title',    what: 'title',           size: LINE,  lh: LINE * 1.385,  weight: 700 },
  { sel: '.rtl .pub__authors',  what: 'authors',         size: LINE,  lh: LINE * 1.385,  weight: 400 },
  { sel: '.rtl .pub__details',  what: 'details',         size: LINE,  lh: LINE * 1.385,  weight: 400 },
];

/** The family every Persian element must resolve to, first name first. */
const FAMILY = 'BZar';

/** Properties that must be neutral everywhere inside `.rtl` — these are the
 *  ones a modern Latin type refresh is most likely to set on `body` and forget
 *  about, and they change Persian letterforms and digit shapes when they leak. */
const NEUTRAL = ['letterSpacing', 'wordSpacing', 'fontFeatureSettings', 'fontVariantNumeric'];

const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

const pw = loadPlaywright(import.meta.url);
if (!pw) {
  console.log('Playwright is not installed — skipping the Farsi check.');
  process.exit(0);
}

const server = await serve(ROOT, PORT);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`http://localhost:${PORT}/publications.html`);
await page.waitForSelector('.rtl .pub__title');

const failures = [];
const rows = [];

for (const rule of EXPECT) {
  const got = await page.evaluate(({ sel, neutral }) => {
    const node = document.querySelector(sel);
    if (!node) return null;
    const cs = getComputedStyle(node);
    const out = {
      family: cs.fontFamily,
      size: parseFloat(cs.fontSize),
      lh: parseFloat(cs.lineHeight),
      weight: Number(cs.fontWeight),
      direction: cs.direction,
    };
    for (const p of neutral) out[p] = cs[p];
    return out;
  }, { sel: rule.sel, neutral: NEUTRAL });

  if (!got) { failures.push(`${rule.sel} — not found on the page`); continue; }

  if (!got.family.includes(FAMILY)) failures.push(`${rule.sel} family is ${got.family}`);
  if (!near(got.size, rule.size)) failures.push(`${rule.sel} size ${got.size}px, expected ${rule.size}px`);
  if (!near(got.lh, rule.lh, 0.8)) failures.push(`${rule.sel} line-height ${got.lh}px, expected ${rule.lh.toFixed(2)}px`);
  if (rule.weight !== null && got.weight !== rule.weight) {
    failures.push(`${rule.sel} weight ${got.weight}, expected ${rule.weight}`);
  }
  for (const p of NEUTRAL) {
    if (!/^(normal|none|0px)$/.test(got[p])) failures.push(`${rule.sel} ${p} is "${got[p]}", expected normal`);
  }

  rows.push([rule.what, `${got.size}px`, `${got.lh.toFixed(2)}px`, String(got.weight), got.direction]);
}

/* The masthead name sits outside `.rtl`, which is exactly why it was missed
   once. It is checked separately for that reason. */
const mast = await page.evaluate(() => {
  const node = document.querySelector('.masthead__fa');
  if (!node) return null;
  const cs = getComputedStyle(node);
  return { family: cs.fontFamily, features: cs.fontFeatureSettings, numeric: cs.fontVariantNumeric };
});
if (mast) {
  if (!mast.family.includes(FAMILY)) failures.push(`.masthead__fa family is ${mast.family}`);
  if (!/^(normal|none)$/.test(mast.features)) failures.push(`.masthead__fa font-feature-settings is "${mast.features}"`);
  if (!/^(normal|none)$/.test(mast.numeric)) failures.push(`.masthead__fa font-variant-numeric is "${mast.numeric}"`);
}

/* The 3D hero must not have brought a stray global with it. The Persian block
   is on another page entirely, but a `body { … }` rule is a page-wide thing, so
   the guard checks the home page's masthead too. */
await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForSelector('.masthead__fa, #brand');
const homeMast = await page.evaluate(() => {
  const node = document.querySelector('.masthead__fa');
  if (!node) return null;
  const cs = getComputedStyle(node);
  return { family: cs.fontFamily, features: cs.fontFeatureSettings };
});
if (homeMast && !homeMast.family.includes(FAMILY)) {
  failures.push(`index.html .masthead__fa family is ${homeMast.family}`);
}

await browser.close();
server.close();

console.log('Persian typography — computed values in the browser\n');
console.log(['element'.padEnd(16), 'size'.padEnd(9), 'line-height'.padEnd(12), 'weight'.padEnd(7), 'dir'].join(''));
for (const r of rows) {
  console.log([r[0].padEnd(16), r[1].padEnd(9), r[2].padEnd(12), r[3].padEnd(7), r[4]].join(''));
}
console.log();

if (failures.length) {
  console.error('FARSI CHECK FAILED\n');
  for (const f of failures) console.error('  ✗ ' + f);
  console.error('\nSee the header of assets/css/farsi.css before changing anything to make this pass.');
  process.exit(1);
}
console.log('FARSI CHECK PASSED — every locked value is exactly where it was.');
