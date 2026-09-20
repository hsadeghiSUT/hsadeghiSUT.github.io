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
 * data.js — loading the JSON content files.
 *
 * Every page's content lives in `data/*.json`. Editing those files is the only
 * thing you need to do to update the site; no HTML or JavaScript is involved.
 *
 * Responses are cached in memory for the life of the page, so a page that asks
 * for `site.json` from three different modules only fetches it once.
 */

const cache = new Map();

/**
 * Fetch and parse one data file.
 *
 * @param {string} name  File name without the extension, e.g. 'publications'.
 * @returns {Promise<object>}
 */
export function load(name) {
  if (!cache.has(name)) {
    const url = `data/${name}.json`;
    cache.set(
      name,
      // `no-cache` revalidates with the server on every load, so an edited data
      // file shows up straight away — no version query string to remember.
      fetch(url, { cache: 'no-cache' }).then((res) => {
        if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
        return res.json();
      }),
    );
  }
  return cache.get(name);
}

/**
 * Load several files at once: `const [site, home] = await loadAll('site','home')`
 */
export const loadAll = (...names) => Promise.all(names.map(load));

/**
 * Render a friendly message in place of a section that could not load.
 *
 * The most common cause by far is opening the pages straight off the disk with
 * a file:// URL, where browsers refuse to fetch local JSON. The message says so
 * in plain language rather than leaving a blank page.
 */
export function renderError(target, err) {
  const isFileProtocol = location.protocol === 'file:';
  target.innerHTML = isFileProtocol
    ? `<div class="state state--error">
         <strong>This page needs to be served over http, not opened from a folder.</strong>
         <p>Browsers block pages loaded with a <code>file://</code> address from reading
         local data files, so the content below could not load.</p>
         <p>Run <code>python -m http.server</code> inside the site folder and open
         <code>http://localhost:8000</code> — or just upload the folder to your web
         host, where it works with no extra steps.</p>
       </div>`
    : `<div class="state state--error">
         <strong>This section could not be loaded.</strong>
         <p>${err && err.message ? err.message : 'Unknown error'}</p>
       </div>`;
  console.error(err);
}
