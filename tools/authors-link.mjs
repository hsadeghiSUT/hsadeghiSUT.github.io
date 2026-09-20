#!/usr/bin/env node
/**
 * authors-link.mjs — read the filled-in worksheet and write the aliases.
 *
 * The other half of `tools/authors-export.mjs`. That one asks the question;
 * this one records the answer in `data/author-aliases.json`, which is what the
 * collaboration graph, the Impact skyline and the Influence city all read.
 *
 * WHAT IT READS
 *   author-links.csv        the `latin_key` column: the English key this
 *                           Persian name is the same person as. Blank means
 *                           "not decided", and the literal NONE marker means
 *                           "decided: this person publishes only in Persian".
 *   author-latin-pairs.csv  the `fold_a_into_b` column: for two English
 *                           spellings of one person, which key to keep.
 *
 * Both are optional; whichever is present is applied.
 *
 * CSV AND NOTHING ELSE, ON PURPOSE. The worksheet that gets filled in is
 * usually the .xlsx, because a dropdown of 115 keys beats typing one. But an
 * .xlsx is a zip of XML and reading it needs a library, and this repository
 * has no dependencies and should not grow one for a tool that runs twice a
 * year. Excel writes CSV from File > Save As in one step, so the conversion
 * costs a click and the repository stays installable by cloning it.
 *
 * IT NEVER GUESSES. A name it cannot resolve is reported and skipped, and the
 * existing aliases file is left alone unless every row parsed. A wrong merge
 * is a false claim about who wrote what, and it is invisible once made — the
 * graph simply shows one node where there were two, and looks correct.
 *
 * USAGE
 *     node tools/authors-export.mjs      # write the worksheets
 *     ... fill in the answers ...
 *     node tools/authors-link.mjs        # apply them
 *     node tools/authors-link.mjs --dry-run
 *     node tools/check-authors.mjs       # confirm the result
 */

import { readFile, writeFile } from 'node:fs/promises';
import { buildGraph } from '../assets/js/modules/explorer/data.js';

const DRY = process.argv.includes('--dry-run');
const root = (name) => new URL(`../${name}`, import.meta.url);

const NONE = /^none\b/i;

/** Minimal RFC-4180 reader: quoted fields, doubled quotes, CRLF or LF. */
function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** A CSV as objects keyed by its header row, or null if the file is absent. */
async function table(name) {
  let text;
  try { text = await readFile(root(name), 'utf8'); } catch { return null; }
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const publications = JSON.parse(await readFile(root('data/publications.json'), 'utf8'));
let existing = {};
try { existing = JSON.parse(await readFile(root('data/author-aliases.json'), 'utf8')); } catch { /* fine */ }

/* Every key the graph actually has, with aliases OFF, so an answer can be
   checked against reality rather than against a spelling. */
const bare = buildGraph(publications, {});
const known = new Set(bare.people.map((p) => p.key));

const problems = [];
const links = {};
let declaredPersianOnly = 0;

/* ---- sheet 1: Persian to English ---------------------------------------- */
const linkRows = await table('author-links.csv');
if (linkRows) {
  for (const r of linkRows) {
    const from = r.persian_key;
    const to = r.latin_key || '';
    if (!from) continue;
    if (!to) continue;                       // not decided yet
    if (NONE.test(to)) { declaredPersianOnly++; continue; }
    if (!known.has(from)) problems.push(`author-links.csv: no such author key "${from}"`);
    else if (!known.has(to)) problems.push(`author-links.csv: "${from}" points at "${to}", which is not an author key`);
    else if (from === to) problems.push(`author-links.csv: "${from}" points at itself`);
    else links[from] = to;
  }
}

/* ---- sheet 2: English spelt two ways ------------------------------------ */
const pairRows = await table('author-latin-pairs.csv');
if (pairRows) {
  for (const r of pairRows) {
    const keep = r.fold_a_into_b || '';
    if (!keep) continue;
    const a = r.key_a;
    const b = r.key_b;
    if (!known.has(a) || !known.has(b)) {
      problems.push(`author-latin-pairs.csv: "${a}" / "${b}" — one of these is not an author key`);
      continue;
    }
    if (keep !== a && keep !== b) {
      problems.push(`author-latin-pairs.csv: "${keep}" is neither "${a}" nor "${b}"`);
      continue;
    }
    links[keep === a ? b : a] = keep;
  }
}

if (!linkRows && !pairRows) {
  console.log('Neither author-links.csv nor author-latin-pairs.csv is here.');
  console.log('Run `node tools/authors-export.mjs` first, then fill one in.');
  process.exit(1);
}

/* ---- a merge must not point at another merge ----------------------------- */
/* "a -> b" and "b -> c" would leave a pointing at a key the graph no longer
   has. Following the chain to its end is the fix, and a cycle is a mistake
   worth naming rather than looping over. */
const merged = { ...Object.fromEntries(Object.entries(existing).filter(([k]) => !k.startsWith('_'))), ...links };
for (const from of Object.keys(merged)) {
  const seen = new Set([from]);
  let to = merged[from];
  while (merged[to]) {
    if (seen.has(to)) { problems.push(`alias cycle through "${from}"`); break; }
    seen.add(to);
    to = merged[to];
  }
  merged[from] = to;
}

if (problems.length) {
  console.log(`${problems.length} problem(s) — nothing was written:\n`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}

/* ---- write it back, comments and all ------------------------------------- */
/* The two section markers are written where they belong, between the blocks
   they label — so they are deliberately NOT copied by the loop that carries
   the rest of the underscore keys over. Copying them there once put
   `_latin_variants` above the Persian block, because a JavaScript object keeps
   the position a key was FIRST inserted at and assigning it again later does
   not move it. The file still parsed and the graph still built; it just read
   as though the labels had swapped places. */
const MARKERS = new Set(['_persian_to_latin', '_latin_variants']);
const out = {};
for (const [k, v] of Object.entries(existing)) {
  if (k.startsWith('_') && !MARKERS.has(k)) out[k] = v;
}
const isPersian = (s) => /[؀-ۿ]/.test(s);
out._persian_to_latin = existing._persian_to_latin || 'the same collaborator, written in each script';
for (const [k, v] of Object.entries(merged)) if (isPersian(k)) out[k] = v;
out._latin_variants = existing._latin_variants || 'the same collaborator, written two ways in Latin';
for (const [k, v] of Object.entries(merged)) if (!isPersian(k)) out[k] = v;

const before = buildGraph(publications, Object.fromEntries(Object.entries(existing).filter(([k]) => !k.startsWith('_'))));
const after = buildGraph(publications, merged);

console.log('authors-link');
console.log(`  aliases before      ${Object.keys(existing).filter((k) => !k.startsWith('_')).length}`);
console.log(`  aliases after       ${Object.keys(merged).length}`);
console.log(`  people before       ${before.people.length}`);
console.log(`  people after        ${after.people.length}`);
if (declaredPersianOnly) console.log(`  marked Persian-only ${declaredPersianOnly} (no alias needed)`);

const added = Object.entries(merged).filter(([k, v]) => existing[k] !== v);
if (added.length) {
  console.log('\n  new links:');
  for (const [k, v] of added) console.log(`      "${k}"  ->  "${v}"`);
} else {
  console.log('\n  no new links — nothing in the worksheets was filled in.');
}

if (DRY) { console.log('\n--dry-run: data/author-aliases.json not written.'); process.exit(0); }

await writeFile(root('data/author-aliases.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('\n  wrote data/author-aliases.json');
console.log('  Now run: node tools/check-authors.mjs');
