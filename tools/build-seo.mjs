// ---------------------------------------------------------------------------
// Generate the structured data, the sitemap and robots.txt.  README §21.
// ---------------------------------------------------------------------------
//
//   node tools/build-seo.mjs            # write the files
//   node tools/build-seo.mjs --check    # verify they are current; exit 1 if not
//
// WHY THIS IS GENERATED RATHER THAN TYPED
//
// The one thing this site has to prove to a search engine is *which* Hamed
// Sadeghi it belongs to — there is another one, with a .com, who currently
// outranks it.  The evidence for that is `sameAs`: a list of profiles that
// already carry the same photo, the same publications and the same employer.
// Those URLs live in data/site.json because the page renders them as links.
// Typing them a second time into a <script type="application/ld+json"> block
// would mean two lists that agree until the day one of them is edited.
//
// So the block is generated from the same JSON the page reads, and `--check`
// runs in CI.  If a profile URL changes in site.json and nobody regenerates,
// the check fails rather than the structured data quietly going stale.
//
// WHAT IS DELIBERATELY NOT IN HERE
//
// The email address.  data/home.json splits it into `emailParts` so it is
// assembled in the browser and never appears as a literal in the HTML — a
// deliberate anti-scraping choice (§12).  Putting `"email"` into the JSON-LD
// would hand it to every crawler in plain text and undo that.  Schema.org
// allows it; this site does not.
// ---------------------------------------------------------------------------

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHECK = process.argv.includes('--check');

const read = async (p) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8'));

const site = await read('data/site.json');
const home = await read('data/home.json');

const BASE = site.baseUrl.replace(/\/$/, '');
const abs = (p) => `${BASE}/${String(p).replace(/^\//, '').split('/').map(encodeURIComponent).join('/')}`;

/* --------------------------------------------------------------- the person */

/* Every profile the site already links to, in one list.  These are the
   strongest signal available for telling two people with one name apart: each
   one is a page an engine has already indexed and already associates with a
   photo, an employer and a publication list. */
const sameAs = [
  ...site.identifiers.items.map((i) => i.url),
  ...site.socials.items.map((i) => i.url),
  'http://sharif.edu/~hsadeghi/',
].filter(Boolean);

const orcid = site.identifiers.items.find((i) => i.id === 'orcid');
const scopus = site.identifiers.items.find((i) => i.id === 'scopus');
const scholar = site.identifiers.items.find((i) => i.id === 'scholar');

const idValue = (url, re) => {
  const m = url && url.match(re);
  return m ? m[1] : null;
};

const identifiers = [
  orcid && { propertyID: 'ORCID', value: idValue(orcid.url, /orcid\.org\/([\d-]+X?)/) },
  scopus && { propertyID: 'Scopus Author ID', value: idValue(scopus.url, /authorId=(\d+)/) },
  scholar && { propertyID: 'Google Scholar', value: idValue(scholar.url, /user=([\w-]+)/) },
]
  .filter((x) => x && x.value)
  .map((x) => ({ '@type': 'PropertyValue', propertyID: x.propertyID, value: x.value }));

const university = {
  '@type': 'CollegeOrUniversity',
  '@id': `${BASE}/#sharif`,
  name: 'Sharif University of Technology',
  alternateName: 'SUT',
  url: 'http://www.en.sharif.edu/',
  sameAs: [
    'https://en.wikipedia.org/wiki/Sharif_University_of_Technology',
    'https://www.wikidata.org/wiki/Q1191786',
    'https://ror.org/024c2fq17',
  ],
};

/* The short description a search engine is most likely to quote.  The first
   bio paragraph is written for a reader, so it is used as-is rather than
   rewritten into keywords — the two audiences want the same sentence. */
const summary = home.bio[0];

