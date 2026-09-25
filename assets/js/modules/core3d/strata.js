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
 * strata.js — the career as a borehole log.
 *
 * WHY A CORE, AND WHY IT IS NOT A METAPHOR STRETCHED TO FIT
 * --------------------------------------------------------
 * A stratigraphic column records time as depth, youngest at the surface, oldest
 * at the bottom, with the thickness of each bed standing for how long it took
 * to lay down. A career is the same shape: this year at the top, the first
 * degree at the bottom, and a long appointment is a thick bed. Nothing has to
 * be bent to make that work — it is the one visual language that already means
 * exactly this, and it happens to be the language of the group's own field.
 *
 * The data is `data/background.json`, which has a period on every one of its
 * thirty-eight entries.
 *
 * THE ONE HONEST DIFFICULTY: ROLES OVERLAP
 * ----------------------------------------
 * A real bed cannot occupy the same depth as another one, and career entries
 * constantly do — "2018 – 2023" runs straight through "2022 – 2023", because a
 * person can hold a post and a visiting post at once. Drawn literally, those
 * are two beds at the same depth, which is not a log, it is a mess.
 *
 * So the column is built from where each entry BEGINS. Sorted by start year,
 * each one claims the ground from its own start up to the start of the next,
 * and the result tiles the whole span with no gaps and no overlaps. The bed
 * boundaries are therefore the moments something changed, which is what the
 * boundaries in a real log are too. Every entry keeps its own stated period in
 * the readout, so nothing about the record is hidden by the drawing of it.
 */

/** Which sections of background.json make up the column, deepest first. */
export const CORE_SECTIONS = ['education', 'profession'];

/**
 * A period string as a pair of years.
 *
 * The formats in use are "2012 – 2016", "2023 – Now" and a bare "2025". The
 * dash is an en dash with spaces around it; a hyphen is accepted too, because
 * the next person to add a row will type one.
 *
 * @returns {{from: number, to: number, open: boolean}|null}
 */
export function parsePeriod(text, thisYear) {
  const raw = String(text == null ? '' : text).replace(/&[a-z]+;/gi, ' ').trim();
  if (!raw) return null;

  const years = raw.match(/(19|20)\d{2}/g);
  if (!years || !years.length) return null;

  const from = Number(years[0]);
  const open = /now|present|ongoing/i.test(raw);
  const to = open ? thisYear : Number(years[1] || years[0]);
  return { from, to: Math.max(from, to), open };
}

/**
 * The lithology ramp.
 *
 * Six units, from the deep dark clays to the pale surface soil — the order a
 * core actually comes out in, so the column reads as one body of ground rather
 * than as six coloured bands. They are fixed rather than taken from the theme:
 * a soil profile whose colours change with the page's colour scheme is not a
 * soil profile. Each is legible against both backgrounds.
 */
const LITHOLOGY = [
  { name: 'Dark clay', colour: [0.24, 0.20, 0.18], grain: 0.15 },
  { name: 'Silty clay', colour: [0.36, 0.28, 0.22], grain: 0.30 },
  { name: 'Clayey silt', colour: [0.47, 0.37, 0.27], grain: 0.45 },
  { name: 'Silt', colour: [0.58, 0.47, 0.34], grain: 0.62 },
  { name: 'Sandy silt', colour: [0.68, 0.57, 0.41], grain: 0.78 },
  { name: 'Topsoil', colour: [0.76, 0.66, 0.49], grain: 0.92 },
];

/**
 * Build the column.
 *
 * @param {object} data      data/background.json
 * @param {number} thisYear  what "Now" means today
 * @returns {{beds: Array, span: {from: number, to: number}, years: number}}
 */
export function buildStrata(data, thisYear = new Date().getFullYear()) {
  const entries = [];

  for (const id of CORE_SECTIONS) {
    const section = (data.sections || []).find((s) => s.id === id);
    if (!section) continue;
    (section.items || []).forEach((item, order) => {
      const period = parsePeriod(item.period, thisYear);
      if (!period) return;
      entries.push({
        sectionId: id,
        sectionTitle: section.title,
        order,
        lead: item.lead || '',
        /* The body carries an anchor to the institution. The column wants the
           words, not the markup — the list below is where a link belongs. */
        body: String(item.body || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        periodText: String(item.period || '').replace(/&[a-z]+;/gi, ' ').trim(),
        ...period,
      });
    });
  }

  if (!entries.length) return { beds: [], span: { from: 0, to: 0 }, years: 0 };

  /* Oldest first. Ties broken by the longer entry first, so that when a degree
     and the post that began the same year are both present, the one that
     lasted is the bed and the other sits inside it. */
  entries.sort((a, b) => (a.from - b.from) || (b.to - a.to));

  const from = entries[0].from;
  const to = Math.max(...entries.map((e) => e.to));

  /* Each entry holds the ground from its own start to the next entry's start.
     The last one holds it to the end of the record.
     
     ENTRIES THAT BEGIN IN THE SAME YEAR SHARE THAT GROUND.
     
     Two roles starting in 2016 would otherwise both claim from 2016 to the next
     start, which is the overlap this whole scheme exists to avoid — and forcing
     a minimum thickness on the first simply pushed it up through the second.
     So a run of entries with the same start year splits the interval between
     them, evenly, in the order they were sorted. The tiling stays exact: every
     year of the record is covered once. */
  const beds = [];
  for (let i = 0; i < entries.length;) {
    let j = i;
    while (j + 1 < entries.length && entries[j + 1].from === entries[i].from) j += 1;

    const run = entries.slice(i, j + 1);
    const after = entries[j + 1];
    const runFrom = entries[i].from;
    const runTo = after ? Math.max(after.from, runFrom) : Math.max(...run.map((e) => e.to));
    const step = (runTo - runFrom) / run.length;

    run.forEach((entry, k) => {
      beds.push({
        ...entry,
        /* `base` and `top` are the bed's extent in the COLUMN, not the entry's
           stated period — `periodText` keeps that, and the readout shows it. */
        base: runFrom + step * k,
        top: runFrom + step * (k + 1),
      });
    });
    i = j + 1;
  }

  /* Deepest bed first in the array, which is also the order they are stacked
     from the bottom of the core upward. */
  beds.forEach((bed, i) => {
    const t = beds.length > 1 ? i / (beds.length - 1) : 0.5;
    const unit = LITHOLOGY[Math.min(LITHOLOGY.length - 1, Math.round(t * (LITHOLOGY.length - 1)))];
    bed.index = i;
    bed.unit = unit.name;
    bed.colour = unit.colour;
    bed.grain = unit.grain;
  });

  return { beds, span: { from, to }, years: to - from };
}

/**
 * Where a bed sits on the core, in scene units.
 *
 * The core is drawn a fixed height whatever it spans, so a reader always gets
 * the same object; the years inside it are what change. Depth is measured from
 * the top, because that is how a log is read and how a depth scale is numbered.
 *
 * @param {object} bed
 * @param {{from: number, to: number}} span
 * @param {number} height  the drawn height of the whole core
 */
export function bedPlacement(bed, span, height) {
  const total = Math.max(1, span.to - span.from);
  const bottom = ((bed.base - span.from) / total) * height;
  const topY = ((bed.top - span.from) / total) * height;
  return {
    /* Centred on its own middle, and measured from the core's mid-height so the
       whole column is centred on the origin. */
    y: (bottom + topY) / 2 - height / 2,
    thickness: Math.max(0.001, topY - bottom),
  };
}
