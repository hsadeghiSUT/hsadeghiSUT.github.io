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
 * heart3d.js — the heart in the footer, as a solid.
 *
 * "Built with ♥ by …" ended in a flat sprite that scaled up and down. This is
 * the same sentence with a real object in it: a rounded, glossy heart that
 * beats, with a highlight that travels across its upper right as though
 * something bright were moving past the room.
 *
 * WHY IT IS NOT AN EXTRUSION
 * --------------------------
 * The obvious build is a heart outline pushed back along Z. That gives a heart
 * -shaped slab: flat front, flat back, a rim around the edge — a 2D heart with
 * thickness, which is exactly what it looks like. A heart is a cushion, and a
 * cushion is round in the middle and thin at the edge.
 *
 * So the extrusion is only the starting point, and then every vertex is
 * INFLATED: pushed forward out of the plane by an amount that falls to zero at
 * the silhouette and peaks in the body of the shape. The front swells, the back
 * swells the other way, the edge stays an edge, and what comes out is a solid
 * that catches light across a curved surface instead of across a flat one. That
 * one pass is the difference between a badge and an object.
 *
 * THE BEAT
 * --------
 * Not a sine. A heart does not breathe, it beats: a hard contraction, a smaller
 * second one just after it, and then a long rest. Two offset pulses raised to a
 * power give exactly that, and the difference from a sine is immediate — a sine
 * reads as "throbbing", which is a different and slightly unpleasant thing.
 *
 * THE MOVING LIGHT
 * ----------------
 * A point light that travels a slow arc across the upper right and off, then
 * comes round again. Because the surface under it is curved, the specular it
 * leaves behind slides across the form and stretches as it goes — which is what
 * makes it read as a reflection of something moving rather than as a glint
 * painted on.
 *
 * WHAT HAPPENS WITHOUT IT
 * -----------------------
 * The sprite that was always there. This module replaces it only once it has a
 * working context, and `data-heart="three"` on the wrapper is what hides the
 * sprite — so there is never a moment with a gap in the sentence.
 *
 * COST
 * ----
 * A canvas about twenty pixels across, and it only runs while it is on screen
 * and the tab is visible. The footer is off-screen most of the time, which is
 * most of the point.
 */

import { loadThree } from './fx/three.js';

/** Seconds for one full beat-and-rest. */
const BEAT_SECONDS = 1.5;

/** Seconds for the travelling light to come round again. */
const SWEEP_SECONDS = 3.6;

/** Read a CSS custom property off <html>. */
function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Replace the sprite heart inside `host` with a modelled one.
 *
 * @param {HTMLElement} host    the wrapper holding the sprite and the canvas
 * @param {HTMLCanvasElement} canvas
 */
