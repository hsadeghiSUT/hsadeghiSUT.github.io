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
 * copyright3d.js — the copyright mark in the footer, with a sword through it.
 *
 * WHAT IT IS
 * ----------
 * A cyan copyright mark — a ring with a C inside it — with a silver sword
 * driven through its plane at forty-five degrees. Mark and sword turn together
 * about the vertical axis. Every half turn a bead gathers at the sword's point,
 * swells, lets go, and falls the whole way to the bottom of the SCREEN, where a
 * shallow pool of it trembles and glows. About five fill the pool; every one
 * after that lands, throws a wave along the surface and dissolves into it
 * without adding to the volume.
 *
 * HOW THE MARK IS BUILT
 * ---------------------
 * Not from a font. A glyph would have to be loaded, and its shape would then
 * depend on which font happened to answer — the one thing a mark cannot afford.
 * The ring is a torus, because in the reference it is round and a torus is
 * round. The C is not: it is a RIBBON — an arc with a four-point diamond
 * section carried along it, whose width swells at the shoulders and thins at
 * the top and bottom, and whose terminals are cut off flat at an angle. It used
 * to be a second torus with a piece missing and that is exactly what it looked
 * like: a broken ring inside a whole one, a mark with no letter in it.
 *
 * The blade is built by the same function, for the same reason: a diamond
 * section has two flat faces meeting along a crest, and with `flatShading` that
 * crest is a hard edge which catches a line of light. It is what a letter cut
 * in metal looks like and what a blade looks like, and it is what neither a
 * tube nor an extruded slab can be made to look like.
 *
 * WHY THE SWORD TURNS WITH IT
 * ---------------------------
 * It used to stand still while the mark turned around it, on the theory that a
 * sword that moved would read as a decal on a spinning disc. In practice the
 * opposite happened: a fixed sword and a turning ring read as two unrelated
 * things that happen to overlap. Driven through the plane and carried round
 * with it, they read as one object — which is what a sword through a mark is.
 *
 * WHY FORTY-FIVE DEGREES IS SET AS A DIRECTION, NOT AS A ROTATION
 * ---------------------------------------------------------------
 * "Through the plane at forty-five degrees" is a statement about the angle
 * between the blade and the plane of the mark, and Euler angles do not give you
 * that: two rotations of forty-five degrees compose into an angle that is not
 * forty-five. So the blade's direction is written down as a vector — half in
 * the plane, half out of it, which is exactly forty-five degrees from it — and
 * the sword is turned to point along it with `setFromUnitVectors`. The number
 * in the code is then the number on the screen.
 *
 * WHY THE FRAME IS FITTED TO THE SWEPT SHAPE
 * ------------------------------------------
 * Because of the line above. The camera used to be set to a distance that
 * framed the MARK, and the mark is a disc a millimetre thick — but the sword is
 * at forty-five degrees to that disc, so a quarter turn later the part of it
 * that was pointing at the viewer is pointing sideways instead, and the hilt
 * was outside the canvas. There was never a box around the mark; there was a
 * frame measured against one pose out of all of them. It is now measured
 * against the whole sweep — see `reach` and `rise` below.
 *
 * WHY THE DEW IS NOT IN THE 3D SCENE
 * ----------------------------------
 * Because it has to leave. The mark's canvas is about forty pixels across, and
 * anything drawn in it is cut off at that boundary — which is what "there seems
 * to be an invisible box around the logo" was: the bead was being clipped by
 * its own frame while it grew, and there was nowhere for it to fall to.
 *
 * So the bead's whole life happens on a second canvas: a fixed, transparent,
 * click-through 2D overlay pinned to the bottom of the viewport. Each frame the
 * sword's point is projected out of the 3D scene into page coordinates and the
 * bead is drawn there. It gathers at the point, falls under gravity, and lands
 * on the bottom line of the screen — because on that canvas the bottom line of
 * the screen is a real place, and in the footer canvas it was not.
 *
 * THE POOL
 * --------
 * A surface curve rather than a rectangle: a few sines of different periods
 * summed for the tremble, plus a travelling, decaying wave launched at the exact
 * x of every landing. It is filled with a vertical gradient and finished with a
 * bright rim along the top — the specular line that makes a liquid read as a
 * liquid and not as a coloured strip. The depth rises with each of the first
 * five landings and then stops: after that a landing is all wave and no volume,
 * which is the difference between joining a pool and pouring into a glass.
 *
 * COST
 * ----
 * Both canvases run only while the mark is on screen, the tab is visible and
 * the page has finished drawing its content (`hs:page-ready` — see `settled`
 * below, and README §16c.1).  The footer is below everything, so on most visits
 * neither ever runs.
 */

import { loadThree } from './fx/three.js';

/** Seconds for one full turn of the mark. */
const TURN_SECONDS = 10;

/** Seconds the bead spends swelling at the point before it lets go. */
const GATHER_SECONDS = 1.6;

/** How many landings it takes to fill the pool. */
const POOL_FULL = 5;

/** How deep the full pool is, in CSS pixels. */
const POOL_DEPTH = 7;

/** How wide the pool is when it is empty, and how much each landing adds. */
const POOL_WIDTH = 64;
const POOL_SPREAD = 27;

/** How far up the viewport the overlay reaches. Drops never start above this. */
const OVERLAY_VH = 0.9;

/** The bead, and the pool. Crimson, because it is coming off a blade. */
const DEW = { r: 196, g: 22, b: 44 };
const DEW_LIT = { r: 255, g: 138, b: 150 };

/** Read a CSS custom property off <html>. */
function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

const rgba = (c, a) => `rgba(${c.r},${c.g},${c.b},${a})`;

/** The same crimson, scaled toward black — the pool's own depth. */
const shade = (c, k, a) =>
  `rgba(${Math.round(c.r * k)},${Math.round(c.g * k * 0.72)},${Math.round(c.b * k * 0.83)},${a})`;

