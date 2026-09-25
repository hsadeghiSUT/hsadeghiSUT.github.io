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
 * retention/cracks.js — the desiccation crack floor under the surface.
 *
 * WHY IT IS HERE AND NOT BEHIND THE PAGE
 * --------------------------------------
 * This started as a plan to replace the site's background field on one page
 * with a drying, cracking clay. That was the wrong place, and reading `fx/`
 * says why: the field is not decoration. It is how the site answers "which
 * entry am I pointing at" — the lattice rises and takes the section's colour
 * while the row picks up the same hue (`fx/highlight.js`). Swapping it out on
 * one page would have quietly removed a working interaction from that page.
 *
 * So the cracks went where they actually mean something: the floor beneath the
 * retention surface. Desiccation cracking is what happens to a fine soil as
 * suction rises and it shrinks — so the cracks belong directly under the dry
 * end of the very surface that plots that suction, and they open as it does.
 * The same subject as "Image processing of desiccation crack patterns in a
 * bentonite-sand mixture under wetting and drying cycles".
 *
 * ONE MODEL, TWO DRAWINGS
 * -----------------------
 * The floor does not read the surface's geometry or sample a texture of it. It
 * evaluates the SAME van Genuchten expression in the fragment shader, from the
 * same uniforms, so the crack pattern cannot drift out of step with the surface
 * above it. If the parameters in `data/retention.json` change, both change.
 */

/**
 * A ground plane whose cracks open where the soil above it is dry.
 *
 * @param {object} THREE
 * @param {object} p     data/retention.json
 * @param {object} box   the same box the surface is drawn in
 * @param {number[]} clay  base colour, 0..1 rgb
 */
export function buildCrackFloor(THREE, p, box, clay) {
  const uniforms = {
    uAlphaRef: { value: p.alphaRef },
    uERef: { value: p.eRef },
    uBeta: { value: p.beta },
    uN: { value: p.n },
    uResidual: { value: p.residual },
    uLogMin: { value: Math.log10(p.suctionMin) },
    uLogMax: { value: Math.log10(p.suctionMax) },
    uVoidMin: { value: p.voidMin },
    uVoidMax: { value: p.voidMax },
    uClay: { value: new THREE.Color(clay[0], clay[1], clay[2]) },
    /* How far the pattern is scaled across the plate. Cells about a fifth of
       the plate wide: coarse enough to read as polygons rather than as noise,
       fine enough that the network closes. */
    uCells: { value: 7.0 },
  };

  const vertex = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragment = `
    precision highp float;
    varying vec2 vUv;

    uniform float uAlphaRef, uERef, uBeta, uN, uResidual;
    uniform float uLogMin, uLogMax, uVoidMin, uVoidMax, uCells;
    uniform vec3 uClay;

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

    /* Cellular noise, returning the gap between the nearest two cell centres.
       That gap is zero exactly on a cell boundary, which is where a shrinkage
       crack forms — polygons pulling apart from one another. F2 - F1 rather
       than F1 alone: F1 draws dots at the cell centres, F2 - F1 draws the walls
       between them, and it is the walls that crack. */
    float wallDistance(vec2 uv) {
      vec2 g = floor(uv);
      vec2 f = fract(uv);
      float f1 = 8.0;
      float f2 = 8.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 o = vec2(float(i), float(j));
          vec2 c = o + hash2(g + o) - f;
          float d = dot(c, c);
          if (d < f1) { f2 = f1; f1 = d; }
          else if (d < f2) { f2 = d; }
        }
      }
      return sqrt(f2) - sqrt(f1);
    }

    void main() {
      /* The same axes as the surface: x is log suction, y (of the plate) is
         void ratio. */
      float psi = pow(10.0, mix(uLogMin, uLogMax, vUv.x));
      float e = mix(uVoidMin, uVoidMax, vUv.y);
      float alpha = uAlphaRef * pow(max(e, 0.05) / max(uERef, 0.05), uBeta);

      float m = 1.0 - 1.0 / uN;
      float se = pow(1.0 + pow(alpha * psi, uN), -m);
      float sr = uResidual + (1.0 - uResidual) * se;

      /* Shrinkage does not begin until the soil actually starts to desaturate,
         so the cracks stay shut through the saturated plateau and open across
         the falling limb. */
      float dryness = smoothstep(0.92, 0.25, sr);

      float wall = wallDistance(vUv * uCells);
      /* A shut crack is still a visible seam — a dried plate is not featureless
         before it opens — so the width runs from hairline to wide rather than
         from nothing. */
      float width = mix(0.012, 0.13, dryness);
      float crack = 1.0 - smoothstep(0.0, width, wall);

      /* Darker in the crack, and darker still at its middle, because a real
         crack has depth and you are looking into it. */
      vec3 base = uClay * mix(1.0, 0.82, dryness);
      vec3 colour = mix(base, base * 0.18, crack * (0.55 + 0.45 * dryness));

      /* The plate fades out at its edges rather than ending on a hard rectangle
         that would read as a sheet of paper under the plot. */
      float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x)
                 * smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);

      gl_FragColor = vec4(colour, edge * (0.30 + 0.55 * dryness));
    }
  `;

  const geometry = new THREE.PlaneGeometry(box.width * 1.04, box.depth * 1.04, 1, 1);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  /* Flat, under the surface, and far enough below that the wet end of the
     surface does not touch it. */
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -box.height / 2 - 0.55;
  return { mesh, geometry, material };
}
