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
 * data.js — turns publications.json into a collaboration graph and a timeline.
 *
 * WHAT THIS IS FOR
 * ----------------
 * Both views of the explorer are *computed*, never authored. Add a paper to
 * data/publications.json and a co-author appears in the graph, an edge appears
 * between them and everyone else on that paper, and a card appears in the right
 * year of the timeline. There is no second list to keep in sync, which is the
 * only way a feature like this survives contact with a real publication record.
 *
 * THE HARD PART: PARSING NAMES
 * ----------------------------
 * The author field is a display string, written for humans:
 *
 *     "Yazdani, F., AliPanahi, P. & <b>Sadeghi, H.</b> (2024)"
 *
 * Splitting on commas does not work, because the comma inside "Yazdani, F." is
 * the same character as the one between authors. What actually distinguishes an
 * author is its *shape*: a surname, a comma, then a run of initials. So that is
 * what is matched — surname (possibly several words, as in "Golaghaei Darzi" or
 * "Fazel Mojtahedi"), separator, one to four initials.
 *
 * The Persian entries have the same shape with Persian punctuation (U+060C for
 * the comma), so the same rule works with a different character class.
 *
 * Names are matched, not split. Anything that does not look like a name — a
 * stray ampersand, a year, an editor's note — is simply never matched, which
 * fails in the right direction: a missed author is a missing node, not a
 * corrupt graph.
 */

/** Latin: "Golaghaei Darzi, A." / "Lavasan, A.A." */
const LATIN = /([A-Z][A-Za-z‘’'‐-―-]*(?:\s+[A-Z][A-Za-z‘’'‐-―-]*)*)\s*,\s*((?:[A-Z]\.\s*){1,4})/g;

/**
 * Persian: the same shape with U+060C as the comma. U+200C (the zero-width
 * non-joiner) is treated as a letter, because in Persian it sits *inside* words.
 */
const PERSIAN = /([ؠ-ۿ][ؠ-ۿ‌]*(?:[  ][ؠ-ۿ][ؠ-ۿ‌]*)*)\s*،\s*((?:[ؠ-ۿ]\.[\s‌]*){1,4})/g;

/**
 * Words that look like a surname but are not one: they can begin a clause that
 * happens to be followed by a comma and a capital letter.
 */
const NOT_A_NAME = new Set([
  'In', 'The', 'And', 'Vol', 'No', 'Pp', 'Ed', 'Eds', 'Paper', 'Proceedings',
  'Conference', 'Journal', 'University', 'Press', 'Presented', 'Orally',
]);

/** Strip HTML, but remember where the bold was — that is always the site owner. */
function readAuthorField(html) {
  const bolded = [];
  const text = String(html || '')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, inner) => {
      const plain = inner.replace(/<[^>]+>/g, '').trim();
      if (plain) bolded.push(plain);
      return ' ' + plain + ' ';
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { text, bolded };
}

/**
 * A stable key for a person: case-folded, punctuation-free, script-aware.
 *
 * Exported because `modules/faces.js` has to produce the same key from the
 * other end — a roster's "Ali Golaghaei Darzi" rather than a citation's
 * "Golaghaei Darzi, A." — and two spellings of the key format would be two
 * sets of people who never meet.
 */
export function authorKey(surname, initials) {
  return (surname + '|' + initials)
    .toLowerCase()
    .replace(/[.\s‌]/g, '')
    .replace(/[‘’']/g, "'");
}

/**
 * The Persian word for "and" is a single letter followed by a space, which the
 * surname pattern happily swallows as the first word of a two-word surname —
 * turning the last author of every Persian entry into a person of their own.
 * Stripping it here is cheaper and clearer than trying to express "not a
 * conjunction" inside the character class.
 */
const stripConjunction = (name) => name.replace(/^(?:و|&|and)\s+/i, '').trim();

function matchAll(re, text, out, script) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const surname = stripConjunction(m[1]);
    if (!surname || NOT_A_NAME.has(surname)) continue;
    const initials = m[2].replace(/[\s‌]+/g, '');
    out.push({
      surname,
      initials,
      script,
      label: script === 'fa' ? surname + '، ' + initials : surname + ', ' + initials,
      key: authorKey(surname, initials),
    });
  }
}

