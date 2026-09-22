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
 * publications.js — theses, journal papers, lectures, patents, proceedings and
 * the Persian list, plus the 3D explorer above them.
 *
 * All six sections render through the same item template; the only differences
 * are the leading icon and, for the Persian section, the text direction. That
 * is why `data/publications.json` carries `icon`, `itemIcon` and `rtl` per
 * section — adding a seventh category needs no code change at all.
 *
 * The explorer (README §15) is mounted afterwards and given two callbacks into
 * this page: one to filter the list to a co-author's papers, one to jump to a
 * single entry. Everything it needs to identify an entry is the `data-pub-id`
 * attribute the item template writes, which is the same "section:item" string
 * the explorer computes from the data file.
 */

import { $, $$, fill, el } from '../modules/dom.js';
import { load } from '../modules/data.js';
import { icon } from '../modules/icons.js';
import { linkPanel, profilePanel } from '../modules/chrome.js';
import { section, publicationItem, tocLinks } from '../modules/sections.js';
import { loadScholar, citedByIndex, normaliseTitle } from '../modules/scholar.js';
import { mountSearch, indexPapers } from '../modules/pubsearch.js';

export async function render(site) {
  /* Both at once. The Scholar snapshot is a second local file fetched in
     parallel with the publications themselves, so it adds no round trip to the
     page and the list is built once, with the badges already in it — rather
     than being built and then walked again to staple numbers onto it.

     `loadScholar()` resolves to null rather than rejecting, and `citedByIndex`
     turns anything unusable into null as well, so when there is no snapshot the
     only thing that changes below is that `cited` is undefined for every entry.
     README §18. */
  const [data, scholar] = await Promise.all([load('publications'), loadScholar()]);
  const cites = citedByIndex(scholar);

  /* The same join, kept once.

     Every entry looks its citation count up to draw its badge, and the explorer
     needs the same numbers against the same ids to size its cards and build its
     skyline. Collecting them here, in the one pass that already does the
     lookup, means there is a single join between this site's titles and
     Google's — do it twice and the day they disagree is the day the badges say
     one thing and the canvas says another, silently.

     The key is the same "section:item" string the item template writes as
     `data-pub-id` and the explorer computes from the data file, which is what
     lets the two sides talk about a paper without matching on its title a
     second time. */
  const citations = new Map();

  fill(
    $('#content'),
    data.sections.map((sec, i) =>
      section(
        sec,
        el(
          'div',
          sec.rtl ? { class: 'rtl', lang: sec.lang || 'fa', dir: 'rtl' } : {},
          el(
            'ol',
            { class: 'pubs pubs--numbered', reversed: sec.numbered !== false },
            sec.items.map((item, k) => {
              const id = i + ':' + k;
              const hit = cites ? cites.get(normaliseTitle(item.title)) : null;
              if (hit && hit.count > 0) citations.set(id, hit.count);
              return publicationItem(item, sec.itemIcon, id, hit);
            }),
          ),
        ),
        i,
      ),
    ),
  );

  fill(
    $('#aside'),
    linkPanel('Publications', tocLinks(data.sections)),
    profilePanel(site.identifiers),
  );

  /* The search box waits for the explorer, because a person match is meant to
     drive the canvases and it can only do that once they exist. It is mounted
     either way — `api` is null when the explorer failed or was never built, and
     the box then searches text and filters the list on its own. */
  mountExplorer(data, citations).then((api) => mountPubSearch(data, api));
}

/**
 * The search box, above the canvases and the list they both answer to.
 *
 * @param {object} data  the parsed data/publications.json
 * @param {object|null} api  the explorer, if there is one
 */
function mountPubSearch(data, api) {
  const shell = $('.shell');
  const anchor = $('#explorer') || $('.layout');
  if (!shell || !anchor) return;

  const host = el('div', { class: 'pubsearch-host' });
  shell.insertBefore(host, anchor);

  mountSearch(host, {
    people: api ? api.people() : [],
    // A getter, not the map: the roster lands after the graph does.
    faces: api ? api.faces : () => new Map(),
    papers: indexPapers(data),
    onPerson: (key) => !!(api && api.selectPerson(key)),
    onPapers: (ids, label) => {
      /* A text search is not about a person, so whoever was selected lets go —
         silently, because the list is about to be filtered to this result and
         not to everything. */
      if (api) api.clearSelection({ silent: true });
      filterList(ids, label);
    },
    onClear: () => {
      if (api) api.clearSelection();
      else filterList(null, '');
    },
  });
}

