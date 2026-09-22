#!/usr/bin/env node
/**
 * Stamp every code URL with the build version, into `_site/`.
 *
 * WHY THIS EXISTS
 * ---------------
 * GitHub Pages serves `assets/**` with `Cache-Control: max-age=14400`, and that
 * header cannot be changed at the origin. The site's asset URLs never changed,
 * so for four hours after a deploy a returning browser kept running the code it
 * already had. On 2026-09-21 that meant visitors were still served an
 * `explorer/index.js` from three weeks earlier, which had no Impact and no
 * Influence tab in it — and a hard reload did NOT fix it, because the explorer
 * is reached through an `import()` fired from a promise callback after the page
 * has loaded, and a request made that late falls back to the ordinary HTTP
 * cache instead of the reload's no-cache mode.
 *
 * The cure is to make the URL itself change when the deploy changes:
 * `main.js?v=<commit>`. A browser has no entry for a URL it has never seen, so
 * it fetches. No header, no purge, no waiting.
 *
 * WHY THE WHOLE GRAPH, NOT JUST THE ENTRY POINT
 * ---------------------------------------------
 * Half-versioning is worse than none. A fresh `main.js?v=b` that still imports
 * `./modules/data.js` gets the cached `data.js`: a module graph with two deploys
 * in it, which fails in ways that look like nothing at all. So every relative
 * `.js` specifier inside `assets/js/**` is stamped with the same version. They
 * all move together or none of them does.
 *
 * THE VENDORED LIBRARY IS STAMPED BY CONTENT, NOT BY BUILD
 * -------------------------------------------------------
 * `assets/vendor/three/` is 2.1 MB and changes only when three.js is deliberately
 * upgraded. Stamping it with the build version would make every visitor
 * re-download it on every deploy, to fix a staleness that cannot happen while
 * the bytes are identical. It gets a hash of its own contents instead: stable
 * across deploys, and different the moment the library actually changes.
 *
 * WHAT IS DELIBERATELY NOT STAMPED
 * --------------------------------
 * `data/*.json` — already fetched with `cache: 'no-cache'` (modules/data.js,
 * modules/scholar.js), so it revalidates on every load and was never stale.
 * Images, fonts and the icon sprite — content-stable, and some are fetched with
 * `force-cache` on purpose. The problem being solved here is code, which is the
 * thing that silently disagrees with itself when it arrives from two deploys.
 *
 * `new URL('…', import.meta.url)` in icons3d/models/symbols.js needs nothing:
 * resolving a relative path against a base drops the base's query, so the
 * texture URL is unaffected by the `?v=` on the module that asks for it.
 *
 * USAGE
 *   node tools/fingerprint.mjs            # → _site/, version from git HEAD
 *   node tools/fingerprint.mjs --out dir  # somewhere else
 *
 * The repository is never rewritten — only the copy in `_site/`. `tools/serve.py`
 * goes on serving the plain sources, which is what you want while editing.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argOut = process.argv.indexOf('--out');
const OUT = path.resolve(ROOT, argOut > -1 ? process.argv[argOut + 1] : '_site');

/** Never shipped: version control, CI definitions, and the output itself. */
const SKIP = new Set(['.git', '.github', '_site', 'node_modules', '.gitignore', '.gitattributes']);

/** The three shapes a relative import takes in this codebase. */
const JS_PATTERNS = [
  /(\bfrom\s*')(\.{1,2}\/[^']+\.js)(')/g,
  /(\bimport\s*\(\s*')(\.{1,2}\/[^']+\.js)(')/g,
  /(\bimport\s*')(\.{1,2}\/[^']+\.js)(')/g,
];

/** `href="assets/….css"` and `src="assets/….js"` in the page files. */
const HTML_PATTERN = /((?:href|src)=")(assets\/[^"?#]+\.(?:css|js))(")/g;

/** The one place the vendored library is named, and its own one import. */
const VENDOR_PATTERNS = [
  /(')((?:\.\.\/)+vendor\/three\/three\.module\.js)(')/g,
  /(\bfrom\s*')(\.\/three\.core\.js)(')/g,
];

const problems = [];

/**
 * The commit actually being built.
 *
 * Read from the checked-out tree, NOT from GITHUB_SHA. For a scheduled run that
 * commits and then deploys — which is what the Scholar refresh does — the
 * event's SHA is the head from before that commit, and trusting it would stamp
 * a build with the version of the tree it replaces.
 */
function version() {
  try {
    return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { cwd: ROOT })
      .toString().trim();
  } catch {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 10);
    throw new Error('no git checkout and no GITHUB_SHA: cannot version this build');
  }
}

