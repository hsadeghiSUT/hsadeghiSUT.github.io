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
 * honors.js — Honours & Awards, newest first.
 *
 * Each entry is a bold title line, a softer organisation line, and the year
 * pinned to the right. The original alternated three icon weights down the list
 * purely for texture; that rhythm is reproduced here from the item's position
 * instead of being hard-coded into every row.
 */

import { $, fill, el } from '../modules/dom.js';
import { load } from '../modules/data.js';
import { icon } from '../modules/icons.js';
import { linkPanel } from '../modules/chrome.js';
import { section } from '../modules/sections.js';

/** The solid → duotone → light cycle the original used. */
const STAR_CYCLE = ['fas-star', 'fad-star', 'fal-star'];

export async function render() {
  const data = await load('honors');

  fill(
    $('#content'),
    data.sections.map((sec, si) =>
      section(
        sec,
        el(
          'ul',
          { class: 'honours' },
          sec.items.map((item, i) =>
            el(
              'li',
              { class: 'honour', 'data-fx': '' },
              el(
                'span',
                { class: 'honour__title' },
                icon(STAR_CYCLE[i % STAR_CYCLE.length], { class: 'anim-pulse' }),
                el('span', { html: item.title }),
              ),
              el(
                'div',
                { class: 'honour__meta' },
                el('span', { html: item.org }),
                item.year ? el('b', { class: 'honour__year', text: item.year }) : null,
              ),
            ),
          ),
        ),
        si,
      ),
    ),
  );

  fill(
    $('#aside'),
    linkPanel('Honors & Awards', [
      { href: '#honors', label: 'Chronological order', icon: 'fad-award' },
    ]),
  );
}
