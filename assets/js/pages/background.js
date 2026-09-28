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

  fill($('#aside'), linkPanel('Background', tocLinks(data.sections)));
}
