// ---------------------------------------------------------------------------
// Put the page content into the HTML, for readers that do not run JavaScript.
// README §21.2.  Called by tools/fingerprint.mjs; never rewrites the sources.
// ---------------------------------------------------------------------------
//
// THE PROBLEM THIS SOLVES
//
// Every page of this site is a shell.  The nav, the footer and about 3.9 KB of
// boilerplate are in the HTML; everything a person actually came for — the
// name, the biography, 130 publication titles, 60 students, the courses — is
// built in the browser by assets/js/pages/*.js from data/*.json.
//
// Strip the tags from any of the seven pages and you get the same 3.9 KB of
// chrome.  To a crawler that does not run scripts, this site is seven
// near-identical pages that say "Loading…", and the home page does not contain
// the words "Hamed Sadeghi" anywhere except the <title> and a copyright
// comment.  Googlebot does render JavaScript, on a second pass, some of the
// time; Bing is worse at it, and most of the rest do not try.
//
// That is the likeliest single reason a site with 130 papers behind it loses
// to a stranger with the same name and a plain HTML page.
//
// HOW
//
// `fill()` in assets/js/modules/dom.js uses `replaceChildren`, so whatever is
// inside a container when the script runs is thrown away and replaced.  That
// makes static fallback content free: a visitor with JavaScript sees exactly
// what they saw before — the same DOM, built the same way — and a visitor or
// crawler without it now sees the real text instead of a spinner.
//
// This is not cloaking.  The text written here is generated from the same
// data/*.json the page module reads, so the two say the same thing by
// construction; if they ever diverge it is because the data changed under
// both of them at once.
// ---------------------------------------------------------------------------

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = async (p) => JSON.parse(await readFile(path.join(ROOT, p), 'utf8'));

/* The data carries small fragments of markup — <a>, <b>, <span class="ordinal">
   — because the page renders them.  Here they are flattened: the fallback
   exists to be read as text, and a half-copied anchor is worse than none. */
const text = (s) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();

const esc = (s) =>
  text(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* One line per item.  The fields differ by page — a publication has
   `title`/`authors`/`details`, a course has `text`, a person has `name` — so
   rather than seven renderers, take the first field that exists from each of
   three groups: what it is, what it says, and when. */
function line(item) {
  if (typeof item === 'string') return esc(item);
  const head = item.title ?? item.name ?? item.text ?? item.lead ?? '';
  const rest = [item.authors, item.details, item.body, item.org, item.topic, item.note]
    .map(text)
    .filter(Boolean);
  const when = text(item.period ?? item.year ?? '');
  const parts = [esc(head), ...rest.map(esc)].filter(Boolean);
  const main = parts.join(' — ');
  return when ? `${main} <span class="prerender__when">(${esc(when)})</span>` : main;
}

function sections(data, list) {
  return (list || data.sections || [])
    .map((s) => {
      const items = s.items || s.people || [];
      if (!items.length) return '';
      const lis = items.map((it) => `\t\t\t<li>${line(it)}</li>`).join('\n');
      return `\t\t<h2>${esc(s.title)}</h2>\n\t\t<ul>\n${lis}\n\t\t</ul>`;
    })
    .filter(Boolean)
    .join('\n');
}

/* ------------------------------------------------------------- the home page */

function homeBlocks(home, site) {
  const roles = home.roles.map((r) => esc(r.label)).join(' · ');
  const affil = home.affiliations.map((a) => esc(a.label)).join(', ');

  /* The one <h1> the site's most important page was missing.  It carries the
     name in the form people search for, and the Persian spelling beside it,
     because both are the same person and only one of them is in the URL. */
  const hero =
    `\t\t<p>${esc(home.position)}</p>\n` +
    `\t\t<h1>${esc(home.name)} <span lang="fa" dir="rtl">${esc(site.nameFa)}</span></h1>\n` +
    `\t\t<p>${roles}</p>\n` +
    `\t\t<p>${affil}</p>`;

  const profile =
    `\t\t<h2>Biography</h2>\n` +
    home.bio.map((p) => `\t\t<p>${esc(p)}</p>`).join('\n') +
    `\n\t\t<h2>Research Interests</h2>\n\t\t<ul>\n` +
    home.interests.map((i) => `\t\t\t<li>${esc(i.text)}</li>`).join('\n') +
    `\n\t\t</ul>`;

  return { hero, profile };
}

/* --------------------------------------------------------------------- write */

/* Each container's static contents, keyed by the page that holds it.  The ids
   are the ones assets/js/pages/*.js call `fill()` on, which is why filling
   them here is safe. */
async function plan() {
  const site = await read('data/site.json');
  const home = await read('data/home.json');
  const { hero, profile } = homeBlocks(home, site);

  const out = new Map([['index.html', { hero, profile }]]);
  for (const [file, json] of [
    ['background.html', 'background'],
    ['publications.html', 'publications'],
    ['research-team.html', 'research-team'],
    ['teaching.html', 'teaching'],
    ['services.html', 'services'],
    ['honors.html', 'honors'],
  ]) {
    const data = await read(`data/${json}.json`);

    /* teaching.html is the one page with more than one container: its sections
       carry a `group`, and the page puts each group in its own article
       (#content, #content-2, #content-3).  Splitting them the same way keeps
       "Recommendation Letter" under its own heading rather than running the
       whole page together under "Teaching". */
    if (Array.isArray(data.groups)) {
      const blocks = {};
      data.groups.forEach((g, i) => {
        const mine = data.sections.filter((s) => s.group === g.id);
        blocks[i === 0 ? 'content' : `content-${i + 1}`] = sections(data, mine);
      });
      out.set(file, blocks);
    } else {
      out.set(file, { content: sections(data) });
    }
  }
  return out;
}

/**
 * @param {string} outDir  the built tree — `_site/`, or whatever `--out` named.
 * @returns {Promise<{pages: number, bytes: number}>}
 */
export async function prerender(outDir) {
  const pages = await plan();
  let count = 0;
  let bytes = 0;

  for (const [file, blocks] of pages) {
    const full = path.join(outDir, file);
    let html = await readFile(full, 'utf8');

    for (const [id, body] of Object.entries(blocks)) {
      if (!body) continue;
      /* Replace only the container's contents, leaving its own attributes
         alone — the page module finds it by id and by class. */
      const open = new RegExp(`(<div id="${id}"[^>]*>)([\\s\\S]*?)(</div>)`);
      if (!open.test(html)) throw new Error(`prerender: no #${id} in ${file}`);
      html = html.replace(open, (_m, a, _old, z) => `${a}\n${body}\n\t\t${z}`);
      bytes += body.length;
    }

    /* Any container this did not fill — a group that is switched off, a panel
       built from something other than data/*.json — still holds the "Loading…"
       placeholder.  That word is the whole of what a crawler would read there,
       so take it out and leave the container genuinely empty. */
    html = html.replace(/\n?\s*<p class="state">Loading&hellip;<\/p>/g, '');

    await writeFile(full, html);
    count += 1;
  }
  return { pages: count, bytes };
}
