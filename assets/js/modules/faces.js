/*!
 * Hamed Sadeghi — personal academic website
 * Design, code and content copyright (c) 2026 Hamed Sadeghi. All rights reserved.
 * Original: http://sharif.edu/~hsadeghi/
 *
 * Not licensed for reuse, redistribution or derivative works without written
 * permission. Reading this file is expected — it was sent to your browser so it
 * could be used. Republishing it is not.
 *
 * build-id: hs-geotech-2026-6f3ad1
 */
/**
 * faces.js — which photograph belongs to a name in the publication list.
 *
 * THE TWO HALVES THAT HAVE TO MEET
 * --------------------------------
 * `data/publications.json` knows people as "Golaghaei Darzi, A." — a surname
 * and initials, because that is how a citation is written. `data/research-team.json`
 * knows them as "Ali Golaghaei Darzi", with a photograph, because that is how a
 * roster is written. Nothing in either file links the two, and asking an author
 * to maintain a third file by hand is asking for it to rot.
 *
 * So the link is derived: from a full name, work out every surname/initials
 * pair it could reasonably be written as, and keep the ones the graph has
 * actually seen. `explorer/data.js` owns the key format and exports the
 * function that makes one, so there is no second definition to drift.
 *
 * WHY "EVERY PAIR IT COULD BE" AND NOT ONE GUESS
 * ---------------------------------------------
 * Where the surname ends is not decidable from the name alone. "Ali Golaghaei
 * Darzi" is Golaghaei Darzi, A. — two words of surname. "Ali Akbar Lavasan" is
 * Lavasan, A.A. — two words of given name. Both are three tokens; nothing about
 * the string says which is which. What settles it is the citation list: only
 * one of the candidates is a person the graph has ever seen, so the data does
 * the disambiguating and the code does not have to be clever about Persian
 * naming.
 *
 * When more than one candidate survives, the longer surname wins — a compound
 * surname is the commoner shape here — and `tools/check-author-photos.mjs`
 * prints every one of those so a human can settle it in the override file
 * rather than leaving it to a rule.
 *
 * THE HIGHEST GROUP WINS
 * ----------------------
 * People move up. Ali Golaghaei Darzi is in `MPhil Students` for the years he
 * was one and in `PhD Students` now, with a different photograph in each, and
 * the answer to "whose face is this" is the senior one. `research-team.json`
 * lists its sections in order of seniority, so "highest" is simply "earliest
 * section", and within one section the last entry wins — that is the most
 * recent row for a person listed twice in the same group.
 *
 * The loop below walks the sections in REVERSE and overwrites as it goes, which
 * leaves exactly that: the earliest section's last matching row.
 *
 * OVERRIDES
 * ---------
 * `data/author-photos.json` maps an author key straight to a file in
 * `assets/img/people/`. It wins over anything derived, and it is the answer for
 * the two cases the roster cannot cover: a co-author who is not on the team
 * page at all, and a name the candidate rules get wrong.
 *
 * NOTHING HERE IS REQUIRED
 * ------------------------
 * With no roster, no overrides, or no photographs, every lookup returns
 * undefined and the callers draw what they drew before. A face is an
 * enhancement to a node, never the thing that makes the node work.
 */

import { load } from './data.js';
import { authorKey } from './explorer/data.js';

/** Where every roster photograph lives. */
const PHOTO_DIR = 'assets/img/people/';

/**
 * Titles that sit in front of a name in the roster and never in a citation.
 *
 * Deliberately short. Anything that might be part of a name — "Sayed", "Seyed",
 * "Mir" — is left alone, because dropping a real name component silently
 * produces a wrong key rather than no key.
 */
const HONORIFICS = new Set([
  'dr', 'dr.', 'prof', 'prof.', 'professor', 'mr', 'mr.', 'ms', 'ms.',
  'mrs', 'mrs.', 'miss', 'eng', 'eng.', 'ir', 'ir.',
]);

/**
 * A roster name, reduced to the tokens a citation would use.
 *
 * Strips honorifics, anything parenthesised, and the punctuation a roster uses
 * for presentation — but not hyphens inside a name, which are part of it.
 */
export function nameTokens(fullName) {
  return String(fullName || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[,;]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !HONORIFICS.has(t.toLowerCase()))
    .filter((t) => /[A-Za-z؀-ۿ]/.test(t));
}

/**
 * Every author key a full name could plausibly be written as.
 *
 * WHAT A CITATION DOES TO A NAME
 * ------------------------------
 * Three things, and the roster records none of them:
 *
 *   drops a component   "Milad Jabbarzadeh Ghandilou" is cited Jabbarzadeh, M.
 *   joins two with a hyphen   "Aysa Hedayati Azar" is cited Hedayati-Azar, A.
 *   keeps or drops middle initials   Lavasan, A.A. and Lavasan, A. are one man
 *
 * So the surname is any run of tokens that starts after at least one given
 * name, not merely the tail of the string, and each run is tried spaced,
 * hyphenated and run together.
 *
 * ORDERED MOST-LIKELY FIRST, and the order is the only judgement in this file:
 * a run that reaches the end of the name outranks one that stops short, a
 * longer surname outranks a shorter one, and fuller initials outrank an
 * initial. A caller that takes the first surviving candidate therefore reads a
 * compound surname as a compound surname, and only falls back to "a component
 * was dropped" when nothing else fits.
 *
 * Every candidate is checked against people the citation list actually
 * contains, so a wrong guess is almost always a guess about nobody. The ones
 * that are not — two survivors — are what `tools/check-author-photos.mjs`
 * prints as ambiguous, to be settled in data/author-photos.json rather than by
 * a cleverer rule here.
 *
 * @param {string} fullName  as the roster writes it
 * @returns {{key: string, surname: string, initials: string, rank: number}[]}
 */
