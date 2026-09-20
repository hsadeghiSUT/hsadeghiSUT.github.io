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
 * lib.js — the vocabulary every 3D icon is built from.
 *
 * THE UNIT BOX
 * ------------
 * Every model is built inside a box one unit on a side, centred on the origin:
 * x right, y up, z toward the viewer, each running −0.5 … +0.5. The camera
 * frames slightly more than that, so a model may lean and turn without clipping
 * its own corners off.
 *
 * This is the one convention that makes the collection work as a set. Sixty-odd
 * models drawn to sixty-odd scales would each need their own camera, and the
 * building beside the book would be whatever size its author felt like. One box
 * means a section heading's icon is the same visual weight whichever icon it is.
 *
 * MATERIALS
 * ---------
 * Phong, not Standard. Standard is physically based and wants an environment
 * map to look like anything; without one, metal renders black. These objects are
 * eighteen pixels across on a page that has no environment map to give them, and
 * Phong's specular highlight is exactly the cue that reads as "this is round" at
 * that size. It is also about half the shader.
 *
 * COLOUR
 * ------
 * Almost everything is built from the icon's own `currentColor` — the colour the
 * flat icon had, which is already the right colour for that place on that page
 * in that theme. `shade()` walks it lighter or darker in HSL, so one token gives
 * a whole material family that stays in key when the theme flips.
 *
 * Real-world colour is used only where the object genuinely has one and losing
 * it would lose the object: the earth's oceans, gold on a crown, paper in a
 * book, sand in an hourglass. Those are tinted toward the icon's colour rather
 * than dropped in at full strength, so a cyan page stays a cyan page.
 *
 * PHOTOGRAPHS
 * -----------
 * One model uses one, and the bar for a second is high. `k.image()` loads a
 * texture, shares it between every model that asks and nudges the renderer when
 * it decodes. The sun on the theme switch is the case that earns it: a sun has
 * no *parts*, only a surface, and there is no arrangement of cones and spheres
 * that produces granulation. Everything with an edge, a spine or a hinge is
 * still built out of the primitives below, because those are the things that
 * survive being turned forty degrees.
 */

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Move a colour along the lightness and saturation axes.
 *
 * @param {object} THREE
 * @param {number|string|object} color   anything THREE.Color takes
 * @param {number} lightness  added to HSL lightness, −1 … +1
 * @param {number} [saturation]  multiplied into HSL saturation
 * @returns {object} a new THREE.Color
 */
export function shade(THREE, color, lightness, saturation = 1) {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  // A colour with no saturation has no hue to preserve, so lifting it stays
  // grey rather than drifting toward red — which is what clamping h would do.
  return c.setHSL(
    hsl.h,
    Math.min(1, Math.max(0, hsl.s * saturation)),
    Math.min(1, Math.max(0, hsl.l + lightness)),
  );
}

/**
 * Pull a real-world colour toward the icon's own, so the set stays in key.
 *
 * `amount` is how much of the icon's colour to mix in. At 0 the object keeps
 * its true colour; at 1 it is the icon colour and nothing else. The values used
 * across the models sit around 0.25 — enough that gold on a cyan page reads as
 * this site's gold, not enough that it stops reading as gold.
 */
export function tint(THREE, real, base, amount = 0.25) {
  return new THREE.Color(real).lerp(new THREE.Color(base), amount);
}

/* -------------------------------------------------------------------------- */
/* Materials                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The ordinary surface: a solid with a soft highlight.
 *
 * @param {object} THREE
 * @param {*} color
 * @param {object} [opts]
 * @param {number} [opts.shine]     specular exponent; higher is a tighter hotspot
 * @param {number} [opts.specular]  lightness of the highlight, 0 … 1
 * @param {number} [opts.emissive]  self-lit fraction, for things that glow
 * @param {boolean} [opts.flat]     facet shading, for gems and low-poly forms
 * @param {*} [opts.glow]           the self-lit colour, when it is not simply a
 *                                  darker copy of the surface — flame is the
 *                                  case: a tongue of fire is a dull ochre where
 *                                  the light lands on it and blazing yellow
 *                                  where it is lighting itself, and taking the
 *                                  emission from the surface colour is what
 *                                  makes an otherwise correct flame look like
 *                                  painted cardboard
 * @param {object} [opts.map]       a texture for the surface colour
 * @param {object} [opts.glowMap]   a texture for the self-lit part — see below
 */
