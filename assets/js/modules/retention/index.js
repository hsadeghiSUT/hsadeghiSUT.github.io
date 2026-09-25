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
 * retention/index.js — the soil-water retention surface, on the Summary page.
 *
 * The one object on this site that is about the work rather than about the
 * career. `model.js` has the physics and the note about what the numbers are;
 * this draws it.
 *
 * WHY THE TWO MARKED CURVES MATTER MORE THAN THE SURFACE
 * -----------------------------------------------------
 * A surface alone reads as "there is a relationship here". The finding is
 * sharper than that, and it is the subject of the group's most-cited paper: the
 * SAME soil, packed two ways, holds water differently. So two void ratios are
 * drawn as solid curves across the surface — a denser packing and a looser one
 * — and the gap between them at any suction is the whole result. Everything
 * else is the surface they sit on.
 */

import { el } from '../dom.js';
import { icon } from '../icons.js';
import { guardContext, loadThree } from '../fx/three.js';
import { airEntry, alphaFor, placeSample, sampleSurface, saturation } from './model.js';
import { buildCrackFloor } from './cracks.js';

/** The box the surface is drawn in. */
const BOX = { width: 7.2, height: 3.4, depth: 4.4 };

/** Grid resolution. 72 x 40 is 2 880 vertices — nothing, and it reads smooth. */
const COLS = 72;
const ROWS = 40;

const FOV = 34;
const MARGIN = 1.22;

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Wet to dry, as a colour.
 *
 * Blue for water and a dry tan for soil, because that is what the axis means
 * and there is no reason to invent a scheme for it. Fixed rather than themed:
 * the ramp is the legend, and a legend that changes with the colour scheme is
 * not one.
 */
