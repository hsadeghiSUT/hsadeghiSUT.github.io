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
 * services.js — funded projects, journal review panels, organising committees
 * and conference review panels.
 *
 * Four sections, four shapes. Each section in `data/services.json` declares its
 * own `kind`, and the matching template below renders it — so a new kind of
 * service means adding one small function here rather than rewriting the page.
 */

import { $, fill, el } from '../modules/dom.js';
import { load } from '../modules/data.js';
import { linkPanel, profilePanel } from '../modules/chrome.js';
import { section } from '../modules/sections.js';

const SECTION_ICON = {
  projects: 'fad-industry',
  'journal-review': 'fad-user-check',
  'organizing-committee': 'fad-user-check',
  'conference-review': 'fad-user-check',
};

/** One template per `kind` declared in the data file. */
const TEMPLATES = {
  /** A funded project: title, funder, and the grant period on the right. */
  project: (item) =>
    el(
      'li',
      { class: 'project', 'data-fx': '' },
      el('span', { class: 'project__title', html: item.title }),
      el(
        'div',
        { class: 'project__meta' },
        el('span', { html: item.org }),
        item.period ? el('b', { class: 'project__period', text: item.period }) : null,
      ),
    ),

  /** A bare journal name. */
  plain: (item) => el('li', { html: item.text, 'data-fx': '' }),

  /** A committee role: what, where, when. */
  role: (item) =>
    el(
      'li',
      { class: 'service', 'data-fx': '' },
      el('span', { class: 'service__role', html: item.role }),
      el('div', { class: 'service__event', html: item.event }),
      el('div', { class: 'service__place', html: item.place }),
    ),

  /** A reviewed conference: name then venue line. */
  conference: (item) =>
    el(
      'li',
      { class: 'service', 'data-fx': '' },
      el('span', { class: 'service__role', html: item.event }),
      el('div', { class: 'service__place', html: item.place }),
    ),
};

export async function render(site) {
  const data = await load('services');

  fill(
    $('#content'),
    data.sections.map((sec, i) =>
      section(
        { ...sec, icon: SECTION_ICON[sec.id] },
        el(
          'ul',
          { class: sec.kind === 'plain' ? 'plain-list' : 'service-list' },
          sec.items.map(TEMPLATES[sec.kind] || TEMPLATES.plain),
        ),
        i,
      ),
    ),
  );

  fill(
    $('#aside'),
    linkPanel(
      'Academic Services',
      data.sections.map((s) => ({ href: `#${s.id}`, label: s.title, icon: SECTION_ICON[s.id] })),
    ),
    profilePanel(site.socials),
  );
}
