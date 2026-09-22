/**
 * check-canary.mjs — does a copy of this site announce itself?
 *
 * `assets/js/modules/canary.js` is the only part of the site whose whole job is
 * to behave differently depending on where it is running, which makes it the
 * one part that cannot be checked by looking at the page. It is also the part
 * whose failure is silent in both directions, and both directions are bad:
 *
 *   silent on a copy      the thing exists for nothing.
 *   noisy on the original the owner's own analytics fill up with reports about
 *                         the owner, and the signal is worthless.
 *
 * So this runs the real site on three different hostnames and checks all three.
 * The hostnames are real ones as far as the browser is concerned —
 * `--host-resolver-rules` points them at the local server — so `location.hostname`
 * is genuinely what the test says it is, rather than something stubbed.
 *
 * The event is read out of `dataLayer` rather than by stubbing `window.gtag`:
 * the analytics snippet in the page head defines `gtag` itself and would
 * overwrite any stub, which is exactly how the first version of this check
 * managed to report zero events on a page that was firing them.
 *
 * USAGE
 *     node tools/check-canary.mjs
 */

import { ROOT, serve, loadPlaywright } from './lib/browser.mjs';

const PORT = 8129;

/**
 * Hostnames that are not the site's, ones that are, and a local one.
 *
 * There are TWO homes now — the .org the world reaches and the university path
 * that is reachable from inside Iran — and the canary has to stay quiet on
 * both. That is the whole reason `origins` in site.json is a list rather than a
 * single value, and the reason this check runs more than one hostname: a
 * mirror that shouts "this is a copy" at half its visitors is worse than no
 * canary at all. See README §11.
 */
const CASES = [
  { host: 'copycat.test', expect: true, why: 'somebody else’s server' },
  { host: 'hsadeghi.org', expect: false, why: 'the site’s own domain' },
  { host: 'www.hsadeghi.org', expect: false, why: 'the same domain, with www' },
  { host: 'hamedsadeghi.org', expect: false, why: 'the second domain, same site' },
  { host: 'www.hamedsadeghi.org', expect: false, why: 'the second domain, with www' },
  { host: 'sharif.edu', expect: false, why: 'the university mirror' },
  { host: 'localhost', expect: false, why: 'local development' },
];

const pw = loadPlaywright(import.meta.url);
if (!pw) {
  console.log('Playwright is not installed — skipping the canary check.');
  process.exit(0);
}

const server = await serve(ROOT, PORT);
const browser = await pw.chromium.launch({
  args: [
    '--enable-unsafe-swiftshader',
    `--host-resolver-rules=MAP ${CASES.map((c) => c.host).join(' 127.0.0.1, MAP ')} 127.0.0.1`,
  ],
});

const failures = [];
const notes = [];
const ok = (label) => notes.push('  ok    ' + label);
const bad = (label) => failures.push(label);

for (const { host, expect, why } of CASES) {
  const page = await browser.newPage();
  const warnings = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });

  await page.goto(`http://${host}:${PORT}/index.html`);
  await page.waitForSelector('.hero', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);

  const events = await page.evaluate(() =>
    [...(window.dataLayer || [])]
      .filter((a) => a && a[0] === 'event' && a[1] === 'unlicensed_origin')
      .map((a) => a[2] || {}));

  const said = warnings.some((w) => /this page is a copy/i.test(w));

  if (expect) {
    if (!events.length) bad(`${host}: a copy did not report itself`);
    else if (events[0].origin_host !== host) {
      bad(`${host}: reported the wrong host (${events[0].origin_host})`);
    } else if (!events[0].fingerprint) {
      bad(`${host}: the report carries no fingerprint`);
    } else {
      ok(`${host} (${why}): reported — fingerprint ${events[0].fingerprint}, expected ${events[0].expected}`);
    }
    if (!said) bad(`${host}: nothing in the console for whoever inspects the copy`);
    else ok(`${host}: the console says whose page it is`);
  } else {
    if (events.length) bad(`${host} (${why}): reported itself as a copy — it is not one`);
    else ok(`${host} (${why}): silent, as it should be`);
    if (said) bad(`${host}: warned about a copy on the real site`);
  }

  await page.close();
}

/* The fingerprint has to actually be in the shipped files, or there is nothing
   to search for when a copy turns up. */
const { readFile } = await import('node:fs/promises');
const FINGERPRINT = (await readFile(new URL('../assets/js/modules/canary.js', import.meta.url), 'utf8'))
  .match(/FINGERPRINT = '([^']+)'/)?.[1];

if (!FINGERPRINT) bad('canary.js no longer declares a FINGERPRINT');
else {
  const carriers = ['assets/css/base.css', 'assets/js/main.js', 'index.html'];
  const missing = [];
  for (const file of carriers) {
    const text = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    if (!text.includes(FINGERPRINT)) missing.push(file);
  }
  if (missing.length) bad(`the fingerprint is missing from ${missing.join(', ')}`);
  else ok(`the fingerprint "${FINGERPRINT}" travels in the CSS, the JS and the HTML`);
}

await browser.close();
server.close();

console.log(notes.join('\n'));
if (failures.length) {
  console.log('\nCANARY CHECK FAILED\n');
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\nCANARY CHECK PASSED — a copy reports itself and the original stays quiet.');
