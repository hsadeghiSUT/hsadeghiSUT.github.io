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
 * lattice.js — the cloud of stars the field is made of.
 *
 * WHAT IT IS
 * ----------
 * Around five hundred five-pointed stars, scattered through a slab of space
 * behind the page. At rest they drift and turn almost invisibly. When the
 * pointer settles on a publication, a student, or a card, the stars near it
 * flare, grow and swirl — a cloud gathering around what you are reading rather
 * than a shape drawn round it.
 *
 * THEY ARE REAL GEOMETRY
 * ----------------------
 * Not sprites with a star painted on them. Each one is a solid: a five-pointed
 * star polygon pulled out to a point on both faces, twenty triangles, with a
 * proper normal per face. They tumble on their own axes and the facets catch
 * the light separately as they turn, which is the whole difference between a
 * three-dimensional star and a picture of one.
 *
 * The cost of that honesty is 60 vertices per star instead of 6, so there are
 * fewer stars than there were sprites — about 500 rather than 900. It is still
 * one buffer, uploaded once, drawn in one call.
 *
 * WHY SCATTERED AND NOT A GRID
 * ----------------------------
 * The first version of this was a regular grid of squares, and the giveaway was
 * exactly that: lighting a band around a card produced four tidy rows of little
 * squares in a rectangle, which reads as a table border rather than as light.
 * Stars at pseudo-random positions, each with its own size, spin and phase,
 * have no rows to line up in, so the same band of light comes out as a cloud.
 *
 * WHY IT IS STILL DETERMINISTIC
 * -----------------------------
 * The positions come from a hash of the star's index, not from `Math.random()`.
 * The field therefore looks the same on every load — reloading a page should
 * not rearrange its background — and the two renderers, which build their
 * buffers separately, cannot end up with different skies.
 */

/** How many stars. 500 × 66 vertices is 33,000 — one draw call, no strain. */
export const COUNT = 500;

/**
 * Base size of a star, in the plane's units. Each one varies around this.
 *
 * Half what the old sprites used, and deliberately: a sprite's corner sat at
 * ±0.5 of its size, while a star's points reach a full 1.0, so the same number
 * would have made every one of them twice as big.
 */
export const CELL = 0.0125;

/** Half-thickness of the slab the stars occupy, along Z. */
export const DEPTH = 0.42;

/** Distance from camera to the middle of the slab. */
export const CAMERA_Z = 3.0;

/** How far the slab tips away from the viewer, radians. */
export const TILT = -0.16;

/** Points on each star. Five, as asked. */
const POINTS = 5;

/** Inner radius of the star polygon, as a fraction of the outer. */
const WAIST = 0.4;

/** How far the front and back apexes stand off the star's plane. */
const RELIEF = 0.34;

/**
 * A deterministic pseudo-random number in 0…1.
 *
 * The usual sine hash. It is not a good random number generator and it does not
 * need to be: what it has to do is scatter a few thousand values with no
 * visible pattern, and do it identically in every browser and both renderers.
 */
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * One star, as triangles, plus the quad that carries its glow.
 *
 * The outline alternates tip, waist, tip, waist around the circle — ten points.
 * Each consecutive pair is joined to a front apex and to a back apex, giving
 * twenty triangles: the faceted star everyone draws by hand, as a solid.
 *
 * Then six more vertices for a flat quad, which the shader billboards and fills
 * with a soft radial falloff — the light the star gives off. It is part of the
 * same buffer and the same draw call; the only thing separating it from the
 * solid is `role`, the fourth component of the seed.
 *
 * Wound so that front faces are counter-clockwise seen from outside, which is
 * what lets both renderers cull the back half instead of blending through it.
 *
 * @returns {{position: number[][], normal: number[][], role: number[]}} 66 vertices
 */
