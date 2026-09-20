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
 * dom.js — the four helpers that replace jQuery on this site.
 *
 * The old build shipped 89 KB of jQuery to do element selection, class toggling
 * and HTML injection. Modern browsers do all three natively; these wrappers just
 * make the call sites read nicely.
 */

/** Query one element. `$('#nav')` */
export const $ = (sel, root = document) => root.querySelector(sel);

/** Query many, as a real array so `.map()` and `.filter()` work. */
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/**
 * Build an element.
 *
 *   el('a', { class: 'link', href: '/x' }, 'Click me')
 *   el('li', {}, el('span', {}, 'nested'), ' and text')
 *
 * Attribute values that are `null`, `undefined` or `false` are skipped, which
 * lets callers write `{ href: item.url }` without guarding for missing links.
 * A `html` key sets innerHTML — used for the data files, whose text fields may
 * legitimately contain <b>, <a> and <span class="ordinal"> markup.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'html') node.innerHTML = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** Replace everything inside `parent` with `nodes`. */
export function fill(parent, ...nodes) {
  parent.replaceChildren(...nodes.flat().filter(Boolean));
  return parent;
}
