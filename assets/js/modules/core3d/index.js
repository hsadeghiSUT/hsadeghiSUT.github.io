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
 * core3d/index.js — the career as a core sample, on the Background page.
 *
 * WHERE THIS SITS AND WHY
 * -----------------------
 * A panel above the lists, in the same place and the same clothes as the
 * publications explorer and the 3D roster: `.explorer__*` class names, a stage,
 * a readout and a reset. The three are the same idea in three places and should
 * look like one thing.
 *
 * It was going to go in the left gutter, as a strip you scroll past. It does
 * not, for two reasons. The gutter already holds the name column, which is a
 * signature of the site and not something to spend on one page; and a borehole
 * log is a thing you read labels off and click, which a 30-pixel margin cannot
 * support. A panel can.
 *
 * WHAT IT ADDS TO THE LIST BELOW IT
 * ---------------------------------
 * The list is complete and in order, and it still cannot show duration. Eleven
 * rows of "2018 – 2023" and "2017 – 2018" are eleven equal rows; the reader has
 * to do the arithmetic to see that one is five years and the next is one. The
 * core draws that arithmetic: bed thickness is time, so the shape of the career
 * — long foundations, a dense middle, a broad present — is the shape of the
 * object. Clicking a bed scrolls to the entry it came from, so it is also the
 * table of contents.
 *
 * ONE RENDERER
 * ------------
 * The Background page is the quietest of the seven and carries no other WebGL
 * panel, so this is not adding to the context pressure described in README §23.
 * It still stops its loop when it is off screen and when the tab is hidden.
 */

import { el } from '../dom.js';
import { icon } from '../icons.js';
import { guardContext, loadThree } from '../fx/three.js';
import { bedPlacement, buildStrata } from './strata.js';

/** The drawn height and radius of the whole core. */
const CORE_HEIGHT = 6.0;
const CORE_RADIUS = 0.92;

/** How far the camera looks down. */
const PITCH = -0.13;

/** Field of view, and how much room to leave around the core. */
const FOV = 32;
const MARGIN = 1.26;

/* The readout sits along the bottom of the stage, and a column drawn dead
   centre runs straight through it. Lifting the core a little clears the pill
   without moving the camera off the middle of the object. */
const CORE_LIFT = 0.34;

/** Radians per second while nobody is touching it. */
const IDLE_SPIN = 0.16;

const lerp = (a, b, t) => a + (b - a) * t;

/** Read a CSS custom property off <html>. */
function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}


/**
 * A soil face for one bed, drawn to a canvas.
 *
 * WHY THIS IS NOT OPTIONAL DECORATION
 * ----------------------------------
 * A smooth cylinder is rotationally symmetric: turning it about its own axis
 * produces a pixel-for-pixel identical image. The first version had no surface
 * detail at all, so dragging it — and the idle spin, and the arrow keys — all
 * worked perfectly and looked like nothing whatsoever was happening. Verified
 * by sampling the canvas before and after a 140-pixel drag: not one pixel
 * changed.
 *
 * So the grain is what makes the object turn. It also stops eleven flat bands
 * reading as painted plastic, which is the other half of the same complaint.
 *
 * WHAT IS DRAWN
 * -------------
 * Laminations across the bed, because sediment is laid down in layers and that
 * is the direction they run; clasts scattered through it, bigger and sparser
 * toward the sandy end of the ramp and finer toward the clays; and a wash of
 * mottling over everything so no two parts of the circumference look alike.
 *
 * Deterministic. A seeded generator rather than `Math.random`, so a bed looks
 * the same on every load and on every machine — a core sample that reshuffles
 * its own grain when you reload it is not a sample of anything.
 */
