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
 * sectionnav.js — a sticky jump bar for the pages that are too long to scroll.
 *
 * THE PROBLEM
 * -----------
 * Publications is six sections and about a hundred entries; Research Team is
 * five sections and nearly forty people. On a desktop the sidebar lists those
 * sections and the scrollspy marks where you are, so the page is navigable. On
 * a phone the sidebar drops *below* the article — which means the only way to
 * reach the Persian publications is to scroll past everything in front of them.
 * That is the single worst thing about this site on a phone.
 *
 * WHAT THIS DOES
 * --------------
 * Builds a horizontally scrolling row of section chips and sticks it under the
 * header, so any subsection is one tap away from anywhere on the page. The
 * active chip is marked as you scroll and scrolls itself into view, so the bar
 * always shows where you are as well as where you can go.
 *
 * It is built from the sections already in the document — there is no list to
 * keep in sync. Add a section to a JSON file and a chip appears for it.
 *
 * WHERE IT APPEARS
 * ----------------
 * Below 64rem only. Above that the sidebar is beside the article, visible the
 * whole way down and already doing this job; a second navigation would be
 * duplication rather than help. The rule lives in fx.css, not here.
 *
 * TOUCH
 * -----
 * The row scrolls with a finger, snaps to chips, and never traps a vertical
 * swipe (`touch-action: pan-x pan-y`). Chips are 44 px tall — the smallest a
 * target should be for a thumb.
 */

import { $, $$, el } from './dom.js';
import { icon } from './icons.js';

/**
 * Mount the bar.
 *
 * @param {Document|HTMLElement} root
 */
export function initSectionNav(root = document) {
  const shell = $('.shell', root);
  const sections = $$('.entry-section[id]', root);
  if (!shell || sections.length < 2) return;
  if ($('.secnav', root)) return;                       // already mounted

  /* ---- build ------------------------------------------------------------- */
  const chips = sections.map((section) => {
    const heading = $('h3', section);
    const label = heading ? heading.textContent.trim() : section.id;
    // Reuse the section's own icon so the chip and the heading are visibly the
    // same thing. `icon()` returns a fresh node, so nothing is moved.
    const iconId = heading && $('svg use', heading)
      ? $('svg use', heading).getAttribute('href').split('#')[1]
      : null;

    const link = el(
      'a',
      { class: 'secnav__chip', href: `#${section.id}` },
      iconId ? icon(iconId) : null,
      el('span', { text: label }),
    );
    return { section, link };
  });

  const bar = el(
    'nav',
    { class: 'secnav', 'aria-label': 'Sections on this page' },
    el('div', { class: 'secnav__scroll' }, chips.map((c) => c.link)),
  );

  // Between the page heading and the article, so it is the first thing under
  // the title and the last thing before the content it navigates.
  const layout = $('.layout', shell);
  if (layout) shell.insertBefore(bar, layout);
  else shell.append(bar);

  /* ---- keep the page's scroll offset honest ------------------------------ */
  /* base.css already offsets anchor targets by the header height. With this bar
     stuck underneath it, that is no longer enough, so its measured height is
     published as a custom property and the offset adds it in. Measured rather
     than guessed: the bar's height depends on the font size, which changes with
     the viewport. */
  const publishHeight = () => {
    const h = bar.offsetHeight;
    document.documentElement.style.setProperty('--secnav-h', h ? `${h}px` : '0px');
  };
  publishHeight();
  if ('ResizeObserver' in window) new ResizeObserver(publishHeight).observe(bar);
  else window.addEventListener('resize', publishHeight, { passive: true });

  /* ---- which chip is current --------------------------------------------- */
  let current = null;
  const setCurrent = (entry) => {
    if (!entry || entry.link === current) return;
    if (current) {
      current.classList.remove('is-current');
      current.removeAttribute('aria-current');
    }
    current = entry.link;
    current.classList.add('is-current');
    current.setAttribute('aria-current', 'true');

    centre(current);
  };

  /**
   * Slide a chip to the middle of the bar.
   *
   * This scrolls the bar's own scroller by hand rather than calling
   * `scrollIntoView`. That is not fussiness: `scrollIntoView` is free to scroll
   * *any* ancestor scrollport, including the document, and doing so cancels a
   * smooth scroll already in flight. Since the scrollspy marks chips as
   * sections pass by, a tap on a distant chip would be interrupted a few
   * hundred pixels in and the page would stop short of where it was going —
   * which is exactly what happened before this was written this way.
   */
  function centre(chip) {
    const scroller = chip.parentElement;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const target = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
    const left = Math.max(0, Math.min(target, scroller.scrollWidth - scroller.clientWidth));
    if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ left, behavior: 'smooth' });
    else scroller.scrollLeft = left;
  }

  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        if (!visible.size) return;
        const top = [...visible].sort(
          (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        )[0];
        setCurrent(chips.find((c) => c.section === top));
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: 0 },
    );
    chips.forEach((c) => observer.observe(c.section));
  }

  // Mark on tap as well, so the chip responds before the smooth scroll lands.
  chips.forEach((c) => c.link.addEventListener('click', () => setCurrent(c)));
}
