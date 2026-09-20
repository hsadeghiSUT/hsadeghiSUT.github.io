/**
 * scholar.mjs — parsing a Google Scholar profile, and matching it to the site.
 *
 * The pure half of `tools/fetch-scholar.mjs`: no network, no file system, no
 * `process`. Everything here is a function of its arguments, which is what lets
 * the same code be used by the fetcher, by `tools/check-scholar.mjs`, and by a
 * one-off script seeding the first snapshot from a page saved by hand.
 *
 * ── The one rule ────────────────────────────────────────────────────────────
 * `normaliseTitle()` below is duplicated, deliberately and identically, in
 * `assets/js/modules/scholar.js`. The browser has to arrive at the same key for
 * the same title or no badge would ever match. If you change it here, change it
 * there, and run `node tools/check-scholar.mjs`, which compares the two.
 */

/* -------------------------------------------------------------------------- */
/* Titles                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reduce a title to a comparison key.
 *
 * Publication titles reach us from two places that disagree about the small
 * things: `data/publications.json` carries `<b>`, `<i>` and HTML entities,
 * Scholar carries curly quotes, en dashes and its own capitalisation. Both are
 * the same paper. So the key keeps the letters and the digits and throws away
 * everything else — markup, accents, punctuation, case and spacing.
 *
 * `&` becomes the word "and" rather than disappearing, so "hydro & mechanical"
 * and "hydro and mechanical" agree instead of colliding with "hydromechanical"
 * from one side only.
 *
 * @param {string} title
 * @returns {string}
 */
export function normaliseTitle(title) {
  return String(title || '')
    // Strip markup first: `<b>Sadeghi, H.</b>` must not leave a stray "b".
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, ' and ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/&/g, ' and ')
    // Decompose accents (é → e + ́) and drop the combining marks, so Požáry
    // and Pozary are the same paper.
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Character-bigram counts for a key, used by `similarity()`. */
function bigrams(key) {
  const flat = key.replace(/ /g, '');
  const counts = new Map();
  for (let i = 0; i < flat.length - 1; i += 1) {
    const pair = flat.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) || 0) + 1);
  }
  return counts;
}

/**
 * Sørensen–Dice similarity of two keys, 0 … 1.
 *
 * Bigrams rather than words because the differences that matter here are
 * inside words — "Hydromechanical" against "Hydro-mechanical", "fruticose"
 * against "fruticosa" — and a word-level measure scores those as a whole word
 * missing.
 */
export function similarity(a, b) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  let total = 0;
  for (const n of A.values()) total += n;
  for (const [pair, n] of B) {
    total += n;
    shared += Math.min(n, A.get(pair) || 0);
  }
  return (2 * shared) / total;
}

/**
 * How close two titles must be before they are treated as the same paper.
 *
 * Measured, not guessed. Against this profile and this publication list the
 * true pairs that are not byte-identical score 0.841, 0.973 and 1.000; the
 * closest pair that is NOT the same paper — "Effect of water content on dynamic
 * properties of sand in cyclic simple shear tests" against "Effect of
 * saturation degree on dynamic properties of sand by cyclic simple shear" —
 * scores 0.771. 0.82 sits in that gap with room on both sides.
 *
 * If you widen it, re-read the report the fetcher prints: it lists every pair
 * it joined below 1.0 so a wrong join is visible rather than silent.
 */
export const MATCH_THRESHOLD = 0.82;

/**
 * The shortest prefix that is allowed to identify a paper on its own.
 *
 * Only reached for a title Scholar has truncated. Forty characters of a title
 * is a sentence fragment specific enough that two different papers sharing one
 * would be a genuine surprise; below that it starts to be "Numerical modelling
 * of…", which several of these papers legitimately share.
 */
const PREFIX_MIN = 40;

/**
 * Find the publication that a Scholar entry refers to.
 *
 * Three passes, cheapest first:
 *
 *   1. Exact key. That is the large majority of the profile and it costs one
 *      hash lookup.
 *
 *   2. Prefix, but only for a title Scholar itself truncated. The profile table
 *      cuts a long title off at about 190 characters and ends it with "…", and
 *      the two longest papers here are past that — the site holds the whole
 *      title, Scholar holds the first two thirds of it, and bigram similarity
 *      reads the missing third as a third of the paper being different. So a
 *      truncated entry is matched on what Scholar did send, minus the last word
 *      (which the cut usually left half-finished).
 *
 *   3. Bigram similarity, for the ordinary spelling differences — a hyphen,
 *      a vowel at the end of a species name, British and American spelling.
 *
 * @param {string} scholarKey        normalised Scholar title
 * @param {Map<string,object>} byKey normalised publication title → entry
 * @param {boolean} [truncated]      the raw Scholar title ended in an ellipsis
 * @returns {{ key: string, score: number }|null}
 */