const person = {
  '@type': 'Person',
  '@id': `${BASE}/#person`,
  name: home.name,
  givenName: 'Hamed',
  familyName: 'Sadeghi',
  /* The Persian spellings are how he is searched for inside Iran, and the
     initial/surname-first forms are how the publications spell him.

     These are *names*, and the list stops there on purpose. data/home.json
     used to carry 37 "SEO aliases" which a hidden div served to crawlers
     (§21.5); most were whole search queries rather than names — "حامد صادقی
     مهندسی ژئوتکنیک دانشگاه صنعتی شریف". Moving those in here would be the
     same keyword stuffing in a format that happens to validate. */
  alternateName: [
    site.nameFa,
    'دکتر حامد صادقی',
    'Dr. Hamed Sadeghi',
    'H. Sadeghi',
    'صادقی، حامد',
  ],
  honorificPrefix: 'Dr.',
  jobTitle: home.position,
  description: summary,
  url: `${BASE}/`,
  mainEntityOfPage: { '@id': `${BASE}/#webpage` },
  image: { '@type': 'ImageObject', url: abs(home.photo), caption: home.name },
  affiliation: university,
  worksFor: university,
  memberOf: home.roles
    .filter((r) => r.url)
    .map((r) => ({ '@type': 'Organization', name: r.label.replace(/^Immediate Past Chair of /, ''), url: r.url })),
  hasOccupation: {
    '@type': 'Occupation',
    name: home.position,
    occupationLocation: { '@type': 'Country', name: 'Iran' },
  },
  workLocation: {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tehran',
      addressCountry: 'IR',
      postOfficeBoxNumber: '11365-11155',
    },
  },
  knowsAbout: home.interests.map((i) => i.text),
  knowsLanguage: [
    { '@type': 'Language', name: 'Persian', alternateName: 'fa' },
    { '@type': 'Language', name: 'English', alternateName: 'en' },
  ],
  identifier: identifiers,
  sameAs,
};

const website = {
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  url: `${BASE}/`,
  name: site.titleSuffix,
  alternateName: home.name,
  inLanguage: 'en',
  publisher: { '@id': `${BASE}/#person` },
  about: { '@id': `${BASE}/#person` },
  copyrightHolder: { '@id': `${BASE}/#person` },
};

/* ---------------------------------------------------------------- the pages */

/* `home` is the only ProfilePage: it is the page that is *about* the person
   rather than about some part of his work.  The rest are CollectionPages,
   which is what a list of publications or of courses actually is. */
const PAGES = site.nav.map((n) => ({
  id: n.id,
  href: n.href,
  label: n.label,
  title: n.title,
  type: n.href === 'index.html' ? 'ProfilePage' : 'CollectionPage',
}));

function pageGraph(page) {
  const url = page.href === 'index.html' ? `${BASE}/` : `${BASE}/${page.href}`;
  const node = {
    '@type': page.type,
    '@id': `${url}#webpage`,
    url,
    name: page.href === 'index.html' ? home.name : `${page.title} — ${home.name}`,
    isPartOf: { '@id': `${BASE}/#website` },
    about: { '@id': `${BASE}/#person` },
    inLanguage: 'en',
    primaryImageOfPage: { '@type': 'ImageObject', url: abs(home.photo) },
  };
  if (page.href === 'index.html') {
    node.mainEntity = { '@id': `${BASE}/#person` };
  } else {
    node.breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: home.name, item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: page.title, item: url },
      ],
    };
  }
  /* The person and the site are repeated on every page on purpose.  A crawler
     may reach any page first, and each one has to be able to say who it is
     about without a second fetch. */
  return { '@context': 'https://schema.org', '@graph': [node, person, website] };
}

/* ------------------------------------------------------------------ writing */

const OPEN = '\t<!-- Structured data.  Generated by tools/build-seo.mjs from data/site.json\n\t     and data/home.json — run that script rather than editing this block. -->';
const CLOSE = '\t<!-- /structured data -->';

const stale = [];

/* Compare without line endings.
 *
 * `.gitattributes` checks these files out with CRLF on Windows, and everything
 * generated here is written with LF — so a byte comparison called every file
 * stale on a Windows working copy while passing in CI on Linux. A check that
 * fails only on the machine you edit on is a check you learn to ignore. */
const sameText = (a, b) => a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n');

/* `body` receives the current text — '' when the file does not exist yet, so a
   missing sitemap.xml is "out of date" rather than a crash. */
async function put(file, body) {
  const full = path.join(ROOT, file);
  const before = await readFile(full, 'utf8').catch((err) => {
    if (err.code === 'ENOENT') return '';
    throw err;
  });
  const after = body(before);
  if (sameText(before, after)) return;
  if (CHECK) stale.push(before === '' ? `${file} (missing)` : file);
  else await writeFile(full, after);
}

