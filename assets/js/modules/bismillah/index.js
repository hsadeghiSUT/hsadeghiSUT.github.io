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
 * bismillah/index.js — the calligraphic mark in the top left, as a solid.
 *
 * It replaces the cyan rhombus. Four things are happening at once and they all
 * have to agree with each other to the pixel:
 *
 *   the solid    the artwork's outlines, extruded and lit. Not a picture of a
 *                shape — an object with walls you can see round the edge of.
 *
 *   the meteor   a bright arc running COUNTER-CLOCKWISE around the mark, on the
 *                border itself. The mark's circumference is not a circle or a
 *                diamond, so this cannot be a rotated gradient: it is a stroked
 *                path with a moving dash, and the path is the traced outline.
 *
 *   the shafts   columns of light standing out from the border at random
 *                places, with random lengths and lifetimes. Bright where they
 *                leave the mark, gone by their far end.
 *
 *   the hover    a step up in size, and a beat.
 *
 * WHY THE CAMERA IS ORTHOGRAPHIC
 * ------------------------------
 * The meteor and the shafts are SVG, drawn in a 0–100 box laid exactly over the
 * canvas; the mark is WebGL. For the light to sit ON the border rather than
 * near it, the SVG has to know where the border ended up on screen — and it has
 * to know it every frame, because the mark leans as it goes.
 *
 * Under an orthographic camera that is one line of arithmetic:
 *
 *     svgX = 50 + 50 · x / H          svgY = 50 − 50 · y / H
 *
 * so each frame the traced silhouette is pushed through exactly the rotation
 * the mesh is using, mapped with the formula above, and written out as a path.
 * The light is then not "aligned with" the border; it IS the border. A
 * perspective camera would have bought a little more depth and cost this
 * entirely, which is a bad trade for a mark 50 pixels tall.
 *
 * The depth is bought back with the lean, the extrusion walls and a travelling
 * light instead — the same lighting idea as the footer heart.
 *
 * THE TRACE
 * ---------
 * `assets/img/logos/bismillah-<name>.json`, produced by
 * `tools/trace-bismillah.py` — one per mark; see `./marks.js`.
 * `shapes` are the letterforms (outline + holes) and become the geometry;
 * `silhouette` is ONE closed curve around the whole composition and is what the
 * meteor runs along and what the shafts stand on. See that script for why the
 * mask is built from colour rather than from alpha.
 *
 * WHAT HAPPENS WITHOUT IT
 * -----------------------
 * The PNG, which is in the markup from the start. `data-bismillah="three"` on
 * the wrapper is what hides it, and that is only set once there is a working
 * context — so there is never a moment with a hole in the header.
 */

import { loadThree } from '../fx/three.js';
import { MARKS } from './marks.js';

/** Seconds the arrival takes, when the page before this one had the other mark. */
const ARRIVE_SECONDS = 1.05;

/** Seconds for one lean, out and back. */
const LEAN_SECONDS = 9;

/** Seconds for the meteor to come round again. */
const METEOR_SECONDS = 4.6;

/** Seconds for the travelling highlight to come round again. */
const SWEEP_SECONDS = 5.2;

/** How many columns of light stand off the border at once. */
const SHAFTS = 9;

/** Seconds for one beat-and-rest, while hovered. */
const BEAT_SECONDS = 1.25;

/** The wall clock, in milliseconds. See the arrival in `draw()`. */
const now = () => (window.performance && performance.now ? performance.now() : Date.now());

/** Read a CSS custom property off <html>. */
function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** SVG element, in the right namespace. */
function svg(name, attrs) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  return node;
}

/**
 * Mount the modelled mark inside `host`.
 *
 * @param {HTMLElement} host    the wrapper holding the poster and the canvas
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} lights  the empty box the SVG overlay goes into
 * @param {HTMLElement} hoverOn the element whose hover drives the beat
 * @param {object} mark    one entry from `MARKS` in ./marks.js
 * @param {boolean} arrive whether the previous page showed the OTHER mark, in
 *                         which case this one spins in rather than simply
 *                         being there — see `arriving()` in ./marks.js
 */
