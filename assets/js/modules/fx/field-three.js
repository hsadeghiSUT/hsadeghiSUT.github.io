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
 * field-three.js — the Three.js renderer for the field.
 *
 * Same lattice, same shaders, same camera as `field-gl.js`; what Three brings
 * is its renderer — colour-space and pixel-ratio handling, context-loss
 * recovery, and a well-trodden path for anyone who later wants to add real
 * lights, post-processing or a second object to the scene.
 *
 * `RawShaderMaterial` is used rather than `ShaderMaterial` on purpose. It is the
 * one Three material that injects nothing — no built-in matrices, no prepended
 * defines — so the GLSL in `shaders.js` is compiled here exactly as it is
 * compiled in the fallback path. Two renderers, one shader.
 *
 * Installing Three.js: see README §12. It is two files, dropped into
 * assets/vendor/three/. Nothing here runs until they are there.
 */

import { buildLattice, CELL } from './lattice.js';
import { VERT, FRAG } from './shaders.js';
import { matrices } from './camera.js';

export function createRenderer(THREE, canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    /* True, matching the fallback's context and matching what the shader
       actually writes: it premultiplies (`vec4(colour * alpha, alpha)`), so the
       browser must not multiply by alpha again on the way to the screen.
       Declaring `false` here while blending premultiplied values is what made
       the field a set of faint holes in the page rather than light on top of
       it — see the long note in field-gl.js. Three picks its blend factors from
       this flag, so the two renderers stay in step by setting it, not by
       hand-writing blend functions here. */
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  // The projection lives in a uniform, not in this camera — see camera.js.
  // Three still needs *a* camera to render through, so it gets an identity one.
  const camera = new THREE.Camera();

  const geo = buildLattice();
  const geometry = new THREE.BufferGeometry();
  // `position` is not optional here, whatever the shader does with it: Three
  // takes the vertex count from this attribute, and a geometry without one is
  // drawn zero times with no error anywhere. See lattice.js.
  geometry.setAttribute('position', new THREE.BufferAttribute(geo.position, 3));
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(geo.normal, 3));
  geometry.setAttribute('aCentre', new THREE.BufferAttribute(geo.centre, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(geo.seed, 4));
  geometry.setDrawRange(0, geo.count);

  const uniforms = {
    uProjection: { value: new THREE.Matrix4() },
    uModelView: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uFocus: { value: new THREE.Vector2(0, 0) },
    uHalf: { value: new THREE.Vector2(0.2, 0.06) },
    uPx: { value: 0.0025 },
    uEnergy: { value: 0 },
    uWake: { value: new THREE.Vector2(0, 0) },
    uWakeEnergy: { value: 0 },
    uSurge: { value: 0 },
    uCell: { value: CELL },
    uBase: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
    uTint: { value: new THREE.Vector3(0.2, 0.8, 0.9) },
    uOpacity: { value: 1 },
  };

  const material = new THREE.RawShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    /* Two different flags, both required, and the difference is the whole bug.
       The one on the WebGLRenderer above declares what the CANVAS holds, so the
       browser knows how to composite it over the page. This one, on the
       MATERIAL, is what Three reads when it picks blend factors — and it
       defaults to false. With it left alone Three blended with SRC_ALPHA while
       the shader was already handing it premultiplied colour, so alpha went in
       twice and the field came out as faint holes in the page instead of light
       on it. Setting the renderer's flag alone changes nothing here; it is this
       one that turns SRC_ALPHA into ONE. */
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    // The stars are closed solids: without culling, their far faces blend
    // through their near ones and each looks like glass. FrontSide is Three's
    // default, but this is load-bearing here, so it is said out loud.
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  // The shader positions every vertex itself, so Three's frustum culling has
  // nothing meaningful to test against and would sometimes cull the whole mesh.
  mesh.frustumCulled = false;
  scene.add(mesh);

  let aspect = 1;

  return {
    /** Same signature as the fallback: CSS pixels plus the ratio to draw at. */
    resize(cssW, cssH, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(cssW, cssH, false);
      aspect = cssW / Math.max(1, cssH);
    },

    draw(state) {
      const { projection, modelView } = matrices(aspect, state.yaw);
      uniforms.uProjection.value.fromArray(projection);
      uniforms.uModelView.value.fromArray(modelView);
      uniforms.uTime.value = state.time;
      uniforms.uAspect.value = aspect;
      uniforms.uFocus.value.set(state.focus[0], state.focus[1]);
      uniforms.uHalf.value.set(state.half[0], state.half[1]);
      uniforms.uPx.value = state.px;
      uniforms.uEnergy.value = state.energy;
      uniforms.uWake.value.set(state.wake[0], state.wake[1]);
      uniforms.uWakeEnergy.value = state.wakeEnergy;
      uniforms.uSurge.value = state.surge || 0;
      uniforms.uBase.value.set(state.base[0], state.base[1], state.base[2]);
      uniforms.uTint.value.set(state.tint[0], state.tint[1], state.tint[2]);
      uniforms.uOpacity.value = state.opacity;
      renderer.render(scene, camera);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
