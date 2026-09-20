#!/usr/bin/env node
/**
 * check-contrast.mjs — WCAG AA contrast guard, both colour schemes.
 *
 * WHY
 * ---
 * A redesign changes colours in dozens of places at once, and contrast failures
 * are invisible to the person making the change — the text looks fine to them
 * because they know what it says. This walks every rendered text node on every
 * page, in light and dark, works out what is actually behind it, and measures.
 *
 * It has already caught one real problem: the first accent colour chosen for the
 * 2026 redesign (#0891b2) came out at 3.27:1 on white and failed in 21 places.
 * That is why the palette now has a text-safe `--c-accent` and a separate
 * `--c-accent-bright` for graphics.
 *
 * THE THRESHOLDS
 * --------------
 * WCAG 2.1 AA: 4.5:1 for body text, 3:1 for large text (>= 24px, or >= 18.66px
 * when bold). Elements that are purely decorative, hidden, or transparent are
 * skipped, as are the SVG icons — they are not text.
 *
 * One documented exemption: anything inside `[data-logotype]`. WCAG 1.4.3
 * excludes "text that is part of a logo or brand name", and this site is
 * required to reproduce the publisher and index wordmarks in their own colours.
 * The attribute is set in one place, `brandLabel()` in chrome.js, so the list of
 * exemptions is visible in the markup instead of buried here.
 *
 * USAGE
 *     node tools/check-contrast.mjs
 */

import { ROOT, serve, loadPlaywright, PAGES } from './lib/browser.mjs';

const PORT = 8124;

/** Runs inside the page: measure every text node against its real background. */
const MEASURE = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  // Walk up the tree accumulating backgrounds until something opaque is found.
  const backdrop = (node) => {
    const stack = [];
    for (let n = node; n; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) { stack.push(bg); if (bg.a === 1) break; }
    }
    stack.push({ r: 255, g: 255, b: 255, a: 1 });
    return stack.reduceRight((acc, c) => over(c, acc));
  };

  const results = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();

  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.textContent.trim();
    if (!text) continue;
    const node = t.parentElement;
    if (!node || seen.has(node)) continue;
    seen.add(node);
    // `data-logotype` marks brand wordmarks — see brandLabel() in chrome.js.
    // WCAG 1.4.3 exempts logos and brand names from the contrast minimum.
    if (node.closest('.visually-hidden, [aria-hidden="true"], svg, [data-logotype]')) continue;

    const cs = getComputedStyle(node);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;

    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue;
    const bg = backdrop(node);
    const solid = fg.a < 1 ? over(fg, bg) : fg;

    const L1 = lum(solid), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);

    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;

    if (ratio + 0.005 < need) {
      results.push({
        text: text.slice(0, 42),
        sel: node.tagName.toLowerCase() + (node.className && typeof node.className === 'string'
          ? '.' + node.className.trim().split(/\s+/).join('.') : ''),
        ratio: Math.round(ratio * 100) / 100,
        need,
        size,
      });
    }
  }
  return results;
};

const pw = loadPlaywright(import.meta.url);
if (!pw) { console.log('Playwright is not installed — skipping the contrast check.'); process.exit(0); }

const server = await serve(ROOT, PORT);
const browser = await pw.chromium.launch();
let total = 0;
let failures = 0;

for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript((t) => {
    try { localStorage.setItem('hs-theme', t); } catch {}
  }, theme);

  for (const file of PAGES) {
    await page.goto(`http://localhost:${PORT}/${file}`);
    await page.waitForTimeout(450);
    const bad = await page.evaluate(MEASURE);
    total++;
    if (bad.length) {
      failures += bad.length;
      console.log(`\n  ${theme}  ${file} — ${bad.length} below AA`);
      for (const b of bad.slice(0, 12)) {
        console.log(`      ${String(b.ratio).padEnd(6)} (needs ${b.need})  ${b.sel}  “${b.text}”`);
      }
    }
  }
  await page.close();
}

await browser.close();
server.close();

console.log(`\n${PAGES.length} pages × 2 themes measured.`);
if (failures) {
  console.error(`CONTRAST CHECK FAILED — ${failures} element${failures === 1 ? '' : 's'} below WCAG AA.`);
  process.exit(1);
}
console.log('CONTRAST CHECK PASSED — every text element meets WCAG AA in both schemes.');
