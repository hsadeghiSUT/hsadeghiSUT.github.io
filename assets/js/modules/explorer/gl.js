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
 * gl.js — the explorer's built-in renderer. No dependencies.
 *
 * Runs when Three.js has not been installed, and draws exactly what the Three
 * path draws: the same vertex arrays from scene.js through the same shaders
 * from shaders.js, framed by the same matrices from camera.js. Two draw calls
 * per frame — one for the edges, one for everything else.
 *
 * See README §15.
 */

import { QUAD_VERT, QUAD_FRAG, LINE_VERT, LINE_FRAG } from './shaders.js';

function compile(gl, type, source, label) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('explorer ' + label + ':', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl, vertSource, fragSource, label) {
  const vs = compile(gl, gl.VERTEX_SHADER, vertSource, label + ' vertex');
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSource, label + ' fragment');
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('explorer ' + label + ' link:', gl.getProgramInfoLog(program));
    return null;
  }
  return { program, vs, fs };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {object|null} null if WebGL is unavailable, so the caller can fall
 *                        back to the written summary.
 */
export function createRenderer(canvas) {
  const gl =
    canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true }) ||
    canvas.getContext('experimental-webgl', { antialias: true, alpha: true });
  if (!gl) return null;

  const quad = link(gl, QUAD_VERT, QUAD_FRAG, 'quad');
  const line = link(gl, LINE_VERT, LINE_FRAG, 'line');
  if (!quad || !line) return null;

  const uniformsOf = (program, names) => {
    const out = {};
    for (const name of names) out[name] = gl.getUniformLocation(program, name);
    return out;
  };
  const attribsOf = (program, names) => {
    const out = {};
    for (const name of names) out[name] = gl.getAttribLocation(program, name);
    return out;
  };

  const quadU = uniformsOf(quad.program, ['uProjection', 'uView', 'uRound', 'uLit', 'uOpacity']);
  const lineU = uniformsOf(line.program, ['uProjection', 'uView', 'uLit', 'uOpacity', 'uEdge']);
  const quadA = attribsOf(quad.program, ['position', 'aCorner', 'aSize', 'aColor', 'aState']);
  const lineA = attribsOf(line.program, ['position', 'aColor', 'aState']);

  gl.enable(gl.BLEND);
  /* Premultiplied, for the reason set out at length in fx/field-gl.js: the
     shader hands over colour that already has alpha multiplied through, and the
     browser must not do it a second time on the way to the screen. Declaring it
     one way and blending the other made the 255 edges here about eight times
     fainter than the number in the shader says, which is why they read as a
     faint web rather than as lines. */
  gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  // Depth testing is off and the blend is order-independent-ish on purpose:
  // everything here is translucent, and sorting a hundred billboards per frame
  // to get perfect ordering would cost more than the artefact it removes.
  gl.disable(gl.DEPTH_TEST);

  const buffers = {};
  const make = (name) => (buffers[name] = buffers[name] || gl.createBuffer());

  function upload(name, data, usage) {
    gl.bindBuffer(gl.ARRAY_BUFFER, make(name));
    gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
  }

  let scene = null;
  let look = { lit: [1, 1, 1], opacity: 1 };
  let width = 1;
  let height = 1;

  function bind(attr, name, size) {
    if (attr < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name]);
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, size, gl.FLOAT, false, 0, 0);
  }

  return {
    setScene(next) {
      scene = next;
      upload('qPosition', next.quads.position);
      upload('qCorner', next.quads.corner);
      upload('qSize', next.quads.size);
      upload('qColour', next.quads.colour);
      // The state array is the one thing that changes after upload — every
      // hover rewrites it — so it is declared DYNAMIC.
      upload('qState', next.quads.state, gl.DYNAMIC_DRAW);
      if (next.lines.count) {
        upload('lPosition', next.lines.position);
        upload('lColour', next.lines.colour);
        upload('lState', next.lines.state, gl.DYNAMIC_DRAW);
      }
    },

    /** Push the highlight arrays after they have been rewritten in place. */
    updateState() {
      if (!scene) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.qState);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, scene.quads.state);
      if (scene.lines.count) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.lState);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, scene.lines.state);
      }
    },

    setLook(next) { look = next; },

    resize(cssW, cssH, dpr) {
      width = Math.max(1, Math.round(cssW * dpr));
      height = Math.max(1, Math.round(cssH * dpr));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    },

    draw(view, projection) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!scene) return;

      if (scene.lines.count) {
        gl.useProgram(line.program);
        gl.uniformMatrix4fv(lineU.uProjection, false, projection);
        gl.uniformMatrix4fv(lineU.uView, false, view);
        gl.uniform3fv(lineU.uLit, look.lit);
        gl.uniform1f(lineU.uOpacity, look.opacity);
        gl.uniform1f(lineU.uEdge, scene.edgeAlpha == null ? 0.055 : scene.edgeAlpha);
        bind(lineA.position, 'lPosition', 3);
        bind(lineA.aColor, 'lColour', 3);
        bind(lineA.aState, 'lState', 1);
        gl.drawArrays(gl.LINES, 0, scene.lines.count);
      }

      gl.useProgram(quad.program);
      gl.uniformMatrix4fv(quadU.uProjection, false, projection);
      gl.uniformMatrix4fv(quadU.uView, false, view);
      gl.uniform1f(quadU.uRound, scene.round);
      gl.uniform3fv(quadU.uLit, look.lit);
      gl.uniform1f(quadU.uOpacity, look.opacity);
      bind(quadA.position, 'qPosition', 3);
      bind(quadA.aCorner, 'qCorner', 2);
      bind(quadA.aSize, 'qSize', 2);
      bind(quadA.aColor, 'qColour', 3);
      bind(quadA.aState, 'qState', 1);
      gl.drawArrays(gl.TRIANGLES, 0, scene.quads.count);
    },

    dispose() {
      Object.values(buffers).forEach((b) => gl.deleteBuffer(b));
      [quad, line].forEach((p) => {
        gl.deleteProgram(p.program);
        gl.deleteShader(p.vs);
        gl.deleteShader(p.fs);
      });
    },
  };
}
