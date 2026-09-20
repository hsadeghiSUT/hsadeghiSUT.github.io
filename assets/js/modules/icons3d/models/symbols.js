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
 * symbols.js — the marks: stars, crowns, wreaths, the earth, the clock, and the
 * handful of pure signs (tick, cross, arrow, exclamation).
 *
 * TWO KINDS OF THING LIVE HERE, AND THEY ARE MODELLED DIFFERENTLY
 * --------------------------------------------------------------
 * **Objects** — a crown, a wreath, a medal, the earth, a cog, an hourglass —
 * are modelled as what they are. A crown is a band with points on it and stones
 * set into it, and turning it shows the back of the band through the gaps.
 *
 * **Signs** — a tick, a cross, an arrow, an exclamation mark — are not objects
 * and never were. Nobody has held a tick. What they become is a sign *made of
 * something*: cut from a plate, set into a disc, raised off a face, with a
 * bevel that catches the key light along its edge. That is an honest three-
 * dimensional reading of a two-dimensional sign, and inventing a "real" object
 * for it would be inventing a meaning the icon does not have.
 *
 * The star is the interesting case and it is an object: a five-pointed star as
 * a solid is a stellated form with a ridge running out to each point, which is
 * what a star-shaped thing looks like when you pick one up. See `star()`.
 */

import { starOutline, polygon, checkOutline, crossOutline, arrowOutline } from '../lib.js';

/* -------------------------------------------------------------------------- */
/* Stars, hearts, crowns — the things that mean "good"                         */
/* -------------------------------------------------------------------------- */

/**
 * A solid star: five points, each with a ridge running from the centre out to
 * its tip, so the surface is ten sloped facets rather than one flat face.
 *
 * Twenty facets, ten front and ten back, which is why this reads as a solid at
 * fourteen pixels where an extruded outline reads as a sticker: half of them
 * catch the key light and half do not.
 *
 * @param {object} k
 * @param {object} opts  `{ outer, inner, rise, material }`
 */
export function starMesh(k, opts = {}) {
  const THREE = k.THREE;
  const outer = opts.outer || 0.46;
  const inner = opts.inner || outer * 0.44;
  const rise = opts.rise === undefined ? 0.15 : opts.rise;

  /* A bipyramid over a ten-sided star polygon, built by hand.
   *
   * The obvious route — extrude the outline with a deep bevel — was tried and
   * is wrong. Three's bevel insets the top face by `bevelSize` all the way
   * round, and a star's inner radius is only about a fifth of the frame: any
   * bevel deep enough to be a slope swallows the top face entirely and what
   * comes out is a rounded blob with no points on it at all.
   *
   * Twenty triangles instead. Ten rim points at z = 0, an apex in front and an
   * apex behind, and one triangle from each apex to each rim edge. Every face
   * is planar, `flatShading` keeps them crisp, and the ridge running out to
   * each point is a real edge between two real faces — so five facets take the
   * key light and five do not, which is what a star-shaped solid looks like.
   */
  const rim = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 ? inner : outer;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    rim.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
  }

  const verts = [];
  for (let i = 0; i < 10; i += 1) {
    const p = rim[i];
    const q = rim[(i + 1) % 10];
    // Front: apex, then the edge anticlockwise, so the winding faces +z.
    verts.push(0, 0, rise, p[0], p[1], 0, q[0], q[1], 0);
    // Back: the same edge the other way round.
    verts.push(0, 0, -rise, q[0], q[1], 0, p[0], p[1], 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.computeVertexNormals();

  return k.put(geometry, opts.material || k.mat(k.c.gold, { shine: 80, flat: true }));
}

/** fas-star — the solid star. */
export function star(k) {
  return k.group(starMesh(k));
}

/** fad-star — the duotone star, in the icon's own colour rather than gold. */
export function starDuo(k) {
  return k.group(starMesh(k, { material: k.mat(k.c.base, { shine: 70, flat: true }) }));
}

/**
 * fal-star — the light star.
 *
 * Light weight is a thin outline in the flat set; here it is a thin star, a
 * smaller rise, and a pale tone. Same object, less of it.
 */
export function starLight(k) {
  return k.group(starMesh(k, {
    outer: 0.44,
    inner: 0.19,
    rise: 0.08,
    material: k.mat(k.c.pale, { shine: 60, flat: true }),
  }));
}

/**
 * fas-heart — a heart as a solid, by squeezing a sphere into the outline.
 *
 * The same construction the footer's heart uses, for the same reason: an
 * extruded heart is a heart-shaped slab with a flat front, and inflating a slab
 * tears it along the seam between its cap and its side wall. A sphere has no
 * seam, so pushing every vertex to the heart's radius at its own angle gives
 * one continuous surface that domes to the crown, keeps the notch between the
 * lobes all the way up, and is thickest through the middle. See
 * assets/js/modules/heart3d.js, which has the long version of this note.
 */
export function heart(k) {
  const THREE = k.THREE;

  /* The heart's radius at any angle, read off the classic parametric curve
   *
   *     x = 16 sin³t,  y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t
   *
   * rather than invented as a polar formula. Two earlier attempts at a formula
   * are worth recording: a cardioid has ONE cusp, so it renders as a kidney,
   * and a hand-tuned sum of sines that looked right on paper came out as a
   * lopsided blob. This curve is the shape everyone means by "heart", it is
   * star-shaped about the origin — every ray from the centre crosses it exactly
   * once — so it can be turned into a radius lookup, and the lookup is sampled
   * once at build time and then read, not solved, per vertex.
   */
  const SAMPLES = 256;
  const radius = new Float32Array(SAMPLES);
  for (let i = 0; i < SAMPLES * 4; i += 1) {
    const t = (i / (SAMPLES * 4)) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const a = Math.atan2(y, x);
    const bin = Math.floor(((a + Math.PI) / (Math.PI * 2)) * SAMPLES) % SAMPLES;
    // 17 is the curve's own maximum radius, so this comes out in 0 … 1.
    radius[bin] = Math.max(radius[bin], Math.hypot(x, y) / 17);
  }
  // Four times as many samples as bins, so no bin is left empty; any that still
  // is takes its neighbour rather than collapsing to the origin.
  for (let i = 0; i < SAMPLES; i += 1) {
    if (!radius[i]) radius[i] = radius[(i + SAMPLES - 1) % SAMPLES] || 0.5;
  }

  /* A SPHERE pushed into that outline, not an extrusion. An extruded heart is a
     heart-shaped slab with a flat front; inflating a slab tears it along the
     seam between its cap and its side wall, and `computeVertexNormals` then
     draws a hard crease right round the shape. A sphere has no seam. See
     assets/js/modules/heart3d.js, which has the long version of this note. */
  const geometry = new THREE.SphereGeometry(0.5, 40, 26);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i).normalize();
    const a = Math.atan2(v.y, v.x);
    const bin = Math.floor(((a + Math.PI) / (Math.PI * 2)) * SAMPLES) % SAMPLES;
    const r = radius[bin] * 0.52;
    /* The unit direction times the outline's radius. At the equator `v.z` is
       zero and the cross-section is exactly the outline; as `v.z` rises the
       section is the same outline scaled down, so it domes to a point at the
       crown and keeps the cleft all the way up. */
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r * 0.72);
  }
  geometry.computeVertexNormals();

  return k.group(k.put(geometry, k.mat(k.c.base, { shine: 90, specular: 0.45 })));
}