export function mat(THREE, color, opts = {}) {
  const {
    shine = 34, specular = 0.22, emissive = 0, flat = false, opacity = 1, side,
  } = opts;
  const m = new THREE.MeshPhongMaterial({
    color: new THREE.Color(color),
    specular: new THREE.Color(specular, specular, specular),
    shininess: shine,
    flatShading: flat,
    transparent: opacity < 1,
    opacity,
  });
  if (emissive) m.emissive = shade(THREE, color, -0.15).multiplyScalar(emissive);
  if (opts.glow) m.emissive = new THREE.Color(opts.glow).multiplyScalar(emissive || 1);
  if (opts.map) m.map = opts.map;
  if (opts.glowMap) {
    /* With an emissive MAP the emissive COLOUR is a multiplier over it, so it
       has to stay neutral: tinting it the way the line above does would run the
       icon's colour through the photograph twice and turn a sun cyan. */
    m.emissiveMap = opts.glowMap;
    m.emissive = new THREE.Color(1, 1, 1).multiplyScalar(emissive || 1);
  }
  if (side) m.side = side;
  return m;
}

/** A polished surface — metal, glaze, a gem's facet. */
export function gloss(THREE, color, opts = {}) {
  return mat(THREE, color, { shine: 110, specular: 0.7, ...opts });
}

/** A matte surface — paper, cloth, stone, soil. */
export function matte(THREE, color, opts = {}) {
  return mat(THREE, color, { shine: 6, specular: 0.05, ...opts });
}

/** Glass: a lens, a screen, the front of a watch. */
export function glass(THREE, color, opacity = 0.38) {
  return mat(THREE, color, { shine: 150, specular: 0.9, opacity, side: THREE.DoubleSide });
}

/* -------------------------------------------------------------------------- */
/* Photographs                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Every image any model has asked for, keyed by URL.
 *
 * MODULE-LEVEL AND NEVER DISPOSED, ON PURPOSE. A model is rebuilt from scratch
 * every time the theme changes (`repalette()` in index.js) because the colours
 * are baked into the materials — but the photograph is not a colour, and
 * re-decoding a JPEG on every click of the theme switch would be the one
 * genuinely expensive thing this layer does. `Material.dispose()` does not touch
 * the textures hung off it, so the cache survives the rebuild intact.
 *
 * There is exactly one image in it today: the sun's surface.
 */
const IMAGES = new Map();

/**
 * Load an image as a texture, and say when it has arrived.
 *
 * A texture comes back *immediately* and fills in later — three.js hands you the
 * object and paints it once the bytes land. That is the right shape here: the
 * model is built synchronously, draws in its flat colour for a frame or two, and
 * then the photograph appears. What it needs is a nudge to redraw at that
 * moment, because the animation loop may well have gone to sleep by then; that
 * is what `onReady` is for, and `kit()` wires it to the renderer's `wake()`.
 *
 * @param {object} THREE
 * @param {string} url        absolute, or resolved against a module's own URL
 * @param {Function} [onReady] called once, after the image is decoded
 */
