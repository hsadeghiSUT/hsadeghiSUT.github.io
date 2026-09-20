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
 * brands.js — LinkedIn, ORCID, ResearchGate, Mendeley.
 *
 * WHY THESE FOUR ARE DIFFERENT FROM EVERY OTHER MODEL IN THE SET
 * -------------------------------------------------------------
 * Every other icon here depicts a thing, and a thing has a three-dimensional
 * form waiting to be found. A globe is a sphere. A book is boards and leaves.
 * A wordmark is not: it is a two-dimensional design, and it is somebody's
 * trademark, drawn to exact proportions on purpose. There is no "real" 3D
 * LinkedIn.
 *
 * So these are not invented into objects. They are the mark **made of
 * something** — struck into a tile, or raised off one, with a bevel that takes
 * the key light along its edge and a rim the tile can turn on. Which is what a
 * logo looks like when it exists as a physical badge, and is the only reading
 * of a wordmark in three dimensions that does not misrepresent it.
 *
 * It also keeps them legible. These four appear in the sidebar's identifier and
 * social panels at about eighteen pixels, next to five other marks that are
 * flat SVG brand files (Scopus, Scholar, Semantic, Publons, Academia, which
 * Font Awesome does not carry and which this site draws as images). A tile that
 * turns sits beside those without either one looking wrong.
 *
 * The tile colours are the brands' own, pulled toward the page's accent by
 * `k.c` so they belong to the theme; the marks on them are the light tone.
 */

import { roundedRect } from '../lib.js';

/** The badge every mark is struck into: a rounded tile with a bevelled rim. */
function tile(k, colour, size = 0.84, radius = 0.2) {
  return k.slab(
    roundedRect(k.THREE, size, size, radius),
    0.16,
    k.mat(colour, { shine: 70, specular: 0.35 }),
    [0, 0, 0],
    null,
    { bevel: 0.035, bevelSegments: 2, curves: 8 },
  );
}

/** A stroke of a letter, raised off the tile face. */
function stroke(k, w, h, x, y, material) {
  return k.box(w, h, 0.075, material, [x, y, 0.105]);
}

/**
 * fab-linkedin — the rounded tile with "in".
 *
 * The letters are built from strokes rather than from an outline: an "i" is a
 * stem and a tittle, an "n" is a stem, a shoulder and a second stem. At this
 * size that is not a simplification, it is how the mark is drawn.
 */
export function linkedin(k) {
  const ink = k.gloss(k.c.paper, { shine: 90 });
  const blue = k.shade(k.c.base, -0.04);

  return k.group(
    tile(k, blue),
    // i
    stroke(k, 0.1, 0.3, -0.24, -0.09, ink),
    stroke(k, 0.11, 0.11, -0.24, 0.16, ink),
    // n — two stems and the shoulder that joins them
    stroke(k, 0.1, 0.3, 0.02, -0.09, ink),
    stroke(k, 0.1, 0.19, 0.26, -0.145, ink),
    k.arc(0.12, 0.05, Math.PI, ink, [0.14, 0.0, 0.105], [0, 0, 0], 14),
  );
}

/**
 * fab-orcid — the green disc with "iD".
 *
 * A disc rather than a tile, because ORCID's mark is round, and the difference
 * between a round badge and a square one is the first thing you read at
 * eighteen pixels.
 */
export function orcid(k) {
  const green = k.mat(k.shade(k.c.leaf, 0.02), { shine: 80, specular: 0.4 });
  const ink = k.gloss(k.c.paper, { shine: 100 });

  return k.group(
    k.tube(0.44, 0.15, green, [0, 0, 0], [Math.PI / 2, 0, 0], 30),
    k.ring(0.42, 0.03, k.gloss(k.shade(k.c.leaf, 0.14)), [0, 0, 0.06], [0, 0, 0], 30),
    // i
    stroke(k, 0.085, 0.3, -0.19, -0.06, ink),
    stroke(k, 0.095, 0.095, -0.19, 0.18, ink),
    // D — a stem and a bowl
    stroke(k, 0.085, 0.42, 0.02, -0.02, ink),
    k.arc(0.16, 0.048, Math.PI, ink, [0.05, -0.02, 0.105], [0, 0, -Math.PI / 2], 16),
  );
}

/**
 * fab-researchgate — the tile with "R" over "G".
 *
 * The bowl of the R and the crossbar of the G are torus arcs, so both letters
 * have a genuinely curved surface to run the highlight along; the stems are
 * boxes. Two materials and one bevel are the whole model.
 */
export function researchgate(k) {
  const ink = k.gloss(k.c.paper, { shine: 90 });
  const teal = k.shade(k.c.base, -0.02, 0.9);

  return k.group(
    tile(k, teal, 0.84, 0.14),
    // R, upper left
    stroke(k, 0.075, 0.34, -0.24, 0.13, ink),
    k.arc(0.1, 0.042, Math.PI, ink, [-0.16, 0.2, 0.105], [0, 0, -Math.PI / 2], 14),
    k.box(0.06, 0.16, 0.075, ink, [-0.06, 0.03, 0.105], [0, 0, -0.5]),
    // G, lower right
    k.arc(0.15, 0.045, Math.PI * 1.5, ink, [0.15, -0.16, 0.105], [0, 0, Math.PI * 0.25], 18),
    stroke(k, 0.12, 0.055, 0.2, -0.16, ink),
  );
}

/**
 * fab-mendeley — the three arcs.
 *
 * Mendeley's mark is a row of rounded humps on a baseline — an "M" written as
 * curves. Three half-tori of different heights over a bar: the middle one
 * tallest, which is what makes the row read as a letter rather than as a fence.
 */
export function mendeley(k) {
  const ink = k.gloss(k.c.paper, { shine: 90 });
  /* A COLOUR, not a material: `tile()` takes a colour and builds its own
     material from it. Handing it a material made `new THREE.Color(material)`,
     which is white — and the badge rendered as a blank white tile. */
  const red = k.shade(k.c.base, -0.08, 1.1);

  /* Thin arcs and real gaps between them. The first pass used a fatter tube and
     a taller middle hump, and the three of them met: what came out was one
     white rounded mass with no letter in it at all. */
  const hump = (x, r) => k.arc(r, 0.038, Math.PI, ink, [x, -0.08, 0.105], [0, 0, 0], 16);

  return k.group(
    tile(k, red, 0.84, 0.16),
    hump(-0.23, 0.115),
    hump(0, 0.155),
    hump(0.23, 0.115),
    k.box(0.56, 0.05, 0.075, ink, [0, -0.1, 0.105]),
  );
}