export async function mountBismillah(host, canvas, lights, hoverOn, mark = MARKS.kufic, arrive = false) {
  const DEPTH = mark.depth;
  let trace;
  try {
    const response = await fetch(mark.trace, { cache: 'force-cache' });
    if (!response.ok) throw new Error(String(response.status));
    trace = await response.json();
  } catch (err) {
    console.info('brand mark: no trace, keeping the flat one.', err);
    return null;
  }
  if (!trace || !trace.shapes || !trace.shapes.length) return null;

  const THREE = await loadThree();
  if (!THREE) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('brand mark: no WebGL, keeping the flat one.', err);
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  /* ---- where the artwork sits --------------------------------------------
     The trace is normalised to −0.5…0.5 on the longer side, so it is not
     centred on its own bounding box. Everything below — the geometry, the
     silhouette, the camera — works in coordinates measured from that box's
     centre, which is what makes a scale about the origin a scale about the
     mark. */
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const shape of trace.shapes) {
    for (const [x, y] of shape.outline) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  /* Half the view. The 1.16 is headroom: the mark grows a tenth on hover and
     the meteor is stroked, and neither may touch the edge of the canvas. */
  const H = Math.max(maxX - minX, maxY - minY) / 2 * mark.headroom;

  /* ---- the solid ---------------------------------------------------------- */
  const shapes = trace.shapes.map((entry) => {
    const shape = new THREE.Shape();
    entry.outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    shape.closePath();
    for (const hole of entry.holes || []) {
      const path = new THREE.Path();
      hole.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      path.closePath();
      shape.holes.push(path);
    }
    return shape;
  });

  /* The bevel is deliberately tiny. It is there to catch a highlight along
     every edge — twenty-nine of the kufic mark's holes are only a few
     thousandths across, and the thuluth mark's strokes are barely wider, so a
     bevel of any real size closes them up or folds them through themselves. */
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: mark.bevel * 2,
    bevelSize: mark.bevel,
    bevelOffset: 0,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geometry.translate(-cx, -cy, -(DEPTH / 2));
  geometry.computeVertexNormals();

  /* The base is a DARKENED brand cyan, not the brand cyan itself. Lit at full
     strength the mark came out one flat sheet of colour — every face already at
     the top of the range, so nothing left to brighten and no shading to read.
     Starting dark and letting the lights carry it up is what puts a difference
     between a face turned to the key and a wall turned away from it, and that
     difference is the only thing saying "solid" at this size. */
  const base = new THREE.Color(token('--c-brand', '#00ccff'));
  const material = new THREE.MeshStandardMaterial({
    color: base.clone().multiplyScalar(0.48),
    roughness: 0.28,
    metalness: 0.78,
    emissive: base.clone(),
    emissiveIntensity: mark.emissive,
  });

  const solid = new THREE.Mesh(geometry, material);
  const scene = new THREE.Scene();
  scene.add(solid);

  const camera = new THREE.OrthographicCamera(-H, H, H, -H, 0.1, 10);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  /* ---- light --------------------------------------------------------------
     Ground and sky so the walls never go black, a key from the upper left for
     the form, a cyan rim from behind so the silhouette is always drawn in
     light, and the traveller — a point light on a slow circuit whose specular
     slides across the faces and is what says "solid" rather than "sticker". */
  scene.add(new THREE.HemisphereLight(0xcdefff, 0x04121a, 0.92));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-1.1, 1.6, 1.7);
  scene.add(key);
  /* A cyan counter from below and behind. Its job is the WALLS: without it the
     sides of the extrusion — the surfaces the key never reaches — go to black
     and the mark loses its thickness in the one place it is visible. */
  const rim = new THREE.DirectionalLight(base.clone(), 2.0);
  rim.position.set(1.5, -1.0, -1.2);
  scene.add(rim);
  const traveller = new THREE.PointLight(0xffffff, 2.4, 3.4, 2);
  scene.add(traveller);

  /* ---- the overlay --------------------------------------------------------
     One 0–100 box over the canvas, holding the meteor's two paths and the
     shafts. `overflow: visible` in the stylesheet is what lets the shafts leave
     the mark's own box and spill into the bar, which is the point of them. */
  const sheet = svg('svg', {
    class: 'bismillah__light',
    viewBox: '0 0 100 100',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  const brand = token('--c-brand', '#00ccff');
  const defs = svg('defs', {});
  const gradient = svg('linearGradient', {
    id: 'bism-shaft',
    gradientUnits: 'userSpaceOnUse',
    x1: '0', y1: '0', x2: '1', y2: '0',
  });
  /* Bright where it leaves the border, gone by the far end. The stops are in
     the shaft's OWN space — each shaft's group carries a scale, so x2 = 1 is
     always the tip whatever the length. */
  const stops = [
    ['0', '#ffffff', '1'],
    ['0.12', brand, '0.95'],
    ['0.45', brand, '0.34'],
    ['1', brand, '0'],
  ];
  for (const [offset, color, opacity] of stops) {
    gradient.appendChild(svg('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }));
  }
  defs.appendChild(gradient);
  sheet.appendChild(defs);

  const shaftHost = svg('g', { class: 'bismillah__shafts' });
  sheet.appendChild(shaftHost);

  const shaftNodes = [];
  for (let i = 0; i < SHAFTS; i++) {
    const group = svg('g', {});
    group.appendChild(svg('line', {
      x1: '0', y1: '0', x2: '1', y2: '0',
      stroke: 'url(#bism-shaft)',
      'stroke-width': '1.15',
      'stroke-linecap': 'round',
    }));
    shaftHost.appendChild(group);
    shaftNodes.push(group);
  }

  const tail = svg('path', { class: 'bismillah__meteor-tail', pathLength: '100' });
  const head = svg('path', { class: 'bismillah__meteor', pathLength: '100' });
  sheet.appendChild(tail);
  sheet.appendChild(head);
  /* The dash timing lives here and not only in the stylesheet, so the meteor's
     period and this module's idea of it cannot drift apart. */
  tail.style.animationDuration = METEOR_SECONDS + 's';
  head.style.animationDuration = METEOR_SECONDS + 's';
  lights.replaceChildren(sheet);

  /* ---- the silhouette -----------------------------------------------------
     Centred like the geometry, and turned so that walking it forwards is
     counter-clockwise ON SCREEN. SVG's Y points down, so a positive shoelace
     area there means the points are in clockwise order; reversing them is what
     lets the dash animation run one way and mean the other. */
  let outline = (trace.silhouette || []).map(([x, y]) => [x - cx, y - cy]);
  if (outline.length > 3) {
    let area = 0;
    for (let i = 0; i < outline.length; i++) {
      const [ax, ay] = outline[i];
      const [bx, by] = outline[(i + 1) % outline.length];
      // In SVG space Y is flipped, hence the minus signs on the Y terms.
      area += ax * -by - bx * -ay;
    }
    if (area > 0) outline = outline.slice().reverse();
  }

  /* The front face of the extrusion, which is the edge the eye reads as the
     border and therefore the one the light must sit on. */
  const FACE = DEPTH / 2 + 0.0045;

  /** Project one traced point through the mesh's own rotation into the 0–100 box. */
  const projected = outline.map(() => [0, 0]);
  function project(leanY, leanX, scale) {
    const cyY = Math.cos(leanY), syY = Math.sin(leanY);
    const cyX = Math.cos(leanX), syX = Math.sin(leanX);
    for (let i = 0; i < outline.length; i++) {
      const x = outline[i][0] * scale;
      const y = outline[i][1] * scale;
      const z = FACE * scale;
      /* Euler XYZ with Z zero is Rx·Ry, so the Y turn happens first. */
      const x1 = x * cyY + z * syY;
      const z1 = -x * syY + z * cyY;
      const y1 = y * cyX - z1 * syX;
      projected[i][0] = 50 + 50 * x1 / H;
      projected[i][1] = 50 - 50 * y1 / H;
    }
  }

  /** The projected outline as one closed path. */
  function pathOf() {
    let d = '';
    for (let i = 0; i < projected.length; i++) {
      d += (i ? 'L' : 'M') + projected[i][0].toFixed(2) + ' ' + projected[i][1].toFixed(2);
    }
    return d + 'Z';
  }

  /* ---- the shafts ---------------------------------------------------------
     Each one stands on a vertex of the projected silhouette and points along
     the outward normal there. Length, position and lifetime are all rolled
     again every time one dies, which is what keeps them from reading as a
     fixed set of spokes that merely blink. */
  const shafts = shaftNodes.map(() => ({ i: 0, len: 0, born: -99, life: 1 }));

  function roll(shaft, clock) {
    shaft.i = Math.floor(Math.random() * outline.length);
    shaft.len = 5 + Math.random() * 15;
    shaft.life = 1.5 + Math.random() * 2.4;
    shaft.born = clock + Math.random() * 0.5;
  }

  function drawShafts(clock) {
    for (let n = 0; n < shafts.length; n++) {
      const shaft = shafts[n];
      const age = clock - shaft.born;
      if (age > shaft.life) { roll(shaft, clock); continue; }
      if (age < 0) { shaftNodes[n].setAttribute('opacity', '0'); continue; }

      const i = shaft.i;
      const [bx, by] = projected[i];
      const [px, py] = projected[(i - 1 + projected.length) % projected.length];
      const [nx, ny] = projected[(i + 1) % projected.length];
      /* Outward, from the WINDING — not from the distance to the middle of the
         box. The first version asked "does this point away from the centre?",
         which is only the same question for a convex shape; this one has deep
         notches between its lobes, and in every one of them the two tests
         disagree. Half the columns came out pointing inward and lay across the
         letterforms like scratches.

         The outline is normalised above to run counter-clockwise on screen, and
         on a counter-clockwise polygon in screen coordinates the outward normal
         is the forward tangent turned a quarter turn one specific way. No test,
         no exceptions, right in the notches too. */
      const tx = nx - px;
      const ty = ny - py;
      const length = Math.hypot(tx, ty) || 1;
      const ox = -ty / length;
      const oy = tx / length;

      const t = age / shaft.life;
      /* Up fast, down slow: a column of light that snaps on and then bleeds
         away reads as an emission; a symmetric fade reads as a blink. */
      const alpha = t < 0.22 ? t / 0.22 : Math.pow(1 - (t - 0.22) / 0.78, 1.7);
      const grow = 0.45 + 0.55 * Math.min(1, t / 0.3);

      shaftNodes[n].setAttribute(
        'transform',
        `translate(${bx.toFixed(2)} ${by.toFixed(2)}) rotate(${(Math.atan2(oy, ox) * 180 / Math.PI).toFixed(1)}) scale(${(shaft.len * grow).toFixed(2)} 1)`,
      );
      shaftNodes[n].setAttribute('opacity', alpha.toFixed(3));
    }
  }

  /* ---- the loop ----------------------------------------------------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  let running = false;
  let clock = 0;
  let last = 0;
  let hovered = false;
  let grown = 1;
  /* The arrival. `Infinity` means "not arriving", which is also what it becomes
     the moment the animation finishes — one variable, no flag beside it. */
  let arrived = arrive && !reduced.matches ? 0 : Infinity;
  const arrivedAt = now();

  /** The beat, borrowed from the footer heart: a thump, a smaller one, a rest. */
  function beat(t) {
    const phase = (t % BEAT_SECONDS) / BEAT_SECONDS;
    const thump = (at, width, height) => {
      const d = Math.abs(phase - at);
      return Math.pow(Math.max(0, 1 - d / width), 2.2) * height;
    };
    return thump(0.10, 0.13, 1.0) + thump(0.30, 0.10, 0.5);
  }

  function draw(dt) {
    clock += dt;

    const want = hovered ? 1.10 + beat(clock) * 0.05 : 1;
    grown += (want - grown) * Math.min(1, dt * 12);

    /* ---- the arrival ----------------------------------------------------
       The mark the page before this one showed was the other one, so this one
       does not simply appear: it turns into place and grows into its size.

       It is done HERE and not in CSS, and that is not a preference. The light
       around the mark — the meteor on its border, the columns standing off it —
       is rewritten every frame from the mesh's own rotation and scale (see
       `project`), so anything that moves the mark has to move it in those two
       numbers or the light detaches and follows a mark that is no longer where
       it was. A CSS transform on the wrapper would also have scaled the
       canvas's pixels rather than the mark.

       One turn, eased out hard, so almost all of it happens in the first third
       of a second and the rest is the mark settling. */
    let spin = 0;
    let birth = 1;
    if (arrived < ARRIVE_SECONDS) {
      /* THE WALL CLOCK, not the accumulated `dt`.
         `dt` is clamped to 50 ms a frame so a stalled tab resumes rather than
         jumps, which is right for a loop and wrong for a one-shot with a
         deadline: on a page drawing ten frames a second the clamp makes the
         arrival take three real seconds instead of one, and on a slower one it
         does not visibly end at all. An entrance is a promise about how long
         the reader waits, so it is measured in the reader's seconds. */
      arrived = (now() - arrivedAt) / 1000;
      const t = Math.min(1, arrived / ARRIVE_SECONDS);
      const eased = 1 - Math.pow(1 - t, 3);
      spin = (1 - eased) * Math.PI * 2;
      birth = 0.52 + 0.48 * eased;
      if (t >= 1) {
        arrived = Infinity;
        host.classList.remove('is-arriving');
      }
    }

    /* Both of these are OFFSET sines, and the offset is the point: a lean that
       passes through zero spends part of every cycle dead-on to an orthographic
       camera, and dead-on to an orthographic camera an extrusion has no visible
       walls at all. The mark would flatten to a sticker twice a cycle. Kept
       leaning, it never does. */
    const leanY = 0.19 + Math.sin(clock * (Math.PI * 2 / LEAN_SECONDS)) * 0.17 + spin;
    const leanX = -0.13 + Math.sin(clock * (Math.PI * 2 / (LEAN_SECONDS * 1.37))) * 0.06;
    const scale = grown * birth;

    solid.rotation.set(leanX, leanY, 0);
    solid.scale.setScalar(scale);

    const sweep = (clock % SWEEP_SECONDS) / SWEEP_SECONDS * Math.PI * 2;
    traveller.position.set(Math.cos(sweep) * 0.62, 0.24 + Math.sin(sweep) * 0.42, 0.62);
    traveller.intensity = 1.5 + Math.sin(sweep) * 1.1;

    renderer.render(scene, camera);

    project(leanY, leanX, scale);
    const d = pathOf();
    tail.setAttribute('d', d);
    head.setAttribute('d', d);
    drawShafts(clock);
  }

  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || document.hidden || reduced.matches) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function size() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(rect.width || 56, rect.height || 56, false);
  }

  size();
  for (const shaft of shafts) roll(shaft, 0);
  if (arrived === 0) host.classList.add('is-arriving');
  draw(0);
  host.dataset.bismillah = 'three';

  if (hoverOn) {
    const on = () => { hovered = true; };
    const off = () => { hovered = false; };
    hoverOn.addEventListener('pointerenter', on);
    hoverOn.addEventListener('pointerleave', off);
    hoverOn.addEventListener('focus', on);
    hoverOn.addEventListener('blur', off);
  }

  start();
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', () => { size(); if (!running) draw(0); }, { passive: true });

  new MutationObserver(() => {
    const next = token('--c-brand', '#00ccff');
    material.color.set(next);
    material.emissive.set(next);
    rim.color.set(next);
    for (const stop of gradient.children) {
      if (stop.getAttribute('stop-color') !== '#ffffff') stop.setAttribute('stop-color', next);
    }
    if (!running) draw(0);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return {
    start, stop,
    dispose() { stop(); geometry.dispose(); material.dispose(); renderer.dispose(); },
  };
}
