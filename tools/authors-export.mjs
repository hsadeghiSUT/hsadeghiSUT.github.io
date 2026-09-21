#!/usr/bin/env node
/**
 * authors-export.mjs — the worksheet for linking one person's two names.
 *
 * WHY
 * ---
 * The collaboration graph is built from the author strings in
 * publications.json, and a person who publishes in both scripts is written two
 * ways: "Sadeghi, H." on an English paper and "صادقی، ح." on a Persian one.
 * Nothing in the data says those are the same human, so the graph draws two
 * nodes, splits their papers between them, and halves their citations in the
 * Influence city. `data/author-aliases.json` is where that is repaired, and
 * `tools/check-authors.mjs` reports who is still unmerged.
 *
 * What the report cannot do is make the decision. Only someone who knows the
 * people can say whether "غلامی، م." is "Gholami, M." or a different Gholami
 * entirely — and a wrong merge is a false claim about who wrote what, which is
 * worse than a duplicate. So this writes the question out in a form that can
 * be answered away from a terminal, one row per name still unlinked.
 *
 * WHAT IT WRITES
 *   author-links.csv   every unlinked Persian name, with its paper count, the
 *                      titles it appears on, and this tool's best guess at the
 *                      Latin name it matches. One empty column to fill in.
 *   author-latin.csv   every Latin name in the graph, as the list to pick from.
 *
 * Both are UTF-8 with a BOM, because Excel reads a BOM-less UTF-8 CSV as
 * Windows-1252 and renders every Persian name as mojibake.
 *
 * THE GUESS IS A GUESS. It transliterates the Persian surname letter by letter
 * and scores that against every Latin surname. It is there to save typing on
 * the obvious ones, not to be trusted: the column it fills is `suggested`, and
 * the column that is read back is `latin_key`, which starts empty on purpose.
 *
 * USAGE
 *     node tools/authors-export.mjs            # writes both files here
 *     node tools/authors-export.mjs --all      # include already-linked names
 *
 * Then fill in `latin_key` and run `node tools/authors-link.mjs`.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { buildGraph, parseAuthors } from '../assets/js/modules/explorer/data.js';

const read = async (name) =>
  JSON.parse(await readFile(new URL(`../data/${name}`, import.meta.url), 'utf8'));

const ALL = process.argv.includes('--all');

const publications = await read('publications.json');
let rawAliases = {};
try { rawAliases = await read('author-aliases.json'); } catch { /* fine */ }
const aliases = Object.fromEntries(
  Object.entries(rawAliases).filter(([k]) => !k.startsWith('_')),
);

/* The graph WITHOUT aliases, so every spelling is still its own node and the
   sheet can show what is being merged as well as what is not. */
const bare = buildGraph(publications, {});
/* And with them, to know which keys the graph currently ends up with. */
const merged = buildGraph(publications, aliases);

const PERSIAN = /[؀-ۿ]/;
const isPersian = (s) => PERSIAN.test(s);

/**
 * Persian letters to the Latin they usually become in these names.
 *
 * Deliberately crude and deliberately many-to-one: 'س', 'ص' and 'ث' all become
 * 's' because a transliterated surname is being compared to however the author
 * chose to spell themselves in Latin, and that choice is not consistent either
 * ("Sadeghi" / "Sadeqi", "Gholami" / "Golami"). Collapsing the distinctions
 * makes the comparison more forgiving, which is what a suggestion wants.
 */
const TRANSLIT = {
  'ا': 'a', 'آ': 'a', 'أ': 'a', 'إ': 'a', 'ء': '',
  'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z',
  'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'gh', 'ک': 'k', 'ك': 'k',
  'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h',
  'ی': 'i', 'ي': 'i', 'ئ': 'i', 'ى': 'i',
  'َ': 'a', 'ِ': 'e', 'ُ': 'o', 'ّ': '', 'ْ': '', 'ٔ': '',
  '‌': '', '‏': '', '‎': '',
};

const translit = (s) => [...s].map((c) => (c in TRANSLIT ? TRANSLIT[c] : c)).join('');

/** Character-bigram similarity, the same measure lib/scholar.mjs uses. */
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (s) => {
    const g = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const k = s.slice(i, i + 2);
      g.set(k, (g.get(k) || 0) + 1);
    }
    return g;
  };
  const ga = grams(a);
  const gb = grams(b);
  let shared = 0;
  for (const [k, n] of ga) shared += Math.min(n, gb.get(k) || 0);
  const total = (a.length - 1) + (b.length - 1);
  return total > 0 ? (2 * shared) / total : 0;
}

