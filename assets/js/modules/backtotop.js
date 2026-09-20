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
 * backtotop.js — the control that takes a reader back to the top of a long page.
 *
 * WHY IT EXISTS
 * -------------
 * Publications runs to a hundred entries and Research Team to nearly forty
 * people. Getting back to the navigation from the bottom of either is a long
 * flick on a phone and a long drag on a desktop, and the header is sticky but
 * the *page title* and the section bar's start are not where you left them.
 *
 * WHERE IT SITS, AND WHY THAT IS THE WHOLE DESIGN
 * ----------------------------------------------
 * The brief was "bottom right, without interfering with the cards", and a fixed
 * button in the bottom-right corner interferes with the cards by definition —
 * that is where the corner of a card is. So the position is not one number:
 *
 *   wide screens   The shell is capped at `--w-page` and centred, so there is a
 *                  gutter either side. The button parks IN that gutter, beside
 *                  the content rather than on top of it. Nothing is covered at
 *                  any scroll position. This is done in CSS with a `max()`, so
 *                  it needs no measuring and no resize handler.
 *
 *   narrow screens There is no gutter — the content runs to within a rem of the
 *                  edge — so the button cannot avoid the content by position.
 *                  It avoids it by TIME instead: it is out of the way while you
 *                  are reading forward, and it arrives the moment you turn
 *                  round. Scrolling down hides it; scrolling up brings it back.
 *                  Going back up the page is the only gesture that ends in
 *                  wanting this button, so that is when it is there.
 *
 * The direction state is written here as a class and consumed by the stylesheet,
 * which applies it only below the width where the gutter runs out. One
 * behaviour, two presentations, and the breakpoint lives with the other
 * breakpoints instead of being duplicated in JavaScript.
 *
 * THE ASCENT
 * ----------
 * Pressing it does not simply set `scrollY` to zero. Landing at the top with no
 * transit is disorienting on a page a hundred entries long: the thing you were
 * reading is replaced by a thing you were not, with nothing in between to say
 * what happened.
 *
 * So the page is gathered up first. Every block is measured, and each is told
 * how far it is from a single point near the top of the window; the stylesheet
 * then moves each one by exactly that distance, so they converge — a card near
 * the top barely moves, one near the bottom travels the height of the window,
 * and they arrive together and stack. The pile tips away from the viewer and
 * fades. The field behind the page surges at the same moment, lifting, swelling
 * and burning toward the accent, so what is behind the cards is travelling with
 * them rather than sitting still underneath an animation.
 *
 * Only then does the scroll happen — instantly, and under cover of an empty
 * page, which is the point: there is nothing to see it. Then the stack opens
 * back out at the top.
 *
 * Only what is ON SCREEN is measured. A publications page has hundreds of
 * blocks and all but a dozen of them are somewhere no one is looking; measuring
 * them costs layout time and animating them costs compositing, to no effect.
 *
 * KEYBOARD
 * --------
 * Scrolling the window does not move focus, so a keyboard user who pressed this
 * would be looking at the top of the page with their tab position still at the
 * bottom of it — the next Tab would throw them back down. So activating it also
 * moves focus to the top of the document. `#main` is the skip link's target and
 * is already in every page shell, which makes it the honest place to land.
 *
 * COST
 * ----
 * One passive scroll listener that writes at most one class per frame. The
 * button is created on every page rather than only on the long ones, and that is
 * deliberate: deciding at boot means measuring the document before its images
 * and web fonts have settled, and a page that grows by three hundred pixels a
 * moment later would have been judged too short forever. The scroll handler
 * already answers the question correctly at every moment — on a page that cannot
 * scroll a screenful the button simply never shows — so it is the only place the
 * question is asked.
 */

import { icon } from './icons.js';
import { mountBayonet } from './bayonet3d.js';

/** How far down the page the button appears, in viewport heights. */
const APPEAR_AT = 1.25;

/** Milliseconds for the stack to gather and vanish; matches fx.css §10. */
const RISE_MS = 420;

