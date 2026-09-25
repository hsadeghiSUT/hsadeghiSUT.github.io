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
 * three.js — finds Three.js, or reports honestly that it is not there.
 *
 * ── Installing Three.js ─────────────────────────────────────────────────────
 * Modern Three.js releases ship the library as TWO files, not one. `three.
 * module.js` is only the WebGL renderer half; it begins with
 *
 *     import { Matrix3, Vector2, … } from './three.core.js';
 *
 * so on its own it cannot load. Both files must sit side by side:
 *
 *     assets/vendor/three/three.module.js
 *     assets/vendor/three/three.core.js
 *
 * Download them from the same release, e.g.
 *
 *     https://unpkg.com/three@0.180.0/build/three.module.js
 *     https://unpkg.com/three@0.180.0/build/three.core.js
 *
 * and save Three's LICENSE beside them, as assets/vendor/fonts/ does for the
 * typefaces. Three.js is MIT-licensed. Full instructions are in README §12.
 *
 * ── If it is not installed ──────────────────────────────────────────────────
 * Nothing breaks. `loadThree()` returns null, and the field is drawn by
 * `field-gl.js` instead — same lattice, same shaders, same camera, a few KB
 * instead of ~1.2 MB. Check which one is live from the browser console:
 *
 *     window.__fx.renderer      // → 'three' | 'webgl' | 'none'
 */

/** Where the library is expected. Relative to this file. */
export const THREE_URL = '../../../vendor/three/three.module.js';

/**
 * Try to load Three.js.
 *
 * The library is recognised by its *exports*, not by the file being present, so
 * a placeholder, a half-finished download, or `three.module.js` without its
 * `three.core.js` companion all fall back the same way instead of throwing
 * something obscure into the console at load time.
 *
 * @returns {Promise<object|null>}
 */
export async function loadThree() {
  try {
    const mod = await import(/* @vite-ignore */ THREE_URL);
    if (!mod || typeof mod.WebGLRenderer !== 'function') return null;
    return mod;
  } catch (err) {
    // Most commonly: three.core.js is missing. Say so once, quietly — it is a
    // fixable installation problem, not an error in the page.
    console.info(
      'fx: Three.js not loaded (' + (err && err.message ? err.message : 'unavailable') +
      '). Using the built-in renderer. See README §12.',
    );
    return null;
  }
}

/**
 * Survive a lost WebGL context.
 *
 * ── Why this is needed ──────────────────────────────────────────────────────
 * A browser may take a WebGL context away at any time, and phones do it
 * routinely: the GPU process is restarted under memory pressure, the tab goes
 * to the background, or — the case that bit this site — the page asks for more
 * contexts than the device allows and the browser drops the oldest ones to
 * stay under the cap.
 *
 * This site is generous with contexts. Ten modules each build their own
 * renderer (`logo3d`, `bismillah`, `heart3d`, `copyright3d`, `bayonet3d`,
 * `namecolumn`, `roster`, `icons3d`, the explorer and the field), and the
 * Research Team page ends up with about 30 canvases. Mobile Chrome allows on
 * the order of 8–16 live contexts. Scroll far enough on a phone and some of
 * the earlier marks lose theirs.
 *
 * ── Why losing it looked like a broken image ────────────────────────────────
 * Each mark draws a flat poster first and reveals the canvas once WebGL is
 * running — `.brandmark[data-brandmark="three"] .brandmark__poster` is set to
 * `opacity: 0`. When the context went away, the canvas stopped drawing but the
 * element stayed in its "three" state, so the poster stayed hidden too: a
 * blank box where the mark had been, on an element that was working a moment
 * earlier. Reloading built the contexts again and everything came back, which
 * is exactly what was reported.
 *
 * ── What this does ──────────────────────────────────────────────────────────
 * `webglcontextlost` has a default action of "this context is gone for good".
 * Calling `preventDefault()` is what lets the browser hand it back later and
 * fire `webglcontextrestored`. So: stop drawing, put the flat mark back on
 * screen, and — if the context returns — go back to the live one.
 *
 * The mark is never left showing nothing.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{onLost?: Function, onRestored?: Function}} handlers
 * @returns {Function} removes both listeners
 */
export function guardContext(canvas, { onLost, onRestored } = {}) {
  if (!canvas || !canvas.addEventListener) return () => {};

  const lost = (event) => {
    // Without this the context is unrecoverable and `webglcontextrestored`
    // never fires — the single most important line in this function.
    event.preventDefault();
    try {
      if (onLost) onLost();
    } catch (err) {
      console.info('fx: context-loss fallback failed.', err);
    }
  };

  const restored = () => {
    try {
      if (onRestored) onRestored();
    } catch (err) {
      console.info('fx: context-restore failed; staying on the flat mark.', err);
    }
  };

  canvas.addEventListener('webglcontextlost', lost, false);
  canvas.addEventListener('webglcontextrestored', restored, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('webglcontextrestored', restored);
  };
}
