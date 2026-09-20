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
 * people.js — the bust, and the seven things you can put on its head.
 *
 * Font Awesome's `fa-user-*` set is one drawing with a hat swapped: user,
 * user-graduate, user-crown, user-cowboy, user-secret, user-check. This file is
 * built the same way, and on purpose — the Background page shows four of them
 * in a column, and they have to read as the same person in different roles
 * rather than as four unrelated heads.
 *
 * WHY A BUST AND NOT A FIGURE
 * ---------------------------
 * The flat icon is a head over a rounded shoulder line. As a solid that is a
 * portrait bust, which is a real object with a real shape — a sphere for the
 * cranium, a lathed shoulder mass, and nothing below the chest. Turning it
 * shows the side of a head. Modelling a whole standing person instead would put
 * ninety percent of the geometry in legs that are four pixels tall.
 */

import { crownMesh } from './symbols.js';

/**
 * The shared bust: head, neck, shoulders.
 *
 * The shoulders are a lathe rather than a capsule, so the mass swells from the
 * neck and then cuts off flat at the bottom the way a bust does on its plinth.
 */
export function bust(k, opts = {}) {
  const skin = k.mat(opts.skin || k.c.skin, { shine: 26 });
  const cloth = k.mat(opts.cloth || k.c.base, { shine: 22 });

  const head = k.ball(0.19, skin, [0, 0.16, 0], 22);
  // Slightly taller than wide and a little flatter front-to-back: a head, not a
  // ball. Three numbers, and they are most of what stops this reading as a peg.
  head.scale.set(0.94, 1.06, 0.9);
  head.name = 'head';

  const g = k.group(
    head,
    k.tube(0.07, 0.1, skin, [0, -0.02, 0], null, 14),
    k.lathe([
      [0, -0.06], [0.16, -0.08], [0.28, -0.16], [0.35, -0.28], [0.38, -0.42], [0.38, -0.5], [0, -0.5],
    ], cloth, [0, 0.06, 0], null, 22),
  );
  g.name = 'bust';
  return g;
}

/** fad-user — the bust on its own. */
export function user(k) {
  const g = bust(k);
  g.rotation.y = -0.2;
  return k.group(g);
}

/**
 * A mortarboard: the square board, the skullcap under it, the button and the
 * tassel.
 *
 * Exported because the graduation cap is also an icon in its own right, and a
 * cap modelled twice would drift.
 */
export function mortarboard(k, opts = {}) {
  const cloth = k.mat(opts.cloth || k.c.dark, { shine: 24 });
  const gold = k.gloss(k.c.gold);

  // The tassel hangs from the button. Grouped and named so it can swing.
  const tassel = k.group(
    k.capsule(0.012, 0.16, gold, [0, -0.09, 0]),
    k.lathe([[0, 0], [0.045, -0.02], [0.05, -0.06], [0.03, -0.11], [0, -0.12]],
      k.mat(k.c.gold, { shine: 14 }), [0, -0.17, 0], null, 12),
  );
  tassel.position.set(0.26, 0.02, 0.0);
  tassel.name = 'tassel';

  const g = k.group(
    k.lathe([[0, 0], [0.19, 0.005], [0.2, 0.06], [0.16, 0.1], [0, 0.11]],
      cloth, [0, -0.04, 0], null, 18),                          // skullcap
    k.box(0.56, 0.028, 0.56, cloth, [0, 0.07, 0], [0, 0.78, 0]), // the board
    k.ball(0.03, gold, [0, 0.1, 0], 10),                         // button
    tassel,
  );
  g.name = 'cap';
  return g;
}

/** fad-graduation-cap — the cap by itself. */
export function graduationCap(k) {
  const g = mortarboard(k, { cloth: k.c.base });
  g.scale.setScalar(1.35);
  g.position.y = -0.04;
  g.rotation.set(0.12, 0, 0);
  return k.group(g);
}

/** fad-user-graduate — the bust, capped. */
export function userGraduate(k) {
  const g = bust(k);
  g.rotation.y = -0.18;
  const cap = mortarboard(k, { cloth: k.c.dark });
  cap.scale.setScalar(0.82);
  cap.position.set(0, 0.29, 0);
  return k.group(g, cap);
}

/**
 * fal-user-graduate — the light weight of the same.
 *
 * Light, in the flat set, is a thinner line. As a solid it becomes a slighter
 * object: everything a size down, in the pale tone rather than the full one.
 */
export function userGraduateLight(k) {
  const g = bust(k, { cloth: k.c.pale, skin: k.c.lit });
  g.rotation.y = -0.18;
  g.scale.setScalar(0.94);
  const cap = mortarboard(k, { cloth: k.c.base });
  cap.scale.setScalar(0.76);
  cap.position.set(0, 0.28, 0);
  return k.group(g, cap);
}

