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
 * scholar.js — the Google Scholar figures, and the rule that they are optional.
 *
 * WHAT THE PAGE SHOWS
 * -------------------
 *   Summary page      citations, h-index and i10-index, in the hero card.
 *   Publications page "Cited by N" on every paper at or above MIN_CITED_BY.
 *
 * WHERE THE NUMBERS COME FROM
 * ---------------------------
 * `data/scholar.json`, a local file, fetched alongside the page's other data
 * files. Not from Google. `tools/fetch-scholar.mjs` talks to Google, on a
 * machine that can reach it, whenever you choose to run it; the browser only
 * ever reads the file that produced. README §18 has the whole story.
 *
 * That is what makes the feature survive its own failure modes. A visitor
 * behind a national block on Google, a visitor with a flaky connection, a
 * visitor whose network eats the request — none of them are talking to Google
 * in the first place, so none of them wait for it and none of them see a
 * half-loaded figure.
 *
 * THE RULE
 * --------
 * **Nothing is rendered unless the number behind it is known.** Not a zero, not
 * a dash, not a spinner, not an empty box where a figure would be. If
 * `data/scholar.json` is missing, unreadable, malformed, too old to trust, or
 * carries a figure that does not look like a figure, every function here
 * returns null and the page renders exactly as it did before this file existed.
 *
 * Everything below is written so that the only way out is a valid value or
 * null. There is no throw path a caller has to catch.
 */

/**
 * Papers below this many citations show no badge.
 *
 * ONE, which means every paper that has been cited at all.
 *
 * It was ten, and the argument for ten was editorial: a "Cited by 3" under
 * sixty entries is noise, and the list runs newest-first, where the newest
 * papers are the least cited by simple arithmetic. The argument the other way
 * turned out to be stronger. A citation is a fact about a paper, and the
 * threshold was hiding that fact on thirty-seven of the eighty-eight papers
 * Google knows have been cited — a reader looking at one of those thirty-seven
 * could not tell "not cited" from "cited, but not enough for this website to
 * say so". On a page whose whole job is the record, that is the wrong silence.
 *
 * At one the badge still means what it says, and a paper with no citations
 * still shows nothing at all — which is the distinction worth keeping.
 *
 * Changing this number needs NO re-fetch: `data/scholar.json` carries every
 * cited paper, not only the ones above the line. `tools/check-scholar.mjs` and
 * `tools/fetch-scholar.mjs` both read it from here, so there is one number and
 * they cannot disagree with the page about it.
 */
export const MIN_CITED_BY = 1;

/**
 * How old a snapshot may be and still be shown, in days.
 *
 * A year and a bit, so an annual refresh keeps it alive with room to spare.
 * Past that the figures are quietly dropped rather than shown, on the same
 * principle as everything else here: an h-index that stopped being true two
 * years ago is worse than no h-index at all, and it is worse precisely because
 * nothing about it looks broken.
 *
 * When this is what hides the numbers, the console says so — it is the one
 * failure that is a reminder rather than a fault.
 */
export const MAX_AGE_DAYS = 400;

/** Where the snapshot lives, relative to the pages (which are all at the root). */
const SOURCE = 'data/scholar.json';

/** Resolved once per page; a second caller gets the same promise, not a second fetch. */
let pending = null;

/**
 * Load the snapshot, or resolve to null.
 *
 * Never rejects. Callers are meant to be able to write
 *
 *     const scholar = await loadScholar();
 *
 * with no try/catch and no `.catch()`, and then simply test the result — so the
 * absence of the data is one branch in the renderer rather than an error path
 * running through the whole page.
 *
 * @returns {Promise<object|null>}
 */
export function loadScholar() {
  if (!pending) {
    pending = fetch(SOURCE, { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : null))
      .then(validate)
      .catch(() => null);
  }
  return pending;
}

/**
 * Decide whether a parsed snapshot may be shown.
 *
 * Three things are checked, and each of them has actually happened to somebody:
 * the file is there but empty (a fetch that failed midway and was saved), the
 * figures are zero (a parser that matched nothing), the file is years old (a
 * site that moved and left its tooling behind).
 *
 * @param {any} data
 * @returns {object|null}
 */