export function image(THREE, url, onReady) {
  let record = IMAGES.get(url);

  if (!record) {
    record = { texture: null, settled: false, waiting: [] };
    IMAGES.set(url, record);

    const settle = () => {
      record.settled = true;
      const queue = record.waiting;
      record.waiting = [];
      for (const fn of queue) {
        // One listener that throws must not swallow the others, and must not
        // take the load callback down with it.
        try { fn(); } catch { /* nothing to do about it here */ }
      }
    };

    record.texture = new THREE.TextureLoader().load(url, settle, undefined, settle);
    // Horizontal repeat is what lets a sphere turn about its axis without the
    // seam catching; vertical is clamped, because the poles are not a loop.
    record.texture.wrapS = THREE.RepeatWrapping;
    record.texture.wrapT = THREE.ClampToEdgeWrapping;
    record.texture.colorSpace = THREE.SRGBColorSpace;
    record.texture.anisotropy = 2;
  }

  if (onReady) {
    if (record.settled) onReady();
    else record.waiting.push(onReady);
  }
  return record.texture;
}

/* -------------------------------------------------------------------------- */
/* Primitives, positioned                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Build a mesh and place it in one call: `put(geometry, material, [x,y,z],
 * [rx,ry,rz], scale)`.
 *
 * Reads as a list of objects with positions rather than as forty lines of
 * `mesh.position.set(…)`, which matters when a model is eleven parts. Curried
 * over THREE rather than importing it, so nothing in `models/` has to.
 */
function makePut(THREE) {
  return function place(geometry, material, at, rot, scale = null) {
    const mesh = new THREE.Mesh(geometry, material);
    /* `|| []` rather than a default parameter, because a default only fills in
       for `undefined` and the models pass an explicit `null` whenever they want
       to skip a position or a rotation and give a segment count after it —
       `k.tube(r, h, m, [x, y, z], null, 12)`. */
    const p = at || [];
    const r = rot || [];
    mesh.position.set(p[0] || 0, p[1] || 0, p[2] || 0);
    mesh.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0);
    if (scale) {
      if (typeof scale === 'number') mesh.scale.setScalar(scale);
      else mesh.scale.set(scale[0], scale[1], scale[2]);
    }
    return mesh;
  };
}

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

/** A rectangle with rounded corners, as a THREE.Shape centred on the origin. */
export function roundedRect(THREE, w, h, r) {
  const x = w / 2;
  const y = h / 2;
  const k = Math.min(r, x, y);
  const s = new THREE.Shape();
  s.moveTo(-x + k, -y);
  s.lineTo(x - k, -y);
  s.quadraticCurveTo(x, -y, x, -y + k);
  s.lineTo(x, y - k);
  s.quadraticCurveTo(x, y, x - k, y);
  s.lineTo(-x + k, y);
  s.quadraticCurveTo(-x, y, -x, y - k);
  s.lineTo(-x, -y + k);
  s.quadraticCurveTo(-x, -y, -x + k, -y);
  return s;
}

/** A regular star, points up, as a THREE.Shape. */
export function starOutline(THREE, points, outer, inner) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 ? inner : outer;
    // −π/2 puts a point at the top, which is the only orientation a star reads
    // in; the half-step keeps the two bottom points level with each other.
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

