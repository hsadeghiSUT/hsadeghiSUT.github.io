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
 * teaching.js — courses, recommendation-letter conditions, and (optionally)
 * the teaching / research assistant rosters.
 *
 * The assistant lists were commented out of the old HTML, which meant the data
 * was there but unreachable. They now live in `data/teaching.json` under
 * `assistants`, each with an `enabled` flag — flip it to `true` to publish the
 * section without touching any code.
 */

import { $, fill, el } from '../modules/dom.js';
import { load } from '../modules/data.js';
import { icon } from '../modules/icons.js';
import { linkPanel } from '../modules/chrome.js';
import { section } from '../modules/sections.js';

const GROUP_ICON = {
  undergraduate: 'fas-chalkboard-teacher',
  graduate: 'fad-chalkboard-teacher',
  ugrecom: 'fal-envelope',
  pgrecom: 'fad-envelope',
  mpgrecom: 'fas-envelope',
};

function courseList(sec) {
  return el(
    'ul',
    { class: 'course-list' },
    sec.items.map((item) =>
      el(
        'li',
        { 'data-tone': item.tone || null, 'data-fx': '' },
        icon(item.icon, { class: item.tone === 'highlight' ? 'c-accent' : null }),
        el('span', { html: item.text }),
      ),
    ),
  );
}

function assistantBlock(group) {
  if (!group || group.enabled === false) return null;
  if (group.courses) {
    return el(
      'section',
      { id: group.id, class: 'entry-section', 'data-reveal': '', 'data-fx-hue': '4' },
      el('h3', { text: group.title }),
      group.courses.map((course) =>
        el(
          'div',
          {},
          el('h4', { text: course.course }),
          el(
            'ul',
            { class: 'tl' },
            course.assistants.map((a) =>
              el(
                'li',
                { class: 'tl__item', 'data-fx': '' },
                el('span', { class: 'tl__body', html: a.name }),
                el('b', { class: 'tl__period', text: a.year }),
              ),
            ),
          ),
        ),
      ),
      el('hr'),
    );
  }
  return el(
    'section',
    { id: group.id, class: 'entry-section', 'data-reveal': '' },
    el('h3', { text: group.title }),
    el(
      'ul',
      { class: 'tl' },
      group.items.map((a) =>
        el(
          'li',
          { class: 'tl__item' },
          el(
            'span',
            { class: 'tl__body' },
            el(
              'span',
              {},
              el('b', { html: a.name }),
              el(
                'span',
                { class: 'course-list__note' },
                icon('fad-print-search'),
                ` Topic: ${a.topic}`,
              ),
            ),
          ),
          el('b', { class: 'tl__period', text: a.period }),
        ),
      ),
    ),
    el('hr'),
  );
}

export async function render() {
  const data = await load('teaching');
  const byGroup = (g) => data.sections.filter((s) => s.group === g);

  const courses = byGroup('courses');
  fill(
    $('#content'),
    courses.map((sec, i) => section({ ...sec, icon: GROUP_ICON[sec.id] }, courseList(sec), i)),
  );

  fill(
    $('#content-2'),
    // The hue index continues from the courses above rather than restarting, so
    // no two sections on the page share a colour.
    byGroup('letters').map((sec, i) =>
      section({ ...sec, icon: GROUP_ICON[sec.id] }, courseList(sec), courses.length + i),
    ),
  );

  const assistants = [
    assistantBlock(data.assistants?.teaching),
    assistantBlock(data.assistants?.research),
  ].filter(Boolean);
  const host = $('#content-3');
  if (assistants.length) fill(host, assistants);
  else host.closest('.post')?.remove();

  const links = data.sections.map((s) => ({
    href: `#${s.id}`,
    label: s.title,
    icon: GROUP_ICON[s.id],
  }));
  for (const key of ['teaching', 'research']) {
    const g = data.assistants?.[key];
    if (g && g.enabled !== false) links.push({ href: `#${g.id}`, label: g.title, icon: 'fal-user-graduate' });
  }

  fill($('#aside'), linkPanel('Teaching', links));
}
