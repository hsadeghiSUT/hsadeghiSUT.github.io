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
 * data.js — research-team.json, flattened into one ordered roster.
 *
 * THE ORDER IS THE DATA
 * ---------------------
 * There is no "joined" field in the JSON and there never has been. What there
 * is, and what has been maintained by hand for years, is the ORDER: every list
 * on the Research Team page is newest first, because that is how a new student
 * gets added — at the top. So a person's position within their section is a
 * record of when they arrived, and it is a more reliable one than a date field
 * nobody would remember to fill in.
 *
 * This file therefore keeps that order rather than sorting by anything, and the
 * scene lays the cards out along it: index 0 is nearest the camera and highest.
 *
 * THE YEAR IS SOMETHING ELSE
 * --------------------------
 * `year` is the completion or contract-end date, which is the thing worth
 * printing on the card and the thing worth filtering by — and it is emphatically
 * not the arrival order. Several entries are written as "August 2021" or
 * "September 2023" rather than a bare year, so the number is pulled out by
 * pattern rather than by parsing a date.
 */

/** The five sections, with the short labels the filter row uses. */
export const CATEGORIES = [
  { id: 'scholars', short: 'Postdocs', label: 'Postdoctoral Research Fellows' },
  { id: 'visiting', short: 'Scholars', label: 'Visiting Scholars' },
  { id: 'phd', short: 'PhDs', label: 'PhD Students' },
  { id: 'research-assistants', short: 'RAs', label: 'Elite Research Assistants' },
  { id: 'mphil', short: 'MPhils', label: 'MPhil Students' },
  { id: 'bsc', short: 'BScs', label: 'BSc. Final-Year Research Students' },
];

/**
 * The four-digit year inside a value like "2026", "August 2021" or "".
 * @returns {number|null}
 */
export function parseYear(value) {
  const found = String(value == null ? '' : value).match(/(19|20)\d{2}/);
  return found ? Number(found[0]) : null;
}

/**
 * @param {object} data  data/research-team.json
 * @returns {{people: Array, years: number[], counts: object}}
 */
export function buildRoster(data) {
  const people = [];

  CATEGORIES.forEach((category, lane) => {
    const section = (data.sections || []).find((s) => s.id === category.id);
    if (!section) return;

    (section.people || []).forEach((person, order) => {
      people.push({
        /* `index` is the position in the whole roster and is what the scene,
           the atlas and the hit-test all key on — one number, one meaning. */
        index: people.length,
        lane,
        order,
        categoryId: category.id,
        categoryShort: category.short,
        categoryLabel: category.label,
        name: person.name,
        note: person.note || '',
        topic: person.topic || '',
        topicLabel: person.topicLabel || '',
        status: person.status,
        photoUrl: `assets/img/people/${person.photo}`,
        yearRaw: person.year,
        year: parseYear(person.year),
        /* The label printed on the card. A bare year where there is one, and
           the raw string otherwise, so "September 2023" is not silently
           rewritten into something the page does not say. */
        yearLabel: String(parseYear(person.year) || person.year || ''),
      });
    });
  });

  const years = [...new Set(people.map((p) => p.year).filter(Boolean))]
    .sort((a, b) => b - a);

  const counts = {};
  for (const person of people) {
    counts[person.categoryId] = (counts[person.categoryId] || 0) + 1;
  }

  return { people, years, counts };
}