/**
 * A crown: a band, five points, and a stone in each hollow.
 *
 * Exported because `fad-user-crown` wears one, and a crown modelled twice is
 * two crowns that will drift apart the first time either is adjusted.
 *
 * The band is an open cylinder — you can see its inside through the gaps
 * between the points, which is the detail that says "a band of metal bent into
 * a circle" rather than "a zigzag shape".
 */
export function crownMesh(k, scale = 1) {
  const gold = k.gloss(k.c.gold, { shine: 130 });
  const gem = k.mat(k.c.base, { shine: 120, specular: 0.8, flat: true });

  const points = k.repeat(5, (i) => {
    const a = (i - 2) * 0.52;
    const tall = i === 2 ? 0.3 : 0.22 - Math.abs(i - 2) * 0.02;
    return [
      k.cone(0.075, tall, gold, [Math.sin(a) * 0.3, 0.12 + tall / 2, Math.cos(a) * 0.3 - 0.3],
        [0, a, 0], 4),
      k.put(new k.THREE.IcosahedronGeometry(0.038, 0), gem,
        [Math.sin(a) * 0.3, 0.12 + tall, Math.cos(a) * 0.3 - 0.3]),
    ];
  });

  const g = k.group(
    // Open-ended so the inside of the far side shows between the points.
    k.put(new k.THREE.CylinderGeometry(0.31, 0.33, 0.17, 24, 1, true),
      k.gloss(k.c.gold, { shine: 130, side: k.THREE.DoubleSide }), [0, 0.035, -0.3]),
    k.ring(0.32, 0.022, gold, [0, 0.115, -0.3], [Math.PI / 2, 0, 0], 24),
    k.ring(0.335, 0.024, gold, [0, -0.045, -0.3], [Math.PI / 2, 0, 0], 24),
    points,
    k.repeat(4, (i) =>
      k.put(new k.THREE.IcosahedronGeometry(0.032, 0), gem,
        [(i - 1.5) * 0.15, 0.035, 0.03])),
  );
  g.scale.setScalar(scale);
  return g;
}

/** fad-crown — the crown, seen slightly from above. */
export function crown(k) {
  const g = crownMesh(k, 1.15);
  g.rotation.x = 0.2;
  g.position.y = -0.06;
  return k.group(g);
}

/** fas-crown — the same crown, in the icon's colour rather than gold. */
export function crownSolid(k) {
  const g = crownMesh(k, 1.15);
  g.rotation.x = 0.2;
  g.position.y = -0.06;
  g.traverse((node) => {
    if (node.material) {
      node.material = node.material.clone();
      node.material.color.copy(k.c.base);
    }
  });
  return k.group(g);
}

/**
 * fad-wreath — a laurel wreath: a ring of real leaves with a ribbon at the foot.
 *
 * Each leaf is a squashed sphere, tilted to lie along the ring and fanned out
 * from it. Thirty of them, which is few enough to be cheap and many enough that
 * turning the wreath shows leaves passing in front of other leaves — the one
 * thing an extruded outline of a wreath cannot do.
 */
export function wreath(k) {
  const leafMat = k.mat(k.c.leaf, { shine: 30 });
  const COUNT = 30;

  const leaves = k.repeat(COUNT, (i) => {
    // The wreath opens at the top, as a laurel wreath does: the run of leaves
    // stops short of vertical on both sides.
    const t = i / (COUNT - 1);
    const a = -Math.PI / 2 + 0.42 + t * (Math.PI * 2 - 0.84);
    const r = 0.33;
    const leaf = k.ball(0.085, leafMat, [Math.cos(a) * r, Math.sin(a) * r, 0], 10);
    leaf.scale.set(1, 0.42, 0.34);
    // Lean each leaf outward along the tangent, alternating in and out so the
    // ring has depth rather than being a flat garland.
    leaf.rotation.set(0, 0, a + (i % 2 ? 0.7 : -0.7));
    leaf.position.z = (i % 2 ? 1 : -1) * 0.05;
    return leaf;
  });

  return k.group(
    k.ring(0.33, 0.022, k.mat(k.c.wood, { shine: 20 }), [0, 0, 0], [0, 0, 0], 28),
    leaves,
    // The ribbon tying it at the bottom.
    k.box(0.13, 0.05, 0.05, k.mat(k.c.base, { shine: 40 }), [0, -0.36, 0.03]),
    k.box(0.05, 0.16, 0.02, k.mat(k.c.base, { shine: 40 }), [-0.05, -0.45, 0.03], [0, 0, 0.35]),
    k.box(0.05, 0.16, 0.02, k.mat(k.c.base, { shine: 40 }), [0.05, -0.45, 0.03], [0, 0, -0.35]),
  );
}

/**
 * fad-award — a medal on a ribbon.
 *
 * The ribbon is two straps meeting behind the medal, so the medal hangs in
 * front of them at a different depth. The face of the medal is a stepped disc
 * with a star struck into it, which is what a struck medal is: not a flat
 * circle with a picture, but relief.
 */
