#!/usr/bin/env node
/**
 * add-gtag.mjs — add (or remove) one Google Analytics property, everywhere.
 *
 * WHY THIS EXISTS
 * ---------------
 * A measurement ID has to appear in four places for a page to be consistent:
 * the loader script, the `gtag('config', …)` call, the list of IDs in the
 * comment above them, and the count in that comment's heading — and all of that
 * in SEVEN page heads, byte for byte the same — plus `EXTRA_PROPERTIES` in
 * `tools/check-trackers.mjs`, which is the thing that will notice if a page is
 * ever missed. Twenty-nine identical edits by hand is how a page quietly ends
 * up with one tracker fewer than the others.
 *
 * So: one command. It is a convenience, not a secret — every edit it makes is
 * an edit you could make in a text editor, and README §10 spells out exactly
 * what they are, so you never have to depend on this file.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not create the property. Do that in Google Analytics first; the ID it
 * gives you (`G-XXXXXXXXXX`) is what you pass here.
 *
 * It does not add a second `dataLayer`, a second `function gtag()`, or a second
 * `gtag('js', new Date())`. Google's copy-paste snippet contains all three, and
 * pasting the whole snippet again is the one mistake this script exists to make
 * impossible: the queue and the shim are defined once and shared by every
 * property, and a second `gtag('js', …)` pushes a duplicate timestamp into
 * every session on the site. A new property needs its own loader and its own
 * `config`. Nothing else.
 *
 * USAGE
 *     node tools/add-gtag.mjs G-XXXXXXXXXX              # add
 *     node tools/add-gtag.mjs G-XXXXXXXXXX "a label"    # add, with a note
 *     node tools/add-gtag.mjs --remove G-XXXXXXXXXX     # take one out again
 *     node tools/add-gtag.mjs --list                    # what is on the site now
 *
 * Then, always:
 *     node tools/check-trackers.mjs
 *
 * It changes nothing if anything looks wrong, and running it twice with the
 * same ID is safe: the second run says the property is already there and stops.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.SITE_ROOT || '.';

/** Every page with a head. Kept explicit: a glob would pick up `legacy_index`. */
const PAGES = [
  'index.html', 'background.html', 'honors.html', 'publications.html',
  'research-team.html', 'teaching.html', 'services.html',
];

const GUARD = 'tools/check-trackers.mjs';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n) => WORDS[n] || String(n);

/* A measurement ID, in every shape Google currently hands out. */
const ID = /^(G-[A-Z0-9]{4,}|UA-\d+-\d+|AW-\d+|GT-[A-Z0-9]+|DC-\d+)$/;

const args = process.argv.slice(2);
const remove = args.includes('--remove');
const list = args.includes('--list');
const rest = args.filter((a) => !a.startsWith('--'));
const id = rest[0];
const note = rest[1] || (id && id.startsWith('G-') ? 'GA4' : '');

const die = (m) => { console.error(m); process.exit(1); };

/* ---- read the current state -------------------------------------------- */

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const pages = Object.fromEntries(PAGES.map((f) => [f, read(f)]));
const guard = read(GUARD);

