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
 * home.js — the Summary page.
 *
 * 2026 REDESIGN. The page is now three movements rather than one long column:
 *
 *   1. A hero  — portrait, name, role, affiliation and the two or three links a
 *                visitor actually came for (email, Scholar, ORCID).
 *   2. Section cards — one per area of the site, so the home page acts as a
 *                door into the rest of it instead of a dead end.
 *   3. The biography and research interests, as before.
 *
 * All of it is still built from `data/home.json` and `data/site.json`; no new
 * content was invented and nothing was dropped.
 */

import { $, el, fill } from '../modules/dom.js';
import { load } from '../modules/data.js';
import { icon } from '../modules/icons.js';
import { linkPanel } from '../modules/chrome.js';
import { renderEmail } from '../modules/email.js';
import { loadScholar, metricTiles, formatCount, formatFetched } from '../modules/scholar.js';

/**
 * The cards under the hero. `count` is a function so the numbers come from the
 * data files rather than being typed in here and going stale.
 */
const CARDS = [
  {
    id: 'publications',
    href: 'publications.html',
    icon: 'fad-books',
    title: 'Publications',
    blurb: 'Journal papers, conference proceedings, patents and invited lectures.',
    count: (d) => d.publications.sections.reduce((n, s) => n + s.items.length, 0),
    unit: 'items',
  },
  {
    id: 'team',
    href: 'research-team.html',
    icon: 'fad-book-reader',
    title: 'Research Team',
    blurb: 'Scholars, doctoral and master’s students, and research assistants.',
    count: (d) => d.team.sections.reduce((n, s) => n + s.people.length, 0),
    unit: 'people',
  },
  {
    id: 'teaching',
    href: 'teaching.html',
    icon: 'fad-chalkboard-teacher',
    title: 'Teaching',
    blurb: 'Undergraduate and postgraduate courses at Sharif.',
    count: (d) => d.teaching.sections.filter((s) => s.group === 'courses')
      .reduce((n, s) => n + s.items.length, 0),
    unit: 'courses',
  },
  {
    id: 'services',
    href: 'services.html',
    icon: 'fad-industry',
    title: 'Projects & Services',
    blurb: 'Funded research, review panels and organising committees.',
    count: (d) => d.services.sections.reduce((n, s) => n + s.items.length, 0),
    unit: 'entries',
  },
  {
    id: 'honors',
    href: 'honors.html',
    icon: 'fad-award',
    title: 'Honors & Awards',
    blurb: 'Grants, prizes and distinctions, most recent first.',
    count: (d) => d.honors.sections.reduce((n, s) => n + s.items.length, 0),
    unit: 'awards',
  },
  {
    id: 'background',
    href: 'background.html',
    icon: 'fad-history',
    title: 'Background',
    blurb: 'Academic posts, degrees, administrative roles and memberships.',
    count: (d) => d.background.sections.reduce((n, s) => n + s.items.length, 0),
    unit: 'entries',
  },
];

/**
 * The three Google Scholar figures, as tiles in the hero — or `null`.
 *
 * Returning null is the whole point of this function, and `el()` already skips
 * a null child, so the caller writes it into the hero unconditionally and an
 * unavailable snapshot leaves a hero with nothing missing from it: no empty
 * row, no placeholder, no gap where three numbers would have been. README §18.
 *
 * The block is a link to the profile it came from. A citation count with no way
 * to check it is an assertion; with the link it is a summary of something the
 * reader can go and look at — which also gives the numbers somewhere to say
 * where they are from without a line of small print under the hero.
 *
 * @param {object|null} scholar  from `loadScholar()`
 * @param {object} profile       the `scholar` entry of site.json's identifiers
 */