/**
 * The consonant skeleton, and why the bigrams alone were not enough.
 *
 * Persian does not write its short vowels. "ملاعباسی" transliterates to
 * `mlaabasi` where the author spells themselves `molaabasi`, and "خشوعی" to
 * `khshvai` against `khoshouei` — the consonants agree and the vowels cannot,
 * because they were never in the Persian to begin with. Comparing the letters
 * as written therefore scores a true pair about as low as a false one, which
 * is how the first run of this tool proposed "Nasiri, H." for "ملاعباسی، ح."
 *
 * So each name is also reduced to its consonants and the two skeletons are
 * compared. The digraphs are collapsed to single characters FIRST — kh, sh,
 * gh, ch, zh are one Persian letter each, and dropping the h out of them would
 * turn "khosh" into "ks" and lose the distinction between three different
 * surnames.
 */
const DIGRAPHS = [['kh', '\u0078'], ['sh', '\u0063'], ['gh', '\u0071'],
                  ['ch', '\u006a'], ['zh', '\u017e'], ['ou', '\u0075'], ['ee', '\u0069']];

function skeleton(s) {
  let out = s.toLowerCase();
  for (const [pair, one] of DIGRAPHS) out = out.split(pair).join(one);
  return out.replace(/[aeiouy]/g, '');
}

/**
 * How alike two surnames are, on the best of four readings.
 *
 * A name can match on any one of these and be the same person: the letters as
 * transliterated, the consonants alone, or one being the start of the other —
 * "عرب، ف." is "Arabchobdar, F." with the compound surname shortened, and no
 * whole-string measure will ever score that pair highly.
 */
function nameScore(translitSurname, latinSurname) {
  const a = translitSurname;
  const b = latinSurname;
  const sa = skeleton(a);
  const sb = skeleton(b);

  const direct = similarity(a, b);
  const skel = similarity(sa, sb);
  // One surname is the beginning of the other, scored by how much they share.
  const shorter = Math.min(sa.length, sb.length);
  const longer = Math.max(sa.length, sb.length);
  /* Weighted by how much of the LONGER name the shorter one actually covers.
     Two shared consonants is weak evidence however neatly they line up: "نابی"
     reduces to `nb`, which is the start of `nbrstn` (Anbarestani) and of a
     dozen other names, and there is no Latin "Nabi" here at all. Scoring that
     as highly as a full match is how a suggestion becomes a wrong answer
     someone accepts. */
  const prefix = shorter >= 2 && (sa.startsWith(sb) || sb.startsWith(sa))
    ? 0.45 + 0.25 * (shorter / longer)
    : 0;
  const exactSkel = sa && sa === sb ? 0.95 : 0;

  return Math.max(direct, skel, prefix, exactSkel);
}

/* ---- the two populations ------------------------------------------------- */

const surnameOf = (key) => key.split('|')[0];
const initialsOf = (key) => key.split('|')[1] || '';

const persianPeople = bare.people.filter((p) => isPersian(p.key));
const latinPeople = bare.people.filter((p) => !isPersian(p.key));

/** Titles a person appears on, so a name can be recognised by its papers. */
const titlesFor = (person) => {
  const out = [];
  publications.sections.forEach((section, si) => {
    section.items.forEach((item, ii) => {
      const keys = parseAuthors(item.authors).map((a) => a.key);
      if (keys.includes(person.key)) {
        out.push(String(item.title || '').replace(/<[^>]+>/g, '').trim());
      }
    });
  });
  return out;
};

/**
 * The score as a word, because a reader deciding these should not have to
 * learn what 0.73 means. The bands are set where the real answers fell:
 * everything over 1.0 on this data was correct, everything under 0.55 was not.
 */
const band = (t) => (t >= 1.0 ? 'very likely'
  : t >= 0.80 ? 'likely'
  : t >= 0.55 ? 'possible — check the titles'
  : 'unlikely');

/* ---- the sheet ----------------------------------------------------------- */

const rows = [];
for (const person of persianPeople) {
  const alreadyLinked = Object.prototype.hasOwnProperty.call(aliases, person.key);
  if (alreadyLinked && !ALL) continue;

  const pSurname = translit(surnameOf(person.key));
  const pInitials = translit(initialsOf(person.key));

  const scored = latinPeople.map((cand) => {
    const base = nameScore(pSurname, surnameOf(cand.key));
    const ci = initialsOf(cand.key);
    /* Initials are the sharper of the two signals once the surnames are close,
       because a surname can be spelt several ways and an initial cannot. A
       clash is evidence AGAINST, not merely the absence of evidence for. */
    let bonus = 0;
    if (pInitials && ci) {
      if (pInitials === ci) bonus = 0.16;
      else if (pInitials[0] === ci[0]) bonus = 0.10;
      else bonus = -0.30;
    }
    return { cand, total: base + bonus, base };
  }).sort((a, b) => b.total - a.total);

  const top = scored.slice(0, 3).filter((c) => c.total >= 0.40);

  rows.push({
    persian_key: person.key,
    persian_name: person.label,
    papers: person.count,
    translit: pSurname + '|' + pInitials,
    suggested: top[0] ? top[0].cand.key : '',
    suggested_name: top[0] ? top[0].cand.label : '',
    confidence: top[0] ? top[0].total.toFixed(2) : '0.00',
    verdict: top[0] ? band(top[0].total) : 'no match found',
    alt1: top[1] ? `${top[1].cand.key}  (${top[1].cand.label}, ${top[1].total.toFixed(2)})` : '',
    alt2: top[2] ? `${top[2].cand.key}  (${top[2].cand.label}, ${top[2].total.toFixed(2)})` : '',
    latin_key: alreadyLinked ? aliases[person.key] : '',
    currently_linked: alreadyLinked ? 'yes' : '',
    titles: titlesFor(person).join(' \u00b6 '),
  });
}

