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
 * team.js — Scholars, Students and Alumni.
 *
 * Adding a new student is a matter of dropping a photo into
 * `assets/img/people/` and appending one object to the right `people` array
 * in `data/research-team.json`. The `status` field ("ongoing" / "completed")
 * decides which icons appear next to the completion date.
 */

import { $, fill, el } from '../modules/dom.js';
import { load } from '../modules/data.js';
import { linkPanel } from '../modules/chrome.js';
import { section, personItem } from '../modules/sections.js';

/** Sidebar icon per section, matching the original. */
const SECTION_ICON = {
  /* Postdoctoral fellows, not visiting scholars — the section was renamed and
     the icon follows it. `fad-book` was reading as "reading list". */
  scholars: 'fad-user-graduate',
  visiting: 'fad-globe-americas',
  phd: 'fad-search',
  'research-assistants': 'fad-file-search',
  mphil: 'fad-book-reader',
  bsc: 'fad-user',
};

export async function render() {
  const data = await load('research-team');

  fill(
    $('#content'),
    data.sections.map((sec, i) =>
      section(
        { ...sec, icon: SECTION_ICON[sec.id] },
        el('div', { class: 'people' }, sec.people.map(personItem)),
        i,
      ),
    ),
  );

  /* What each of them has published.
     Dynamically imported and not awaited: it joins three data files to put a
     "More info" button on the cards whose person has publications as well as a
     thesis, and a roster that cannot reach data/publications.json is still a
     roster. */
  import('../modules/teamwork.js')
    .then(({ mountTeamWork }) => mountTeamWork($('#content'), data))
    .catch((err) => console.info('team: publication details are unavailable.', err));

  /* The 3D roster goes ABOVE `.layout`, not inside the article column — the
     same place and for the same reason as the publications explorer: fifty-five
     cards in a 640-pixel column is a smudge, and this needs the full width of
     the shell.

     It is built AFTER the lists and deliberately not awaited. It needs the
     rendered rows to scroll to when a card is clicked, and it must not delay
     them: building it means loading fifty-five photographs into a texture, and
     no part of the page should wait on that. If the browser cannot draw it, the
     host stays empty and the lists below are exactly what they were. */
  const shell = $('.shell');
  const layout = $('.layout');
  if (shell && layout) {
    const rosterHost = el('div', { class: 'roster-host' });
    shell.insertBefore(rosterHost, layout);
    import('../modules/roster/index.js')
      .then(({ mountRoster }) => mountRoster(rosterHost, data, $('#content')))
      .catch((err) => console.info('roster: not built.', err));
  }

  fill(
    $('#aside'),
    linkPanel(
      'Students',
      data.sections.map((s) => ({
        href: `#${s.id}`,
        label: s.title,
        icon: SECTION_ICON[s.id],
      })),
    ),
    data.gallery
      ? el(
          'section',
          { class: 'panel' },
          el(
            'div',
            { class: 'panel__body' },
            el('img', {
              src: `assets/img/gallery/${data.gallery.image}`,
              alt: data.gallery.caption,
              class: 'aside__photo',
              loading: 'lazy',
              'data-lightbox': '',
              'data-caption': data.gallery.caption,
            }),
          ),
        )
      : null,
  );
}
