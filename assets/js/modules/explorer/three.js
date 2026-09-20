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
 * three.js — the explorer's Three.js renderer.
 *
 * Same scene, same shaders, same camera as gl.js; what Three brings is its
 * renderer — colour-space and pixel-ratio handling, context-loss recovery, and
 * a well-trodden path for anyone who later wants to add lights, post-processing
 * or another object to the view.
 *
 * `RawShaderMaterial` again, for the same reason as the field (README §12.4):
 * it injects nothing, so the GLSL compiled here is the GLSL compiled in the
 * fallback rather than a second copy that is supposed to match.
 *
 * The vertex attribute is called `position` throughout — see the note in
 * scene.js. Three takes a geometry's vertex count from that attribute and
 * silently draws nothing without it.
 */

import { QUAD_VERT, QUAD_FRAG, LINE_VERT, LINE_FRAG } from './shaders.js';

export function createRenderer(THREE, canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
  });
  renderer.setClearColor(0x000000, 0);

  const scene3 = new THREE.Scene();
  // The projection and view live in uniforms, not in this camera — camera.js
  // owns them, so both renderers frame the scene identically. Three still needs
  // *a* camera to render through, so it gets an identity one.
  const camera3 = new THREE.Camera();

  const shared = {
    uProjection: { value: new THREE.Matrix4() },
    uView: { value: new THREE.Matrix4() },
    uLit: { value: new THREE.Vector3(1, 1, 1) },
    uOpacity: { value: 1 },
  };

  const quadMaterial = new THREE.RawShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: QUAD_FRAG,
    uniforms: { ...shared, uRound: { value: 1 } },
    transparent: true,
    // See fx/field-three.js: the flag that picks the blend factors is the one
    // on the MATERIAL, and it defaults to false.
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });

  const lineMaterial = new THREE.RawShaderMaterial({
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    uniforms: { ...shared, uEdge: { value: 0.055 } },
    transparent: true,
    // See fx/field-three.js: the flag that picks the blend factors is the one
    // on the MATERIAL, and it defaults to false.
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });

  let quadMesh = null;
  let lineMesh = null;
  let current = null;

  function clear() {
    for (const mesh of [quadMesh, lineMesh]) {
      if (!mesh) continue;
      scene3.remove(mesh);
      mesh.geometry.dispose();
    }
    quadMesh = null;
    lineMesh = null;
  }

  return {
    setScene(next) {
      clear();
      current = next;

      const quads = new THREE.BufferGeometry();
      quads.setAttribute('position', new THREE.BufferAttribute(next.quads.position, 3));
      quads.setAttribute('aCorner', new THREE.BufferAttribute(next.quads.corner, 2));
      quads.setAttribute('aSize', new THREE.BufferAttribute(next.quads.size, 2));
      quads.setAttribute('aColor', new THREE.BufferAttribute(next.quads.colour, 3));
      quads.setAttribute('aState', new THREE.BufferAttribute(next.quads.state, 1));
      quads.setDrawRange(0, next.quads.count);
      quadMaterial.uniforms.uRound.value = next.round;
      lineMaterial.uniforms.uEdge.value = next.edgeAlpha == null ? 0.055 : next.edgeAlpha;
      quadMesh = new THREE.Mesh(quads, quadMaterial);
      // The shader positions every vertex itself, so Three's frustum test has
      // nothing meaningful to measure and would sometimes cull the lot.
      quadMesh.frustumCulled = false;
      scene3.add(quadMesh);

      if (next.lines.count) {
        const lines = new THREE.BufferGeometry();
        lines.setAttribute('position', new THREE.BufferAttribute(next.lines.position, 3));
        lines.setAttribute('aColor', new THREE.BufferAttribute(next.lines.colour, 3));
        lines.setAttribute('aState', new THREE.BufferAttribute(next.lines.state, 1));
        lines.setDrawRange(0, next.lines.count);
        lineMesh = new THREE.LineSegments(lines, lineMaterial);
        lineMesh.frustumCulled = false;
        scene3.add(lineMesh);
      }
    },

    updateState() {
      if (quadMesh) quadMesh.geometry.attributes.aState.needsUpdate = true;
      if (lineMesh) lineMesh.geometry.attributes.aState.needsUpdate = true;
    },

    setLook(next) {
      shared.uLit.value.set(next.lit[0], next.lit[1], next.lit[2]);
      shared.uOpacity.value = next.opacity;
    },

    resize(cssW, cssH, dpr) {
      renderer.setPixelRatio(dpr);
      renderer.setSize(cssW, cssH, false);
    },

    draw(view, projection) {
      shared.uProjection.value.fromArray(projection);
      shared.uView.value.fromArray(view);
      renderer.render(scene3, camera3);
    },

    dispose() {
      clear();
      quadMaterial.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      current = null;
    },
  };
}
