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
 * pubsearch.js — one box that searches people and text, and drives the canvases.
 *
 * TWO KINDS OF ANSWER FROM ONE FIELD
 * ----------------------------------
 * "Alipanahi" and "biochar" are different questions. The first names a person
 * and its answer is everything about them — their publications, their place in
 * the graph, their face. The second names a subject and its answer is a set of
 * entries. Asking the reader to choose a mode before they type is asking them
 * to know which kind of thing they are about to look for, so the box decides:
 * if the query names somebody the citation list knows, it is a person; if it
 * does not, it is text.
 *
 * WHY A PERSON MATCH DOES WHAT A CLICK DOES
 * -----------------------------------------
 * Because they are the same question asked two ways. Clicking Alipanahi's node
 * filters the list to his 31 papers, lights his edges, and shows his face;
 * typing his name should not do some lesser version of that. The search calls
 * exactly the path the click calls (`explorer.selectPerson`), so there is one
 * behaviour to understand and one to maintain — and the canvases stay in step
 * with the list without either knowing about the search box.
 *
 * WHEN SEVERAL PEOPLE MATCH
 * -------------------------
 * "Ahmadi" is three people. The most-published one is selected, because with no
 * other information the reader most likely means the person with the most work
 * here — and all of them are offered as chips, with their faces, so switching
 * is one click rather than a re-typed query. Guessing and showing the guess
 * beats a disambiguation page nobody asked for.
 *
 * MATCHING
 * --------
 * Folded to lower case with the accents removed and the Arabic forms of two
 * letters mapped to their Persian ones, so "Hedayati-Azar" is found by
 * "hedayati azar" and a name typed with an Arabic yeh still matches a Persian
 * one. A person is matched on the cited form ("Alipanahi, P."), on the surname
 * alone, and on the full roster name ("Pooria Alipanahi") — a reader knows one
 * of those three and should not have to know which.
 *
 * NOTHING HERE IS REQUIRED
 * ------------------------
 * With no explorer — it is an optional, dynamically imported enhancement — the
 * box still searches text and still filters the list. `onPerson` simply falls
 * back to filtering by that person's papers.
 */

import { el, $$ } from './dom.js';
import { icon } from './icons.js';

/** Long enough that a single letter does not filter 150 entries on every key. */
const MIN_QUERY = 2;

/** How many people to offer at once. Beyond this the query is the answer. */
const MAX_CHIPS = 8;

/** Typing is faster than filtering 150 entries; wait for the pause. */
const DEBOUNCE_MS = 140;

/**
 * Case, accent and script folded away.
 *
 * `ي` and `ك` are the Arabic forms of letters Persian writes as `ی` and `ک`.
 * They are different code points that look alike and are typed
 * interchangeably, so a reader searching a Persian name with an Arabic
 * keyboard finds nothing unless they are folded together.
 */
