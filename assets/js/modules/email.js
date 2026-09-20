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
 * email.js — write the address out without putting it in the source as plain text.
 *
 * The old site did this with a file of HTML entities split across a string
 * concatenation. Same idea, but the two halves now live in `data/home.json`
 * (`emailParts`) so the address can be changed without touching any code, and
 * the result is a real mailto: link rather than inert text.
 */

import { el } from './dom.js';

/**
 * @param {HTMLElement} host  Where to write the link.
 * @param {[string,string]} parts  `['hsadeghi', 'sharif.edu']`
 */
export function renderEmail(host, parts) {
  if (!host || !parts || parts.length < 2) return;
  const address = `${parts[0]}@${parts[1]}`;
  host.replaceChildren(
    el('a', { href: `mailto:${address}`, text: address }),
  );
}
