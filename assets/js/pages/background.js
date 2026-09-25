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
 * background.js — Professional / Educational / Administrative / Membership.
 *
 * Every section is the same shape (a label, an organisation, a period), so one
 * loop covers all four. Add a fifth section to `data/background.json` and it
 * appears here and in the sidebar automatically.
 */

import { $, fill, el } from '../modules/dom.js';
import { load } from '../modules/data.js';
import { linkPanel } from '../modules/chrome.js';
import { section, timelineItem, tocLinks } from '../modules/sections.js';

export async function render() {
  const data = await load('background');

  fill(
    $('#content'),
    data.sections.map((sec, i) =>
      section(
        sec,
        el(
          'ul',
          { class: `tl ${sec.id === 'membership' ? 'tl--membership' : ''}` },
          sec.items.map((item) =>
            timelineItem({
              iconId: sec.icon,
              iconClass: sec.iconClass === 'fa-spin' ? 'anim-spin' : null,
              lead: item.lead,
              body: item.body,
              period: item.period,
            }),
          ),
        ),
        i,
      ),
    ),
  );

  /* The core goes ABOVE `.layout`, not inside the article column — the same
     place and the same reasoning as the publications explorer and the 3D
     roster: a six-unit column of eleven beds in a 640-pixel measure is a
     splinter, and this wants the width of the shell.

     Built after the lists and deliberately not awaited. It needs the rendered
     rows to scroll to when a bed is clicked, and it must not delay them. If the
     browser cannot draw it the host stays empty and the lists below are exactly
     what they were. */
  const shell = $('.shell');
  const layout = $('.layout');
  if (shell && layout) {
    const coreHost = el('div', { class: 'roster-host' });
    shell.insertBefore(coreHost, layout);
    import('../modules/core3d/index.js')
      .then(({ mountCore }) => mountCore(coreHost, data, $('#content')))
      .catch((err) => console.info('core: not built.', err));
  }

  fill($('#aside'), linkPanel('Background', tocLinks(data.sections)));
}
