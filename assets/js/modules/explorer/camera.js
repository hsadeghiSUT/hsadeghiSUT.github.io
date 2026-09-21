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
 * camera.js — the explorer's camera, and the projection both views share.
 *
 * An orbit camera: it looks at a target point from a distance, at a yaw and a
 * pitch. The graph spins it slowly and lets you drag it; the timeline flies it
 * along Z from one year to another. Both use the same code, so both frame
 * things the same way and the hit-testing below is correct for either.
 *
 * `project()` is the important part. Hovering is done by projecting every node
 * to the screen in JavaScript and taking the nearest one, rather than by
 * casting a ray through the scene. That is a deliberate choice:
 *
 *   - it is identical in the Three.js path and the fallback path, so hover
 *     cannot behave differently depending on which renderer is live;
 *   - it needs no picking buffer, no raycaster and no second render pass;
 *   - at a hundred nodes it costs a hundred matrix multiplies per pointer move,
 *     which is nothing.
 */

import { perspective, translation, rotationX, rotationY, multiply } from '../fx/mat4.js';

/** Vertical field of view, radians. */
export const FOV = Math.PI / 4.2;

/**
 * Build the view and projection matrices.
 *
 * @param {{yaw:number, pitch:number, distance:number, target:number[]}} cam
 * @param {number} aspect
 */
export function matrices(cam, aspect) {
  const projection = perspective(FOV, aspect, 0.1, 400);
  const view = multiply(
    translation(0, 0, -cam.distance),
    multiply(
      rotationX(cam.pitch),
      multiply(rotationY(cam.yaw), translation(-cam.target[0], -cam.target[1], -cam.target[2])),
    ),
  );
  return { projection, view };
}

/** Multiply a column-major mat4 by a vec4. */
function transform(m, x, y, z, w) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    m[2] * x + m[6] * y + m[10] * z + m[14] * w,
    m[3] * x + m[7] * y + m[11] * z + m[15] * w,
  ];
}

/**
 * World point to CSS pixels.
 *
 * @returns {{x:number, y:number, depth:number, visible:boolean}} depth is the
 *          distance in front of the camera, which the label layer uses to fade
 *          and to sort; `visible` is false for anything behind it.
 */
export function project(point, view, projection, width, height) {
  const v = transform(view, point[0], point[1], point[2], 1);
  const clip = transform(projection, v[0], v[1], v[2], v[3]);
  if (clip[3] <= 0.0001) return { x: 0, y: 0, depth: -v[2], visible: false };
  const ndcX = clip[0] / clip[3];
  const ndcY = clip[1] / clip[3];
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (0.5 - ndcY * 0.5) * height,
    depth: -v[2],
    visible: true,
  };
}

/** Ease for the fly-to. Fast out of the gate, gentle into the destination. */
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
