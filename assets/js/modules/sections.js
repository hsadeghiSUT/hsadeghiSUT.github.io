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
 * sections.js — shared building blocks for the data-driven pages.
 *
 * Every content page has the same shape: a run of titled sections separated by
 * rules, each holding a list of items. Only the *item* markup differs, so that
 * is the one thing each page supplies.
 */

import { el } from './dom.js';
import { icon } from './icons.js';

/**
 * Wrap a list of rendered items in a titled, anchored section.
 *
 * `data-fx-hue` is what gives the section its colour in the 3D highlight layer:
 * every item inside it lights the same hue, so after a moment of scrolling the
 * colour of the light tells you which part of a long page you are in. Six hues
 * cycle; they are defined per colour scheme in theme.css. See
 * assets/js/modules/fx/highlight.js.
 *
 * @param {object} section  `{ id, title, icon }` from the data file
 * @param {Node|Node[]} body
 * @param {number} index    position on the page, which picks the hue
 */
export function section(section_, body, index = 0) {
  return el(
    'section',
    {
      id: section_.id,
      class: 'entry-section',
      'data-reveal': '',
      'data-fx-hue': String(index % 6),
    },
    el(
      'h3',
      { class: 'hov-parent' },
      icon(section_.icon, { class: 'hov-tada' }),
      section_.icon ? ' ' : null,
      el('span', { text: section_.title }),
    ),
    body,
    el('hr'),
  );
}

/**
 * A row with text on the left and a year or period hard right — the pattern
 * used by Background, Honours and the funded-projects list.
 */
export function timelineItem({ iconId, iconClass, lead, body, period, extraClass }) {
  return el(
    'li',
    { class: ['tl__item', extraClass].filter(Boolean).join(' '), 'data-fx': '' },
    el(
      'span',
      { class: 'tl__body' },
      icon(iconId, { class: iconClass }),
      el(
        'span',
        {},
        lead ? el('b', { class: 'tl__lead', text: `${lead}: ` }) : null,
        el('span', { html: body }),
      ),
    ),
    period ? el('b', { class: 'tl__period', html: period }) : null,
  );
}

/**
 * A publication / patent / lecture entry.
 *
 * `id` is "sectionIndex:itemIndex" — the same identifier the explorer computes
 * from the data file (README §15), which is how a click on a co-author can
 * filter this list without matching on titles.
 *
 * `cited` is `{ count, url }` from `scholar.js`, or null — and null is the
 * ordinary case, not an error: a paper below the badge threshold, a paper
 * Scholar does not list, or a visit on which the snapshot was not available at
 * all. Every one of those renders the entry exactly as it rendered before the
 * Scholar figures existed. README §18.
 */
export function publicationItem(item, itemIcon, id, cited) {
  const heading = el(
    'span',
    { class: 'pub__title' },
    icon(itemIcon),
    item.url
      ? el('a', { href: item.url, target: '_blank', rel: 'noopener', html: item.title })
      : el('span', { html: item.title }),
  );
  return el(
    'li',
    // `data-fx` opts this entry into the highlight layer: hovering it (or, on a
    // touch screen, scrolling it to the middle of the viewport) lights it and
    // the field behind the page in its section's colour.
    { 'data-fx': '', 'data-pub-id': id || null },
    heading,
    item.authors ? el('div', { class: 'pub__authors', html: item.authors }) : null,
    item.details ? el('div', { class: 'pub__details', html: item.details }) : null,
    citedBadge(cited),
  );
}

/**
 * "Cited by N" under one entry, or null.
 *
 * A link when Scholar gave us one — it goes to the list of papers that cite
 * this one, which is the thing a reader following a citation count actually
 * wants — and a plain span when it did not, rather than a link to nowhere.
 *
 * @param {{count:number,url:string|null}|null} cited
 */
function citedBadge(cited) {
  if (!cited || !cited.count) return null;

  const label = `Cited by ${cited.count}`;
  // Split so the label can be the quiet half and the figure the loud one, and
  // so the whole thing still reads as the sentence it is when the styling is
  // gone. The accessible name below starts with the same words in the same
  // order, which is what keeps the visible label and the announced one one
  // thing rather than two.
  const body = [
    el('span', { class: 'pub__cited-label', text: 'Cited by' }),
    el('span', { class: 'pub__cited-n', text: String(cited.count) }),
  ];

  return cited.url
    ? el(
        'a',
        {
          class: 'pub__cited',
          href: cited.url,
          target: '_blank',
          rel: 'noopener',
          'aria-label': `${label} — see the citing papers on Google Scholar`,
          title: 'Citing papers on Google Scholar',
        },
        body,
      )
    : el('span', { class: 'pub__cited', title: 'Citations on Google Scholar' }, body);
}

/** One person card on the Research Team page. */
export function personItem(person) {
  const done = person.status === 'completed';
  const statusIcons = done
    ? [icon('fad-check-circle', { class: 'anim-pulse', title: 'Completed' })]
    : person.status === 'ongoing'
      ? [
          icon('fad-digging', { title: 'In progress' }),
          icon('fad-spinner', { class: 'anim-spin-step' }),
        ]
      : [icon('fas-hourglass-end', { title: 'Scheduled' })];

  const nameNode = el(
    'h4',
    { class: 'person__name' },
    person.profileUrl
      ? el('a', { href: person.profileUrl, target: '_blank', rel: 'noopener', text: person.name })
      : el('span', { text: person.name }),
    person.note ? el('span', { class: 'person__note', text: `(${person.note})` }) : null,
  );

  return el(
    'article',
    { class: 'person', 'data-fx': '' },
    el('img', {
      class: 'person__photo',
      src: `assets/img/people/${person.photo}`,
      alt: person.alt && person.alt !== '****' ? person.alt : person.name,
      loading: 'lazy',
      decoding: 'async',
    }),
    nameNode,
    el(
      'p',
      { class: 'person__topic' },
      icon(person.topicIcon || (done ? 'fad-book' : 'fad-book-open'), {
        class: person.topicIcon === 'fad-book' || (!person.topicIcon && done) ? 'anim-passing' : null,
      }),
      el(
        'span',
        {},
        person.topicLabel ? `${person.topicLabel}: ` : '',
        person.topicUrl
          ? el('a', { href: person.topicUrl, target: '_blank', rel: 'noopener', text: person.topic })
          : person.topic,
      ),
    ),
    el(
      'p',
      { class: 'person__date' },
      icon('fad-calendar-alt'),
      el('span', {}, `${person.dateLabel}: ${person.year}`),
      el('span', { class: 'person__status' }, statusIcons),
    ),
  );
}

/**
 * Build the sidebar jump list for a page from its own section data — so adding
 * a section to a JSON file automatically adds it to the sidebar too.
 */
export function tocLinks(sections, iconFor = () => 'fad-check-circle') {
  return sections.map((s) => ({
    href: `#${s.id}`,
    label: s.title,
    icon: s.icon || iconFor(s),
  }));
}
