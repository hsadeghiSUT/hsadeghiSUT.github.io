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
 * progress.js — a 2px reading-progress line under the top bar.
 *
 * Part of the 2026 refresh. Cheap to run and genuinely useful on the long
 * pages: Publications is over a hundred entries, and the line is the only
 * indication of how much is left that survives on a phone, where there is no
 * scrollbar to look at.
 *
 * Cost control
 * ------------
 * The scroll handler writes exactly one custom property, `--progress`, and the
 * CSS turns that into a `transform: scaleX()`. Transform is compositor-only, so
 * the browser never re-lays-out or repaints the page to move the bar. Reads of
 * scroll position are batched into a `requestAnimationFrame`, so a burst of
 * scroll events collapses into one write per frame.
 *
 * The element is created here rather than in the HTML so the seven page shells
 * stay free of anything decorative — and so removing this one import removes
 * the feature completely.
 */

export function initProgress() {
  // Nothing to indicate on a page that does not scroll.
  const scrollable = () =>
    document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (scrollable() < 200) return;

  // Honour a reduced-motion preference by simply not adding the bar; it is a
  // purely decorative motion cue.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);

  let ticking = false;
  const update = () => {
    const max = scrollable();
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.setProperty('--progress', ratio.toFixed(4));
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}
