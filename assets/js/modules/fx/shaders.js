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
 * shaders.js — the GLSL, shared verbatim by both renderers.
 *
 * These are plain GLSL ES 1.00 shaders with their own uniforms and attribute
 * names. The Three.js renderer uses them through `RawShaderMaterial`, which is
 * the one Three material that adds nothing of its own — no injected matrices,
 * no prepended defines. That is deliberate: it means the Three path and the
 * fallback path run *the same shader*, not two shaders that are supposed to
 * look alike. A change here lands in both.
 *
 * The projection and model-view matrices are supplied as uniforms rather than
 * taken from Three, for the same reason.
 *
 * The stars are real solids (see lattice.js), so the shape on screen is the
 * geometry's own silhouette — there is no mask in the fragment shader and
 * nothing painted onto a sprite. What the vertex shader does is place each
 * star, spin it on its own axes, and light its facets.
 */

export const VERT = `
precision mediump float;

attribute vec3 position;   // vertex on its own unit star
attribute vec3 aNormal;    // that triangle's face normal, same local space
attribute vec3 aCentre;    // where the star sits: x,y in -1…1, z its depth
attribute vec4 aSeed;      // x: size · y: phase · z: spin rate · w: 0 star, 1 glow

uniform mat4  uProjection;
uniform mat4  uModelView;
uniform float uTime;       // seconds
uniform float uAspect;     // viewport width / height
uniform vec2  uFocus;      // centre of the highlighted element, in plane units
uniform vec2  uHalf;       // half its width and height, in plane units
uniform float uPx;         // plane units per CSS pixel — sets the halo's width
uniform float uEnergy;     // 0 at rest, 1 while an element is highlighted
uniform vec2  uWake;       // the pointer itself, in plane units
uniform float uWakeEnergy; // 0 when the pointer is away or a card has the light
uniform float uSurge;      // 0 normally; rises to 1 while the page ascends
uniform float uCell;       // base size of a star

varying float vPulse;
varying float vWake;
varying float vFlare;
varying float vShade;
varying vec2  vGlow;    // -1…1 across the glow quad; unused by the solid
varying float vRole;

/**
 * Turn a star.
 *
 * A full spin about Z — in the star's own plane, so it stays face-on — and a
 * BOUNDED tilt on X and Y. Bounded is the point: tumbling freely on two axes
 * sent stars edge-on, where a five-pointed star is a sliver and stops being
 * recognisable. A quarter-radian of lean is enough for the facets to catch the
 * light differently without ever losing the shape.
 */
vec3 turn(vec3 v, float spin, float leanX, float leanY) {
  float sz = sin(spin), cz = cos(spin);
  vec3 r = vec3(v.x * cz - v.y * sz, v.x * sz + v.y * cz, v.z);
  float sa = sin(leanX), ca = cos(leanX);
  r = vec3(r.x, r.y * ca - r.z * sa, r.y * sa + r.z * ca);
  float sb = sin(leanY), cb = cos(leanY);
  return vec3(r.x * cb + r.z * sb, r.y, -r.x * sb + r.z * cb);
}

void main() {
  vec3 star = vec3(aCentre.x * uAspect, aCentre.y, aCentre.z);

  // Drift: everything sways very slowly, each star on its own phase, so the
  // cloud is alive without anything in it being trackable.
  star.x += sin(uTime * 0.21 + aSeed.y) * 0.018;
  star.y += cos(uTime * 0.17 + aSeed.y * 1.7) * 0.022;

  // ── The highlight is a HALO, not a bump ──────────────────────────────────
  // uFocus and uHalf describe the hovered element as a rectangle in the plane's
  // units. This is the standard box distance field: how far outside that
  // rectangle each star sits, and zero for anything inside it.
  //
  // Why a box and not a circle: the things being highlighted are cards and
  // rows, and a circular falloff around a wide row reaches much further above
  // and below it than beside it — straight over the neighbouring entries' text.
  //
  // Why the band is measured in plane units and not in multiples of the
  // element's size: a proportional band is thin around a one-line entry and
  // enormous around a tall card. uPx converts CSS pixels to plane units, so the
  // halo keeps the same apparent width whatever it is wrapped around.
  vec2 outward = abs(star.xy - uFocus) - uHalf;
  float gap = length(max(outward, 0.0));

  // Each star reaches a little further out than its neighbour, so the cloud has
  // a ragged edge instead of a clean band.
  float band = uPx * 26.0 * (0.7 + aSeed.x * 0.5);
  float ring = exp(-pow(gap - band * 0.55, 2.0) / (band * band * 0.42));
  float outside = smoothstep(0.0, band * 0.30, gap);
  float pulse = ring * outside * uEnergy;

  // Lit stars swirl around the element and lift toward the viewer: the cloud
  // gathers rather than simply brightening in place.
  float swirl = pulse * 0.055;
  vec2 away = normalize(star.xy - uFocus + vec2(0.0001));
  star.xy += vec2(-away.y, away.x) * swirl * (aSeed.z > 0.0 ? 1.0 : -1.0);
  star.z += pulse * 0.35;

  /* ── The WAKE: the pointer itself ────────────────────────────────────────
     The halo above answers a CARD. This answers the mouse, everywhere, all the
     time — the cloud noticing that something is moving through it.

     It is deliberately a different SHAPE as well as a smaller amount. The halo
     is a box distance field with a hollow middle, because it is wrapped around
     something you are reading; the wake is a plain radial falloff centred on
     the pointer, because there is nothing to read at a bare cursor and nothing
     to wrap around. Making it a weaker copy of the halo would have given the
     page two rectangles fighting over the same stars.

     Two rules keep it in its place, and both matter:

       · It is scaled DOWN by uEnergy in the uniform (see index.js), so as a
         card takes the light the wake gets out of the way rather than adding
         to it.

       · Whatever is left is multiplied by the SAME outside term that keeps
         the halo out of the middle of an element. Rows on the Publications
         page are transparent, so the field is genuinely visible behind their
         text; without this the wake would brighten the cloud under the words
         you are reading.

     (No backticks anywhere in this file's shader strings, incidentally. One
     inside a GLSL comment ends the JavaScript template literal the shader is
     written in, and the whole module stops parsing — which is exactly how the
     first draft of this comment broke the field.) */
  float reach = uPx * 165.0;
  float near = length(star.xy - uWake) / reach;
  float wake = exp(-near * near * 1.35) * uWakeEnergy;
  // A slow shimmer, each star on its own phase: light arriving, not a lamp.
  wake *= 0.72 + 0.28 * sin(uTime * 2.3 + aSeed.y * 6.28);
  wake *= mix(1.0, outside, uEnergy);

  star.z += wake * 0.12;

  /* ── Breathing ────────────────────────────────────────────────────────────
     Three sines at rates that do not divide into one another. Their sum never
     repeats in any way the eye can follow, so every star pulses on its own
     irregular rhythm rather than all of them beating together — which is what
     a single sine gave, and what made the old field look mechanical. */
  float t = uTime + aSeed.y * 7.0;
  float breath =
      sin(t * 0.63 + aSeed.y) * 0.5
    + sin(t * 1.07 + aSeed.y * 2.3) * 0.3
    + sin(t * 1.93 + aSeed.y * 4.1) * 0.2;
  breath = breath * 0.5 + 0.5;                 // 0…1

  /* And occasionally one of them flares: the same wave raised to a high power,
     so it is near zero almost all the time and briefly close to one. This is
     what makes the field feel populated rather than animated. */
  float flare = pow(max(breath, 0.0), 7.0);

  /* The surge: the one moment the field stops being ambient. While the page is
     climbing back to the top, every star swells, rushes upward with the cards
     and spins up. It is the same lift the cards are making, applied to the
     thing behind them, so the two read as one movement rather than as an
     animation over a backdrop. */
  star.y += uSurge * (0.55 + aSeed.x * 0.85);
  star.z += uSurge * 0.55;

  /* The wake's share of the size is a third of the halo's, and that ratio is
     the whole brief: noticeable, and unmistakably less than what a card does. */
  float size = uCell * aSeed.x
    * (0.5 + breath * 0.45 + flare * 0.4 + pulse * 1.35 + wake * 0.42)
    * (1.0 + uSurge * 1.7);

  /* ── Turning ──────────────────────────────────────────────────────────── */
  float spin = uTime * aSeed.z * 0.5 * (1.0 + uSurge * 3.5) + aSeed.y;
  // Lean is bounded by the sine, never accumulating: at most about 14 degrees.
  float leanX = sin(uTime * 0.37 * aSeed.z + aSeed.y) * 0.25;
  float leanY = cos(uTime * 0.29 * aSeed.z + aSeed.y * 1.7) * 0.25;

  vec3 normal = turn(aNormal, spin, leanX, leanY);

  // Lighting the facets is what makes it a solid rather than a silhouette: as a
  // star turns, its ten faces brighten and dim separately.
  vec3 keyDir = normalize(vec3(-0.35, 0.55, 0.76));
  float key = max(dot(normal, keyDir), 0.0);
  vShade = 0.45 + key * 0.85 + pow(key, 16.0) * 0.7;

  vPulse = pulse;
  vWake = wake;
  vFlare = flare + breath * 0.35;
  vRole = aSeed.w;
  vGlow = position.xy;

  vec4 viewPos;
  if (aSeed.w > 0.5) {
    /* The glow: a flat quad, billboarded in view space so it always faces the
       camera, sized well beyond the star it belongs to. It is the light the
       star gives off, and it is why the cloud reads as luminous rather than as
       a set of little objects. */
    viewPos = uModelView * vec4(star, 1.0);
    viewPos.xy += position.xy * size * (2.4 + flare * 1.6 + pulse * 3.0 + wake * 0.9);
  } else {
    viewPos = uModelView * vec4(star + turn(position, spin, leanX, leanY) * size, 1.0);
  }

  gl_Position = uProjection * viewPos;
}
`;

