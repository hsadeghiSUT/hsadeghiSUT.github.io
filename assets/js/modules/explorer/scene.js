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
 * scene.js — turns the data into the vertex arrays both renderers upload.
 *
 * Neither renderer decides what the explorer *contains*; they only decide how
 * to put it on screen. Everything either of them needs is built here, once,
 * from the graph in data.js and the layout in layout.js.
 *
 * Both views produce the same two bundles:
 *
 *   quads   six vertices each — nodes in the graph, cards in the timeline.
 *           Billboarded in the shader, so the arrays hold a centre, a corner
 *           offset, a size, a colour and a state.
 *   lines   two vertices each — the co-authorship edges. The timeline has none.
 *
 * The `state` arrays are the only ones that change after upload. Everything
 * else is written once and left alone.
 */

/** Quad corners, as two triangles. */
const CORNERS = [
  [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5],
  [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5],
];

/** Node radius from paper count: square-rooted, so 97 papers is not 97× wider. */
const radiusFor = (count) => 0.17 + 0.135 * Math.sqrt(count);

/** The floor under a node in the citation view. See `radiusForCitations`. */
const CITE_FLOOR = 0.15;

/**
 * Node radius from citations, scaled to land on the same ceiling as the papers.
 *
 * THE TWO MODES HAVE TO BE THE SAME SIZE OR THE TOGGLE SAYS NOTHING
 * -----------------------------------------------------------------
 * Papers per person run 1–148 here; citations per person run 0–2,021. Any fixed
 * coefficient that suits one suits the other by accident, and the first version
 * of this used 0.52 — which put the biggest node in the citation view at about
 * a third of the size of the biggest node in the paper view. Pressing the
 * toggle then read as "everything shrank", which is a fact about the
 * coefficient, not about the record.
 *
 * So the ceiling is passed in: it is `radiusFor(the largest paper count)`, the
 * biggest node the other mode draws. The largest citation total is drawn at
 * exactly that size, and what a reader sees when they press the toggle is the
 * *re-ordering* — who grows, who shrinks — with the overall scale held still.
 * That re-ordering is the whole content of the feature: on this profile the
 * busiest co-author after the site owner has 31 papers and 264 citations, and
 * the most-cited has 11 papers and 641.
 *
 * The floor is 0.15 rather than 0. A co-author whose papers have not been cited
 * yet is still a co-author, and a node of zero radius is a person deleted from
 * the record — recent students are most of that group, which is precisely the
 * group it would be wrong to erase.
 *
 * @param {number} citations  this person's total
 * @param {number} max        the largest total in the graph
 * @param {number} peak       the radius the largest node has in the paper view
 */
const radiusForCitations = (citations, max, peak) => {
  if (!(max > 0)) return 0.17;
  const span = Math.max(0.1, peak - CITE_FLOOR);
  return CITE_FLOOR + span * Math.sqrt(Math.max(0, citations) / max);
};

/**
 * Which colour a person gets: the section they publish in most.
 *
 * It is the same palette the page's section highlighting uses, so a node the
 * colour of the Persian list is a person who appears in the Persian list — the
 * colours mean the same thing in both places, which is the only reason to
 * reuse them.
 */
