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
 * teamwork.js — what each member of the team has actually published.
 *
 * WHAT THIS ADDS
 * --------------
 * A roster card says who somebody is and what their thesis is about. It cannot
 * say that they have twenty-five papers and two hundred citations, because
 * `research-team.json` does not know: the publications live in another file and
 * the citation counts in a third. This module joins the three and puts a
 * "More info" button on the cards where the join found something — which is
 * exactly the cards whose person has publications rather than only a thesis.
 *
 * WHAT OPENS
 * ----------
 * Their publications, each with its own citation count; the people they wrote
 * them with, as faces; and the same four 3D views the publications page
 * offers — Collaboration, Timeline, Impact, Influence — built over their work
 * alone rather than over the whole list.
 *
 * WHY THE EXPLORER IS REUSED RATHER THAN REBUILT
 * ----------------------------------------------
 * A scoped view is the same view over fewer papers. Handing `mountExplorer` a
 * publications object containing only this person's entries gives their own
 * co-author graph, their own timeline and their own skyline, with every
 * behaviour — hovering, filtering, the faces — already correct, and nothing
 * here to keep in step with the original. The explorer removes itself when
 * there is too little to draw (fewer than three people), so somebody with one
 * co-authored paper simply gets the list and the faces.
 *
 * The subset is renumbered, so its entry ids are not the ids of the full list.
 * The citation counts are therefore re-joined by title for the subset rather
 * than carried across, which is one line here and the alternative to teaching
 * the graph about two id spaces.
 *
 * COST
 * ----
 * Nothing is built until a card is opened, and opening one closes the last: a
 * WebGL canvas per card, fifty-five cards, is not a page. The join itself is
 * one pass over the publication list at mount, shared by every card.
 */

import { el, $$ } from './dom.js';
import { icon, SPRITE } from './icons.js';
import { load } from './data.js';
import { buildGraph, attachCitations } from './explorer/data.js';
import { candidateKeys, loadFaces } from './faces.js';
import { loadScholar, citedByIndex, normaliseTitle } from './scholar.js';

/** Thousands separators, the same way the rest of the site writes a count. */
const count = (n) => Number(n).toLocaleString('en-US');

/**
 * Point a caret right (shut) or down (open).
 *
 * It swaps symbol rather than rotating one: `transform: rotate(90deg)` resolves
 * to the identity matrix on this element in at least one engine — measured, not
 * assumed — while the same declaration on the icon beside it turns as expected.
 *
 * `SPRITE` comes from icons.js rather than being written out here, because the
 * build stamps that one literal with the sprite's content hash. A second copy
 * of the path would be a second URL, unstamped, and would go on pointing at
 * whatever version of the sprite the visitor already had.
 */
function pointOneCaret(caret, open) {
  if (!caret) return;
  const id = open ? 'fas-caret-down' : 'fas-caret-right';
  for (const use of caret.querySelectorAll('use')) {
    use.setAttribute('href', `${SPRITE}#${id}`);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `${SPRITE}#${id}`);
  }
}

/**
 * Which author key each roster person is, where the citation list knows them.
 *
 * The same derivation `faces.js` uses, in the other direction: there it is
 * "whose face is this key", here it is "what has this person written".
 */
function resolveKeys(team, known) {
  const out = new Map();
  (team.sections || []).forEach((section, s) => {
    (section.people || []).forEach((person, p) => {
      const hit = candidateKeys(person.name).find((c) => known.has(c.key));
      if (hit) out.set(s + ':' + p, hit.key);
    });
  });
  return out;
}

/** One person's entries, as a publications object the explorer can be given. */
function subsetFor(publications, paperIds) {
  const keep = new Set(paperIds);
  const sections = [];
  publications.sections.forEach((section, s) => {
    const items = section.items.filter((_, i) => keep.has(s + ':' + i));
    if (items.length) sections.push({ ...section, items });
  });
  return { sections };
}

