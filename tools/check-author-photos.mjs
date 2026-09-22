#!/usr/bin/env node
/**
 * Who in the publication list has a face, and who does not.
 *
 * Runs the browser's own matcher — `assets/js/modules/faces.js` — against the
 * real data, so what this prints is what the canvases will do. Nothing here
 * fails a build by default: a co-author without a photograph is the normal
 * state of a citation list, not an error. `--strict` turns the two things that
 * ARE errors — an override naming a file that does not exist, and an override
 * for a key no publication mentions — into a non-zero exit.
 *
 * USAGE
 *   node tools/check-author-photos.mjs
 *   node tools/check-author-photos.mjs --strict
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildGraph } from '../assets/js/modules/explorer/data.js';
import { buildFaceIndex, candidateKeys } from '../assets/js/modules/faces.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const strict = process.argv.includes('--strict');

const publications = read('data/publications.json');
const team = read('data/research-team.json');
const rawAliases = read('data/author-aliases.json');
const overrides = read('data/author-photos.json');

const aliases = Object.fromEntries(
  Object.entries(rawAliases).filter(([k]) => !k.startsWith('_')),
);

const graph = buildGraph(publications, aliases);
const known = new Map(graph.people.map((p) => [p.key, p]));
const { faces, ambiguous, unmatched } = buildFaceIndex(team, overrides, known);

const rosterPeople = (team.sections || [])
  .flatMap((s) => (s.people || []).map((p) => ({ ...p, group: s.title })))
  .filter((p) => p.photo);

console.log(`${graph.people.length} people in the graph, ${rosterPeople.length} photographed on the roster`);
console.log(`${faces.size} of the graph's people have a face`);

/* Coverage where it shows: the people big enough to be worth pointing at. */
const byPapers = [...graph.people].sort((a, b) => b.papers.length - a.papers.length);
const topMissing = byPapers.filter((p) => !p.self && !faces.has(p.key)).slice(0, 12);
if (topMissing.length) {
  console.log(`\nMost-published people with no face (${topMissing.length} of ${byPapers.filter((p) => !p.self && !faces.has(p.key)).length} shown):`);
  for (const p of topMissing) {
    console.log(`  ${p.label.padEnd(28)} ${String(p.papers.length).padStart(3)} papers   key: ${p.key}`);
  }
}

if (ambiguous.length) {
  console.log(`\nNames that matched more than one key — the first was used, add an override to settle it (${ambiguous.length}):`);
  for (const a of ambiguous) console.log(`  ${a.name} [${a.group}] → ${a.keys.join('  |  ')}`);
}

if (unmatched.length) {
  console.log(`\nPhotographed roster members with no publication in the list (${unmatched.length}):`);
  for (const u of unmatched.slice(0, 20)) {
    const tried = candidateKeys(u.name).map((c) => c.key).join(', ') || '(no candidate keys)';
    console.log(`  ${u.name} [${u.group}]`);
    console.log(`      tried: ${tried}`);
  }
  if (unmatched.length > 20) console.log(`  … and ${unmatched.length - 20} more`);
}

/* The two real errors. */
const problems = [];
for (const [key, file] of Object.entries(overrides)) {
  if (key.startsWith('_')) continue;
  if (!existsSync(path.join(ROOT, 'assets/img/people', file))) {
    problems.push(`override ${key} names assets/img/people/${file}, which does not exist`);
  }
  if (!known.has(key)) {
    problems.push(`override ${key} is not an author of anything in data/publications.json`);
  }
}

if (problems.length) {
  console.log('\nProblems:');
  for (const p of problems) console.log(`  ${p}`);
  if (strict) process.exit(1);
} else {
  console.log('\nEvery override names a real file and a real author.');
}