function wetness(sr) {
  const stops = [
    [0.74, 0.62, 0.44],  // dry — the same tan the core sample uses
    [0.42, 0.66, 0.62],
    [0.13, 0.55, 0.78],  // saturated
  ];
  const x = Math.max(0, Math.min(1, sr)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  return [
    lerp(stops[i][0], stops[i + 1][0], f),
    lerp(stops[i][1], stops[i + 1][1], f),
    lerp(stops[i][2], stops[i + 1][2], f),
  ];
}

const fmtSuction = (kpa) => (kpa >= 1000
  ? `${Math.round(kpa / 1000)} MPa`
  : kpa >= 10 ? `${Math.round(kpa)} kPa` : `${kpa.toFixed(1)} kPa`);

/**
 * Mount the surface.
 *
 * @param {HTMLElement} host
 * @param {object} p  data/retention.json
 */
export async function mountRetention(host, p) {
  if (!host || !p) return { renderer: 'none' };

  const THREE = await loadThree();
  if (!THREE) {
    console.info('retention: Three.js is unavailable; the panel is not built.');
    return { renderer: 'none' };
  }

  const grid = sampleSurface(p, COLS, ROWS);

  /* ---- markup ------------------------------------------------------------ */
  const canvas = el('canvas', { class: 'explorer__canvas' });
  const readout = el('p', { class: 'explorer__readout', role: 'status', 'aria-live': 'polite' });
  const stage = el('div', { class: 'explorer__stage' }, canvas, readout);

  const hint = el(
    'p',
    { class: 'explorer__hint' },
    el('span', {}, 'Drag to turn'),
    el('span', {}, 'Point at the surface to read it'),
  );
  const resetButton = el(
    'button',
    { type: 'button', class: 'explorer__reset', title: 'Put the view back' },
    icon('fad-history'),
    el('span', { text: 'Reset view' }),
  );
  const controls = el('div', { class: 'explorer__controls' }, hint, resetButton);

  /* The provenance line. It is part of the figure, not a footnote: a surface
     on a soil scientist's own page has to say whether it is a measurement. */
  const provenance = p.source
    ? `Parameters: ${p.source}.`
    : 'Illustrative parameters — this shows the shape of the relationship, not a measurement.';

  const panel = el(
    'section',
    { class: 'explorer', 'data-view': 'retention' },
    el(
      'header',
      { class: 'explorer__head' },
      el('h2', { class: 'explorer__title', text: p.title || 'How a soil holds water' }),
      el('p', {
        class: 'explorer__caption',
        text: 'Degree of saturation against matric suction (left to right, 0.1 kPa to 100 MPa) '
          + 'and void ratio (front to back). The same soil packed loosely lets go of its water at '
          + 'a lower suction than the same soil packed dense — the gap between the pale curve '
          + `(denser) and the amber one (looser) is that difference. `
          + `${p.model ? p.model + '. ' : ''}${provenance}`,
      }),
    ),
    stage,
    controls,
  );
  host.replaceChildren(panel);

  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label',
    'A soil-water retention surface: degree of saturation against matric suction and void ratio. '
    + 'Looser soil desaturates at lower suction.');

  /* ---- scene ------------------------------------------------------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('retention: no WebGL; the panel is not built.', err);
    host.replaceChildren();
    return { renderer: 'none' };
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const world = new THREE.Group();
  scene.add(world);

  /* ---- the surface -------------------------------------------------------
     A plain indexed grid. Vertex colours carry the saturation, so the ramp is
     the legend and no separate key is needed. */
  const positions = new Float32Array(COLS * ROWS * 3);
  const colours = new Float32Array(COLS * ROWS * 3);
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const v = j * COLS + i;
      const [x, y, z] = placeSample(i, j, grid, p, BOX);
      positions[v * 3] = x; positions[v * 3 + 1] = y; positions[v * 3 + 2] = z;
      const [r, g, b] = wetness(grid.sat[v]);
      colours[v * 3] = r; colours[v * 3 + 1] = g; colours[v * 3 + 2] = b;
    }
  }
  const indices = [];
  for (let j = 0; j < ROWS - 1; j++) {
    for (let i = 0; i < COLS - 1; i++) {
      const a = j * COLS + i;
      indices.push(a, a + COLS, a + 1, a + 1, a + COLS, a + COLS + 1);
    }
  }
  const surfaceGeo = new THREE.BufferGeometry();
  surfaceGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surfaceGeo.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  surfaceGeo.setIndex(indices);
  surfaceGeo.computeVertexNormals();

  const surfaceMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.05,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.94,
  });
  const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
  world.add(surface);

  /* A light wireframe over it. Without it the surface is a smooth sheet with
     no sense of where the decades of suction fall; with it, it reads as a
     plotted grid, which is what it is. */
  const wireGeo = new THREE.BufferGeometry();
  const wirePts = [];
  const STEP_I = 6;
  const STEP_J = 4;
  for (let j = 0; j < ROWS; j += STEP_J) {
    for (let i = 0; i < COLS - 1; i++) {
      wirePts.push(...placeSample(i, j, grid, p, BOX), ...placeSample(i + 1, j, grid, p, BOX));
    }
  }
  for (let i = 0; i < COLS; i += STEP_I) {
    for (let j = 0; j < ROWS - 1; j++) {
      wirePts.push(...placeSample(i, j, grid, p, BOX), ...placeSample(i, j + 1, grid, p, BOX));
    }
  }
  wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3));
  const wire = new THREE.LineSegments(
    wireGeo,
    new THREE.LineBasicMaterial({ color: 0x0b1620, transparent: true, opacity: 0.30 }),
  );
  world.add(wire);

  /* ---- the two marked curves --------------------------------------------- */
  const markCurves = [];
  for (const mark of (p.marks || [])) {
    /* Nearest sampled row, so the curve lies ON the surface rather than a hair
       above or below it — a curve floating off its own surface is a bug the eye
       finds immediately. */
    let row = 0;
    let best = Infinity;
    for (let j = 0; j < ROWS; j++) {
      const d = Math.abs(grid.voids[j] - mark.e);
      if (d < best) { best = d; row = j; }
    }
    const pts = [];
    for (let i = 0; i < COLS; i++) {
      const [x, y, z] = placeSample(i, row, grid, p, BOX);
      pts.push(x, y + 0.012, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    /* The looser curve is amber and the denser one is near-white. NOT cyan for
       the dense one, which was the first choice and is invisible: the dense
       curve spends most of its length on the saturated part of the surface,
       which is already blue. A marked curve has to contrast with the surface it
       is drawn on, not with the other curve. */
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: mark.e > p.eRef ? 0xffb020 : 0xf2f7fa,
      linewidth: 2,
    }));
    world.add(line);
    markCurves.push({ mark, row, geo, line });
  }

  /* ---- the crack floor ---------------------------------------------------
     Under the surface, cracking where the soil above it is dry. Same model,
     same uniforms — see cracks.js for why it lives here and not behind the
     page. Added before the lights because it is unlit: a shader material with
     its own colour, which is what a crack pattern wants. */
  const floor = buildCrackFloor(THREE, p, BOX, [0.62, 0.52, 0.38]);
  world.add(floor.mesh);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x35414d, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3.5, 5.0, 4.0);
  scene.add(key);

  /* ---- view -------------------------------------------------------------- */
  const HOME = { yaw: -0.62, pitch: 0.42 };
  const view = { ...HOME };

  function distanceFor() {
    const half = Math.max(BOX.height, BOX.depth * 0.7) / 2 * MARGIN;
    const vertical = half / Math.tan((FOV * Math.PI) / 360);
    const horizontal = (BOX.width / 2) * MARGIN
      / (Math.tan((FOV * Math.PI) / 360) * Math.max(0.2, camera.aspect));
    return Math.max(vertical, horizontal);
  }

  function place() {
    const d = distanceFor();
    const cp = Math.cos(view.pitch);
    camera.position.set(
      Math.sin(view.yaw) * cp * d,
      Math.sin(view.pitch) * d,
      Math.cos(view.yaw) * cp * d,
    );
    camera.lookAt(0, 0, 0);
  }

  function size() {
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---- interaction -------------------------------------------------------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function summary() {
    const dense = alphaFor(p.voidMin, p);
    const loose = alphaFor(p.voidMax, p);
    readout.textContent = `Air-entry value: ${Math.round(airEntry(dense))} kPa when dense, `
      + `${Math.round(airEntry(loose))} kPa when loose`;
  }
  summary();

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', (event) => {
    dragging = false;
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* gone */ }
  });
  canvas.addEventListener('pointerleave', () => summary());
  canvas.addEventListener('pointermove', (event) => {
    if (dragging) {
      view.yaw -= (event.clientX - lastX) * 0.008;
      view.pitch = Math.max(-0.15, Math.min(1.25, view.pitch + (event.clientY - lastY) * 0.005));
      lastX = event.clientX;
      lastY = event.clientY;
      invalidate();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(surface, false)[0];
    if (!hit) { summary(); return; }

    /* Back out the axes from where the ray landed. The box is a known mapping,
       so this is arithmetic rather than a search through 2 880 vertices. */
    const local = world.worldToLocal(hit.point.clone());
    const tx = local.x / BOX.width + 0.5;
    const tz = local.z / BOX.depth + 0.5;
    const logMin = Math.log10(p.suctionMin);
    const logMax = Math.log10(p.suctionMax);
    const psi = Math.pow(10, lerp(logMin, logMax, Math.max(0, Math.min(1, tx))));
    const e = lerp(p.voidMin, p.voidMax, Math.max(0, Math.min(1, tz)));
    const sr = saturation(psi, alphaFor(e, p), p.n, p.residual);
    readout.textContent = `${fmtSuction(psi)} · void ratio ${e.toFixed(2)} · `
      + `${Math.round(sr * 100)}% saturated`;
    invalidate();
  });

  resetButton.addEventListener('click', () => {
    view.yaw = HOME.yaw;
    view.pitch = HOME.pitch;
    summary();
    invalidate();
  });

  /* ---- the loop ----------------------------------------------------------- */
  let queued = false;
  function invalidate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      place();
      renderer.render(scene, camera);
    });
  }

  window.addEventListener('resize', () => { size(); invalidate(); }, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { size(); invalidate(); }).observe(stage);
  }

  guardContext(canvas, {
    onLost() { host.replaceChildren(); },
    onRestored() { size(); invalidate(); },
  });

  size();
  invalidate();

  return {
    renderer: 'three',
    vertices: COLS * ROWS,
    marks: markCurves.length,
    dispose() {
      renderer.dispose();
      surfaceGeo.dispose();
      surfaceMat.dispose();
      wireGeo.dispose();
      markCurves.forEach((m) => m.geo.dispose());
      floor.geometry.dispose();
      floor.material.dispose();
    },
  };
}