/** The citation counts for a renumbered subset, re-joined by title. */
function citationsFor(subset, cites) {
  const out = new Map();
  if (!cites) return out;
  subset.sections.forEach((section, s) => {
    section.items.forEach((item, i) => {
      const hit = cites.get(normaliseTitle(item.title));
      if (hit && hit.count > 0) out.set(s + ':' + i, hit.count);
    });
  });
  return out;
}

/**
 * Put "More info" on every card whose person has published.
 *
 * @param {Element} root  the rendered `#content`, with `.person` cards in it
 * @param {object}  team  the parsed data/research-team.json
 */
export async function mountTeamWork(root, team) {
  const [publications, rawAliases, scholar] = await Promise.all([
    load('publications'),
    load('author-aliases').catch(() => ({})),
    loadScholar(),
  ]);

  const aliases = Object.fromEntries(
    Object.entries(rawAliases || {}).filter(([key]) => !key.startsWith('_')),
  );
  const cites = citedByIndex(scholar);

  /* The same join the publications page makes, for the same reason: one set of
     numbers, so a card and the list can never disagree about a paper. */
  const citations = new Map();
  publications.sections.forEach((section, s) => {
    section.items.forEach((item, i) => {
      const hit = cites ? cites.get(normaliseTitle(item.title)) : null;
      if (hit && hit.count > 0) citations.set(s + ':' + i, hit.count);
    });
  });

  const graph = attachCitations(buildGraph(publications, aliases), citations);
  const people = new Map(graph.people.map((p) => [p.key, p]));
  const papers = new Map(graph.papers.map((p) => [p.id, p]));
  const keys = resolveKeys(team, people);
  if (!keys.size) return;

  const faces = await loadFaces(people).catch(() => new Map());

  /* One open card at a time: each one that opens builds a WebGL canvas, and a
     page of them is a page that stops. */
  let openPanel = null;
  let openExplorer = null;

  const sections = $$('.entry-section', root);

  keys.forEach((key, position) => {
    const [s, p] = position.split(':').map(Number);
    const person = people.get(key);
    if (!person || !person.papers.length) return;

    const card = $$('.person', sections[s])[p];
    if (!card) return;

    const partners = graph.edges
      .filter((e) => graph.people[e.source].key === key || graph.people[e.target].key === key)
      .map((e) => (graph.people[e.source].key === key ? graph.people[e.target] : graph.people[e.source]))
      .sort((a, b) => b.papers.length - a.papers.length);

    const panel = el('div', { class: 'person__work', hidden: true });

    /* The caret points right when the panel is shut and down when it is open.
       It SWAPS SYMBOL rather than rotating one, because rotating it does not
       work: `transform` on this element resolves to the identity matrix in at
       least one engine — measured, not assumed — while the icon beside it turns
       from the same declaration. Two symbols cannot be got wrong. */
    const caret = icon('fas-caret-right', { class: 'person__more-caret' });
    const pointCaret = (open) => {
      pointOneCaret(caret, open);
    };
    const button = el(
      'button',
      {
        type: 'button',
        class: 'person__more',
        'aria-expanded': 'false',
        /* `aria-expanded` tells a screen reader this opens; the triangle tells
           everybody else. Without one the counts read as a label rather than a
           control, and nobody clicks it. */
        title: 'Show this person’s publications',
      },
      caret,
      icon('fad-book-reader'),
      el('span', {
        text: person.papers.length + (person.papers.length === 1 ? ' publication' : ' publications')
          + (person.citations
            ? ' · ' + count(person.citations) + (person.citations === 1 ? ' citation' : ' citations')
            : ''),
      }),
    );

    let built = false;

    function build() {
      const mine = person.papers.map((id) => papers.get(id)).filter(Boolean);
      mine.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.citedBy || 0) - (a.citedBy || 0));

      panel.append(
        el(
          'ol',
          { class: 'person__pubs' },
          mine.map((paper) => {
            const source = publications.sections[paper.sectionIndex].items[Number(paper.id.split(':')[1])];
            const title = source && source.url
              ? el('a', { href: source.url, target: '_blank', rel: 'noopener', text: paper.title })
              : el('span', { text: paper.title });
            return el(
              'li',
              { class: 'person__pub', lang: paper.rtl ? 'fa' : null, dir: paper.rtl ? 'rtl' : null },
              el('span', { class: 'person__pub-year', text: paper.year ? String(paper.year) : '—' }),
              el('span', { class: 'person__pub-title' }, title),
              paper.citedBy
                ? el('span', {
                  class: 'person__pub-cites',
                  title: count(paper.citedBy) + (paper.citedBy === 1 ? ' citation' : ' citations'),
                  text: count(paper.citedBy),
                })
                : null,
            );
          }),
        ),
      );

      if (partners.length) {
        panel.append(
          el('h5', { class: 'person__work-head', text: 'Written with' }),
          el(
            'div',
            { class: 'person__partners' },
            partners.slice(0, 12).map((other) => {
              const face = faces.get(other.key);
              return el(
                'span',
                { class: 'person__partner', lang: other.script === 'fa' ? 'fa' : null },
                face
                  ? el('img', { class: 'person__partner-face', src: face.url, alt: '', loading: 'lazy', decoding: 'async' })
                  : null,
                el('span', { text: other.label }),
              );
            }),
          ),
        );
      }

      /* Their own graph, timeline and skyline. Dynamically imported, never
         awaited, and allowed to fail: the list above is the answer, and the
         canvas is the picture of it. */
      const stage = el('div', { class: 'person__explorer' });
      panel.append(stage);
      const subset = subsetFor(publications, person.papers);
      import('./explorer/index.js')
        .then(({ mountExplorer }) => mountExplorer(stage, {
          publications: subset,
          aliases,
          citations: citationsFor(subset, cites),
          onFilter: () => {},
          onReveal: () => {},
        }))
        .then((api) => {
          openExplorer = api;
          /* `mountExplorer` removes its own host when there is too little to
             draw — fewer than three people in the graph, which is the case for
             somebody whose one paper was written with the site owner alone.
             That is the right call for the canvas and the wrong ending for the
             panel: the reader sees a card that stops mid-thought and looks
             broken next to its neighbours. Say what happened instead. */
          if (api) return;
          panel.append(el('p', {
            class: 'person__work-note',
            text: partners.length === 1
              ? 'Only one co-author here, so there is no graph to draw.'
              : 'Too few co-authors here to draw a graph.',
          }));
        })
        .catch(() => stage.remove());
    }

    button.addEventListener('click', () => {
      const opening = panel.hidden;
      /* Where the button is on screen right now.
         Closing the card that was open may remove eight hundred pixels from
         ABOVE this one, which slides the thing the reader just clicked up and
         out of view — they clicked a card and the page appeared to jump several
         cards down. The scroll is corrected by exactly the distance the button
         moved, so from the reader's point of view it does not move at all. */
      const before = button.getBoundingClientRect().top;

      if (openPanel && openPanel !== panel) {
        openPanel.hidden = true;
        const other = openPanel.previousElementSibling;
        if (other) {
          other.setAttribute('aria-expanded', 'false');
          pointOneCaret(other.querySelector('.person__more-caret'), false);
        }
        if (openExplorer && openExplorer.stop) openExplorer.stop();
        openExplorer = null;
      }

      if (opening && !built) { built = true; build(); }
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
      pointCaret(opening);
      openPanel = opening ? panel : null;
      if (!opening && openExplorer && openExplorer.stop) {
        openExplorer.stop();
        openExplorer = null;
      }

      const shift = button.getBoundingClientRect().top - before;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: 'instant' });
    });

    card.append(button, panel);
    card.classList.add('person--published');
  });
}
