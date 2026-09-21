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
 * camera.js — the one camera both renderers use.
 *
 * Kept out of the renderers so that the Three.js path and the fallback path
 * cannot end up looking at the lattice from slightly different places. Both
 * call `matrices()` and upload what it returns.
 */

import { perspective, translation, rotationX, rotationY, multiply } from './mat4.js';
import { CAMERA_Z, TILT } from './lattice.js';

/** Vertical field of view, radians. */
export const FOV = Math.PI / 4.5;

/**
 * Half the height of the plane that is actually visible, in plane units.
 *
 * Exported because `index.js` has to turn a rectangle on screen — the card the
 * pointer is over — into a point in the plane's own coordinates. Without this
 * the highlight would land near the hovered element rather than on it.
 */
export const VISIBLE_HALF = Math.tan(FOV / 2) * CAMERA_Z;

/**
 * Convert a point in CSS pixels to the plane's coordinates.
 *
 * @param {number} x, y   position in the viewport, CSS pixels
 * @param {number} w, h   viewport size, CSS pixels
 * @returns {[number, number]}
 */
export function screenToPlane(x, y, w, h) {
  const nx = (x / Math.max(1, w)) * 2 - 1;
  const ny = 1 - (y / Math.max(1, h)) * 2;
  const aspect = w / Math.max(1, h);
  return [nx * VISIBLE_HALF * aspect, ny * VISIBLE_HALF];
}

/**
 * @param {number} aspect  viewport width / height
 * @param {number} yaw     radians the camera swings toward the pointer. This is
 *                         the parallax: move the mouse and the plane turns very
 *                         slightly, which is what tells the eye it has depth.
 * @returns {{projection: Float32Array, modelView: Float32Array}}
 */
export function matrices(aspect, yaw) {
  const projection = perspective(FOV, aspect, 0.1, 20);
  const modelView = multiply(
    translation(0, 0, -CAMERA_Z),
    multiply(rotationY(yaw), rotationX(TILT)),
  );
  return { projection, modelView };
}