export const FRAG = `
precision mediump float;

varying float vPulse;
varying float vWake;
varying float vFlare;
varying float vShade;
varying vec2  vGlow;
varying float vRole;

uniform vec3  uBase;      // the field's resting colour, from the theme
uniform vec3  uTint;      // the hovered section's colour
uniform float uOpacity;   // overall strength, also from the theme
uniform float uSurge;     // 0 normally; rises to 1 while the page ascends

void main() {
  /* ── Colour ───────────────────────────────────────────────────────────────
     At rest every star in the field is uBase, which the theme sets to a dimmed
     cyan in BOTH schemes. That is the field's own identity, and it is the same
     identity on a white page and a near-black one.

     vPulse is the halo: near its peak — the band hugging the hovered element —
     it is close to 1, and it falls to 0 both inside the element and out in the
     rest of the page. Mixing on it therefore does exactly what is wanted: the
     stars ringing the thing you are pointing at take THAT element's hue, and
     the hue washes back out to the resting cyan as you look further away. One
     card's light no longer looks like another's.

     A note on why this was not visible before: the mix was here, but uBase was
     a neutral grey, so a lit star was "grey → accent" and an unlit one was
     grey. Every accent read as the same wash of colour against a colourless
     field. With a cyan base the comparison is hue against hue, and the
     difference between a violet ring and an amber one is immediate. */
  vec3 colour = mix(uBase, uTint, clamp(vPulse * 1.9, 0.0, 1.0));
  /* The wake brightens; it does not TINT. Hue on this field means "which
     section of the page is this" — see above — and a cursor is not a section,
     so lending it a colour would be saying something untrue. It lifts the star
     part of the way to white and stops there, which reads as light falling on
     the cloud rather than as the cloud changing what it is. */
  colour = mix(colour, vec3(1.0), clamp(vWake, 0.0, 1.0) * 0.22);
  // The surge takes every star to the accent and then some of the way to white,
  // so the field goes from a quiet texture to something incandescent.
  colour = mix(colour, mix(uTint, vec3(1.0), 0.45), uSurge);

  if (vRole > 0.5) {
    // ---- the glow ----------------------------------------------------------
    // A soft radial falloff, brightest at the star and gone by the quad's edge.
    // Squared rather than linear, so the light has a core instead of a rim.
    float d = length(vGlow);
    float halo = exp(-d * d * 3.4) * (1.0 - smoothstep(0.85, 1.0, d));
    if (halo <= 0.004) discard;

    /* The emitted light follows the same rule as the solid: resting cyan out in
       the field, the hovered element's hue around it. It used to be uTint
       unconditionally, which is why every glow in the field — including the
       hundreds nowhere near the pointer — turned the same colour at once.

       Only lightly pushed toward white. A hard push looks bright but it
       desaturates, and a lit star that has gone white is a lit star that has
       thrown away the colour it was carrying the message in. */
    colour = mix(colour, vec3(1.0), 0.20 + vPulse * 0.30);
    float alpha = clamp(halo * (0.075 + vFlare * 0.12 + vPulse * 0.45 + vWake * 0.15 + uSurge * 0.65) * uOpacity, 0.0, 1.0);
    // Premultiplied — see the blending note in field-gl.js.
    gl_FragColor = vec4(colour * alpha, alpha);
    return;
  }

  // ---- the solid -----------------------------------------------------------
  // Lit stars brighten toward white on the faces turned to the light — but only
  // a little, for the reason above.
  colour = mix(colour, vec3(1.0), clamp(vPulse * 0.24 + vFlare * 0.26, 0.0, 1.0));
  colour *= vShade;

  /* ── Strength ─────────────────────────────────────────────────────────────
     The resting term used to be 0.04 against a pulse term of 0.95 — and on top
     of that the layer was compositing alpha twice (see field-gl.js), so what
     reached the screen was nearer 0.002. The field was not dim; it was
     effectively not being drawn. Both are fixed, and the resting term is now
     high enough that the field reads as a field while you are simply looking at
     the page.

     What has NOT changed is the gap. The pulse term is still four to five times
     the resting one, so the ring around the hovered element remains far and away
     the brightest thing in the layer — the field is visible, and the highlight
     is still an event. */
  float alpha = clamp((0.17 + vFlare * 0.23 + vPulse * 0.85 + vWake * 0.28 + uSurge * 0.55) * uOpacity, 0.0, 1.0);

  gl_FragColor = vec4(colour * alpha, alpha);
}
`;
