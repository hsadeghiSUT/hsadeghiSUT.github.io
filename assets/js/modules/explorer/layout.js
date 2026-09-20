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
 * layout.js — where the 81 people end up in space.
 *
 * A force-directed layout, in three dimensions, solved once when the graph is
 * built and then left alone. Three forces, and nothing else:
 *
 *   repulsion   every pair of nodes pushes apart, like charges. This is what
 *               stops the graph collapsing into a ball and what opens up the
 *               gaps that make clusters visible.
 *   springs     every co-authorship pulls its two ends together, harder when
 *               they have written more together. This is the actual data.
 *   gravity     a weak pull to the origin, so nobody drifts off to infinity and
 *               the whole thing stays inside the frame.
 *
 * WHY NOT AN ANIMATED SIMULATION
 * ------------------------------
 * Because there is nothing to watch. A settling graph is a fashionable effect,
 * but it makes the first few seconds unreadable and it means the picture is
 * different every visit — you cannot say "look at the cluster on the left" to a
 * colleague. This solves silently and shows the answer, and it is
 * DETERMINISTIC: seeded from each node's index, so the same data always
 * produces the same shape.
 *
 * COST
 * ----
 * Repulsion is the expensive part, O(n²) per iteration. At 81 nodes that is
 * 3,240 pairs; at 300 iterations, under a million distance calculations —
 * a few milliseconds, once, on a page that has already rendered. A Barnes-Hut
 * tree would make it O(n log n) and would be the right call at a few thousand
 * nodes; at this size it would be more code, more places to be wrong, and no
 * faster in wall-clock terms.
 */

/** Iterations. Enough to settle at this size; there is nothing to gain past it. */
const STEPS = 320;

/** Repulsion strength between every pair. */
const CHARGE = 0.85;

/** How hard a shared paper pulls. */
const SPRING = 0.055;

/** Pull toward the origin, per unit of distance. */
const GRAVITY = 0.022;

/** Velocity retained between steps: the layout cools as it settles. */
const DAMPING = 0.86;

/** Never let two nodes act as if they were closer than this. */
const MIN_DISTANCE = 0.18;

/**
 * A deterministic pseudo-random number in 0…1 from an integer seed.
 *
 * `Math.random()` would reshuffle the graph on every reload, which is exactly
 * what a picture of a stable fact should not do.
 */