export function award(k) {
  const metal = k.gloss(k.c.gold, { shine: 140 });

  const medal = k.group(
    k.tube(0.26, 0.055, metal, [0, 0, 0], [Math.PI / 2, 0, 0], 26),
    k.tube(0.21, 0.07, k.gloss(k.c.gold, { shine: 90 }), [0, 0, 0], [Math.PI / 2, 0, 0], 26),
    k.ring(0.24, 0.02, k.gloss(k.c.pale), [0, 0, 0.02], [0, 0, 0], 26),
    starMesh(k, {
      outer: 0.16,
      inner: 0.07,
      rise: 0.05,
      material: k.mat(k.c.base, { shine: 100, flat: true }),
    }),
    // The ring the ribbon passes through.
    k.ring(0.05, 0.016, metal, [0, 0.28, 0], [0, 0, 0], 14),
  );
  medal.position.set(0, -0.14, 0.09);
  medal.name = 'medal';

  const strap = k.mat(k.c.base, { shine: 24 });
  return k.group(
    k.box(0.13, 0.42, 0.03, strap, [-0.12, 0.26, 0], [0, 0, 0.34]),
    k.box(0.13, 0.42, 0.03, strap, [0.12, 0.26, 0], [0, 0, -0.34]),
    k.box(0.1, 0.09, 0.04, k.mat(k.c.dark, { shine: 24 }), [0, 0.1, 0.01]),
    medal,
  );
}

/* -------------------------------------------------------------------------- */
/* The earth                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A tile of land, sitting on the surface of the globe.
 *
 * A patch of sphere at a slightly larger radius than the ocean, which means it
 * curves with the planet, disappears round the limb correctly, and needs no
 * texture, no image and no second request. Continents are three or four of
 * these overlapping.
 *
 * WHICH WAY ROUND phi GOES, because it cost an hour. Three's sphere puts
 *
 *     x = −r·cos(phi)·sin(theta)
 *     y =  r·cos(theta)
 *     z =  r·sin(phi)·sin(theta)
 *
 * so **phi = π/2 faces the camera** and phi = 3π/2 is the far side; theta runs
 * from 0 at the north pole to π at the south. The first pass had the Americas
 * between phi 2.35 and 3.5 — which is the back of the planet, and the icon
 * rendered as a featureless blue ball that only grew continents if you watched
 * it for eight seconds.
 */
function landPatch(k, r, phi0, phiLen, theta0, thetaLen, material) {
  return k.put(
    new k.THREE.SphereGeometry(r, 16, 12, phi0, phiLen, theta0, thetaLen),
    material,
  );
}

/**
 * fad-globe-americas — the earth, turning about its own axis.
 *
 * WHY THIS ONE IS NOT A DISC WITH A PATTERN
 * -----------------------------------------
 * Because the request that produced this file named it: a globe should be a
 * globe. So the oceans are a sphere, the land is patches of sphere sitting a
 * few thousandths above it, the equator and one meridian are thin rings drawn
 * on the surface, and the whole thing turns about the vertical axis at a
 * steady rate. Land goes round the limb and comes back, which is the only
 * thing that actually proves a sphere is a sphere.
 *
 * The continents are the Americas, roughly — the flat icon's name is
 * `globe-americas` and this keeps faith with it: North America across the top
 * left, a narrow isthmus, South America falling away to the south-east.
 */
export function globe(k) {
  const R = 0.44;
  const sea = k.mat(k.c.ocean, { shine: 80, specular: 0.4 });
  /* Standing 0.014 off a 0.44 sphere — three per cent of the radius. Less than
     that and the land is coplanar with the sea at this many pixels, and the
     earth renders as a plain blue ball. */
  const land = k.mat(k.shade(k.c.leaf, -0.06), { shine: 10 });
  const line = k.matte(k.c.pale, { opacity: 0.5 });

  // The planet itself, in a group of its own so the graticule turns with it.
  const world = k.group(
    k.ball(R, sea, [0, 0, 0], 28),
    // North America — broad across the top, facing the camera.
    landPatch(k, R + 0.014, 1.05, 1.05, 0.48, 0.55, land),
    landPatch(k, R + 0.014, 1.35, 0.55, 0.36, 0.22, land),
    // Central America, a thin bridge running south-east.
    landPatch(k, R + 0.014, 1.5, 0.26, 1.02, 0.3, land),
    // South America, narrowing to a tail.
    landPatch(k, R + 0.014, 1.52, 0.46, 1.28, 0.62, land),
    landPatch(k, R + 0.014, 1.6, 0.24, 1.82, 0.48, land),
    // Two masses on the far side, so the back of the globe is not blank water
    // when the rotation brings it round.
    landPatch(k, R + 0.014, 4.3, 0.85, 0.65, 0.85, land),
    landPatch(k, R + 0.014, 5.35, 0.5, 1.25, 0.5, land),
    k.ring(R + 0.002, 0.007, line, [0, 0, 0], [Math.PI / 2, 0, 0], 32),  // equator
    k.ring(R + 0.002, 0.006, line, [0, 0, 0], [0, 0, 0], 32),            // meridian
    k.ring(R * 0.87, 0.005, line, [0, R * 0.48, 0], [Math.PI / 2, 0, 0], 28),
    k.ring(R * 0.87, 0.005, line, [0, -R * 0.48, 0], [Math.PI / 2, 0, 0], 28),
  );
  world.name = 'world';
  // Tilted on its axis, because the earth is, and because an upright sphere
  // turning looks like a ball on a lathe.
  world.rotation.z = 0.41;

  return k.group(world);
}

/* -------------------------------------------------------------------------- */
/* Machines and time                                                           */
/* -------------------------------------------------------------------------- */

/**
 * fad-cog — a gear: a rim, a hub, spokes, and twelve teeth cut on the outside.
 *
 * Teeth are separate boxes standing off the rim rather than points on an
 * outline, so they have a top land and two flanks and the light breaks across
 * them as the gear turns. That flicker is what a turning gear looks like.
 */
export function cog(k) {
  const metal = k.mat(k.c.base, { shine: 70, specular: 0.4 });
  const dark = k.mat(k.c.dark, { shine: 50 });
  const TEETH = 12;

  const teeth = k.repeat(TEETH, (i) => {
    const a = (i * Math.PI * 2) / TEETH;
    return k.box(0.1, 0.12, 0.17, metal,
      [Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0], [0, 0, a + Math.PI / 2]);
  });

  const spokes = k.repeat(4, (i) =>
    k.box(0.28, 0.08, 0.13, dark, [0, 0, 0], [0, 0, (i * Math.PI) / 4]));

  const g = k.group(
    k.tube(0.36, 0.16, metal, [0, 0, 0], [Math.PI / 2, 0, 0], 28),
    teeth,
    spokes,
    k.tube(0.13, 0.2, dark, [0, 0, 0], [Math.PI / 2, 0, 0], 20),
    // The bore, as a ring set into the hub rather than a hole through it.
    k.ring(0.075, 0.025, k.matte(k.c.deep), [0, 0, 0.1], [0, 0, 0], 18),
    k.ring(0.075, 0.025, k.matte(k.c.deep), [0, 0, -0.1], [0, 0, 0], 18),
  );
  g.name = 'gear';
  return k.group(g);
}

