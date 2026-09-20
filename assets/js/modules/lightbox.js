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
 * lightbox.js — full-screen image viewer.
 *
 * Replaces the old `#myModal` markup plus three separate jQuery implementations
 * (`.open-lightbox`, `.popup img` and the hand-rolled `myModal` handlers, two of
 * which threw on every page because the elements they looked for did not exist).
 *
 * Uses the native <dialog> element, so Escape-to-close, focus trapping and the
 * backdrop all come from the browser.
 *
 * Usage: add `data-lightbox` to any <img>.
 */

import { $$, el } from './dom.js';
import { icon } from './icons.js';

let dialog;

function build() {
  const img = el('img', { class: 'lightbox__img', alt: '' });
  const caption = el('figcaption', { class: 'lightbox__caption' });
  const close = el(
    'button',
    { class: 'lightbox__close', type: 'button', 'aria-label': 'Close' },
    icon('fad-times-octagon', { class: 'icon--2x' }),
  );
  dialog = el(
    'dialog',
    { class: 'lightbox' },
    close,
    el('figure', { class: 'lightbox__figure' }, img, caption),
  );
  dialog._img = img;
  dialog._caption = caption;

  close.addEventListener('click', () => dialog.close());
  // Clicking anywhere outside the picture dismisses it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.classList.contains('lightbox__figure')) dialog.close();
  });
  document.body.append(dialog);
}

export function initLightbox(root = document) {
  const targets = $$('img[data-lightbox]', root);
  if (!targets.length) return;
  if (!dialog) build();

  for (const img of targets) {
    img.classList.add('aside__photo');
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    const open = () => {
      dialog._img.src = img.currentSrc || img.src;
      dialog._img.alt = img.alt;
      dialog._caption.textContent = img.dataset.caption || img.alt || '';
      dialog.showModal();
    };
    img.addEventListener('click', open);
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  }
}
