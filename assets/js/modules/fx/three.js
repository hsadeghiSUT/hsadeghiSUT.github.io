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