export async function mountHeart(host, canvas) {
  const THREE = await loadThree();
  if (!THREE) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('footer heart: no WebGL, keeping the flat one.', err);
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    /* Close enough that the heart fills the box, with headroom for the beat —
     it swells about a seventh at the top of a contraction. */
  camera.position.set(0, 0, 4.35);

  /* ---- the shape ----------------------------------------------------------
     The classic heart outline: two lobes meeting in a cusp at the top and
     running down to a point. Drawn cusp-up and then flipped, because that is
     how the curve is written everywhere and rewriting it upside down would be
     a gift to nobody. */
  const shape = new THREE.Shape();
  shape.moveTo(0.5, 0.5);
  shape.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
  shape.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
  shape.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
  shape.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, 0.7);
  shape.bezierCurveTo(1.6, 0.7, 1.6, 0, 1.0, 0);
  shape.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);

  /* The extrusion is thin and the bevel small on purpose. Both of them make a
     RIM, and a rim is the thing that stops a heart looking like a cushion — the
     roundness comes from the inflation below, not from here. What this pass is
     for is a clean silhouette with enough vertices in it to be inflated
     smoothly, which is why the curve segments are high and the depth is almost
     nothing. */
  /* ---- the solid ----------------------------------------------------------
     A SPHERE, squeezed into the heart's outline. Not an extrusion.

     Two earlier attempts are worth recording because both look reasonable in
     the code and wrong on the screen.

     Extruding the outline gives a heart-shaped SLAB: flat front, flat back, a
     rim around the edge. A 2D heart with thickness, which is exactly what it
     looks like.

     Inflating that slab — pushing its vertices out of the plane — fixes the
     silhouette and breaks the surface, because an extrusion is not one surface.
     Its caps and its side walls are separate runs of vertices that happen to
     meet at the rim, so displacing them by different amounts tears them apart
     and `computeVertexNormals` then draws a hard crease right around the shape.
     The result read as a folded shell rather than a solid.

     A sphere has no seam. Every vertex is part of one continuous surface, the
     normals come out smooth everywhere, and there is nothing to tear. So the
     heart is a sphere pushed into shape:

         x = dx · r(θ)        where d is the vertex's unit direction
         y = dy · r(θ)        and r(θ) is the heart's radius at that angle
         z = dz · DEPTH

     At the equator dz is zero and the cross-section is exactly the outline. As
     dz rises the section is the same outline scaled down — so it domes to a
     point at the crown, keeps the notch between the lobes all the way up, and
     is thickest through the middle. Which is what a heart is.
     -------------------------------------------------------------------- */

  /** How deep the heart is, against the radius of its widest point. */
  const DEPTH_RATIO = 0.62;

  /* The outline as a table of radius by angle, about a point inside it. The
     shape is star-shaped about its own centre — every ray from the middle
     crosses the outline once — which is what makes this mapping possible at
     all. Where a ray does cross twice, the outer crossing wins, so the notch
     stays a notch instead of turning inside out. */
  const outline = shape.getPoints(400);
  const box = new THREE.Box2().setFromPoints(outline);
  const mid = box.getCenter(new THREE.Vector2());

  const BINS = 720;
  const radius = new Float32Array(BINS);
  let widest = 0;
  for (const point of outline) {
    const dx = point.x - mid.x;
    const dy = point.y - mid.y;
    const r = Math.hypot(dx, dy);
    let bin = Math.floor(((Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * BINS);
    bin = Math.min(BINS - 1, Math.max(0, bin));
    if (r > radius[bin]) radius[bin] = r;
    if (r > widest) widest = r;
  }
  /* Fill any bin no sample landed in, from its neighbours. Four hundred points
     into seven hundred and twenty bins leaves gaps, and an empty bin is a
     radius of zero — a spike straight through the middle of the heart. */
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < BINS; i++) {
      if (radius[i] > 0) continue;
      const before = radius[(i - 1 + BINS) % BINS];
      const after = radius[(i + 1) % BINS];
      if (before > 0 && after > 0) radius[i] = (before + after) / 2;
      else radius[i] = Math.max(before, after);
    }
  }

  /** The outline's radius at an angle, interpolated between bins. */
  const radiusAt = (angle) => {
    const t = ((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * BINS;
    const i = Math.floor(t);
    const f = t - i;
    return radius[i % BINS] * (1 - f) + radius[(i + 1) % BINS] * f;
  };

  const geometry = new THREE.SphereGeometry(1, 72, 48);
  /* Poles onto the depth axis. Left along Y they would cluster all their
     vertices at the heart's left and right extremes, where the shape needs them
     least, and leave the crown coarse. */
  geometry.rotateX(Math.PI / 2);

  {
    const position = geometry.attributes.position;
    const depth = widest * DEPTH_RATIO;
    for (let i = 0; i < position.count; i++) {
      const dx = position.getX(i);
      const dy = position.getY(i);
      const dz = position.getZ(i);
      const r = radiusAt(Math.atan2(dy, dx));
      position.setXYZ(i, dx * r, dy * r, dz * depth);
    }
    position.needsUpdate = true;
    /* Recomputed, and not optional. Moving vertices and keeping the old normals
       is the classic way to end up with the right silhouette lit like the shape
       it used to be — here, a sphere. */
    geometry.computeVertexNormals();
  }

  geometry.center();
  geometry.rotateZ(Math.PI);          // the curve is written cusp-up; point down
  geometry.scale(0.92, 0.92, 0.92);

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(token('--c-heart', '#e11d48')),
    roughness: 0.16,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xff8090),
  });

  const heart = new THREE.Mesh(geometry, material);
  heart.rotation.x = -0.12;
  heart.rotation.y = 0.24;
  scene.add(heart);

  /* ---- light --------------------------------------------------------------
     Enough ambient that the shape never goes to a silhouette, a key from the
     upper left for the form, and the traveller — a point light on an arc across
     the upper right, which is the one the brief is about. */
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-1.6, 1.8, 2.6);
  scene.add(key);
  /* A dim counter from below-right so the lower lobe never goes to a
     silhouette against a dark footer. */
  const fill = new THREE.DirectionalLight(0xffd7de, 0.5);
  fill.position.set(1.6, -1.6, 1.2);
  scene.add(fill);
  const traveller = new THREE.PointLight(0xffffff, 26, 12, 2);
  scene.add(traveller);

  /* ---- the loop ----------------------------------------------------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0;
  let running = false;
  let clock = 0;
  let last = 0;

  /**
   * The beat.
   *
   * Two pulses, the second smaller and just after the first, then a long rest —
   * a lub-dub rather than a throb. `pow` on a raised cosine is what makes each
   * one a thump with a fast attack instead of a smooth swell.
   */
  function beat(t) {
    const phase = (t % BEAT_SECONDS) / BEAT_SECONDS;
    const thump = (at, width, height) => {
      const d = Math.abs(phase - at);
      const near = Math.max(0, 1 - d / width);
      return Math.pow(near, 2.2) * height;
    };
    return thump(0.10, 0.13, 1.0) + thump(0.28, 0.11, 0.55);
  }

  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    clock += dt;

    const pulse = beat(clock);
    const scale = 1 + pulse * 0.13;
    // A heart widens more than it lengthens as it contracts.
    heart.scale.set(scale * 1.03, scale * 0.98, scale);
    heart.rotation.y = 0.24 + Math.sin(clock * 0.55) * 0.20;

    /* The traveller runs an arc across the upper right and out, then comes
       round again. It passes close to the surface at the middle of its run,
       which is where the highlight is tightest and brightest. */
    const sweep = (clock % SWEEP_SECONDS) / SWEEP_SECONDS;
    const angle = -0.55 + sweep * 2.5;
    traveller.position.set(
      Math.cos(angle) * 2.5,
      0.7 + Math.sin(angle) * 1.5,
      2.1 + Math.sin(sweep * Math.PI) * 0.9,
    );
    traveller.intensity = 14 + Math.sin(sweep * Math.PI) * 20;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || document.hidden) return;
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
    renderer.setSize(rect.width || 20, rect.height || 20, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  size();
  renderer.render(scene, camera);
  host.dataset.heart = 'three';

  /* Only while it is on screen. The footer is below everything, so on most
     visits this never runs at all — and a beating heart nobody is looking at is
     the definition of a wasted frame. */
  if ('IntersectionObserver' in window && !reduced.matches) {
    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) start();
      else stop();
    }, { rootMargin: '80px' }).observe(canvas);
  } else if (!reduced.matches) {
    start();
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', () => { size(); if (!running) renderer.render(scene, camera); }, { passive: true });

  new MutationObserver(() => {
    material.color.set(token('--c-heart', '#e11d48'));
    if (!running) renderer.render(scene, camera);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return { start, stop, dispose() { stop(); geometry.dispose(); material.dispose(); renderer.dispose(); } };
}