function scholarStats(scholar, profile) {
  const tiles = metricTiles(scholar);
  if (!tiles) return null;

  const href = (scholar && scholar.profileUrl) || (profile && profile.url);
  const asOf = formatFetched(scholar && scholar.fetched);

  return el(
    'a',
    {
      class: 'stats',
      href,
      target: '_blank',
      rel: 'noopener',
      // The figures are a summary of the profile, so the accessible name says
      // so once here rather than each tile repeating "on Google Scholar".
      'aria-label': `Citation metrics on Google Scholar: ${
        tiles.map((t) => `${formatCount(t.value)} ${t.label}`).join(', ')}`,
      title: 'Citation metrics on Google Scholar'
        + (asOf ? ` — as of ${asOf}` : ''),
    },
    tiles.map((tile) =>
      el(
        'span',
        { class: 'stat', 'data-stat': tile.key },
        // `aria-hidden` on the pair: the link's own label above already reads
        // the same three numbers, and without this a screen reader announces
        // every figure twice.
        el('b', { class: 'stat__value', text: formatCount(tile.value), 'aria-hidden': 'true' }),
        el('span', { class: 'stat__label', text: tile.label, 'aria-hidden': 'true' }),
      ),
    ),
    /* The date the figures were taken, under the three tiles.

       It was only ever in the `title` attribute, which is to say it was only
       ever available to a reader who happened to rest a mouse on the block and
       wait — not on a phone at all. A citation count with no date is a claim
       about now; with a date it is a measurement, and a reader can tell at a
       glance whether the site is being kept up or was abandoned in 2021. Since
       the snapshot is refreshed every day by
       `.github/workflows/refresh-scholar.yml`, this line is also the only
       visible evidence that any of that is happening.

       `formatFetched` returns null for a snapshot with no usable date, `el()`
       skips a null child, and the row is a grid, so nothing shifts when the
       line is absent. Fourth grid item, spanning all three columns — inside the
       link rather than beside it, so the block keeps its single focus ring.

       `aria-hidden`, like the tiles: the link's own `aria-label` already says
       where the numbers come from, and the date is repeated in `title`. */
    asOf
      ? el('span', { class: 'stat__asof', 'aria-hidden': 'true' }, 'Google Scholar · ' + asOf)
      : null,
  );
}