function bedTexture(THREE, bed, seed) {
  const W = 256;
  const H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  /* xorshift, so the pattern is fixed per bed. */
  let state = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };

  const [r, g, b] = bed.colour;
  const rgb = (m) => `rgb(${Math.round(Math.min(1, r * m) * 255)},`
    + `${Math.round(Math.min(1, g * m) * 255)},${Math.round(Math.min(1, b * m) * 255)})`;

  ctx.fillStyle = rgb(1);
  ctx.fillRect(0, 0, W, H);

  /* Laminations. Horizontal in texture space, which wraps around the core as
     bands at a constant depth — which is what a lamination is. */
  const bands = 5 + Math.floor(rnd() * 5);
  for (let i = 0; i < bands; i++) {
    const y = rnd() * H;
    const h = 1 + rnd() * 3;
    ctx.fillStyle = rgb(rnd() > 0.5 ? 1.13 : 0.84);
    ctx.globalAlpha = 0.30 + rnd() * 0.30;
    ctx.fillRect(0, y, W, h);
  }
  ctx.globalAlpha = 1;

  /* Clasts. The sandy units get coarse, frequent grains; the clays get few and
     fine — `grain` runs 0.15 at the dark clay to 0.92 at the topsoil. */
  const count = Math.round(140 + bed.grain * 620);
  const maxR = 0.5 + bed.grain * 2.4;
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const rad = 0.3 + rnd() * maxR;
    ctx.fillStyle = rgb(rnd() > 0.45 ? 1.0 + rnd() * 0.30 : 0.70 + rnd() * 0.18);
    ctx.globalAlpha = 0.35 + rnd() * 0.45;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* Mottling, so the two sides of the core are never the same. */
  for (let i = 0; i < 16; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const rad = 10 + rnd() * 46;
    const wash = ctx.createRadialGradient(x, y, 0, x, y, rad);
    wash.addColorStop(0, rgb(rnd() > 0.5 ? 1.10 : 0.86));
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * Mount the core.
 *
 * @param {HTMLElement} host      where the panel goes
 * @param {object} data           data/background.json
 * @param {HTMLElement} listRoot  the rendered lists, for click-to-scroll
 */
export async function mountCore(host, data, listRoot) {
  const strata = buildStrata(data);
  if (!host || strata.beds.length < 2) return { renderer: 'none' };

  const THREE = await loadThree();
  if (!THREE) {
    console.info('core: Three.js is unavailable, leaving the lists as they are.');
    return { renderer: 'none' };
  }

  /* ---- markup ------------------------------------------------------------ */
  const canvas = el('canvas', { class: 'explorer__canvas' });
  const readout = el('p', { class: 'explorer__readout', role: 'status', 'aria-live': 'polite' });
  const stage = el('div', { class: 'explorer__stage' }, canvas, readout);

  const hint = el(
    'p',
    { class: 'explorer__hint' },
    el('span', {}, 'Drag to turn'),
    el('span', {}, 'Point at a bed to read it'),
    el('span', {}, 'Click to open the entry'),
  );
  const resetButton = el(
    'button',
    { type: 'button', class: 'explorer__reset', title: 'Put the view back' },
    icon('fad-history'),
    el('span', { text: 'Reset view' }),
  );
  const controls = el('div', { class: 'explorer__controls' }, hint, resetButton);

  const panel = el(
    'section',
    { class: 'explorer', 'data-view': 'core' },
    el(
      'header',
      { class: 'explorer__head' },
      el('h2', { class: 'explorer__title', text: 'The career as a core sample' }),
      el('p', {
        class: 'explorer__caption',
        text: `${strata.span.from} at the bottom to ${strata.span.to} at the surface, `
          + `${strata.beds.length} beds over ${strata.years} years. A thick bed is a long `
          + 'appointment: the list below says when, this says how long.',
      }),
    ),
    stage,
    controls,
  );
  host.replaceChildren(panel);

  stage.setAttribute('role', 'application');
  stage.setAttribute('aria-label',
    'The career as a stratigraphic core. Arrow keys turn it.');

  /* ---- scene ------------------------------------------------------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('core: no WebGL, leaving the lists as they are.', err);
    host.replaceChildren();
    return { renderer: 'none' };
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  const core = new THREE.Group();
  core.position.y = CORE_LIFT;
  scene.add(core);

  /* ---- the beds ----------------------------------------------------------
     One open-ended cylinder per bed, stacked. Open-ended because the caps
     between two beds are never seen and a core with eleven internal lids in it
     costs geometry for nothing; the two ends of the whole column get their own.

     A bed is drawn slightly proud of its neighbours in alternation, the way a
     weathered core stands out where the harder units are. It is 4% and it is
     the difference between a column with beds in it and a painted cylinder. */
  const beds = [];
  const textures = [];
  strata.beds.forEach((bed, i) => {
    const { y, thickness } = bedPlacement(bed, strata.span, CORE_HEIGHT);
    const radius = CORE_RADIUS * (1 + (i % 2 ? 0.04 : 0) + bed.grain * 0.03);
    const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 40, 1, true);
    const texture = bedTexture(THREE, bed, i + 7);
    const material = new THREE.MeshStandardMaterial({
      /* White, because the colour is in the texture. Tinting a coloured map
         multiplies the colour in twice and the whole column goes muddy. */
      color: 0xffffff,
      map: texture,
      roughness: 0.94 - bed.grain * 0.25,
      metalness: 0.0,
      emissive: new THREE.Color(token('--c-accent', '#00ccff')),
      emissiveIntensity: 0,
      side: THREE.DoubleSide,
    });
    textures.push(texture);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.userData.bed = bed;
    core.add(mesh);
    beds.push({ bed, mesh, material, lit: 0 });
  });

  /* THE TWO ENDS OF THE COLUMN.
  
     The beds are open-ended tubes, which is right for the eleven joints nobody
     sees and wrong for the two that everybody does: without these the core just
     stops at the top, and what a reader sees is a column clipped by the edge of
     the stage rather than the whole of a career. The top cap is the surface,
     the bottom is the end of the hole. */
  const capFor = (bed, atTop) => {
    const { y, thickness } = bedPlacement(bed, strata.span, CORE_HEIGHT);
    const radius = CORE_RADIUS * (1 + bed.grain * 0.03);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(bed.colour[0], bed.colour[1], bed.colour[2])
          .multiplyScalar(atTop ? 1.16 : 0.72),
        roughness: 0.96,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
    );
    /* A circle is born facing +Z; the ends of a core face up and down. */
    disc.rotation.x = atTop ? -Math.PI / 2 : Math.PI / 2;
    disc.position.y = y + (atTop ? thickness / 2 : -thickness / 2);
    return disc;
  };
  core.add(capFor(strata.beds[strata.beds.length - 1], true));
  core.add(capFor(strata.beds[0], false));

  /* The partings. A dark line on every bed boundary, which is what actually
     makes a stack of cylinders read as a log rather than as a gradient. */
  const partingMat = new THREE.MeshBasicMaterial({ color: 0x1a1512, transparent: true, opacity: 0.55 });
  strata.beds.forEach((bed) => {
    const { y, thickness } = bedPlacement(bed, strata.span, CORE_HEIGHT);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(CORE_RADIUS * 1.075, CORE_RADIUS * 1.075, 0.015, 40, 1, true),
      partingMat,
    );
    ring.position.y = y + thickness / 2;
    core.add(ring);
  });

  /* ---- light --------------------------------------------------------------
     A cylinder shows its shape only through the gradient across it, so the
     ambient has to stay low enough for that gradient to exist. The first rig
     put a hemisphere at 1.7 against a key at 1.9 and the column came out
     evenly lit from every side — no terminator, no roundness, and the grain
     flattened into a printed pattern rather than a surface.
     
     So: a modest fill, a strong key well round to one side, and a cool rim
     from behind to lift the silhouette off a dark page. */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5b4a3a, 0.85));
  const key = new THREE.DirectionalLight(0xfff3e2, 2.5);
  key.position.set(-4.2, 2.6, 3.2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd8ee, 0.55);
  fill.position.set(3.0, 0.6, 2.4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.15);
  rim.position.set(2.6, 1.2, -3.4);
  scene.add(rim);

  /* ---- view -------------------------------------------------------------- */
  const view = { yaw: 0.6, spin: true };
  const HOME = { ...view };

  /**
   * How far back the camera has to stand for the whole core to be in shot.
   *
   * Computed, not chosen. A fixed distance is right for exactly one stage
   * shape, and this stage is a letterbox whose height depends on the viewport —
   * so the first version stood at 11.2 and clipped the top and bottom beds off
   * on a wide screen, which on a column whose whole point is its full extent is
   * the one failure that matters.
   *
   * The vertical fit is what binds: the core is six units tall and under two
   * wide, and the stage is wider than it is tall. Both are checked anyway, so a
   * narrow window frames on the width instead of pushing the core off the sides.
   */
  function distanceFor() {
    const half = (CORE_HEIGHT / 2 + CORE_LIFT) * MARGIN;
    const vertical = half / Math.tan((FOV * Math.PI) / 360);
    const halfWide = CORE_RADIUS * 1.12 * MARGIN;
    const horizontal = halfWide / (Math.tan((FOV * Math.PI) / 360) * Math.max(0.2, camera.aspect));
    return Math.max(vertical, horizontal);
  }

  function place() {
    const d = distanceFor();
    camera.position.set(0, -Math.sin(PITCH) * d, Math.cos(PITCH) * d);
    camera.lookAt(0, 0, 0);
    core.rotation.y = view.yaw;
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

  /* ---- interaction ------------------------------------------------------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;
  let dragging = false;
  let lastX = 0;
  let moved = 0;

  function summary() {
    readout.textContent = `${strata.beds.length} beds · ${strata.span.from} to `
      + `${strata.span.to} · thickness is time`;
  }
  summary();

  function setHovered(entry) {
    if (entry === hovered) return;
    hovered = entry;
    stage.classList.toggle('is-pointing', Boolean(entry));
    if (entry) {
      const b = entry.bed;
      const what = [b.lead, b.body].filter(Boolean).join(' — ');
      readout.textContent = `${b.periodText} · ${what} · ${b.unit}`;
    } else summary();
    invalidate();
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(beds.map((b) => b.mesh), false);
    return hits.length ? beds.find((b) => b.mesh === hits[0].object) : null;
  }

  canvas.addEventListener('pointermove', (event) => {
    if (dragging) {
      const dx = event.clientX - lastX;
      lastX = event.clientX;
      moved += Math.abs(dx);
      view.yaw += dx * 0.009;
      view.spin = false;
      invalidate();
      return;
    }
    setHovered(pick(event));
  });
  canvas.addEventListener('pointerleave', () => setHovered(null));
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    moved = 0;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', (event) => {
    dragging = false;
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* already gone */ }
    /* A drag that happened to end on a bed is not a click on it. Six pixels is
       the same threshold the roster uses for the same reason. */
    if (moved > 6) return;
    const entry = pick(event);
    if (entry) openEntry(entry.bed);
  });

  /**
   * Scroll to the list row a bed came from.
   *
   * Located by section id and position, not by text: two entries genuinely read
   * "Dual-Degree PhD" and matching on words would send both to the first one.
   */
  function openEntry(bed) {
    if (!listRoot) return;
    const section = listRoot.querySelector(`#${CSS.escape(bed.sectionId)}`)
      || listRoot.querySelector(`[id="${bed.sectionId}"]`);
    const list = section ? section.querySelector('.tl') : null;
    const row = list ? list.children[bed.order] : null;
    if (!row) return;
    row.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });

    /* The bed's own colour on the mark, so the row that lights up is visibly
       the one that was clicked. Same convention as the roster (fx.css). */
    const [r, g, b] = bed.colour;
    const hex = '#' + [r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
    row.style.setProperty('--roster-jump', hex);
    row.classList.add('is-jumped');
    setTimeout(() => {
      row.classList.remove('is-jumped');
      row.style.removeProperty('--roster-jump');
    }, 2600);
  }

  stage.tabIndex = 0;
  stage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      view.yaw += event.key === 'ArrowLeft' ? -0.2 : 0.2;
      view.spin = false;
      invalidate();
      event.preventDefault();
    }
  });

  resetButton.addEventListener('click', () => {
    view.yaw = HOME.yaw;
    view.spin = true;
    invalidate();
  });

  /* ---- the loop ---------------------------------------------------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let queued = false;
  let running = false;
  let onScreen = true;
  let last = 0;

  function invalidate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(tick);
  }

  function tick(now) {
    queued = false;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    let moving = false;

    if (view.spin && running && !reduced.matches) {
      view.yaw += IDLE_SPIN * dt;
      moving = true;
    }

    for (const entry of beds) {
      const want = hovered === entry ? 1 : 0;
      if (Math.abs(entry.lit - want) > 0.002) {
        entry.lit = reduced.matches ? want : lerp(entry.lit, want, Math.min(1, dt / 0.14));
        moving = true;
      } else entry.lit = want;
      entry.material.emissiveIntensity = entry.lit * 0.32;
      /* The bed under the pointer stands a little further out of the column,
         the way a picked-at core does. Scale only on the horizontal axes: a
         bed that also grew taller would push its neighbours' partings. */
      const s = 1 + entry.lit * 0.05;
      entry.mesh.scale.set(s, 1, s);
    }

    place();
    renderer.render(scene, camera);
    if (moving) invalidate();
  }

  /* Only while it is on screen, and never while the tab is hidden. A core
     turning slowly behind six screens of text is a wasted frame every frame. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      running = onScreen && !document.hidden;
      if (running) invalidate();
    }, { threshold: 0.05 }).observe(stage);
  } else {
    running = true;
  }
  document.addEventListener('visibilitychange', () => {
    running = onScreen && !document.hidden;
    if (running) invalidate();
  });

  window.addEventListener('resize', () => { size(); invalidate(); }, { passive: true });

  /* The stage's height is set by CSS that may not have settled when this first
     runs, and a camera framed against the wrong height is a clipped core. */
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { size(); invalidate(); }).observe(stage);
  }

  guardContext(canvas, {
    onLost() { running = false; host.replaceChildren(); },
  });

  size();
  place();
  invalidate();

  return {
    renderer: 'three',
    beds: beds.length,
    span: strata.span,
    dispose() {
      renderer.dispose();
      beds.forEach((b) => { b.mesh.geometry.dispose(); b.material.dispose(); });
      textures.forEach((t) => t.dispose());
    },
  };
}
