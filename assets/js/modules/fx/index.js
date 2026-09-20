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
 * index.js — the field: one WebGL layer behind the whole page.
 *
 * WHAT IT IS FOR
 * --------------
 * Not decoration. The field is how the site answers "which of these hundred
 * publications am I actually pointing at". When the pointer settles on an
 * entry, a student, or a section card, the lattice behind the page rises toward
 * that spot and takes on that section's colour; the entry itself picks up the
 * same colour in its border and glow (see `highlight.js`). The colour and the
 * light are the same event, so the eye ties them together.
 *
 * WHAT IT REFUSES TO DO
 * ---------------------
 * Get in the way. It sits behind everything, never takes a pointer event, and
 * every part of the page is legible with it switched off — which is what
 * happens on a browser with no WebGL, since the canvas is then removed
 * entirely. It is an enhancement of a page that is already complete.
 *
 * THE RENDERERS
 * -------------
 *   Three.js installed  →  field-three.js
 *   otherwise           →  field-gl.js         (same lattice, same shaders)
 *   no WebGL at all     →  nothing, cleanly
 *
 * Confirm which from the console: `window.__fx.renderer`.
 */

import { loadThree } from './three.js';
import { createRenderer as createGL } from './field-gl.js';
import { createRenderer as createThree } from './field-three.js';
import { screenToPlane, VISIBLE_HALF } from './camera.js';

/** Seconds for the highlight to reach full strength, and to fade back out. */
const RISE = 0.16;
const FALL = 0.34;

/** Seconds for the colour to travel from the old section's hue to the new one. */
const TINT_TRAVEL = 0.30;

/** How far the camera yaws toward the pointer, radians at the screen edge. */
const YAW_RANGE = 0.10;

/**
 * The wake — the field's answer to the pointer itself, as opposed to the halo,
 * which is its answer to a card.
 *
 * `HOLD` is why the field can still go quiet. The wake is renewed by every
 * pointer move and expires this long after the last one, so a parked mouse
 * stops costing frames — which matters, because a wake that never expired would
 * pin the loop at sixty frames a second for as long as a cursor sat anywhere on
 * the page. Move again and it comes straight back.
 *
 * `DAMP` is how much of the wake a fully-lit card takes away. The brief was
 * explicit that the pointer's effect must stay below the card's, and the
 * cheapest way to guarantee that is not to tune two sets of amplitudes against
 * each other but to make one of them yield: as a card's halo rises, the wake
 * gets out of its way.
 */
const WAKE_HOLD = 2.4;
const WAKE_RISE = 0.22;
const WAKE_FALL = 0.55;
const WAKE_DAMP = 0.78;

/** The wall clock, in milliseconds. See `wakeSeenAt`. */
const now = () => (window.performance && performance.now ? performance.now() : Date.now());

/** Frames are skipped down to this rate while nothing is highlighted. */
const IDLE_FPS = 30;

/* -------------------------------------------------------------------------- */
/* Colour helpers                                                             */
/* -------------------------------------------------------------------------- */

/** `#rgb`, `#rrggbb` or `rgb(...)` → [r, g, b] in 0–1. Null if unparseable. */
export function parseColor(value) {
  const s = (value || '').trim();

  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }

  const rgb = s.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    if (parts.length === 3) return parts.map((p) => parseFloat(p) / (p.includes('%') ? 100 : 255));
  }

  return null;
}

/** Read a custom property off <html>. */
export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const lerp = (a, b, t) => a + (b - a) * t;

/* -------------------------------------------------------------------------- */
/* The field                                                                  */
/* -------------------------------------------------------------------------- */