function dominantSection(person, papers, byId) {
  const tally = new Map();
  for (const id of person.papers) {
    const paper = byId.get(id);
    if (!paper) continue;
    tally.set(paper.sectionIndex, (tally.get(paper.sectionIndex) || 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [section, count] of tally) {
    if (count > bestCount) { best = section; bestCount = count; }
  }
  return best;
}

/**
 * When a person's influence happened: the citation-weighted mean year of their
 * papers.
 *
 * WHY WEIGHTED, AND WEIGHTED BY CITATIONS
 *
 * The plain mean year of someone's papers answers "when were they active",
 * which the Timeline already shows. This view is about influence, so the
 * question worth answering is "when did the work that is *read* happen" — and
 * those are different people. A co-author with one paper from 2016 carrying
 * 277 citations and four recent ones with none is, for this view's purposes, a
 * 2016 collaborator, and a plain mean would put them in 2022.
 *
 * Falls back to the plain mean year when none of their papers has a citation,
 * because the alternative is dropping the towers that need the most help being
 * read. Returns null only when no paper of theirs has a year at all.
 */
function influenceYear(person, byId) {
  let weighted = 0;
  let weight = 0;
  let plain = 0;
  let dated = 0;

  for (const id of person.papers) {
    const paper = byId.get(id);
    if (!paper || !paper.year) continue;
    dated += 1;
    plain += paper.year;
    const cites = paper.citedBy || 0;
    if (cites > 0) { weighted += paper.year * cites; weight += cites; }
  }

  if (!dated) return null;
  return weight > 0 ? weighted / weight : plain / dated;
}

/**
 * The year ramp: cool for old work, warm for recent.
 *
 * Three stops rather than two. A straight blue→amber interpolation passes
 * through a dead grey-brown in the middle, which is exactly where most of the
 * record sits, so the years that most need telling apart would be the ones
 * least distinguishable. Going through teal keeps every step of the ramp a
 * colour rather than a muddle.
 *
 * Fixed rather than read from the theme: these have to stay in the same order
 * and the same distance apart in both colour schemes, or the ramp stops
 * meaning one thing. They are chosen to sit on either background.
 *
 * @param {number} t  0 = oldest year in the record, 1 = newest
 */
const YEAR_STOPS = [
  [0.29, 0.40, 0.72],  // indigo — the early record
  [0.16, 0.71, 0.68],  // teal   — the middle
  [0.98, 0.69, 0.25],  // amber  — the recent work
];

function rampColour(t) {
  const x = Math.max(0, Math.min(1, t)) * (YEAR_STOPS.length - 1);
  const i = Math.min(YEAR_STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const a = YEAR_STOPS[i];
  const b = YEAR_STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * The collaboration graph.
 *
 * @param {object} graph      from buildGraph()
 * @param {object} layout     from solveLayout()
 * @param {string[]} palette  six [r,g,b] triples, one per section hue
 * @param {number[]} edgeColour
 */
export function buildGraphScene(graph, layout, palette, edgeColour, sizeBy = 'papers') {
  const { people, edges, papers } = graph;
  /* "Size by citations" is only offered when there is citation data to size by,
     and asking for it without any would collapse every node onto the floor
     radius. Falling back rather than throwing keeps the caller from having to
     ask the same question twice. */
  const byCitations = sizeBy === 'citations'
    && !!(graph.citations && graph.citations.known && graph.citations.maxPerson > 0);
  const maxPersonCites = byCitations ? graph.citations.maxPerson : 0;
  /* The ceiling the citation sizes are stretched to reach: whatever the busiest
     person measures in the other mode. Read from the data rather than written
     down, so the two views stay the same size as the record grows. */
  const peakRadius = byCitations
    ? radiusFor(people.reduce((max, p) => Math.max(max, p.count), 1))
    : 0;
  const byId = new Map(papers.map((p) => [p.id, p]));
  const pos = layout.positions;
  const n = people.length;

  const centre = new Float32Array(n * 6 * 3);
  const corner = new Float32Array(n * 6 * 2);
  const size = new Float32Array(n * 6 * 2);
  const colour = new Float32Array(n * 6 * 3);
  const state = new Float32Array(n * 6);

  const nodes = [];

  for (let i = 0; i < n; i++) {
    const person = people[i];
    const hue = palette[dominantSection(person, papers, byId) % palette.length];
    const r = byCitations
      ? radiusForCitations(person.citations || 0, maxPersonCites, peakRadius)
      : radiusFor(person.count);
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];

    nodes.push({ index: i, person, position: [x, y, z], radius: r });

    for (let c = 0; c < 6; c++) {
      const v = i * 6 + c;
      centre[v * 3] = x; centre[v * 3 + 1] = y; centre[v * 3 + 2] = z;
      corner[v * 2] = CORNERS[c][0]; corner[v * 2 + 1] = CORNERS[c][1];
      size[v * 2] = r * 2; size[v * 2 + 1] = r * 2;
      colour[v * 3] = hue[0]; colour[v * 3 + 1] = hue[1]; colour[v * 3 + 2] = hue[2];
      state[v] = 0;
    }
  }

  const linePos = new Float32Array(edges.length * 2 * 3);
  const lineColour = new Float32Array(edges.length * 2 * 3);
  const lineState = new Float32Array(edges.length * 2);

  edges.forEach((e, k) => {
    for (const [slot, node] of [[0, e.source], [1, e.target]]) {
      const v = k * 2 + slot;
      linePos[v * 3] = pos[node * 3];
      linePos[v * 3 + 1] = pos[node * 3 + 1];
      linePos[v * 3 + 2] = pos[node * 3 + 2];
      lineColour[v * 3] = edgeColour[0];
      lineColour[v * 3 + 1] = edgeColour[1];
      lineColour[v * 3 + 2] = edgeColour[2];
      lineState[v] = 0;
    }
  });

  return {
    kind: 'graph',
    round: 1,
    edgeAlpha: 0.055,
    // Which question the sizes are answering, so the panel can label itself
    // from the scene rather than from a second copy of the same state.
    sizeBy: byCitations ? 'citations' : 'papers',
    quads: { position: centre, corner, size, colour, state, count: n * 6 },
    lines: { position: linePos, colour: lineColour, state: lineState, count: edges.length * 2 },
    nodes,
    edges,
    radius: layout.radius,
  };
}

/* -------------------------------------------------------------------------- */
/* The timeline                                                               */
/* -------------------------------------------------------------------------- */

/** Distance between one year band and the next, along Z. */
export const YEAR_GAP = 3.4;

/** Card size, world units — the size of a paper nobody has cited yet. */
const CARD_W = 0.92;
const CARD_H = 0.5;

/**
 * How much bigger the most-cited paper's card is than an uncited one.
 *
 * 0.8, so the ceiling is 1.8× — large enough to pick out of a band at a glance,
 * small enough that the grid stays a grid. The corridor was already the shape
 * of the output over time; with this it is also the shape of what that output
 * was *for*, which is the more interesting of the two questions and the one the
 * list underneath cannot answer.
 */
const CITE_GROWTH = 0.8;

/**
 * Card scale from citations.
 *
 * The exponent is 0.45 rather than 0.5 — a square root and a bit — and the
 * reason is the shape of this particular record. The distribution is the usual
 * one: one paper at 277, three above 100, and sixty-odd at zero. Under a plain
 * square root everything below about thirty citations lands within a few per
 * cent of the floor and the middle of the range is invisible; a slightly
 * flatter curve lifts the twenties and thirties clear of the floor without
 * letting the top card run away with the band.
 *
 * Relative to the maximum, not absolute, so the view stays legible as the
 * profile grows: when the top paper reaches 400 the whole scale re-normalises
 * and the picture still reads.
 */
const cardScale = (citations, max) =>
  (max > 0 ? 1 + CITE_GROWTH * Math.pow(Math.max(0, citations) / max, 0.45) : 1);

/**
 * The grid pitch has to fit the biggest card, not the average one.
 *
 * Computed from the ceiling rather than measured per band, because a pitch that
 * varied year by year would make the bands different shapes for a reason that
 * has nothing to do with the data — and the whole point of the corridor is that
 * the shape of a band *is* the data.
 */
const PITCH_X = CARD_W * (1 + CITE_GROWTH) + 0.2;
const PITCH_Y = CARD_H * (1 + CITE_GROWTH) + 0.2;

/**
 * The publication timeline: a corridor of year bands receding from the camera.
 *
 * The newest year sits at the near end and the oldest recedes into the
 * distance, because the near end is where a visitor's eye starts and the recent
 * work is what they came for. Within a band the papers are laid out in a grid
 * that grows outward from the centre, so a busy year is visibly wider and
 * taller than a quiet one — the shape of the corridor *is* the output over
 * time, which is the whole reason to draw it.
 */
export function buildTimelineScene(graph, palette) {
  const dated = graph.papers.filter((p) => p.year);
  const years = [...new Set(dated.map((p) => p.year))].sort((a, b) => b - a); // newest first

  const quadsPerCard = 6;
  const centre = new Float32Array(dated.length * quadsPerCard * 3);
  const corner = new Float32Array(dated.length * quadsPerCard * 2);
  const size = new Float32Array(dated.length * quadsPerCard * 2);
  const colour = new Float32Array(dated.length * quadsPerCard * 3);
  const state = new Float32Array(dated.length * quadsPerCard);

  const cards = [];
  const bands = [];
  let written = 0;

  /* The scale every card is measured against. Zero when there is no citation
     data, which `cardScale` reads as "everything is the base size" — so a site
     with no `data/scholar.json` gets exactly the timeline it had before. */
  const maxCites = (graph.citations && graph.citations.known)
    ? graph.citations.maxPaper : 0;

  years.forEach((year, bandIndex) => {
    const z = -bandIndex * YEAR_GAP;
    const inYear = dated
      .filter((p) => p.year === year)
      .sort((a, b) => a.sectionIndex - b.sectionIndex || a.id.localeCompare(b.id));

    // A grid as close to square as the count allows, so bands stay compact
    // rather than growing into a long line.
    const cols = Math.max(1, Math.ceil(Math.sqrt(inYear.length * 1.5)));
    const rows = Math.ceil(inYear.length / cols);

    inYear.forEach((paper, k) => {
      const col = k % cols;
      const row = Math.floor(k / cols);
      const x = (col - (cols - 1) / 2) * PITCH_X;
      const y = ((rows - 1) / 2 - row) * PITCH_Y;
      const hue = palette[paper.sectionIndex % palette.length];
      const scale = cardScale(paper.citedBy || 0, maxCites);
      const w = CARD_W * scale;
      const h = CARD_H * scale;

      // A bigger card is a bigger target, which is both physically right and
      // what makes the papers worth clicking the easiest ones to hit.
      cards.push({ index: cards.length, paper, position: [x, y, z], radius: h * 0.8 });

      for (let c = 0; c < quadsPerCard; c++) {
        const v = written * quadsPerCard + c;
        centre[v * 3] = x; centre[v * 3 + 1] = y; centre[v * 3 + 2] = z;
        corner[v * 2] = CORNERS[c][0]; corner[v * 2 + 1] = CORNERS[c][1];
        size[v * 2] = w; size[v * 2 + 1] = h;
        colour[v * 3] = hue[0]; colour[v * 3 + 1] = hue[1]; colour[v * 3 + 2] = hue[2];
        state[v] = 0;
      }
      written += 1;
    });

    /* The average hue of the year's papers, for its frame. Averaging in linear
       RGB is not colour science, but these are six well-separated accents and
       the result only has to say "mostly this kind of work". */
    const hue = [0, 0, 0];
    inYear.forEach((paper) => {
      const c = palette[paper.sectionIndex % palette.length];
      hue[0] += c[0]; hue[1] += c[1]; hue[2] += c[2];
    });
    const n = Math.max(1, inYear.length);

    bands.push({
      year,
      z,
      count: inYear.length,
      citations: inYear.reduce((sum, paper) => sum + (paper.citedBy || 0), 0),
      top: (rows / 2) * PITCH_Y + 0.55,
      // Half-extents of the frame: the grid, plus a margin so the frame sits
      // clear of the outermost cards rather than clipping them.
      halfWidth: (cols / 2) * PITCH_X + 0.22,
      halfHeight: (rows / 2) * PITCH_Y + 0.22,
      hue: [hue[0] / n, hue[1] / n, hue[2] / n],
    });
  });

  /* ---- the frames --------------------------------------------------------
     One rectangle per year, drawn in WORLD space around that year's grid.

     This is the only thing in either scene that is not billboarded, and that is
     exactly why it is here. The cards face the camera however the scene is
     turned, which keeps them readable but means they carry no orientation of
     their own; perspective shrinks the far ones and that is the whole of the
     depth cue. A frame lying in the plane of its band foreshortens — a near one
     is a wide rectangle, a far one is a narrow slot — and a row of them
     receding is a corridor rather than a heap of cards at different sizes.

     They reuse the LINE program, which the timeline previously left empty, so
     there is no new machinery and no extra draw call: eight vertices a year,
     about a hundred and forty in total.
     ---------------------------------------------------------------------- */
  const framePos = new Float32Array(bands.length * 8 * 3);
  const frameCol = new Float32Array(bands.length * 8 * 3);
  const frameState = new Float32Array(bands.length * 8);
  let fv = 0;

  const put = (x, y, z, hue) => {
    framePos[fv * 3] = x; framePos[fv * 3 + 1] = y; framePos[fv * 3 + 2] = z;
    frameCol[fv * 3] = hue[0]; frameCol[fv * 3 + 1] = hue[1]; frameCol[fv * 3 + 2] = hue[2];
    frameState[fv] = 0;
    fv += 1;
  };

  bands.forEach((band) => {
    const w = band.halfWidth;
    const h = band.halfHeight;
    const z = band.z;
    /* The year's own colour: the average of the hues of the papers in it, so a
       year of mostly journal papers frames differently from a year of mostly
       conference ones. */
    const hue = band.hue;
    // Four edges, as pairs — GL_LINES takes two vertices per segment.
    put(-w, -h, z, hue); put(w, -h, z, hue);
    put(w, -h, z, hue); put(w, h, z, hue);
    put(w, h, z, hue); put(-w, h, z, hue);
    put(-w, h, z, hue); put(-w, -h, z, hue);
  });

  return {
    kind: 'timeline',
    round: 0,
    // Seventeen frames, not three hundred edges: they are structure, not noise.
    edgeAlpha: 0.34,
    quads: { position: centre, corner, size, colour, state, count: dated.length * quadsPerCard },
    lines: { position: framePos, colour: frameCol, state: frameState, count: fv },
    cards,
    bands,
    years,
    undated: graph.papers.length - dated.length,
  };
}

/* -------------------------------------------------------------------------- */
/* The impact skyline                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Column pitch and width, world units.
 *
 * Wider gaps than a bar chart would use, because these are solids seen at an
 * angle: at a three-quarter view a column half-hides its neighbour unless there
 * is air between them, and the thing being read is the silhouette of the row.
 */
const COL_W = 0.76;
const COL_PITCH = 1.06;

/**
 * How tall the tallest year is allowed to stand.
 *
 * Set against the row's WIDTH, not chosen for its own sake. Seventeen columns
 * at a pitch of 1.06 make a row about eighteen units across, and the stage is a
 * letterbox — roughly 3.5:1 on a desktop. A skyline much taller than a fifth of
 * its own width cannot be framed in that without shrinking to fit, which wastes
 * the width the stage has most of. 4.8 is about that fifth, with the margins
 * `fitImpact` adds for the year labels taken into account.
 */
const SKYLINE_HEIGHT = 4.8;

/**
 * The height an uncited paper gets anyway.
 *
 * A course of thin tiles along the bottom of each column. It is a deliberate
 * inaccuracy and it is worth about eight per cent of the tallest column, so it
 * is recorded here rather than left for someone to discover: without it, two
 * thirds of the papers on this site are invisible in the one view that is
 * otherwise the best place to click one, and a reader in their first year would
 * find their own work missing from the building. The exact figures are in the
 * readout on hover, where they are exact.
 */
const SLIVER = 0.024;

/**
 * The citation skyline: one column per year, built out of its papers.
 *
 * WHAT IT SHOWS THAT THE OTHER TWO DO NOT
 * ---------------------------------------
 * The timeline says how much was published and when. The graph says who it was
 * published with. Neither says what happened to it afterwards, and that is the
 * question a citation count answers: a year of four papers can tower over a
 * year of thirty-one, and on this record it does.
 *
 * Column height is the year's citation total, linearly — not square-rooted,
 * not log. The disparity IS the subject, and a curve that flattered the quiet
 * years would be drawing a different claim than the one the numbers make. Each
 * paper is one segment of its column, stacked most-cited first from the ground
 * up, coloured by its section exactly as it is in the other two views.
 *
 * Oldest on the left, newest on the right: this one reads as a chart rather
 * than as a corridor, and a chart of time reads left to right. (The timeline
 * runs the other way for the opposite reason — there the newest work is nearest
 * the camera because that is where a visitor's eye starts.)
 *
 * WHY THE COLUMNS ARE STILL BILLBOARDED QUADS
 * -------------------------------------------
 * Because the renderers already draw exactly that, shaded as slabs with
 * thickness, and a real box would need a second program, a normal attribute and
 * a depth sort. A stack of billboarded slabs seen from three-quarters on reads
 * as a tower; the footprints below do the work of saying where the ground is,
 * in world space, which is the same trick the timeline's frames play.
 *
 * @param {object} graph      from buildGraph(), after attachCitations()
 * @param {string[]} palette  six [r,g,b] triples, one per section hue
 */
export function buildImpactScene(graph, palette) {
  const dated = graph.papers.filter((p) => p.year);
  const years = [...new Set(dated.map((p) => p.year))].sort((a, b) => a - b); // oldest first

  // Group first, so the scale can be set from the tallest column before any
  // geometry is written.
  const columns = years.map((year) => {
    const papers = dated
      .filter((p) => p.year === year)
      // Most-cited at the bottom: a tower is stable-looking when its mass is
      // low, and the paper a reader is most likely to want is then the one
      // nearest the ground line rather than adrift at the top.
      .sort((a, b) => (b.citedBy || 0) - (a.citedBy || 0) || a.id.localeCompare(b.id));
    return {
      year,
      papers,
      citations: papers.reduce((sum, p) => sum + (p.citedBy || 0), 0),
    };
  });

  const peak = columns.reduce((max, c) => Math.max(max, c.citations), 0);
  /* Units per citation. When nothing is cited at all the columns are all
     slivers, and rather than draw a flat line pretending to be a skyline the
     panel does not offer this view at all — see the `known` flag that
     attachCitations sets, and the tab that reads it. */
  const unit = peak > 0 ? SKYLINE_HEIGHT / peak : 0;

  const n = dated.length;
  const centre = new Float32Array(n * 6 * 3);
  const corner = new Float32Array(n * 6 * 2);
  const size = new Float32Array(n * 6 * 2);
  const colour = new Float32Array(n * 6 * 3);
  const state = new Float32Array(n * 6);

  const cards = [];
  const bands = [];
  let written = 0;

  columns.forEach((column, i) => {
    const x = (i - (columns.length - 1) / 2) * COL_PITCH;
    let y = 0;

    for (const paper of column.papers) {
      const h = Math.max(SLIVER, (paper.citedBy || 0) * unit);
      const hue = palette[paper.sectionIndex % palette.length];
      const cy = y + h / 2;

      cards.push({
        index: cards.length,
        paper,
        position: [x, cy, 0],
        // A sliver is a few pixels tall and would be unclickable on its own
        // reach; the floor is what makes the base course of every column a real
        // target rather than a decoration.
        radius: Math.max(0.09, h * 0.6),
      });

      for (let c = 0; c < 6; c++) {
        const v = written * 6 + c;
        centre[v * 3] = x; centre[v * 3 + 1] = cy; centre[v * 3 + 2] = 0;
        corner[v * 2] = CORNERS[c][0]; corner[v * 2 + 1] = CORNERS[c][1];
        size[v * 2] = COL_W; size[v * 2 + 1] = h;
        colour[v * 3] = hue[0]; colour[v * 3 + 1] = hue[1]; colour[v * 3 + 2] = hue[2];
        state[v] = 0;
      }
      written += 1;
      y += h;
    }

    /* The average hue of the column, for its footprint — the same averaging the
       timeline's year frames use, and for the same reason: the frame should say
       what kind of work the year was, not merely where it ended. */
    const hue = [0, 0, 0];
    for (const paper of column.papers) {
      const c = palette[paper.sectionIndex % palette.length];
      hue[0] += c[0]; hue[1] += c[1]; hue[2] += c[2];
    }
    const k = Math.max(1, column.papers.length);

    bands.push({
      year: column.year,
      x,
      z: 0,
      /* `top` is where the year label goes and `count` is what it says beside
         the year. Both names are the timeline's, because the label painter is
         shared — a second vocabulary for the same idea would be a second thing
         to keep in step.

         BELOW the ground here, despite the name, and that is the point: a
         column's height is the variable, so a label above it wanders up and
         down the frame and lands on its neighbour's shoulder at every second
         year. Under the baseline they line up in a row and read as the axis of
         a chart, which is what they are. */
      top: -0.45,
      count: column.papers.length,
      citations: column.citations,
      height: y,
      hue: [hue[0] / k, hue[1] / k, hue[2] / k],
    });
  });

  /* ---- the ground ---------------------------------------------------------
     A footprint under each column, lying flat in the XZ plane, plus one long
     line running the length of the row.

     Same argument as the timeline's frames: everything else here faces the
     camera, so nothing else can tell you which way the scene is turned. A
     square lying on the ground foreshortens as you orbit, and that is what
     stops a row of billboarded slabs from reading as flat stickers.
     ---------------------------------------------------------------------- */
  const D = COL_W * 0.5;           // half-depth of a footprint
  const W = COL_W * 0.5;
  const segments = columns.length * 4 + 1;
  const linePos = new Float32Array(segments * 2 * 3);
  const lineColour = new Float32Array(segments * 2 * 3);
  const lineState = new Float32Array(segments * 2);
  let lv = 0;

  const put = (x, y, z, hue) => {
    linePos[lv * 3] = x; linePos[lv * 3 + 1] = y; linePos[lv * 3 + 2] = z;
    lineColour[lv * 3] = hue[0]; lineColour[lv * 3 + 1] = hue[1]; lineColour[lv * 3 + 2] = hue[2];
    lineState[lv] = 0;
    lv += 1;
  };

  bands.forEach((band) => {
    const x = band.x;
    const hue = band.hue;
    put(x - W, 0, -D, hue); put(x + W, 0, -D, hue);
    put(x + W, 0, -D, hue); put(x + W, 0, D, hue);
    put(x + W, 0, D, hue); put(x - W, 0, D, hue);
    put(x - W, 0, D, hue); put(x - W, 0, -D, hue);
  });

  if (bands.length) {
    /* The ground line, in the average of the averages: a horizon for the row to
       stand on, so the shortest columns have something to be short against. */
    const hue = [0, 0, 0];
    for (const band of bands) { hue[0] += band.hue[0]; hue[1] += band.hue[1]; hue[2] += band.hue[2]; }
    const k = bands.length;
    const avg = [hue[0] / k, hue[1] / k, hue[2] / k];
    put(bands[0].x - COL_PITCH * 0.6, 0, 0, avg);
    put(bands[k - 1].x + COL_PITCH * 0.6, 0, 0, avg);
  }

  return {
    kind: 'impact',
    round: 0,
    // Structure, not noise — the same call the timeline's frames make.
    edgeAlpha: 0.34,
    quads: { position: centre, corner, size, colour, state, count: written * 6 },
    lines: { position: linePos, colour: lineColour, state: lineState, count: lv },
    /* `cards` and `bands` rather than names of its own: the hit test, the
       highlight painter, the year labels and the click handler are all shared
       with the timeline, and every one of them keys off these two names. */
    cards,
    bands,
    years,
    peak,
    total: columns.reduce((sum, c) => sum + c.citations, 0),
    /* The box the camera has to frame, so the panel can fit the view to the
       stage rather than standing back a distance that was right on one screen.
       This one needs it more than the other two: it is a wide, shallow row, so
       a stage four times as wide as it is tall and a stage on a phone want
       distances that differ by a factor of two. */
    halfWidth: (columns.length / 2) * COL_PITCH,
    top: bands.reduce((max, b) => Math.max(max, b.height), 0),
    undated: graph.papers.length - dated.length,
  };
}

/* -------------------------------------------------------------------------- */
/* The influence city                                                          */
/* -------------------------------------------------------------------------- */

/**
 * How tall the most-cited person's tower stands.
 *
 * Kept low against `PLAN_RADIUS`, and the reason is the shape of the stage.
 * It is a letterbox, about 3.4:1 on a desktop, and a disc tilted by the
 * camera's pitch projects to very nearly that — so the PLAN fits the frame
 * almost exactly by itself, and every unit of tower on top of it is a unit the
 * camera has to stand back for, taking the whole city with it.
 *
 * That is a real trade and it was made by looking: at 4.4 the city was framed
 * to about 45 per cent of the stage width and read as a model of a city on a
 * table; at 2.4 it fills about 70 per cent and the skyline is still perfectly
 * legible, because the heights below the top are what carry it (2.4, 2.2, 1.6,
 * 1.1, 1.1, 1.0 …) and those are unchanged in proportion.
 */
const CITY_HEIGHT = 2.4;

/**
 * How far the furthest co-author stands from the middle.
 *
 * The plan is normalised to this rather than used at the size the solver
 * happens to produce, and that is not tidiness. The same forces spread further
 * in two dimensions than in three — there is one less axis to spread into — so
 * the flat solve comes out at a radius of about 13 where the ball comes out at
 * about 10.7, and it will drift again every time a co-author is added. A city
 * twenty-six units across with a four-unit tower in it is a car park with a
 * pin in it.
 *
 * The number itself is a density decision, not a size one — the camera fits
 * whatever it is given (`fitOne` in index.js), so making the plan bigger only
 * stands the camera further back. What it changes is how close together 118
 * towers sit, and 6.4 is where they read as a city rather than as confetti
 * without the nearest pair actually intersecting.
 */
const PLAN_RADIUS = 6.4;

/**
 * The height a co-author with no citations gets anyway.
 *
 * The same argument as `SLIVER` on the skyline, and it matters more here: a
 * third of the people on this graph have not been cited yet, most of them
 * because they are students whose first paper came out last year. A tower of
 * zero height is a person deleted from their own research group.
 */
const TOWER_FLOOR = 0.25;

/**
 * Footprint from papers written — square-rooted, like every size in this file.
 *
 * NARROW, AND THAT IS THE WHOLE DIFFERENCE BETWEEN A CITY AND A MOSAIC. The
 * first version ran up to 0.78 against a tower floor of 0.17, which made most
 * of the 105 people wider than they were tall — and a field of landscape slabs
 * lying on a plane does not read as buildings however it is lit. It read, in
 * the word that eventually got it fixed, as confetti.
 *
 * Every tower is now portrait: the widest is 0.3 and the shortest is 0.25 tall,
 * so even a co-author nobody has cited yet stands up rather than lying down.
 * Footprint is the quietest of this view's four variables and it is right that
 * it is — it is the one the Collaboration view already says louder.
 *
 * Capped for a second reason as well: the busiest co-author has 31 papers where
 * the median has 1, and an uncapped square root gives them a base wider than
 * the gap to their neighbours.
 */
const widthFor = (papers) => Math.min(0.3, 0.09 + 0.045 * Math.sqrt(Math.max(1, papers)));

/**
 * The collaboration graph and the citation record, in one picture: a city.
 *
 * WHAT IT IS, AND WHY IT IS NOT EITHER OF THE OTHER TWO
 * ----------------------------------------------------
 * The Collaboration view answers "who was the work done with". The Impact view
 * answers "what came of it, and when". Neither answers the question they
 * obviously share — *which* of those people did the work that got cited — and
 * that question is the only one you cannot get at by looking at the two views
 * in turn, because it lives in the join between them.
 *
 * So: the **plan is the collaboration graph** and the **elevation is the
 * citations**. Every co-author stands where the force solver puts them, on a
 * ground plane, with the co-authorships drawn between their feet as streets.
 * Their tower's height is the citations their papers have earned.
 *
 *   position   who they work with        (the same solver as the graph view)
 *   streets    every shared paper        (the same edges)
 *   height     citations earned          (the Impact view's number, per person)
 *   footprint  papers written            (the Collaboration view's number)
 *   colour     the section they publish in most
 *
 * Four variables and no legend, because every one of them already means the
 * same thing somewhere else on this page. A reader who has looked at either of
 * the other views already knows how to read three of them.
 *
 * What it shows on this record: a dense inner block around the site owner, and
 * then a handful of towers standing well outside it — people with three or four
 * papers and several hundred citations each. On the flat graph those are small
 * nodes near the rim and easy to miss entirely.
 *
 * WHY THE TOWERS ARE BILLBOARDED QUADS
 * ------------------------------------
 * The same reason the skyline's are, and the reason holds better here: 119 real
 * boxes would be 1,400 triangles needing a depth sort every time the city
 * turns, where 119 camera-facing slabs are 238 and need none. The streets are
 * what carry the orientation — they lie IN the ground plane, so they
 * foreshorten as you orbit, and a web of flat lines receding is unmistakably a
 * plane seen at an angle.
 *
 * @param {object} graph      from buildGraph(), after attachCitations()
 * @param {object} ground     from solveLayout(..., { flat: true })
 * @param {string[]} palette  six [r,g,b] triples, one per section hue
 * @param {number[]} edgeColour
 */
export function buildInfluenceScene(graph, ground, palette, edgeColour, colourBy = 'section') {
  const { people, edges, papers } = graph;
  const byId = new Map(papers.map((p) => [p.id, p]));

  /* ---- when each tower's influence happened -------------------------------
     Computed for both modes, not just the one being drawn: the caption reports
     the span whichever colouring is on, and it costs one pass over the papers.
     ---------------------------------------------------------------------- */
  const years = people.map((person) => influenceYear(person, byId));
  const dated = years.filter((y) => y !== null);
  const minYear = dated.length ? Math.min(...dated) : 0;
  const maxYear = dated.length ? Math.max(...dated) : 0;
  const yearSpan = maxYear - minYear;
  const pos = ground.positions;
  const n = people.length;

  const peak = (graph.citations && graph.citations.known)
    ? graph.citations.maxPerson : 0;
  const unit = peak > 0 ? CITY_HEIGHT / peak : 0;

  /* Normalise the plan — see PLAN_RADIUS. Relative distances are untouched, so
     the arrangement is still the one the solver found.

     NOT ON THE FURTHEST NODE, on the 95th percentile. Taking the site owner out
     leaves two people with no co-authorship at all and a handful with one, and
     nothing pulls those back toward the middle except gravity — so they settle
     on the rim, about 1.3× further out than the 90th percentile. Scaling on the
     furthest of them would shrink the 99 people who are actually clustered by
     that factor, to frame four who are not.

     The few beyond the mark are pulled back to just outside it. They are drawn
     where they belong — outside everyone else, unattached — and they stay
     visible and clickable, which is the point: being uncited and uncollaborated
     is a true thing about a first-year student and not a reason to push them
     off the edge of the picture. */
  const radii = [];
  for (let i = 0; i < n; i++) radii.push(Math.hypot(pos[i * 3], pos[i * 3 + 2]));
  const sorted = [...radii].sort((a, b) => a - b);
  const mark = sorted[Math.floor(0.95 * (sorted.length - 1))] || ground.radius || 1;
  const spread = mark > 0.001 ? PLAN_RADIUS / mark : 1;
  /** How far past the rim an outlier may sit, as a fraction of PLAN_RADIUS. */
  const OUTLIER_LIMIT = 1.07;

  const centre = new Float32Array(n * 6 * 3);
  const corner = new Float32Array(n * 6 * 2);
  const size = new Float32Array(n * 6 * 2);
  const colour = new Float32Array(n * 6 * 3);
  const state = new Float32Array(n * 6);

  /** One node's place on the ground: scaled, and reeled in if it is an outlier. */
  const place = (i) => {
    const r = radii[i] * spread;
    const limit = PLAN_RADIUS * OUTLIER_LIMIT;
    const k = r > limit ? (limit / r) : 1;
    return [pos[i * 3] * spread * k, pos[i * 3 + 2] * spread * k];
  };

  const nodes = [];
  let top = 0;
  let halfWidth = 0;

  for (let i = 0; i < n; i++) {
    const person = people[i];
    /* Colour says one of two things, and the toggle says which. By section it
       matches the list's own highlighting; by period it is the year ramp.

       An undated person keeps their section colour rather than being given a
       point on a ramp they are not on — inventing a year for them would be the
       one lie in a view built entirely from the record. */
    const hue = (colourBy === 'period' && years[i] !== null && yearSpan > 0)
      ? rampColour((years[i] - minYear) / yearSpan)
      : palette[dominantSection(person, papers, byId) % palette.length];
    const [x, z] = place(i);
    const w = widthFor(person.count);
    const h = Math.max(TOWER_FLOOR, (person.citations || 0) * unit);
    const cy = h / 2;

    if (h > top) top = h;
    halfWidth = Math.max(halfWidth, Math.abs(x) + w, Math.abs(z) + w);

    nodes.push({
      index: i,
      person,
      // The hit test and the name labels both anchor on this, and mid-height is
      // the right place for both: the label sits on the tower rather than over
      // the street, and the pointer finds a tall thin tower from its middle.
      position: [x, cy, z],
      height: h,
      /* Hover reach. A tower is tall and narrow, so the radius that matters is
         not its width — half its height is what a reader is actually pointing
         at. The floor keeps the shortest towers, which are the ones a reader is
         most likely to be hunting for, from being unhittable. */
      radius: Math.max(0.13, Math.min(0.55, h * 0.45)),
      // Over the roof, not across the front of the building. See paintLabels.
      labelPosition: [x, h + 0.22, z],
    });

    for (let c = 0; c < 6; c++) {
      const v = i * 6 + c;
      centre[v * 3] = x; centre[v * 3 + 1] = cy; centre[v * 3 + 2] = z;
      corner[v * 2] = CORNERS[c][0]; corner[v * 2 + 1] = CORNERS[c][1];
      size[v * 2] = w; size[v * 2 + 1] = h;
      colour[v * 3] = hue[0]; colour[v * 3 + 1] = hue[1]; colour[v * 3 + 2] = hue[2];
      state[v] = 0;
    }
  }

  /* ---- the streets --------------------------------------------------------
     Every co-authorship, drawn between two towers' feet rather than between
     their middles. Between the middles is what the graph view does and it is
     right there, where the nodes are spheres floating in space; here it would
     run every line through the solids and out the other side. At ground level
     they read as what they are: the plan the city is built on.
     ---------------------------------------------------------------------- */
  const linePos = new Float32Array(edges.length * 2 * 3);
  const lineColour = new Float32Array(edges.length * 2 * 3);
  const lineState = new Float32Array(edges.length * 2);

  edges.forEach((e, k) => {
    for (const [slot, node] of [[0, e.source], [1, e.target]]) {
      const v = k * 2 + slot;
      const [ex, ez] = place(node);
      linePos[v * 3] = ex;
      linePos[v * 3 + 1] = 0;
      linePos[v * 3 + 2] = ez;
      lineColour[v * 3] = edgeColour[0];
      lineColour[v * 3 + 1] = edgeColour[1];
      lineColour[v * 3 + 2] = edgeColour[2];
      lineState[v] = 0;
    }
  });

  return {
    kind: 'influence',
    /** What the towers are coloured by, and the span the ramp covers. */
    colourBy,
    years: { min: Math.round(minYear), max: Math.round(maxYear), dated: dated.length },
    /* The tower impostor, which is this view's own: a lit round column with a
       roof on it (`uRound > 1.5` in shaders.js).

       It used to share the timeline's slab, on the reasoning that a tower has
       a flat face and an edge that catches the light. The reasoning was right
       and the slab was the wrong solid to get it from: that distance field is
       a fixed landscape rectangle, so a portrait tower arrived as a stretched
       lozenge with its bevel and its thickness squashed out of it, and a plan
       full of them read as stickers rather than as buildings. */
    round: 2,
    /* Louder at rest than the graph's 0.055. There are fewer lines here — 213
       rather than 330, because the ones that merely said "with the site owner"
       went with him — and they lie in a plane instead of filling a ball, so they
       overlap far less. A hairball is not the risk; being unable to make out
       the ground the towers stand on is. */
    edgeAlpha: 0.14,
    quads: { position: centre, corner, size, colour, state, count: n * 6 },
    lines: { position: linePos, colour: lineColour, state: lineState, count: edges.length * 2 },
    // `nodes` and `edges` under the names the graph view uses, so the highlight
    // painter, the hit test, the name labels and the click-to-filter are shared
    // rather than written twice.
    nodes,
    edges,
    top,
    halfWidth,
    radius: PLAN_RADIUS,
  };
}
