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
 * scrollspy.js — highlight the sidebar link for the section currently on screen.
 *
 * Part of the 2026 navigation refresh. On a page like Publications, which runs
 * to a hundred entries across six sections, the sidebar previously told you
 * where you *could* go but not where you *were*. Now the matching link is
 * marked as you scroll.
 *
 * Implementation notes
 * --------------------
 * Built on IntersectionObserver rather than a scroll handler, so it costs
 * nothing while scrolling. The observer watches a horizontal band across the
 * upper third of the viewport (`rootMargin`); the last section to enter that
 * band from either direction is the one considered current. That reads more
 * naturally than "topmost visible section", which flickers when a short section
 * and a long one are on screen together.
 *
 * The highlight is a class (`.is-current`) plus `aria-current="true"`, so it is
 * announced as well as seen.
 */

import { $$ } from './dom.js';

export function initScrollspy(root = document) {
  const links = $$('.panel__list a[href^="#"]', root);
  if (links.length < 2) return;

  // Pair each in-page link with the section it points at.
  const pairs = links
    .map((link) => {
      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      const section = id && document.getElementById(id);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (pairs.length < 2) return;

  if (!('IntersectionObserver' in window)) return;

  let currentLink = null;
  const setCurrent = (link) => {
    if (link === currentLink) return;
    if (currentLink) {
      currentLink.classList.remove('is-current');
      currentLink.removeAttribute('aria-current');
    }
    currentLink = link;
    if (currentLink) {
      currentLink.classList.add('is-current');
      // `true` rather than `location`: this marks a position within the page,
      // not the page itself — that is what the nav bar's `page` value means.
      currentLink.setAttribute('aria-current', 'true');
    }
  };

  const visible = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      if (!visible.size) return;
      // Of the sections in the band, take the one nearest the top of the page.
      const top = [...visible].sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      )[0];
      const match = pairs.find((p) => p.section === top);
      if (match) setCurrent(match.link);
    },
    // A band from just under the sticky bar down to a third of the way in.
    { rootMargin: '-15% 0px -60% 0px', threshold: 0 },
  );

  pairs.forEach((p) => observer.observe(p.section));

  // Clicking a link should mark it immediately rather than waiting for the
  // smooth scroll to arrive.
  pairs.forEach(({ link }) => link.addEventListener('click', () => setCurrent(link)));
}