export async function render(site) {
  const [home, publications, team, teaching, services, honors, background, scholar] =
    await Promise.all([
      ...['home', 'publications', 'research-team', 'teaching', 'services', 'honors', 'background']
        .map(load),
      /* The Scholar snapshot joins the same batch rather than arriving late.
         It is a local file the size of a photograph's thumbnail, requested in
         parallel with seven others the page is already waiting on, so it costs
         no round trip of its own and the hero is laid out once, complete —
         rather than being drawn and then pushed down when a figure turns up.
         `loadScholar()` resolves to null instead of rejecting, so a missing or
         stale snapshot cannot take this `Promise.all` down with it. */
      loadScholar(),
    ]);
  const data = { publications, team, teaching, services, honors, background };

  /* ------------------------------------------------------------------- hero */
  const primary = site.identifiers.items.find((i) => i.id === 'scholar');
  const orcid = site.identifiers.items.find((i) => i.id === 'orcid');
  const address = `${home.emailParts[0]}@${home.emailParts[1]}`;

  fill(
    $('#hero'),
    el(
      'section',
      {
        class: 'hero',
        /* Field-only, and local. `data-fx-field` (rather than `data-fx`) means
           the stars behind the page respond and the card itself does not: no
           ring, no tilt, no lift — it was asked to stay put and it does. And
           "local" means the light is the piece of the card's border nearest the
           pointer rather than its whole perimeter, because this card is most of
           the screen and lighting all four sides of it at once tells you about
           three places you are not looking. See fx/highlight.js. */
        'data-fx-field': 'local',
        /* Blue: next door to the resting cyan so it never clashes with the
           field it is lifting out of, but far enough along to read as this
           card's own colour rather than the field simply getting brighter. */
        'data-fx-hue': '5',
      },
      el('img', {
        class: 'hero__photo',
        src: home.photo,
        alt: `Dr. ${home.name}`,
        width: 280,
        height: 300,
        fetchpriority: 'high',
      }),
      el(
        'div',
        { class: 'hero__body' },
        el('p', { class: 'hero__kicker', text: home.position }),
        el('h1', { class: 'hero__name', text: home.name }),

        // The roles, as quiet chips rather than six stacked bold lines.
        el(
          'ul',
          { class: 'chips' },
          home.roles.map((role) =>
            el(
              'li',
              {},
              role.url
                ? el('a', {
                    class: 'chip chip--link',
                    href: role.url,
                    target: '_blank',
                    rel: 'noopener',
                    text: role.label,
                  })
                : el('span', { class: 'chip', text: role.label }),
            ),
          ),
        ),

        el(
          'p',
          { class: 'hero__affil' },
          icon('fad-building'),
          el('a', {
            href: home.affiliations[0].url,
            target: '_blank',
            rel: 'noopener',
            text: home.affiliations[0].label,
          }),
          ' · ',
          el('a', {
            href: home.affiliations[1].url,
            target: '_blank',
            rel: 'noopener',
            text: home.affiliations[1].label,
          }),
          ' · ',
          el('span', { text: home.address[1].label }),
        ),

        // The citation figures — or nothing at all. See scholarStats().
        scholarStats(scholar, primary),

        // The three things a visitor most often wants.
        el(
          'div',
          { class: 'hero__actions' },
          el(
            'a',
            { class: 'btn btn--primary', href: `mailto:${address}` },
            icon('fad-envelope'),
            el('span', { text: 'Email' }),
          ),
          el(
            'a',
            { class: 'btn', href: primary.url, target: '_blank', rel: 'noopener' },
            el('img', { src: `assets/img/brand/${primary.image}`, alt: '', width: 18, height: 18 }),
            el('span', { text: 'Google Scholar' }),
          ),
          el(
            'a',
            { class: 'btn', href: orcid.url, target: '_blank', rel: 'noopener' },
            icon(orcid.icon, { class: 'c-orcid' }),
            el('span', { text: 'ORCID' }),
          ),
        ),
      ),
    ),

    /* ------------------------------------------------------ section cards */
    el(
      'nav',
      { class: 'cards', 'aria-label': 'Sections of this site' },
      CARDS.map((card, i) =>
        el(
          'a',
          {
            class: 'card',
            href: card.href,
            'data-reveal': '',
            // Each card is its own highlight target and carries its own hue, so
            // hovering one lights the field behind the page in that section's
            // colour — the same colour that section's entries use on its page.
            'data-fx': '',
            'data-fx-hue': String(i % 6),
          },
          el('span', { class: 'card__icon' }, icon(card.icon)),
          el('h2', { class: 'card__title', text: card.title }),
          el('p', { class: 'card__blurb', text: card.blurb }),
          el(
            'span',
            { class: 'card__meta' },
            el('span', { class: 'card__count', text: String(card.count(data)) }),
            el('span', { text: ` ${card.unit}` }),
            icon('fal-arrow-circle-up', { class: 'card__arrow' }),
          ),
        ),
      ),
    ),
  );

  /* ---------------------------------------------------------------- article */
  fill(
    $('#profile'),
    el('h2', { class: 'section-title', text: 'Biography' }),
    el(
      'div',
      { class: 'bio' },
      home.bio.map((p, i) => el('p', { class: i === 0 ? 'bio__lead' : null, text: p })),
    ),

    el('h2', { class: 'section-title', text: 'Research Interests' }),
    el(
      'ul',
      { class: 'interests' },
      home.interests.map((item) =>
        el('li', { 'data-fx': '' }, icon(item.icon), el('span', { text: item.text })),
      ),
    ),
  );

  /* ---------------------------------------------------------------- sidebar */
  fill(
    $('#aside'),
    // Contact details, which used to be buried in the middle of the article.
    el(
      'section',
      { class: 'panel' },
      el('h2', { class: 'panel__title' }, icon('fad-envelope'), el('span', { text: 'Contact' })),
      el(
        'div',
        { class: 'panel__body' },
        el(
          'ul',
          { class: 'contact' },
          el(
            'li',
            {},
            icon('fad-envelope'),
            el('span', {}, el('span', { id: 'email' })),
          ),
          ...home.contact.map((row) =>
            el(
              'li',
              {},
              icon(row.icon),
              el(
                'span',
                {},
                el('span', { class: 'contact__label', text: `${row.label}: ` }),
                row.href ? el('a', { href: row.href, text: row.value }) : row.value,
              ),
            ),
          ),
          ...home.address.map((row) => el('li', {}, icon(row.icon), el('span', { text: row.label }))),
        ),
      ),
    ),
    // No `{ logo: true }` any more: the university mark moved to the header,
    // where it is on every page rather than only this one — see
    // assets/js/modules/logo3d/.
    linkPanel('Pages', site.nav.map((n) => ({ ...n, current: n.id === 'home' }))),
  );

  renderEmail($('#email'), home.emailParts);
}
