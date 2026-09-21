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
 * mat4.js — the matrix operations the field needs.
 *
 * Used by BOTH renderers. The Three.js path could ask Three for its matrices,
 * but then the two paths would be computing the same camera two different ways
 * and could disagree; instead both are handed the same numbers from here. It
 * also means the site can draw the field with no library at all, in about 90
 * lines rather than 600 KB.
 *
 * Matrices are column-major Float32Array(16), the layout WebGL's
 * `uniformMatrix4fv` expects, so nothing is transposed on the way to the GPU.
 */

/** A fresh identity matrix. */
export const identity = () =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/**
 * Right-handed perspective projection.
 * @param {number} fovY   vertical field of view, radians
 * @param {number} aspect width / height
 */
export function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

/** Translation. */
export function translation(x, y, z) {
  const m = identity();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}

/** Rotation about the Y axis — the camera's yaw toward the pointer. */
export function rotationY(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  const m = identity();
  m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
  return m;
}

/** Rotation about the X axis — the plane's tilt away from the viewer. */
export function rotationX(rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  const m = identity();
  m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
  return m;
}

/** `out = a × b`, in that order: b is applied first, then a. */
export function multiply(a, b) {
  const m = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      m[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return m;
}