function validate(data) {
  if (!data || typeof data !== 'object') return null;

  const m = data.metrics;
  const ok = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  // i10 is allowed to be zero — an early-career profile genuinely has none —
  // but citations and an h-index of zero mean the summary table was not read.
  const metrics = m && ok(m.citations) && ok(m.hIndex)
      && typeof m.i10Index === 'number' && m.i10Index >= 0
    ? m
    : null;

  const age = ageInDays(data.fetched);
  if (age !== null && age > MAX_AGE_DAYS) {
    console.info(
      `scholar: data/scholar.json is ${Math.round(age)} days old, past the ${MAX_AGE_DAYS}-day `
      + 'limit in assets/js/modules/scholar.js, so the figures are being left off the page. '
      + 'Run `node tools/fetch-scholar.mjs` to refresh it. See README §18.',
    );
    return null;
  }

  const papers = Array.isArray(data.papers) ? data.papers : [];
  if (!metrics && !papers.length) return null;

  return { ...data, metrics, papers };
}

/** Whole days since an ISO date, or null if it is not one. */
function ageInDays(iso) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  return (Date.now() - then) / 86_400_000;
}

/* -------------------------------------------------------------------------- */
/* Titles                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reduce a title to a comparison key.
 *
 * KEEP THIS IDENTICAL to `normaliseTitle` in `tools/lib/scholar.mjs`. The tool
 * writes keys with its copy and the browser looks them up with this one; if the
 * two ever disagree about a character, every badge silently stops appearing.
 * `node tools/check-scholar.mjs` compares them and fails if they have drifted.
 *
 * It is duplicated rather than shared because the tool is a Node script and
 * this is a browser module, and the alternative — a third file imported by
 * both — would put a build step between editing this site and seeing it.
 *
 * @param {string} title
 * @returns {string}
 */
export function normaliseTitle(title) {
  return String(title || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, ' and ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/&/g, ' and ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Build the title → citation lookup the Publications page uses.
 *
 * Every paper is indexed under both keys it may carry: the one from Google's
 * spelling of the title and, where the fetcher found the two sides spelled
 * differently, the one from this site's spelling. Indexing both is what makes
 * the feature degrade gently — correcting a typo in a publication title costs
 * that one badge until the next fetch, instead of costing all of them.
 *
 * @param {object|null} scholar  from `loadScholar()`
 * @param {number} [min]         the badge threshold
 * @returns {Map<string,{count:number,url:string|null}>|null} null when there is
 *          nothing to show, so a caller can test the map itself rather than
 *          testing the data and then the map
 */
export function citedByIndex(scholar, min = MIN_CITED_BY) {
  if (!scholar || !scholar.papers || !scholar.papers.length) return null;

  const index = new Map();
  for (const paper of scholar.papers) {
    const count = Number(paper && paper.citedBy);
    if (!Number.isFinite(count) || count < min) continue;

    const entry = { count, url: typeof paper.citesUrl === 'string' ? paper.citesUrl : null };
    const key = normaliseTitle(paper.title);
    if (key) index.set(key, entry);
    if (paper.match) index.set(String(paper.match), entry);
  }

  return index.size ? index : null;
}

/**
 * The three figures for the hero, or null.
 *
 * Returned as a list rather than an object because the hero renders them as
 * three identical tiles in this order, and the order is a display decision that
 * belongs next to the labels rather than in the page module.
 *
 * @param {object|null} scholar
 * @returns {Array<{key:string,label:string,value:number}>|null}
 */
export function metricTiles(scholar) {
  if (!scholar || !scholar.metrics) return null;
  const m = scholar.metrics;
  return [
    { key: 'citations', label: 'Citations', value: m.citations },
    { key: 'h', label: 'h-index', value: m.hIndex },
    { key: 'i10', label: 'i10-index', value: m.i10Index },
  ];
}

/**
 * The snapshot's date, written the way a reader reads a date, or null.
 *
 * "2026-09-19" → "19 September 2026".
 *
 * Built from a table rather than with `toLocaleDateString()`, for exactly the
 * reason `formatCount` below avoids `toLocaleString()`: a visitor whose browser
 * is set to fa would get Persian digits and a Jalali month in the middle of an
 * English hero, where every other date on the site is Gregorian and Latin.
 *
 * Returns null for anything that is not a date, so the caller can leave the
 * line out entirely rather than print "as of Invalid Date" — the same rule the
 * rest of this file follows.
 *
 * @param {string} iso  the `fetched` field of the snapshot
 * @returns {string|null}
 */
export function formatFetched(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = months[Number(m[2]) - 1];
  if (!month) return null;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/**
 * Format a count for display: 2066 → "2,066".
 *
 * Grouped by hand rather than with `toLocaleString()`, which would render
 * Persian digits for a visitor whose browser is set to fa — correct for a
 * Persian page and wrong in the middle of this English one, where every other
 * number on the site is Latin. The site card counts use `String(n)` for the
 * same reason; this is the one figure big enough to need a separator at all.
 */
export function formatCount(n) {
  return String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