/** Where the stack forms, in CSS pixels from the top of the window. */
const STACK_AT = 90;

/**
 * The most blocks to animate. Everything visible is well under this on every
 * page of this site; the cap is here so that a future page with a thousand
 * on-screen rows degrades to "the first hundred move" rather than to a stall.
 */
const MAX_BLOCKS = 120;

/**
 * Movement smaller than this is not a change of direction — it is the tail of a
 * smooth scroll, a rubber-band bounce, or a browser adjusting for a late image.
 * Without it the button flickers as the page settles.
 */
const DIRECTION_NOISE = 6;

/**
 * How long the page has to sit still before the control comes back.
 *
 * WHY THIS EXISTS
 * ---------------
 * On a narrow screen the button steps aside while you are reading forward and
 * returns when you scroll back — which is right while you are moving, and wrong
 * the moment you stop. Someone who flicks to the bottom of Publications and
 * then lifts their thumb has been reading "forward" all the way down, so the
 * control is hidden, and from where they are sitting it does not exist at all.
 * That is exactly the report: "it does not appear".
 *
 * So stopping counts as turning round. Half a second after the page comes to
 * rest the control is back, wherever it was going before.
 */
const SETTLE_MS = 500;

export function initBackToTop() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'totop';
  button.setAttribute('aria-label', 'Back to top');
  button.title = 'Back to top';
  /* Hidden from the tab order until it is on screen. A button you cannot see is
     a button you should not be able to focus — otherwise Tab lands on something
     invisible and nothing appears to happen. */
  button.tabIndex = -1;

  /* Three layers, and only the first two are guaranteed.

       the meteor   a cyan arc running clockwise around the outside of the
                    button — pure CSS, the same conic-gradient-in-a-mask as the
                    header mark. It runs whatever else fails.
       the arrow    the sprite glyph. It was the original site's back-to-top
                    icon, and it is what the button shows until something
                    better is running.
       the bayonet  a turned solid on a canvas, added only once Three and WebGL
                    have both answered. `data-bayonet="three"` on the button is
                    what hides the arrow, so the arrow is never taken away
                    before its replacement exists. */
  const meteor = document.createElement('span');
  meteor.className = 'totop__ring';
  meteor.setAttribute('aria-hidden', 'true');
  button.append(meteor);

  const canvas = document.createElement('canvas');
  canvas.className = 'totop__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  button.append(canvas);

  const glyph = icon('fal-arrow-circle-up', { class: 'totop__icon' });
  if (glyph) button.append(glyph);
  document.body.append(button);

  /* The solid, if this browser can draw one. It is started and stopped with the
     button's own visibility: on a page nobody has scrolled, nothing draws. */
  let bayonet = null;
  mountBayonet(button, canvas)
    .then((made) => {
      bayonet = made;
      if (bayonet && shown) bayonet.resume();
    })
    .catch(() => { /* the arrow stays; nothing to do */ });

  let shown = false;
  let lastY = window.scrollY;
  let ticking = false;
  let settle = 0;

  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const should = y > window.innerHeight * APPEAR_AT;

    if (should !== shown) {
      shown = should;
      button.classList.toggle('is-shown', shown);
      button.tabIndex = shown ? 0 : -1;
      if (bayonet) (shown ? bayonet.resume() : bayonet.pause());
    }

    const moved = y - lastY;
    if (Math.abs(moved) > DIRECTION_NOISE) {
      // Reading forward: step aside. Turning back: be there.
      button.classList.toggle('is-receding', moved > 0);
      lastY = y;

      /* And when the scrolling stops, be there anyway — see SETTLE_MS. The
         timer is restarted on every real movement, so it only fires once the
         page has actually come to rest. */
      clearTimeout(settle);
      settle = setTimeout(() => button.classList.remove('is-receding'), SETTLE_MS);
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /**
   * Go to the top with no animation at all.
   *
   * `base.css` sets `scroll-behavior: smooth` on the root, and that wins over
   * `window.scrollTo({ behavior: 'auto' })` — 'auto' means "whatever the CSS
   * says". So the jump came out as a six-hundred-millisecond glide *after* the
   * page had already faded away, and the reader watched an empty document
   * scroll past.
   *
   * `behavior: 'instant'` says it directly, but it is a newer enum value and an
   * older browser throws on an unknown one. So the CSS property is turned off
   * around the call instead — with one non-obvious extra step.
   *
   * THE STEP THAT MATTERS. Setting `root.style.scrollBehavior = 'auto'` marks
   * style dirty; it does not recompute it. `window.scrollTo` then reads the
   * *previous* computed value and scrolls smoothly anyway. Reading the computed
   * style back forces the flush, and only then does the scroll obey. Without
   * that one line this function looks completely correct and does nothing —
   * holding the override across two animation frames does not help either,
   * because the behaviour is decided when the call is made.
   */
  function jumpToTop() {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    void getComputedStyle(root).scrollBehavior;   // flush — see above
    window.scrollTo(0, 0);
    if (previous) root.style.scrollBehavior = previous;
    else root.style.removeProperty('scroll-behavior');
  }

  /**
   * Gather the page up, go to the top, and let it open back out.
   *
   * Returns immediately; the phases run on timers. Reduced motion skips
   * straight to the jump.
   */
  function ascend() {
    const root = document.documentElement;

    if (reduced.matches) {
      jumpToTop();
      return;
    }

    /* Measure first, write second. Every getBoundingClientRect() here happens
       before any class is added, so the browser lays out once instead of once
       per element. */
    const blocks = [];
    const candidates = document.querySelectorAll('[data-fx], [data-fx-field], .panel');
    for (const node of candidates) {
      const r = node.getBoundingClientRect();
      // On screen, with a little margin either side so nothing pops in as it
      // crosses the edge mid-flight.
      if (r.bottom < -80 || r.top > window.innerHeight + 80) continue;
      blocks.push([node, Math.round(Math.min(0, STACK_AT - r.top))]);
      if (blocks.length >= MAX_BLOCKS) break;
    }

    blocks.forEach(([node, dy], i) => {
      node.style.setProperty('--dy', `${dy}px`);
      node.style.setProperty('--i', String(i));
    });

    // The field lifts with them.
    if (window.__fx && typeof window.__fx.surge === 'function') {
      window.__fx.surge(RISE_MS / 1000 * 0.55, 0.12, 0.55);
    }

    root.classList.add('fx-rise');

    setTimeout(() => {
      jumpToTop();
      root.classList.remove('fx-rise');
      root.classList.add('fx-land');
      for (const [node] of blocks) node.style.removeProperty('--dy');

      /* Re-stagger from the top of the page rather than from the old scroll
         position: after the jump, index 0 should be whatever is now at the top,
         so the stack opens downward from the masthead instead of unfolding in
         the order it happened to be gathered in. */
      const visible = [...document.querySelectorAll('[data-fx], [data-fx-field], .panel')]
        .filter((n) => n.getBoundingClientRect().top < window.innerHeight)
        .slice(0, MAX_BLOCKS);
      visible.forEach((node, i) => node.style.setProperty('--i', String(i)));

      setTimeout(() => {
        root.classList.remove('fx-land');
        for (const node of new Set([...blocks.map((b) => b[0]), ...visible])) {
          node.style.removeProperty('--i');
          node.style.removeProperty('--dy');
        }
      }, 420);
    }, RISE_MS);
  }

  button.addEventListener('click', () => {
    ascend();

    /* Focus follows the view. `#main` is not focusable by default, so it is made
       focusable for exactly as long as it takes to receive focus and then put
       back — a permanent `tabindex="-1"` on a landmark is a small thing to leave
       lying around, but it is still a thing. */
    const target = document.getElementById('main') || document.body;
    const had = target.hasAttribute('tabindex');
    if (!had) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (!had) {
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  });

  update();
  return button;
}