export function matchTitle(scholarKey, byKey, truncated = false) {
  if (byKey.has(scholarKey)) return { key: scholarKey, score: 1 };

  if (truncated) {
    const prefix = scholarKey.replace(/\s+\S*$/, '');
    if (prefix.length >= PREFIX_MIN) {
      const hits = [...byKey.keys()].filter((key) => key.startsWith(prefix));
      // Exactly one candidate, or none. Two publications sharing forty
      // characters of opening is a real ambiguity and is left for the human
      // reading the report rather than resolved by picking the first.
      if (hits.length === 1) return { key: hits[0], score: 0.99 };
    }
  }

  let best = null;
  for (const key of byKey.keys()) {
    const score = similarity(scholarKey, key);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) best = { key, score };
  }
  return best;
}

/* -------------------------------------------------------------------------- */
/* Reading the profile page                                                    */
/* -------------------------------------------------------------------------- */

/** Undo the handful of HTML entities Scholar actually emits in a title. */
function decode(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

/**
 * Is this a real profile page, or is it Google asking us to prove we are human?
 *
 * Worth checking explicitly. A consent page and a captcha page both come back
 * as `200 OK` with a body full of HTML, and a parser that merely finds no rows
 * in them would report "0 publications" — which the fetcher would then be
 * within its rights to write over a perfectly good snapshot.
 *
 * @param {string} html
 * @returns {string|null} a reason to abort, or null if the page looks right
 */
export function rejectionReason(html) {
  if (!html || html.length < 500) return 'the response was empty or truncated';
  if (/id="?captcha|g-recaptcha|unusual traffic|IsCaptcha/i.test(html)) {
    return 'Google served a captcha instead of the profile';
  }
  if (/consent\.google\.com|Before you continue to Google/i.test(html)) {
    return 'Google served a consent interstitial instead of the profile';
  }
  if (!/gsc_a_tr|gsc_rsb_std/.test(html)) {
    return 'the page carries no profile table (wrong user id, or the markup changed)';
  }
  return null;
}

/**
 * Pull the three summary numbers out of a profile page.
 *
 * The summary table is six cells: citations, h-index and i10-index, each given
 * twice — "All" then "Since <year>". We want the first of each pair.
 *
 * @param {string} html
 * @returns {{citations:number,hIndex:number,i10Index:number}|null}
 */
export function parseMetrics(html) {
  const cells = [...html.matchAll(/<td[^>]*class="[^"]*gsc_rsb_std[^"]*"[^>]*>([\d,]+)<\/td>/g)]
    .map((m) => Number(m[1].replace(/,/g, '')));
  if (cells.length < 6) return null;

  const [citations, , hIndex, , i10Index] = cells;
  if (![citations, hIndex, i10Index].every((n) => Number.isFinite(n) && n >= 0)) return null;
  return { citations, hIndex, i10Index };
}

/**
 * Pull one page of article rows out of a profile page.
 *
 * Each row is `<tr class="gsc_a_tr">` holding the title anchor, the authors,
 * the venue, a cited-by anchor and the year. The cited-by cell is empty for an
 * uncited paper, which is why the count is parsed permissively and defaults
 * to 0 rather than failing the row.
 *
 * @param {string} html
 * @returns {Array<{title:string, citedBy:number, year:number|null, citesUrl:string|null}>}
 */
export function parseArticles(html) {
  const rows = html.split(/<tr class="gsc_a_tr">/).slice(1);
  const out = [];

  for (const row of rows) {
    const title = row.match(/<a[^>]*class="gsc_a_at"[^>]*>([\s\S]*?)<\/a>/);
    if (!title) continue;

    const cited = row.match(
      /<a[^>]*href="([^"]*cites=[^"]*)"[^>]*class="[^"]*gsc_a_ac[^"]*"[^>]*>\s*(\d*)\s*<\/a>/,
    );
    const year = row.match(/<span[^>]*class="[^"]*gsc_a_h[^"]*"[^>]*>\s*(\d{4})\s*<\/span>/);

    out.push({
      title: decode(title[1].replace(/<[^>]*>/g, '')),
      citedBy: cited && cited[2] ? Number(cited[2]) : 0,
      year: year ? Number(year[1]) : null,
      // The list of papers that cite this one. Kept so the badge on the
      // Publications page can be a link rather than a dead number — and left
      // null when Scholar does not offer one, in which case the badge is plain
      // text. Relative URLs are made absolute so the file is self-contained.
      citesUrl: cited ? new URL(decode(cited[1]), 'https://scholar.google.com/').href : null,
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Building the snapshot                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Turn parsed metrics and articles into the object written to
 * `data/scholar.json`, joined against the site's own publication list.
 *
 * WHY THE JOIN HAPPENS HERE AND NOT IN THE BROWSER
 * ------------------------------------------------
 * Three of the matches on this profile are inexact, and finding them needs a
 * pass over every publication title for every unmatched Scholar entry. That is
 * nothing on a laptop once a month and it is real work on a phone on every
 * page load. So the fuzzy half runs once, here, and the browser is left with a
 * hash lookup.
 *
 * Each paper therefore carries up to two keys: `key`, from the Scholar title,
 * and `match`, from the site's own title where the two are spelled differently.
 * The browser indexes both, so editing a title on either side degrades to "this
 * one badge is missing until the next fetch" rather than to a silent wipe.
 *
 * @param {object}   args
 * @param {object}   args.metrics   from `parseMetrics`
 * @param {Array}    args.articles  from `parseArticles`
 * @param {object}   args.publications  the parsed data/publications.json
 * @param {object}   [args.aliases]     the parsed data/scholar-aliases.json
 * @param {string}   args.profileUrl
 * @param {string}   [args.fetched] ISO date; defaults to today
 * @returns {{ snapshot: object, report: object }}
 */
export function buildSnapshot({
  metrics, articles, publications, aliases, profileUrl, fetched,
}) {
  // Hand-written joins, normalised on both sides so the file can be written in
  // ordinary prose rather than in keys. `_`-prefixed entries are the notes at
  // the top of it, not aliases — the same convention data/author-aliases.json
  // uses and the explorer already honours.
  const byAlias = new Map(
    Object.entries(aliases || {})
      .filter(([from]) => !from.startsWith('_'))
      .map(([from, to]) => [normaliseTitle(from), normaliseTitle(to)]),
  );

  const byKey = new Map();
  for (const section of publications.sections || []) {
    for (const item of section.items || []) {
      const key = normaliseTitle(item.title);
      if (key && !byKey.has(key)) byKey.set(key, { section: section.id, title: item.title });
    }
  }

  const papers = [];
  const joined = [];
  const aliased = [];
  const unmatched = [];

  // Sorted by citations so the file reads like the profile does, and so a diff
  // between two snapshots is mostly "these numbers went up".
  for (const article of [...articles].sort((a, b) => b.citedBy - a.citedBy)) {
    // An uncited paper can never earn a badge and can never move the metrics,
    // so it is left out rather than shipped to every visitor.
    if (!article.citedBy) continue;

    const key = normaliseTitle(article.title);
    if (!key) continue;

    // An alias is a decision someone made on purpose, so it outranks anything
    // the matcher would work out for itself — including a confident exact hit
    // on a different paper.
    const alias = byAlias.get(key);
    const hit = alias && byKey.has(alias)
      ? { key: alias, score: 1, alias: true }
      : matchTitle(key, byKey, /[…]|\.\.\.$/.test(article.title));
    const paper = { title: article.title, citedBy: article.citedBy };
    if (article.year) paper.year = article.year;
    if (article.citesUrl) paper.citesUrl = article.citesUrl;
    // Only when the two sides spell it differently — an identical key would be
    // a second copy of `key` in every one of ninety entries.
    if (hit && hit.key !== key) paper.match = hit.key;
    papers.push(paper);

    if (hit && !hit.alias && hit.score < 1) {
      joined.push({ score: hit.score, scholar: article.title, site: byKey.get(hit.key).title });
    }
    if (hit && hit.alias) aliased.push({ scholar: article.title, site: byKey.get(hit.key).title });
    if (!hit) unmatched.push({ citedBy: article.citedBy, title: article.title });
  }

  const snapshot = {
    _readme: 'Generated by tools/fetch-scholar.mjs — do not edit by hand. See README §18.',
    profileUrl,
    fetched: fetched || new Date().toISOString().slice(0, 10),
    metrics,
    papers,
  };

  return { snapshot, report: { joined, aliased, unmatched, total: papers.length } };
}