export async function initField() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const canvas = document.createElement('canvas');
  canvas.className = 'fx-field';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  /* ---- renderer ---------------------------------------------------------- */
  let renderer = null;
  let kind = 'none';

  const THREE = await loadThree();
  if (THREE) {
    try {
      renderer = createThree(THREE, canvas);
      kind = 'three';
    } catch (err) {
      console.warn('fx: Three.js failed to start, using the built-in renderer.', err);
      renderer = null;
    }
  }
  if (!renderer) {
    renderer = createGL(canvas);
    kind = renderer ? 'webgl' : 'none';
  }
  if (!renderer) {
    canvas.remove();
    window.__fx = { renderer: 'none' };
    return null;
  }

  /* ---- state ------------------------------------------------------------- */
  const state = {
    time: 0,
    yaw: 0,
    focus: [0, 0],
    half: [0.2, 0.06],
    px: 0.0025,
    energy: 0,
    wake: [0, 0],
    wakeEnergy: 0,
    surge: 0,
    base: [0.5, 0.5, 0.5],
    tint: [0.2, 0.8, 0.9],
    opacity: 1,
  };

  /* The surge is driven from a clock rather than eased toward a target, because
     it is an event with a shape — rise, hold, fall — and not a state the field
     settles into. */
  let surgeStart = 0;
  let surgeUp = 0;
  let surgeHold = 0;
  let surgeDown = 0;

  let targetFocus = [0, 0];
  let targetHalf = [0.2, 0.06];
  let targetEnergy = 0;
  let targetTint = state.tint.slice();
  let targetYaw = 0;
  let targetWake = [0, 0];
  let wakePresence = 0;
  /* WALL CLOCK, not `state.time`.
     `state.time` is the animation clock: it advances by a dt CLAMPED to 50 ms,
     so that a stalled tab resumes where it left off instead of jumping. That is
     right for a wave and wrong for a timeout — on a machine drawing seven
     frames a second the clamp makes the simulated clock run at a third of real
     time, and a hold that is meant to be "2.4 seconds after you stop moving"
     becomes seven. The hold is a promise about the world, so it is measured in
     the world's seconds. */
  let wakeSeenAt = -1e9;
  let running = false;
  let raf = 0;
  let last = 0;
  let idleClock = 0;

  /** Re-read the theme. Called on load and whenever the colour scheme changes. */
  function readTheme() {
    state.base = parseColor(token('--fx-base')) || state.base;
    state.opacity = parseFloat(token('--fx-opacity')) || 1;
    const defaultTint = parseColor(token('--fx-tint'));
    if (defaultTint && targetEnergy === 0) {
      targetTint = defaultTint;
      state.tint = defaultTint.slice();
    }
  }
  readTheme();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.resize(window.innerWidth, window.innerHeight, dpr);
    // How many plane units one CSS pixel is worth. The shader uses it to keep
    // the halo a constant apparent width whatever it is wrapped around, so it
    // has to be right before the first frame and after every resize.
    state.px = (2 * VISIBLE_HALF) / Math.max(1, window.innerHeight);
  }
  resize();

  function step(dt) {
    state.time += dt;

    // Energy rises faster than it falls: a highlight should feel like it snaps
    // on and relaxes off, not like it is being dragged in both directions.
    const k = targetEnergy > state.energy ? dt / RISE : dt / FALL;
    state.energy = lerp(state.energy, targetEnergy, Math.min(1, k));

    const tk = Math.min(1, dt / TINT_TRAVEL);
    for (let i = 0; i < 3; i++) state.tint[i] = lerp(state.tint[i], targetTint[i], tk);

    const fk = Math.min(1, dt / 0.18);
    state.focus[0] = lerp(state.focus[0], targetFocus[0], fk);
    state.focus[1] = lerp(state.focus[1], targetFocus[1], fk);
    // The halo's size travels with its position, so moving between a tall card
    // and a one-line entry reshapes the light rather than snapping it.
    state.half[0] = lerp(state.half[0], targetHalf[0], fk);
    state.half[1] = lerp(state.half[1], targetHalf[1], fk);

    state.yaw = lerp(state.yaw, targetYaw, Math.min(1, dt / 0.5));

    /* ---- the wake -------------------------------------------------------
       It follows the pointer with a little lag, which is most of what makes it
       read as the cloud being disturbed rather than as a light bolted to the
       cursor. */
    const want = (now() - wakeSeenAt) < WAKE_HOLD * 1000 ? 1 : 0;
    const wk = want > wakePresence ? dt / WAKE_RISE : dt / WAKE_FALL;
    wakePresence = lerp(wakePresence, want, Math.min(1, wk));
    const pk = Math.min(1, dt / 0.11);
    state.wake[0] = lerp(state.wake[0], targetWake[0], pk);
    state.wake[1] = lerp(state.wake[1], targetWake[1], pk);
    // What the shader actually gets: the presence, minus whatever a lit card is
    // already claiming. See WAKE_DAMP.
    state.wakeEnergy = wakePresence * (1 - WAKE_DAMP * state.energy);

    if (surgeUp) {
      const t = state.time - surgeStart;
      if (t < 0) state.surge = 0;
      else if (t < surgeUp) state.surge = t / surgeUp;
      else if (t < surgeUp + surgeHold) state.surge = 1;
      else if (t < surgeUp + surgeHold + surgeDown) {
        state.surge = 1 - (t - surgeUp - surgeHold) / surgeDown;
      } else {
        state.surge = 0;
        surgeUp = 0;
      }
      // Eased at both ends, so the field swells and settles rather than
      // snapping between two brightnesses.
      state.surge = state.surge * state.surge * (3 - 2 * state.surge);
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;

    // While nothing is highlighted the field is only breathing, and 30 fps is
    // indistinguishable from 60 for a wave this slow — so half the frames are
    // skipped and half the battery with them.
    idleClock += dt;
    /* The wake counts as "not idle": it is the one effect that tracks something
       moving, and thirty frames a second is visible on it in a way it is not on
       a wave with a six-second period. It expires (WAKE_HOLD), so a page nobody
       is pointing at still drops back to the slow loop. */
    const idle = state.energy < 0.01 && targetEnergy === 0 && !surgeUp
      && wakePresence < 0.01;
    if (!idle || idleClock >= 1 / IDLE_FPS) {
      step(idle ? idleClock : dt);
      renderer.draw(state);
      idleClock = 0;
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced.matches) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  /** One frame, no loop — the reduced-motion path and the first paint. */
  function drawStill() {
    step(0.016);
    renderer.draw(state);
  }

  /* ---- lifecycle --------------------------------------------------------- */
  const sync = () => {
    if (document.hidden || reduced.matches) stop();
    else start();
  };
  document.addEventListener('visibilitychange', sync);
  if (reduced.addEventListener) reduced.addEventListener('change', () => { sync(); drawStill(); });

  window.addEventListener('resize', () => { resize(); if (!running) drawStill(); }, { passive: true });

  new MutationObserver(() => { readTheme(); if (!running) drawStill(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  if (systemDark.addEventListener) {
    systemDark.addEventListener('change', () => setTimeout(() => { readTheme(); if (!running) drawStill(); }, 0));
  }

  drawStill();
  sync();

  /* ---- the interface `highlight.js` drives ------------------------------- */
  const api = {
    renderer: kind,

    /**
     * Light the area *around* a rectangle on screen, in a given colour.
     *
     * The element's size is sent along with its position because the highlight
     * is a halo shaped to the element, not a circle centred on it — see the
     * comment in shaders.js. The interior stays dark so nothing is ever read
     * against the light.
     *
     * @param {DOMRect} rect   the element being pointed at
     * @param {string}  colour any CSS colour the theme defined
     */
    focusOn(rect, colour) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetFocus = screenToPlane(cx, cy, w, h);

      // CSS pixels → plane units. The vertical scale is the honest one (the
      // plane's y spans the viewport height); x uses the same scale so the halo
      // is not stretched on a wide monitor.
      const perPixel = state.px;
      targetHalf = [
        Math.max(0.02, (rect.width / 2) * perPixel),
        Math.max(0.02, (rect.height / 2) * perPixel),
      ];

      targetEnergy = 1;
      const parsed = parseColor(colour);
      if (parsed) targetTint = parsed;
      if (!running) drawStill();
    },

    /** Let go: the bump sinks and the colour drifts back to the theme's own. */
    relax() {
      targetEnergy = 0;
      const base = parseColor(token('--fx-tint'));
      if (base) targetTint = base;
      if (!running) drawStill();
    },

    /**
     * Flare the whole field for a moment.
     *
     * This is the one thing that happens to every star at once rather than to
     * the ones near something. It exists for the ascent (see
     * `modules/backtotop.js`): while the cards gather and lift, the field lifts
     * with them, swells, spins up and burns toward the accent, so the two read
     * as one movement instead of an animation over a static backdrop.
     *
     * @param {number} [up]    seconds to reach full
     * @param {number} [hold]  seconds at full
     * @param {number} [down]  seconds to fade back
     */
    surge(up = 0.22, hold = 0.16, down = 0.5) {
      surgeStart = state.time;
      surgeUp = Math.max(0.01, up);
      surgeHold = Math.max(0, hold);
      surgeDown = Math.max(0.01, down);
      // A surge on a page whose loop is stopped (reduced motion, hidden tab)
      // still needs the one frame it will actually be seen in.
      if (!running) drawStill();
    },

    /**
     * The pointer moved: swing the camera very slightly toward it, and put the
     * wake under it.
     *
     * `y` is optional because this was a one-argument function before the wake
     * existed and something may still call it that way; without a y the camera
     * still turns and the wake simply stays where it was.
     */
    look(x, y) {
      targetYaw = ((x / Math.max(1, window.innerWidth)) * 2 - 1) * YAW_RANGE;
      if (!Number.isFinite(y)) return;
      targetWake = screenToPlane(x, y, window.innerWidth, window.innerHeight);
      wakeSeenAt = now();
      // A pointer that arrives on a page whose loop has gone quiet has to start
      // it again, or the first thing it does is nothing.
      if (!running) start();
    },

    /** The pointer left the window: let the wake go now rather than on the timer. */
    unlook() {
      wakeSeenAt = -1e9;
    },

    /** How strong the wake is right now, 0–1. For checks and debugging. */
    waking: () => state.wakeEnergy,

    /** How hard the field is flaring right now, 0–1. For checks and debugging. */
    surging: () => state.surge,

    /** How lit the halo under the pointer is, 0–1. Same purpose: `tools/
        check-ui.mjs` cannot photograph a glow behind a page reliably, so it
        asks. */
    focused: () => state.energy,

    stop,
    start,
    dispose() { stop(); renderer.dispose(); canvas.remove(); },
  };

  window.__fx = api;
  return api;
}