/** Every author on one publication, in order. */
export function parseAuthors(html) {
  const parsed = readAuthorField(html);
  if (!parsed.text) return [];

  const people = [];
  matchAll(LATIN, parsed.text, people, 'en');
  matchAll(PERSIAN, parsed.text, people, 'fa');

  // The bolded name is the site owner, in whichever script the entry uses.
  const boldKeys = new Set();
  for (const b of parsed.bolded) {
    const found = [];
    matchAll(LATIN, b, found, 'en');
    matchAll(PERSIAN, b, found, 'fa');
    found.forEach((p) => boldKeys.add(p.key));
  }

  // De-duplicate: a name written twice on one paper is one author of it.
  const seen = new Set();
  return people
    .filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)))
    .map((p) => ({ ...p, self: boldKeys.has(p.key) }));
}

/**
 * The year of a publication.
 *
 * Latin entries carry it in the author line, "(2024)". Persian entries carry a
 * Jalali year, "(1402)", converted with the usual +621 — exact for anything
 * published in the first nine months of the Persian year, which is where these
 * fall, and never more than a year out otherwise. It is an approximation and it
 * is documented as one: the timeline is about the shape of two decades, not
 * about months.
 */
export function parseYear(item) {
  const source = ((item.authors || '') + ' ' + (item.details || '')).replace(/<[^>]+>/g, ' ');

  const parenthesised = source.match(/\((\d{4})\)/);
  if (parenthesised) {
    const y = Number(parenthesised[1]);
    if (y >= 1300 && y <= 1500) return y + 621;
    if (y >= 1990 && y <= 2100) return y;
  }

  const gregorian = source.match(/\b(19\d{2}|20\d{2})\b/);
  if (gregorian) return Number(gregorian[1]);

  const jalali = source.match(/\b(13\d{2}|14\d{2})\b/);
  if (jalali) return Number(jalali[1]) + 621;

  return null;
}

/**
 * Build everything both views need, in one pass.
 *
 * @param {object} publications  the parsed data/publications.json
 * @param {object} [aliases]     optional { key: canonicalKey }, from
 *                               data/author-aliases.json — how the same person
 *                               written in two scripts becomes one node
 * @returns {{people: object[], edges: object[], papers: object[], years: number[], index: Map}}
 */
