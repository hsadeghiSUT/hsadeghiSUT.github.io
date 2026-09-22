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
 * icons.js — the replacement for the 5.8 MB Font Awesome Pro JavaScript kit.
 *
 * How it used to work
 * -------------------
 * `all.min.js` shipped the vector data for all 7,800 Pro icons and rewrote every
 * <i class="fad fa-book"> into an <svg> at runtime. Six megabytes of JavaScript
 * to draw sixty-six pictures.
 *
 * How it works now
 * ----------------
 * `assets/icons/icons.svg` is a sprite containing exactly the 71 icons this site
 * uses, extracted from that same Pro file — so the artwork is byte-identical,
 * duotone and all. Each icon is one <symbol>; a page references it with
 *
 *     <svg class="icon"><use href="assets/icons/icons.svg#fad-book"></use></svg>
 *
 * which is a single cached request for the whole site and needs no JavaScript at
 * all. This module just builds that markup for the renderers.
 *
 * Adding an icon later
 * --------------------
 * Open assets/icons/icons.svg and paste a new <symbol id="fas-rocket"
 * viewBox="0 0 W H"><path d="…"/></symbol> next to the others. Any page can use
 * it immediately — nothing needs rebuilding. See README.md for details.
 */

import { el } from './dom.js';

/**
 * Path to the sprite. Pages all live at the site root, so one value works
 * everywhere; if you ever nest a page in a subfolder, change this to an
 * absolute path such as '/assets/icons/icons.svg'.
 */
export const SPRITE = 'assets/icons/icons.svg';

/**
 * Build an icon element.
 *
 * @param {string} id     Sprite id, e.g. 'fad-book'. Falsy → nothing is rendered.
 * @param {object} [opts]
 * @param {string} [opts.class]  Extra classes (animation, colour, size).
 * @param {string} [opts.title]  Accessible name. Omit for purely decorative
 *                               icons — they are then hidden from screen readers,
 *                               which is what `aria-hidden="true"` did before.
 * @returns {SVGElement|null}
 */
export function icon(id, opts = {}) {
  if (!id) return null;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', ['icon', opts.class].filter(Boolean).join(' '));
  if (opts.title) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.title);
  } else {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  // `href` is the modern attribute; `xlink:href` keeps older Safari happy.
  use.setAttribute('href', `${SPRITE}#${id}`);
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `${SPRITE}#${id}`);
  svg.append(use);
  return svg;
}

/**
 * Small <img> for the brand marks that are not Font Awesome icons
 * (Scopus, Google Scholar, Semantic Scholar, Publons, SciExplore, Academia).
 */
export function brandImage(file, label) {
  return el('img', {
    src: `assets/img/brand/${file}`,
    alt: label,
    width: 18,
    height: 18,
    loading: 'lazy',
  });
}