rows.sort((a, b) => (b.papers - a.papers) || a.persian_name.localeCompare(b.persian_name));

/* ---- CSV ----------------------------------------------------------------- */
/* Quoting every field, and doubling any quote inside one. Persian titles carry
   commas and the odd quotation mark, and a half-quoted CSV opened in Excel
   silently shifts columns rather than failing. */
const csv = (table) => '﻿' + table
  .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
  .join('\r\n') + '\r\n';

const linkTable = [
  ['persian_key', 'persian_name', 'papers', 'translit', 'suggested',
   'suggested_name', 'verdict', 'confidence', 'alt1', 'alt2', 'latin_key',
   'currently_linked', 'titles'],
  ...rows.map((r) => [
    r.persian_key, r.persian_name, r.papers, r.translit, r.suggested,
    r.suggested_name, r.verdict, r.confidence, r.alt1, r.alt2, r.latin_key,
    r.currently_linked, r.titles,
  ]),
];

const latinTable = [
  ['latin_key', 'latin_name', 'papers'],
  ...latinPeople
    .slice()
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label))
    .map((p) => [p.key, p.label, p.count]),
];

await writeFile(new URL('../author-links.csv', import.meta.url), csv(linkTable), 'utf8');
await writeFile(new URL('../author-latin.csv', import.meta.url), csv(latinTable), 'utf8');

/* ---- Latin spelt two ways ------------------------------------------------
   The other half of the same problem, and the half that has nothing to do
   with script: "Golaghaei Darzi, A." one year and "Darzi, A.G." the next. Same
   test check-authors.mjs uses — one surname contains the other, or the
   surnames match and the initials are compatible — reported here so both
   kinds of decision arrive on one sheet. */
const split = (key) => ({ surname: key.split('|')[0], initials: key.split('|')[1] || '' });
const pairs = [];
for (let i = 0; i < merged.people.length; i++) {
  for (let j = i + 1; j < merged.people.length; j++) {
    const A = merged.people[i];
    const B = merged.people[j];
    if (isPersian(A.key) || isPersian(B.key)) continue;
    const a = split(A.key);
    const b = split(B.key);
    let why = '';
    if (a.surname === b.surname
        && (a.initials.startsWith(b.initials) || b.initials.startsWith(a.initials))) {
      why = 'same surname, compatible initials';
    } else if (a.surname !== b.surname
        && (a.surname.includes(b.surname) || b.surname.includes(a.surname))
        && Math.min(a.surname.length, b.surname.length) >= 5
        && a.initials[0] === b.initials[0]) {
      why = 'one surname contains the other';
    }
    if (why) pairs.push({ a: A.key, aName: A.label, aCount: A.count,
                          b: B.key, bName: B.label, bCount: B.count, why });
  }
}

const pairTable = [
  ['key_a', 'name_a', 'papers_a', 'key_b', 'name_b', 'papers_b', 'why', 'fold_a_into_b'],
  ...pairs.map((p) => [p.a, p.aName, p.aCount, p.b, p.bName, p.bCount, p.why, '']),
];
await writeFile(new URL('../author-latin-pairs.csv', import.meta.url), csv(pairTable), 'utf8');

/* Also as JSON, for the spreadsheet builder and for anything else that wants
   the inventory without parsing CSV back. */
await writeFile(
  new URL('../author-links.json', import.meta.url),
  JSON.stringify({
    rows,
    pairs,
    latin: latinPeople.map((p) => ({ key: p.key, label: p.label, count: p.count })),
    linked: Object.entries(aliases).map(([from, to]) => ({ from, to })),
  }, null, 2),
  'utf8',
);

console.log('authors-export');
console.log(`  people in the graph, unmerged   ${bare.people.length}`);
console.log(`  people after aliases            ${merged.people.length}`);
console.log(`  Persian-script names            ${persianPeople.length}`);
console.log(`  Latin-script names              ${latinPeople.length}`);
console.log(`  rows needing a decision         ${rows.filter((r) => !r.currently_linked).length}`);
console.log('');
console.log('  wrote author-links.csv, author-latin.csv, author-latin-pairs.csv, author-links.json');
console.log('  Fill in the latin_key column, then run: node tools/authors-link.mjs');