export function buildGraph(publications, aliases = {}) {
  const people = new Map();
  const edgeIndex = new Map();
  const papers = [];

  publications.sections.forEach((section, sectionIndex) => {
    section.items.forEach((item, itemIndex) => {
      // The same id the rendered list carries, so a click on a node can find the
      // entries it belongs to without matching on titles.
      const id = sectionIndex + ':' + itemIndex;
      const authors = parseAuthors(item.authors).map((a) => ({
        ...a,
        key: aliases[a.key] || a.key,
      }));

      papers.push({
        id,
        sectionIndex,
        sectionId: section.id,
        sectionTitle: section.title,
        rtl: !!section.rtl,
        title: String(item.title || '').replace(/<[^>]+>/g, ''),
        year: parseYear(item),
        authorKeys: authors.map((a) => a.key),
      });

      for (const a of authors) {
        let person = people.get(a.key);
        if (!person) {
          person = {
            key: a.key,
            label: a.label,
            surname: a.surname,
            script: a.script,
            self: false,
            papers: [],
            sections: new Set(),
          };
          people.set(a.key, person);
        }
        // An alias may point a Persian spelling at a Latin node; keep the Latin
        // label, which is the one most visitors can read.
        if (person.script === 'fa' && a.script === 'en') {
          person.label = a.label;
          person.surname = a.surname;
          person.script = 'en';
        }
        person.self = person.self || a.self;
        person.papers.push(id);
        person.sections.add(sectionIndex);
      }

      // One edge per pair of authors on this paper; weight is how many papers
      // the two of them share.
      for (let i = 0; i < authors.length; i++) {
        for (let j = i + 1; j < authors.length; j++) {
          const pair = [authors[i].key, authors[j].key].sort();
          const pairKey = pair[0] + ' ' + pair[1];
          const existing = edgeIndex.get(pairKey);
          if (existing) { existing.weight += 1; existing.papers.push(id); }
          else edgeIndex.set(pairKey, { a: pair[0], b: pair[1], weight: 1, papers: [id] });
        }
      }
    });
  });

  // The site owner writes his own name in two scripts. Both are marked by the
  // bold in the source, so both are found without a rule naming him — and both
  // are merged here, because an ego network with two egos reads as a bug.
  const selves = [...people.values()].filter((p) => p.self);
  if (selves.length > 1) {
    const canonical = selves.find((p) => p.script === 'en') || selves[0];
    for (const other of selves) {
      if (other === canonical) continue;
      canonical.papers.push(...other.papers);
      other.sections.forEach((s) => canonical.sections.add(s));
      people.delete(other.key);
      // Re-point every edge and every paper that referenced the other spelling.
      for (const e of edgeIndex.values()) {
        if (e.a === other.key) e.a = canonical.key;
        if (e.b === other.key) e.b = canonical.key;
      }
      for (const paper of papers) {
        paper.authorKeys = paper.authorKeys.map((k) => (k === other.key ? canonical.key : k));
      }
    }
    canonical.papers = [...new Set(canonical.papers)];

    /* Re-pointing can turn two edges into the same pair, and did: anyone who
       wrote with the owner on an English paper AND on a Persian one had an
       edge to each spelling of him, and both now name the same two people. Left
       alone that is 330 edges for 308 collaborations — a line drawn twice, a
       weight that undercounts, and a co-author listed twice by anything reading
       this list (the "More info" panel on the roster did exactly that).

       The index is rebuilt rather than patched because the pair key itself is
       what changed. */
    const collapsed = new Map();
    for (const e of edgeIndex.values()) {
      const pair = [e.a, e.b].sort();
      const pairKey = pair[0] + ' ' + pair[1];
      const existing = collapsed.get(pairKey);
      if (existing) {
        existing.papers.push(...e.papers);
        // One paper can reach this twice — both spellings on the same entry.
        existing.papers = [...new Set(existing.papers)];
        existing.weight = existing.papers.length;
      } else {
        collapsed.set(pairKey, { a: pair[0], b: pair[1], weight: e.weight, papers: [...e.papers] });
      }
    }
    edgeIndex.clear();
    for (const [pairKey, e] of collapsed) edgeIndex.set(pairKey, e);
  }

  const list = [...people.values()].map((p) => ({
    ...p,
    count: p.papers.length,
    sections: [...p.sections],
  }));

  // Deterministic order: most papers first, then alphabetical. The layout seeds
  // each node from its index, so this is also what makes the graph come out the
  // same shape on every load.
  list.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const index = new Map(list.map((p, i) => [p.key, i]));
  const edges = [...edgeIndex.values()]
    .filter((e) => e.a !== e.b && index.has(e.a) && index.has(e.b))
    .map((e) => ({ ...e, source: index.get(e.a), target: index.get(e.b) }));

  const years = [...new Set(papers.map((p) => p.year).filter(Boolean))].sort((a, b) => a - b);

  return { people: list, edges, papers, years, index };
}

/* -------------------------------------------------------------------------- */
/* Citations                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Hang the Google Scholar citation counts on a graph that was built without them.
 *
 * WHY IT IS A SECOND PASS AND NOT AN ARGUMENT TO buildGraph
 * ---------------------------------------------------------
 * Because the graph has to be able to exist without them, and saying so once
 * here is better than threading an optional argument through everything that
 * touches it. `data/scholar.json` is allowed to be missing, stale or refused
 * (README §18), and when it is, this function is simply never called: every
 * paper keeps `citedBy` of zero, `graph.citations.known` stays false, and every
 * view reads exactly as it did before citations existed. There is one branch
 * for "no citation data", and it is a flag rather than a code path.
 *
 * It also keeps this module honest about where numbers come from. `buildGraph`
 * is a function of `data/publications.json` alone and nothing else, which is
 * what makes the graph reproducible from the file a person actually edits.
 * Citations arrive from somewhere else, so they arrive separately.
 *
 * WHAT A PERSON'S CITATION COUNT MEANS
 * ------------------------------------
 * The sum of the citations of every paper they are on — not a share of them.
 * Two people on one 277-citation paper each count 277. That is the usual
 * convention for a co-authorship view and it is the only one that does not
 * require deciding, silently, how much of a paper each author is responsible
 * for. It does mean the per-person figures add up to far more than the
 * profile's total, which is why nothing here ever sums them.
 *
 * @param {object} graph  from `buildGraph()` — MUTATED in place
 * @param {Map<string, number>} counts  "section:item" id → citations
 * @returns {object} graph, for chaining
 */