/** fad-user-crown — the bust, crowned. */
export function userCrown(k) {
  const g = bust(k);
  g.rotation.y = -0.18;
  const crown = crownMesh(k, 0.52);
  crown.position.set(0, 0.33, 0);
  return k.group(g, crown);
}

/**
 * fad-user-cowboy — the bust in a cowboy hat.
 *
 * The brim is a lathe with a lifted outer edge, which is what a cowboy hat's
 * brim is and what a flat disc is not: the curl is visible from the front and
 * unmistakable from any other angle.
 */
export function userCowboy(k) {
  const g = bust(k);
  g.rotation.y = -0.16;

  const felt = k.mat(k.c.wood, { shine: 14 });
  const hat = k.group(
    k.lathe([
      [0, 0], [0.16, 0.005], [0.3, 0.02], [0.38, 0.06], [0.4, 0.1], [0.37, 0.105], [0.3, 0.07],
      [0.16, 0.045], [0.15, 0.04],
    ], felt, [0, 0.25, 0], null, 22),                              // brim, curled
    k.lathe([[0, 0], [0.16, 0], [0.17, 0.1], [0.155, 0.2], [0.1, 0.24], [0, 0.245]],
      felt, [0, 0.26, 0], null, 18),                               // crown
    k.ring(0.168, 0.018, k.mat(k.c.deep, { shine: 30 }), [0, 0.3, 0], [Math.PI / 2, 0, 0], 18),
    // The crease down the middle of the crown: a dark slot, not a highlight.
    k.box(0.05, 0.1, 0.24, k.matte(k.c.deep), [0, 0.47, 0]),
  );
  hat.name = 'hat';
  return k.group(g, hat);
}

/**
 * fad-user-secret — hat brim, coat collar, and nothing in between.
 *
 * The flat icon is a silhouette with a gap where the face should be. That gap
 * is the joke and it survives into three dimensions intact: the head is there,
 * it is just very dark, and the only things catching light are the hat above it
 * and the collar below. Two glasses lenses are the one bright thing.
 */
export function userSecret(k) {
  const g = bust(k, { skin: k.c.deep, cloth: k.c.dark });
  g.rotation.y = -0.14;

  const felt = k.mat(k.c.deep, { shine: 18 });
  const hat = k.group(
    k.lathe([[0, 0], [0.34, 0.01], [0.36, 0.045], [0.16, 0.05], [0.15, 0.045]],
      felt, [0, 0.25, 0], null, 22),
    k.lathe([[0, 0], [0.155, 0], [0.16, 0.12], [0.14, 0.18], [0, 0.185]],
      felt, [0, 0.27, 0], null, 18),
    k.ring(0.158, 0.022, k.mat(k.c.base, { shine: 26 }), [0, 0.31, 0], [Math.PI / 2, 0, 0], 18),
  );
  hat.name = 'hat';

  const glasses = k.group(
    k.box(0.11, 0.06, 0.02, k.gloss(k.c.pale, { emissive: 0.25 }), [-0.07, 0.17, 0.16]),
    k.box(0.11, 0.06, 0.02, k.gloss(k.c.pale, { emissive: 0.25 }), [0.07, 0.17, 0.16]),
    k.box(0.04, 0.012, 0.02, k.matte(k.c.base), [0, 0.17, 0.16]),
  );

  return k.group(
    g,
    hat,
    glasses,
    // Coat collar: two lapels standing proud of the shoulders.
    k.box(0.1, 0.16, 0.03, k.mat(k.c.base, { shine: 22 }), [-0.09, -0.16, 0.16], [0, 0, 0.3]),
    k.box(0.1, 0.16, 0.03, k.mat(k.c.base, { shine: 22 }), [0.09, -0.16, 0.16], [0, 0, -0.3]),
  );
}

/**
 * fad-user-check — the bust with a tick beside it.
 *
 * The tick sits forward of the shoulder in z as well as beside it, so the two
 * objects are at different depths and the icon has a foreground and a
 * background. Flat, they would simply overlap.
 */
export function userCheck(k) {
  const g = bust(k, {});
  g.scale.setScalar(0.88);
  g.position.set(-0.08, 0.02, 0);
  g.rotation.y = -0.2;

  const tick = k.group(
    k.ball(0.17, k.mat(k.c.leaf, { shine: 60 }), [0, 0, 0], 18),
    k.slab(checkShape(k), 0.06, k.matte(k.c.paper), [0, 0, 0.1], null, { bevel: 0.008 }),
  );
  tick.scale.setScalar(0.92);
  tick.position.set(0.28, -0.24, 0.22);
  tick.name = 'badge';

  return k.group(g, tick);
}

/** The tick outline, kept here because only `userCheck` needs it in this file. */
function checkShape(k) {
  const s = new k.THREE.Shape();
  const pts = [
    [-0.1, 0.0], [-0.04, -0.06], [0.09, 0.08], [0.09 - 0.032, 0.08 + 0.046],
    [-0.04, -0.06 + 0.066], [-0.1 + 0.05, 0.0 + 0.046],
  ];
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}