const CARD_OPEN = '\t<!-- Card metadata.  Generated by tools/build-seo.mjs: these mirror the\n\t     og: tags above rather than restating them, so the two cannot disagree. -->';
const CARD_CLOSE = '\t<!-- /card metadata -->';

/* X/Twitter reads og: when a twitter: tag is missing, so these are not strictly
   required — but LinkedIn, Slack, WhatsApp and Telegram each read a slightly
   different subset, and `summary_large_image` is the difference between a
   thumbnail and a full-width card when the link is shared. */
function cardBlock(html) {
  const og = (p) => {
    const m = html.match(new RegExp(`<meta property="og:${p}" content="([^"]*)"`));
    return m ? m[1] : null;
  };
  const rows = [
    ['name', 'author', home.name],
    ['property', 'og:locale', 'en_US'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', og('title')],
    ['name', 'twitter:description', og('description')],
    ['name', 'twitter:image', og('image')],
    ['name', 'twitter:image:alt', og('image:alt')],
  ].filter(([, , v]) => v);
  return `${CARD_OPEN}\n${rows.map(([a, n, v]) => `\t<meta ${a}="${n}" content="${v}">`).join('\n')}\n${CARD_CLOSE}`;
}

for (const page of PAGES) {
  const json = JSON.stringify(pageGraph(page), null, '\t')
    .split('\n')
    .map((l) => `\t\t${l}`)
    .join('\n');
  const block = `${OPEN}\n\t<script type="application/ld+json">\n${json}\n\t</script>\n${CLOSE}`;

  await put(page.href, (html) => {
    let out = html;

    const cards = cardBlock(out);
    const hadCards = /\t<!-- Card metadata\.[\s\S]*?<!-- \/card metadata -->/;
    if (hadCards.test(out)) out = out.replace(hadCards, cards);
    else out = out.replace(/(<meta property="og:site_name"[^>]*>)/, `$1\n\n${cards}`);

    const hadSchema = /\t<!-- Structured data\.[\s\S]*?<!-- \/structured data -->/;
    if (hadSchema.test(out)) out = out.replace(hadSchema, block);
    else out = out.replace(/\n\t*<\/head>/, `\n\n${block}\n</head>`);

    return out;
  });
}

/* ------------------------------------------------------ sitemap and robots */

/* `lastmod` is deliberately absent.  A date that is regenerated on every build
   tells a crawler every page changed every time, which is both untrue and the
   kind of signal that gets discounted once it is noticed.  Priority and
   changefreq are absent for the same reason: Google ignores both. */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by tools/build-seo.mjs.  One entry per page, canonical host only. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `\t<url><loc>${p.href === 'index.html' ? `${BASE}/` : `${BASE}/${p.href}`}</loc></url>`).join('\n')}
</urlset>
`;

const robots = `# Generated by tools/build-seo.mjs.

User-agent: *
Allow: /

# The build artefacts and the tooling are served (they are just files in the
# repository) but there is nothing in them for a search result.
Disallow: /tools/
Disallow: /build-version.txt
Disallow: /README.md

# Cloudflare consumes this one; GitHub Pages, which has no idea what it is,
# serves it as a text file. Harmless, but not a search result.
Disallow: /_headers

Sitemap: ${BASE}/sitemap.xml
`;

await put('sitemap.xml', () => sitemap);
await put('robots.txt', () => robots);

/* ------------------------------------------------------------------ report */

if (CHECK) {
  if (stale.length) {
    console.error('build-seo --check: FAIL — these are out of date:');
    for (const f of stale) console.error(`  ${f}`);
    console.error('\nRun: node tools/build-seo.mjs');
    process.exit(1);
  }
  console.log(`build-seo --check: PASS (${PAGES.length} pages, ${sameAs.length} sameAs profiles)`);
} else {
  console.log(`build-seo: ${PAGES.length} pages stamped with structured data`);
  console.log(`  ${sameAs.length} sameAs profiles, ${identifiers.length} identifiers`);
  console.log('  sitemap.xml, robots.txt');
}