export function fold(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .toLowerCase()
    .replace(/[.,;:()[\]{}'"«»–—_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * People whose name answers this query, best first.
 *
 * The ranking is the order a reader would rank them in: someone whose surname
 * IS the query before someone whose surname merely starts with it, before
 * someone the query appears somewhere inside; and among equals, the one with
 * more publications here.
 */
export function findPeople(query, people, faces) {
  const q = fold(query);
  if (q.length < MIN_QUERY) return [];

  const scored = [];
  for (const person of people) {
    const face = faces && faces.get(person.key);
    const surname = fold(person.surname);
    const label = fold(person.label);
    const full = fold(face && face.name);

    let rank = 0;
    if (surname === q) rank = 4;
    else if (surname.startsWith(q) || (full && full.startsWith(q))) rank = 3;
    else if (label.includes(q) || (full && full.includes(q))) rank = 2;
    else if (fold(person.key.replace('|', ' ')).includes(q)) rank = 1;
    if (!rank) continue;

    scored.push({ person, face, rank });
  }

  return scored
    .sort((a, b) => b.rank - a.rank || b.person.papers.length - a.person.papers.length)
    .slice(0, MAX_CHIPS);
}

/** Entry ids whose text answers this query. */
export function findPapers(query, papers) {
  const q = fold(query);
  if (q.length < MIN_QUERY) return [];
  return papers.filter((p) => p.haystack.includes(q)).map((p) => p.id);
}

/**
 * Everything searchable about one entry, folded once at mount.
 *
 * The author line is included deliberately: a co-author with too few papers to
 * be a node, or one this parser never saw, is still findable by name here.
 */
export function indexPapers(publications) {
  const out = [];
  publications.sections.forEach((section, sectionIndex) => {
    section.items.forEach((item, itemIndex) => {
      const text = [item.title, item.authors, item.details, section.title]
        .map((part) => String(part || '').replace(/<[^>]+>/g, ' '))
        .join(' ');
      out.push({ id: sectionIndex + ':' + itemIndex, haystack: fold(text) });
    });
  });
  return out;
}

/**
 * Build the search box.
 *
 * @param {Element} host          where to put it
 * @param {object}  options
 * @param {object[]} options.people   the graph's people, or []
 * @param {object[]} options.papers   from `indexPapers()`
 * @param {Map|(() => Map)} options.faces  author key → face. A function is
 *        allowed and is what the explorer passes: the roster arrives after the
 *        graph, so the map the search holds at mount time is empty and the one
 *        it wants is the one that exists when somebody types.
 * @param {(key: string, person: object) => boolean} options.onPerson
 *        Show everything about this person. Returns false if it could not, in
 *        which case the list is filtered to their papers instead.
 * @param {(ids: string[], label: string) => void} options.onPapers
 * @param {() => void} options.onClear
 */
export function mountSearch(host, { people, papers, faces, onPerson, onPapers, onClear }) {
  const input = el('input', {
    class: 'pubsearch__input',
    type: 'search',
    id: 'pub-search',
    placeholder: 'Search a name, a title, a journal…',
    autocomplete: 'off',
    /* The browser's own "search" reset fires `input` with an empty value, which
       is already handled — but it does not fire `submit`, hence the form's
       `preventDefault` below rather than relying on it. */
    'aria-describedby': 'pub-search-summary',
  });

  const summary = el('p', { class: 'pubsearch__summary', id: 'pub-search-summary', role: 'status', 'aria-live': 'polite' });
  const chips = el('div', { class: 'pubsearch__chips', hidden: true });

  const form = el(
    'form',
    { class: 'pubsearch', role: 'search' },
    el('label', { class: 'pubsearch__field' }, icon('fad-book-reader'), input),
    chips,
    summary,
  );
  form.addEventListener('submit', (e) => e.preventDefault());

  /* The roster may not have landed when this mounts; ask each time. */
  const faceMap = () => (typeof faces === 'function' ? faces() : faces) || new Map();

  let current = '';

  function choose(entry) {
    for (const chip of $$('.pubsearch__chip', chips)) {
      chip.classList.toggle('is-on', chip.dataset.key === entry.person.key);
      chip.setAttribute('aria-pressed', String(chip.dataset.key === entry.person.key));
    }
    const handled = onPerson && onPerson(entry.person.key, entry.person);
    if (!handled) onPapers(entry.person.papers, entry.person.label);
  }

  function renderChips(matches) {
    if (!matches.length) {
      chips.hidden = true;
      chips.replaceChildren();
      return;
    }
    chips.hidden = false;
    chips.replaceChildren(...matches.map((entry) => {
      const face = entry.face;
      const chip = el(
        'button',
        {
          type: 'button',
          class: 'pubsearch__chip',
          dataset: { key: entry.person.key },
          'aria-pressed': 'false',
        },
        face
          ? el('img', { class: 'pubsearch__chip-face', src: face.url, alt: '', loading: 'lazy', decoding: 'async' })
          : null,
        el('span', { class: 'pubsearch__chip-name', text: entry.person.label }),
        el('span', { class: 'pubsearch__chip-count', text: String(entry.person.papers.length) }),
      );
      if (entry.person.script === 'fa') chip.setAttribute('lang', 'fa');
      chip.addEventListener('click', () => choose(entry));
      return chip;
    }));
  }

  function run(query) {
    const q = query.trim();
    if (q === current) return;
    current = q;

    if (fold(q).length < MIN_QUERY) {
      renderChips([]);
      summary.textContent = '';
      onClear();
      return;
    }

    const matches = findPeople(q, people, faceMap());
    renderChips(matches);

    if (matches.length) {
      const best = matches[0];
      summary.textContent = matches.length === 1
        ? 'Showing everything by ' + best.person.label
        : matches.length + ' people match — showing ' + best.person.label;
      choose(best);
      return;
    }

    const ids = findPapers(q, papers);
    if (!ids.length) {
      summary.textContent = 'Nothing matches “' + q + '”';
      /* An empty list with a filter banner over it reads as a bug. Put the
         whole list back and let the sentence carry the news. */
      onClear();
      return;
    }
    summary.textContent = '';
    onPapers(ids, '“' + q + '”');
  }

  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => run(input.value), DEBOUNCE_MS);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    input.value = '';
    clearTimeout(timer);
    run('');
  });

  host.append(form);

  return {
    /** Put a name in the box and run it — what a node click could call back. */
    search(text) {
      input.value = text;
      run(text);
    },
    /** Let go without the reader having typed anything. */
    reset() {
      if (!current) return;
      input.value = '';
      run('');
    },
  };
}
