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
 * bayonet3d.js — the turned solid inside the back-to-top control.
 *
 * WHAT IT IS
 * ----------
 * A cyan bayonet, built as real geometry and turned slowly about its vertical
 * axis, standing inside a cyan ring. Three parts, from the top down:
 *
 *   the blade    a tall four-sided pyramid, apex up
 *   the guard    a very short pyramid the other way up, apex down — the flare
 *                between blade and stem that makes the silhouette a bayonet
 *                rather than a spike
 *   the stem     a short cylinder
 *
 * and around all of it a torus, seen face-on, which is the ring the brief asked
 * for. The meteor that runs clockwise around the OUTSIDE of that ring is CSS
 * (`.totop__ring` in components.css) and is the same trick as the header mark's
 * — a conic gradient turning inside a radial mask. It costs nothing and it runs
 * even when everything here fails.
 *
 * WHY THREE AND NOT CSS
 * ---------------------
 * A pyramid in CSS is a fan of triangles, each one a separate element with its
 * own transform, and the seams show at any size where the shape is legible.
 * Three is already loaded for the field and the header mark, `ConeGeometry` with
 * four radial segments *is* a pyramid, and the facets then catch real light as
 * they come round — which is the entire point of turning it.
 *
 * WHAT HAPPENS WITHOUT IT
 * -----------------------
 * The arrow that was there before. `backtotop.js` puts an ordinary sprite icon
 * in the button and this module replaces it only once it has a working context;
 * if Three is missing, or WebGL is, or the canvas fails, the button keeps the
 * arrow and the CSS ring keeps orbiting. Nothing is conditional on this file
 * succeeding.
 *
 * COST
 * ----
 * A 44-pixel canvas. The loop runs only while the button is actually on screen
 * — `pause()` and `resume()` are called from the same place that adds and
 * removes `is-shown` — so on a page you have not scrolled, nothing draws.
 */

import { loadThree } from './fx/three.js';

/** Seconds for one full turn. Slower than the header mark: this is smaller, and
 *  the same angular speed on a smaller object reads as faster. */
const TURN_SECONDS = 9;

/**
 * Build and start the bayonet inside `host`.
 *
 * @param {HTMLElement} host    the button
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<object|null>} `{ pause, resume, dispose }`, or null if the
 *                                 3D path is unavailable and the arrow should
 *                                 stay.
 */
