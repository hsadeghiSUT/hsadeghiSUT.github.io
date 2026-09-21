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
 * field-gl.js — the built-in renderer for the field. No dependencies.
 *
 * This is what draws when Three.js has not been installed (README §12). It is
 * raw WebGL 1, supported by every browser since about 2013, and it runs the
 * shaders from `shaders.js` — the same ones the Three.js path runs — over the
 * geometry from `lattice.js`. The two renderers are interchangeable by design:
 * `index.js` drives whichever it got through the identical interface.
 *
 * Cost: two static buffers uploaded once, then one draw call per frame with a
 * handful of uniform writes. There is nothing to optimise here later.
 */

import { buildLattice, CELL } from './lattice.js';
import { VERT, FRAG } from './shaders.js';
import { matrices } from './camera.js';

function compile(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('fx shader:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {object|null} the renderer, or null if WebGL is unavailable — the
 *                        caller then removes the canvas and the site carries on
 *                        with no field at all.
 */
export function createRenderer(canvas) {
  const gl =
    canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true,
                                 powerPreference: 'low-power', depth: false }) ||
    canvas.getContext('experimental-webgl', { antialias: true, alpha: true });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('fx link:', gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const geo = buildLattice();
  const buffers = {};
  for (const [name, data, size] of [['position', geo.position, 3], ['aNormal', geo.normal, 3],
                                    ['aCentre', geo.centre, 3], ['aSeed', geo.seed, 4]]) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    buffers[name] = buf;
  }

  const u = {};
  for (const name of ['uProjection', 'uModelView', 'uTime', 'uAspect', 'uFocus',
                      'uHalf', 'uPx', 'uEnergy', 'uWake', 'uWakeEnergy', 'uSurge',
                      'uCell', 'uBase', 'uTint', 'uOpacity']) {
    u[name] = gl.getUniformLocation(program, name);
  }

  /* ── Blending, and the bug that lived here ───────────────────────────────
     Ordinary alpha blending, not additive: additive looks superb on the dark
     scheme and blows out to white on the light one. Depth testing is off —
     everything is drawn in one pass and blending order does not matter for a
     field this sparse.

     The subtlety is WHERE the alpha gets multiplied in. The canvas is
     transparent and the page shows through it, so the browser composites the
     drawing buffer over the page itself — and it needs to know whether the
     colours in that buffer already have their alpha multiplied through.

     This used to declare `premultipliedAlpha: false` while blending with
     SRC_ALPHA, which writes exactly the premultiplied product C·a into the
     buffer. The browser then dutifully multiplied by alpha a SECOND time. A
     star at five per cent alpha therefore contributed C·a² — a quarter of a
     per cent of its colour — while still removing a of the page behind it. The
     field was not emitting light at all: it was a very faint set of holes
     punched in the background. On white, holes read as grey stars and the
     effect looked like it worked. On the near-black dark page, taking five per
     cent off nothing and adding nothing is nothing, which is precisely what it
     looked like — the field appeared to exist only in light mode.

     So: the shader now premultiplies (`vec4(colour * alpha, alpha)`) and this
     is declared premultiplied, which is the pairing those two words describe.
     ONE rather than SRC_ALPHA for the colour term, because the multiply has
     already happened; ONE_MINUS_SRC_ALPHA for what is behind, unchanged. The
     alpha channel gets the same treatment so overlapping stars accumulate
     coverage correctly instead of squaring it.
     ---------------------------------------------------------------------- */
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  /* The stars are closed solids now, so their far faces would blend through
     their near ones and every one of them would look like glass. Culling the
     back half fixes it for the cost of one state change — and it works while
     they tumble, because culling tests the winding after projection. */
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.uniform1f(u.uCell, CELL);

  let aspect = 1;

  return {
    /**
     * @param {number} cssW  CSS pixels
     * @param {number} cssH  CSS pixels
     * @param {number} dpr   device pixel ratio, already capped by the caller
     */
    resize(cssW, cssH, dpr) {
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      aspect = cssW / Math.max(1, cssH);
    },

    /** Draw one frame. `state` comes from index.js and is renderer-agnostic. */
    draw(state) {
      const { projection, modelView } = matrices(aspect, state.yaw);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniformMatrix4fv(u.uProjection, false, projection);
      gl.uniformMatrix4fv(u.uModelView, false, modelView);
      gl.uniform1f(u.uTime, state.time);
      gl.uniform1f(u.uAspect, aspect);
      gl.uniform2f(u.uFocus, state.focus[0], state.focus[1]);
      gl.uniform2f(u.uHalf, state.half[0], state.half[1]);
      gl.uniform1f(u.uPx, state.px);
      gl.uniform1f(u.uEnergy, state.energy);
      gl.uniform2f(u.uWake, state.wake[0], state.wake[1]);
      gl.uniform1f(u.uWakeEnergy, state.wakeEnergy);
      gl.uniform1f(u.uSurge, state.surge || 0);
      gl.uniform3fv(u.uBase, state.base);
      gl.uniform3fv(u.uTint, state.tint);
      gl.uniform1f(u.uOpacity, state.opacity);
      gl.drawArrays(gl.TRIANGLES, 0, geo.count);
    },

    dispose() {
      Object.values(buffers).forEach((b) => gl.deleteBuffer(b));
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