function starSolid() {
  const rim = [];
  for (let i = 0; i < POINTS * 2; i++) {
    const angle = (i / (POINTS * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? 1 : WAIST;
    rim.push([Math.cos(angle) * radius, Math.sin(angle) * radius, 0]);
  }

  const front = [0, 0, RELIEF];
  const back = [0, 0, -RELIEF];

  const position = [];
  const normal = [];
  const role = [];

  const push = (a, b, c) => {
    // Flat shading: one normal for the whole triangle, from its own plane.
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const length = Math.hypot(n[0], n[1], n[2]) || 1;
    for (const vertex of [a, b, c]) {
      position.push(vertex);
      normal.push([n[0] / length, n[1] / length, n[2] / length]);
      role.push(0);
    }
  };

  for (let i = 0; i < rim.length; i++) {
    const a = rim[i];
    const b = rim[(i + 1) % rim.length];
    push(a, b, front);
    push(b, a, back);
  }

  // The glow quad. Its corners are carried in `position.xy`, which the shader
  // reads as -1…1 across the quad rather than as a place on the star; `role`
  // is what tells it which of the two this vertex is.
  const CORNERS = [
    [-1, -1, 0], [1, -1, 0], [1, 1, 0],
    [-1, -1, 0], [1, 1, 0], [-1, 1, 0],
  ];
  for (const corner of CORNERS) {
    position.push(corner);
    normal.push([0, 0, 1]);
    role.push(1);
  }

  return { position, normal, role };
}

/**
 * Build the cloud.
 *
 * Four attributes per vertex:
 *
 *   position  the vertex's place on its own star, before it is spun and scaled.
 *             Called `position` because Three takes a geometry's vertex count
 *             from that attribute and silently draws nothing without it.
 *   aNormal   that triangle's face normal, in the same local space.
 *   aCentre   where the star sits: x and y run -1…1 (x is multiplied by the
 *             aspect ratio in the shader); z is its depth in the slab, which is
 *             what gives the cloud parallax as the camera turns.
 *   aSeed     x: size multiplier · y: phase · z: spin rate and direction ·
 *             w: role — 0 for the solid star, 1 for its glow.
 *
 * @returns {{position: Float32Array, normal: Float32Array, centre: Float32Array,
 *            seed: Float32Array, count: number}}
 */
export function buildLattice() {
  const star = starSolid();
  const perStar = star.position.length;          // 60

  const position = new Float32Array(COUNT * perStar * 3);
  const normal = new Float32Array(COUNT * perStar * 3);
  const centre = new Float32Array(COUNT * perStar * 3);
  const seed = new Float32Array(COUNT * perStar * 4);

  for (let i = 0; i < COUNT; i++) {
    // Stratified rather than uniform: the index is spread across a coarse grid
    // and then jittered well past a cell's width. Pure noise clumps and leaves
    // holes; this covers the plane evenly and still has no visible rows.
    const cols = 29;
    const rows = Math.ceil(COUNT / cols);
    const gx = (i % cols) / (cols - 1);
    const gy = Math.floor(i / cols) / Math.max(1, rows - 1);

    const x = (gx * 2 - 1) + (hash(i * 3.1) - 0.5) * 0.1;
    const y = (gy * 2 - 1) + (hash(i * 7.7 + 1) - 0.5) * 0.14;
    const z = (hash(i * 5.3 + 2) - 0.5) * 2 * DEPTH;

    // Small stars far outnumber big ones, which is what stops the field reading
    // as a texture of identical shapes.
    const sizeJitter = 0.40 + Math.pow(hash(i * 11.9 + 3), 2.4) * 1.35;
    const phase = hash(i * 13.7 + 4) * Math.PI * 2;
    const spin = (hash(i * 17.3 + 5) - 0.5) * 1.4;
    /* The phase is used three times in the shader at three different rates,
       which is where the irregular pulsing comes from: three sines whose
       periods do not divide into each other never repeat in any noticeable
       way, so no two stars are ever seen doing the same thing at once. */

    for (let v = 0; v < perStar; v++) {
      const at = (i * perStar + v) * 3;
      const seedAt = (i * perStar + v) * 4;
      position[at] = star.position[v][0];
      position[at + 1] = star.position[v][1];
      position[at + 2] = star.position[v][2];
      normal[at] = star.normal[v][0];
      normal[at + 1] = star.normal[v][1];
      normal[at + 2] = star.normal[v][2];
      centre[at] = x;
      centre[at + 1] = y;
      centre[at + 2] = z;
      seed[seedAt] = sizeJitter;
      seed[seedAt + 1] = phase;
      seed[seedAt + 2] = spin;
      seed[seedAt + 3] = star.role[v];
    }
  }

  return { position, normal, centre, seed, count: COUNT * perStar };
}