export async function mountBayonet(host, canvas) {
  const THREE = await loadThree();
  if (!THREE) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('back-to-top: no WebGL, keeping the flat arrow.', err);
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(0, 0.05, 4.6);
  camera.lookAt(0, 0, 0);

  /* The accent, read from the stylesheet so the object follows the theme rather
     than carrying a second copy of the palette. */
  const readAccent = () => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--c-brand').trim() || '#22d3ee';
    try { return new THREE.Color(value); } catch { return new THREE.Color(0x22d3ee); }
  };

  /* ── flatShading is the whole difference ──────────────────────────────────
     Without it this object looks like a smooth cone rather than a pyramid, and
     the first version did. `ConeGeometry` builds four faces but gives their
     shared vertices AVERAGED normals, so the renderer blends the lighting
     smoothly across the joins — which is right for a cone and wrong for a
     solid whose whole character is its edges. `flatShading` makes each triangle
     carry one normal of its own, so each facet takes a single flat value of
     light and the joins between them become real edges: a hard line where two
     brightnesses meet.

     `roughness` is low and `metalness` high because a polished blade is what
     makes the difference between facets large. On a matte material every face
     lands within a few percent of every other and the edges disappear again by
     a different route. */
  const metal = new THREE.MeshStandardMaterial({
    color: readAccent(),
    roughness: 0.16,
    metalness: 0.72,
    flatShading: true,
  });

  const spinner = new THREE.Group();
  // A shade above centre: the blade is the tall part, so centring the geometry
  // leaves the object looking like it has sunk in the ring.
  spinner.position.y = 0.06;
  scene.add(spinner);

  /* ---- the solid ---------------------------------------------------------
     ConeGeometry's third argument is the number of radial segments; four makes
     it a pyramid rather than a cone, which is what the facets need — a cone has
     no edges to catch the light as it turns.
     --------------------------------------------------------------------- */
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.30, 1.35, 4), metal);
  blade.position.y = 0.42;
  blade.rotation.y = Math.PI / 4;      // a corner toward the viewer at rest
  spinner.add(blade);

  const guard = new THREE.Mesh(new THREE.ConeGeometry(0.40, 0.26, 4), metal);
  guard.position.y = -0.38;
  guard.rotation.x = Math.PI;          // apex down
  guard.rotation.y = Math.PI / 4;
  spinner.add(guard);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 18), metal);
  stem.position.y = -0.72;
  spinner.add(stem);

  /* ---- the ring ----------------------------------------------------------
     Face-on and outside everything, so the solid stands inside it. It does not
     turn with the bayonet: a ring that spins about the same axis would read as
     wobbling, and it is meant to be the thing the bayonet is standing in.
     --------------------------------------------------------------------- */
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.16, 0.085, 10, 44),
    /* The ring stays smooth-shaded: it is the one round thing here, and the
       brief called it a rounded ring. Faceting it would fight the blade for
       attention and make the whole control read as one crystalline lump. */
    new THREE.MeshStandardMaterial({
      color: readAccent(), roughness: 0.25, metalness: 0.6,
    }),
  );
  scene.add(ring);

  /* ---- light -------------------------------------------------------------
     Bright, and from in front: this object is 44 pixels across, and a subtle
     lighting rig at that size just produces a cyan blob. The key picks out one
     face of the pyramid at a time as it comes round, the fill keeps the ones
     turned away from going black, and the white rim from behind draws the
     silhouette against whatever the button is sitting on.
     --------------------------------------------------------------------- */
  // The ground colour is a lit cyan, not a dark one: it is standing in for
  // bounce off the disc behind it, and a dark ground turned the guard's
  // downward faces almost black — which reads as a hole punched in the object
  // rather than as a facet in shadow.
  /* The ambient term is low on purpose. Flat facets only read as facets if the
     lit one and the shaded one are far apart, and a strong ambient lifts them
     both toward the same value — which is the other way to lose the edges. */
  scene.add(new THREE.HemisphereLight(0xdff6fb, 0x123a46, 0.7));

  /* The key comes from the upper left and steeply across, so at any moment one
     face is bright, its neighbour is mid and the two turned away are dark:
     three different values meeting at the corners is what draws them. */
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(-1.6, 1.5, 1.9);
  scene.add(key);

  /* A weaker second key from the other side. A four-sided pyramid shows two
     faces at a time, and there is one rotation — corner to the viewer — where
     both of them are turned away from a single key and the whole object drops
     into shadow at once. This one is a third of the key's strength: enough that
     something is always lit, not enough to even the facets out. */
  const counter = new THREE.DirectionalLight(0xffffff, 1.15);
  counter.position.set(1.7, 1.0, 1.6);
  scene.add(counter);

  /* Just enough from below-front that the guard's underside is a dark facet
     rather than a hole punched through the object. */
  const fill = new THREE.DirectionalLight(0xbfeaf5, 0.7);
  fill.position.set(0.6, -1.8, 1.5);
  scene.add(fill);

  /* From behind and to the right: it catches the far edge as it comes round and
     separates the silhouette from whatever the button is sitting on. */
  const rim = new THREE.DirectionalLight(0xffffff, 2.0);
  rim.position.set(2.0, 0.3, -1.6);
  scene.add(rim);

  /* ---- the loop ---------------------------------------------------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  let last = 0;
  let running = false;
  let angle = 0.6;

  function size() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(rect.width || 34, rect.height || 34, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  function draw() {
    spinner.rotation.y = angle;
    renderer.render(scene, camera);
  }

  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    angle += (Math.PI * 2 / TURN_SECONDS) * dt;
    draw();
    raf = requestAnimationFrame(frame);
  }

  function resume() {
    if (running || reduced.matches || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  size();
  draw();
  host.dataset.bayonet = 'three';

  window.addEventListener('resize', () => { size(); if (!running) draw(); }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));

  /* The theme can change under it; re-read the accent rather than rebuilding. */
  new MutationObserver(() => {
    const c = readAccent();
    metal.color.copy(c);
    ring.material.color.copy(c);
    if (!running) draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return {
    pause,
    resume,
    dispose() { pause(); renderer.dispose(); },
  };
}