/** A regular polygon, flat-topped or point-topped, as a THREE.Shape. */
export function polygon(THREE, sides, radius, rotate = 0) {
  const s = new THREE.Shape();
  for (let i = 0; i < sides; i += 1) {
    const a = (i * 2 * Math.PI) / sides + rotate;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

/** A tick, as a THREE.Shape — two strokes meeting at a heel. */
export function checkOutline(THREE, t = 0.075) {
  const s = new THREE.Shape();
  s.moveTo(-0.22, 0.02);
  s.lineTo(-0.09, -0.12);
  s.lineTo(0.22, 0.20);
  s.lineTo(0.22 - t * 0.7, 0.20 + t);
  s.lineTo(-0.09, -0.12 + t * 1.45);
  s.lineTo(-0.22 + t * 1.1, 0.02 + t);
  s.closePath();
  return s;
}

/** A cross / times, as a THREE.Shape. */
export function crossOutline(THREE, arm = 0.2, t = 0.062) {
  const s = new THREE.Shape();
  const pts = [
    [-arm, -arm + t], [-arm + t, -arm], [0, -t], [arm - t, -arm], [arm, -arm + t],
    [t, 0], [arm, arm - t], [arm - t, arm], [0, t], [-arm + t, arm], [-arm, arm - t], [-t, 0],
  ];
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

/** An arrow pointing up, as a THREE.Shape: a head over a shaft. */
export function arrowOutline(THREE, head = 0.19, shaft = 0.072, len = 0.34) {
  const s = new THREE.Shape();
  s.moveTo(0, len / 2 + 0.03);
  s.lineTo(-head, len / 2 - head + 0.03);
  s.lineTo(-shaft, len / 2 - head + 0.03);
  s.lineTo(-shaft, -len / 2);
  s.lineTo(shaft, -len / 2);
  s.lineTo(shaft, len / 2 - head + 0.03);
  s.lineTo(head, len / 2 - head + 0.03);
  s.closePath();
  return s;
}

/* -------------------------------------------------------------------------- */
/* The kit                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Bind every helper to one THREE namespace and one colour palette.
 *
 * A model builder is called as `build(kit)` and reaches for `k.box`, `k.tube`,
 * `k.c.base` and so on. Nothing in `models/` imports THREE, touches the DOM or
 * knows what a renderer is — which is what keeps sixty-eight model files
 * readable as drawings rather than as graphics programming.
 *
 * @param {object} THREE
 * @param {object} colors  `{ base, ink }` — the icon's own colour, and the
 *                         page's text colour, for the few parts that should
 *                         read as ink rather than as the icon's tint
 * @param {object} [hooks] `{ repaint }` — called by `k.image` when a photograph
 *                         finishes decoding, so the icon is redrawn with it even
 *                         if the animation loop has already gone to sleep
 * @returns {object} the kit
 */
export function kit(THREE, colors, hooks = {}) {
  const place = makePut(THREE);
  const base = new THREE.Color(colors.base);

  /* A family of five tones off the icon's own colour. Every model that does not
     need a real-world colour is built from these, which is why a page full of
     different objects still looks like one set of objects. */
  const c = {
    base,
    lit: shade(THREE, base, 0.16),
    pale: shade(THREE, base, 0.3, 0.6),
    dark: shade(THREE, base, -0.13),
    deep: shade(THREE, base, -0.24, 1.1),
    ink: new THREE.Color(colors.ink || 0x2b3444),
    // Paper, wood, gold, glass and earth: the five real materials the set needs.
    paper: tint(THREE, 0xf6f4ee, base, 0.16),
    wood: tint(THREE, 0xb07a44, base, 0.22),
    gold: tint(THREE, 0xe8b44a, base, 0.18),
    sand: tint(THREE, 0xe4c98a, base, 0.2),
    leaf: tint(THREE, 0x4f9d55, base, 0.22),
    ocean: tint(THREE, 0x2a6cb5, base, 0.3),
    skin: tint(THREE, 0xe0b08a, base, 0.25),
    slate: tint(THREE, 0x2f3a46, base, 0.16),
    // Fire, for the one object in the set that is on fire. Tinted far less than
    // the rest — a sun that has been pulled a quarter of the way toward a cyan
    // page is not a sun, it is a tennis ball.
    fire: tint(THREE, 0xff6a15, base, 0.08),
    flame: tint(THREE, 0xffc23c, base, 0.06),
  };

  return {
    THREE,
    c,
    put: place,
    /* `flat(Infinity)`, not `flat()`. A model reaches for `k.repeat` inside
       `k.repeat` — five floors of four windows, three sawteeth each with a
       glazed face — and each nesting is another level of array. Flattening one
       level would hand THREE an array where it wants an Object3D, which it
       reports and then ignores, leaving a building with no windows. */
    group: (...children) => {
      const g = new THREE.Group();
      for (const child of children.flat(Infinity)) if (child) g.add(child);
      return g;
    },

    /* ---- materials ---- */
    mat: (color, o) => mat(THREE, color, o),
    gloss: (color, o) => gloss(THREE, color, o),
    matte: (color, o) => matte(THREE, color, o),
    glass: (color, o) => glass(THREE, color, o),
    shade: (color, l, s) => shade(THREE, color, l, s),
    /** A real-world colour, pulled `amount` of the way toward the icon's own. */
    tint: (real, amount) => tint(THREE, real, base, amount),

    /* ---- photographs ---- */
    image: (url) => image(THREE, url, hooks.repaint),

    /* ---- solids ----
       Segment counts are deliberately low. These are rendered into a box about
       forty device pixels across, where the difference between 16 and 48
       segments on a sphere is nothing you can see and everything the GPU has to
       transform, on up to thirty objects, sixty times a second. */
    box: (w, h, d, m, at, rot) => place(new THREE.BoxGeometry(w, h, d), m, at, rot),
    ball: (r, m, at, seg = 18) =>
      place(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), m, at),
    halfBall: (r, m, at, rot, seg = 18) =>
      place(new THREE.SphereGeometry(r, seg, seg / 2, 0, Math.PI * 2, 0, Math.PI / 2), m, at, rot),
    tube: (r, h, m, at, rot, seg = 18) =>
      place(new THREE.CylinderGeometry(r, r, h, seg), m, at, rot),
    cone: (r, h, m, at, rot, seg = 16) =>
      place(new THREE.CylinderGeometry(0, r, h, seg), m, at, rot),
    taper: (rTop, rBottom, h, m, at, rot, seg = 16) =>
      place(new THREE.CylinderGeometry(rTop, rBottom, h, seg), m, at, rot),
    ring: (r, tubeR, m, at, rot, seg = 24) =>
      place(new THREE.TorusGeometry(r, tubeR, 8, seg), m, at, rot),
    arc: (r, tubeR, sweep, m, at, rot, seg = 20) =>
      place(new THREE.TorusGeometry(r, tubeR, 8, seg, sweep), m, at, rot),
    disc: (r, m, at, rot, seg = 24) =>
      place(new THREE.CircleGeometry(r, seg), m, at, rot),
    capsule: (r, len, m, at, rot) =>
      place(new THREE.CapsuleGeometry(r, len, 4, 12), m, at, rot),
    plate: (w, h, m, at, rot) => place(new THREE.PlaneGeometry(w, h), m, at, rot),

    /**
     * Extrude a shape into a slab with a small bevel.
     *
     * The bevel is what separates these from the drop-shadow trick the flat
     * icons use: a bevelled edge catches the key light along its chamfer, which
     * is the highlight that says "this has a thickness" rather than "this has a
     * shadow behind it".
     */
    slab: (shape, depth, m, at, rot, opts = {}) => {
      const bevel = opts.bevel === undefined ? Math.min(0.018, depth * 0.35) : opts.bevel;
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        curveSegments: opts.curves || 8,
        bevelEnabled: bevel > 0,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: opts.bevelSegments || 2,
      });
      // ExtrudeGeometry builds from z = 0 forward; centring it means a model can
      // place a slab by its middle like every other primitive here.
      geometry.translate(0, 0, -depth / 2);
      return place(geometry, m, at, rot);
    },

    /**
     * Spin a profile about the y axis.
     *
     * `profile` is [[x, y], …] read bottom to top, x being the radius. This is
     * how every bottle, bell, pin, nib and hourglass in the set is made, and it
     * is the reason none of them is an extruded silhouette.
     */
    lathe: (profile, m, at, rot, seg = 20) => {
      const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
      return place(new THREE.LatheGeometry(pts, seg), m, at, rot);
    },

    /** A quick row or grid of one small part — windows, pages, teeth, studs. */
    repeat: (n, fn) => Array.from({ length: n }, (_, i) => fn(i, n <= 1 ? 0 : i / (n - 1))),
  };
}
