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
 * transition.js — the depth-push page transition.
 *
 * WHAT HAPPENS
 * ------------
 * Follow a link inside the site and the page you are leaving recedes — it scales
 * down slightly, pushes back along Z through a real perspective, and dims. The
 * page you arrive at rises from behind that same plane. About 260 ms out,
 * 420 ms in. The effect is depth, not spectacle: it says the pages are a stack
 * you are moving through, and then gets out of the way.
 *
 * This is a real 3D transform through a perspective, not a fade dressed up as
 * one, and it is the style that stays comfortable after the fiftieth
 * navigation — which is why it is the one that was kept.
 *
 * CHANGING IT
 * -----------
 * One constant, below. Four other styles are still defined in fx.css and can be
 * switched on by changing `STYLE` to `flip`, `cube`, `slice` or `dissolve`:
 *
 *     flip       tips away on its Y axis, like a card turning over
 *     cube       hinged at the leaving edge, like the face of a cube
 *     slice      seven vertical panels sweeping across at staggered depths
 *     dissolve   a quiet cross-fade with a breath of scale
 *
 * If you change it, change `OUT_MS` to match that style's outgoing duration in
 * fx.css — the table below the constant has the numbers. That value is how long
 * the click is held before the browser is allowed to navigate, so a mismatch
 * shows up as either a clipped animation or a stalled click.
 *
 * (An earlier build had a live picker for trying all five, reached with
 * `?fx=lab`. It did its job — depth push won — and was removed along with the
 * localStorage preference it wrote, so there is now exactly one code path and
 * nothing to get stuck in a stale state.)
 *
 * WHY IT IS DONE THIS WAY
 * -----------------------
 * There is no build step and no client-side router on this site, and adding one
 * to get a transition would be a poor trade: a router means owning history,
 * scroll restoration, focus management and every failure mode of a single-page
 * app, in exchange for an animation. So navigation stays what it has always
 * been — the browser loading a document — and the transition is bolted to the
 * two moments either side of it: hold the click for the length of the outgoing
 * animation, then let the browser navigate; play the incoming animation when the
 * next document boots.
 *
 * WHAT IT NEVER BREAKS
 * --------------------
 *  - **No JavaScript**: no `fx-nav` class is ever added, no rule matches, and
 *    every link is an ordinary link.
 *  - **Reduced motion**: nothing is intercepted at all.
 *  - **Middle-click, Ctrl/Cmd-click, target="_blank", downloads, other hosts,
 *    `mailto:`/`tel:`, same-page anchors**: all left alone, because in every one
 *    of those cases the current document is not going anywhere.
 *  - **Back and forward**: `pageshow` clears the outgoing state, including the
 *    bfcache case where the old document is restored mid-animation.
 *  - **A navigation that never completes**: a timer clears the outgoing state
 *    after a second, so the page cannot be left sitting faded out.
 */

/**
 * The transition in use.
 *
 * `depth` | `flip` | `cube` | `slice` | `dissolve` — all five are implemented in
 * fx.css; this is the only thing that selects between them.
 */
const STYLE = 'depth';

/**
 * How long the outgoing half runs, in milliseconds. MUST match the duration of
 * that style's outgoing animation in fx.css:
 *
 *     depth 260 · flip 380 · cube 420 · slice 420 · dissolve 200
 */
const OUT_MS = 260;

/** How many panels the slice style uses. Also hard-coded in fx.css's nth-child. */
const SLICES = 7;

/** Belt and braces: never leave the page mid-animation for longer than this. */
const SAFETY_MS = 1000;

/* -------------------------------------------------------------------------- */
/* The slice overlay                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Build the panels the `slice` style animates.
 *
 * They are created only for that style and removed as soon as the animation is
 * over, so no other style pays for them and nothing is left in the document.
 * `--i` carries each panel's index to the stylesheet, which is where the
 * stagger is expressed.
 */
function slices(direction) {
  const old = document.querySelector('.fx-slices');
  if (old) old.remove();

  const wrap = document.createElement('div');
  wrap.className = `fx-slices fx-slices--${direction}`;
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < SLICES; i++) {
    const panel = document.createElement('i');
    panel.style.setProperty('--i', String(i));
    wrap.append(panel);
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), SAFETY_MS);
  return wrap;
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

/** Does this click mean "navigate this document to another page of this site"? */
function isInternalNavigation(event, link) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;                       // not a left click
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (!link || !link.href) return false;
  if (link.target && link.target !== '_self') return false;   // opens elsewhere
  if (link.hasAttribute('download')) return false;
  if (link.dataset.noTransition !== undefined) return false;  // opt-out hook

  let url;
  try { url = new URL(link.href, location.href); } catch { return false; }
  if (url.origin !== location.origin) return false;           // another site
  if (!/^https?:$/.test(url.protocol)) return false;          // mailto:, tel:, …

  // A link to a spot on this same page is a scroll, not a navigation.
  if (url.href.split('#')[0] === location.href.split('#')[0]) return false;

  return true;
}

export function initTransitions() {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  // Only now do the animations exist at all: every rule in fx.css is scoped to
  // `html.fx-nav`, which is added here and nowhere else.
  root.classList.add('fx-nav');

  root.dataset.fxTransition = STYLE;

  /* ---- arriving ---------------------------------------------------------- */
  root.classList.add('is-entering');
  if (STYLE === 'slice') slices('in');
  const done = () => root.classList.remove('is-entering');
  window.addEventListener('load', () => setTimeout(done, 600), { once: true });
  setTimeout(done, SAFETY_MS);   // in case `load` never fires

  /* ---- leaving ----------------------------------------------------------- */
  let leaving = false;

  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link || !isInternalNavigation(event, link)) return;
    if (leaving) { event.preventDefault(); return; }

    event.preventDefault();
    leaving = true;

    root.classList.remove('is-entering');
    root.classList.add('is-leaving');
    if (STYLE === 'slice') slices('out');

    setTimeout(() => { location.href = link.href; }, OUT_MS);
    setTimeout(() => root.classList.remove('is-leaving'), SAFETY_MS);
  });

  /* ---- coming back ------------------------------------------------------- */
  /* A bfcache restore hands back the *same* document, mid-animation, with the
     outgoing class still on it. Without this the page would come back faded. */
  window.addEventListener('pageshow', (event) => {
    leaving = false;
    root.classList.remove('is-leaving');
    const stale = document.querySelector('.fx-slices');
    if (stale) stale.remove();
    if (event.persisted) {
      root.classList.add('is-entering');
      setTimeout(done, 600);
    }
  });
}
