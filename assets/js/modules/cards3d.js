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
 * cards3d.js — the light that follows the pointer across the hero.
 *
 * WHAT IT DOES
 * ------------
 * Nothing but track the pointer. While it is over the hero, a soft highlight
 * follows it across the panel, as though a light were being moved over a
 * surface. The card itself does not move at all.
 *
 * WHY IT DOES NOT MOVE
 * --------------------
 * An earlier version leaned the panel toward the pointer and stood its contents
 * at different depths. It was a good effect on the section cards and the wrong
 * one here: this card is the first thing on the site, it holds the portrait and
 * the name, and it should sit still and be read. So the tilt was taken out and
 * the light kept. The section cards, which are targets rather than a masthead,
 * still lean — that is the highlight layer's doing (fx.css §7), not this file's.
 *
 * WHAT IT NEVER DOES
 * ------------------
 *  - Change the layout. It writes two custom properties and one class; the
 *    only thing that reads them is a gradient on a pseudo-element.
 *  - Run under `prefers-reduced-motion`, or on a touch screen, where there is
 *    no pointer to follow.
 */

import { $ } from './dom.js';

/**
 * Wire the hero up.
 *
 * @param {HTMLElement} [root]
 */
export function initCards3d(root = document) {
  const hero = $('.hero', root);
  if (!hero) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (reduced.matches || !fine.matches) return;

  let frame = 0;
  let pending = null;

  const apply = () => {
    frame = 0;
    if (!pending) return;
    hero.style.setProperty('--mx', (pending.x * 100).toFixed(1) + '%');
    hero.style.setProperty('--my', (pending.y * 100).toFixed(1) + '%');
  };

  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    pending = {
      x: (event.clientX - rect.left) / Math.max(1, rect.width),
      y: (event.clientY - rect.top) / Math.max(1, rect.height),
    };
    // One write per frame at most: pointermove fires far more often than the
    // screen refreshes, and every write here invalidates a composited layer.
    if (!frame) frame = requestAnimationFrame(apply);
  }, { passive: true });

  hero.addEventListener('pointerenter', () => hero.classList.add('is-lit-surface'));

  hero.addEventListener('pointerleave', () => {
    hero.classList.remove('is-lit-surface');
    pending = null;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
  });
}