/**
 * fad-spinner — eight balls on a ring, turning.
 *
 * The flat spinner is eight dots at eight opacities, animated by moving which
 * dot is brightest. As a solid the same idea becomes eight spheres of eight
 * sizes on a ring that turns: the size difference is the trail, and it is a
 * real trail rather than a fade, so it is still a trail when the icon is
 * viewed at an angle.
 */
export function spinner(k) {
  const COUNT = 8;
  const balls = k.repeat(COUNT, (i) => {
    const t = i / COUNT;
    const a = t * Math.PI * 2;
    const r = 0.1 + t * 0.06;
    const ball = k.ball(r, k.mat(k.c.base, {
      shine: 90,
      emissive: 0.1 + t * 0.35,
    }), [Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0], 12);
    return ball;
  });
  const g = k.group(balls);
  g.name = 'ring';
  return k.group(g);
}

/**
 * fad-history — a clock with an arrow sweeping back round it.
 *
 * Two things, both real: a cased clock with a dial sunk behind a glass, and an
 * open arc with an arrowhead running anticlockwise around it. The hands run
 * backwards, which is what the icon means.
 */
export function history(k) {
  const caseMat = k.mat(k.c.base, { shine: 60 });
  const dial = k.matte(k.c.paper);

  /* A hand pivots about the centre of the dial, so the bar is built offset from
     its own group's origin and the GROUP is what rotates. Rotating the bar
     itself would spin it about its own middle, which is a propeller. */
  const hour = k.group(k.box(0.024, 0.15, 0.03, k.matte(k.c.deep), [0, 0.06, 0.105]));
  hour.position.set(0, -0.02, 0);
  hour.name = 'hour';

  const minute = k.group(k.box(0.018, 0.22, 0.03, k.matte(k.c.dark), [0, 0.1, 0.1]));
  minute.position.set(0, -0.02, 0);
  minute.name = 'minute';

  return k.group(
    k.tube(0.32, 0.14, caseMat, [0, -0.02, 0], [Math.PI / 2, 0, 0], 28),
    k.disc(0.285, dial, [0, -0.02, 0.072]),
    k.ring(0.3, 0.028, k.gloss(k.c.pale), [0, -0.02, 0.07], [0, 0, 0], 28),
    k.repeat(12, (i) => {
      const a = (i * Math.PI) / 6;
      return k.box(0.016, i % 3 ? 0.03 : 0.05, 0.014, k.matte(k.c.deep),
        [Math.sin(a) * 0.235, -0.02 + Math.cos(a) * 0.235, 0.08], [0, 0, -a]);
    }),
    hour,
    minute,
    k.ball(0.03, k.gloss(k.c.gold), [0, -0.02, 0.1], 10),
    // The anticlockwise arc over the top, with a head on its left end.
    k.arc(0.43, 0.035, Math.PI * 1.15, k.mat(k.c.dark, { shine: 50 }),
      [0, -0.02, 0], [0, 0, -0.1], 24),
    k.cone(0.09, 0.14, k.mat(k.c.dark, { shine: 50 }), [-0.41, 0.09, 0], [0, 0, 1.9], 10),
  );
}

/**
 * fas-hourglass-end — the sand run through: an empty upper bulb and a full
 * lower one.
 *
 * The glass is transparent and the sand inside it is a separate solid, so you
 * are looking through one object at another. The last grain is caught falling
 * through the waist, which is the detail that makes "end" read as a moment
 * rather than as a state.
 */
export function hourglass(k) {
  const frame = k.mat(k.c.base, { shine: 80 });
  const sand = k.mat(k.c.sand, { shine: 10 });
  const glassMat = k.glass(k.c.pale, 0.24);

  // One bulb: wide at the outside, pinched to nothing at the waist.
  const bulb = (sign) => k.lathe([
    [0, 0.3 * sign], [0.22, 0.29 * sign], [0.25, 0.2 * sign], [0.2, 0.08 * sign],
    [0.05, 0.015 * sign], [0.03, 0],
  ], glassMat, [0, 0, 0], null, 22);

  return k.group(
    bulb(1),
    bulb(-1),
    // The sand, heaped in the bottom bulb: a cone with a rounded top.
    k.lathe([[0, -0.29], [0.21, -0.285], [0.2, -0.2], [0.13, -0.13], [0.05, -0.1], [0, -0.095]],
      sand, [0, 0, 0], null, 20),
    Object.assign(k.tube(0.012, 0.08, sand, [0, 0.02, 0], null, 8), { name: 'grain' }),
    k.tube(0.28, 0.05, frame, [0, 0.33, 0], null, 22),
    k.tube(0.28, 0.05, frame, [0, -0.33, 0], null, 22),
    k.repeat(3, (i) => {
      const a = (i * Math.PI * 2) / 3 + 0.4;
      return k.box(0.035, 0.68, 0.035, frame, [Math.cos(a) * 0.245, 0, Math.sin(a) * 0.245]);
    }),
  );
}

/**
 * fad-link — two links of chain, interlocked.
 *
 * Two torus rings at right angles, threaded. It is the one icon in the set
 * where the three-dimensional reading is strictly more informative than the
 * flat one: the flat glyph has to draw a break in one link to say which passes
 * through which, and this simply is the answer.
 */
export function link(k) {
  const metal = k.gloss(k.c.base, { shine: 120 });
  const a = k.ring(0.21, 0.065, metal, [-0.14, 0.11, 0], [0.35, 0.5, -0.7], 22);
  const b = k.ring(0.21, 0.065, k.gloss(k.c.lit, { shine: 120 }),
    [0.14, -0.11, 0], [0.35, -0.5, -0.7], 22);
  a.name = 'linkA';
  b.name = 'linkB';
  return k.group(a, b);
}

