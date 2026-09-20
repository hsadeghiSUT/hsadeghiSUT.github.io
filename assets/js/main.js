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
 * main.js — the single entry point every page loads.
 *
 *   <script type="module" src="assets/js/main.js"></script>
 *
 * Responsibilities:
 *   1. Draw the shared furniture (nav, masthead, footer) from site.json.
 *   2. Dynamically import the one page module this page needs.
 *   3. Start the cross-cutting behaviours (scroll reveal, lightbox).
 *
 * The dynamic import matters: the Publications controller is never downloaded
 * by someone reading the Teaching page. Each page pulls exactly what it uses.
 */

import { load, renderError } from './modules/data.js';
import { renderNav, renderFooter, renderBrand } from './modules/chrome.js';
import { initReveal } from './modules/reveal.js';
import { initLightbox } from './modules/lightbox.js';
import { initScrollspy } from './modules/scrollspy.js';
import { initProgress } from './modules/progress.js';
import { initTheme, renderThemeSwitch } from './modules/theme.js';
import { initSectionNav } from './modules/sectionnav.js';
import { initCards3d } from './modules/cards3d.js';
import { initBackToTop } from './modules/backtotop.js';
import { initTransitions } from './modules/fx/transition.js';
import { initCanary } from './modules/canary.js';
import { $ } from './modules/dom.js';

/** Maps `<body data-page="…">` to its controller module. */
const PAGES = {
  home: () => import('./pages/home.js'),
  background: () => import('./pages/background.js'),
  honors: () => import('./pages/honors.js'),
  publications: () => import('./pages/publications.js'),
  team: () => import('./pages/team.js'),
  teaching: () => import('./pages/teaching.js'),
  services: () => import('./pages/services.js'),
};

async function boot() {
  const pageId = document.body.dataset.page;

  // The colour scheme first, and before anything that can fail. The inline
  // snippet in <head> has already set it for this paint; these two calls
  // re-assert it and draw the switch, and they must run even if the content
  // below cannot be fetched — otherwise an error page would have no way back
  // to light mode.
  initTheme();
  renderThemeSwitch($('#theme-toggle'));

  // Page transitions are wired before any content loads: the class they depend
  // on has to be on <html> before the incoming animation can play.
  initTransitions();

  try {
    const site = await load('site');
    initCanary(site);
    renderBrand(site);
    renderNav(site, pageId);
    renderFooter(site);
    startBrandMark(site);

    const loader = PAGES[pageId];
    if (loader) {
      const mod = await loader();
      await mod.render(site);
    }
  } catch (err) {
    renderError($('#main') || document.body, err);
  } finally {
    // Run these last so they pick up everything the page controller just drew.
    initReveal();
    initLightbox();
    initScrollspy();
    initProgress();
    initSectionNav();
    initBackToTop();
    initCards3d();
    startNameColumn(pageId);
    startIcons3d();
    startFx();
    signalPageReady();
  }
}

/**
 * Announce that the page is the page — `data-page-ready` on <html>, plus one
 * `hs:page-ready` event for anything that started before this moment.
 *
 * THE BUG THIS FIXES. The footer is drawn from site.json, which lands long
 * before the page's own content: `renderFooter(site)` runs several awaits
 * ahead of `mod.render(site)`. So there is a window — short on a fast
 * connection, seconds long on a slow one — in which the whole document is a
 * masthead, the word "Loading…" and a footer, and that document is shorter
 * than the window. The footer is therefore ON SCREEN, and the sword in it is
 * perfectly entitled to start shedding drops.
 *
 * Then the content arrives, the document grows to twenty thousand pixels, and
 * the footer leaves the viewport. The dew stops and the overlay is cleared —
 * that part always worked — but the POOL is deliberately remembered, so the
 * reader who finally scrolls down to the footer finds blood already pooled
 * under a sword they had never laid eyes on, and more drops adding to it.
 * Reported on Publications and Research team, which are the two pages whose
 * content takes longest to draw. README §16c.1.
 *
 * The fix is to say plainly when the layout means anything. Before this point
 * "the footer is in the viewport" is a statement about a placeholder, and
 * nothing that reacts to the viewport should believe it.
 *
 * It is set in `finally`, so an error page — which is also a finished layout —
 * gets it too, and after two frames, so the browser has actually laid the new
 * content out before anything measures it.
 */
function signalPageReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.dataset.pageReady = 'yes';
    document.dispatchEvent(new CustomEvent('hs:page-ready'));
  }));
}

/**
 * The display icons, as solid objects.
 *
 * Dynamically imported and never awaited, like every other 3D thing here: the
 * flat Font Awesome glyphs are already on screen and already correct, and a
 * building that has not learned to be a building yet is a building-shaped
 * picture — which is what it was before. A failure leaves the flat set in
 * place and says so once.
 *
 * To turn the whole layer off, see `ENABLED` at the top of
 * assets/js/modules/icons3d/index.js, and README §20.
 */
function startIcons3d() {
  import('./modules/icons3d/index.js')
    .then(({ initIcons3d }) => initIcons3d())
    .then((layer) => { if (layer) window.__icons3d = layer; })
    .catch((err) => console.info('icons3d: unavailable, keeping the flat icons.', err));
}

/**
 * The university mark in the header, in 3D.
 *
 * Dynamically imported and not awaited, like everything else here: the <img> in
 * the markup is already correct and already linked, so nothing about the page
 * waits on a logo learning to rotate. A failure leaves the flat mark in place.
 */
function startBrandMark(site) {
  import('./modules/logo3d/index.js')
    .then((module) => module.mountBrandMark($('#brandmark'), site))
    .catch((err) => console.info('brandmark: unavailable, keeping the flat mark.', err));
}

/**
 * The name, standing up in the left gutter.
 *
 * Not on the Summary page — that page has the portrait, the name set large and
 * the hero; a second copy of the name beside it would be the site saying its
 * own name twice at once. And not where there is no gutter to put it in: the
 * CSS hides it below 88rem, and this checks the same thing so that a narrow
 * window does not pay for a WebGL context it will never show.
 *
 * The page's kicker — the small line above the title, "Research output",
 * "Recognition", "Career" — is handed over as the thing the top of the "H"
 * lines up with. Which element that is, is page knowledge; how to line up with
 * it is the column's, so the selector is here and the arithmetic is there.
 *
 * Dynamically imported, not awaited, and its failure is swallowed: it is
 * decoration in the margin and the page is complete without it.
 */
function startNameColumn(pageId) {
  if (pageId === 'home') return;
  if (!window.matchMedia('(min-width: 88rem)').matches) return;
  const host = document.createElement('div');
  host.className = 'namecol';
  host.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'namecol__canvas';
  host.appendChild(canvas);
  document.body.appendChild(host);

  const anchor = document.querySelector('.page-header__kicker');

  import('./modules/namecolumn/index.js')
    .then(({ mountNameColumn }) => mountNameColumn(host, canvas, anchor))
    .then((column) => { if (column) window.__namecolumn = column; else host.remove(); })
    .catch((err) => { host.remove(); console.info('name column: unavailable.', err); });
}

/**
 * The 3D layer, started after everything else and never awaited.
 *
 * Two rules govern it:
 *   1. It runs last. Every word of the page is already on screen before the
 *      field is even imported, so a WebGL problem cannot delay content.
 *   2. It is imported dynamically. A browser that never gets there — no WebGL,
 *      an import that fails — has downloaded nothing for it.
 *
 * Failure is caught here and swallowed with a note, because the page is
 * complete without it. See README §12.
 */
function startFx() {
  import('./modules/fx/index.js')
    .then(async ({ initField }) => {
      const field = await initField();
      const { initHighlight } = await import('./modules/fx/highlight.js');
      // Note the argument may be null: with no WebGL the CSS half of the
      // highlight — the coloured edge on the hovered entry — still works.
      initHighlight(field);
    })
    .catch((err) => console.info('fx: not available, continuing without it.', err));
}

// `defer`-like timing: module scripts already wait for parsing, but a page can
// still be mid-parse if the script is moved into <head>.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
