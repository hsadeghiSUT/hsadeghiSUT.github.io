#!/usr/bin/env node
/**
 * check-dropcap.mjs — the biography's drop cap must keep its two lines.
 *
 * WHY THIS IS A GUARD AND NOT JUST A STYLE
 * ----------------------------------------
 * The legacy page opened its biography with a large "H" set into the first two
 * lines of text — `<p class="aligned cap-letter">` in legacy_index.html. It is
 * the one piece of the original page's typography that is unmistakably a design
 * decision rather than a default, and it was called out by name as something
 * that has to survive every redesign. So it gets a test.
 *
 * WHAT IS ACTUALLY MEASURED
 * -------------------------
 * Not the CSS — the rendered result. The paragraph's line boxes are measured
 * with a Range, and the ones that start indented from the paragraph's left edge
 * are the lines running beside the floated cap. There must be exactly two, at
 * every width from a phone to a desktop.
 *
 * Measuring the outcome rather than the declaration matters: `font-size: 3.4em`
 * and `line-height: 0.82` only add up to two lines in combination with the
 * paragraph's own line-height, and a later change to body type could quietly
 * turn two lines into three without anyone touching the drop-cap rule.
 *
 * USAGE
 *     node tools/check-dropcap.mjs
 */

import { ROOT, serve, loadPlaywright } from './lib/browser.mjs';

const PORT = 8125;

/** Widths to check: phone, tablet, laptop, and the large-display scale-up. */
const WIDTHS = [390, 800, 1440, 2200];

/** How many lines of text must run beside the cap. */
const EXPECTED_LINES = 2;

const pw = loadPlaywright(import.meta.url);
if (!pw) {
  console.log('Playwright is not installed — skipping the drop-cap check.');
  process.exit(0);
}

const server = await serve(ROOT, PORT);
const browser = await pw.chromium.launch();
const failures = [];
const rows = [];

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForSelector('.bio__lead');

  const seen = await page.evaluate(() => {
    const para = document.querySelector('.bio__lead');
    if (!para) return null;

    const box = para.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(para);

    /* Every client rect of the range is one line box. Those starting to the
       right of the paragraph's own left edge are the ones the float pushed in.

       BOTH FILTERS ARE LOAD-BEARING, and the width one was learned the hard way.
       On a justified line the range also reports the trailing space, as its own
       rect, parked against the RIGHT margin — full line height, about five
       pixels wide. It starts a long way right of the paragraph's left edge, so
       it counted as a line the cap had pushed in, and the check failed with
       "the cap occupies 3 lines" on a cap that occupied exactly two.

       It only ever appeared at 800px and above, which made it look like a
       responsive typography bug rather than a measuring one: the biography is
       justified at those widths and left-aligned on a phone, so the phone had
       no trailing-space rects to miscount.

       Twenty pixels is the line between the two. A real line beside this cap is
       265px at the narrowest measured width; the artefact is 5.22px. */
    const rects = [...range.getClientRects()]
      .filter((r) => r.height > 4 && r.width > 20);
    const indented = rects.filter((r) => r.left > box.left + 4).length;

    const cap = getComputedStyle(para, '::first-letter');
    return {
      letter: (para.textContent || '').trim()[0],
      indented,
      float: cap.float,
      family: cap.fontFamily.split(',')[0].replace(/["']/g, ''),
      size: cap.fontSize,
      colour: cap.color,
    };
  });

  await page.close();

  if (!seen) { failures.push(`${width}px — no .bio__lead paragraph on the page`); continue; }
  if (seen.letter !== 'H') failures.push(`${width}px — the first letter is "${seen.letter}", expected "H"`);
  if (seen.float !== 'left') failures.push(`${width}px — the cap is not floated (float: ${seen.float})`);
  if (seen.indented !== EXPECTED_LINES) {
    failures.push(`${width}px — the cap occupies ${seen.indented} line(s), expected ${EXPECTED_LINES}`);
  }

  rows.push([`${width}px`, seen.letter, `${seen.indented} lines`, seen.size, seen.family]);
}

await browser.close();
server.close();

console.log('Biography drop cap — measured in the browser\n');
console.log(['width'.padEnd(9), 'letter'.padEnd(8), 'occupies'.padEnd(10), 'size'.padEnd(10), 'face'].join(''));
for (const r of rows) {
  console.log([r[0].padEnd(9), r[1].padEnd(8), r[2].padEnd(10), r[3].padEnd(10), r[4]].join(''));
}
console.log();

if (failures.length) {
  console.error('DROP-CAP CHECK FAILED\n');
  for (const f of failures) console.error('  ✗ ' + f);
  console.error('\nThe rule is `.bio__lead::first-letter` in assets/css/components.css.');
  process.exit(1);
}
console.log(`DROP-CAP CHECK PASSED — the "H" still sets into exactly ${EXPECTED_LINES} lines.`);
