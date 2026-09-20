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
 * shaders.js — the GLSL for the explorer, shared verbatim by both renderers.
 *
 * Two programs and no more:
 *
 *   QUAD   every node and every card. A node is a billboarded square shaded as
 *          a SPHERE; a timeline card is a billboarded rectangle with rounded
 *          corners. One program, one uniform (`uRound`) to say which — because
 *          two nearly identical shaders would drift apart.
 *
 *          The spheres are impostors: the quad still has four corners, and the
 *          fragment shader reconstructs a hemisphere's surface normal from the
 *          position within it, then lights that. It is indistinguishable from
 *          real sphere geometry at these sizes, it needs no extra triangles —
 *          81 spheres at 32 segments would be about 130,000 of them — and it
 *          stays one draw call in both renderers.
 *
 *   LINE   the co-authorship edges, drawn as GL_LINES.
 *
 * Both take a per-vertex `aState`, which is how highlighting works without
 * rebuilding anything: -1 dimmed, 0 at rest, 1 lit. On hover the state array is
 * re-uploaded — a few thousand floats, once per hover, which costs nothing and
 * keeps the shader free of branches over indices.
 *
 * Written as GLSL ES 1.00 with explicit uniforms and no built-in names, so the
 * Three.js path can compile them through `RawShaderMaterial` — the one Three
 * material that injects nothing — and run *the same shader* as the fallback.
 */

export const QUAD_VERT = `
precision mediump float;

attribute vec3  position;   // centre of the quad, world space (named for Three)
attribute vec2  aCorner;    // -0.5…0.5 within the quad
attribute vec2  aSize;      // width and height, world units
attribute vec3  aColor;
attribute float aState;     // -1 dimmed · 0 rest · 1 lit

uniform mat4 uProjection;
uniform mat4 uView;

varying vec2  vCorner;
varying vec3  vColor;
varying float vState;
varying float vDepth;    // distance in front of the camera, world units

void main() {
  // Billboarding: the offset is added in VIEW space, after rotation, so the
  // quad always faces the camera however the scene is turned.
  vec4 viewPos = uView * vec4(position, 1.0);
  float grow = 1.0 + max(aState, 0.0) * 0.45;
  viewPos.xy += aCorner * aSize * grow;

  vCorner = aCorner;
  vColor = aColor;
  vState = aState;
  // Negated because view space looks down -Z; this is a positive distance.
  vDepth = -viewPos.z;

  gl_Position = uProjection * viewPos;
}
`;