export function candidateKeys(fullName) {
  const tokens = nameTokens(fullName);
  if (tokens.length < 2) return [];

  const out = [];
  const seen = new Set();

  for (let start = 1; start < tokens.length; start += 1) {
    for (let end = tokens.length; end > start; end -= 1) {
      const words = tokens.slice(start, end);
      const given = tokens.slice(0, start);

      /* A surname reaching the end of the name is the ordinary case and beats
         every shortened one; after that, more surname beats less. */
      const rank = (end === tokens.length ? 1000 : 0) + words.length * 10 - start;

      /* The three ways a multi-word surname reaches print. `authorKey` already
         folds spaces away, so the spaced and run-together forms collapse into
         one key — the hyphen is the variant that actually matters. */
      const surnames = words.length > 1
        ? [words.join(' '), words.join('-')]
        : [words[0], words[0].replace(/-/g, ' ')];

      /* The initials, from every suffix of the given names.
         A citation drops a leading given component as readily as a trailing
         surname one: "Seyed Amirreza Mirpanji" is printed Mirpanji, A., with
         the honorific-like "Seyed" gone and Amirreza carrying the initial.
         `drop = 0` is the whole name and ranks highest. */
      const forms = [];
      for (let drop = 0; drop < given.length; drop += 1) {
        const letters = given.slice(drop).map((g) => g[0]);
        forms.push({ initials: letters.join(''), penalty: drop * 2 });
        if (letters.length > 1) {
          forms.push({ initials: letters[0], penalty: drop * 2 + 1 });
        }
      }

      for (const surname of surnames) {
        for (const form of forms) {
          const key = authorKey(surname, form.initials);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ key, surname, initials: form.initials, rank: rank - form.penalty });
        }
      }
    }
  }

  return out.sort((a, b) => b.rank - a.rank);
}

/**
 * Match the roster against the graph.
 *
 * Pure, so `tools/check-author-photos.mjs` can run exactly what the browser
 * runs and report on it.
 *
 * @param {object} team       parsed data/research-team.json
 * @param {object} overrides  parsed data/author-photos.json ('_'-prefixed keys
 *                            are notes for a human and are ignored)
 * @param {Set<string>|Map<string, *>} known  the keys the graph actually has
 * @returns {{faces: Map<string, object>, ambiguous: object[], unmatched: object[]}}
 */
export function buildFaceIndex(team, overrides, known) {
  const has = (key) => (known instanceof Set ? known.has(key) : !!(known && known.has(key)));
  const faces = new Map();
  const ambiguous = [];
  const unmatched = [];

  const sections = (team && team.sections) || [];

  /* Reverse, so that when two sections hold the same person the earlier — more
     senior — section is written last and wins. Within a section the natural
     order means the last row wins, which is the most recent one. */
  for (let s = sections.length - 1; s >= 0; s -= 1) {
    const section = sections[s];
    for (const person of section.people || []) {
      if (!person || !person.photo) continue;

      const matches = candidateKeys(person.name).filter((c) => has(c.key));
      if (!matches.length) {
        unmatched.push({ name: person.name, group: section.title });
        continue;
      }
      if (matches.length > 1) {
        ambiguous.push({ name: person.name, group: section.title, keys: matches.map((m) => m.key) });
      }

      const best = matches[0];
      faces.set(best.key, {
        key: best.key,
        photo: person.photo,
        url: PHOTO_DIR + person.photo,
        name: nameTokens(person.name).join(' '),
        alt: person.alt || person.name,
        group: section.title,
        groupIndex: s,
        profileUrl: person.profileUrl || null,
        source: 'roster',
      });
    }
  }

  for (const [key, photo] of Object.entries(overrides || {})) {
    if (key.startsWith('_') || !photo) continue;
    const previous = faces.get(key);
    faces.set(key, {
      key,
      photo,
      url: PHOTO_DIR + photo,
      name: (previous && previous.name) || '',
      alt: (previous && previous.alt) || '',
      group: (previous && previous.group) || '',
      groupIndex: previous ? previous.groupIndex : -1,
      profileUrl: (previous && previous.profileUrl) || null,
      source: 'override',
    });
  }

  return { faces, ambiguous, unmatched };
}

/**
 * The same thing, for the browser.
 *
 * Both files are optional and a failure of either is not an error: a site with
 * no roster and no overrides simply has no faces. Resolves to an empty Map in
 * that case rather than rejecting, so a caller never has to guard the call.
 *
 * @param {Set<string>|Map<string, *>} known  the graph's author keys
 * @returns {Promise<Map<string, object>>}
 */
export async function loadFaces(known) {
  const [team, overrides] = await Promise.all([
    load('research-team').catch(() => null),
    load('author-photos').catch(() => ({})),
  ]);
  return buildFaceIndex(team, overrides, known).faces;
}