/**
 * fad-digging — a hard hat and a shovel, mid-stroke.
 *
 * The shovel is the moving part: it swings down and lifts, which is what
 * "in progress" means on the Research Team page where this icon lives.
 */
export function digging(k) {
  const hatMat = k.mat(k.c.gold, { shine: 60 });

  const hat = k.group(
    k.lathe([[0, 0], [0.19, 0.01], [0.21, 0.05], [0.13, 0.06], [0.12, 0.055]],
      hatMat, [0, 0, 0], null, 20),
    k.lathe([[0, 0], [0.12, 0.005], [0.125, 0.09], [0.09, 0.15], [0, 0.16]],
      hatMat, [0, 0.03, 0], null, 18),
    k.box(0.03, 0.02, 0.26, k.mat(k.c.dark, { shine: 40 }), [0, 0.15, 0]),   // ridge
    k.lathe([[0.12, 0], [0.21, 0.03], [0.2, 0.05], [0.12, 0.03]],
      hatMat, [0, 0.02, 0], [0, 0, 0], 20),
  );
  hat.position.set(-0.2, 0.22, 0);
  hat.rotation.set(0.15, 0.3, 0.1);

  const shovel = k.group(
    k.tube(0.026, 0.46, k.mat(k.c.wood, { shine: 30 }), [0, 0.2, 0], null, 12),
    k.box(0.1, 0.09, 0.02, k.mat(k.c.wood, { shine: 30 }), [0, 0.45, 0]),
    // The blade: a lathed scoop, squashed so it is a dish rather than a bowl.
    Object.assign(
      k.lathe([[0, 0], [0.09, 0.005], [0.15, 0.05], [0.17, 0.14], [0.16, 0.2]],
        k.gloss(k.c.pale, { shine: 120 }), [0, -0.1, 0], [Math.PI, 0, 0], 18),
      { name: 'blade' },
    ),
  );
  shovel.position.set(0.16, -0.12, 0.1);
  shovel.rotation.z = -0.5;
  shovel.name = 'shovel';

  return k.group(
    // A heap of spoil, so the shovel has somewhere to be digging.
    k.lathe([[0, 0], [0.16, -0.03], [0.26, -0.07], [0.3, -0.09]],
      k.matte(k.c.wood), [0, -0.34, 0], null, 18),
    hat,
    shovel,
  );
}

/* -------------------------------------------------------------------------- */
/* Envelopes                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * An envelope with a flap that really opens, and a letter inside it.
 *
 * The flap is hinged along the top edge of the back panel and rotates about
 * that edge, so when it lifts you see its underside and the letter behind it.
 * That is the whole reason to model an envelope rather than extrude one.
 */
function envelopeBody(k, opts = {}) {
  const paper = k.mat(opts.paper || k.c.base, { shine: 26 });
  const inner = k.matte(opts.inner || k.c.pale);

  const W = 0.78;
  const H = 0.52;

  // The flap: a wide, shallow triangle, hinged at its base.
  const tri = new k.THREE.Shape();
  tri.moveTo(-W / 2, 0);
  tri.lineTo(W / 2, 0);
  tri.lineTo(0, -H * 0.72);
  tri.closePath();

  /* In FRONT of the front panel, not behind it. The first pass hinged it at
     z = 0.035 — between the two panels, where it is invisible until it opens,
     and the envelope read as a plain rectangle. A closed envelope shows its
     flap; that is most of what makes it an envelope rather than a card. */
  const flap = k.group(k.slab(tri, 0.014, k.mat(opts.flap || k.c.lit, { shine: 26 }),
    [0, 0, 0], null, { bevel: 0.004 }));
  flap.position.set(0, H / 2, 0.063);
  flap.name = 'flap';

  const letter = k.group(
    k.box(W * 0.84, H * 0.86, 0.008, k.matte(k.c.paper), [0, 0, 0]),
    k.repeat(3, (i) =>
      k.box(W * 0.5, 0.016, 0.004, k.matte(opts.paper || k.c.base), [0, 0.1 - i * 0.09, 0.007])),
  );
  letter.position.set(0, 0.02, 0.012);
  letter.name = 'letter';

  return k.group(
    k.box(W, H, 0.02, inner, [0, 0, 0]),                    // back panel
    letter,
    k.box(W, H, 0.02, paper, [0, 0, 0.05]),                 // front panel
    flap,
  );
}

/** fad-envelope — the duotone envelope, the one on the Contact panel. */
export function envelope(k) { return k.group(envelopeBody(k)); }

/** fas-envelope — solid: one colour throughout, heavier. */
export function envelopeSolid(k) {
  return k.group(envelopeBody(k, { paper: k.c.base, flap: k.c.dark, inner: k.c.deep }));
}

/** fal-envelope — light: pale, thin, the flap barely a shade off the front. */
export function envelopeLight(k) {
  const g = envelopeBody(k, { paper: k.c.pale, flap: k.c.lit, inner: k.c.base });
  g.scale.setScalar(0.96);
  return k.group(g);
}

/* -------------------------------------------------------------------------- */
/* Signs                                                                       */
/* -------------------------------------------------------------------------- */

/** A disc with a rim — the body of check-circle and arrow-circle-up. */
function medallion(k, faceColour) {
  return [
    k.tube(0.42, 0.13, k.mat(k.c.base, { shine: 60 }), [0, 0, 0], [Math.PI / 2, 0, 0], 30),
    k.disc(0.36, k.matte(faceColour || k.c.deep), [0, 0, 0.066]),
    k.ring(0.38, 0.03, k.gloss(k.c.lit), [0, 0, 0.062], [0, 0, 0], 30),
  ];
}

/** fad-check-circle — a tick struck into a disc. */
export function checkCircle(k) {
  return k.group(
    medallion(k),
    k.slab(checkOutline(k.THREE, 0.09), 0.09, k.gloss(k.c.paper, { shine: 90 }),
      [0, 0.01, 0.08], null, { bevel: 0.016 }),
  );
}

/** fal-arrow-circle-up — an arrow raised off a disc. */
export function arrowCircleUp(k) {
  return k.group(
    medallion(k, k.c.dark),
    k.slab(arrowOutline(k.THREE), 0.1, k.gloss(k.c.paper, { shine: 90 }),
      [0, 0, 0.08], null, { bevel: 0.018 }),
  );
}

/**
 * fad-times-octagon — a stop sign: an eight-sided prism with a cross cut into
 * the face.
 *
 * The cross is sunk, not raised — this is the one sign in the set that means
 * "no", and a recess reads as something taken away where a relief reads as
 * something added.
 */