export const QUAD_FRAG = `
precision mediump float;

varying vec2  vCorner;
varying vec3  vColor;
varying float vState;
varying float vDepth;

uniform float uRound;     // 1 = sphere (graph nodes) · 0 = slab (timeline cards)
uniform vec3  uLit;       // colour a lit item is pushed toward
uniform float uOpacity;   // overall strength, from the theme

/* Signed distance to a rounded rectangle. Negative inside, zero on the border,
   positive outside — and, because it is a true distance rather than a step, its
   GRADIENT is the outward direction, which is what the bevel below is built
   from.

   The half-extents are called ext and not half: "half" is a reserved word in
   GLSL ES and the shader fails to compile with a message that names the line
   but not the reason.

   (And no backticks anywhere inside these shader strings — they are template
   literals, and a backtick in a comment ends the string. That has cost an hour
   once already.) */
float roundBox(vec2 p, vec2 ext, float r) {
  vec2 q = abs(p) - ext + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  float mask;
  vec3 shade = vec3(1.0);

  if (uRound > 0.5) {
    /* ---- sphere impostor --------------------------------------------------
       The quad's own coordinates are the sphere's x and y; z follows from
       x² + y² + z² = 1, which is the front hemisphere. Lighting that normal
       gives a real sphere: a terminator that curves the right way, a highlight
       that sits where the light is, and a limb that darkens into the edge. */
    vec2 p = vCorner * 2.0;
    float r2 = dot(p, p);
    mask = smoothstep(1.0, 0.86, r2);
    if (mask <= 0.003) discard;

    vec3 normal = vec3(p, sqrt(max(0.0, 1.0 - r2)));

    // The key is up and to the left, matching the rest of the site's lighting.
    vec3 keyDir = normalize(vec3(-0.42, 0.62, 0.66));
    float key = max(dot(normal, keyDir), 0.0);
    // Wrapped, so the dark side of a small sphere still shows its colour
    // instead of collapsing to black.
    float wrapped = key * 0.72 + 0.28;
    // A tight specular, which is most of what makes it read as a ball.
    float spec = pow(max(dot(reflect(-keyDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);
    // A cool rim where the surface turns away, so spheres separate from each
    // other where they overlap.
    float rim = pow(1.0 - normal.z, 2.4) * 0.35;

    shade = vec3(wrapped * 0.92 + rim) + vec3(spec * 0.9);
  } else {
    /* ---- slab impostor ----------------------------------------------------
       A timeline card used to be a rounded rectangle filled with one flat
       colour, and it looked like exactly that: a sticker. It is now a solid
       with thickness, built the same way the sphere above is — no extra
       geometry, everything reconstructed inside the quad.

       Two distance fields, the same rectangle offset from itself. LIFT is the
       apparent thickness, pushed up and to the left because that is where the
       light is everywhere else on this site:

         dTop    the raised face you are looking at
         dBase   where the card meets what it is standing on
         union   the silhouette of the whole solid

       Everything inside the union but outside the top face is the SIDE of the
       card — the bit that gives it depth — and it is shaded dark because it is
       turned away from the light.

       The bevel is what makes the top face read as a surface rather than a flat
       fill: the gradient of a true distance field points outward, so near the
       border it tips the normal over the edge, and the rim catches the key on
       the upper left and loses it on the lower right. In the middle of the card
       the gradient contributes nothing and the face is flat, which is correct —
       it IS flat there. */
    vec2 p = vCorner * 2.0;
    vec2 ext = vec2(0.74, 0.44);
    float rad = 0.20;
    vec2 lift = vec2(-0.055, 0.075);

    float dTop = roundBox(p - lift, ext, rad);
    float dBase = roundBox(p + lift, ext, rad);
    mask = smoothstep(0.035, -0.012, min(dTop, dBase));
    if (mask <= 0.003) discard;

    float onTop = smoothstep(0.014, -0.014, dTop);

    float e = 0.014;
    vec2 grad = vec2(
      roundBox(p - lift + vec2(e, 0.0), ext, rad) - roundBox(p - lift - vec2(e, 0.0), ext, rad),
      roundBox(p - lift + vec2(0.0, e), ext, rad) - roundBox(p - lift - vec2(0.0, e), ext, rad)
    ) / (2.0 * e);

    // 0 across the middle of the face, rising to 1 at its border.
    float bevel = smoothstep(-0.17, -0.01, dTop);
    vec3 normal = normalize(vec3(grad * bevel * 1.6, 1.0));

    vec3 keyDir = normalize(vec3(-0.42, 0.62, 0.66));
    float key = max(dot(normal, keyDir), 0.0);
    float face = 0.58 + key * 0.66;
    float spec = pow(max(dot(reflect(-keyDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 30.0) * 0.5;

    shade = vec3(mix(0.3, face + spec, onTop));
  }

  vec3 colour = mix(vColor, uLit, max(vState, 0.0) * 0.55) * shade;
  // Dimmed items keep their shape but step back, so the lit ones read as near.
  // 0.14 rather than 0.22 because these used to be composited with alpha
  // applied twice, which is what "stepped back" actually meant on screen.
  float dim = vState < 0.0 ? 0.14 : 1.0;
  float alpha = clamp(mask * uOpacity * dim * (0.72 + max(vState, 0.0) * 0.28), 0.0, 1.0);

  /* ---- haze --------------------------------------------------------------
     Distance is the timeline's whole subject — the corridor runs two decades
     back — and perspective alone is a weak cue when every card is the same
     colour. Fading the far end toward the page (by dropping alpha, so the page
     shows through; the shader does not need to know what colour the page is)
     gives the aerial perspective that says "further away".

     Only on the cards. The graph is a compact ball a few units across and the
     same fade there would just dim one side of it for no reason. */
  if (uRound < 0.5) {
    alpha *= mix(1.0, 0.3, clamp((vDepth - 15.0) / 30.0, 0.0, 1.0));
  }

  // Premultiplied — see the note in gl.js.
  gl_FragColor = vec4(colour * alpha, alpha);
}
`;

export const LINE_VERT = `
precision mediump float;

attribute vec3  position;
attribute vec3  aColor;
attribute float aState;

uniform mat4 uProjection;
uniform mat4 uView;

varying vec3  vColor;
varying float vState;

void main() {
  vColor = aColor;
  vState = aState;
  gl_Position = uProjection * uView * vec4(position, 1.0);
}
`;

export const LINE_FRAG = `
precision mediump float;

varying vec3  vColor;
varying float vState;

uniform vec3  uLit;
uniform float uOpacity;
uniform float uEdge;      // how strong a line is at rest — see below

void main() {
  vec3 colour = mix(vColor, uLit, max(vState, 0.0) * 0.7);
  /* Edges are faint at rest on purpose: 255 of them at full strength is a
     hairball. Lighting one collaboration is the whole point of the view, and it
     only reads if the others have stepped back.

     These numbers were chosen when the layer was compositing alpha twice, so
     0.13 was really 0.017 on screen. With that fixed they are set back down to
     roughly what was actually being drawn, plus a little — the resting web is
     meant to be legible as a web, just not loud.

     But the same program also draws the timeline's year frames, and there are
     seventeen of those rather than three hundred and forty-five. What is right
     for a hairball is invisible for a corridor, so the resting strength is a
     uniform each scene sets for itself (edgeAlpha in scene.js) instead of a
     constant that has to suit both. */
  float alpha = (vState > 0.5 ? 0.85 : (vState < 0.0 ? 0.012 : uEdge)) * uOpacity;
  gl_FragColor = vec4(colour * alpha, alpha);
}
`;