/* -------------------------------------------------------------------------- */
/* The explorer                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Load and mount the explorer, after the list is on screen.
 *
 * Dynamically imported and never awaited by `render`, for the same reason as
 * the 3D field: the publications are the page, and nothing about drawing a
 * graph should be able to delay them or take them down. A failure here is
 * logged and the page carries on as the list it has always been.
 */
function mountExplorer(data, citations) {
  const content = $('#content');
  const shell = $('.shell');
  const layout = $('.layout');
  if (!content || !shell || !layout) return Promise.resolve(null);

  // Above `.layout`, not inside the article column: a force-directed graph needs
  // the width, and at 640 px it reads as a smudge.
  const host = el('div', { id: 'explorer', class: 'explorer-host' });
  shell.insertBefore(host, layout);

  return Promise.all([
    import('../modules/explorer/index.js'),
    load('author-aliases').catch(() => ({})),
  ])
    .then(([module, rawAliases]) => {
      // The alias file documents itself with `_`-prefixed keys; they are notes
      // for a human, not author keys.
      const aliases = Object.fromEntries(
        Object.entries(rawAliases || {}).filter(([key]) => !key.startsWith('_')),
      );
      return module.mountExplorer(host, {
        publications: data,
        aliases,
        // Already joined, so the explorer never has to know that Google Scholar
        // exists. An empty map is the no-snapshot case and it is not a special
        // one — see the header of explorer/index.js.
        citations,
        onFilter: filterList,
        onReveal: revealEntry,
      });
    })
    .catch((err) => {
      console.info('publications: the explorer is unavailable, continuing without it.', err);
      host.remove();
      return null;
    });
}

/** The banner that appears above the list while a filter is on. */
let banner = null;

/**
 * Show only the papers with a given co-author.
 *
 * Entries are hidden rather than removed, and sections whose entries are all
 * hidden are hidden too — otherwise a filter leaves a page of empty headings.
 * Nothing is re-rendered, so the Persian block is never rebuilt and its line
 * breaks cannot move.
 *
 * @param {string[]|null} ids  the "section:item" ids to keep, or null for all
 * @param {string} label       whose papers these are, for the banner
 */
function filterList(ids, label) {
  const keep = ids ? new Set(ids) : null;
  let shown = 0;

  for (const item of $$('[data-pub-id]')) {
    const on = !keep || keep.has(item.dataset.pubId);
    item.hidden = !on;
    if (on) shown += 1;
  }

  for (const sec of $$('.entry-section')) {
    const items = [...sec.querySelectorAll('[data-pub-id]')];
    if (!items.length) continue;
    sec.hidden = keep ? items.every((item) => item.hidden) : false;
  }

  if (!keep) {
    if (banner) { banner.remove(); banner = null; }
    return;
  }

  const text = shown + (shown === 1 ? ' publication with ' : ' publications with ') + label;
  if (!banner) {
    banner = el('p', { class: 'pub-filter', role: 'status', 'aria-live': 'polite' });
    const content = $('#content');
    content.parentNode.insertBefore(banner, content);
  }
  banner.replaceChildren(icon('fad-book-reader'), el('span', { text }));
}

/** Scroll one entry into view and mark it, without changing the filter. */
function revealEntry(id) {
  const item = document.querySelector('[data-pub-id="' + CSS.escape(id) + '"]');
  if (!item) return;
  const section = item.closest('.entry-section');
  if (section) section.hidden = false;
  item.hidden = false;
  item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  item.classList.add('is-lit');
  // The class is the same one the highlight layer uses, so the entry flashes in
  // its section's colour rather than in some second, unrelated style.
  setTimeout(() => item.classList.remove('is-lit'), 2400);
}