export function timesOctagon(k) {
  const face = polygon(k.THREE, 8, 0.46, Math.PI / 8);
  return k.group(
    k.slab(face, 0.17, k.mat(k.c.base, { shine: 50 }), [0, 0, 0], null,
      { bevel: 0.03, bevelSegments: 2, curves: 1 }),
    k.slab(polygon(k.THREE, 8, 0.36, Math.PI / 8), 0.02, k.matte(k.c.dark),
      [0, 0, 0.09], null, { bevel: 0.008, curves: 1 }),
    /* Raised and PALE, not sunk and dark.
     *
     * A recess reads as "taken away", which is the right idea for a stop sign
     * — and at eighteen pixels it is also invisible, because a recess is read
     * from the shadow in it and there is not enough of it to cast one. The
     * first pass did exactly that and the icon rendered as a plain octagon.
     * So the cross stands off the face in the light tone, where its bevel
     * catches the key and its own shadow falls across the plate below it. */
    k.slab(crossOutline(k.THREE, 0.2, 0.065), 0.08, k.gloss(k.c.paper, { shine: 90 }),
      [0, 0, 0.12], null, { bevel: 0.016 }),
  );
}

/**
 * fas-exclamation-triangle — a warning sign: a rounded triangular prism with
 * the bar and the dot standing off its face.
 *
 * Raised rather than sunk, because this one is meant to catch the eye, and a
 * relief lit from the upper left throws its own shadow down the face.
 */
export function warningTriangle(k) {
  const THREE = k.THREE;
  const r = 0.09;
  const s = new THREE.Shape();
  // A triangle with its corners rounded: three arcs joined by three lines.
  const pts = [[0, 0.5], [0.5, -0.4], [-0.5, -0.4]];
  const round = (a, b, c) => {
    const to = (p, q, d) => {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy);
      return [p[0] + (dx / len) * d, p[1] + (dy / len) * d];
    };
    const from = to(b, a, r);
    const into = to(b, c, r);
    s.lineTo(from[0], from[1]);
    s.quadraticCurveTo(b[0], b[1], into[0], into[1]);
  };
  const start = [(pts[2][0] + pts[0][0]) / 2, (pts[2][1] + pts[0][1]) / 2];
  s.moveTo(start[0], start[1]);
  round(pts[2], pts[0], pts[1]);
  round(pts[0], pts[1], pts[2]);
  round(pts[1], pts[2], pts[0]);
  s.closePath();

  return k.group(
    k.slab(s, 0.16, k.mat(k.c.gold, { shine: 60 }), [0, 0.02, 0], null,
      { bevel: 0.028, bevelSegments: 2 }),
    k.slab(s, 0.02, k.matte(k.c.base), [0, 0.02, 0.085], [0, 0, 0], { bevel: 0.01 }),
    k.box(0.09, 0.3, 0.07, k.gloss(k.c.deep), [0, 0.09, 0.1]),
    k.box(0.09, 0.09, 0.07, k.gloss(k.c.deep), [0, -0.13, 0.1]),
  );
}

/**
 * fal-copyright — a C set into a disc.
 *
 * The C is an arc of real tube with square-cut ends, sunk into the face. There
 * is a much larger and more careful copyright mark in the footer
 * (assets/js/modules/copyright3d.js); this is the icon-sized relative of it,
 * built to the same idea at a twentieth of the geometry.
 */
export function copyright(k) {
  return k.group(
    k.tube(0.44, 0.12, k.mat(k.c.base, { shine: 70 }), [0, 0, 0], [Math.PI / 2, 0, 0], 30),
    k.disc(0.38, k.matte(k.c.deep), [0, 0, 0.061]),
    k.ring(0.4, 0.028, k.gloss(k.c.lit), [0, 0, 0.058], [0, 0, 0], 30),
    k.arc(0.22, 0.055, Math.PI * 1.45, k.gloss(k.c.paper, { shine: 110 }),
      [0, 0, 0.07], [0, 0, Math.PI * 0.27], 22),
  );
}

/* -------------------------------------------------------------------------- */
/* The theme switch                                                            */
/* -------------------------------------------------------------------------- */

/**
 * THE THREE OBJECTS IN THE TOP BAR
 * --------------------------------
 * These three are not like the other sixty-six, and they are allowed not to be.
 *
 * Everywhere else on the site an icon is a label: it sits in front of a heading
 * and says "publication" or "building" or "award", and the right amount of
 * motion is the amount you do not notice. The theme switch is different. It is
 * the one control on the page whose whole subject is *light* — and it is three
 * buttons that are otherwise indistinguishable, in the corner, on every page.
 * So these are drawn as the things themselves: a star with its surface
 * photographed, a moon that goes through its phases, and a body that is half of
 * each. It is the one place in this set where looking at the icon is the point.
 *
 * WHAT THEY SHARE
 * ---------------
 * A sphere, and the vertical axis. All three are balls, all three are drawn at
 * the same radius, and all three turn — or are lit — about the same axis, so
 * the row reads as three views of one idea rather than three unrelated pictures.
 */

/**
 * The photographed surface of the sun.
 *
 * Resolved against this module's own URL rather than written as a path from the
 * site root, because the same model is drawn by tools/preview-icons3d.html,
 * which is one directory down. A root-relative path works on the site and 404s
 * in the workbench; this works in both, and would go on working if the pages
 * ever moved into a subfolder.
 *
 * The image is a 512 × 256 crop of an SDO photograph of the photosphere,
 * mirrored about its own right-hand edge so that it tiles horizontally without
 * a seam — which is what lets the sphere turn continuously. 33 KB.
 */
const SUN_SURFACE = new URL('../../../../img/texture/sun-surface.jpg', import.meta.url).href;

/** The radius all three of the theme-switch bodies are drawn at. */
const BODY = 0.33;