/**
 * Which way round the page is.
 *
 * Mirrors the inline script in every page head: an explicit choice wins, and
 * with no choice the system's preference decides.
 */
function pageIsDark() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'dark') return true;
  if (set === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * How to paint the pool, which is not the same job in the two themes.
 *
 * ON WHITE the body is read by its own darkness: the gradient falls away to
 * near-black crimson at the bottom, the page behind it is bright, and the eye
 * gets depth for free — a shallow dish of something heavy.
 *
 * ON BLACK that same gradient disappears. The bottom of the pool becomes the
 * page, the only thing left with contrast is the bright line along the
 * meniscus, and seven pixels of liquid read as a red line ruled across the
 * footer. So on dark the pool is lit from inside instead: it stays saturated
 * all the way down, never darker than the crimson it is made of, and the glow
 * around it is widened — on a dark page a glow is the cheapest depth there is,
 * where on a light one it would only look like fog.
 */
function poolPaint(dark) {
  return dark
    ? { top: rgba(DEW_LIT, 0.98), mid: rgba(DEW, 0.99), deep: shade(DEW, 0.82, 0.99), glowBlur: 20, glowAlpha: 0.9, rimSoft: 0.45 }
    : { top: rgba(DEW_LIT, 0.92), mid: rgba(DEW, 0.96), deep: shade(DEW, 0.42, 0.98), glowBlur: 10, glowAlpha: 0.8, rimSoft: 0.3 };
}

/* -------------------------------------------------------------------------- */
/* The overlay                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The full-width, bottom-anchored 2D canvas the dew lives on.
 *
 * One per document, shared if the mark were ever mounted twice. It is fixed,
 * transparent and `pointer-events: none`, and it sits below the header so a
 * falling bead never covers a control.
 */
let overlay = null;

function theOverlay() {
  if (overlay) return overlay;

  const canvas = document.createElement('canvas');
  canvas.className = 'dew-layer';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  /* Deliberately not the device pixel ratio. The overlay is most of the height
     of the screen and is cleared every frame; at 3× on a phone that clear alone
     is millions of pixels for a bead four across. One and a half is enough for
     a curve this soft. */
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let width = 0;
  let height = 0;

  function size() {
    width = window.innerWidth;
    height = Math.round(window.innerHeight * OVERLAY_VH);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener('resize', size, { passive: true });

  overlay = {
    canvas, ctx,
    get width() { return width; },
    get height() { return height; },
    /** Page Y of the overlay's own top edge, so a viewport Y can be mapped in. */
    get top() { return window.innerHeight - height; },
    clear() { ctx.clearRect(0, 0, width, height); },
  };
  return overlay;
}

/* -------------------------------------------------------------------------- */

/**
 * @param {HTMLElement} host    the wrapper holding the character and the canvas
 * @param {HTMLCanvasElement} canvas
 */
export async function mountCopyright(host, canvas) {
  const THREE = await loadThree();
  if (!THREE) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('footer mark: no WebGL, keeping the flat one.', err);
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 80);
  camera.position.set(0, 0.15, 9.4);
  camera.lookAt(0, 0, 0);

  const accent = () => new THREE.Color(token('--c-brand', '#22d3ee'));

  /* Everything that turns, turns together. */
  const rig = new THREE.Group();
  scene.add(rig);

  /* ---- one builder, two objects -------------------------------------------
     Both the letter C and the sword's blade are the same kind of thing: a
     RIBBON — a path with a cross-section carried along it, where the width and
     the thickness change from one end to the other.

     Three.js has no primitive for that. `TubeGeometry` follows a path but its
     radius is constant, `LatheGeometry` is a solid of revolution, and an
     extrusion pushes a flat outline straight back and gives a slab. So this is
     written out: sample the path, and at every station emit four points — two
     out to the sides, one forward, one back — then stitch consecutive stations
     into quads and cap both ends.

     Four points, not eight or sixteen, and that is the whole reason it is worth
     doing. A four-point section is a DIAMOND: two flat faces meeting along a
     crest down the middle of the shape and two more meeting along a crest at
     the back. With `flatShading` those crests are hard edges that catch a line
     of light — which is what a letter cut in metal looks like, and what a blade
     looks like, and what neither a tube nor a slab can be made to look like.

     @param {Array} stations  {p, n, b, w, d} — position, in-plane normal,
                              binormal, half-width, half-thickness
     @param {number} shear    slides the end caps' side points along the path,
                              so a terminal is cut at an angle rather than
                              square. A C's terminals are cut at an angle.
     -------------------------------------------------------------------------- */
  function ribbon(stations, shear = 0) {
    const count = stations.length;
    const position = new Float32Array(count * 4 * 3);
    const write = (i, v) => { position[i * 3] = v.x; position[i * 3 + 1] = v.y; position[i * 3 + 2] = v.z; };
    const tmp = new THREE.Vector3();

    for (let s = 0; s < count; s++) {
      const { p, n, b, w, d } = stations[s];
      /* The end caps' side points slide along the path. At the first station
         they slide backwards and at the last forwards, so both terminals lean
         the same way round the letter. */
      let slide = 0;
      if (shear && (s === 0 || s === count - 1)) {
        const next = stations[s === 0 ? 1 : count - 2];
        tmp.copy(next.p).sub(p).normalize();
        slide = s === 0 ? -shear : shear;
        tmp.multiplyScalar(s === 0 ? -slide : slide);
      } else {
        tmp.set(0, 0, 0);
      }
      const base = s * 4;
      write(base + 0, new THREE.Vector3().copy(p).addScaledVector(n, w).add(tmp));
      write(base + 1, new THREE.Vector3().copy(p).addScaledVector(b, d));
      write(base + 2, new THREE.Vector3().copy(p).addScaledVector(n, -w).sub(tmp));
      write(base + 3, new THREE.Vector3().copy(p).addScaledVector(b, -d));
    }

    const index = [];
    for (let s = 0; s < count - 1; s++) {
      const a = s * 4;
      const c = (s + 1) * 4;
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        index.push(a + k, c + k, c + k2, a + k, c + k2, a + k2);
      }
    }
    // The caps: two triangles across the four section points at each end.
    const last = (count - 1) * 4;
    index.push(0, 2, 1, 0, 3, 2);
    index.push(last + 0, last + 1, last + 2, last + 0, last + 2, last + 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    return geometry;
  }

  /* ---- the mark -----------------------------------------------------------
     The ring is a torus. It is round in the reference and a torus is round, and
     clearcoat over the metal gives it the tight travelling highlight that says
     so at this size.

     The C is NOT. It used to be a second torus with an arc missing, and that is
     exactly what it looked like: a broken ring inside a whole one, two circles
     of the same kind, a mark with no letter in it. A letter has things a torus
     cannot have — a stroke that swells at the shoulders and thins at the top
     and bottom, terminals cut off flat at an angle, and a ridge down the middle
     of the stroke where the two cut faces meet. So it is a ribbon: an arc, with
     a diamond section whose width is modulated round the curve.
     -------------------------------------------------------------------------- */
  const markMaterial = new THREE.MeshPhysicalMaterial({
    color: accent(),
    roughness: 0.18,
    metalness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: accent(),
    emissiveIntensity: 0.16,
  });

  /* The letter is faceted and the ring is smooth, and they are different
     materials only so that `flatShading` can differ between them. Everything
     else about them is identical, including the colour they are re-tinted to
     when the theme changes. */
  const letterMaterial = markMaterial.clone();
  letterMaterial.flatShading = true;
  letterMaterial.clearcoat = 0.6;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.21, 20, 84), markMaterial);
  rig.add(ring);

  /* The C, station by station.

     `FROM` and `TO` are where the letter starts and stops, measured the way an
     angle is measured — anticlockwise from three o'clock — so the gap is the
     piece left out around zero, on the right, where a C's aperture belongs.

     The width is `1 - 0.30·|sin θ|`: full at nine o'clock, seven tenths of that
     at twelve and six. That one term is most of the difference between a letter
     and a piece of pipe. */
  {
    const FROM = 0.30 * Math.PI;         //  54°, the upper terminal
    const TO = 1.70 * Math.PI;           // 306°, the lower terminal
    const RADIUS = 0.80;                 // of the stroke's centre line
    const WIDTH = 0.26;                  // half the stroke, at its widest
    const DEPTH = 0.165;                 // half the thickness, front to back
    const STEPS = 40;

    const stations = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const angle = FROM + (TO - FROM) * t;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      stations.push({
        p: new THREE.Vector3(cos * RADIUS, sin * RADIUS, 0),
        n: new THREE.Vector3(cos, sin, 0),
        b: new THREE.Vector3(0, 0, 1),
        w: WIDTH * (1 - 0.30 * Math.abs(sin)),
        /* The thickness follows the width, or the thin parts of the stroke
           would stand as proud of the page as the thick ones and the letter
           would read as a bent strip rather than as something cut. */
        d: DEPTH * (1 - 0.28 * Math.abs(sin)),
      });
    }
    /* The terminals are cut at an angle, outer corner leading. Square-cut ends
       are the giveaway of a shape that was made by removing an arc from a ring
       rather than by drawing a letter. */
    const cee = new THREE.Mesh(ribbon(stations, 0.13), letterMaterial);
    rig.add(cee);
  }

  /* ---- the sword ----------------------------------------------------------
     Silver, and silver without an environment map is a trap: a physically
     metallic surface reflects its surroundings and nothing else, so at
     metalness 1 with no surroundings it renders black. The way to a silver that
     survives both themes is a light base colour at middling metalness with
     enough lights around it to make highlights — which is what the rig below
     is for. */
  const steel = new THREE.MeshStandardMaterial({
    color: 0xdfe6f0,
    roughness: 0.24,
    metalness: 0.62,
    emissive: 0x2a3444,
    emissiveIntensity: 0.35,
    flatShading: true,
  });
  /* The fittings are lighter and less metallic than the blade, not darker. A
     hilt is small, intricate and mostly facing away from the key; at the
     blade's own metalness it went to a dark blob every time the mark turned its
     back on the light, which is most of a turn. */
  const fittings = new THREE.MeshStandardMaterial({
    color: 0xe8edf5,
    roughness: 0.34,
    metalness: 0.45,
    emissive: 0x3b475c,
    emissiveIntensity: 0.5,
    flatShading: true,
  });

  const sword = new THREE.Group();

  /* ---- the blade ----------------------------------------------------------
     A sabre: curved, and the curve is the point. A straight bar through a round
     mark is two geometric primitives crossing; a curved blade is a made object
     lying across one, and it is what the reference has.

     It is the same ribbon as the letter. The centre line is a shallow arc
     rather than a line, the half-width holds most of the way and then runs out
     over the last fifth — a real blade keeps its breadth almost to the end and
     then finishes quickly, which is also what leaves something for the bead to
     hang from — and the half-thickness is a fraction of the width, because a
     blade is flat.
     -------------------------------------------------------------------------- */
  const BLADE_LEN = 3.70;
  const BLADE_BOW = 0.38;                // how far the tip is off the straight
  const BLADE_STEPS = 26;

  {
    const stations = [];
    for (let i = 0; i <= BLADE_STEPS; i++) {
      const t = i / BLADE_STEPS;
      const y = -t * BLADE_LEN;
      // A parabola, so the curve starts straight at the guard and gathers.
      const x = BLADE_BOW * t * t;
      const slope = new THREE.Vector3(2 * BLADE_BOW * t, -BLADE_LEN, 0).normalize();
      const taper = t < 0.78 ? 1 - t * 0.28 : (1 - 0.78 * 0.28) * Math.pow(1 - (t - 0.78) / 0.22, 0.75);
      stations.push({
        p: new THREE.Vector3(x, y, 0),
        n: new THREE.Vector3(-slope.y, slope.x, 0),   // in the blade's own plane
        b: new THREE.Vector3(0, 0, 1),
        w: 0.155 * taper,
        d: 0.05 * taper,
      });
    }
    sword.add(new THREE.Mesh(ribbon(stations), steel));
  }

  /** Where the point is, in the sword group's own space. */
  const TIP = new THREE.Vector3(BLADE_BOW, -BLADE_LEN, 0);

  /* ---- the hilt -----------------------------------------------------------
     The old one was a box, a cylinder and a sphere, and at forty pixels it read
     as a nail. The reference has a proper cavalry hilt, and almost all of that
     hilt's silhouette is one feature: the KNUCKLE BOW, the bar that sweeps from
     the outer end of the cross-guard round the front of the fist and back to
     the pommel. That single curve is what makes a hilt legible at any size, so
     it is the piece that gets the arithmetic here.

     A bow is an arc through two known points with a known bulge, and Three's
     `TorusGeometry` wants a centre, a radius, a start angle and a sweep. Those
     are not the same four numbers, and eyeballing them is how the first attempt
     ended up with a hook pointing the wrong way, so `arcThrough` converts one
     to the other: for a chord of length c and a sagitta s the radius is
     (c^2/4 + s^2) / 2s, and the centre sits a distance R - s back from the
     chord's midpoint on the far side from the bulge.
     -------------------------------------------------------------------------- */
  /** The pommel, in the sword's own space — the check below needs it. */
  const pommelLocal = new THREE.Vector3();

  function arcThrough(ax, ay, bx, by, sag) {
    const dx = bx - ax;
    const dy = by - ay;
    const chord = Math.hypot(dx, dy);
    const radius = (chord * chord / 4 + sag * sag) / (2 * sag);
    // The chord's normal, turned a quarter turn — the side the bow bulges to.
    const nx = -dy / chord;
    const ny = dx / chord;
    const cx = (ax + bx) / 2 - nx * (radius - sag);
    const cy = (ay + by) / 2 - ny * (radius - sag);
    const from = Math.atan2(by - cy, bx - cx);
    const to = Math.atan2(ay - cy, ax - cx);
    let sweep = to - from;
    while (sweep < 0) sweep += Math.PI * 2;
    return { radius, cx, cy, from, sweep };
  }

  {
    /* Where the fist is. Everything else is measured off these two points. */
    const GUARD_END = [-0.60, 0.12];     // the outer tip of the cross-guard
    const POMMEL = [-0.13, 1.18];

    /* The cross-guard, square across the blade. It is a shallow box and not a
       cylinder because a flat top catches the key light as a line, and a line
       across the blade is what says "guard" at this size. */
    const quillon = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.15, 0.30), fittings);
    quillon.position.set(0.02, 0.14, 0);
    quillon.rotation.z = -0.13;
    sword.add(quillon);

    /* The ferrule — the collar where the blade enters the guard. Small, and it
       is the difference between a blade fitted into a hilt and a blade passing
       through a hole in one. */
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.2, 8), fittings);
    ferrule.position.set(0.01, 0.02, 0);
    sword.add(ferrule);

    const bow = arcThrough(GUARD_END[0], GUARD_END[1], POMMEL[0], POMMEL[1], 0.34);
    const knuckle = new THREE.Mesh(
      new THREE.TorusGeometry(bow.radius, 0.055, 8, 30, bow.sweep), fittings,
    );
    knuckle.position.set(bow.cx, bow.cy, 0);
    knuckle.rotation.z = bow.from;
    sword.add(knuckle);

    /* The short rear quillon, curling the other way — the small detail that
       stops the hilt reading as a letter T. */
    const rear = arcThrough(0.60, 0.10, 0.30, 0.52, 0.14);
    const curl = new THREE.Mesh(
      new THREE.TorusGeometry(rear.radius, 0.05, 8, 14, rear.sweep), fittings,
    );
    curl.position.set(rear.cx, rear.cy, 0);
    curl.rotation.z = rear.from;
    sword.add(curl);

    /* The grip runs from the guard to the pommel, so it is placed BETWEEN them
       rather than at a measured height — move the pommel and the grip follows. */
    const gripFrom = [-0.02, 0.20];
    const length = Math.hypot(POMMEL[0] - gripFrom[0], POMMEL[1] - gripFrom[1]);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.135, length, 9), fittings);
    grip.position.set((gripFrom[0] + POMMEL[0]) / 2, (gripFrom[1] + POMMEL[1]) / 2, 0);
    grip.rotation.z = Math.atan2(POMMEL[1] - gripFrom[1], POMMEL[0] - gripFrom[0]) - Math.PI / 2;
    sword.add(grip);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 9), fittings);
    pommel.position.set(POMMEL[0], POMMEL[1], 0);
    sword.add(pommel);
    pommelLocal.set(POMMEL[0], POMMEL[1], 0);
  }

  /* ---- forty-five degrees, as a direction --------------------------------
     The blade points along `AXIS`. Half of it lies in the mark's plane and half
     of it stands out of that plane, and a vector with equal parts of each is at
     forty-five degrees to the plane by definition — no matter what the in-plane
     lean happens to be. The in-plane part leans down and to the right, so the
     hilt is high on the left; the out-of-plane part is toward the viewer, so
     the point comes out at the FRONT and the bead hangs where it can be seen
     rather than behind the mark.

     `ROLL` turns the sword about its own length afterwards, which is what puts
     the flat of the blade toward the viewer instead of its edge. Without it the
     quaternion below picks whatever roll the shortest rotation happens to give,
     and the blade can end up presenting a line rather than a face. */
  const LEAN = 0.72;
  const ROLL = -0.55;
  const HALF = Math.SQRT1_2;
  const AXIS = new THREE.Vector3(
    HALF * Math.sin(LEAN),
    HALF * -Math.cos(LEAN),
    HALF,
  ).normalize();
  sword.quaternion
    .setFromUnitVectors(new THREE.Vector3(0, -1, 0), AXIS)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ROLL));
  /* CENTRED on the mark, and that is the other half of the hilt's disappearing
     act. An off-centre sword is further from the axis it turns about, and the
     frame has to be opened up to hold whichever end is furthest — which shrinks
     everything else in it. Sitting the sword's own middle on the mark's middle
     is the arrangement with the smallest sweep, and it happens to be the
     arrangement in the reference too: hilt just clear of the ring on one side,
     point just clear on the other.

     `HILT_TOP` is the pommel's far end in the sword's own coordinates and the
     tip is at -BLADE_LEN, so the middle is halfway between; the small bias
     pushes the point a little further out than the hilt, which leaves the bead
     somewhere to hang. Local -Y maps to AXIS, hence the sign. */
  const HILT_TOP = 1.40;
  const BIAS = 0.14;
  sword.position.copy(AXIS).multiplyScalar((HILT_TOP - BLADE_LEN) / 2 - BIAS);

  rig.add(sword);

  /** Where the point is, in the rig's own space. */
  const tipLocal = TIP.clone().applyQuaternion(sword.quaternion).add(sword.position);
  const tipWorld = new THREE.Vector3();

  /* ---- the frame, fitted to the SWEPT shape -------------------------------
     The hilt used to leave the picture. The camera was set to a distance that
     framed the mark, and the mark is a disc a millimetre thick — but the sword
     is not in the mark's plane, it is at forty-five degrees to it, so a quarter
     turn later the part of the sword that was pointing at the viewer is
     pointing sideways instead. It had gone from taking up no width at all to
     taking up all of its length, and the hilt was outside the canvas. There is
     no box around the mark; there is a frame that was measured against the
     wrong pose.

     So the frame is measured against every pose at once. A rig that turns about
     Y sweeps each of its vertices round a circle of radius sqrt(x^2 + z^2), and
     never moves it in y at all. Two numbers describe the whole sweep:

         reach   the largest sqrt(x^2 + z^2) anywhere in the rig
         rise    the largest |y|

     and the closest the sweep ever comes to the camera is `reach`. Fit for the
     frustum at THAT plane and nothing can leave the picture at any angle. */
  const envelope = { reach: 0, rise: 0 };
  {
    const point = new THREE.Vector3();
    /* `matrixWorld`, and not the mesh's own matrix: the blade and the hilt are
       inside the sword group, and in their own coordinates the blade is three
       units long and straight down. Measured there it asks for a frame three
       units tall; measured where it actually is — turned to forty-five degrees
       and only about two units from the middle — it asks for far less. Getting
       this wrong does not break anything, it just quietly shrinks the mark. */
    rig.updateMatrixWorld(true);
    rig.traverse((node) => {
      if (!node.isMesh) return;
      const position = node.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
        envelope.reach = Math.max(envelope.reach, Math.hypot(point.x, point.z));
        envelope.rise = Math.max(envelope.rise, Math.abs(point.y));
      }
    });
  }

  /**
   * Put the camera where the whole sweep fits, at whatever shape the box is.
   *
   * The box is WIDER THAN IT IS TALL, and that is the last piece of the hilt
   * problem. The sweep is about two and a half units across and only one and
   * three quarters tall — a sword lying diagonally through a ring needs width,
   * not height. In a square box the frame has to be opened to the wider of the
   * two in BOTH directions, and everything in it is drawn two thirds the size
   * it could be with bands of nothing above and below. Given a box the shape of
   * the sweep, the mark fills its height and the sword reaches the sides.
   */
  function fitFrame(aspect) {
    const MARGIN = 1.05;   // the light on the metal spills a pixel past the geometry
    const half = Math.max(envelope.rise, envelope.reach / aspect) * MARGIN;
    camera.aspect = aspect;
    camera.position.set(0, 0, half / Math.tan((camera.fov * Math.PI / 180) / 2) + envelope.reach);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  /* ---- light --------------------------------------------------------------
     Bright and frontal, and more of it than a shape this small would normally
     need. Two of the three are there for the sword: a metal reads as metal only
     where a light is reflecting off it, and one key gives one highlight and a
     lot of grey. */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2b3a4a, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.9);
  key.position.set(-1.6, 2.1, 3.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fe9ff, 1.7);
  rim.position.set(2.6, -0.7, 1.4);
  scene.add(rim);
  /* Straight down the barrel, dim. Its whole job is to put a line of light
     along the blade's near edge at every angle of the turn, so the sword never
     passes through a pose where it is a flat grey shape. */
  const glint = new THREE.DirectionalLight(0xffffff, 1.1);
  glint.position.set(0.2, 0.6, 4);
  scene.add(glint);

  /* ---- the dew ------------------------------------------------------------
     All of it in page coordinates on the overlay, none of it in the scene. */
  const layer = theOverlay();

  /** Beads in flight. At most a handful ever exist at once. */
  const beads = [];
  /** Waves running along the pool's surface, one launched per landing. */
  const waves = [];
  /** How many have landed, capped — this is the pool's depth, and its memory. */
  let landed = 0;
  /** Where the pool is. Set by the first landing and nudged by later ones. */
  let poolX = null;
  /** The one still growing at the point, if there is one. */
  let hanging = null;

  function land(x) {
    if (poolX === null) poolX = x;
    /* Later landings pull the puddle toward them a little rather than moving
       it. Five drops that fell from a turning point did not all fall in exactly
       the same place, and a puddle that jumps to each new one is a puddle that
       teleports. */
    else poolX += (x - poolX) * 0.18;
    if (landed < POOL_FULL) landed++;
    waves.push({ x, age: 0, amp: 3.0 });
    if (waves.length > 9) waves.shift();
  }

  /** Half the pool's width. It spreads as it fills, and then stops. */
  function poolHalf() {
    return (POOL_WIDTH + Math.min(landed, POOL_FULL) * POOL_SPREAD) / 2;
  }

  /**
   * The surface height at `x`, at time `t`, measured down from the overlay's
   * own top edge.
   *
   * WHY IT IS A PUDDLE AND NOT A BAND
   * ---------------------------------
   * The first build filled the whole width of the screen. It is the obvious
   * reading of "accumulate at the bottom line", it is trivial to draw — and it
   * looks like a warning bar, because a saturated stripe from edge to edge of
   * the viewport is what a warning bar is. Five drops the size of a full stop
   * also do not cover a thousand pixels.
   *
   * So the depth is a lens: full in the middle, nothing at the rim, over a
   * width that grows with each of the first five landings. It reads as a small
   * amount of liquid lying where it fell, which is what it is.
   *
   * On top of that, three sines that do not divide into each other for the
   * tremble — one sine reads as a mechanical ripple — plus every live wave,
   * each a bump travelling out from where its bead landed, decaying as it goes.
   */
  function surfaceAt(x, t) {
    const bottom = layer.height;
    if (poolX === null) return bottom;
    const half = poolHalf();
    const u = (x - poolX) / half;
    if (Math.abs(u) >= 1) return bottom;

    const lens = Math.pow(1 - u * u, 0.55);
    let y = bottom - (landed / POOL_FULL) * POOL_DEPTH * lens;

    y += (Math.sin(x * 0.05 + t * 2.1) * 0.5
        + Math.sin(x * 0.017 - t * 1.3) * 0.7
        + Math.sin(x * 0.09 + t * 3.4) * 0.25) * lens;

    for (const wave of waves) {
      const front = Math.abs(x - wave.x) - wave.age * 150;
      y -= wave.amp
        * Math.exp(-wave.age * 1.6)
        * Math.exp(-Math.abs(front) / 55)
        * Math.cos(front * 0.07)
        * lens;
    }
    return y;
  }

  /** The surface as a path, left rim to right rim. */
  function traceSurface(ctx, t) {
    const half = poolHalf();
    const from = poolX - half;
    const to = poolX + half;
    ctx.beginPath();
    ctx.moveTo(from, layer.height);
    for (let x = from; x <= to; x += 2) ctx.lineTo(x, surfaceAt(x, t));
    ctx.lineTo(to, layer.height);
  }

  function drawPool(ctx, t) {
    if (poolX === null) return;
    const top = layer.height - POOL_DEPTH - 4;

    traceSurface(ctx, t);
    ctx.lineTo(poolX - poolHalf(), layer.height + 2);
    ctx.closePath();

    const paint = poolPaint(pageIsDark());

    const body = ctx.createLinearGradient(0, top, 0, layer.height);
    body.addColorStop(0, paint.top);
    body.addColorStop(0.3, paint.mid);
    body.addColorStop(1, paint.deep);

    ctx.save();
    ctx.shadowColor = rgba(DEW, paint.glowAlpha);
    ctx.shadowBlur = paint.glowBlur;
    ctx.fillStyle = body;
    ctx.fill();
    /* Twice on dark: one pass of shadow at this size is a halo the page
       swallows, two is a pool that appears to be lit from within. */
    if (paint.glowBlur > 12) ctx.fill();
    ctx.restore();

    /* The rim. A liquid is read from the line of light along its meniscus far
       more than from its body, so this stroke does more work than the fill
       above it — and it is drawn twice, once soft and wide for the glow and
       once tight and bright for the edge. */
    traceSurface(ctx, t);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(DEW_LIT, paint.rimSoft);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,226,230,0.85)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  /**
   * The outline of a drop: round at the bottom, drawn to a point at the top.
   *
   * WHY IT IS NOT AN ELLIPSE
   * ------------------------
   * It was, and an ellipse is what a squashed ball looks like — symmetrical top
   * to bottom, and so it reads as a bead of glass rather than as liquid. A drop
   * is not symmetrical. Surface tension pulls it round at the bottom and the
   * column it is leaving pulls it to a point at the top, whether it is still
   * hanging off the blade or already falling, so the point goes up in both
   * cases.
   *
   * The curve is one circle and two quadratics: an arc round the bottom half,
   * and a curve up each side to a single apex. `bias` sets how far up that apex
   * goes — how drawn-out the drop is — and it is the same number that used to
   * be a vertical scale, so a fast-falling drop still stretches.
   */
  function dropPath(ctx, r, bias) {
    /* The 1.45 is the drop's own shape and the `bias` term is how much the
       moment is stretching it. The constant is not optional: with the point
       only just clear of the circle the outline is a circle, and it was — the
       shape only looked like anything while it was accelerating. */
    const tip = -r * (1.45 + bias * 1.6);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI);              // the round bottom, left to right
    // Up the left side to the point, and back down the right.
    ctx.moveTo(-r, 0);
    ctx.quadraticCurveTo(-r * 0.99, tip * 0.44, 0, tip);
    ctx.quadraticCurveTo(r * 0.99, tip * 0.44, r, 0);
    ctx.closePath();
  }

  /**
   * One drop, lit.
   *
   * An off-centre radial gradient is a cheap and completely convincing solid:
   * the bright spot is the light source, the mid-tone is the body, and the dark
   * edge is the terminator. The second, small, white spot is the specular, and
   * it is what makes the thing look wet rather than merely round.
   */
  function drawBead(ctx, x, y, r, stretch, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    ctx.shadowColor = rgba(DEW, 0.9);
    ctx.shadowBlur = r * 3;

    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.3, r * 0.05, 0, 0, r * 1.15);
    g.addColorStop(0, rgba(DEW_LIT, 1));
    g.addColorStop(0.45, rgba(DEW, 1));
    g.addColorStop(1, `rgba(${Math.round(DEW.r * 0.45)},${Math.round(DEW.g * 0.2)},${Math.round(DEW.b * 0.3)},1)`);
    ctx.fillStyle = g;
    dropPath(ctx, r, Math.max(0, stretch - 1));
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,245,246,0.9)';
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.3, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---- the loop ----------------------------------------------------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  let running = false;
  let clock = 0;
  let last = 0;
  /* Which half-turn we are in. A bead is started every time this changes, which
     is what "one each half rotation" means without a second timer to keep in
     step with the first. */
  let halfTurn = 0;

  /**
   * Is the mark on screen RIGHT NOW, measured rather than remembered?
   *
   * `onScreen` below is a cache of the last thing the IntersectionObserver
   * said, and an observer only speaks when the intersection CHANGES. Between
   * the change and the callback the cache is stale, and during a page load —
   * when the content lands and shoves the footer twenty thousand pixels down —
   * that gap was measured at about 360ms. Anything that calls `start()` inside
   * that gap starts the loop on a fact that stopped being true.
   *
   * This is the same question asked of the layout instead of the cache. It is
   * free: `step()` already needs this rectangle to project the sword's point.
   */
  function markIsVisible(rect) {
    return rect.bottom > 0 && rect.top < window.innerHeight
        && rect.right > 0 && rect.left < window.innerWidth;
  }

  function step(dt) {
    /* Where the point ended up, in page coordinates. Projected every frame
       because the rig is turning and the page may be scrolling: the bead has to
       hang off the point, not off where the point was when it started. */
    const rect = canvas.getBoundingClientRect();

    /* THE GUARD, and the reason there is one here as well as on `start()`.
       Every previous fix to this bug added another rule about WHEN the loop
       may begin — the observer, then `visibilitychange`, then `hs:page-ready`.
       Each was correct and each was bypassed by the next way of arriving with
       a stale answer, because they all trust a flag set at some earlier
       moment. This one trusts nothing: on every single frame it looks at where
       the sword actually is, and if the sword is not on the screen then the
       blood it sheds has no business being on the screen either.
       README §16c.1. */
    if (!markIsVisible(rect)) { stop(); return; }

    clock += dt;

    const turn = (clock / TURN_SECONDS) * Math.PI * 2;
    rig.rotation.y = turn;
    renderer.render(scene, camera);
    tipWorld.copy(tipLocal).applyEuler(rig.rotation).project(camera);
    const tipX = rect.left + (tipWorld.x * 0.5 + 0.5) * rect.width;
    const tipY = rect.top + (-tipWorld.y * 0.5 + 0.5) * rect.height - layer.top;

    const half = Math.floor(turn / Math.PI);
    if (half !== halfTurn) {
      halfTurn = half;
      if (!hanging) hanging = { t: 0 };
    }

    const ctx = layer.ctx;
    layer.clear();

    /** The drop's full size, tied to the mark's HEIGHT rather than to a
        constant, so it stays in proportion at any font size. Height and not
        width: the box is wider than the mark is, because the sword needs the
        room, and a drop sized off it came out twice the size it should be. */
    const full = Math.max(3, rect.height * 0.105);

    if (hanging) {
      hanging.t += dt;
      const t = Math.min(1, hanging.t / GATHER_SECONDS);
      /* Fast at first and then slow: a bead gathers most of its volume early
         and then hangs there getting slightly longer, which is the part that
         reads as surface tension about to give. */
      const r = full * (0.25 + 0.75 * Math.pow(t, 0.55));
      const stretch = 1 + t * 0.55;
      /* Hung by its point. `dropPath` puts the apex that far above the drop's
         own origin, so this is what puts the apex ON the blade rather than
         somewhere near it. */
      const apex = r * (1.45 + (stretch - 1) * 1.6);
      drawBead(ctx, tipX, tipY + apex, r, stretch, 1);
      if (t >= 1) {
        beads.push({ x: tipX, y: tipY + r, vy: 0, vx: 0, r: full, hit: 0 });
        hanging = null;
      }
    }

    for (let i = beads.length - 1; i >= 0; i--) {
      const bead = beads[i];
      if (bead.hit > 0) {
        /* Landed. It sinks into the surface and goes, and it is the only thing
           that happens — the pool's depth was decided at the moment of impact
           and does not follow the fade. */
        bead.hit += dt;
        const t = bead.hit / 0.28;
        if (t >= 1) { beads.splice(i, 1); continue; }
        drawBead(ctx, bead.x, bead.y + t * bead.r, bead.r * (1 - t * 0.7), 0.7, 1 - t);
        continue;
      }

      bead.vy += 1500 * dt;
      bead.y += bead.vy * dt;
      bead.x += bead.vx * dt;

      const floor = surfaceAt(bead.x, clock);
      if (bead.y + bead.r >= floor) {
        bead.y = floor - bead.r * 0.4;
        bead.hit = 0.0001;
        land(bead.x);
        continue;
      }
      /* It stretches as it accelerates, which is the whole of why a falling
         drop looks like a falling drop. */
      drawBead(ctx, bead.x, bead.y, bead.r, 1 + Math.min(1.4, bead.vy / 900), 1);
    }

    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].age += dt;
      if (waves[i].age > 3) waves.splice(i, 1);
    }

    drawPool(ctx, clock);
  }

  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    step(dt);
    raf = requestAnimationFrame(frame);
  }

  /**
   * Is the mark actually on screen?
   *
   * THE BUG THIS FIXES. The dew used to appear at the bottom-left of the page
   * with no sword anywhere near it — most reliably after switching to another
   * tab and back, on a page scrolled nowhere near the footer. The observer
   * below was doing its job; `visibilitychange` was not. It called `start()`
   * unconditionally whenever the tab came back, whatever the observer had last
   * said, so the loop resumed, the pool was painted, and the only part of the
   * feature that explains it — a sword with a drop hanging off its point — was
   * a thousand pixels below the fold.
   *
   * So there is now one fact, in one variable, and every path that could start
   * the loop has to ask it. That is the whole fix: not a new rule, one place
   * for the rule that already existed.
   */
  let onScreen = false;

  /**
   * Has the page finished becoming itself?
   *
   * THE SECOND BUG THIS FIXES, and it is the same bug one step earlier. The
   * rule above — "the dew runs only while the sword is on screen" — was right
   * and was working. What was wrong was the moment it was first asked.
   *
   * The footer is built from site.json and the content from the page's own
   * file, and the footer wins that race by a wide margin. Between the two the
   * document is a masthead, the word "Loading…" and this footer, all of it
   * shorter than the window — so the sword IS on screen, the observer says so
   * truthfully, and the dew starts. Seconds later the content lands, the
   * document grows past twenty thousand pixels, and the footer is gone. The
   * loop stops and the overlay is cleared, correctly. What is not cleared is
   * the pool, which is remembered on purpose, so the reader who eventually
   * scrolls to the footer meets a puddle that collected while they were
   * looking at the top of the page — "the blood is already there and I never
   * scrolled down", with later drops adding to it.
   *
   * So the dew waits for `hs:page-ready` (main.js). Before that signal the
   * viewport is describing a placeholder, and a placeholder is not a reason to
   * bleed. Nothing accumulates in that window because nothing runs in it.
   *
   * Read once rather than assumed false: this module is imported dynamically
   * and can easily finish loading after the signal has already gone out, in
   * which case there is no event left to wait for.
   */
  let settled = document.documentElement.dataset.pageReady === 'yes';
  if (!settled) {
    document.addEventListener('hs:page-ready', () => {
      settled = true;
      /* Re-measure instead of trusting `onScreen`. This handler fires at the
         precise moment the content has just landed and pushed the footer off
         the bottom of the page, which is the moment the observer's answer is
         most likely to still be the one from before that happened. */
      onScreen = markIsVisible(canvas.getBoundingClientRect());
      start();
    }, { once: true });
  }

  function start() {
    if (running || document.hidden || reduced.matches || !onScreen || !settled) return;
    /* Last word before the loop begins: the flags all said yes, so check that
       the layout agrees. `step()` re-checks this every frame; this only avoids
       starting, painting one frame and stopping again. */
    if (!markIsVisible(canvas.getBoundingClientRect())) { onScreen = false; return; }
    running = true;
    last = 0;
    layer.canvas.dataset.live = 'yes';
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    layer.clear();
    delete layer.canvas.dataset.live;
    /* Anything mid-air is abandoned rather than paused. A drop frozen halfway
       down the screen and resumed a minute later, from a mark that has moved,
       falls from nowhere to nowhere. The POOL is kept — it is the accumulated
       volume, and coming back to the footer to find it still there is the
       behaviour that was asked for. */
    beads.length = 0;
    hanging = null;
  }

  function size() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = rect.width || 64;
    const h = rect.height || 44;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    fitFrame(w / h);
  }

  size();
  renderer.render(scene, camera);
  host.dataset.mark = 'three';

  if ('IntersectionObserver' in window && !reduced.matches) {
    /* No `rootMargin`. It used to be 80px — a courtesy margin so the mark was
       already turning by the time it scrolled into view — and for the dew it is
       exactly wrong: a drop could let go while the sword that shed it was still
       below the fold. The margin is off, so "the mark is visible" and "the dew
       may run" are the same statement. */
    new IntersectionObserver((entries) => {
      /* The LAST entry, not `entries.some(...)`. A callback can carry several
         records for the same target — the observer queues them and delivers
         the batch on one frame — and only the last describes the state now.
         `some()` answered "was it ever visible during this batch", so a batch
         of [visible, gone] latched `onScreen` to true and the dew kept running
         with the sword long gone. Layout during a page load produces exactly
         those batches. */
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen) start();
      else stop();
    }).observe(canvas);
  } else if (!reduced.matches) {
    onScreen = true;
    start();
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', () => { size(); if (!running) renderer.render(scene, camera); }, { passive: true });

  new MutationObserver(() => {
    const next = accent();
    markMaterial.color.copy(next);
    markMaterial.emissive.copy(next);
    if (!running) renderer.render(scene, camera);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return {
    start, stop,
    /** For the guard: what the dew is doing right now. */
    state: () => ({
      landed, beads: beads.length, hanging: !!hanging, waves: waves.length, settled, onScreen,
    }),
    /**
     * For the guard: how close to the edge of the canvas the two ends of the
     * sword ever get, over a whole turn, as a fraction of the half-frame.
     *
     * This is the reported bug written as a number. Anything at or over 1 means
     * that end leaves the picture at some angle — which is exactly what "the
     * handle goes out of an invisible box" was, and it is not something a
     * screenshot can be relied on to catch, because it only happens during part
     * of a ten-second turn.
     */
    escape() {
      const probe = new THREE.Vector3();
      const turn = new THREE.Euler();
      let worst = 0;
      for (const local of [pommelLocal, TIP]) {
        for (let i = 0; i < 48; i++) {
          turn.set(0, (i / 48) * Math.PI * 2, 0);
          probe.copy(local)
            .applyQuaternion(sword.quaternion)
            .add(sword.position)
            .applyEuler(turn)
            .project(camera);
          worst = Math.max(worst, Math.abs(probe.x), Math.abs(probe.y));
        }
      }
      return worst;
    },
    dispose() { stop(); renderer.dispose(); },
  };
}
