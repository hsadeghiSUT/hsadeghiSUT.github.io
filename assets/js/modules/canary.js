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
 * canary.js — tells you when this site is running somewhere it should not be.
 *
 * READ THIS FIRST: WHAT THIS IS NOT
 * ---------------------------------
 * It is not copy protection, because there is no such thing for a web page.
 * Every stylesheet, module and JSON file here is sent to the visitor's browser
 * in order to be used; a browser that can render the site can save it. Nothing
 * changes that — not minification, not obfuscation, not disabling right-click,
 * not blocking DevTools. Those measures are all bypassed in seconds, and each
 * one costs something real: broken accessibility, broken search indexing,
 * broken printing, and a site that is harder for its owner to maintain than for
 * anyone else to steal.
 *
 * So this file does not try to stop copying. It does the thing that is actually
 * achievable and actually useful: it makes a copy ANNOUNCE ITSELF.
 *
 * HOW IT WORKS
 * ------------
 * Someone who takes this site takes the JavaScript with it, and this module is
 * inside that JavaScript. When it runs, it looks at the hostname it is running
 * on. If that hostname is not one of the site's own — and is not a local
 * address, because the owner develops locally — then this code is executing
 * somewhere it was never deployed, and it says so:
 *
 *   1. through the analytics that are already on the page. `gtag` is loaded on
 *      every page; the event goes to the same property as everything else, so
 *      the owner can see it in the same place they already look, and set an
 *      alert on it. No new host is contacted and no new request is made — which
 *      is why `tools/check-offline.mjs` still passes with this in place.
 *   2. in the console, so that anyone inspecting the copy can see whose it is.
 *
 * There is a second, quieter signal that costs nothing: Google Analytics
 * already records the hostname of every pageview. A wholesale copy that keeps
 * the tag reports itself into this property under a different hostname whether
 * this file exists or not. This module makes that explicit and nameable rather
 * than something you would have to go looking for.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * --------------------------------
 * It does not deface the copy, redirect it, blank the page or show a banner.
 * That is tempting and it is a bad idea: the same code would fire on a legitimate
 * mirror, on an archive, on a translation proxy, and on the owner's own staging
 * host the first time they forget to update the list — and a site that breaks
 * itself when it is unsure is worse than one that quietly reports. It also does
 * not touch anything a visitor can see or feel. If it fails, it fails silently.
 *
 * TO CHANGE THE LIST
 * ------------------
 * `origins` in `data/site.json`. Hostnames only, no scheme and no path. Add any
 * staging or mirror host you use, or the reports will be about you.
 */

/** Hostnames that are never a copy: local development, and a file:// page. */
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|.*\.local)$/i;

/**
 * The fingerprint. It travels inside the copied file, and it is deliberately a
 * string nobody types by accident, so a web search or a GitHub code search for
 * it finds copies rather than coincidences. See README §19.
 */
export const FINGERPRINT = 'hs-geotech-2026-6f3ad1';

/**
 * @param {object} site  data/site.json
 */
export function initCanary(site) {
  let here = '';
  try { here = String(window.location.hostname || '').toLowerCase(); } catch { return; }

  // A file:// page, or something with no hostname at all: not a copy, just not
  // being served. The owner opening the folder locally lands here.
  if (!here || LOCAL.test(here)) return;

  const allowed = [];
  // The site's own address, taken from the same field the canonical URLs use,
  // so there is one place that says where this site lives.
  try {
    if (site && site.baseUrl) allowed.push(new URL(site.baseUrl).hostname.toLowerCase());
  } catch { /* a malformed baseUrl should not break the page */ }
  for (const extra of (site && site.origins) || []) {
    if (typeof extra === 'string' && extra.trim()) allowed.push(extra.trim().toLowerCase());
  }

  // Nothing to compare against: say nothing rather than report every visitor.
  if (!allowed.length) return;
  // `baseUrl`'s host is usually in `origins` as well; one copy is enough.
  const hosts = [...new Set(allowed)];

  /* A subdomain of an allowed host counts as the same site: `www.sharif.edu`
     matches `sharif.edu`. A host that merely ENDS with the same letters does
     not — "notsharif.edu" must not pass — hence the leading dot. */
  const mine = hosts.some((host) => here === host || here.endsWith('.' + host));
  if (mine) return;

  const detail = {
    origin_host: here,
    origin_path: String(window.location.pathname || '').slice(0, 120),
    referrer: String(document.referrer || '').slice(0, 200),
    fingerprint: FINGERPRINT,
    expected: hosts.join(','),
  };

  try {
    if (typeof window.gtag === 'function') {
      /* `non_interaction` keeps it out of engagement metrics — this is a fact
         about the page, not something the visitor did. */
      window.gtag('event', 'unlicensed_origin', { ...detail, non_interaction: true });
    }
  } catch { /* analytics blocked, or not loaded: the console notice still runs */ }

  try {
    console.warn(
      `%c${site.name || 'This site'}%c — this page is a copy.\n` +
      `Design, code and content © ${new Date().getFullYear()} ${site.name || ''}. ` +
      `Served from "${here}"; the original is ${site.baseUrl || 'unknown'}.`,
      'font-weight:bold', 'font-weight:normal',
    );
  } catch { /* nothing */ }
}
