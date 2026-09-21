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
 * reveal.js — fade sections in as they scroll into view.
 *
 * Built on IntersectionObserver rather than a scroll listener, so it costs
 * nothing while the user is scrolling and needs no animation library. Elements
 * are unobserved once shown; the effect never runs twice.
 *
 * Anything marked `data-reveal` participates. Users who have asked their system
 * to reduce motion see everything immediately — the CSS handles that case, and
 * this module bails out early for them too.
 */

import { $$ } from './dom.js';

export function initReveal(root = document) {
  const nodes = $$('[data-reveal]', root);
  if (!nodes.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.02 },
  );

  nodes.forEach((n) => observer.observe(n));
}
