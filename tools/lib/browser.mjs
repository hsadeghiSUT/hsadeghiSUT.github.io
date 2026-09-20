/**
 * browser.mjs — the bit every browser-based checker needs.
 *
 * Three of the guards (Farsi typography, contrast, drop cap) have to measure
 * what a browser actually computed, not what the stylesheet says. They all need
 * the same two things: a static server for this folder, and Playwright if it
 * happens to be installed. That is all this file is.
 *
 * Playwright is optional on purpose. The site has no build step and no
 * dependencies; someone editing a JSON file should not have to install a
 * browser automation library to do it. When it is missing the guards say so and
 * exit 0 rather than failing a check they were unable to run.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize } from 'node:path';

/**
 * The site root, as a real filesystem path.
 *
 * DEFINED HERE, ONCE, BECAUSE EVERY CHECKER GOT IT WRONG THE SAME WAY. Each of
 * them used to open with
 *
 *     const ROOT = new URL('..', import.meta.url).pathname;
 *
 * which is a URL component and not a path. It keeps the leading slash, so on
 * Windows it comes out `/C:/Users/…`, and it keeps the percent-escapes, so a
 * folder with a space in its name comes out `OneDrive%20-%20The…`. `join()`
 * then makes `C:\C:\Users\…\OneDrive%20-%20…`, the server serves 404 for every
 * file on the site, and the check reports the page as broken rather than
 * reporting itself as broken — which is the worst way for this to fail.
 *
 * `fileURLToPath` is the conversion that handles the drive letter, the escapes
 * and the separators on every platform. It is also what the two checkers that
 * always worked (check-scholar, fetch-scholar) were already using.
 *
 * Two levels up, not one: this file is in `tools/lib/`, where the checkers that
 * import it are in `tools/`.
 */
export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

/**
 * Serve the site folder.
 * @param {string} root  absolute path to the site
 * @param {number} port
 */
export function serve(root, port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const path = join(root, normalize(decodeURIComponent(req.url.split('?')[0])));
      try {
        const body = await readFile(path);
        res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

/** Playwright, or null if it is not installed anywhere this process can see. */
export function loadPlaywright(fromUrl) {
  const require = createRequire(fromUrl);
  const candidates = [
    'playwright',
    '/home/claude/.npm-global/lib/node_modules/playwright/index.js',
  ];
  for (const id of candidates) {
    try { return require(id); } catch { /* try the next */ }
  }
  return null;
}

/** The seven pages, in navigation order. */
export const PAGES = [
  'index.html', 'background.html', 'honors.html', 'publications.html',
  'research-team.html', 'teaching.html', 'services.html',
];