function seeded(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Solve the layout.
 *
 * TWO SHAPES, ONE SOLVER
 * ----------------------
 * `flat` confines the whole thing to the ground plane: Y is seeded at zero,
 * never receives a force, and never moves. The result is the same graph — same
 * forces, same constants, same determinism — as a plan rather than a ball.
 *
 * The Influence view (README §15.8) needs that plan, because it stands a tower
 * on every node and a tower needs somewhere to stand. Flattening the 3D answer
 * afterwards would not do: projecting a sphere onto a plane drops nodes on top
 * of one another, and two towers in the same place is not a city, it is a bug.
 * Solving in two dimensions from the start lets the repulsion do the separating
 * it was always there to do.
 *
 * @param {object[]} people  from data.js, already sorted by paper count
 * @param {object[]} edges   {source, target, weight} with indices into `people`
 * @param {object} [opts]    `{ flat: true }` to solve in the XZ plane
 * @returns {{positions: Float32Array, radius: number}}
 *          positions is [x, y, z] per node; radius is how far the furthest node
 *          ended up, which the camera uses to frame the whole thing.
 */
export function solveLayout(people, edges, opts = {}) {
  const n = people.length;
  const flat = !!opts.flat;
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);

  /* Seed on a spiral — over a sphere, or over a disc when the answer has to be
     a plan. Both are even and neither looks random, which is what gives the
     springs something sensible to pull against; the disc is the Fermat spiral,
     the same one a sunflower uses, for the same reason.

     Busier nodes start nearer the middle, which is where they will end up
     anyway. */
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    if (flat) {
      const r = (1.1 + 2.6 * Math.sqrt(t) + seeded(i) * 0.2) * 1.35;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = r * Math.sin(theta);
      continue;
    }
    const phi = Math.acos(1 - 2 * t);
    const r = 1.6 + 1.5 * t + seeded(i) * 0.25;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi) * 0.75;   // slightly flattened in Z
  }

  const force = new Float32Array(n * 3);

  for (let step = 0; step < STEPS; step++) {
    force.fill(0);

    // ---- repulsion, every pair ------------------------------------------
    for (let i = 0; i < n; i++) {
      const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
      for (let j = i + 1; j < n; j++) {
        let dx = ix - pos[j * 3];
        let dy = iy - pos[j * 3 + 1];
        let dz = iz - pos[j * 3 + 2];
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < MIN_DISTANCE * MIN_DISTANCE) {
          // Two nodes on top of each other have no direction to separate in, so
          // give them one rather than dividing by zero.
          dx = seeded(i * 31 + j) - 0.5;
          dy = seeded(i * 17 + j * 7) - 0.5;
          dz = seeded(i * 13 + j * 3) - 0.5;
          d2 = MIN_DISTANCE * MIN_DISTANCE;
        }
        const d = Math.sqrt(d2);
        // Heavier nodes push harder, so the hubs claim their own space.
        const strength = (CHARGE * (1 + Math.log(1 + people[i].count) * 0.35)
                                 * (1 + Math.log(1 + people[j].count) * 0.35)) / d2;
        const fx = (dx / d) * strength;
        const fy = (dy / d) * strength;
        const fz = (dz / d) * strength;
        force[i * 3] += fx; force[i * 3 + 1] += fy; force[i * 3 + 2] += fz;
        force[j * 3] -= fx; force[j * 3 + 1] -= fy; force[j * 3 + 2] -= fz;
      }
    }

    // ---- springs, one per co-authorship ---------------------------------
    for (const e of edges) {
      const a = e.source, b = e.target;
      const dx = pos[b * 3] - pos[a * 3];
      const dy = pos[b * 3 + 1] - pos[a * 3 + 1];
      const dz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const d = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), MIN_DISTANCE);
      // Papers together pull harder, but with diminishing returns — otherwise a
      // pair with twenty shared papers would sit on top of one another.
      const k = SPRING * (1 + Math.log(1 + e.weight));
      const fx = dx * k, fy = dy * k, fz = dz * k;
      force[a * 3] += fx; force[a * 3 + 1] += fy; force[a * 3 + 2] += fz;
      force[b * 3] -= fx; force[b * 3 + 1] -= fy; force[b * 3 + 2] -= fz;
    }

    // ---- gravity, and integrate -----------------------------------------
    const cooling = 1 - step / STEPS;
    for (let i = 0; i < n; i++) {
      force[i * 3] -= pos[i * 3] * GRAVITY;
      force[i * 3 + 1] -= pos[i * 3 + 1] * GRAVITY;
      force[i * 3 + 2] -= pos[i * 3 + 2] * GRAVITY;

      for (let k = 0; k < 3; k++) {
        // Y is held at zero in a flat solve. Zeroing the velocity too, rather
        // than only the position, is what stops the repulsion quietly banking
        // energy in an axis it is never allowed to spend it in.
        if (flat && k === 1) { vel[i * 3 + 1] = 0; pos[i * 3 + 1] = 0; continue; }
        const idx = i * 3 + k;
        vel[idx] = (vel[idx] + force[idx] * 0.02) * DAMPING;
        // The step shrinks as the layout cools, which is what lets it settle
        // instead of jittering around a minimum for ever.
        pos[idx] += vel[idx] * (0.4 + cooling * 0.6);
      }
    }
  }

  // Centre on the mean, so the camera can simply look at the origin.
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx += pos[i * 3]; cy += pos[i * 3 + 1]; cz += pos[i * 3 + 2]; }
  cx /= n; cy /= n; cz /= n;

  let radius = 0;
  for (let i = 0; i < n; i++) {
    pos[i * 3] -= cx; pos[i * 3 + 1] -= cy; pos[i * 3 + 2] -= cz;
    const d = Math.hypot(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    if (d > radius) radius = d;
  }

  return { positions: pos, radius };
}