/**
 * Craters, as floor-and-rim laid ON the surface rather than dug into it.
 *
 * A crater modelled as a dent is a sphere subtracted from a sphere, which is
 * either a CSG operation this layer has no business doing at eighteen pixels or
 * a second ball poking through the first. So each one is two flat pieces sitting
 * a thousandth of a unit proud of the surface: a darker floor, and a raised ring
 * around it. THE RING IS THE WHOLE THING. A disc on its own is a grey spot —
 * polka dots on a billiard ball — because what says "crater" is not the shadow
 * in the middle, it is the lit rim on one side of it and the shadow the rim
 * casts on the other, and a torus under a fixed key light gives both for free.
 *
 * Done this way, rather than by darkening the texture, because the pieces sit
 * *underneath* the moon's shadow shell — so the phase covers them exactly as it
 * covers the rest of the face.
 *
 * @param {object} k
 * @param {number} r      the body's radius
 * @param {object} floor  the material inside the crater
 * @param {object} rim    the material of the wall around it
 * @param {Array}  spots  `[[longitude, latitude, size], …]`, radians
 */
function craters(k, r, floor, rim, spots) {
  const V = k.THREE.Vector3;
  return spots.map(([lon, lat, size]) => {
    const ring = Math.cos(lat);
    const at = new V(Math.sin(lon) * ring, Math.sin(lat), Math.cos(lon) * ring)
      .multiplyScalar(r * 1.004);
    const out = at.clone().multiplyScalar(2);

    const dish = k.disc(size, floor, [at.x, at.y, at.z], null, 12);
    const wall = k.ring(size, size * 0.2, rim, [at.x, at.y, at.z], null, 14);
    // A CircleGeometry and a TorusGeometry both lie in their own xy plane and
    // face +z; pointing each at a spot twice as far out along its own radius is
    // what lays it flat on the surface, facing away.
    dish.lookAt(out);
    wall.lookAt(out);
    return [dish, wall];
  });
}

/** The moon's face, and the marks on it. Shared by the moon and the half-body. */
function moonFace(k, r) {
  const rock = k.mat(k.c.pale, { shine: 22, specular: 0.26, emissive: 0.3 });
  const floor = k.matte(k.shade(k.c.pale, -0.1, 0.9));
  const rim = k.mat(k.shade(k.c.pale, 0.05, 0.8), { shine: 30, specular: 0.2 });
  return k.group(
    k.ball(r, rock, [0, 0, 0], 26),
    craters(k, r, floor, rim, [
      [0.35, 0.42, 0.072],
      [-0.5, 0.05, 0.052],
      [0.15, -0.38, 0.046],
      [0.95, -0.1, 0.034],
    ]),
  );
}

/**
 * fad-sun — the sun: the real one, photographed, turning, throwing flares.
 *
 * WHY A PHOTOGRAPH AND NOT A MODEL
 * --------------------------------
 * Everything else in this set is built from primitives, and that is right for
 * everything else: a book has an edge and a spine and a ribbon, and modelling
 * them is how it comes out reading as a book. The sun has no parts. What it has
 * is a *surface* — granulation, filaments, active regions — and no arrangement
 * of cones and spheres produces that. A photograph does, in 33 KB, and at this
 * size it is the only thing that does.
 *
 * The map is used as both the diffuse and the emissive map, which is what makes
 * it read as a body that is lit from inside. The key light still lands on it —
 * that is what keeps it a sphere rather than a disc with a picture on it — but
 * it is a fifth of the brightness, not all of it.
 *
 * THE FLARES
 * ----------
 * Seven of them, each one a tapered tongue standing off the limb. They are what
 * `bleed: 2` in the registry exists for: the canvas under this icon is twice the
 * icon's box in each direction, so a flare thrown at full length ends up well
 * outside the button it belongs to and over whatever is next to it. A fire that
 * stops at the edge of its box is a picture of a fire.
 *
 * Their directions are picked afresh every cycle and they are not the same
 * direction twice in a row — but they are picked by a hash of the cycle number,
 * not by `Math.random()`. Everything else in this layer is reproducible frame
 * for frame (see `phase` in index.js §5), and a screenshot of the top bar taken
 * twice at the same moment should be the same picture twice.
 */
export function sun(k) {
  const surface = k.image(SUN_SURFACE);

  /* `glowMap` as well as `map`: the same photograph lights the body from
     inside. Low shine and a weak specular, because a highlight on a sun is the
     one thing that would say "plastic ball" — the brightness has to come from
     the emission, not from a hotspot. */
  const photosphere = k.ball(BODY, k.mat(k.c.fire, {
    shine: 8,
    specular: 0.05,
    emissive: 0.86,
    map: surface,
    glowMap: surface,
  }), [0, 0, 0], 28);
  photosphere.name = 'photosphere';

  /* A thin, slightly larger shell in the flame colour: the chromosphere. It is
     what gives the limb a hot rim against a dark bar, and it is what the icon
     falls back to looking like in the fraction of a second before the
     photograph has decoded. */
  const haze = k.mat(k.c.flame, { shine: 4, specular: 0.02, emissive: 1, opacity: 0.35 });
  // It is a veil, not a surface: leaving it out of the depth buffer is what
  // stops it from quietly cutting the feet off the flares that pass through it.
  haze.depthWrite = false;
  const halo = k.ball(BODY * 1.045, haze, [0, 0, 0], 20);

  /**
   * One flare: a tapered tongue whose base sits on the limb and whose tip is
   * thrown outward. It is built pointing straight up, at full length; the
   * motion function turns it to its direction and scales it along its length,
   * so the geometry is made once and the animation is two numbers.
   */
  const FLARES = 7;
  const flares = k.repeat(FLARES, (i) => {
    /* A NEARLY BLACK SURFACE THAT GLOWS, which looks like a mistake and is the
       only way to get fire out of this scene. There is a lot of white light in
       it — ambient plus three directionals, index.js §3 — and any material with
       a bright diffuse colour comes back desaturated toward white: a flame
       built the obvious way, orange surface and orange glow, renders a flat
       khaki, like a paper dart. Taking the diffuse down to almost nothing
       leaves the lights with nothing to wash out, and the emission is then the
       whole of the colour: saturated, and the same saturated in both themes.
       Smooth-shaded and ten-sided, because a faceted cone reads as a spike. */
    const tongue = k.cone(0.075, 0.52, k.mat(k.shade(k.c.fire, -0.45), {
      shine: 4, specular: 0.02, emissive: 1, glow: k.c.fire, opacity: 0.88,
    }), [0, BODY + 0.26, 0], null, 10);
    /* The motion function reads these back. Periods that are not multiples of
       one another, so the seven never come round together and the corona never
       reads as a pulse. */
    tongue.userData.flare = { rate: 0.30 + i * 0.043, offset: i * 0.618, foot: BODY };
    const arm = k.group(tongue);
    arm.name = 'flare';
    return arm;
  });

  const corona = k.group(flares);
  corona.name = 'corona';

  const body = k.group(photosphere, halo);
  body.name = 'sun';

  const model = k.group(body, corona);
  /* Fitted to the photosphere alone. Measuring the whole model would make the
     sun itself smaller by however long the flares happened to be — and they are
     long on purpose. index.js §fitToFrame. */
  model.userData.fitTo = photosphere;
  return model;
}