export function attachCitations(graph, counts) {
  const byId = new Map();

  let total = 0;
  let maxPaper = 0;
  let cited = 0;

  for (const paper of graph.papers) {
    const n = Number(counts && counts.get(paper.id));
    paper.citedBy = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
    byId.set(paper.id, paper.citedBy);
    total += paper.citedBy;
    if (paper.citedBy) cited += 1;
    if (paper.citedBy > maxPaper) maxPaper = paper.citedBy;
  }

  let maxPerson = 0;
  for (const person of graph.people) {
    let sum = 0;
    for (const id of person.papers) sum += byId.get(id) || 0;
    person.citations = sum;
    if (sum > maxPerson) maxPerson = sum;
  }

  /* `known` is the flag every view tests. It is false for a site with no
     snapshot AND for a snapshot that joined to nothing — a title normaliser
     that stopped matching would produce the second, and a skyline of zero-height
     columns is a worse answer than no skyline at all. */
  graph.citations = { known: total > 0, total, cited, maxPaper, maxPerson };
  return graph;
}

/**
 * The same graph with the site owner taken out of it.
 *
 * WHY A VIEW WOULD WANT THAT
 * --------------------------
 * Because he is on every paper, and that makes him useless as a datum and
 * ruinous as a scale. His citation total is, by construction, very nearly the
 * profile's whole total: 2,021 where the next person has 641. Stand that on the
 * Influence city (README §15.8) and one tower is three times the height of the
 * second and eleven times the height of the tenth, so every other tower is
 * squashed into the bottom eighth of the frame and the view says nothing except
 * that the site belongs to him — which the reader knew before they arrived.
 *
 * Without him the heights spread properly (641, 575, 438, 307, 306 …) and the
 * picture becomes the one worth drawing: which of his collaborators the cited
 * work was done with.
 *
 * The edges go the same way, and that is the better half of the bargain. He is
 * on every paper, so 127 of the 330 co-authorships are simply "with him" — true
 * and uninformative. Removing them leaves the 213 that are collaborations
 * *between* his co-authors, which is the structure of the groups he works
 * through rather than the star that structure hangs from. Two people lose their
 * only edge and stand alone, which is also true of them.
 *
 * The Collaboration view keeps him, and should: there the star IS the subject.
 *
 * Nothing is mutated. The result is graph-shaped — `people`, `edges`, `papers`,
 * `citations` — so anything that takes a graph takes this.
 *
 * @param {object} graph  from `buildGraph()`, after `attachCitations()`
 * @returns {object} a graph with `people` reduced and `edges` re-indexed onto it
 */
export function withoutSelf(graph) {
  const keep = [];
  const remap = new Map();          // old index → new index
  graph.people.forEach((person, i) => {
    if (person.self) return;
    remap.set(i, keep.length);
    keep.push(person);
  });

  // Nobody is marked as the owner — an unusual data file, but not a broken one.
  if (keep.length === graph.people.length) return graph;

  const edges = [];
  for (const e of graph.edges) {
    const a = remap.get(e.source);
    const b = remap.get(e.target);
    if (a === undefined || b === undefined) continue;
    edges.push({ ...e, source: a, target: b });
  }

  let maxPerson = 0;
  for (const person of keep) maxPerson = Math.max(maxPerson, person.citations || 0);

  return {
    ...graph,
    people: keep,
    edges,
    index: new Map(keep.map((p, i) => [p.key, i])),
    // Same totals, new ceiling: the scale has to come from the tallest tower
    // that is actually drawn.
    citations: { ...graph.citations, maxPerson },
  };
}