/**
 * Is this match real code, or a line of the prose above it?
 *
 * These files document their own imports — `fx/three.js` spells out the very
 * `from './three.core.js'` line that three.module.js contains — and a stamped
 * comment is at best noise and at worst a lie about a file that is not there.
 * Line-level is enough: nothing here opens a block comment mid-statement.
 */
function isCode(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const line = text.slice(start, index);
  const trimmed = line.trimStart();
  if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return false;
  return !line.includes('//');
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Rewrite one file, checking that every URL it points at actually exists. */
async function stamp(file, patterns, resolveFrom, v) {
  const before = await readFile(file, 'utf8');
  let count = 0;

  const after = patterns.reduce((text, pattern) => text.replace(
    pattern,
    (whole, head, spec, tail, index, full) => {
      if (!isCode(full, index)) return whole;
      const target = path.resolve(resolveFrom(file), spec);
      if (!existsSync(target)) {
        problems.push(`${path.relative(OUT, file)} → ${spec} (no such file)`);
        return whole;
      }
      count += 1;
      return `${head}${spec}?v=${v}${tail}`;
    },
  ), before);

  if (after !== before) await writeFile(file, after);
  return count;
}

const isSiteJs = (file) =>
  file.endsWith('.js') && file.includes(`${path.sep}assets${path.sep}js${path.sep}`);
const isVendorJs = (file) =>
  file.endsWith('.js') && file.includes(`${path.sep}assets${path.sep}vendor${path.sep}`);

const v = version();

await rm(OUT, { recursive: true, force: true });

/* Hand-rolled rather than `fs.cp`, which refuses a destination inside its
   source — and `_site/` inside the repository is exactly that. */
async function copyTree(from, to) {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) await copyTree(src, dest);
    else await copyFile(src, dest);
  }
}
await copyTree(ROOT, OUT);

const files = await walk(OUT);

/* The library's own version: a hash of the bytes that would be served. */
const vendorHash = createHash('sha1');
for (const file of files.filter(isVendorJs).sort()) vendorHash.update(await readFile(file));
const vendorV = vendorHash.digest('hex').slice(0, 10);

let html = 0;
let js = 0;
let vendor = 0;

for (const file of files) {
  if (file.endsWith('.html')) {
    html += await stamp(file, [HTML_PATTERN], () => OUT, v);
  } else if (isSiteJs(file) || isVendorJs(file)) {
    vendor += await stamp(file, VENDOR_PATTERNS, path.dirname, vendorV);
    if (isSiteJs(file)) js += await stamp(file, JS_PATTERNS, path.dirname, v);
  }
}

/* The safety net. If a specifier shape slipped past the patterns above, it is
   caught here — before the deploy, rather than four hours into one. */
const missed = [];
for (const file of files.filter(isSiteJs)) {
  const text = await readFile(file, 'utf8');
  for (const m of text.matchAll(/(?:from|import\s*\(?)\s*'(\.{1,2}\/[^']+\.js)'/g)) {
    if (isCode(text, m.index)) missed.push(`${path.relative(OUT, file)} → ${m[1]}`);
  }
}

await writeFile(path.join(OUT, 'build-version.txt'), `${v}\n`);

console.log(`fingerprint: v=${v}  vendor=${vendorV}`);
console.log(`  ${html} stylesheet/script references in HTML`);
console.log(`  ${js} import specifiers in assets/js`);
console.log(`  ${vendor} references to the vendored library`);
console.log(`  → ${path.relative(ROOT, OUT)}`);

if (problems.length) {
  console.error(`\nreferences pointing at files that do not exist (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
}
if (missed.length) {
  console.error(`\nimport specifiers left unstamped (${missed.length}):`);
  for (const m of missed) console.error(`  ${m}`);
}
if (problems.length || missed.length) process.exit(1);
