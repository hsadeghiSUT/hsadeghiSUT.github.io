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
 * highlight.js — ties the field to what the visitor is actually pointing at.
 *
 * THE PROBLEM IT SOLVES
 * ---------------------
 * The Publications page runs to a hundred entries and the Research Team page to
 * nearly forty people. Rows that long are hard to track: the eye loses which
 * line it was on, and on a phone a row can be taller than a thumb. So the row
 * under the pointer (or, on a touch screen, the row in the middle of the
 * viewport) is lit — the entry itself takes a coloured edge and glow, and the
 * 3D field behind the page rises and shifts to the same colour underneath it.
 * Two cues, one colour, one event.
 *
 * COLOUR CARRIES MEANING
 * ----------------------
 * The colour is not random and not per-item: it belongs to the *section*.
 * Journal papers light amber, the Persian list lights green, doctoral students
 * light violet, and so on. After a few seconds of scrolling you know which part
 * of a long page you are in from the colour of the light alone — which is the
 * point, and the reason this is navigation rather than ornament.
 *
 * The palette is six tokens per colour scheme in theme.css (`--fx-hue-0` …
 * `--fx-hue-5`). An element opts in by carrying `data-fx`, and takes its hue
 * from the nearest ancestor with `data-fx-hue`.
 *
 * WHAT IT COSTS
 * -------------
 * Two delegated listeners on the document, not one per row. Nothing is measured
 * until something is actually hovered.
 */

const TILT_MAX = 4.2;   /* degrees — a lift, not a wobble */
const LIFT = 6;         /* px toward the viewer */

/**
 * Half-width, in CSS pixels, of the patch lit on a `data-fx-field="local"`
 * element.
 *
 * WHY THIS EXISTS
 * ---------------
 * The halo is shaped to the element's rectangle, which is right for a row or a
 * card and wrong for the Summary page's hero: that card is most of the screen,
 * so lighting it lights its entire perimeter at once — light in four places you
 * are not looking at, to tell you about the one you are.
 *
 * So a large element can ask for the light to be local. The rectangle handed to
 * the field is then the INTERSECTION of the element and a window around the
 * pointer, which is the piece that makes this work: because the intersection
 * still has the element's own edges wherever the pointer is near one, the halo
 * hugs the real border of the card by the pointer, and simply stops a couple of
 * hundred pixels along it. The other three sides of the intersection fall
 * INSIDE the card, where the card's own opaque background hides them — the
 * field is behind the page, so there is nothing to suppress and nothing to
 * clip. The light appears exactly where the card meets the page near your
 * pointer, and nowhere else.
 */
const LOCAL_HALF = 150;

/**
 * The STATIC cards: blocks that are shaped like the interactive ones and are
 * not interactive.
 *
 * The Contact card and the Pages card on the Summary page are the examples.
 * They were the only card-shaped things on the site that did nothing at all
 * when the pointer crossed them, which made them read as inert rather than as
 * deliberately quiet — and, worse, made the light behind the page snap OFF as
 * the pointer moved from a card that lights onto a card that does not.
 *
 * They still do not move, tilt, glow or take a border: they are not links and
 * pretending otherwise would be a lie about what clicking does. What they now
 * do is tell the field where the pointer is, which is the half of the effect
 * that belongs to the page rather than to the element.
 *
 * The mechanism is the one the Summary hero already used — `data-fx-field`
 * lights the field and nothing else — so nothing here is new behaviour, only a
 * new set of elements opted into it. They are tagged on first hover rather than
 * at startup because most of them are built by a page module that has not
 * necessarily run yet when this file initialises.
 */
const STATIC_CARDS = '.panel';

/** Everything the pointer can light, interactive or not. */
const LIGHTABLE = `[data-fx], [data-fx-field], ${STATIC_CARDS}`;

/**
 * Mark a static card as field-only, once, the first time it is hovered.
 * Everything downstream then treats it exactly like the hero.
 *
 * ALWAYS `local`, whatever the card's size. The first version only gave the
 * hero's treatment to cards past a size threshold and lit the whole perimeter
 * of anything smaller — which is the treatment an interactive card gets, and
 * the difference is visible: a whole outline lighting at once is the page
 * saying "this is the thing you are pointing at", and a patch of light
 * following the pointer along an edge is the page saying "you are here". These
 * cards are not things you point AT; they are things the pointer crosses. The
 * hero's is the right cue for all of them, and one rule is also one thing to
 * remember rather than a threshold to be surprised by.
 */
function adoptStatic(node) {
  if ('fx' in node.dataset || 'fxField' in node.dataset) return;
  node.dataset.fxField = 'local';
}

/** The lit element, so it can be cleaned up when the next one takes over. */
let lit = null;

