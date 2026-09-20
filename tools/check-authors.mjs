#!/usr/bin/env node
/**
 * check-authors.mjs — a report on how well the author names parsed.
 *
 * WHY IT IS A REPORT AND NOT A GUARD
 * ----------------------------------
 * The collaboration graph is computed from the author strings in
 * publications.json (README §15). Those strings were written for people to
 * read, not for a parser, so two things can go wrong, and both live in the data
 * rather than in the code:
 *
 *   - the same person is written two ways ("Golaghaei Darzi, A." one year,
 *     "Darzi, A.G." another), and shows up as two nodes;
 *   - a name is written in a shape the parser does not recognise, and shows up
 *     as no node at all.
 *
 * This lists both, so they can be fixed in data/author-aliases.json. It does
 * NOT merge anything on its own and it does not fail the build: two people who
 * share a surname are usually two people, and quietly merging them would be a
 * false claim about who wrote what. The judgement stays with a human who knows
 * the field.
 *
 * USAGE
 *     node tools/check-authors.mjs
 */

import { readFile } from 'node:fs/promises';
import { buildGraph, parseAuthors } from '../assets/js/modules/explorer/data.js';

/**
 * The data files, read through a URL rather than through a path string.
 *
 * NOT `new URL('..', import.meta.url).pathname`, which is what this used to be
 * and which cannot work on Windows. A file URL's `pathname` is a URL component,
 * not a path: it keeps the leading slash, so it comes out `/C:/Users/…`, and it
 * keeps the percent-escapes, so a folder with a space in its name comes out
 * `OneDrive%20-%20The…`. Joining that to `data/` and handing it to `readFile`
 * asks for a file called `C:\C:\Users\…\OneDrive%20-%20…`, which is the error
 * this tool used to open with.
 *
 * `readFile` takes a URL directly and converts it properly on every platform,
 * so there is no path string to get wrong. Where a real path IS needed — the
 * five checks that hand a root to `serve()` — `fileURLToPath` is the answer.
 */
const read = async (name) =>
  JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), 'utf8'));

const publications = await read('publications.json');

let aliases = {};
try {
  const raw = await read('author-aliases.json');
  aliases = Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_')));
} catch {
  console.log('No data/author-aliases.json — every spelling will be its own node.\n');
}

const graph = buildGraph(publications, aliases);

/* -------------------------------------------------------------------------- */
/* 1. Coverage                                                                 */
/* -------------------------------------------------------------------------- */
const noAuthors = [];
const noYear = [];
publications.sections.forEach((section, si) => {
  section.items.forEach((item, ii) => {
    const parsed = parseAuthors(item.authors);
    const hasField = String(item.authors || '').replace(/<[^>]+>/g, '').trim().length > 0;
    if (hasField && parsed.length === 0) {
      noAuthors.push(`${section.id} #${ii + 1}  ${String(item.authors).slice(0, 70)}`);
    }
    const paper = graph.papers.find((p) => p.id === si + ':' + ii);
    if (!paper.year) noYear.push(`${section.id} #${ii + 1}  ${paper.title.slice(0, 60)}`);
  });
});

console.log('Collaboration graph — parse report\n');
console.log(`  papers      ${graph.papers.length}`);
console.log(`  people      ${graph.people.length}`);
console.log(`  edges       ${graph.edges.length}`);
console.log(`  years       ${graph.years[0]}–${graph.years[graph.years.length - 1]}`);
console.log(`  aliases     ${Object.keys(aliases).length} applied`);

if (noAuthors.length) {
  console.log(`\n  ${noAuthors.length} entr${noAuthors.length === 1 ? 'y has' : 'ies have'} an author line the parser could not read:`);
  noAuthors.forEach((n) => console.log('      ' + n));
} else {
  console.log('\n  Every non-empty author line parsed.');
}

if (noYear.length) {
  console.log(`\n  ${noYear.length} entr${noYear.length === 1 ? 'y is' : 'ies are'} undated, so absent from the timeline:`);
  noYear.forEach((n) => console.log('      ' + n));
}

/* -------------------------------------------------------------------------- */
/* 2. Possible duplicates                                                      */
/* -------------------------------------------------------------------------- */
/* Two nodes are worth a look when one surname contains the other (the "Darzi" /
   "Golaghaei Darzi" case) and their initials are compatible — one is a prefix of
   the other, or they share a first initial. That is a hint, not a verdict. */
const split = (key) => {
  const [surname, initials] = key.split('|');
  return { surname, initials };
};

const suspects = [];
for (let i = 0; i < graph.people.length; i++) {
  for (let j = i + 1; j < graph.people.length; j++) {
    const a = split(graph.people[i].key);
    const b = split(graph.people[j].key);
    if (a.surname === b.surname) {
      if (a.initials.startsWith(b.initials) || b.initials.startsWith(a.initials)) {
        suspects.push([graph.people[i], graph.people[j], 'same surname, compatible initials']);
      }
      continue;
    }
    const contains = a.surname.includes(b.surname) || b.surname.includes(a.surname);
    const shortest = Math.min(a.surname.length, b.surname.length);
    if (contains && shortest >= 5 && a.initials[0] === b.initials[0]) {
      suspects.push([graph.people[i], graph.people[j], 'one surname contains the other']);
    }
  }
}

if (suspects.length) {
  console.log(`\n  ${suspects.length} pair${suspects.length === 1 ? '' : 's'} that may be one person — decide, then add to data/author-aliases.json:\n`);
  for (const [a, b, why] of suspects) {
    console.log(`      "${a.key}"  ↔  "${b.key}"`);
    console.log(`          ${a.label} (${a.count})  ·  ${b.label} (${b.count})  — ${why}`);
  }
  console.log('\n      Add the one you want folded into the other, e.g.');
  console.log(`          "${suspects[0][0].key}": "${suspects[0][1].key}"`);
} else {
  console.log('\n  No likely duplicates left.');
}

/* -------------------------------------------------------------------------- */
/* 3. Names still only in Persian                                              */
/* -------------------------------------------------------------------------- */
const persianOnly = graph.people.filter((p) => p.script === 'fa');
if (persianOnly.length) {
  console.log(`\n  ${persianOnly.length} name${persianOnly.length === 1 ? '' : 's'} appear only in Persian. If any of them also`);
  console.log('  publishes in Latin script here, alias the key on the left:\n');
  persianOnly.forEach((p) => console.log(`      "${p.key}"   ${p.label}  (${p.count} paper${p.count === 1 ? '' : 's'})`));
}

console.log('\nReport only — nothing was changed and nothing failed.');