/** Every ID currently configured, in the order the page configures them. */
const configured = [...pages['index.html'].matchAll(/gtag\('config', '([^']+)'\)/g)]
  .map((m) => m[1]);

if (list || !id) {
  const plural = configured.length === 1 ? 'y' : 'ies';
  console.log(`The site reports to ${count(configured.length)} propert${plural}:`);
  for (const p of configured) console.log(`    ${p}`);
  if (!list) {
    console.log('\nUsage: node tools/add-gtag.mjs G-XXXXXXXXXX [note]');
    console.log('       node tools/add-gtag.mjs --remove G-XXXXXXXXXX');
  }
  process.exit(0);
}

if (!ID.test(id)) {
  die(`"${id}" does not look like a measurement ID. Expected something like G-XXXXXXXXXX.`);
}

if (!remove && configured.includes(id)) {
  console.log(`${id} is already on every page. Nothing to do.`);
  process.exit(0);
}
if (remove && !configured.includes(id)) die(`${id} is not on the site.`);
if (remove && configured.length === 1) {
  die('That is the only property on the site. Refusing to leave it with none.');
}

/* Every page must START OUT identical, or "add the same line to all of them" is
   not a safe thing to do — one of them has already drifted, and this script
   would carry the drift forward while making it harder to see. */
const blockOf = (html) => {
  const from = html.indexOf('\t<!-- ==========================================================================\n\t     ANALYTICS');
  const to = html.indexOf('</head>');
  if (from < 0 || to < 0 || to < from) return null;
  return html.slice(from, to);
};
const blocks = PAGES.map((f) => [f, blockOf(pages[f])]);
for (const [f, b] of blocks) if (!b) die(`Could not find the analytics block in ${f}.`);
const reference = blocks[0][1];
for (const [f, b] of blocks) {
  if (b !== reference) {
    die(`The analytics block in ${f} differs from the one in ${PAGES[0]}. Reconcile them by hand first — README §10.`);
  }
}

/* ---- rewrite the block -------------------------------------------------- */

const next = remove ? configured.filter((p) => p !== id) : [...configured, id];

let block = reference;

/* 1. the count, in the heading and in the sentence about the config calls */
block = block
  .replace(/ANALYTICS — \S+ propert(?:y|ies)/,
    `ANALYTICS — ${count(next.length)} propert${next.length === 1 ? 'y' : 'ies'}`)
  .replace(/The \S+ `config` calls/, `The ${count(next.length)} \`config\` calls`);

/* 2. the list of IDs inside the comment */
const listed = /(\n\t {8}[A-Z]+[-A-Z0-9]*[^\n]*)+/;
if (!listed.test(block)) die('Could not find the list of property IDs in the analytics comment.');
const notes = Object.fromEntries(
  [...reference.matchAll(/\n\t {8}([A-Z]+[-A-Z0-9]*) +([^\n]*)/g)].map((m) => [m[1], m[2]]),
);
if (!remove) notes[id] = note;
const width = Math.max(...next.map((p) => p.length));
const rendered = next
  .map((p) => `\n\t        ${p.padEnd(width)}   ${notes[p] || ''}`.replace(/\s+$/, ''))
  .join('');
block = block.replace(listed, () => rendered);

/* 3. the config call */
if (remove) {
  block = block.replace(new RegExp(`\\n\\t\\tgtag\\('config', '${id}'\\);`), '');
} else {
  const last = `gtag('config', '${configured[configured.length - 1]}');`;
  const both = `${last}\n\t\tgtag('config', '${id}');`;
  block = block.replace(last, () => both);
}

/* 4. the loader. The first property's loader sits above the inline script and
      the rest below it, which is how the block was written; a new one goes
      after the last of them either way. */
const loader = (p) => `\t<script async src="https://www.googletagmanager.com/gtag/js?id=${p}"></script>`;
if (remove) {
  const escaped = loader(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  block = block.replace(new RegExp(`${escaped}\\n`), '');
} else {
  const lines = block.split('\n');
  let at = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('googletagmanager.com/gtag/js')) { at = i; break; }
  }
  if (at < 0) die('Could not find a loader script in the analytics block.');
  lines.splice(at + 1, 0, loader(id));
  block = lines.join('\n');
}

/* ---- write it back ------------------------------------------------------ */

/* `() => block` rather than `block`: a plain string replacement would treat a
   `$&` or a `$1` in the new text as a back-reference. There is no `$` in an
   analytics block today, and there is no reason for a future one to be able to
   corrupt seven files by containing one. */
for (const f of PAGES) {
  writeFileSync(join(ROOT, f), pages[f].replace(reference, () => block), 'utf8');
}

/* ---- and the guard, so a page that misses out is named ------------------- */

/* The first property is DISCOVERED from `legacy_index.html`, so the guard's
   array holds every property except that one. */
const array = next.filter((p) => p !== configured[0]);
const wanted = `const EXTRA_PROPERTIES = [${array.map((p) => `'${p}'`).join(', ')}];`;
const rewritten = guard.replace(/const EXTRA_PROPERTIES = \[[^\]]*\];/, wanted);
if (!rewritten.includes(wanted)) {
  die(`Could not find EXTRA_PROPERTIES in ${GUARD}. Add ${id} to it by hand.`);
}
writeFileSync(join(ROOT, GUARD), rewritten, 'utf8');

console.log(`${remove ? 'Removed' : 'Added'} ${id}.`);
console.log(`  ${PAGES.length} page heads updated`);
console.log(`  ${GUARD}: EXTRA_PROPERTIES = [${array.join(', ')}]`);
console.log(`\nThe site now reports to ${count(next.length)}: ${next.join(', ')}`);
console.log('\nNow run:  node tools/check-trackers.mjs');