/** Which hue an element should use, resolved through the theme. */
function tintFor(node) {
  const owner = node.closest('[data-fx-hue]');
  const index = owner ? Number(owner.dataset.fxHue) || 0 : 0;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--fx-hue-${index % 6}`).trim();
  return value || getComputedStyle(document.documentElement).getPropertyValue('--fx-tint').trim();
}

/**
 * The rectangle to hand the field for `node`.
 *
 * Ordinary elements light their whole outline. A local one lights the part of
 * its outline nearest the pointer — see LOCAL_HALF.
 *
 * @param {HTMLElement} node
 * @param {number} x  pointer position, or NaN when there is no pointer (focus,
 *                    touch): a local element then falls back to its full box,
 *                    because a keyboard user has no cursor to light around.
 * @param {number} y
 */
function rectFor(node, x, y) {
  const r = node.getBoundingClientRect();
  if (node.dataset.fxField !== 'local' || !Number.isFinite(x) || !Number.isFinite(y)) return r;

  const left = Math.max(r.left, x - LOCAL_HALF);
  const right = Math.min(r.right, x + LOCAL_HALF);
  const top = Math.max(r.top, y - LOCAL_HALF);
  const bottom = Math.min(r.bottom, y + LOCAL_HALF);
  return {
    left, top, right, bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function clear() {
  if (!lit) return;
  lit.classList.remove('is-lit');
  lit.style.removeProperty('--fx-glow');
  lit.style.removeProperty('--fx-rx');
  lit.style.removeProperty('--fx-ry');
  lit.style.removeProperty('--fx-lift');
  lit = null;
}

/**
 * @param {object|null} field  the field from fx/index.js, or null if there is
 *                             no WebGL — the CSS half still works on its own.
 */
export function initHighlight(field) {
  const items = () => document.querySelectorAll(LIGHTABLE);
  if (!items().length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  function light(node, x = NaN, y = NaN) {
    if (node === lit) return;
    clear();
    lit = node;
    const colour = tintFor(node);
    /* `data-fx-field` lights the FIELD and nothing else. The hero uses it: the
       card was asked to stay put, and it does — no ring, no tilt, no lift, not
       even the class those rules hang off. All that happens is that the stars
       behind the page notice where the pointer is. */
    if (node.dataset.fxField === undefined) {
      node.classList.add('is-lit');
      // The same colour goes to the element and to the field, so the coloured
      // edge and the light behind the page cannot disagree.
      node.style.setProperty('--fx-glow', colour);
    }
    if (field) field.focusOn(rectFor(node, x, y), colour);
  }

  function unlight() {
    clear();
    if (field) field.relax();
  }

  /* ---- pointer ----------------------------------------------------------- */
  document.addEventListener('pointerover', (e) => {
    if (!fine.matches) return;
    const node = e.target.closest && e.target.closest(LIGHTABLE);
    if (node) { adoptStatic(node); light(node, e.clientX, e.clientY); }
    else if (lit && !lit.contains(e.target)) unlight();
  });

  document.addEventListener('pointerleave', unlight);

  /* The pointer left the window entirely. `unlight` above drops the card halo;
     this drops the wake as well, rather than leaving it to expire on its own
     timer with nothing on screen to justify it. */
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget && field && field.unlook) field.unlook();
  });

  /* The tilt. Real 3D: the element rotates about both axes toward the pointer
     and lifts toward the camera, with the rotation written as custom properties
     so the transform itself stays in the stylesheet where it can be overridden
     or switched off per component. */
  document.addEventListener('pointermove', (e) => {
    if (!fine.matches) return;
    // Both coordinates now: the camera only ever wanted x, but the wake — the
    // field's answer to the pointer itself — needs a point. See fx/index.js.
    if (field) field.look(e.clientX, e.clientY);
    if (!lit) return;

    /* A local element's lit patch travels with the pointer, so the rectangle is
       recomputed on every move rather than once on entry. */
    if (field && lit.dataset.fxField === 'local') {
      field.focusOn(rectFor(lit, e.clientX, e.clientY), tintFor(lit));
    }
    if (lit.dataset.fxField !== undefined || reduced.matches) return;

    const r = lit.getBoundingClientRect();
    const px = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
    const py = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
    lit.style.setProperty('--fx-ry', `${(px * TILT_MAX).toFixed(2)}deg`);
    lit.style.setProperty('--fx-rx', `${(-py * TILT_MAX).toFixed(2)}deg`);
    lit.style.setProperty('--fx-lift', `${LIFT}px`);
  }, { passive: true });

  /* ---- keyboard ---------------------------------------------------------- */
  /* Tabbing through a page should light the same things hovering does,
     otherwise the highlight is a sighted-mouse-user-only feature. */
  document.addEventListener('focusin', (e) => {
    const node = e.target.closest && e.target.closest(LIGHTABLE);
    if (node) { adoptStatic(node); light(node); }
  });
  document.addEventListener('focusout', (e) => {
    if (lit && !lit.contains(e.relatedTarget)) unlight();
  });

  /* ---- touch ------------------------------------------------------------- */
  /* There is no hover on a touch screen, so the equivalent cue is position:
     whichever entry is nearest the middle of the viewport is the one lit. That
     turns the effect into a reading marker on exactly the devices where the
     long lists are hardest to keep your place in. */
  if (!fine.matches) {
    let ticking = false;
    const pick = () => {
      ticking = false;
      const middle = window.innerHeight / 2;
      let best = null;
      let bestDistance = Infinity;
      /* `[data-fx]` only, deliberately: the reading marker exists for long
         lists, and a field-only element like the Summary hero is neither a row
         to keep your place in nor something that wants its whole perimeter lit
         the moment it drifts past the middle of a phone screen. */
      for (const node of document.querySelectorAll('[data-fx]')) {
        const r = node.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const d = Math.abs(r.top + r.height / 2 - middle);
        if (d < bestDistance) { bestDistance = d; best = node; }
      }
      if (best) light(best);
      else unlight();
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(pick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    pick();
  }
}