/**
 * fad-moon-stars — the moon, going round the month.
 *
 * TWENTY-EIGHT DAYS, ONE A SECOND
 * -------------------------------
 * New, waxing crescent, first quarter, gibbous, full, and back again, on a loop
 * that takes about half a minute. It is the slowest thing on this site by a
 * wide margin and that is the intent: it is not an animation you watch, it is a
 * state the icon is in, different every time you come back to the page.
 *
 * HOW THE PHASE IS MADE, WHICH IS NOT HOW IT LOOKS
 * -----------------------------------------------
 * Not by lighting. It cannot be: there is ONE key light, shared by the whole
 * icon set (index.js §3), and it is in a fixed place — so no amount of turning
 * a sphere under it produces a moon that goes dark and comes back.
 *
 * So the dark side is a real object: an opaque HALF-SHELL, a hair larger than
 * the moon, covering exactly the hemisphere that is turned away from the sun.
 * Rotating that shell about the vertical axis is *precisely* the real geometry
 * of a lunar phase — the rim of a half-shell is a great circle, and a great
 * circle seen from outside projects to an ellipse, which is what the terminator
 * on a real moon is. New moon is the shell facing the camera, full moon is it
 * facing away, and every crescent and gibbous in between comes out right
 * without a single line of trigonometry.
 *
 * The shell is dark but NOT black. A pure black new moon in a dark top bar is
 * an empty button for two seconds every half minute, which is a worse thing to
 * be than slightly unfaithful — so it keeps just enough of the icon's own
 * colour to hold a silhouette, and its limb catches the key light.
 */
export function moonStars(k) {
  const THREE = k.THREE;
  const R = BODY * 1.12;

  const face = moonFace(k, R);
  face.name = 'face';

  /* The unlit hemisphere. `phiStart = 0, phiLength = π` is the half of the
     sphere with z ≥ 0 — the half FACING THE CAMERA — so a rotation of zero is
     new moon and π is full, which is what the motion function counts on.
     DoubleSide because at the quarters the shell is edge-on and back-face
     culling would open a seam down the middle of the terminator. */
  const shell = k.put(
    new THREE.SphereGeometry(R * 1.015, 26, 18, 0, Math.PI),
    k.mat(k.tint(0x0a0c11, 0.2), { shine: 26, specular: 0.16, side: THREE.DoubleSide }),
  );
  const shadow = k.group(shell);
  shadow.name = 'shadow';

  const moon = k.group(face, shadow);
  moon.position.set(-0.08, 0.01, 0);
  moon.name = 'moon';

  /* Two stars rather than the flat glyph's three. The moon is a full disc for
     part of every cycle and a third star crowds it — and two is still plainly
     "moon and stars" rather than "moon". */
  const littleStar = (x, y, s) => {
    const m = starMesh(k, {
      outer: 0.11,
      inner: 0.045,
      rise: 0.035,
      material: k.mat(k.c.base, { shine: 80, emissive: 0.45, flat: true }),
    });
    m.position.set(x, y, 0.06);
    m.scale.setScalar(s);
    m.name = 'twinkle';
    return m;
  };

  return k.group(moon, littleStar(0.36, 0.33, 1), littleStar(0.38, -0.25, 0.7));
}

/**
 * fad-adjust — "follow the system": one body, half sun and half moon, turning.
 *
 * The flat glyph is a circle half filled, and the reading of it that is true in
 * three dimensions is not a ball half in shadow — that is a ball, and it is
 * what the sun and the moon beside it already are. It is a ball that is half of
 * EACH: the sun's own photographed surface on one hemisphere, the moon's rock
 * and craters on the other, joined at a bright meridian.
 *
 * Which is exactly what the button means. "Auto" is not a third theme, it is
 * the other two, and which one you get depends on which way the world has
 * turned — so the body turns, steadily, about the vertical axis, and the answer
 * changes with it.
 */
export function adjust(k) {
  const THREE = k.THREE;
  const surface = k.image(SUN_SURFACE);

  const half = (material, phiStart) =>
    k.put(new THREE.SphereGeometry(BODY, 28, 18, phiStart, Math.PI), material);

  /* z ≥ 0 at rest: the sun. Dimmer than the sun icon's own — that one is the
     subject of its button, this one is half of a comparison, and at full
     emission it flares out the moon half beside it. */
  const sunSide = half(k.mat(k.c.fire, {
    shine: 10, specular: 0.06, emissive: 0.7, map: surface, glowMap: surface,
  }), 0);

  /* z ≤ 0: the moon. Its craters sit on the same radius as the sun's surface
     does, a thousandth of a unit proud of the shell — but only at longitudes on
     this side, so none of them ever appears on the sun's face. */
  const moonSide = half(k.mat(k.c.pale, { shine: 26, specular: 0.28, emissive: 0.26 }), Math.PI);
  const moonMarks = craters(
    k,
    BODY,
    k.matte(k.shade(k.c.pale, -0.1, 0.9)),
    k.mat(k.shade(k.c.pale, 0.05, 0.8), { shine: 30, specular: 0.2 }),
    [
      [Math.PI - 0.35, 0.36, 0.058],
      [Math.PI + 0.42, -0.02, 0.046],
      [Math.PI - 0.1, -0.4, 0.036],
    ],
  );

  const body = k.group(
    sunSide,
    moonSide,
    moonMarks,
    /* The meridian, as a thin bright ring on the plane the two halves divide
       on. Without it they meet in a line that antialiases into mush at small
       sizes; with it, the join is a drawn edge that catches the light as it
       comes round. */
    k.ring(BODY * 1.005, 0.009, k.gloss(k.c.base), [0, 0, 0], [0, 0, 0], 30),
  );

  /* On an inner group because the motion function turns the one named 'ball',
     and anything it sets on that node is overwritten on the first frame. */
  const g = k.group(body);
  g.name = 'ball';
  return k.group(g);
}
