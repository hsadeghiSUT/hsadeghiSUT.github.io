# Hamed Sadeghi — personal website

A complete rebuild of the original site: a new visual identity, responsive from
a 320 px phone to a 6K display, available in light **and dark**, with an
3D layer that lights up whatever you are reading — and roughly **35× lighter**
than the site it replaces, while remaining **fully functional with no internet
connection**.

The Persian publication typography is unchanged from the original, and held
there by an explicit protection boundary — see §7.

There is **no build step**. No Node, no npm, no compiler. Upload the folder to a
web server and it works.

---

## 1. What changed, and why

| | Before | After |
|---|---|---|
| JavaScript (the site's own) | 5.90 MB (`all.min.js` 5.8 MB + jQuery 89 KB + `script.js` 13 KB) | **~410 KB** of source across 49 ES modules — 127 KB gzipped over the wire, and a large share of that 410 is the comments |
| CSS | 278 KB in one file | **144 KB** across seven files (two colour schemes + the Farsi lock), 26 KB gzipped |
| Icons | full Font Awesome 5 Pro JS kit, all 7,800 icons | **46 KB** SVG sprite, the 66 icons actually used |
| Content | hand-written into 7 HTML files (≈ 340 KB of markup) | **8 JSON files** you edit directly |
| Mobile | none — fixed 1200 px layout | mobile-first, three breakpoints, plus a sticky section bar for the long pages (§13) |
| Themes | light only | light / dark / follow-the-system, remembered |
| 3D | none | a Three.js field that lights a halo around whatever you point at, a depth-push page transition, and a 4 KB fallback if the library is absent (§12) |
| Publications | a list of 152 entries | the same list, plus a 3D collaboration graph and a timeline computed from it (§15) |
| The university mark | a flat PNG in the home page sidebar | extruded, turning, in the header of every page, inside a cyan meteor ring (§16) |
| The brand mark | a cyan rhombus PNG | two bismillahs — kufic on the Summary page, thuluth elsewhere — extruded and lit, each with a meteor running counter-clockwise on its own traced border and columns of light standing off it, and an arrival animation when the mark changes between pages (§17.7) |
| Type | Georgia + Arial, 13 px body | Caladea + Carlito, 16 px body — self-hosted |
| Page weight (code, first load) | ~6.1 MB | **~250 KB gzipped** on the Summary page. Two thirds of that is Three.js, vendored (§12.3), loaded only where something 3D is on the page, and cached across the whole site after the first one |
| External requests | Google Fonts, jQuery CDN, Font Awesome CDN, analytics | analytics only — everything else is local |
| Analytics | one property, on the home page only | four properties, on all seven pages, checked by a script (§10) |
| Citation figures | none | citations, h-index and i10-index in the hero, and "Cited by N" on every paper that has been cited at all — from a local snapshot, so a visitor behind a block on Google still sees them (§18) |
| The display icons | flat glyphs with a painted drop-shadow thickness (§17.6b) | **69 modelled solids** — a real building, a turning earth, threaded chain links — drawn by one WebGL context for the whole page. The flat sprite is still the markup and one line puts it back (§20) |
| Where it lives | one university path | that path *and* a domain of its own, from one set of files (§11) |

Nothing was dropped. Every heading, paragraph, publication, student, award and
link from the old site is present — verified word-by-word against the originals,
and re-verified after this round; §14 has the audit and the three caveats worth
knowing about.

### The big one: the icons

The old `all.min.js` was the Font Awesome **Pro** kit. It carried the vector data
for every icon in the library and rewrote each `<i class="fad fa-book">` into an
`<svg>` at runtime — six megabytes of JavaScript to draw sixty-six pictures.

`assets/icons/icons.svg` now holds exactly those sixty-six icons, extracted from
that same Pro file, so the artwork is byte-identical — duotone icons and the
Pro-only ones (`fa-wreath`, `fa-user-crown`, `fa-digging`, `fa-mailbox`,
`fa-books`, `fa-microphone-stand`, `fa-print-search`, `fa-user-cowboy`,
`fa-paint-brush-alt`, `fa-book-alt`) included. A page references one with

```html
<svg class="icon"><use href="assets/icons/icons.svg#fad-book"></use></svg>
```

which is a single cached request for the whole site and needs no JavaScript.

Those sixty-nine symbols are also the **source list for the 3D icon set**: the
display icons on every page are now modelled solids rather than glyphs, built
one per symbol. The sprite is untouched and still what the markup references —
§20, which also has the one line that turns the whole thing back into flat
icons.

---

## 2. Folder layout

```
.
├── index.html                 Summary
├── background.html            Background
├── honors.html                Honors & Awards
├── publications.html          Publications
├── research-team.html         Research Team
├── teaching.html              Teaching
├── services.html              Projects & Services
│
├── legacy_index.html          the original home page, kept unmodified (§10)
│
├── .github/workflows/
│   └── refresh-scholar.yml    refreshes data/scholar.json twice a day, on
│                              GitHub, and commits it only when the numbers
│                              move. The whole of the automation (§18.2)
│
├── tools/                     audit scripts — see §14 for how to run them
│   ├── build-fonts.py         regenerates the vendored webfonts
│   ├── check-offline.mjs      fails if any asset points off-site
│   ├── check-trackers.mjs     fails if any page is missing a legacy tracker
│   ├── check-farsi.mjs        fails if the Persian typography has moved
│   ├── check-dropcap.mjs      fails if the biography's "H" stops being 2 lines
│   ├── check-contrast.mjs     fails if any text drops below WCAG AA
│   ├── check-ui.mjs           drives the menu, the section bar, the
│   │                          transitions and the explorer — the smoke test
│   ├── check-authors.mjs      reports how the author names parsed, and who
│   │                          might be the same person twice (§15)
│   ├── fetch-scholar.mjs      refreshes data/scholar.json from the Google
│   │                          Scholar profile — the ONLY thing that talks to
│   │                          Google; the site itself never does (§18)
│   ├── check-scholar.mjs      validates that snapshot, with no network (§18.2)
│   ├── refresh-scholar.ps1    the same refresh from this machine, for the
│   │                          university mirror — fetch, validate, and say
│   │                          what has to be uploaded. -Register installs it
│   │                          as a daily Windows task (§18.2)
│   ├── scholar-refresh.log    ← GENERATED. one line per local refresh.
│   ├── preview-icons3d.html   every 3D icon on one page, at a size you can
│   │                          judge it at (§20.6)
│   ├── serve.py               a local preview server that does NOT cache —
│   │                          read the note in it before using anything else
│   ├── check-canary.mjs       runs the site on three hostnames and checks a
│   │                          copy reports itself while the original does not (§19)
│   ├── trace-logo.py          turns logo.png into the outlines the 3D mark
│   │                          extrudes — a build step, run only if the logo
│   │                          image changes (§16)
│   ├── trace-letters.py       the name's glyphs, from the site's own serif,
│   │                          for the column in the left gutter (§15c)
│   ├── trace-bismillah.py     the same for the two calligraphic brand marks,
│   │                          and it also writes their flat fallback PNGs —
│   │                          run only if the artwork changes (§17.7)
│   └── lib/browser.mjs        the static server + Playwright loader they share
│
├── data/                      ← everything you will ever edit lives here
│   ├── site.json              navigation, research identifiers, social profiles, footer
│   ├── home.json              portrait, titles, contact details, biography, interests
│   │                          — `photo` is the hero image; `origins` in site.json
│   │                          is the hostname allowlist the copy canary uses (§19)
│   ├── background.json        professional / educational / administrative / membership
│   ├── honors.json            awards, newest first
│   ├── publications.json      theses, journals, lectures, patents, proceedings, Persian
│   ├── author-aliases.json    two spellings of one co-author → one node (§15)
│   ├── scholar.json           ← GENERATED. citation figures + per-paper counts.
│   │                          Written by tools/fetch-scholar.mjs; delete it and
│   │                          the figures simply stop appearing (§18)
│   ├── scholar-aliases.json   one paper written two ways → one row (§18.3)
│   ├── research-team.json     scholars and students
│   ├── teaching.json          courses, recommendation-letter rules, TA/RA rosters
│   └── services.json          projects, review panels, organising committees
│
└── assets/
    ├── css/   (loaded after vendor/fonts.css; order matters, see §7)
    │   ├── base.css           type/spacing/shape tokens, reset
    │   ├── layout.css         nav bar, page grid, sidebar, footer, breakpoints
    │   ├── components.css     hero, cards, publications, people, buttons, …
    │   ├── animations.css     the icon motion effects
    │   ├── fx.css             the 3D layer: field, highlight, transitions,
    │   │                      section bar (§12, §13)
    │   ├── theme.css          ← both colour schemes + the theme switch
    │   └── farsi.css          ← LAST. the Persian typography lock
    ├── js/
    │   ├── main.js            entry point — every page loads only this
    │   ├── modules/           shared: dom, icons, data, chrome, sections,
    │   │                              theme, lightbox, reveal, scrollspy,
    │   │                              progress, email, scholar
    │   │   ├── fx/            the 3D layer (§12): lattice, shaders, camera,
    │   │   │                          mat4, field-gl, field-three, highlight,
    │   │   │                          transition, index
    │   │   ├── logo3d/        the extruded university mark in the header (§16)
    │   │   ├── bismillah/     the extruded calligraphic brand mark, its meteor
    │   │   │                          and its light columns (§17.7)
    │   │   ├── icons3d/       the display icons as modelled solids (§20):
    │   │   │                          index (renderer + scope + the ON/OFF
    │   │   │                          switch), lib, registry, models/
    │   │   ├── roster/        the 3D roster on the Research Team page (§15b)
│   │   ├── namecolumn/    the name standing in the left gutter (§15c)
    │   │   └── explorer/      the collaboration graph, the timeline and the
    │   │                              impact skyline (§15):
    │   │                              data, layout, scene, shaders, camera,
    │   │                              gl, three, index
    │   └── pages/             one controller per page, loaded on demand
    ├── icons/icons.svg        the 69-icon sprite — also the source list
    │                          for the 3D models (§20)
    ├── vendor/                ← every third-party asset, all local (§9)
    │   ├── fonts.css          every @font-face on the site
    │   ├── fonts/             Caladea, Carlito, BZar + their OFL licences
    │   └── three/             where Three.js goes if you install it — two
    │                          files, see the README.txt in there and §12.3
    └── img/                   portrait, logos, people, gallery, brand marks, favicons
        └── texture/           the one photograph a 3D model uses: the sun's
                               surface, on the theme switch (§20.9)
```

The HTML files are deliberately thin — around 4 KB each. They contain the page
frame and nothing else; the navigation, sidebar, footer and article content are
all drawn from the JSON files at load time.

---

## 3. Updating content

**This is the only section you need for day-to-day work.** Open the relevant file
in `data/`, edit it, save, upload. No code, no rebuild.

JSON rules: text goes in `"double quotes"`, entries are separated by commas, and
the **last entry in a list has no trailing comma**. If a page ever comes up
blank, that is almost always the cause — paste the file into
<https://jsonlint.com> and it will point at the line.

Most text fields accept simple inline HTML — `<b>`, `<i>`, `<a href="…">` and
`<span class="ordinal">th</span>` for ordinal suffixes — because the original
content used them. Anything that is a plain label (a name, a year) is plain text.

### Adding a publication

Open `data/publications.json`, find the right section, and add an object at the
**top** of its `items` list (the list runs newest first):

```json
{
  "title": "A new model for unsaturated soil behaviour",
  "url": "https://doi.org/10.1016/j.example.2026.123456",
  "authors": "<b>Sadeghi, H.</b> & Nabi, H. (2026)",
  "details": "<b>Géotechnique</b>, 76(3), 210-225."
}
```

- `url` — set to `null` if there is no link.
- `authors` — wrap your own name in `<b>…</b>`, as the existing entries do.
- The numbering, the icon and the sidebar link all follow automatically.

### Adding a student

1. Put the photo in `assets/img/people/` (portrait crop, roughly 200–300 px wide).
2. Open `data/research-team.json`, find the section (`phd`, `mphil`, `bsc`,
   `scholars`, `research-assistants`) and add:

```json
{
  "name": "Student Name",
  "note": "co-supervised by Prof. Someone",
  "photo": "StudentName.jpg",
  "alt": "Student Name",
  "topicLabel": "Thesis Title",
  "topic": "Title of the thesis",
  "topicUrl": null,
  "topicIcon": "fad-book-open",
  "dateLabel": "Date of Completion",
  "year": "2028",
  "status": "ongoing",
  "profileUrl": null
}
```

- `status`: `"ongoing"` shows the digger and spinner icons; `"completed"` shows
  the green tick.
- `topicIcon` goes with it, and the convention is the one the site has always
  used: an **open book** (`fad-book-open`) while the research is under way, a
  **closed book** (`fad-book`) once it is finished. The closed book also picks up
  its own quiet animation, which is why the two are not interchangeable.

  So when a student graduates, **two** fields change: `status` to `"completed"`
  and `topicIcon` to `"fad-book"`. They were allowed to drift apart once — every
  book on the page ended up open, including the graduates' — and nothing failed,
  it just quietly stopped meaning anything.
- `note` — leave as `""` when there is no co-supervisor.

### Adding an award, a role, a course, a project

Same pattern — open `data/honors.json`, `data/background.json`,
`data/teaching.json` or `data/services.json` and copy an existing entry. Each
file's entries are uniform, so the nearest neighbour is always a good template.

### Publishing the Teaching / Research Assistant lists

Those rosters existed in the old site but were commented out, so nobody could
see them. The data is preserved in `data/teaching.json` under `assistants`. To
publish them, change **one word** in each block:

```json
"assistants": {
  "teaching": { "enabled": true,  … },
  "research": { "enabled": true,  … }
}
```

Set them back to `false` to hide the section again. The sidebar links appear and
disappear with it.

### Adding a page, or renaming one

`data/site.json` → `nav`. One entry per page:

```json
{ "id": "outreach", "label": "Outreach", "href": "outreach.html",
  "icon": "fad-globe-americas", "title": "Public outreach" }
```

That single line updates the top bar and the home-page sidebar on **all** pages.
For a genuinely new page you would also copy an existing `.html` file, change
its `<body data-page="…">`, and add a matching controller in
`assets/js/pages/`.

### Adding an icon

The sprite holds 69 icons — the ones the site uses, plus a few spares
(`fad-award`, `fad-crown`, `fad-graduation-cap`, `fad-industry-alt`,
`fad-user-cowboy`, `fas-microphone-stand`, `fas-school`). To use one, just
reference its id, e.g. `"icon": "fad-award"`.

To add a new one, open `assets/icons/icons.svg` and paste a symbol beside the
others:

```xml
<symbol id="fas-rocket" viewBox="0 0 512 512"><path d="M…"/></symbol>
```

Naming convention is `<style>-<name>`: `fas-` solid, `far-` regular, `fal-`
light, `fad-` duotone, `fab-` brands. Duotone symbols hold two paths, the first
with `opacity=".4"`. Any page can use the new id immediately.

A new symbol is flat everywhere until it is given a 3D model as well — which is
one builder and one line in `registry.js`, and is entirely optional. §20.7.

---

## 4. Previewing locally

The pages read their content with `fetch()`, and browsers refuse to let a page
opened from a `file://` address read local files. **Double-clicking `index.html`
will show an explanatory message instead of the site** — that is expected, and
it is not a sign anything is broken.

To preview properly, open a terminal in this folder and run one of:

```
python tools/serve.py
python -m http.server 8000
npx serve .
```

Then visit <http://localhost:8000>.

`tools/serve.py` is the first one for a reason: it sends `Cache-Control:
no-store`, and the other two do not. Without that header a browser may keep
serving an ES module it already has, so an edit to a module appears to do
nothing at all — which looks like a bug in the edit rather than a bug in the
preview. The file itself has the longer version of this warning.

On the real server (`sharif.edu/~hsadeghi/`) none of this applies — it just works.

---

## 5. How the code fits together

Every page loads exactly one script:

```html
<script type="module" src="assets/js/main.js"></script>
```

`main.js` does three things:

1. Reads `data/site.json` and draws the shared furniture — nav bar, page
   heading, footer (`modules/chrome.js`).
2. Looks at `<body data-page="publications">` and **dynamically imports** just
   that page's controller from `assets/js/pages/`. Someone reading the Teaching
   page never downloads the Publications code.
3. Starts the two cross-cutting behaviours: scroll-reveal (`modules/reveal.js`)
   and the image lightbox (`modules/lightbox.js`).

The shared modules:

| Module | Replaces | Job |
|---|---|---|
| `dom.js` | jQuery (89 KB) | four helpers: `$`, `$$`, `el`, `fill` |
| `icons.js` | `all.min.js` (5.8 MB) | builds `<use>` references into the sprite |
| `data.js` | — | fetches and caches the JSON, with a friendly error message |
| `chrome.js` | duplicated markup in 7 files | header brand, nav, sidebar panels, footer |
| `theme.js` | — | the light/dark switch and its persistence |
| `sections.js` | — | the item templates the pages share |
| `lightbox.js` | 3 competing jQuery lightboxes | one `<dialog>`-based viewer |
| `reveal.js` | — | `IntersectionObserver` fade-in |
| `scrollspy.js` | — | marks the sidebar link for the section on screen |
| `progress.js` | — | the 2 px reading-progress line |
| `email.js` | `dom.js` (entity soup) | writes the address as a real `mailto:` link |
| `fx/` | — | the 3D layer — field, highlight, transitions; loaded last (§12) |
| `sectionnav.js` | — | the sticky section bar on the long pages (§13) |
| `explorer/` | — | the collaboration graph and the timeline — Publications only (§15) |
| `roster/` | — | the 3D team roster — Research Team only (§15b) |
| `cards3d.js` | — | the light that follows the pointer across the hero (§17) |
| `backtotop.js` | `icons.js` | the back-to-top control on the long pages (§13b) |

### Design decisions worth knowing

**Why vanilla, not React or Vue?** Those need a build step and a toolchain to
stay current. This is a content site that changes a few times a year; a
dependency you have to `npm update` is a liability, not a feature. Native ES
modules give the same component structure with nothing to install and nothing to
break in three years' time.

**How the responsive scaling works.** Every size in the CSS is in `rem`, so the
whole design is driven by one number: the root font-size. Below 1600 px it stays
at 16 px, which makes the desktop layout pixel-for-pixel what it always was.
Above that it grows with the viewport (`clamp(16px, 1vw, 34px)`), so a 4K or 6K
screen gets a proportionally larger site rather than a small one marooned in the
middle. Three breakpoints handle the rest:

- **≥ 1024 px** — the hamburger drawer becomes the horizontal tab strip.
- **≥ 1152 px** — the sidebar moves alongside the article, at the original
  640 px / 437 px column widths.
- **≤ 544 px** — justified text becomes ragged-right (short lines plus
  justification makes rivers of white space), and floated images go full width.

**The biography is justified**, with `hyphens: auto`, and the two ship together.
The rest of the site's prose already was — every publication title, author line
and detail line, and the whole Persian block — so the biography was the one
ragged-right paragraph on the site, and the 544 px rule above already listed
`.bio p` among the blocks that fall back to ragged-right: a rule guarding an
alignment it did not have. Hyphenation is not optional at this measure:
justification works by stretching the spaces in a line, so the fewer break
opportunities a line has the further each space must stretch, and a paragraph of
long technical words justified without it opens rivers down the column. With it,
the words break instead and the spaces barely move. It needs `lang="en"` on
`<html>`, which every page shell has. Below 544 px the block goes ragged-right
*and* drops back to `hyphens: manual` — on a 38-character measure `auto` breaks a
word every second or third line, which is a lot of hyphens to read past for a
raggedness nobody minds.

**Colour lives in exactly one file.** Every other stylesheet refers to tokens
(`var(--c-ink)`), never to a hex value, which is what made adding a second scheme
a matter of writing one more block rather than auditing 1,300 lines. See §6.
The same discipline is what makes the Persian typography lock in §7 possible.

**Animations are CSS, not JavaScript.** The old `script.js` used ~200 lines of
jQuery `hover()` handlers to add and remove Font Awesome animation classes.
CSS does hover natively: `.hov-pulse` runs on hover, `.anim-pulse` runs
continuously, and `.hov-parent` lets a whole sidebar row animate its icon. No
GSAP, no library.

**Accessibility.** The rebuild adds a skip link, visible keyboard focus rings,
`aria-current` on the active nav item, proper `aria-expanded` on the mobile menu,
real alt text on every photo, and honours `prefers-reduced-motion` — all of which
the original lacked.

**Two small content fixes.** A duplicated `(tentative) (tentative)` in one PhD
thesis title was reduced to one, and the Google Scholar / Publons / SciExplore
wordmarks now render as whole words rather than letter-by-letter spans (better
for search engines and screen readers, visually identical).

---

## 6. Light and dark mode

### For visitors

A three-way switch sits at the right of the top bar on every page:

|  | Option | What it does |
|---|---|---|
| ☀ | **Light** | always the light scheme |
| ◐ | **Match my device** | follows the phone or computer's own setting, and keeps following it — if the laptop flips to dark at sunset the page follows, live, without a reload |
| ☾ | **Dark** | always the dark scheme |

"Match my device" is the default, so a first-time visitor arriving on a dark
phone sees the dark site immediately. Once someone picks Light or Dark, that
choice is remembered and used on every page and every future visit.

The switch is a keyboard radio group: one Tab press enters it, then ←/→ (or ↑/↓)
move between options, Home and End jump to the ends. Screen readers announce it
as "Colour theme, Dark, 3 of 3".

### Where the preference is stored

In `localStorage` under the key **`hs-theme`**, with one of two values —
`"light"` or `"dark"`. Choosing "Match my device" *removes* the key rather than
storing `"auto"`; with nothing stored, the plain CSS `@media (prefers-color-scheme)`
rule takes over and the browser does the following for us.

Every storage call is wrapped in a `try`. Safari in private mode and some locked-
down work profiles throw on access; there the theme still switches, it just
forgets the choice when the tab closes.

### How a theme reaches the page

`assets/js/modules/theme.js` writes a single attribute on the `<html>` element:

```html
<html data-theme="light">   forced light
<html data-theme="dark">    forced dark
<html>                      no attribute — follow the system
```

`assets/css/theme.css` keys off that attribute. Nothing else in the codebase
knows a theme exists.

### No flash on load

Each page carries a four-line inline script in its `<head>`, *before* the
stylesheets:

```html
<script>
  try {
    var t = localStorage.getItem('hs-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
</script>
```

It has to be inline and synchronous — an external file would load after the page
has already painted, and a dark-mode visitor would see a white flash on every
single navigation. This is the one piece of theme code that is duplicated across
the seven HTML files; if you ever change the storage key, change it in all seven
and in `theme.js`.

### Changing a colour

Open `assets/css/theme.css`. The light scheme and the dark scheme are written as
two blocks of the same token names, deliberately kept next to each other so you
can see a value and its counterpart together:

```css
:root                      { --c-link: #047;    }   /* light */
:root[data-theme="dark"]   { --c-link: #7fb8e6; }   /* dark  */
```

Change the value, save, reload. Nothing else needs touching — the cross-fade,
the switch and the `<meta name="theme-color">` all follow automatically.

Note that the dark palette appears **twice** in the file: once for
`:root[data-theme="dark"]` (chosen explicitly) and once inside
`@media (prefers-color-scheme: dark)` (following the system). CSS has no way to
give one declaration block both a selector and a media query, so the two are
kept adjacent and clearly marked. **Edit both.**

### Adding a new colour

1. Add `--c-something: <light value>;` to the `:root` block.
2. Add `--c-something: <dark value>;` to *both* dark blocks.
3. Use `var(--c-something)` wherever you need it.

The rule the rebuild follows: no stylesheet other than `theme.css` ever contains
a hex value. If you find yourself typing `#` in `layout.css` or
`components.css`, that colour wants to be a token instead.

### Adding a third scheme

If you ever want, say, a high-contrast or sepia option:

1. Add a `:root[data-theme="sepia"] { … }` block to `theme.css`.
2. Add one entry to the `OPTIONS` array at the top of `theme.js`:
   `{ value: 'sepia', label: 'Sepia', icon: 'fad-sun', hint: '…' }`.
3. Widen the `readPreference()` guard to accept the new value.

The switch renders itself from that array, so it grows a fourth segment on its
own — no markup to edit.

### The cross-fade

Colour transitions are **off** by default. If they were always on, every link
hover would fade lazily instead of responding, and the first paint of the page
would visibly wash in. `theme.js` adds a `.theme-anim` class to `<html>` for the
350 ms of an actual theme change and then removes it. Visitors who have asked
their system to reduce motion get an instant switch instead.

Done in plain CSS and 4 lines of JavaScript — no GSAP, no animation library.

### Things a colour swap alone could not fix

- **The letterpress text shadows.** The headings get their depth from a white
  highlight above and a grey shadow below. In dark mode the same shapes cast
  *downward into* the dark instead (`--sh-title` and friends), so the effect
  survives rather than turning into a white halo.
- **The research-identifier marks.** Several (Publons, SciExplore, Academia) are
  dark artwork on transparency and would have vanished. In dark mode every one
  of them sits on a small light chip — applied uniformly, because doing it only
  to the offenders would have looked like a mistake.
- **The Sharif crest** is navy line-art on transparency; it gets the same
  treatment, rounded to a circle.
- **Brand wordmark colours.** Publons navy, SciExplore teal and Mendeley crimson
  are dark by design and unreadable on a dark panel. Each is lifted to a lighter
  tint of the *same* hue — recognisably the brand, comfortably legible. Those
  live at the bottom of `theme.css`.
- **Photo mounts.** The white card behind every portrait becomes `--c-surface`.

### Contrast

Both schemes were measured element by element against WCAG AA (4.5:1 for body
text, 3:1 for large text) on all seven pages:

- **Dark: zero failures.**
- **Light: four**, all of them brand logotypes in the sidebar (Scopus orange,
  ORCID green, ResearchGate teal). WCAG 1.4.3 explicitly exempts text that is
  part of a logo or brand name, and darkening them would destroy the
  recognisability that is the entire point of showing them. Left as they are.

Fixing the light scheme's real shortfalls needed three barely-perceptible nudges
to the original palette, each marked with a comment in `theme.css`:

| Token | Was | Now | Why |
|---|---|---|---|
| `--c-ink-faint` | `gray` (#808080) | `#6b6b6b` | 3.7:1 → 5.3:1 — journal and venue lines |
| `--c-ink-mute` | `#727272` | `#6e6e6e` | 4.49:1 → 4.6:1 |
| `--c-footer-text` | `#aaa` | `#b8b8b8` | 4.1:1 → 4.9:1 |

If you would rather have the originals back, change those three values — they
are the only places the light scheme differs from the site you approved.

**A fourth nudge, and the lesson in it.** The "Cited by N" badge (§18) measured
**4.43:1** in the light theme — under AA, on every one of the 86 badges the
Publications page draws. Its ink was `--c-ink-faint`, and that token is chosen
against the PAGE, where it measures 4.83:1 and clears AA comfortably. The badge
is one of the few places it lands on `--c-surface-2` instead, a tinted inset,
and on that same inset it falls to 4.43. It now uses `--c-ink-mute`, which
measures 5.48 there; `.pub__cited-n` keeps its own stronger colour and nothing
else changed.

The general point is worth keeping: **a colour token is only safe on the
background it was measured against.** A token that passes on the page can fail
on a card, an inset or a pill, and the only way to know is to measure the
element where it actually sits — which is what `check-contrast.mjs` does, and
why it found this the first time it was ever run on this machine.

---

## 7. The Persian typography lock

**The short version:** the Persian publication list is set in BZar at sizes that
are final. `assets/css/farsi.css` pins them so that no amount of restyling
elsewhere can move them. If you ever want to change Persian type, change it in
that file and nowhere else.

### The problem it solves

The Persian block sits inside the article column, and it used to take its size
*relatively*, three multiplications deep:

```css
.entry            { font-size: 0.8125rem }   /*  13px    */
.rtl              { font-size: 1.1em     }   /* → 14.3px  */
.rtl .pub__title  { font-size: 1.2em     }   /* → 17.16px */
```

Nudge `.entry` from 13px to 14px during a redesign and every Persian line
silently grows with it — the exact failure mode to avoid.

### How the lock works

`farsi.css` restates the same computed values as **absolute** rem, which cuts
the inheritance chain. The numbers are not new design decisions; each is the
measured value from before the refresh, converted at the 16 px root:

| | Computed before | Locked as |
|---|---|---|
| block size | 14.3 px | `0.89375rem` |
| title / authors / venue | 17.16 px | `1.0725rem` |
| block line-height | 21.45 px | `1.5` |
| line line-height | 23.77 px | `1.385` |
| masthead «حامد صادقی» | 12 px | `0.75rem` |

rem rather than px on purpose. The site grows its root font-size above 1600 px
so the whole page scales on 4K/6K displays, and the Persian block should keep
doing that exactly as it did. A px value would freeze it at 14.3 px on a 6K
screen while everything around it grew.

The `!important` flags in that file are not laziness — they *are* the boundary.
They hold even if someone later writes a more specific selector somewhere else.

### Three rules

1. **`farsi.css` loads last.** After every other stylesheet, on all seven pages.
   Keep it there.
2. **Nothing outside that file** may set `font-family`, `font-size`,
   `line-height`, `letter-spacing`, `word-spacing` or `direction` on `.rtl` or
   anything inside it.
3. **Colour, spacing and backgrounds are deliberately *not* locked.** The
   Persian block still switches to dark mode and still picks up the refreshed
   card styling. It keeps its letterforms and its measure; it is not frozen in
   amber.

### What counts as Persian

Two places, both marked in the markup rather than guessed at:

- `.rtl` — the Persian publications block. Emitted by
  `assets/js/pages/publications.js` for **any** section in
  `data/publications.json` carrying `"rtl": true`.
- `.masthead__fa` — «حامد صادقی» beside the site title.

Add `"rtl": true` to a new section in the data file and it lands inside the
protection automatically. Nothing else needs changing.

There is also a catch-all: any element with `lang="fa"` gets the BZar stack,
so hand-written Persian markup added later is covered even if the class is
forgotten.

### How it was verified

A script reads the *computed* style of ten elements in the Persian block —
family, size, weight, line-height, letter-spacing, word-spacing, alignment,
direction, indent, transform, kerning, numeric variants — across four viewport
widths (390 / 834 / 1440 / 3840 px) in both colour schemes, and diffs the result
against a snapshot taken before the refresh began.

Result after the 2026 redesign:

```
Typography   (family/size/weight/line-height/align/direction): identical ✓
Line breaks  (line count, width, height of all 39 blocks)    : identical ✓
```

**The lock earned its keep.** The first run of that check after the redesign
reported two failures, both of them real:

1. The redesign moved Latin headings from weight 700 to 600. `.pub__title` is a
   shared class, so the Persian titles followed — 700 became 600.
2. `body` gained an Inter stylistic-set (`font-feature-settings: "cv05"`), which
   inherited straight into the Persian name in the header, because that element
   sits outside `.rtl` and the `.rtl *` guard never reached it.

Neither would have been obvious by eye. Both were fixed by tightening
`farsi.css` — pinning `font-weight` on the three Persian text lines, and adding
the feature-settings and word-spacing resets to `.masthead__fa` — rather than by
weakening the redesign. That is exactly the division of labour the file is for.

The second line is the strong one. Every list item sits in a padded card, which
would normally narrow the text column by 26 px and reflow every line. Instead
each card's horizontal padding is cancelled by an equal negative margin, so the
card bleeds sideways into the gutter and **the text still starts and ends on
exactly the same pixels**. The check measures the rendered line count, width and
height of all 39 Persian text blocks and finds no difference — every line breaks
at the same word it always did.

Two things about the article column are therefore load-bearing and should not be
changed casually: `--w-main` (the column width) and `--pad` (its inner padding).
Together they fix the Persian measure. Everything else about the layout is free.

What *did* change around the Persian block: the wrapper's spacing, and the
`<ol>`/`<li>` box widths where the card bleeds outward. Spacing, not type.

---

## 8. The design system

The site was fully redesigned in 2026. This section is the reference for what
the new visual language is and where each part of it lives.

### What it looks like now

The original was a 2010 WordPress theme: a dark tab strip, grey bordered panels
on a grey page, 13 px Arial body copy and letterpressed headings. The redesign
keeps every piece of content and the whole seven-page structure, and replaces
the surface entirely.

| | Before | After |
|---|---|---|
| Header | dark tab strip below the content | translucent sticky bar carrying brand, nav and theme switch |
| Home page | one long column | portrait-led hero, then six section cards, then the biography |
| Panels | grey, hard-bordered | white cards, hairline + soft shadow, 16 px corners |
| Headings | Georgia with a letterpress shadow | Caladea, no shadow |
| Body | Arial 13 px | Carlito 16 px |
| Accent | none — links were navy | one cyan ramp, used for every accent on the site |

### Typography

Two self-hosted families, served from `assets/vendor/` — no external request:

- **Caladea** — all headings, the hero name, and the biography's drop cap. A
  sturdy text serif; academic without being fussy.
- **Carlito** — body copy, navigation, sidebar, buttons, everything else.

Cambria and Georgia remain in the serif fallback stack, Calibri and the system
UI fonts in the sans stack, so a page renders sensibly in the instant before the
webfonts arrive. §9 covers why these two families and how to change them.

The scale is a 1.2 ratio from a 16 px base (`--t-xs` … `--t-3xl` in
`base.css`), plus `--t-display` — a `clamp()` that gives the hero name a size
between 36 px and 60 px depending on viewport width.

**Persian is not part of any of this.** BZar, at the sizes it has always had.
See §7.

### Colour

One accent ramp built around the cyan already in the logo and the favicon:

```css
--c-brand:         #00ccff   /* the mark's own colour, decoration only     */
--c-accent:        #0e7490   /* everything, including accent-coloured TEXT */
--c-accent-bright: #0891b2   /* purely graphic uses, e.g. the progress bar */
--c-accent-soft:   #e0f5fb   /* accent washes behind text                  */
```

`--c-accent` is deliberately a step darker than the brand cyan. It is used as a
text colour — page kickers, card counts, the current nav item — and `#0891b2`
only reaches 3.3:1 against the page, which fails AA. `#0e7490` clears 4.8–5.4:1
on all three surfaces it ever sits on. If you brighten it, re-check §8's
contrast numbers.

The rest of the palette is in `theme.css`, light and dark side by side. Both
schemes are complete and independently tuned; see §6.

### Shape, depth and motion

```css
--radius-sm  6px    chips, small controls
--radius     10px   buttons, inputs
--radius-lg  16px   cards, panels
--radius-xl  24px   the hero
--radius-full       pills

--sh-card / --sh-card-hover / --sh-topbar    elevation, per colour scheme
--space-1 … --space-8    4 / 8 / 12 / 16 / 24 / 36 / 56 / 80 px
--ease, --ease-out, --dur (200ms), --dur-slow (400ms)
```

One easing curve and two durations for the entire site, so every hover, lift and
fade feels like it belongs to the same object.

Motion is used in four places only, and each earns it: cards lift on hover,
sections fade in as they scroll into view, the header gains a shadow once
content passes under it, and a 2 px line under the header tracks reading
position. All four are skipped or made instant under
`prefers-reduced-motion: reduce`.

### The home page

Three movements rather than one column:

1. **Hero** — portrait, name, role chips, affiliation, and the three links a
   visitor actually arrives for (Email, Google Scholar, ORCID).
2. **Section cards** — one per area of the site. The counts on them
   (152 items, 55 people, 9 courses…) are computed from the data files at load
   time, so they cannot go stale. Adding a publication updates the card.
3. **Biography and interests**, with contact details moved to the sidebar where
   they are easier to find than buried mid-article.

The cards are defined by the `CARDS` array at the top of
`assets/js/pages/home.js`. Each entry is a title, a blurb, an icon and a
`count` function — add or reorder freely. Each also carries its own colour in
the 3D layer, so hovering a card lights the field behind the page in the same
hue that section's entries use on its own page (§12).

### Where to change what

| You want to change | Edit |
|---|---|
| a colour, in either scheme | `assets/css/theme.css` |
| type sizes, spacing, radii, motion | the token block in `assets/css/base.css` |
| header, nav, sidebar, footer | `assets/css/layout.css` |
| cards, publications, people, buttons | `assets/css/components.css` |
| Persian typography | `assets/css/farsi.css`, and nowhere else |
| the home page's cards | the `CARDS` array in `assets/js/pages/home.js` |

No stylesheet other than `theme.css` contains a hex value. If you find yourself
typing `#` anywhere else, that colour wants to be a token.

### Verified

- Every page rendered at 320 / 390 / 834 / 1440 / 3840 px in both colour
  schemes: no console errors, no horizontal overflow, no stuck loaders.
- WCAG AA contrast measured element by element across all seven pages:
  **dark zero failures**, light four — the brand logotypes (Scopus, ORCID,
  ResearchGate), which WCAG 1.4.3 exempts as logos.
- Theme switch, lightbox, scrollspy, reading progress, sticky header and the
  mobile drawer all re-tested after the redesign.
- Persian typography and line breaks identical to the pre-redesign baseline
  (§7).

---

## 9. Running with no internet

The site makes **no external requests for anything it needs to render**. Fonts,
icons, images, scripts and styles are all in this repository. Unplug the network
and every page still looks and behaves exactly the same.

There is exactly one outbound request, and it is deliberate: the analytics tag
(§10). It is `async`, it blocks nothing, and when it fails the page is unaffected.

### What was external before, and where it went

| Was | Now |
|---|---|
| Inter + Source Serif 4 from `fonts.googleapis.com` (an `@import` in base.css) | Carlito + Caladea in `assets/vendor/fonts/` |
| `<link rel="preconnect">` to `fonts.googleapis.com` and `fonts.gstatic.com` | removed from all seven pages |
| Font Awesome Pro kit from a CDN *(removed in round 1)* | `assets/icons/icons.svg`, a 66-symbol sprite |
| jQuery from `ajax.googleapis.com` *(removed in round 1)* | not needed — see §5 |

### The fonts

```
assets/vendor/
├── fonts.css              every @font-face on the site, in one file
└── fonts/
    ├── caladea-400.woff   30 KB  headings, hero, drop cap
    ├── caladea-700.woff   30 KB
    ├── carlito-400.woff   48 KB  body copy, UI, navigation
    ├── carlito-700.woff   51 KB
    ├── BZar.woff / .ttf   25 / 57 KB  Persian publications
    ├── OFL-Caladea.txt    the licence, which must travel with the font
    └── OFL-Carlito.txt
```

**Why these two families.** The restricted environment blocks Google Fonts, npm
and PyPI alike, so Inter and Source Serif 4 could not be fetched and repackaged.
Caladea and Carlito were chosen instead because all three of these are true at
once:

- both are **SIL Open Font License 1.1**, which explicitly permits web embedding
  and redistribution provided the licence travels with the files — the copies in
  that folder are exactly that;
- they were **designed as a pair** (the Chrome OS metric-compatibility project),
  so a serif/sans pairing that works was not something to invent;
- they are **already installed on most Linux distributions and any machine with
  LibreOffice**, so many visitors never download them at all.

Caladea reads close to Source Serif 4 — a sturdy text serif with the same
academic register. Carlito is a humanist sans in Inter's territory. The site
looks materially the same as it did before the swap.

**Weight ranges.** Neither family ships a 600 cut, and the design asks for 600 in
several places. Rather than let the browser synthesise a fake bold, `fonts.css`
declares each Bold file with a *range* — `font-weight: 600 700` for Caladea,
`500 700` for Carlito — so every semibold in the design resolves to the real
Bold outline. This is worth knowing before you add a new weight anywhere.

**Why WOFF rather than WOFF2.** WOFF2 compression needs the `brotli` Python
module, which cannot be installed here. WOFF is universally supported and costs
roughly 40 KB more across the four faces — once, then cached for the whole site.
`tools/build-fonts.py` emits WOFF2 automatically if you run it somewhere
`brotli` is available; add the `.woff2` files ahead of the `.woff` ones in each
`src:` in `fonts.css` and everything else keeps working.

### Regenerating or replacing the fonts

`tools/build-fonts.py` is the recipe. It takes the full desktop TTFs, subsets
them to the characters the site uses (Basic Latin, Latin-1, Latin Extended-A,
punctuation, arrows, ligatures — but **not** Persian, which ships whole), and
writes the WOFF files.

```
pip install fonttools          # brotli too, if you want woff2
python3 tools/build-fonts.py
```

The committed output is what the site uses; you never need to run this to
deploy. To swap in a different family, point `SRC_DIR` and `FACES` at your own
files, re-run, and update the `font-family` names in `fonts.css` and the
`--f-body` / `--f-serif` stacks in `assets/css/base.css`.

### Proving it stays offline

```
node tools/check-offline.mjs
```

It walks every HTML, CSS and JS file and flags any reference the *browser would
fetch* — `<script src>`, `<link rel=stylesheet|preload|preconnect>`, `<img src>`,
`<use href>`, `@import`, `url()`, `fetch()`, ES imports — that points off-site.
Plain `<a href>` links and the DOIs in the data files are ignored on purpose:
those are places a visitor goes, not things the page loads.

Current output:

```
Allowed external references (7):
  www.googletagmanager.com  ×7  — analytics tag, ported from legacy_index.html

OFFLINE CHECK PASSED — no unexpected external assets.
```

Run it after any change that adds an asset. It exits non-zero on failure, so it
drops straight into a pre-commit hook or CI step if you ever want one.

### Tested with the wire cut

Every page was rendered at 390 / 1440 / 3840 px in both colour schemes with
**all non-localhost requests hard-blocked at the browser**. Result: fonts
resolved from local files (`BZar, Caladea, Carlito` all reporting `loaded`), no
console errors, no layout overflow, no stuck loading states, and the analytics
queue intact.

---

## 10. Trackers

### What the legacy page carried

`legacy_index.html` is the original home page, kept in the folder unmodified as
the reference for what the site used to emit. Reading it out:

| | |
|---|---|
| Analytics | Google Analytics `gtag.js`, property **UA-175901189-1** — an async loader plus an inline `dataLayer` / `gtag('config', …)` snippet |
| Identity meta | `theme-color`, `keywords`, `X-UA-Compatible` |
| Open Graph | `og:title`, `og:type`, `og:url`, `og:image`, `og:image:type`, `og:image:alt`, `og:description`, `og:site_name` |
| Icons | SVG favicon, PNG fallback, `mask-icon`, four `apple-touch-icon` sizes |

### What went wrong, and what fixes it

The rebuild dropped the analytics tag. Not deliberately — it simply did not
survive the move from the old markup, and nothing checked. It was missing from
all seven pages across four rounds of work.

It is now back on every page, as one block delimited by a comment that says it
must stay identical everywhere. And because "somebody will remember" is not a
mechanism, there is a script:

```
node tools/check-trackers.mjs
```

It reads `legacy_index.html`, works out what has to be present, and checks each
page against it:

- the property ID appears in the page;
- the `gtag.js` loader `<script>` is present;
- the `gtag('config', …)` call is present;
- every identity meta tag is present **and matches the legacy value**;
- `og:image` is present and **identical across the new pages** — deliberately
  not compared to the legacy value, because the image is unchanged but its path
  moved during the restructure, and pinning it to the old path would produce a
  social card pointing at a 404;
- `og:title`, `og:url` and `og:description` are present but free to differ, which
  is what makes each page findable on its own.

Current output:

```
Properties: UA-175901189-1, G-2CEQVFDFL0, G-PVGHBG4LVB, G-HX1R37Y863   Reference: legacy_index.html   Pages: 7
  ok    background.html   ok    honors.html      ok    index.html
  ok    publications.html ok    research-team.html
  ok    services.html     ok    teaching.html

TRACKER CHECK PASSED — every page carries every legacy tracker.
```

### Every property the site reports to

Four, all Google Analytics, all firing from the same block in the `<head>` of
all seven pages:

| Property ID | What it is | Since |
|---|---|---|
| `UA-175901189-1` | Universal Analytics — the original, ported verbatim from `legacy_index.html` | the old site |
| `G-2CEQVFDFL0` | GA4 | 2026 |
| `G-PVGHBG4LVB` | GA4 | 2026 |
| `G-HX1R37Y863` | GA4 | 2026 |

The block, exactly as it appears in every page:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-175901189-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'UA-175901189-1');
  gtag('config', 'G-2CEQVFDFL0');
  gtag('config', 'G-PVGHBG4LVB');
  gtag('config', 'G-HX1R37Y863');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2CEQVFDFL0"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PVGHBG4LVB"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-HX1R37Y863"></script>
```

**Why it is not four copies of Google's snippet.** Google gives you a complete
block per property, and pasting four of them would define `dataLayer` four
times, redefine `gtag` four times, and push four `gtag('js', new Date())`
timestamps into every session. One queue and one shim serve all four; what each
property genuinely needs of its own is a **loader** (`gtag/js?id=…`) and a
**`gtag('config', …)`**, and that is exactly what is repeated above.

### Adding a property

1. Add a `gtag('config', 'G-XXXXXXXX');` line inside the existing inline
   `<script>`, after the ones already there.
2. Add a matching loader: `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>`.
3. Do both in **all seven pages** — `index`, `background`, `honors`,
   `publications`, `research-team`, `teaching`, `services`.
4. Add the ID to `EXTRA_PROPERTIES` in `tools/check-trackers.mjs`.
5. Run `node tools/check-trackers.mjs`. It will name any page you missed.

### Removing or changing a property

The reverse, and in the same five places. One exception: `UA-175901189-1` is not
in `EXTRA_PROPERTIES` — the checker discovers it by reading `legacy_index.html`,
because its job for that one is "did the port lose anything the old site had".
To retire it, delete its loader and its `config` line from the seven pages and
the checker will report it missing, which is the correct answer until you also
decide the old site's tracking no longer has to be preserved.

Deliberately not abstracted into a shared JavaScript module: the tag has to be
inline in `<head>` to fire before the page renders, and a tracker that depends
on the site's own JavaScript loading is a tracker that under-reports.

### Analytics with no network

The loader is `async`, so it never blocks rendering. With no route to
`googletagmanager.com` the request simply fails, `window.gtag` stays the local
stub, and the queued calls pile up harmlessly in `window.dataLayer` — verified in the
wire-cut test above (`dataLayer=2, gtag=function`). Nothing throws and nothing
about the page changes. If the machine later has a route, page views from that
point are reported normally.

### legacy_index.html

Kept **unmodified except for one deliberate line**, described below. It is a
reference document, not a live page: it points at `./files/css/style.css` and
`./files/js/all.min.js`, which belong to the old tree and are not part of this
one. Opening it will render unstyled. That is expected; its job is to be the
record of what the original emitted, and it is what `tools/check-trackers.mjs`
reads.

**The one change: `<meta name="robots" content="noindex, nofollow">`**, added on
2026-09-20 directly under the `theme-color` tag, with a comment beside it saying
what it is. Nothing links to this file, but it is published at
`https://hsadeghi.org/legacy_index.html` along with everything else, and an
unstyled 2020 page that still says "Hamed Sadeghi" in its `<title>` is exactly
the kind of thing a crawler finds and a reader then arrives at from a search
result, wondering why the site looks broken. The tag costs nothing and prevents
that.

It is worth being precise about what this does and does not disturb. The file
was previously byte-identical to the copy supplied, and that claim is now
retired — it is 38,047 bytes rather than 37,559. What the file is *for* is
untouched: `check-trackers.mjs` still reads `UA-175901189-1` out of it and still
compares all seven identity meta tags against it, and the check passes. None of
the tags the guard reads were altered, reordered or removed; one was added, and
`robots` is not in any list the guard consults. `.gitattributes` still marks the
file `-text`, so Git will not rewrite its line endings either.

If you would rather have the original bytes back, delete those eight lines —
the guard does not depend on them, and the only consequence is that search
engines may index the page again.

If you want the old *page* addresses to keep working, that is a handful of
redirect stubs you write yourself — the template and the old-to-new mapping are
in §11, under *"Keeping old links working"*. There used to be a `legacy/` folder
in this repository holding ready-made copies; it was never wired into anything,
never deployed, and is gone.

---

## 11. Deploying

Upload the whole folder. That is the entire procedure.

The site is self-contained. Every font, icon and script it loads is a file in
this folder; the only external request on the whole site is the analytics tag,
and it is `async` and optional — see §9 and §10. Three.js, if you install it,
is vendored too (§12.3) — nothing is ever fetched from a CDN at run time.

### 11.1 Two homes, one set of files

The site is published twice:

| | Address | Served by | Who it is for |
|---|---|---|---|
| **The domain** | `https://hsadeghi.org/` | GitHub Pages, behind Cloudflare | everyone outside Iran |
| **The mirror** | `http://sharif.edu/~hsadeghi/` | the university's own server | inside Iran, where the .org may be unreachable |

They are **the same files**, uploaded to two places. Nothing is built
differently for one or the other, and nothing has to be — which is a property
of the code and one that is easy to lose, so it is checked.

**Every internal reference is relative.** Not `/assets/icons/icons.svg` but
`assets/icons/icons.svg`; not `https://hsadeghi.org/teaching.html` but
`teaching.html`. The two are identical at a domain root and different
everywhere else: on the university mirror the site lives at `/~hsadeghi/`, so a
leading slash points at *sharif.edu's* root and everything breaks. An absolute
link is worse than broken — it sends a reader on the mirror out to the internet,
which is the one thing the mirror exists to avoid.

`node tools/check-offline.mjs` now fails on either mistake. It reads every
`<a href>`, `<script src>`, `<img src>`, `<use href>`, `fetch()` and `import()`
in the shipped files and rejects any that starts with `/` or names one of the
site's own addresses.

**The exception is metadata, and it is deliberate.** `<link rel="canonical">`
and the Open Graph tags in every page point at `https://hsadeghi.org/…`, on both
copies. That is what canonical is for: it tells search engines the two copies
are one page and which address to index, so the mirror does not compete with the
domain in results. `data/site.json` carries the same address as `baseUrl`, and
its `origins` list — the copy canary's allowlist, §19 — holds **both** hosts, so
neither copy accuses itself of being a copy.

### 11.2 Putting it on GitHub Pages, step by step

Everything below is meant to be followed literally. Where a command is shown,
run it in a terminal opened **inside the site folder** (the one containing
`index.html`).

**1. Make a GitHub account** — <https://github.com/signup>. Any username; it
does not appear in the final address once the custom domain is on.

**2. Make the repository.** On GitHub: **+** (top right) → **New repository**.

- **Repository name:** `hsadeghi.org` (any name works; this one is self-explanatory)
- **Public** — GitHub Pages needs public on a free account
- Do **not** tick "Add a README" — the folder already has one
- **Create repository**

**3. Upload the files.** Two ways; the first needs no software.

*Without Git.* On the new repository's page click **uploading an existing
file**, then drag in **the contents of the site folder** — `index.html`, the
other six `.html` files, and the `assets`, `data` and `tools` folders.
Not the folder itself: GitHub must see `index.html` at the top of the
repository. Scroll down, write "first upload", **Commit changes**.

*With Git* (better, because every later change is three commands):

```bash
git init
git add .
git commit -m "Site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hsadeghi.org.git
git push -u origin main
```

**4. Turn on Pages.** Repository → **Settings** → **Pages** (left sidebar).

- **Source:** *Deploy from a branch*
- **Branch:** `main`, folder `/ (root)` → **Save**

Wait a minute or two and the site is live at
`https://YOUR-USERNAME.github.io/hsadeghi.org/`. Open it and check it works
before going further — this address has the site in a **subfolder**, which is
exactly the case relative URLs exist for, so if it works here it will work
anywhere.

**5. Tell GitHub about the domain.** Still in **Settings → Pages**, under
**Custom domain** type `hsadeghi.org` and **Save**. GitHub adds a file called
`CNAME` to the repository; leave it there.

**6. Point Cloudflare at GitHub.** Cloudflare dashboard → your domain → **DNS**
→ **Records**. Delete any existing `A`, `AAAA` or `CNAME` record for `@` or
`www`, then add these five. **Proxy status must be "DNS only" (grey cloud), not
"Proxied" (orange)** — GitHub issues the HTTPS certificate itself and cannot do
it through Cloudflare's proxy.

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| CNAME | `www` | `YOUR-USERNAME.github.io` | DNS only |

**7. Set Cloudflare's SSL mode.** Domain → **SSL/TLS** → **Overview** → **Full
(strict)**. "Flexible" causes a redirect loop with GitHub Pages.

**8. Wait, then turn on HTTPS.** DNS takes anywhere from a few minutes to a few
hours. Go back to **Settings → Pages**; when the banner stops saying it is
checking, tick **Enforce HTTPS**. The site is now live at `https://hsadeghi.org`.

**9. Upload the same files to the university server**, into your `public_html`
(or equivalent) so they appear at `http://sharif.edu/~hsadeghi/`. Exactly the
same files — no edits, no different build.

**Later changes**, once with Git:

```bash
git pull
git add .
git commit -m "What changed"
git push
```

GitHub Pages redeploys in under a minute. Then upload the same changed files to
the university server so the two stay in step.

**`git pull` first, and it is not optional any more.** The scheduled workflow in
`.github/workflows/refresh-scholar.yml` commits `data/scholar.json` to `main`
twice a day (§18.2), so the remote is usually ahead of a local copy that has sat
for a day, and a push without a pull is rejected. That one file is the only
thing anything automatic ever writes.

**Step 9 has a second half now.** The workflow keeps `hsadeghi.org` current and
cannot reach `sharif.edu`, so the mirror's citation figures only move when
someone carries `data/scholar.json` across. `tools/refresh-scholar.ps1` exists
for that: it refreshes the snapshot from this machine and says, when the numbers
have moved, which single file has to be uploaded. §18.2.

### 11.3 If the address ever changes

Three files know the address, and nothing else does:

1. **The seven page heads** — `<link rel="canonical">`, `og:url`, `og:image`.
2. **`data/site.json`** — `baseUrl`, and `origins` (add the new host, keep the
   old ones until they stop serving, or the canary will accuse them).
3. **`tools/check-canary.mjs`** — the `CASES` list, so the check tests the real
   hostnames.

Then run `node tools/check-offline.mjs` and `node tools/check-canary.mjs`.

### 11.4 The update runbook — both copies, end to end

§11.2 is how the two homes were *set up*, once. This is what you do afterwards,
and it is written to be followed without reading anything else.

There are only ever **two kinds of update**, and they behave very differently:

| | What it is | Who does it |
|---|---|---|
| **Content** | anything you edited — a JSON file in `data/`, a photo, a page, a stylesheet | you, by hand, on both copies |
| **Citation data** | `data/scholar.json` — the citations, h-index, i10-index and the "Cited by N" badges | a robot on GitHub; **you** on the university mirror |

That asymmetry is the whole reason this section exists. The GitHub copy keeps
its own citation figures current and the university copy cannot, so the mirror
falls quietly behind unless someone carries one file across. Everything below
is arranged around it.

---

#### A. Updating content on the GitHub copy (`hsadeghi.org`)

From a terminal opened **inside the site folder** (the one with `index.html`):

```bash
git pull                              # 1. ALWAYS first — see the warning below
# ... make your edits ...
node tools/check-offline.mjs          # 2. no absolute paths, no new hosts
node tools/check-trackers.mjs         # 3. every page still carries every tag
git add .
git commit -m "What changed"
git push                              # 4. Pages redeploys in under a minute
```

**`git pull` first, and it is not optional.** The scheduled workflow commits
`data/scholar.json` to `main` twice a day, so the remote is usually ahead of a
local copy that has sat overnight, and a push without a pull is rejected. If
you forget and the push bounces:

```bash
git pull --rebase       # replays your commit on top of the robot's
git push
```

To confirm it went out: the repository's **Actions** tab shows a `pages build
and deployment` run, and `https://hsadeghi.org/` is current a minute after it
goes green.

---

#### B. Updating content on the university mirror (`sharif.edu/~hsadeghi/`)

The mirror has no Git, no workflow and nothing automatic. It is files in a
folder — and **exactly the same files**, because nothing is built differently
for it (§11.1).

1. Connect to the university server (SFTP, SCP, or whatever file manager the
   department provides).
2. Go to your `public_html` — the folder that answers at
   `http://sharif.edu/~hsadeghi/`.
3. Upload **the files you changed**, keeping the same folder structure. A
   changed publication is `data/publications.json` and nothing else; a changed
   photo is the one file in `assets/img/people/`.
4. Open `http://sharif.edu/~hsadeghi/` and look at the page you touched.

**Upload the contents of the folder, never the folder itself.** `index.html`
has to sit at the top of `public_html`, exactly as it sits at the top of the
repository.

If you would rather not work out which files changed, upload all of them — the
site is a few megabytes and there is no state on the server to preserve. If you
are counting bytes, §11's *"Build inputs you do not have to upload"* lists the
~1.3 MB of source artwork that nothing at run time reads.

**Why relative paths matter here and nowhere else.** On the mirror the site
lives under `/~hsadeghi/`, so a single leading slash — `/assets/…` instead of
`assets/…` — points at *sharif.edu's* root and the page falls apart.
`node tools/check-offline.mjs` catches that before you upload it, which is why
step 2 of the GitHub flow protects this copy too.

---

#### C. Refreshing the citation figures

The browser never asks Google — it reads `data/scholar.json`, a file, like
every other file. §18.1 is the argument; this is the procedure.

**On GitHub: nothing to do.** `.github/workflows/refresh-scholar.yml` runs at
03:17 and 15:43 UTC, fetches the profile, validates it, and commits
`data/scholar.json` **only if a number moved**. Pages redeploys on that commit.

To force it now: **Actions → Refresh the Google Scholar snapshot → Run
workflow**. To read the history:

```bash
git log --oneline -- data/scholar.json
```

which reads as the citation history of the profile, because the figures are in
the commit subjects.

**On the university mirror: you carry the file across.** Nothing on GitHub can
reach `sharif.edu`. From this machine:

```powershell
pwsh -File tools/refresh-scholar.ps1
```

It prints the figures before, asks Google, validates the answer, prints the
figures after, and — when they moved — tells you that `data/scholar.json` now
has to be uploaded. Then upload that **one file** to
`public_html/data/scholar.json` on the university server. Every run appends a
line to `tools/scholar-refresh.log`.

```powershell
pwsh -File tools/refresh-scholar.ps1 -DryRun      # ask, print, write nothing
pwsh -File tools/refresh-scholar.ps1 -Register    # do it daily at 07:40
pwsh -File tools/refresh-scholar.ps1 -Unregister  # stop doing it daily
```

This half is also the one to reach for when Google is being awkward: it asks
from a home or campus address, which Scholar answers without a captcha far more
often than it answers a datacentre.

**Or with plain Node, on any platform:**

```bash
node tools/fetch-scholar.mjs                 # refresh data/scholar.json
node tools/fetch-scholar.mjs --dry-run       # print the report, write nothing
node tools/fetch-scholar.mjs --user XXXXXXX  # a different Scholar profile
node tools/check-scholar.mjs                 # validate, with no network at all
```

Node 18 or newer, from the site root, nothing to install.

**Having refreshed it locally, the GitHub copy wants it too** — otherwise your
commit and the robot's next one describe the same file differently. The normal
flow handles it: `git pull` before you start, and your local
`data/scholar.json` goes up with everything else on the next `git push`.

**Neither route can make the figures wrong.** The fetcher refuses to write a
snapshot it is unsure of — a captcha, a consent page, a timeout, a summary
table that read as zero — and leaves the existing file untouched. The failure
mode is *"the numbers are a day old"*, never *"the numbers are wrong"* and
never *"the numbers vanished"*. §18.5 is the full table.

---

#### D. One update, both copies — the short checklist

```
[ ] git pull
[ ] edit
[ ] node tools/check-offline.mjs      no absolute paths, no new hosts
[ ] node tools/check-trackers.mjs     every page carries every analytics tag
[ ] node tools/check-scholar.mjs      if you touched data/scholar.json
[ ] git add . && git commit && git push          -> hsadeghi.org
[ ] upload the same changed files to public_html -> sharif.edu/~hsadeghi/
[ ] open both addresses and look at the page you changed
```

The other guards are worth a run after a bigger change, and none of the first
two needs the network:

```bash
node tools/check-authors.mjs     # the co-author names agree across the data
node tools/check-canary.mjs      # the copy canary knows both hostnames (§19)
node tools/check-farsi.mjs       # the Persian typography lock (§7)
node tools/check-contrast.mjs    # text contrast in both themes
node tools/check-dropcap.mjs     # the drop cap
node tools/check-ui.mjs          # the full browser pass
```

`check-canary`, `check-farsi`, `check-contrast`, `check-dropcap` and `check-ui`
drive a real browser. They are **skipped with a message** when Playwright is not
installed rather than failing, which is deliberate: editing a JSON file should
not require a browser automation library. A skip is not a pass — if you have
changed anything visual, install it and run them properly:

```powershell
npm i -D playwright
npx playwright install chromium
```

Two separate lines on purpose. Windows PowerShell 5.1 — still the default on
Windows — does not accept `&&` as a statement separator and answers a chained
version with `The token '&&' is not a valid statement separator`. PowerShell 7
(`pwsh`) and bash both take `&&` happily; two lines work everywhere.

That installs about 19 MB of package and a private copy of Chromium. Neither is
committed: `node_modules/`, `package.json` and `package-lock.json` are all in
`.gitignore`, so the repository stays a folder you can upload to any static host
and the site keeps having no dependencies at all.

---

#### E. When it does not go to plan

| Symptom | What it is | What to do |
|---|---|---|
| `git push` rejected, "fetch first" | the robot committed `data/scholar.json` while you were working | `git pull --rebase`, then push |
| The push landed, the site did not change | Pages build still running, or a cached page | check **Actions**, then hard-reload (Ctrl-F5) |
| The push landed, Pages never rebuilt | the known `GITHUB_TOKEN` restriction | §18.2 — swap in a deploy key or a fine-grained PAT |
| The mirror shows old citation figures | nobody carried `data/scholar.json` across | §11.4C, second half |
| The mirror is broken, `hsadeghi.org` is fine | almost always an absolute path | `node tools/check-offline.mjs` |
| The workflow was green but nothing changed | Scholar returned a captcha, or no figure moved | nothing — that is the designed behaviour, the next run tries again |
| The citation tiles vanished from the site | the snapshot is missing, malformed, zero, or over 400 days old | `node tools/check-scholar.mjs` says which; §18.5 |
| A "Cited by" badge is missing on one paper | Scholar's title and the site's differ too much to join | add the pair to `data/scholar-aliases.json`; §18.3 |

### Keeping old links working

The old page addresses were `files/pages/publications.html` and similar. If you
want links published in papers and profiles to keep working, add a small
redirect at each old path:

```html
<!DOCTYPE html><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=../../publications.html">
<link rel="canonical" href="../../publications.html">
<a href="../../publications.html">This page has moved.</a>
```

Old → new: `background.html` → `background.html`, `honor.html` → `honors.html`,
`publications.html` → `publications.html`, `researchTeam.html` →
`research-team.html`, `teaching.html` → `teaching.html`, `services.html` →
`services.html`.

### Files you no longer need

Once the new site is live, these can go: `files/css/style.css` (278 KB),
`files/js/all.min.js` (5.8 MB), `files/js/jquery-3.5.1.min.js`,
`files/js/script.js`, `files/js/dom.js`, `files/scss/`, and the `.bak` files in
`files/pages/`. Everything still needed has been copied into `assets/`.

**Build inputs you do not have to upload.** `assets/img/logos/bismillah-*.png`
and `assets/img/logos/logo.png` are the source artwork the tracers read, and
nothing at run time ever fetches them — the site serves the `.json` traces and
the `-poster.png` cut-outs those tracers write. Together the sources are about
1.3 MB. Keep them in the repository (they are what a re-trace needs) and leave
them out of a deploy if you are counting bytes.

### One optional further win

`assets/img/Hamed Sadeghi.jpg` is 251 KB — larger than it needs to be for the
size it is displayed at. Re-saving it at quality 85, or at twice the displayed
pixel size and no more, would cut it to well under 100 KB with no visible
difference. The same applies to the student photos in `assets/img/people/` if
you ever want to trim another few hundred kilobytes off the Research Team page.

---

## 12. The 3D layer

Three effects, one system, built on Three.js with a fallback that needs nothing
at all:

1. **The field** — a lattice of small squares on a plane behind every page,
   drawn through a perspective camera that yaws slightly toward the pointer.
2. **The contextual highlight** — the entry you are pointing at lights up, and
   the field rises and changes colour underneath it.
3. **Depth-push page transitions** — the page you leave recedes; the page you
   arrive at rises from behind it.

Everything lives in `assets/js/modules/fx/` and `assets/css/fx.css`.

### The rule the whole layer obeys

**It is an enhancement of a page that is already complete.** The field is drawn
into a canvas that does not exist in the markup; the transitions are scoped to a
class only JavaScript adds; the highlight is a colour and a shadow on an element
that is fully readable without either. Switch JavaScript off, or open the site in
a browser with no WebGL, and what is left is the site exactly as it was — not a
degraded version of it.

Two consequences worth stating plainly, because they constrain anything added
here later:

- **Nothing in `fx.css` may change layout.** Colour, shadow and transform only —
  never width, padding, border-width or font. That is not tidiness: the Persian
  publication list is inside the highlighted region and its line breaks are
  pinned (§7). A one-pixel border on a list item would reflow every Persian line.
- **`assets/js/main.js` starts the layer last and never awaits it.** Every word
  of the page is on screen before the field is imported, and a WebGL failure is
  caught and logged rather than propagated.

### 12.1 The contextual highlight — what it is actually for

The Publications page runs to 152 entries; Research Team to 55 people. Lists that
long are hard to keep your place in. So:

- The entry under the pointer takes a **ring and a glow in its section's
  colour**, lifts a few pixels toward you, and tilts very slightly to follow the
  pointer — a real 3D rotation, not a shadow trick.
- The **field behind the page lights up around it** — a cloud of small stars
  gathers along the entry's outline, flaring and swirling, and its colour travels
  to the same hue over about 300 ms. The colour transition is the point: light
  arriving, rather than a state flipping.

**The halo hugs the outside, and never the inside.** The first version of this
put a Gaussian bump *under* the hovered element, which meant its brightest
particles sat directly behind the text being read — the effect looked like
interference rather than emphasis. It is now a box distance field: the shader
measures how far each square lies outside the element's rectangle and lights a
band about 26 px wide around it, masked to nothing within. A rectangle rather
than a circle because a circular falloff around a wide row reaches much further
above and below it than beside it, straight across the neighbouring entries; and
26 CSS pixels rather than a proportion of the element, because a proportional
band is thin around a one-line entry and enormous around a tall card — which is
exactly how it looked on a phone.

**The colour means something.** It belongs to the *section*, not the item.
Journal papers light amber, the Persian list blue, doctoral students violet.
After a few seconds of scrolling you know which part of a long page you are in
from the colour of the light alone. That is why this is navigation and not
ornament.

Six hues cycle, defined per colour scheme in `theme.css` as `--fx-hue-0` …
`--fx-hue-5`. A section picks one by its position on the page; every item inside
inherits it.

**How an element opts in.** One attribute:

```html
<li data-fx>…</li>                     <!-- highlightable            -->
<section data-fx-hue="3">…</section>   <!-- everything inside is green -->
```

`sections.js` adds both automatically, so a new section in a JSON file arrives
with its own colour and needs no code change.

**Static cards light the field, and nothing else.** The Contact card and the
Pages card on the Summary page are shaped like the interactive ones and are not
interactive. They used to do nothing at all when the pointer crossed them, which
made them read as inert rather than as deliberately quiet — and, worse, made the
light behind the page snap *off* as the pointer moved from a card that lights
onto a card that does not.

They now opt into the field and nothing more. They still do not move, tilt, glow
or take a border: they are not links and pretending otherwise would be a lie
about what clicking does. What they do is tell the field where the pointer is,
which is the half of the effect that belongs to the page rather than to the
element. The mechanism is `data-fx-field`, which the Summary hero already used —
so this is not new behaviour, only a new set of elements opted into it, and
`highlight.js` tags them on first hover:

```js
const STATIC_CARDS = '.panel';
```

Add a selector there if a new kind of static card appears.

**They all get the hero's *local* treatment**, whatever their size. A first pass
gave the local halo only to cards past a size threshold and lit the whole
perimeter of anything smaller, and the difference between those two is not
cosmetic: a whole outline lighting at once is the page saying *this is the thing
you are pointing at*, and a patch of light following the pointer along an edge is
the page saying *you are here*. These cards are not things you point at; they are
things the pointer crosses. One rule is also one thing to remember rather than a
threshold to be surprised by.

**Keyboard and touch are not afterthoughts.** Tabbing lights the same things
hovering does. On a touch screen, where there is no hover at all, the entry
nearest the middle of the viewport is lit as you scroll — which turns the effect
into a reading marker on exactly the devices where the long lists are hardest to
follow. The touch marker deliberately looks at `[data-fx]` only: a field-only
card is neither a row to keep your place in nor something that wants its whole
perimeter lit the moment it drifts past the middle of a phone screen.

### 12.2 The field — a cloud of stars

`lattice.js` describes it, `shaders.js` draws it, `camera.js` frames it, and the
two renderers below put it on screen. It is about **500 five-pointed stars**
scattered through a slab of space behind the page — 30,000 vertices, one draw
call, four static buffers uploaded once. Each star has its own size, spin rate,
twinkle phase and depth.

**They are real solids, not sprites.** Each star is a five-pointed polygon
pulled out to a point on both faces — twenty triangles with a proper face normal
each — plus six more vertices for the quad that carries its glow. It turns in
its own plane with a bounded lean of about fourteen degrees, so its facets
brighten and dim separately without it ever going edge-on: a five-pointed star
seen from the side is a sliver, and stops being recognisable. That is the whole difference between a three-dimensional star and a
picture of one, and it is why they are lit in the vertex shader rather than
masked in the fragment shader: the silhouette on screen *is* the geometry.

Both renderers cull back faces. Without that, each star's far facets blend
through its near ones and the whole cloud looks like glass. Culling still works
while they tumble, because it tests the winding after projection.

**Each one breathes on its own rhythm.** Size and brightness come from three
sines at rates that do not divide into one another, so their sum never repeats
in any way the eye can follow and no two stars are ever seen doing the same
thing at once — which is exactly what a single sine gave, and what made the
earlier field look mechanical. The same wave raised to a high power gives an
occasional flare: near zero almost all the time, briefly close to one.

**And they emit light.** A billboarded quad behind each star, filled with a
radial falloff. It rides in the same buffer and the same draw call; the only
thing separating it from the solid is `role`, the fourth component of the seed.

**The wake — the field answers the pointer, not just the cards.** Moving the
mouse anywhere on the page lifts the stars under it: they brighten, swell, gain
a shimmer and rise slightly toward the viewer. It is a different *shape* from the
card halo as well as a smaller amount — a plain radial falloff centred on the
cursor, where the halo is a box distance field with a hollow middle. That is
deliberate: the halo is wrapped around something you are reading, and there is
nothing to read at a bare cursor and nothing to wrap around. A weaker copy of the
halo would have given the page two rectangles fighting over the same stars.

Three rules keep it in its place, and each is a line of code rather than a
judgement call:

- **It is scaled down by the card's own energy** (`WAKE_DAMP`). The brief was
  that the pointer's effect must stay below a card's, and the cheap way to
  *guarantee* that is not to tune two sets of amplitudes against each other but
  to make one yield: as a card's halo rises, the wake gets out of its way.
  Measured on a dark page, the wake lifts a patch of field about a third as much
  as a card halo does.
- **Whatever is left is multiplied by the same `outside` term as the halo** while
  a card is lit, so it cannot brighten the cloud *inside* the element. This
  matters because rows on the Publications page are transparent — the field is
  genuinely visible behind their text — and "the stars must not interfere with
  the content of the focused card" is a real constraint there, not a theoretical
  one.
- **It brightens but never tints.** Hue on this field means *which section of the
  page is this*; a cursor is not a section, so lending it a colour would be
  saying something untrue. It lifts the star part of the way to white and stops.

It also **expires** (`WAKE_HOLD`, 2.4 s after the last pointer move) and the idle
frame-skip counts it as activity. Without the expiry a cursor parked anywhere on
the page would pin the render loop at full rate for as long as it sat there;
with it, a page nobody is pointing at still drops back to 30 fps.

The cost of that honesty is 66 vertices per star instead of 6, so there are
fewer of them than there were sprites — 500 rather than 900.

**Why scattered and not a grid.** The first version was a regular lattice of
squares, and the giveaway was exactly that: lighting a band around a card
produced four tidy rows of little squares in a rectangle, which reads as a table
border rather than as light. Stars at pseudo-random positions have no rows to
line up in, so the same band comes out as a cloud. They also *move* — a slow
drift, a per-star spin, and a swirl around whatever is lit — where the squares
only grew and brightened.

**Why it is still deterministic.** Positions come from a hash of each star's
index, not `Math.random()`. The sky is the same on every load, and the two
renderers — which build their buffers independently — cannot end up with
different ones.

#### The colour of a star

There are two colours in play and the rule is one sentence: **a star is the
site's own cyan until something near it is being pointed at, and then it is that
thing's colour.**

`--fx-base` is the resting cyan and it is a cyan in *both* schemes, not a
neutral. That matters more than it sounds. The field used to rest at slate grey,
so a lit star was "grey → accent" and every unlit one was colourless: whichever
card you pointed at, the field read as the same wash of colour arriving over
nothing. With a hue at rest the comparison is hue against hue, and a violet ring
around the Research Team card is instantly not the amber one around Publications.

The blend runs on the halo's own falloff, which is what makes it a gradient in
space rather than a switch: the halo peaks in the band hugging the hovered
element and falls to nothing both inside it and out in the rest of the page, so
the stars ringing the card carry its hue and the hue washes back out to cyan as
you look further away. The emitted glow follows the same rule — it used to be
the accent unconditionally, which is why *every* glow on the page, including the
hundreds nowhere near the pointer, changed colour at once.

#### The bug that made the field a light-mode-only feature

For a long time the field appeared to exist only in light mode, and the reason
turned out not to be brightness at all.

The canvas is transparent and the page shows through it, so the browser
composites the drawing buffer over the page — and it has to be told whether the
colours in that buffer already have their alpha multiplied through. This
declared `premultipliedAlpha: false` while blending with `SRC_ALPHA`, which
writes exactly the premultiplied product C·a. The browser then multiplied by
alpha a **second** time. A star at five per cent alpha contributed C·a² — a
quarter of one per cent of its colour — while still removing five per cent of
the page behind it. The field was not emitting light; it was punching very faint
holes in the background.

On a white page, holes look like grey stars, and the effect appeared to work. On
the near-black dark page, taking five per cent off nothing and adding nothing is
nothing.

The fix is to say the same thing in both places: the shader premultiplies
(`vec4(colour * alpha, alpha)`), the context declares premultiplied, and the
blend factor for colour is `ONE`. **Under Three.js the flag that picks the blend
factors is `premultipliedAlpha` on the MATERIAL, not on the renderer** — the
renderer's flag only describes the canvas. Setting the renderer's and leaving the
material's at its default `false` changes nothing at all, which is a quiet way to
spend an afternoon. The same defect was in the publications explorer and is fixed
the same way there; its 345 edges were about eight times fainter than the numbers
in its shader said, which is why they had to be re-balanced downward afterwards.

`check-ui.mjs` §5a-2 now guards both halves: it reads `BLEND_SRC_RGB` off the
live context and requires `ONE` on a premultiplied canvas, and it hides the
page's own content, screenshots the field, and requires it to measurably move the
pixels **in each scheme separately**. The second check is the one that matters —
when the bug is reintroduced, the light scheme still passes and only dark fails,
which is exactly how it hid for so long.

#### The surge

One uniform, `uSurge`, does something no other part of the layer does: it acts on
every star at once rather than on the ones near the pointer. While the
back-to-top ascent is running (§13b) it lifts the whole field, swells it, spins
it up and burns it from the resting cyan toward the accent and on toward white.
It is driven from a clock rather than eased toward a target — rise, hold, fall —
because it is an event with a shape and not a state the field settles into, and
the idle frame-skipping is suspended while it runs. `window.__fx.surge(up, hold,
down)` is the whole interface.

#### How much of it you see

At rest the field is a quiet cyan starfield rather than a texture you have to
hunt for, and the halo is still four to five times stronger — the field is
visible, and the highlight is still an event. On phones, where it shares the
screen with the text instead of sitting in the margins beside it, it is turned
down (`theme.css`, §2b).

**Cost control:** the loop drops to 30 fps whenever nothing is highlighted,
stops entirely when the tab is hidden, and never starts under
`prefers-reduced-motion`.

**Turning it down.** One number, in `theme.css`:

```css
--fx-opacity: 0.92;   /* light scheme; 0.62 in dark. 0 hides it entirely. */
```

#### Lighting the field without lighting the element

`data-fx` lights an element *and* the field. `data-fx-field` lights only the
field: no ring, no tilt, no lift, not even the `is-lit` class those rules hang
off. The Summary hero uses it, because that card was asked to stay put and this
is how it stays put while still having stars respond to it.

`data-fx-field="local"` adds the second half. The halo is shaped to the
element's rectangle, which is right for a row or a card and wrong for a card that
is most of the screen: lighting the hero lights its entire perimeter at once —
light in four places you are not looking, to tell you about the one you are. A
local element instead hands the field the **intersection** of itself and a
300-pixel window around the pointer.

The intersection is the trick. Wherever the pointer is near one of the card's
edges, the intersection still *has* that edge, so the halo hugs the card's real
border there and simply stops a couple of hundred pixels along it. The other
sides of the intersection fall inside the card, where the card's own opaque
background hides them — the field is behind the page, so there is nothing to clip
and nothing to suppress. Light appears exactly where the card meets the page near
your pointer, and nowhere else.

The touch path deliberately ignores `data-fx-field` elements: the reading marker
exists for long lists, and the hero is neither a row to keep your place in nor
something that wants its whole perimeter lit as it drifts past the middle of a
phone screen.

**The star shape** is built by `starSolid()` in `lattice.js`: ten rim points
alternating between the tip radius and the waist, each consecutive pair joined
to a front apex and a back apex. `POINTS`, `WAIST` and `RELIEF` at the top of
that file are the three numbers that describe it — how many points, how deep the
notches, and how far the faces stand off the star's plane.

### 12.3 Installing Three.js — two files, not one

**This is the part that catches everyone.** Since r165 Three.js ships as *two*
files. `three.module.js` is only the renderer half; its first line is

```js
import { Matrix3, Vector2, … } from './three.core.js';
```

so on its own it cannot load — the browser reports a missing module and the site
falls back. Both files are needed, from the **same version**:

```
https://unpkg.com/three@0.185.0/build/three.module.js
https://unpkg.com/three@0.185.0/build/three.core.js
```

Verified end to end against **r185**: `window.__fx.renderer` reports `three`,
60 fps, no console output.

or take both out of the `build/` folder of any release at
`https://github.com/mrdoob/three.js/releases`. Put them here:

```
assets/vendor/three/
├── three.module.js
├── three.core.js
└── LICENSE          ← Three.js is MIT-licensed; keep it, as
                       assets/vendor/fonts/ does for the typefaces
```

That is the whole installation — no build step, no package manager, no other
file to edit. Reload and check in the browser console:

```js
window.__fx.renderer     // 'three' | 'webgl' | 'none'
```

The library is recognised by its **exports**, not by the file being present, so a
half-finished download or a `three.module.js` with no `three.core.js` beside it
falls back cleanly instead of throwing. When it is absent you get one
informational console line and the built-in renderer.

A zip of this site never carries these files, which also means re-extracting the
site over your folder will not overwrite a copy you installed yourself. The
folder's own `README.txt` repeats these steps for whoever finds it later.

### 12.4 The two renderers

| | `field-three.js` | `field-gl.js` |
|---|---|---|
| needs | Three.js installed | nothing |
| size | ~1.8 MB of library | ~4 KB |
| geometry | `lattice.js` | `lattice.js` |
| shaders | `shaders.js` | `shaders.js` |
| camera | `camera.js` | `camera.js` |

They render **the same thing**, and not by coincidence: the lattice, the GLSL and
the camera are each written once and imported by both. The Three.js path uses
`RawShaderMaterial` — the one Three material that injects nothing, no built-in
matrices, no prepended defines — specifically so the shader compiled there is the
shader compiled in the fallback.

One trap worth knowing about if you ever change the geometry: the vertex
attribute **must** be called `position` and be a vec3. Three takes a geometry's
vertex count from that attribute, and a `BufferGeometry` without one is drawn
zero times — no exception, no warning, nothing on screen, in a page where
everything else reports healthy. It cost twenty minutes here; the comment in
`lattice.js` is there so it costs nobody else that.

What Three brings is its renderer: colour-space and pixel-ratio handling,
context-loss recovery, and a well-trodden path for anyone who later wants real
lights, post-processing, or a second object in the scene. What it costs is
1.8 MB. That trade is yours to make, which is why it is optional.

### 12.5 The page transition

**Depth push.** The page you leave scales down slightly, pushes back along Z
through a real perspective, and dims — 260 ms. The page you arrive at rises from
behind that same plane — 420 ms. A real 3D transform, not a fade dressed up as
one, and the one that stays comfortable after the fiftieth navigation.

The header only fades, because it is the one element in the same place on both
pages; moving it would break the illusion that you are travelling through a
stack of pages rather than replacing the world.

**Four alternatives are still there**, fully implemented in `fx.css`, in case
the decision is ever revisited:

| style | what it does | out |
|---|---|---|
| `depth` *(in use)* | recedes along Z and dims; the next rises from behind it | 260 ms |
| `flip` | tips away on its Y axis, like a card turning over | 380 ms |
| `cube` | hinged at the leaving edge and turned like the face of a cube | 420 ms |
| `slice` | seven vertical panels sweep across at staggered depths | 420 ms |
| `dissolve` | a quiet cross-fade with a breath of scale | 200 ms |

Switching is two lines at the top of `fx/transition.js`:

```js
const STYLE  = 'depth';   // → 'flip' | 'cube' | 'slice' | 'dissolve'
const OUT_MS = 260;       // must match that style's outgoing duration above
```

`OUT_MS` is how long the click is held before the browser is allowed to
navigate, so a mismatch shows up as either a clipped animation or a stalled
click. It is the one number that has to move with the style.

An earlier build shipped a live picker at `?fx=lab` for trying all five. It did
its job and was removed, along with the `localStorage` preference it wrote —
there is now exactly one code path and no stale state to get stuck in. (If a
browser still has `hs-transition` or `hs-fx-lab` in storage from that build,
nothing reads them; they are inert.)

**No client-side router**, deliberately. A router means owning history, scroll
restoration and focus management, and every failure mode of a single-page app, in
exchange for an animation. Navigation stays what it always was — the browser
loading a document — and the animation is bolted to the two moments either side
of it.

Left alone, because in each case this document is not going anywhere:
middle-click, Ctrl/Cmd-click, `target="_blank"`, downloads, other hosts,
`mailto:`/`tel:`, and same-page anchors. Back and forward are handled through
`pageshow`, including the bfcache case where the old document is restored
mid-animation. A navigation that never completes clears itself after a second, so
the page can never be left sitting faded out.

Opt a single link out with `data-no-transition`.

### 12.6 Changing or removing it

| Want to | Do this |
|---|---|
| tune the strength | `--fx-opacity` in `theme.css` |
| change a section colour | `--fx-hue-0…5` in `theme.css` |
| change the lattice | `COLS`, `ROWS`, `CELL` in `fx/lattice.js` |
| change how it moves | `fx/shaders.js` — both renderers follow |
| change the transition | `STYLE` **and** `OUT_MS` at the top of `fx/transition.js` |
| change the halo's width | `band = uPx * 26.0` in `fx/shaders.js` |
| change the star shape | `POINTS`, `WAIST`, `RELIEF` in `fx/lattice.js` |
| have more or fewer stars | `COUNT` in `fx/lattice.js` |
| change how they turn or lean | `spin`, `leanX`, `leanY` in `fx/shaders.js` |
| change how they pulse | the three `sin` terms of `breath` in `fx/shaders.js` |
| change the glow | the `vRole > 0.5` branch of the fragment shader |
| make an element highlightable | add `data-fx` to it |
| remove the transitions | delete the `initTransitions()` call in `main.js` |
| remove the whole layer | delete the `startFx()` call in `main.js`; `fx.css` can stay, nothing will match |

---

## 13. The section bar

The sticky row of chips under the header on Publications, Research Team,
Background, Teaching and Projects & Services. Tap one and you are at that
subsection — the Persian publications are one tap from the top of the page
instead of sixteen thousand pixels of scrolling.

Built by `assets/js/modules/sectionnav.js` **from the sections already in the
document**. There is no list to keep in sync: add a section to a JSON file and a
chip appears for it, with its icon.

**At every width.** It started out below 64rem only, on the reasoning that the
desktop sidebar already lists the sections. That turned out to be wrong in use:
Publications is a hundred entries and Research Team nearly forty, and on a
desktop you are just as likely to want to jump straight to the Persian list. The
sidebar is a table of contents you read; this is a control you use, and unlike
the sidebar it stays at the top of the window as you scroll. On wide screens it
is quieter — the row sits under the page title rather than bleeding to the
edges.

Details that matter more than they look:

- **Chips are 44 px tall** — the smallest a target should be for a thumb.
- **`touch-action: pan-x pan-y`** — a horizontal swipe scrolls the row, a
  vertical one still scrolls the page. The bar is never a place where the page
  refuses to move.
- **The active chip slides itself to the centre** by scrolling the row's own
  scroller, *not* with `scrollIntoView`. That is a real bug that was fixed here:
  `scrollIntoView` may scroll any ancestor scrollport including the document,
  which cancels a smooth scroll already in flight — so tapping a distant chip
  used to stop a few hundred pixels in.
- **`--secnav-h`** is the bar's measured height, published to CSS so anchor
  targets clear both it and the header. Measured, not guessed: the height follows
  the root font size, which changes with the viewport.

---

## 13b. Back to top

A round control that appears at the bottom right of the long pages and takes the
reader back to the top. `assets/js/modules/backtotop.js`, styled in
`components.css` §13b. It uses `fal-arrow-circle-up` — the original site's
back-to-top glyph, which had been living on the Summary cards rotated 45° into a
"go" arrow. Here it does its own job again, unrotated.

**Where it sits is the whole design.** The brief was "bottom right, without
interfering with the cards", and a fixed button in the bottom-right corner
interferes with the cards by definition: that is where the corner of a card is.
So the offset is not a number, it is a `max()`:

```css
right: max(1rem, calc(50vw - 41rem));
```

`.shell` is `min(100% - 2rem, var(--w-page))` and centred, so a wide screen has a
gutter either side. `50vw - 41rem` parks a 2.75rem button inside that gutter with
0.75rem of daylight between it and the content — **beside** the cards, never over
them, at any scroll position. Below about 84rem the gutter runs out, `max()`
falls back to `1rem`, and the button takes the corner.

**When it is there is the other half.** In the corner it cannot avoid the content
by position, so it avoids it by time: scrolling down takes it away, scrolling
back up brings it in. Turning round is the only gesture that ends in wanting this
button. That rule is confined by media query to the widths where the gutter has
run out — above them the button is out of everyone's way already and simply
stays put. The direction state is written by the module as a class and consumed
by the stylesheet, so the breakpoint lives with the other breakpoints rather than
being duplicated in JavaScript.

Movement under 6 px does not count as a change of direction. Without that the
button flickers as a smooth scroll settles, a rubber-band bounce returns, or a
late image shifts the page.

**Keyboard.** Scrolling the window does not move focus, so a keyboard user who
pressed this would be looking at the top of the page with their tab position
still at the bottom — the next Tab would throw them straight back down. So
activating it also moves focus to `#main`, the skip link's existing target. The
`tabindex` needed to make a landmark focusable is added for exactly as long as it
takes to receive focus and then removed again.

It is `visibility: hidden` rather than only `opacity: 0` while it is away, which
is what actually keeps it out of the tab order — an invisible button you can
still Tab to is worse than no button.

### What the button looks like

A cyan bayonet turning about its vertical axis inside a cyan ring, with a meteor
running clockwise around the outside of the ring.

The bayonet is real geometry (`assets/js/modules/bayonet3d.js`): a tall
four-sided pyramid for the blade, a very short one the other way up for the
guard, and a short cylinder for the stem. `ConeGeometry` with **four** radial
segments *is* a pyramid, which is the point — a cone has no edges, and edges
catching the light one at a time as they come round is the whole reason for
turning it. The ring is a torus, seen face-on, and it deliberately does not turn
with the blade: a ring spinning about the same axis reads as a wobble, and it is
meant to be the thing the bayonet is standing in.

**`flatShading: true` is what makes it a solid.** The first version looked flat,
and the reason is worth knowing: `ConeGeometry` builds four faces but gives their
shared vertices *averaged* normals, so the renderer blends the lighting smoothly
across the joins. That is right for a cone and wrong for a pyramid — the edges
are the entire character of the shape, and smooth shading is a machine for
removing them. With flat shading each triangle carries one normal of its own,
each facet takes a single value of light, and the join between two of them
becomes a hard line where two brightnesses meet. The material is also polished
rather than matte (`roughness: 0.16`, `metalness: 0.72`), because on a matte
surface every face lands within a few percent of every other and the edges
disappear again by a different route.

**The lighting is not subtle, on purpose.** The object is forty-four pixels
across, and a restrained rig at that size produces a cyan blob. Ambient is
deliberately *low* — flat facets only read as facets if the lit one and the
shaded one are far apart, and a strong ambient lifts them both toward the same
value, which is the third way to lose the edges. A key from the upper left picks
out one face at a time; a counter-key from the upper right at a third of its
strength covers the one rotation where a corner faces the viewer and both
visible faces are turned away from a single key; a fill from below-front keeps
the guard's underside a dark facet rather than a hole punched through the
object; and a rim from behind separates the silhouette from whatever the button
is sitting on.

The ring stays smooth-shaded. It is the one round thing here — the brief called
it a rounded ring — and faceting it would fight the blade for attention and make
the whole control read as one crystalline lump.

**The meteor is CSS, not geometry**, and that is a choice rather than a
shortcut: it is the same conic-gradient-inside-a-radial-mask as the header
mark's (§16), it costs nothing, and it keeps running on a browser where the
canvas never starts. The sprite arrow that used to be the whole button is still
in there underneath, and is hidden only once `data-bayonet="three"` says
something has replaced it — so there is never a moment with an empty button.

The loop runs only while the button is on screen: `pause()` and `resume()` are
called from the same place that adds and removes `is-shown`, so on a page nobody
has scrolled, nothing draws. `prefers-reduced-motion` stops both the turn and
the meteor.

### The ascent

Pressing it does not simply set `scrollY` to zero. Landing at the top with no
transit is disorienting on a page a hundred and fifty entries long: the thing
you were reading is replaced by a thing you were not, with nothing in between to
say what happened. So the page is gathered up first.

**The stack.** Every visible block is measured, and each is told how far it is
from a single point near the top of the window (`--dy`). The stylesheet then
moves each one by exactly *its own* distance, so they converge — a card near the
top barely moves, one near the bottom travels the height of the window, and they
arrive together and pile up. That convergence is the effect; translating
everything by the same amount would just be the page sliding away. The pile tips
away from the viewer on `rotateX`, lifts on `z`, and fades.

What counts as a block is `[data-fx]` — the same attribute that opts an element
into the contextual highlight. Every card, person, publication entry, timeline
row and project already carries it, so the list maintains itself: anything added
later that behaves like a block gets the attribute for the highlight and joins
the stack for free.

Only what is **on screen** is measured. A publications page has hundreds of
blocks and all but a dozen are somewhere no one is looking.

**The field goes with it.** `window.__fx.surge()` flares the whole star field for
the duration — every star lifts, swells, spins up and burns toward the accent. It
is the one thing in the layer that happens to every star at once rather than to
the ones near something, and it is what stops the ascent reading as an animation
played over a static backdrop: what is behind the cards is travelling with them.
A `uSurge` uniform carries it into the shared shader, so both renderers do it.

**Then the jump — and the trap that lived here.** `base.css` sets
`scroll-behavior: smooth` on the root, and that wins over
`window.scrollTo({ behavior: 'auto' })`, because 'auto' means "whatever the CSS
says". So the jump came out as a six-hundred-millisecond glide *after* the page
had already faded away, and the reader watched an empty document scroll past.
`behavior: 'instant'` says it directly but is a newer enum value that older
browsers throw on, so the CSS property is turned off around the call instead —
with one non-obvious extra step:

```js
root.style.scrollBehavior = 'auto';
void getComputedStyle(root).scrollBehavior;   // <- without this, nothing changes
window.scrollTo(0, 0);
```

Setting the property marks style dirty; it does not recompute it, and
`scrollTo` reads the *previous* computed value and glides anyway. Reading the
computed style back forces the flush. Holding the override across two animation
frames does not help — the behaviour is decided at the moment of the call. The
function looks completely correct without that line and does nothing.

The whole thing is 420 ms out, one frame for the jump, 340 ms back in.
`prefers-reduced-motion` skips all of it and simply arrives.

**The footer's back-to-top link is gone.** It came from the original site and
sat at the very bottom of every page — the one place a reader has already
finished scrolling to. One control that is there whenever it is wanted made a
second one at the end redundant.

**Stopping counts as turning round.** On a phone the control steps aside while
you read forward and returns when you scroll back — right while you are moving,
and wrong the moment you stop. Someone who flicks to the bottom of Publications
and lifts their thumb has been reading "forward" the whole way, so the control is
hidden, and from where they are sitting it does not exist. That was the report:
"on a phone it never appears at all". Half a second after the page comes to rest
it is back. Below 30rem it is also a little smaller — at 2.75rem it sat close
enough to the footer text to read as part of it.

**Cost:** one passive scroll listener writing at most one class per frame. The
button is created on every page rather than only the long ones, deliberately:
deciding at boot means measuring the document before its images and web fonts
have settled, and a page that grows by three hundred pixels a moment later would
have been judged too short forever. The scroll handler answers the question
correctly at every moment instead — on a page that cannot scroll a screenful the
button simply never shows.

`check-ui.mjs` §5e measures all of it: hidden at the top, present once scrolled,
its rectangle entirely outside the content column *and* within 28 px of it (a
fixed `right` passes the first test on a wide screen and fails the second by a
progressively sillier margin), nothing drawn on top of it, and both the view and
the focus arriving at the top when it is pressed. At 390 px it checks that
scrolling down hides it and scrolling up brings it back.

§5e-2 measures the ascent, and three of its four checks exist because something
went wrong: that the blocks are given **different** distances to travel (one
shared distance is a slide, not a stack); that the field surges; that the top is
reached within a frame of the stack disappearing, which is what catches the
smooth-scroll trap coming back; and that no `--dy`, `--i` or class is left behind
afterwards.

The surge check has been wrong twice and both ways are worth recording. It began
as a pixel measurement of the whole window, which does not work: the cards fade
out at the same moment the stars brighten and the two cancel almost exactly. It
became a pixel measurement of the **gutter beside the content column**, which
worked until there were six WebGL canvases on the page — a screenshot taken at
the busiest moment of the animation then comes back as a blank strip under
software rendering, and a capture failure is indistinguishable, in the numbers,
from "the field did not surge". Two different things must not produce the same
red. It now watches the peak of the field's own surge value across the flight
(`window.__fx.surging()`), with the resting pixel measurement kept as
confirmation that the field is drawing at all.

One more trap in that check, which produced a convincing wrong answer: the surge
runs on the field's own clock, and that clock advances by a **clamped** delta.
On a slow renderer its nine-hundred-millisecond flare takes several seconds of
real time, so sampling the peak the moment the stack starts moving catches it
barely off the ground. "Peak 0.12" was not a field that failed to surge; it was a
check that stopped looking too early.

---

## 14. Parity with the original

Every round of this rebuild has been checked against `legacy_index.html`, which
is kept unmodified but for one added `robots` meta tag (§10) — nothing that
carries content, so the comparison below is unaffected. The last audit compared the legacy text
chunk-by-chunk against all eight JSON files and all seven pages, with Persian
normalised for the ي/ی, ك/ک and ZWNJ variants before comparing.

| | Result |
|---|---|
| English text | present, verbatim — including the office number, phone, fax, PO box and all five bio paragraphs |
| Persian text | **27 of 27** SEO alias headings and **13 of 13** Persian keywords present; the masthead «حامد صادقی» unchanged |
| Images and logos | **11 of 11** live references present, plus the one that was commented out in the legacy file |
| External links | **9 of 10** present; the missing one is the jQuery CDN, which the rebuild does not use |
| Trackers | `UA-175901189-1` on all seven pages, checked by a script |
| Head metadata | every `<meta>` the legacy page declared, on all seven pages |
| Sequential links | `<link rel="prev">` / `<link rel="next">`, re-pointed at pages that exist |
| The drop cap | the biography's "H" still sets into exactly two lines, checked by a script |

### The full head audit

Every `<meta>` in `legacy_index.html` was compared, tag by tag, against all seven
pages:

| legacy tag | in the rebuild |
|---|---|
| `charset`, `X-UA-Compatible`, `theme-color`, `keywords` | identical on all seven |
| `og:type`, `og:site_name`, `og:image:type`, `og:image:alt` | identical on all seven |
| `og:image` | same image, new path (`assets/img/favicons/`) — the folder moved |
| `og:title`, `og:url`, `og:description`, `<title>` | **the home page matches the legacy values exactly**; the other six carry their own, which is what makes them findable separately |
| `viewport` | superset — gained `viewport-fit=cover`, for notched phones |
| the gtag loader and its inline `config` | byte-identical on all seven, checked against the legacy block |

The legacy page had **no** `<meta name="description">`; the rebuild adds one.
That is an addition, not a change.

The one thing that had genuinely not been carried over was the sequential
navigation:

```html
<link rel="prev" title="Academic services" href="/Academic services/">
<link rel="next" title="Background" href="/Background/">
```

Those targets were WordPress pagination URLs and no longer exist, which is
presumably why they were dropped. The declaration itself is part of what the
original emitted, so it is back on every page, pointing at the real neighbours
in the order the main navigation uses — Summary → Background → Honors →
Publications → Research Team → Teaching → Projects & Services. The first page
has only a `next` and the last only a `prev`. `check-trackers.mjs` now fails if
either disappears or points at a page that does not exist.

### The drop cap

The legacy page opened its biography with a large "H" set into the first two
lines — `<p class="aligned cap-letter">` in `legacy_index.html`. It is the one
piece of the original typography that is unmistakably a decision rather than a
default, and it is called out as something that must survive every redesign.

It now has a test. `tools/check-dropcap.mjs` measures the *rendered* result — the
paragraph's line boxes, and how many of them the float pushes in — at four
widths from a phone to a large display. There must be exactly two. Measuring the
outcome rather than the CSS matters: `font-size: 3.4em` and `line-height: 0.82`
only add up to two lines in combination with the paragraph's own line-height, so
a later change to body type could turn two lines into three without anyone
touching the drop-cap rule.

**The check itself had a bug, and it is a good one to know about.** It reported
three lines at 800px and above while the cap was setting into exactly two. The
extra "line" was the trailing space of a justified line: `getClientRects()`
reports it as its own rect, full line height, about five pixels wide, parked
against the RIGHT margin — which is a long way right of the paragraph's left
edge, so it counted as a line the float had pushed in.

It only appeared at 800px and up, which made it look like a responsive
typography fault rather than a measuring one. The biography is justified at
those widths and left-aligned on a phone (`check-ui` prints both), so the phone
had no trailing-space rects to miscount. The filter now also requires a rect to
be more than twenty pixels wide: a real line beside this cap is 265px at the
narrowest width measured, and the artefact is 5.22px.

The legacy face was Alike, from Google Fonts. Since the site no longer makes
external requests (§9), the cap is set in Caladea, which is vendored. If you want
the original face back, drop `Alike-Regular.woff` into `assets/vendor/fonts/`,
add an `@font-face` for it in `assets/vendor/fonts.css`, and put it first in
`--f-drop` in `base.css`; the guard will keep checking the two lines either way.

### Three notes, in the interest of not overstating it

- **The word "Welcome".** The legacy page had `<h2>Welcome</h2>` above the
  biography. The rebuild replaces that slot with the hero — the name, the role
  and the affiliation — and titles the section "Biography". No information was
  lost, but that one word is not on the page. Say so and it comes back.
- **Two gallery images could not be recovered.** `Teacher's_day.JPG` and
  `Research Group Photo main.jpg` live in the original folder, which is no longer
  reachable from here. Both were unreferenced or commented out in the legacy
  HTML, so nothing that was ever *displayed* is missing — but if you want them,
  drop them into `assets/img/gallery/` and add them to `data/research-team.json`.
- **"Newyork Post".** Searching `legacy_index.html` for `newyork`, `new york`,
  `ny post` and `nypost` returns no matches; the only occurrences of "post" are
  WordPress markup (`<div class="post post-page …" id="post-5">`). The
  requirement turned out to be about the **drop cap** — the "H" occupying two
  lines — which is preserved and now guarded, as above. The biography's own
  wording is unchanged from the original.

### A note on spacing, since it was a real bug

On the home page the section cards are followed immediately by `.layout` — the
article and the sidebar. `.cards` had a top margin and no bottom one, so at
desktop widths the first sidebar panel sat flush against the last card, their
two borders touching with nothing between them. It is fixed with a
`margin-bottom` on `.cards` matching the layout's own 2.25 rem gutter, so the
page now breathes the same amount above and below that grid.

### The seven guards

Run these after any edit. They are the reason many rounds of redesign have not
broken anything quietly:

```bash
node tools/check-trackers.mjs    # every legacy tracker, on every page
node tools/check-offline.mjs     # no unexpected external requests; every
                                 #   internal link relative, so the same files
                                 #   work at both addresses (§11)
node tools/check-farsi.mjs       # Persian typography, measured in a browser
node tools/check-dropcap.mjs     # the biography's "H", still two lines
node tools/check-contrast.mjs    # WCAG AA, both colour schemes, all seven pages
node tools/check-ui.mjs          # menu, section bar, transitions, 3D layer
node tools/check-canary.mjs      # a copy reports itself; the original stays quiet
node tools/check-authors.mjs     # a report on the collaboration graph's parsing
```

The last five need Playwright and skip themselves politely if it is absent — the
site has no build step and no dependencies, and editing a JSON file should not
require installing a browser automation library.

**Installing it, without putting it in this folder.** `loadPlaywright()` in
`tools/lib/browser.mjs` resolves `playwright` the ordinary Node way, so
`NODE_PATH` is enough and nothing has to be installed beside the site:

```bash
mkdir -p ~/pw && cd ~/pw && npm init -y && npm install playwright
npx playwright install chromium          # ~115 MB, cached outside the project
cd /path/to/the/site
NODE_PATH=~/pw/node_modules node tools/check-ui.mjs
```

Keeping it out of the folder is not fastidiousness. There is no `package.json`
here and there should not be one; the site is uploaded by copying the folder
(§11), the folder is synced by OneDrive on at least one machine, and a
`node_modules` beside `index.html` would be several hundred megabytes of
both. The browser binaries land in the platform's own cache, not the project.

**Skipping politely has a cost, and it is worth knowing.** These five had never
run on the machine this was last worked on, and two of them were failing the
whole time: the "Cited by" badge was at 4.43:1 against a 4.5 requirement, on all
86 badges, in the light theme (§6), and the drop-cap check was miscounting a
trailing space as a third line (§14). Silence from a guard means "not run" as
often as it means "fine", so run them somewhere that has a browser before you
believe a clean sweep.

Every one of them exists because something actually broke:

- **Farsi** — a site-wide `font-weight: 600` pulled Persian titles off 700, and
  a `font-feature-settings` on `body` leaked into the masthead.
- **Contrast** — an accent colour failed AA in 21 places.
- **UI** — a `z-index: 1` added for the 3D field put the page content at the
  same stacking level as the header, and the mobile menu, absolutely positioned
  inside the header, silently dropped *behind the page*. Nothing about the
  markup, the colours or the typography had changed; only what was on top. That
  is the class of bug no static check can see, which is why this one drives the
  site instead of measuring it: it opens the menu and asks the browser which
  element is genuinely topmost at those coordinates.

**A note on writing new checks in `check-ui.mjs`.** Wait *for* a condition, never
*out* a duration. Several sections used to sleep a fixed number of milliseconds
and then measure; every one of them eventually failed on a loaded machine for no
reason to do with the site, because there are now seven WebGL contexts on a page
all racing the same software renderer inside the check. `page.waitForFunction`
with a generous timeout tests the same property and has no number in it to be
raced. Where the thing being tested genuinely cannot be photographed — a bead
four pixels across mid-fall, a glow behind a page — the module is asked instead:
`window.__copyright.state()`, `window.__copyright.escape()`,
`window.__fx.focused()`, `window.__fx.surging()` and `window.__roster.rows`
exist for exactly that, and for nothing else.

`escape()` is the clearest example of why. "The hilt leaves the frame partway
through a turn" is not something a screenshot settles: a screenshot catches one
angle out of a ten-second rotation, and the angle it catches is whichever one it
happened to catch. So the module samples forty-eight rotations, projects both
ends of the sword through the real camera, and returns how close to the edge
they ever get. The bug becomes a number, and the number has a threshold.

Nine of these sleeps have now been converted, and the pattern in every case was
the same: the check passed on a quiet machine, failed on a busy one, and was
measuring something real the whole time. Two are worth knowing about.

The footer's copyright glyph: an animated `text-shadow` there was repainting
every frame, and what surfaced it was two *unrelated* hero checks starting to
fail because their CSS transitions no longer completed inside a 700 ms window.
A flaky guard is sometimes a slow page telling you something.

The other was in the site's own code rather than the check's, and it has now
happened twice. The wake's hold, and later the brand mark's arrival animation,
were both measured against an accumulated `dt` — and every loop on this site
CLAMPS that dt to 50 ms so a stalled tab resumes rather than jumps. On a machine
drawing seven frames a second the clamp makes the accumulated clock run at a
third of real time, so a 2.4-second hold became seven and a one-second entrance
took three. The rule that came out of it: **an accumulated dt is right for
anything periodic and wrong for anything with a deadline.** A wave does not care
when it is; a hold, a timeout and an entrance are promises about the reader's
seconds, so they are measured in `performance.now`.

The third kind of flaw is worth recording too, because it is the sort that hides
inside a fix. The "wait for the smooth scroll to settle" helper watched for two
consecutive equal positions — which is also exactly what you see *before* the
scroll has begun. It passed its wait instantly and then measured a section
seventeen thousand pixels down the page. It now waits for the position to have
MOVED and only then for it to stop.

---

## 15. The publications explorer

Four 3D views sit above the publication list, and none is decoration. All are
**computed from `data/publications.json` on every load** — add a paper and a
co-author appears in the graph, an edge appears between them and everyone else
on that paper, and a card appears in the right year of the timeline. There is no
second list to keep in sync, which is the only way a feature like this survives
contact with a real publication record.

The last two, **Impact** (§15.7) and **Influence** (§15.8), add the one thing
that file does not contain: how often each paper has been cited, from the same
local Scholar snapshot the list's badges use. They are the only parts of the
panel that depend on anything outside `publications.json`, and therefore the
only parts that can be absent — with no snapshot, neither tab is built and the
panel is the two-view panel it always was.

|  | asks |
|---|---|
| **Collaboration** | who the work was done with |
| **Timeline** | how much was published, and when |
| **Impact** | what came of it, by year |
| **Influence** | which of those people the cited work was done with |

```
assets/js/modules/explorer/
├── data.js      author strings → people, co-authorship edges, years,
│                the citation counts hung on afterwards (§15.7), and
│                the graph with the site owner removed (§15.8)
├── layout.js    the force-directed solver — a ball, or a flat plan
├── scene.js     the vertex arrays both renderers upload
├── shaders.js   two programs: billboarded quads, and lines
├── camera.js    orbit camera, fly-to, and the projection used for hit-testing
├── gl.js        the built-in renderer — no dependencies
├── three.js     the Three.js renderer — same scene, same shaders
└── index.js     the panel, the interaction, and the written fallback
```

### 15.1 The collaboration graph

Every co-author is a **sphere**; every paper they share is an edge. **Size is
papers written** (square-rooted, so 97 is not 97× wider than 1) — or citations
earned, at the press of the `Size` button, which is a different ranking and
§15.7 is about why — and **colour is the section they mostly publish in** — the same six hues the page's highlight
layer uses, so a node the colour of the Persian list is a person who appears in
the Persian list. The colours mean the same thing in both places, which is the
only good reason to reuse them.

- **Point at a name** and their collaborations light while everything else steps
  back. The readout underneath names them, their paper count and their number of
  co-authors.
- **Click** and the list below filters to that person's papers, with a banner
  saying whose, and a button to clear it. Sections left with nothing in them
  hide themselves, so a filter never leaves a page of empty headings.
- **Drag** to turn it. It rotates slowly on its own until you point at something.

**The spheres are impostors.** Each is still one billboarded quad; the fragment
shader reconstructs the surface normal of a hemisphere from the position within
it and lights that — so there is a curving terminator, a specular highlight
where the light actually is, and a limb that darkens into the edge. It is
indistinguishable from real sphere geometry at these sizes, and it needs no
extra triangles: 81 spheres at 32 segments would be about 130,000 of them.

**The layout is solved, not animated.** Three forces — repulsion between every
pair, springs along co-authorships, weak gravity to the origin — run for 320
iterations when the page loads, in about 40 ms, and the answer is shown. Two
reasons: a settling graph makes the first seconds unreadable, and it comes out
different every visit, so you could never say "look at the cluster on the left"
to a colleague. It is seeded from each node's index rather than from
`Math.random()`, so **the same data always produces the same picture**.

Repulsion is O(n²) — 7,021 pairs at 119 people. A Barnes-Hut tree would make it
O(n log n) and would be the right call at a few thousand nodes; at this size it
would be more code, more places to be wrong, and no faster in wall-clock terms.

### 15.2 Reading the author strings

This is the part that took the work. The author field is written for people:

```
"Yazdani, F., AliPanahi, P. & <b>Sadeghi, H.</b> (2024)"
```

Splitting on commas does not work — the comma inside "Yazdani, F." is the same
character as the one between authors. What distinguishes an author is its
*shape*: a surname, a comma, then a run of initials. So names are **matched, not
split**, with a pattern that allows multi-word surnames ("Golaghaei Darzi",
"Fazel Mojtahedi") and one to four initials. The Persian entries have the same
shape with Persian punctuation, so the same rule works with a different
character class.

Anything that does not look like a name is simply never matched, which fails in
the right direction: a missed author is a missing node, not a corrupt graph.

Two details worth knowing:

- **The bold is the site owner.** `<b>Sadeghi, H.</b>` and `<b>صادقی، ح.</b>` are
  both found without any rule naming him, and merged — an ego network with two
  egos reads as a bug.
- **Jalali years** are converted with the usual +621. It is exact for anything
  published in the first nine months of the Persian year, which is where these
  fall, and never more than a year out otherwise. The timeline is about the
  shape of two decades, not about months.

### 15.3 When one person is written two ways

The same collaborator appears as "Golaghaei Darzi, A." one year and "Darzi, A.G."
another, and in Persian on the Persian papers. `data/author-aliases.json` maps
one spelling onto another:

```json
"گلآقائیدرزی|ع": "golaghaeidarzi|a",
"darzi|ag":       "golaghaeidarzi|a"
```

Keys are the graph's internal author keys — surname, a pipe, initials, lower-cased
with spaces and full stops removed. The file currently merges 22 spellings, which
takes 103 nodes down to 81.

**Nothing here is required**: with the file missing the graph still builds, it
just shows some people twice. And nothing is merged automatically, because two
people who merely share a surname are usually two people and quietly merging them
would be a false claim about who wrote what.

To see what is left:

```bash
node tools/check-authors.mjs
```

It reports what parsed, what did not, which entries are undated, and which pairs
*might* be one person — with the exact line to paste into the alias file. It is a
report, not a guard: it never fails and never changes anything.

### 15.4 The timeline

The same papers as cards floating at their year's depth, in a corridor receding
from the camera — newest at the near end, because that is where the eye starts
and what a visitor came for. **A card's size is how often that paper has been
cited** (§15.7); with no citation data every card is one size and everything
below is unchanged. Within a band the cards are laid out in a grid that
grows outward from the centre, so **a busy year is visibly wider and taller than
a quiet one**: the shape of the corridor is the output over time.

- **Pick a year** and the camera flies to it, over about a second, and zooms in.
  "All years" flies back out to the whole span.
- **Click a card** and the list below scrolls to that entry and flashes it in its
  section's colour.
- Cards are coloured by section, exactly as the graph's nodes are.

Two things that were wrong in the first version and are worth not repeating: the
camera looked straight down the corridor, which stacks every band on the nearest
one and destroys the depth (it is now angled and slightly above); and flying to a
year reset the camera's sideways offset, so the whole scene lurched every time
you picked one (the offset is now held, and scaled with the distance).

**The timeline is a corridor of solids, not a chart of stickers.** Two things do
that, and neither adds a single triangle:

*The cards are slabs.* A card used to be a rounded rectangle filled with one
flat colour, and it looked like exactly that. It is now shaded as a solid with
thickness, by the same method the graph's nodes are shaded as spheres — the
fragment shader reconstructs the surface inside the quad. Two copies of the same
rounded-rectangle distance field, offset from each other by the apparent
thickness: the raised one is the face, the union of the two is the silhouette,
and everything inside the silhouette but outside the face is the *side* of the
card, shaded dark because it is turned away from the light. The face gets a
bevel from the gradient of its own distance field, which points outward, so the
normal tips over the edge near the border and the rim catches the key on the
upper left and loses it on the lower right. In the middle the gradient
contributes nothing and the face is flat, which is right — it is flat there.

*The years have frames.* One rectangle per year, drawn in **world** space around
that year's grid, in the average colour of the papers in it. This is the only
thing in either scene that is not billboarded, and that is the point: the cards
face the camera however the scene is turned, so they carry no orientation of
their own and perspective shrinking them is the whole depth cue. A frame lying
in the plane of its band foreshortens — a near one is a wide rectangle, a far
one a narrow slot — and a row of them receding reads as a corridor rather than a
heap of cards at different sizes. They reuse the LINE program the timeline
previously left empty: eight vertices a year, no new draw call.

Distance also hazes: the far end fades by dropping alpha, so the page shows
through and the shader never needs to know what colour the page is. Only on the
timeline — the graph is a compact ball a few units across, and the same fade
there would dim one side of it for no reason.

**The wheel zooms the explorer too**, with the same pass-through at the stops,
and a fly-to in progress is cancelled when the reader touches it — otherwise the
animation drags the distance straight back to wherever it was going.

**The guide stays up on both views.** It was hidden on the collaboration view
for a while, on the reasoning that a ball of nodes you spin and click needs less
explaining than a corridor. That was wrong in use: the collaboration view has
exactly the same four controls — drag turns it, Ctrl-drag or right-drag moves
it, the wheel zooms, a click filters — and a control documented only on the
other tab is a control nobody finds. The wording covers both ("Click to filter
or open"), so one line serves both and neither view is the one where you have to
guess.

**The explorer has the same controls.** Ctrl-drag or right-drag pans, `Reset
view` puts it back, and the hint line under the stage says so. Its pan reads the
camera axes out of the *view* matrix instead: for a column-major world-to-view
matrix the ROWS of the rotation part are the camera's axes in world space —
`(m0, m4, m8)` is right and `(m1, m5, m9)` is up — whichever way round the
conventions in `camera.js` happen to be. Its "home" is a `structuredClone` of
the camera object and not a spread, because `target` is an array and a shallow
copy would hand the original the very array the camera then mutates.

**Two GLSL traps are recorded in `explorer/shaders.js`,** both of which cost real
time. `half` is a reserved word in GLSL ES, and the compiler's message names the
line but not the reason. And these shaders are JavaScript template literals, so a
backtick inside a shader comment ends the string — the error then surfaces as a
JavaScript `SyntaxError` naming an identifier from inside the GLSL, which is a
long way from where the problem is.

The 4 theses carry no year and are absent from the timeline. `check-authors.mjs`
names them.

### 15.5 What it never does

Stand between a reader and the publications.

- It is **mounted after the list has rendered**, dynamically imported, and never
  awaited — a failure is logged and the page carries on as the list it always
  was.
- With **no WebGL** the canvas is removed entirely and the panel becomes its
  written view: the twelve most frequent co-authors as buttons that filter the
  list exactly as the nodes do. That view is always in the document — collapsed
  when the 3D is working — so keyboard and screen-reader users get the same
  actions rather than a worse page.
- The **Persian names keep the site's Persian face**, because the labels are HTML
  positioned over the canvas rather than text rendered into it. That also keeps
  them crisp at any pixel ratio and costs no texture atlas.
- Filtering **hides entries, it never re-renders them**, so the Persian block is
  never rebuilt and its line breaks cannot move (§7).

### 15.6 Changing it

| Want to | Do this |
|---|---|
| merge two spellings of one person | add a line to `data/author-aliases.json` |
| see what still needs merging | `node tools/check-authors.mjs` |
| change how tightly the graph packs | `CHARGE`, `SPRING`, `GRAVITY` in `explorer/layout.js` |
| change node sizes | `radiusFor()` in `explorer/scene.js`, and `radiusForCitations()` beside it for the other mode |
| change the year spacing | `YEAR_GAP` in `explorer/scene.js` |
| change the colours | `--fx-hue-0…5` in `theme.css` — the same tokens the page highlight uses |
| show more permanent labels | `ALWAYS_LABELLED` in `explorer/index.js` |
| change how much a citation grows a timeline card | `CITE_GROWTH` in `explorer/scene.js` (§15.7) |
| change how tall the skyline stands | `SKYLINE_HEIGHT`, and `COL_W` / `COL_PITCH` beside it (§15.7) |
| change how tall or how dense the city is | `CITY_HEIGHT` and `PLAN_RADIUS` in `explorer/scene.js` (§15.8) |
| put the site owner back into the city | drop the `withoutSelf()` call in `explorer/index.js` — read §15.8 first |
| stop drawing uncited papers as slivers | `SLIVER` in `explorer/scene.js` — set it to 0 and read §15.7 first |
| drop the Impact view and the size toggle | delete `data/scholar.json`; both are built only when there are citations (§15.7) |
| remove the whole panel | delete the `mountExplorer(data, citations)` call in `pages/publications.js` |

### 15.7 Citations — the third view, and what changed in the other two

The list has known how often each paper is cited since §18. The canvas above it
did not, and that was the gap worth closing: the timeline said how much was
published and when, the graph said who it was published with, and neither said
what came of any of it. A citation count is the only number on this site that
answers that, and it was sitting in the same file, already joined to the same
entries.

**Where the numbers come from, and how they get there.** Not from Google —
`data/scholar.json`, the local snapshot, exactly as the badges do. The
Publications page joins titles to counts **once**, in the pass that already
builds the list, and hands the explorer a `Map` of `"section:item"` ids to
counts:

```
data/scholar.json ─┐
                   ├─ pages/publications.js ─ one join ─┬─ "Cited by N" badges
data/publications ─┘                                    └─ explorer/index.js
```

One join, not two, and the key is the `data-pub-id` both sides already use. Do
it twice and the day the two disagree is the day the badges say one thing and
the canvas says another, with nothing to notice it. **The explorer itself knows
nothing about Google, about `scholar.js`, or about matching titles** — it knows
that some papers have a number and some do not.

`attachCitations()` in `explorer/data.js` hangs them on the graph as a second
pass, so `buildGraph()` stays a function of `data/publications.json` and nothing
else, and sets one flag, `graph.citations.known`. **Everything below is built
only when that flag is true.** With no snapshot the panel is the two-view panel
it was before, and there is one branch for that case rather than a code path
running through everything.

A person's citation total is the sum of the papers they are on, not a share of
them: two people on a 277-citation paper each count 277. It is the usual
convention for a co-authorship view and the only one that does not silently
decide how much of a paper each author is responsible for. It does mean the
per-person figures add to far more than the profile's total, which is why
nothing ever sums them.

#### The Impact view

A third tab. One column per year, **its height the citations that year's papers
have earned**, each paper a block of it, coloured by section exactly as it is in
the other two views. Oldest on the left — this one reads as a chart, and a chart
of time reads left to right, where the timeline runs the other way because there
the newest work is nearest the camera.

It is worth having because the ranking is not the one either other view gives.
On this record **2016 published two papers and stands taller than 2025's
sixteen**, and 2024 tops the row on both counts. A list cannot show that and
neither can a corridor of equal cards.

- **Height is linear in citations.** Not square-rooted, not log. The disparity
  *is* the subject, and a curve that flattered the quiet years would be drawing
  a different claim than the one the numbers make.
- **Papers stack most-cited first from the ground up**, so a tower's mass is low
  and the block a reader most likely wants is nearest the baseline.
- **An uncited paper still gets a sliver** — a thin tile in a base course along
  the bottom. It is a deliberate inaccuracy, worth about eight per cent of the
  tallest column and about five per cent of most, and it is recorded in
  `SLIVER` in `explorer/scene.js` rather than left to be discovered. Without it,
  two thirds of the papers here are invisible in the one view that is otherwise
  the best place to click one, and a reader in their first year would find their
  own work missing from the building. The readout on hover is exact.
- **The year labels hang below the baseline**, not above the columns, because a
  column's height is the variable — a label on top wanders up and down the frame
  and lands on its neighbour's shoulder at every second year. Under the
  baseline they line up and read as an axis.
- Seventeen labels do not fit in a row five hundred pixels wide, so when two
  collide **the taller column keeps its label**. A row labelled 2016, 2020, 2024
  says something; the same row labelled 2009, 2010, 2012 — which is what source
  order gives — says only which years came first.
- **The columns are still billboarded quads**, stacked, with a footprint lying
  flat under each in world space. The renderers already draw exactly that,
  shaded as slabs with thickness; a real box would need a second program, a
  normal attribute and a depth sort. The footprints foreshorten as you orbit,
  which is what stops a row of camera-facing slabs from reading as flat stickers
  — the same trick the timeline's year frames play.

**It is the one view that is fitted to the stage rather than framed by hand.**
The other two can be: the graph is a compact ball, and the timeline recedes
along the axis the frame does not constrain. The skyline is a row eighteen units
wide and five tall, on a stage that runs from about 4:1 on a desktop to 1.1:1 on
a phone, and no single distance fits both — the one that fills a desktop stage
cuts a phone's row off at 2015. `fitImpact()` in `explorer/index.js` solves it
from the frustum, at mount, on resize and on every switch to the view, and moves
`Reset view`'s destination with it. Once the reader has zoomed or panned, the
framing is theirs and a resize does not take it back.

#### What changed in the other two

**Timeline: a card's size is how often that paper has been cited.** An uncited
paper is the base size and the most-cited is 1.8× it, on a curve a little
flatter than a square root — `CITE_GROWTH` and `cardScale` in `scene.js`. The
exponent is 0.45 for the shape of this particular record: one paper at 277,
three above 100, sixty-odd at zero, so under a plain square root everything
below about thirty citations lands within a few per cent of the floor and the
middle of the range disappears.

The corridor was already the shape of the output over time; it is now also the
shape of what that output was for.

*This cost a re-framing.* The grid pitch has to clear the **biggest** card, not
the average one, so a busy band is about a third wider and taller than it was
and the old camera cut the near end off — the same bug §15.4 records from the
first version, arriving again for a different reason. `SPAN_DISTANCE` went from
19.5 to 21.5 and `YEAR_DISTANCE` from 8.4 to 11. Not the full third: the span is
dominated by the corridor's length in Z, which did not change, and scaling
honestly (about 27) stands so far back that the whole thing becomes a model of a
corridor on a large empty table.

**Collaboration: a button that swaps what node size means.** `Size: papers` /
`Size: citations`, in the controls strip, graph view only — hidden on the other
two rather than disabled, because a permanently dead control is furniture.

The two rankings are genuinely different here, and watching the ball
re-proportion between them is the only way to see that at a glance:

| | papers | citations |
|---|---|---|
| Alipanahi, P. | **31** | 264 |
| Ng, C.W.W. | 11 | **641** |
| Jafarzadeh, F. | 15 | 575 |

**The two modes are drawn at the same scale on purpose.** The citation radii are
stretched to land on exactly the ceiling the paper radii reach — `peakRadius`,
read from the data rather than written down. The first version used a fixed
coefficient and put the biggest node in the citation view at about a third of
the size of the biggest node in the paper view, so pressing the toggle read as
"everything shrank", which is a fact about the coefficient and not about the
record. With the ceiling pinned, what a reader sees is the re-ordering, which is
the whole content of the feature.

The floor is deliberate too: a co-author whose papers have not been cited yet is
drawn small but drawn. A node of zero radius is a person deleted from the
record, and recent students are most of that group.

**The readouts carry the numbers**, and where they carry them is a decision. On
the skyline the count leads — the height of the block under the cursor *is* that
number, so it is the answer to the question being asked. On the timeline it
trails, because there the paper is what is being pointed at. And "not yet cited"
is said on the skyline only: there it explains a block four pixels tall, where on
the timeline it would be appended to sixty-six of a hundred and forty-eight
entries, which is not information. The graph leaves a zero unsaid for the same
reason.

#### Without WebGL

The written view carries the same figures: the co-author list's counts gain a
tooltip with the citation total beside the paper count, and the note underneath
gains the sentence the Impact view draws — *"2,054 citations across 86 of
them."* Someone without a canvas should be told what the skyline would have
said, not merely that there is a skyline they cannot see.

### 15.8 Influence — the collaboration graph and the citations in one picture

A fourth view, and the only one that answers a question you cannot get at by
looking at the other three in turn.

The Collaboration graph says **who** the work was done with. The Impact skyline
says **what came of it, and when**. Neither says *which of those people the
cited work was done with* — that fact lives in the join between them, and a
reader flicking between two tabs cannot hold it.

So this one puts the two on the same axes. **The plan is the collaboration
graph; the elevation is the citations.**

| | |
|---|---|
| where a tower stands | the force-directed layout — the same solver the graph uses |
| the lines on the ground | every co-authorship, drawn between the towers' feet |
| a tower's **height** | the citations that person's papers have earned |
| a tower's **footprint** | the papers they have written |
| its **colour** | the section they publish in most |

Four variables and no legend, because every one already means the same thing
somewhere else on the page. Anyone who has looked at either of the other views
already knows how to read three of them.

Hovering lights that person and everyone they have written with, exactly as on
the graph; clicking filters the list below, exactly as on the graph. The hit
test, the highlight, the name labels and the click are literally the same code —
`aboutPeople()` in `explorer/index.js` decides whether a scene is about people
or about papers, and four behaviours follow from that one question.

#### Hamed Sadeghi is not in it

He is on every paper, and that makes him useless as a datum and ruinous as a
scale. His citation total is by construction very nearly the profile's whole
total: **2,021, where the next person has 641.** Stand that on the city and one
tower is three times the height of the second and eleven times the tenth, so
every other tower is squashed into the bottom eighth of the frame and the view
says nothing except that the site belongs to him — which the reader knew before
they arrived.

Without him the heights spread properly — 641, 575, 438, 307, 306, 277, 264 —
and the picture becomes the one worth drawing: **which of his collaborators the
cited work was done with.**

The edges go the same way, and that is the better half of the bargain. 132 of
the 345 co-authorships are simply "with him": true, and uninformative. Removing
them leaves the **213 collaborations between his co-authors**, which is the
structure of the groups he works through rather than the star that structure
hangs from. Two people lose their only edge and stand alone, which is also true
of them.

The Collaboration view keeps him, and should. There the star *is* the subject.

`withoutSelf()` in `explorer/data.js` does it, off the `self` flag that the bold
in the author field already sets (§15.2) — so no rule anywhere names him.

#### What it cost to make it read

Most of the work in this view was composition, and every number below was set
by looking at it rather than by reasoning about it.

**It is built on the first click, not on load.** It needs the graph solved a
second time — as a plan rather than a ball, `solveLayout(…, { flat: true })` —
and that is another ~80 ms of O(n²). Paying it on load would double the
explorer's cost for every reader including the majority who never open this tab.
Paid inside the tab switch, which was going to rebuild a scene anyway, nobody
sees it. `LAZY` in `explorer/index.js`.

**The plan is solved flat, not flattened.** Projecting the 3D ball onto the
ground drops people on top of one another, and two towers in the same place is
not a city. Solving in two dimensions from the start lets the repulsion do the
separating it was always there to do.

**The plan is normalised on the 95th percentile, not the furthest node.**
Without the site owner, two people have no co-authorship at all and nothing
pulls them back from the rim; they settle about 1.3× further out than the 90th
percentile. Scaling on them would shrink the 112 people who *are* clustered in
order to frame four who are not. The few beyond the mark are reeled back to just
outside it — still outside everyone else, still visible, still clickable.

**Every tower is portrait.** The first version ran up to 0.78 wide against a
floor of 0.17 tall, which made most of the 118 people wider than they were tall,
and a field of landscape slabs does not read as buildings however it is lit — it
read as confetti. The widest is now 0.3 and the shortest 0.25 tall.

**The towers are short against the plan.** The stage is a letterbox, about
3.4:1, and a tilted disc projects to very nearly that — so the plan fits the
frame almost by itself and every unit of tower is a unit the camera must stand
back for. At 4.4 the city was framed to 45% of the stage width and read as a
model on a table; at 2.4 it fills about 70% and the skyline is just as legible,
because the heights *below* the top are what carry it.

**An uncited co-author still gets a tower**, 0.25 tall. The same argument as the
skyline's slivers and it matters more here: a third of these people are students
whose first paper came out last year, and a tower of zero height is a person
deleted from their own research group.

**The camera is fitted, not framed.** `fitOne()` solves the distance from the
frustum: a disc of radius R tilted by θ stands up the frame over
[−R·sinθ, +R·sinθ], and the towers rise from wherever their base lands. Both
halves of that were wrong once, in opposite directions — the first version
allowed a flat 0.55 of the plan's width for the rise and over-estimated it by
more than double; the second computed the rise correctly and then centred the
camera on the middle of the box, which put the target a clear unit and a half
above the city so it sat along the bottom edge with sky above it. **The centre
is half the tower height, not half the box.**

**A tower says where its own name goes.** On the graph a node's label belongs
over its middle; on the city the middle is the front of the building, and since
it is the tallest towers that get named, a label there covered exactly the
height it was there to label. Nodes may now carry a `labelPosition`, and the
city's sits over the roof.

**The idle turn is the ball's alone.** The city was given it too at first and it
was wrong twice over: a plan drifting under a fixed light keeps changing which
towers stand in front of which, so the picture never settles long enough to be
read, and the street you were about to point at walks out from under the cursor.

**The tab row had to learn to wrap.** Four tabs are 451px, and the panel header
on a phone is 358px. With `flex: none; nowrap` the row simply overflowed and the
panel clipped it, leaving the Influence tab 122px past the right-hand edge: not
small, not scrollable, not reachable by any gesture. It wraps now — two rows of
two on a phone, one row everywhere else. Wrapping rather than scrolling, because
a scrolling strip hides the fact that there is anything further along, and a
hidden tab was the entire bug.

#### Without citations, and without WebGL

Like the Impact view, **it is not built at all** when nothing joined: no tab, no
solve, no city, and the panel is the two-view panel it was before §15.7. One
flag, `graph.citations.known`, decides.

With no WebGL the written view carries what it can — the co-author list with
paper and citation counts — and says so. A city is not something a list can be,
and pretending otherwise would be worse than the list.

---

## 15b. The 3D roster — Research Team

Fifty-five people, each a real slab with real thickness carrying their own
photograph on its face and their completion year printed along the bottom,
arranged in five blocks — one per category — receding from the camera in the
order they joined. `assets/js/modules/roster/`, mounted above `.layout` so it
gets the full width of the shell, exactly like the publications explorer and for
exactly the same reason: fifty-five cards in a 640-pixel column is a smudge.

### What the arrangement means

**The order is the data.** There is no "joined" field in `research-team.json`
and there never has been. What there is, maintained by hand for years, is the
ORDER: every list on the page is newest-first, because that is how a student
gets added — at the top. So a person's position in their section records when
they arrived, and it is more reliable than a date field nobody would remember to
fill in. The blocks keep that order exactly: the newest three are the nearest
three, and the oldest is furthest away.

**The year on the card is something else** — the completion or contract-end
date. That is the thing worth printing and the thing worth filtering by, and it
is emphatically not the arrival order. Several entries read "August 2021" rather
than a bare year, so the number is pulled out by pattern rather than by parsing
a date.

**The groups are not drawn the same size.** The first version drew all
fifty-five cards identically and the picture emphasised the wrong people: with
thirty-two MPhil students and nine final-year undergraduates against three
postdoctoral fellows, sheer mass put the eye on the junior end of the group
every time the page loaded. Nothing was wrong with the arrangement — there was
no hierarchy in it, and where there is no hierarchy the biggest pile wins.

So seniority is drawn. A fellow's card is about half again the size of a
final-year undergraduate's (`LANE_SCALE`), and each group in turn starts a
little further back (`LANE_SET_BACK`), so perspective adds to what the scale
already says. Together they make the reading order — fellows, PhDs, research
assistants, MPhils, BScs — the order the eye actually takes, without a caption
having to say so. The blocks are then different widths, so they are laid out
cumulatively and the row is centred afterwards; spacing them on a fixed pitch
left the small groups adrift and the large ones touching. The camera fit pads
each card by *its own* half-size for the same reason — padding everything by the
biggest wastes space around the small ones, padding by the average clips the big
ones off the edge.

**The rows are raked.** Each row sits higher than the one in front of it, like
seats in a lecture theatre. The first version let them descend slightly, so a
group was a flat run of cards going away from the camera — and with eleven rows
of MPhil students the ones at the back were both small and hidden behind the
ones in front. The older the person, the harder they were to see or to click,
which is exactly backwards for a page whose job is to list everyone who has been
through the group, and it gets worse with every new row.

The rake is chosen against the camera's own angle: the pitch looks down at about
29°, the rake climbs at about 27°, so every row clears the one in front however
many of them there are. Anything steeper than the pitch stacks them back on top
of each other, which is the failure this replaces — so 27° against 29° is the
whole of the headroom, and the two degrees left over are the margin. The rake is
`ROW_RISE / Z_STEP` as an angle, so those two constants change together or not at
all. `check-ui.mjs` §5h asserts that every group's row heights strictly increase
— one comparison, and it is the whole of the fix.

**The blocks widen as they grow; they do not get deeper.** The width used to be
three cards for every group. Three is right for a group of three and wrong for a
group of thirty-two: eleven rows deep is a corridor, and beside it a category
with one row leaves a hole most of the picture long. The gap between the groups
was never spacing — it was the difference in their depths.

And the difference gets worse, not better, because these categories do not grow
at the same rate. The MPhil list grows fastest by some way, the PhD and BSc lists
at an ordinary rate, and the postdoctoral and visiting lists barely at all. A
layout with a fixed width per group encodes today's proportions and is wrong
again next year.

So the width is derived from the count instead — roughly its square root, which
is the width that keeps a block square-ish however large it gets — clamped to
between three and six, and never more columns than there are people:

```js
function columnsFor(count) {
  return Math.max(1, Math.min(count, MAX_COLS,
    Math.max(MIN_COLS, Math.round(Math.sqrt(count * 1.1)))));
}
```

Today that gives depths of 1 / 1 / 3 / 1 / 6 / 3 rows where it used to give
1 / 1 / 3 / 1 / **11** / 3. When the MPhil list reaches fifty it will widen by
itself and nothing needs editing. `check-ui.mjs` §5h fails if any group ever gets
past eight rows deep, which is the signal that the widening has stopped working.

Reading order is preserved throughout — across the front row, then the next row
back.

### The photographs

One texture. Fifty-five separate images would be fifty-five GPU objects and
fifty-five state changes a frame; packed into a single atlas it is one upload,
one bind, and every card is a different rectangle of UVs into the same picture.
`atlas.js` builds it: the photograph cropped to fill and biased toward the top of
the frame — the same `center 18%` the CSS uses, because a head sits above the
middle of a portrait — and under it a caption band in the category's colour
carrying the year.

**The year is baked into the texture, not drawn as an HTML label.** A DOM label
has to be projected and repositioned every frame, does not turn with the card,
and fifty-five of them is fifty-five absolutely-positioned elements being written
sixty times a second. Baked in, it is part of the object: it turns with the card,
recedes with the card, and costs nothing.

**Every cell is inset by half a texel.** Without that a card's edge samples its
neighbour — at a shallow angle the linear filter reaches across the boundary and
you get a thin stripe of somebody else's photograph down the side of the card. It
is the classic atlas artefact and it is invisible until it is not.

The last cell is left blank and is what the other five faces of every box point
at, which is how a card gets its edge colour without a second material or a
second draw.

### Framing

`frameVisible()` does not use a bounding sphere. A sphere is right for a compact
cluster and wrong here: these blocks recede, so the set is long and thin and the
sphere containing it is enormous compared with what needs to be on screen. The
first version used one and put the near cards — the big, recent, interesting
ones — off the bottom-left corner while framing a lot of empty space.

So it solves the actual question. Every visible card goes into camera space at
the current yaw and pitch, and for each one: how far back must the camera be for
this card to fall inside the frustum?

```
|x| <= tan(fovH/2) * (z + d)   ->   d >= |x| / tanH - z
```

The answer is the largest of those — exact, no iteration, and correct at any
orientation, so turning the scene and then filtering re-frames sensibly instead
of snapping back to a canned viewpoint.

Then it centres, and that pass matters as much as the fit: **the projected centre
of a set is not the projection of its centre.** Under perspective the near cards
spread much further from the axis than the far ones, so a composition framed on
the centroid carries all its weight below the middle with a band of empty sky
above. It projects, measures the middle of what is actually on screen, slides the
target to put that in the centre, and re-solves the distance.

### Interaction

Drag turns it, the wheel zooms, two fingers pinch, and the arrow keys and `+`/`-`
do the same from the keyboard. Clicking a card scrolls to that person's entry in
the list below and rings it.

**Ctrl-drag or right-drag moves the scene.** Either gesture pans: the right
button for a mouse, Ctrl (or Cmd) for a trackpad with no comfortable right-drag.
Right-dragging means the stage's context menu has to go — there is nothing on a
canvas for it to offer, and it is suppressed only over the stage, never over the
page.

The axes it slides along come out of the camera's own world matrix rather than
being rebuilt from yaw and pitch: columns 0 and 1 of `matrixWorld` **are** the
camera's right and up in world space, whatever convention put them there.
Deriving them again from the angles is a second place for a sign to be wrong,
and a pan with a sign error is maddening rather than obviously broken. Pixels
become world units through the height of the frustum at the target's distance,
so a card stays under the pointer as you drag it — anything else feels like
nudging a camera rather than moving the thing. Panning is applied
*incrementally*, from the last event, because the axes turn with the camera;
orbiting is absolute, from where the drag began, because that cannot drift.

**There is a reset, and there has to be.** A pan makes it possible to push the
scene off the edge entirely, and a 3D panel with no way back is a trap. `Reset
view` (or `0`, or `Home`) restores the viewpoint the reader first saw and frames
whatever is currently visible. Both panels have one, and both have a line under
the stage saying how to turn, move and zoom — under the stage rather than over
it, because a 3D panel with its instructions floating on the picture is
permanently half-covered by its own manual, and these are things you read once.

**The wheel is only swallowed while it is doing something.** A panel this tall
with an unconditional `preventDefault` traps the reader: you scroll down the
page, the cursor crosses the panel, and the page stops moving. Once the zoom is
against its stop, further wheel in that direction is left to the page and
scrolling continues — so someone reading rather than exploring simply carries on
down the page.

### Two bugs worth keeping

**The highlight does not move the card.** It grows it about its own centre and
lights it, and the first version also brought it toward the camera. That is a
trap: moving a card toward the camera scales its projection about the *camera's*
axis, not the card's own centre, so a card away from the middle of the frame
slides outward on screen as it rises — out from under the very pointer hovering
it. The next pointer event hits whatever was behind it and a click lands on the
wrong person. Scaling about the centre can only add coverage, never remove it.

**The jump uses its own class.** `is-lit` belongs to `fx/highlight.js`, which
owns it and moves it to whatever the pointer or the scroll position is nearest —
and the scroll this very click starts moves the reading marker onto some other
row. Two owners for one class meant two lit rows and no way to tell which was
the answer. `.is-jumped` has one owner and says one thing.

Both were found by `check-ui.mjs` §5h, which clicks the card it just hovered and
compares the two names. Two people in this roster share a name — the same person
appears once as an MPhil student and once as a PhD student — which is also why
the card-to-row lookup matches on section plus position within it rather than on
the name or on a position in the whole page.

### Rendering, and what happens without WebGL

Frames are drawn **on demand**: `invalidate()` asks for one, the frame draws and
schedules another only while something is still moving. A page left open on this
section with nobody touching it costs nothing, which is the whole reason not to
run a permanent loop for a panel like this.

There is only the Three.js path. The rest of the site's 3D has two renderers
because the field and the publications explorer are the only way to see what they
show; this is not — it is a second view of a list directly underneath it on the
same page. Without Three or WebGL the panel is simply not built and the roster
below is untouched, which is a real fallback that needed no second
implementation. `window.__roster` reports what happened.

---

## 16. The university mark in the header

The Sharif University logo sits in the top-right of the header, on every page,
doing two things at once.

**The ring.** A cyan arc sweeps clockwise around its rim — brightest at the
head, trailing away behind it, like a meteor on a circular orbit. It is a conic
gradient masked down to a two-pixel ring and rotated by a CSS animation: no
JavaScript, no canvas, and it keeps running whatever else fails.

**The mark.** The navy artwork is extruded and turns slowly about its vertical
axis. Not a picture being spun — real geometry with real thickness, so the
edges catch the light as they come round.

**The white background has no thickness.** That is the detail that makes it
read as a mark standing off a plate rather than a coin with the design sunk into
it. The plate is a flat, unlit disc; only the navy is extruded.

**The reverse carries the design too**, mirrored, on a plate a shade cooler than
the front — because that is what the back of a coin looks like, and because two
identical pure-white faces made the far half of the turn read as a blank the
artwork had fallen off.

That took two goes to get right, and the reason is worth writing down. The back
plate has to sit *inside* the extrusion, a hair in front of its rear face — not
behind it. "Behind the mark" is the wrong instinct, because this plate is only
ever seen from the other side: once the coin has turned past ninety degrees the
z axis is reversed, and a plate behind the rear cap in the model is in front of
it on screen, hiding exactly what it was meant to back.

It **no longer appears in the home page sidebar**, because it is now on all
seven pages instead of one.

### 16.1 Vectorising a PNG

The site had a 260 × 260 raster logo, and extruding needs outlines. So there is
a build step:

```bash
python3 tools/trace-logo.py     # logo.png → logo.json
```

It separates the image into the three things it actually contains, and treats
each differently:

| region | what it becomes |
|---|---|
| transparent, outside the disc | nothing |
| white, behind the mark | a flat plate — **no thickness** |
| navy `#2E3192`, the mark | extruded |

The navy mask is upsampled 4×, **blurred, then thresholded** — upsampling a
bitmap only makes its staircase bigger, while blurring first turns the staircase
into a gradient and thresholding the gradient puts the edge where the eye reads
it. That is what keeps the gear teeth and the Persian letterforms from coming
out visibly stepped once they have depth. Each contour is then simplified with
Douglas–Peucker.

The result is **32 contours, 6 holes, 1,729 points, 29 KB** — coordinates
normalised to −0.5…0.5 with Y up, which is what the 3D code wants. It is
committed, so nothing at run time needs Python, OpenCV or that script. Re-run it
only if the logo image itself changes.

### 16.2 What draws it

`assets/js/modules/logo3d/index.js`. With Three.js installed it builds a
`Shape` per contour (holes included — the letterforms are full of counters),
extrudes all 32 in **one** `ExtrudeGeometry`, and lights them with a key, a
hemisphere fill, and a cyan rim from the left, so the turning edges pick up the
same accent as the ring orbiting outside them. There is a second disc behind the artwork
on the reverse — cooler than the front one — so the logo is neither hollow nor
blank when it turns past ninety degrees.

**The outermost ring is opened up before it is extruded.** The artwork's outer
ring is genuinely hairline — the tracer measures it at about 0.022 units, half
the width of the ring inside it. That is accurate, and at the size a real crest
is printed it is fine; at forty-four pixels it is one pixel, and one navy pixel
on white disappears. The ring was only visible while the coin had turned far
enough for the light to catch the side of its extrusion: two rings while it
moved, one ring when it stopped.

So `thickenOuterRing()` in `logo3d/index.js` pushes that contour's outline out
and pulls its hole in, along the radius from the mark's centre — the ring is very
nearly circular, so a radial offset thickens it evenly all the way round without
needing a real polygon offset. It finds the ring by measurement (largest mean
radius) rather than by index, so it survives a re-trace that reorders the
contours. The outer edge grows more than the inner shrinks because there is more
room outside: the disc runs to 0.4962 and the ring's outer edge only to 0.4813,
while the ring inside it comes up to 0.4420.

**This is done in the renderer and not in `logo.json` on purpose.**
`tools/trace-logo.py`'s job is to report what the artwork says. Re-running it
must not have to remember a legibility decision made downstream of it, so the
decision lives where it is made and the trace stays faithful.

**Without Three.js the flat mark turns about the same axis with a CSS
transform.** This is the one place on the site where the two paths draw
genuinely different things, and the reason is honest: extruding a polygon needs
a triangulator, Three brings one, and hand-writing one for the fallback would be
a couple of hundred lines to slightly improve a 44-pixel logo. Both paths turn
the mark about its vertical axis, which is what the effect is.

Without JavaScript at all, it is the ordinary `<img>` that was in the markup
from the start — linked to the university, with its alt text. Under
`prefers-reduced-motion` everything holds still and stays legible.

### 16.3 The bar does not move

The mark is sized **off** the bar: `--mark: 2.5rem` inside a `--bar-h: 4rem`
header, and 2.125rem below 30rem of viewport width. Nothing in §16 may change
the header's height, and `tools/check-ui.mjs` measures it — it fails if the bar
grows past 66 px, if the mark does not fit inside it, if the ring stops
orbiting, or if the mark loses its link or its alt text.

### 16.4 Changing it

| Want to | Do this |
|---|---|
| resize the mark | `--mark` in `fx.css` §6 — not the bar |
| change the meteor's speed | the `3.4s` on `.brandmark__ring` |
| change the meteor's colour | `--c-brand` in `theme.css` |
| change how fast it turns | `TURN_SECONDS` in `logo3d/index.js` |
| make it thicker or thinner | `DEPTH` in the same file |
| adjust the outer ring's width | `RING_GROW_OUT` / `RING_GROW_IN` in the same file |
| change the colour of the reverse | `BACK_PLATE` in the same file |
| re-trace after a new logo | `python3 tools/trace-logo.py` |
| take it out of the header | delete the `startBrandMark(site)` call in `main.js`; the `<img>` stays |

---

## 15c. The name in the left gutter

Every page but Summary carries the name down the left of the screen as twelve
extruded serif letters, cyan and lit, each on its own vertical axis.
`assets/js/modules/namecolumn/index.js`.

**A cycle of three things.** A meteor spirals up around the column from below
the bottom letter to above the top one, over about a second and a half, while
the letters stand still — it has a bright head carrying its own light, a tail
behind it, and rays standing off it at random lengths. Then the top letter
starts to turn; ten degrees later the next one starts; ten degrees after that
the third — so the turn travels down the column as a wave. Each letter makes
exactly one revolution and stops facing forward again. Then several seconds of
nothing, and the meteor comes back.

The brief describes that sequence once and does not say what follows it. Playing
it once leaves a dead object on the screen for the rest of the visit; looping it
with no gap puts a permanently spinning column in the corner of every page,
which is the kind of thing a reader ends up covering with their hand. **The rest
is what makes it an occasional event instead of either** — and the loop drops to
24 fps through it, because the only thing moving then is the travelling light.

**Ten degrees, and why the turn is not eased.** Each letter turns at a constant
rate, which is the one place on this site where an eased animation would have
been wrong. "The next letter starts when this one has turned ten degrees" is a
statement about the *gap* between neighbours, and under easing that gap is ten
degrees for a single instant and then something else — measured mid-cascade the
first version had opened to fifteen. At a constant rate it is ten for as long as
both letters are turning, which is what was asked for and what you can see
travelling down the column. Nothing is lost: a letter is face-on at both ends of
a full revolution, so the only discontinuity is in angular velocity, and at a
revolution every couple of seconds the eye does not find it. `check-ui.mjs` §5i
asserts the gap is 10° ± 0.5.

**Lit like the brand mark, painted darker than it.** The letters carry the same
rig as the bismillah in the header — hemisphere, key from the upper left, cyan
rim from behind, and a **traveller**: a point light on a slow circuit up and
down the front of the column, whose specular slides along the letters and is
what says "solid" rather than "sticker". It is the one thing that never stops,
including through the rest, and it is why the paint itself can be a deep cyan
rather than the brand cyan: twelve large letters in the margin at full strength
competed with the text they are keeping company. What is bright is the light,
not the paint. They also keep a **fixed lean** of a fifth of a radian when they
are not turning — the same lesson the brand mark taught, that a solid seen
exactly face-on has no visible walls at all.

**The top of the "H" lines up with the page's kicker** — "Research output",
"Recognition", "Career" — so the column and the page start together. The
arithmetic is the camera's, run backwards: under a perspective camera at
distance *d*, a point at height *y* lands `(0.5 − y / 2·halfH)` of the way down
the canvas, so the cap of the H is that many pixels below the canvas's top edge
and the box has to begin that many pixels above where the cap is wanted. The
kicker's position is read in *document* coordinates rather than viewport ones,
so reloading part-way down the page still lands in the same place. The column is
`position: fixed`, so this is an alignment at the top of the page and not a
permanent tie: scroll, and the kicker leaves while the column stays.

**The letters are not text.** `tools/trace-letters.py` walks the font the site
already ships — `caladea-700.woff` — takes the nine distinct characters the name
uses, flattens their curves and writes `assets/data/name-letters.json`, twenty
kilobytes. Three.js will build text at run time from a "typeface JSON", and that
is a whole font converted to a bespoke format: several hundred kilobytes, on
every page, to draw nine glyphs. The brief asked for "Times New Roman or
something similar"; Caladea is a transitional serif of the same family of
shapes, it is the face the name is already set in everywhere else here, and it
is already in the visitor's cache.

Two details in that tracer are worth knowing if it is ever re-run. Holes are
found by **containment**, not by winding — TrueType says outer contours wind one
way and holes the other, and fonts do not always agree with TrueType, whereas a
point tested against every other contour cannot be wrong. And the quadratic
runs are expanded with their **implied on-curve points**, the midpoints between
consecutive control points that the format does not store; ignore them and the
outlines come out visibly cornered where they should be smooth.

**The tail is analytic, not a history.** The obvious build keeps the head's last
few dozen positions and draws them, and it has two faults that only appear once
it runs: the beads are spaced by frame rate rather than by distance, so the tail
is a smear on a fast machine and a dotted line on a slow one, and the first
frames of every climb have no history to draw. The path is a formula, so the
tail is simply that formula evaluated behind the head. It fades toward the
*page's own background colour* rather than toward black — additive blending is
right on a dark page and wrong on a light one, where there is nothing left to
add to white and the streak came out as a dark scratch across the letters.

**Where it is, and where it is not.** The content shell is 75rem wide and
centred, so a gutter only exists on a wide screen: below 88rem the column is not
rendered at all, and `main.js` checks the same media query before it imports
anything so a narrow window never pays for a WebGL context it will not show. It
is not on the Summary page either — that page already says the name in large
type beside a portrait, and a second copy beside it would be the site saying its
own name twice at once. It is `pointer-events: none` and `aria-hidden`: the name
is in the header, in text, and this is the same name said again in light.

---

## 16a. The footer bar

Three things in a column: a row holding the two credit lines, and the terms
notice under it.

**The two credit lines are level with each other**, and that needs the row. The
obvious build is three paragraphs in one flex container, and it puts the notice
under the copyright line and leaves the "designed by" line floating at the
vertical middle of a two-line block — level with neither. Wrapping the two credit
lines in a `.footer__row` of their own keeps them on one line together and lets
the notice run the full width beneath them. `align-items: center` inside that row
is doing real work too: the copyright line carries a 2.7rem 3D mark and the other
carries a small heart, so left alone they would sit at different heights.

**The notice is the smallest type on the site** — 11px, and no `max-width`. That
is against normal typographic instinct, because a measure that long is not
comfortable reading; it is not meant to be read at length, it is meant to be
there, and a cap folds it onto a second line on a desktop, which was the one
thing ruled out. The bar was already the thickest thing on the page, so the
vertical padding came down when the notice went in and the bar is the height it
was rather than a line taller.

Its right-hand padding is not decoration. Back-to-top is `position: fixed`, and
below about 84rem of viewport it takes the bottom-right corner outright, over
whatever is under it; above that width it sits in the page gutter and the notice
gets the full measure back. That is the same `max()` as in §13b, from the other
side.

The wording lives in `data/site.json` under `footer.notice`, like every other
piece of text on the site. Remove the key and the line disappears.

**The glyph.** Bold, cyan, lit and beating — the one lit thing in a line of small
grey type, which is the whole point of it. Two things about it are load-bearing:

- It is `--c-brand-ink`, **not** `--c-brand`. The brand cyan is 1.9:1 against the
  page: fine behind a glow or on a canvas, and illegal as a letter — it fails
  WCAG AA by a factor of two. `--c-brand-ink` is the same hue pushed to 4.6:1,
  which is as dark as it can go and still read as cyan rather than teal, and the
  glow puts the bright cyan back around it as *light* rather than as ink. Which
  is where a glow belongs anyway.
- **The pulse is a blob behind the glyph, not the glyph itself**, and that is a
  performance decision rather than a visual one. The first version animated
  `text-shadow`. It looked right, and text shadows cannot be composited, so it
  repainted the element on every frame of a loop that never ends — on this page,
  competing for the main thread with the field, the roster and four small WebGL
  marks. It was measurable: two unrelated checks in `check-ui.mjs` began failing
  because CSS transitions *elsewhere* stopped finishing inside their window. The
  glow is now a `content: ""` pseudo-element animating only `opacity` and
  `transform`, both of which the compositor handles without the main thread. The
  empty content also means a screen reader does not read the copyright glyph
  twice, and the contrast checker still measures the real one.

---

## 16b. The heart in the footer

"Built with ♥ by …" used to end in a flat sprite that scaled up and down. It is
now a modelled, glossy heart that beats, with a highlight travelling across its
upper right as though something bright were moving past the room.
`assets/js/modules/heart3d.js`, on a canvas about twenty pixels across.

**It is a sphere squeezed into the heart's outline** — and the two things it is
not are worth recording, because both look reasonable in the code and wrong on
the screen.

*Extruding the outline* gives a heart-shaped **slab**: flat front, flat back, a
rim around the edge. A 2D heart with thickness, which is exactly what it looks
like.

*Inflating that slab* — pushing its vertices out of the plane — fixes the
silhouette and breaks the surface, because an extrusion is not one surface. Its
caps and its side walls are separate runs of vertices that happen to meet at the
rim, so displacing them tears them apart and `computeVertexNormals` then draws a
hard crease right around the shape. The result read as a folded shell.

A sphere has no seam: every vertex is part of one continuous surface, normals
come out smooth everywhere, and there is nothing to tear. So each vertex of a
sphere is mapped by its own direction:

```
x = dx · r(θ)      d is the vertex's unit direction
y = dy · r(θ)      r(θ) is the heart outline's radius at that angle
z = dz · DEPTH
```

At the equator `dz` is zero and the cross-section is exactly the outline; as
`dz` rises it is the same outline scaled down, so the solid domes to a point at
the crown, keeps the notch between the lobes all the way up, and is **thickest
through the middle**. Which is what a heart is.

`r(θ)` is a table of radius by angle, built from four hundred points on the
outline into seven hundred and twenty bins, with the empty bins filled from
their neighbours — an empty bin is a radius of zero, which is a spike straight
through the middle of the heart. The mapping works at all because the shape is
star-shaped about its own centre; where a ray does cross the outline twice, the
outer crossing wins, so the notch stays a notch instead of turning inside out.

The sphere's poles are rotated onto the depth axis first. Left along Y they
cluster their vertices at the heart's left and right extremes, where the shape
needs them least, and leave the crown coarse.

**The beat is not a sine.** A heart does not breathe, it beats: a hard
contraction, a smaller second one just after it, then a long rest. Two offset
pulses raised to a power give exactly that, and the difference is immediate — a
sine reads as "throbbing", which is a different and slightly unpleasant thing.
It also widens a little more than it lengthens, which is what a contraction
does.

**The travelling light** is a point light on a slow arc across the upper right
and out, coming round again every few seconds, brightest and closest at the
middle of its run. Because the surface under it is curved, the specular slides
across the form and stretches as it goes, which is what makes it read as a
reflection of something moving rather than a glint painted on.

**Cost:** it runs only while it is on screen (an `IntersectionObserver`) and only
while the tab is visible. The footer is below everything, so on most visits it
never runs at all — a beating heart nobody is looking at is the definition of a
wasted frame.

**Without WebGL** it is the sprite that was always there. `data-heart="three"` on
the wrapper is what hides the sprite, so the sentence never has a hole in it.

---

## 16c. The copyright mark in the footer

A cyan copyright mark with a silver sword driven through its plane at forty-five
degrees, the two turning together; every half turn a bead gathers at the point,
falls the whole way to the bottom of the *screen*, and joins a shallow pool that
trembles and glows there. `assets/js/modules/copyright3d.js`.

**The mark is not a glyph.** A character would have to be loaded and its shape
would then depend on whichever font answered — the one thing a mark cannot
afford.

The ring is a torus, because in the reference it is round and a torus is round.
**The C is not.** It used to be a second torus with an arc missing, and that is
exactly what it looked like: a broken ring inside a whole one, two circles of
the same kind, a mark with no letter in it. A letter has things a torus cannot
have — a stroke that swells at the shoulders and thins at the top and bottom,
terminals cut off flat at an angle, and a ridge down the middle of the stroke
where two cut faces meet.

So it is a **ribbon**: a path with a cross-section carried along it, whose width
and thickness change from one end to the other. Three.js has no primitive for
that — `TubeGeometry` follows a path at a constant radius, `LatheGeometry` is a
solid of revolution, and an extrusion pushes a flat outline straight back and
gives a slab — so `ribbon()` in the module writes it out: sample the path, and
at every station emit four points, two out to the sides and one each forward and
back, then stitch consecutive stations into quads and cap both ends.

Four points and not sixteen, and that is the whole reason it is worth doing. A
four-point section is a **diamond**: two flat faces meeting along a crest down
the middle of the shape. With `flatShading` that crest is a hard edge which
catches a line of light, and a line of light down the middle of a stroke is what
a letter cut in metal looks like. The width is `1 − 0.30·|sin θ|` — full at nine
o'clock, seven tenths of that at twelve and six — and that one term is most of
the difference between a letter and a piece of pipe. The terminals carry a
`shear`, which slides the end cap's side points along the path so the cut leans;
square-cut ends are the giveaway of a shape made by removing an arc from a ring.

**The blade is built by the same function**, for the same reason, and it is
curved: a straight bar through a round mark is two geometric primitives
crossing, and a curved blade is a made object lying across one. Its centre line
is a parabola so the curve starts straight at the guard and gathers, and its
width holds most of the way and then runs out over the last fifth — a real blade
keeps its breadth almost to the end and then finishes quickly, which is also
what leaves something for the drop to hang from.

**The sword turns with it.** It used to stand still while the mark turned around
it, on the theory that a sword that moved would read as a decal on a spinning
disc. In practice the opposite happened: a fixed sword and a turning ring read as
two unrelated things that happen to overlap. Carried round with the mark, they
read as one object — which is what a sword through a mark is.

**Forty-five degrees is set as a direction, not as a rotation.** "Through the
plane at forty-five degrees" is a statement about the angle between the blade and
the plane of the mark, and Euler angles do not give you that: two rotations of
forty-five compose into an angle that is not forty-five. So the blade's direction
is written down as a vector — half in the plane, half out of it, which is exactly
forty-five degrees from it whatever the in-plane lean happens to be — and the
sword is turned to point along it with `setFromUnitVectors`. The number in the
code is the number on the screen.

**Silver without an environment map is a trap.** A physically metallic surface
reflects its surroundings and nothing else, so at `metalness: 1` with nothing
around it a "silver" sword renders black. What works is a light base colour at
middling metalness with enough lights to make highlights — hence four in the rig,
two of which exist only so the blade is never a flat grey shape at any angle of
the turn. The hilt's fittings are lighter and *less* metallic than the blade,
not darker: a hilt is small, intricate and mostly facing away from the key, and
at the blade's own metalness it went to a dark blob for most of every turn.

**The hilt is mostly one curve.** It used to be a box, a cylinder and a sphere,
and at forty pixels that reads as a nail. Almost all of a cavalry hilt's
silhouette is the **knuckle bow** — the bar sweeping from the outer end of the
cross-guard round the front of the fist and back to the pommel — so that is the
piece that gets the arithmetic. A bow is an arc through two known points with a
known bulge, and `TorusGeometry` wants a centre, a radius, a start angle and a
sweep; those are not the same four numbers, and eyeballing them is how the first
attempt ended up with a hook pointing the wrong way. `arcThrough()` converts one
to the other, so the bow is written in terms of where the guard ends and where
the pommel is — move the pommel and the bow follows.

**The frame is fitted to the swept shape, in a box wider than it is tall.** This
is what "the handle goes out of an invisible box" was. There is no box: the
camera was set to a distance that framed the *mark*, and the mark is a disc a
millimetre thick — but the sword is at forty-five degrees to that disc, so a
quarter turn later the part of it that was pointing at the viewer is pointing
sideways instead, and the hilt is outside the canvas. The frame had been
measured against one pose out of all of them.

A rig turning about Y sweeps every vertex round a circle of radius √(x²+z²) and
never moves it in y, so two numbers describe the entire sweep — the largest
`reach` and the largest `rise` — and fitting the frustum at the nearest plane the
sweep reaches means nothing can leave the picture at any angle. Three things
then follow: the sword is **centred** on the mark (an off-centre sword is further
from the axis it turns about, so the frame has to open to hold it, which shrinks
everything else — and centred is also the arrangement in the reference); it is
**shorter** than it was; and the box is **4rem × 2.7rem** rather than square,
because a sword lying diagonally through a ring sweeps a shape much wider than
it is high, and in a square box the frame opens to the wider of the two in both
directions and draws the mark two thirds the size it could be with bands of
nothing above and below it.

**It only runs while the sword is on screen**, and getting that wrong was a real
bug: the pool used to appear at the bottom-left of a page scrolled nowhere near
its footer, most reliably after switching to another tab and back. The
`IntersectionObserver` was doing its job; the `visibilitychange` handler beside
it was not — it called `start()` whenever the tab came back, whatever the
observer had last said. So the loop resumed, the pool was painted, and the only
thing that explains a pool of it — a sword with a drop hanging off its point —
was a thousand pixels below the fold.

There is now one variable holding one fact, and every path that could start the
loop has to ask it. The observer's 80px `rootMargin` went too: a courtesy margin
is right for a mark that merely needs to be turning by the time you see it, and
wrong for one that sheds something, because a drop could let go while the blade
was still below the fold. Stopping now also abandons anything mid-air rather
than pausing it — a drop frozen halfway down the screen and resumed a minute
later, from a mark that has moved, falls from nowhere to nowhere. The pool is
kept: coming back to the footer and finding it still there is the behaviour that
was asked for. `check-ui.mjs` §5d-4 drives all four states.

**The dew is not in the 3D scene, because it has to leave.** The mark's canvas is
about forty pixels across and anything drawn in it is cut off at that boundary —
which is exactly what "there seems to be an invisible box around the logo" was:
the bead was being clipped by its own frame while it grew, and there was nowhere
for it to fall *to*. So the bead's whole life happens on `.dew-layer`, a fixed,
transparent, click-through 2D canvas pinned to the bottom of the viewport. Each
frame the sword's point is projected out of the 3D scene into page coordinates
and the bead is drawn there. It lands on the bottom line of the screen because on
that canvas the bottom line of the screen is a real place.

**The pool is a puddle, not a band.** The first build filled the whole width of
the viewport — the obvious reading of "accumulate at the bottom line", trivial to
draw, and it looks like a warning bar, because a saturated stripe from edge to
edge of the screen is what a warning bar is. Five drops the size of a full stop
also do not cover a thousand pixels. So the depth is a lens: full in the middle,
nothing at the rim, over a width that grows with each of the first five landings.
The surface is three sines that do not divide into each other for the tremble,
plus a travelling decaying wave launched at the exact x of every landing, and it
is finished with a bright rim along the top — the specular line does more work
than the fill in making a liquid read as a liquid.

After five landings the depth **stops**. A later drop lands, throws its wave and
dissolves into the surface, and the volume does not change; that is the
difference between joining a pool and pouring into a glass.

**The size** is set in rem and not em: the brief was "as big as the mark in the
top bar or the back-to-top button", and both of those are fixed controls.
`tools/check-ui.mjs` measures it against those two elements rather than against a
number.

**The drop is a teardrop, not an ellipse.** An ellipse is what a squashed ball
looks like — symmetrical top to bottom, so it reads as a bead of glass rather
than as liquid. A drop is not symmetrical: surface tension pulls it round at the
bottom and the column it is leaving pulls it to a point at the top, whether it
is still hanging off the blade or already falling, so the point goes up in both
cases. The outline is one arc and two quadratics, and the point is 1.45 radii
clear of the centre *before* any stretch is added — the first attempt made the
apex a function of speed alone, which meant the drop was a circle except while
it was accelerating.

**Eight WebGL contexts** now live on a wide Publications page — the field, the
header mark, the calligraphic brand mark, the explorer, the back-to-top bayonet,
the heart, the name column (§15c) and this. (The dew layer is 2D and does not
count.) That is inside every browser's limit of about sixteen, and each of the
small ones draws only while it is on screen, the tab is visible, and it has
something to say. Worth knowing before adding a ninth — and worth knowing that
it is why several checks in `check-ui.mjs` had to stop measuring in
milliseconds.

**Without WebGL** it is the `©` character that was always there.
`data-mark="three"` on the wrapper is what hides it, so the line never has a hole
in it — and the character is what a screen reader gets either way, since the
canvas is decorative and the wrapper carries the label. Under
`prefers-reduced-motion` the dew layer is hidden outright.

### 16c.1 When the dew is allowed to run

Three conditions, and all three have cost a bug.

| | |
|---|---|
| **The sword is on screen** | an `IntersectionObserver` on the canvas, with no `rootMargin` |
| **The tab is visible** | `visibilitychange`, which must ask the observer rather than assume |
| **The page has finished drawing** | `hs:page-ready`, set by `main.js` |

**1. On screen.** The observer has no `rootMargin`. It used to have 80px — a
courtesy margin so the mark was already turning by the time it scrolled into
view — and for the dew that is exactly wrong: a drop could let go while the
sword that shed it was still below the fold. With the margin off, "the mark is
visible" and "the dew may run" are the same statement.

**2. Visible tab.** The pool used to appear at the bottom-left of a page
scrolled nowhere near its footer, most reliably after switching to another tab
and back. The observer was doing its job; the `visibilitychange` handler beside
it was not, and called `start()` whatever the observer had last said. There is
now one fact in one variable — `onScreen` — and every path that could start the
loop has to ask it.

**3. Finished drawing.** *This is the one fixed most recently, and it is the
subtlest of the three, because nothing was lying.*

The footer is built from `site.json`; the content is built from the page's own
data file. `renderFooter(site)` therefore runs several awaits ahead of
`mod.render(site)`, and in between the entire document is a masthead, the word
"Loading…" and a footer. That document is **shorter than the window**. So the
footer really is in the viewport, the observer truthfully says so, and the
sword starts shedding drops into a page that has not happened yet.

Then the content lands, the document grows past twenty thousand pixels, and the
footer leaves. The loop stops and the overlay is cleared — that part always
worked. What is *not* cleared is the pool, which is remembered on purpose so
that returning to the footer finds it as you left it. The result is a reader
who scrolls down for the first time and finds blood already pooled under a
sword they have never seen, with fresh drops adding to it.

It was reported on **Publications** and **Research team**, which is the clue:
those are the two pages whose content takes longest to draw, so they have the
widest window. On a fast connection the window is a few hundred milliseconds
and nothing lands in it; on a slow one it is seconds, and two or three drops do.

The fix is to say plainly when the layout starts meaning something.
`main.js` sets `data-page-ready="yes"` on `<html>` and fires `hs:page-ready`
once the page controller has rendered — in `finally`, so an error page counts
too, and after two frames, so the browser has actually laid the new content out.
`copyright3d.js` reads it once at mount (the module is imported dynamically and
may well load *after* the signal) and otherwise waits for the event. Before that
moment the viewport is describing a placeholder, and a placeholder is not a
reason to bleed.

Nothing accumulates in the window because nothing runs in it: `landed` is still
`0` when the content arrives, instead of `1` or `2`.

`tools/check-ui.mjs` **5d-4** covers the first two conditions and **5d-5** the
third — it holds `data/*.json` back for nine seconds to make the window wide
enough to observe, checks that the dew stays dry while the footer sits in an
empty viewport, and then checks that nothing pooled once the content pushed the
footer away. Both fail loudly if the window they are trying to measure does not
actually occur, rather than passing on having measured nothing.

---

## 17. Surfaces, light, and type with depth

### 17.0 The hero is lit, not tilted

The section cards lean toward the pointer and stand their contents at different
depths. **The hero does not.** It holds the portrait and the name, it is the
first thing on the site, and it should sit still and be read.

An earlier build leaned it too, and it was the wrong effect in the right place:
good on a card you are choosing between, wrong on a masthead. What it keeps is
the light — a soft highlight that follows the pointer across the panel, as
though a lamp were being moved over a surface. `check-ui.mjs` now asserts both
halves of that: the light arrives and fades with the pointer, and the hero's
transform stays `none` throughout.

The section cards get their depth through the highlight layer, which already
tracks the pointer for them (§12.1); §7 of `fx.css` adds the depths those angles
were missing. Without children at different distances, a tilt is just a skewed
rectangle.

### 17.1 Two rules, both load-bearing

**Nothing is lifted until it is pointed at.** `translateZ` under a perspective
makes a thing *bigger*, because it is nearer. Applying the depths at rest would
leave every icon a few per cent larger than it was designed to be and the layout
would have quietly drifted. The cards are exactly flat until the pointer arrives
and flat again when it leaves.

**Transforms only.** No padding, no borders, no widths. Transforms do not affect
layout, so nothing here can reflow text or move a line break — which is what
keeps this well clear of the Persian typography lock (§7).

### 17.2 Where the work happens

| | |
|---|---|
| `assets/js/modules/cards3d.js` | the hero's pointer tracking — writes `--mx`, `--my` |
| `assets/css/fx.css` §7 | every transform, depth, sheen and shadow |

The perspective lives on the *containers* (`#hero`, `.cards`), not on the cards,
so every child shares one vanishing point and the depths agree with each other.
Pointer moves are throttled to one write per frame: `pointermove` fires far more
often than the screen refreshes, and each write invalidates a composited layer.

### 17.3 Who does not get it

- **Touch screens.** There is no pointer to follow, and a tilt on tap is a jolt.
- **`prefers-reduced-motion`.** The depth stays — the lit top edge, the layered
  shadows — and the leaning does not.

Both are checked in JavaScript before a single listener is attached, so on those
devices this file does nothing at all.

### 17.4 Changing it

| Want to | Do this |
|---|---|
| change what stands where on a card | the `translateZ` values in `fx.css` §7 |
| change the hero's light | the `radial-gradient` on `.hero::after` |
| turn the light off | delete the `initCards3d()` call in `main.js`; the CSS then never matches |

### 17.5 Type with depth — the Summary page only

The headings on the home page are extruded: a short stack of hard shadows under
each letter, then one soft one beneath the whole word. `fx.css` §8, with the
colours as tokens per scheme in `theme.css`.

Readability came first, which is why it is not a bevel and not an outline:

- **The letterform is untouched.** Every shadow sits *below* the glyph, so
  nothing eats into the shape and nothing lowers the contrast between ink and
  page. The contrast guard measures colour against background and is unaffected
  — but so is the eye, which is the actual point.
- **Display type only.** The hero name, the section titles, the card titles and
  the drop cap. Body copy, chips, captions and the sidebar are left flat: a
  paragraph of extruded text is a headache.
- **The extrusion reverses with the scheme, but not the way you would guess.**
  On light it runs down into a cool grey. On dark it runs into *slate* — lighter
  than the card, not darker. The first version reasoned that shadows are dark
  and used `#10161f` on a `#141922` card, and the effect vanished: what is being
  drawn is the *side* of a raised letter, and on a dark page a raised side
  catches light. Only the shadow it casts is black. `check-ui.mjs` now measures
  the extrusion's luminance against the card's in both schemes and fails if they
  are within a hair of each other.

### 17.6 The hero name as a raised solid

"Hamed Sadeghi" is a solid pressed proud of the card — a name raised on a plate,
not a letter with a drop shadow under it. The cyan neon that briefly lived here
is gone; this replaced it.

What makes it read as an object is that **the wall tapers**. Reading down the
`text-shadow` stack, the offset grows a step at a time *and the blur grows with
it*, so each slice of wall covers less ground than the slice above:

```css
-0.5px -1px 0 var(--c-lip),          /* the lip */
 0.5px  1px 0    var(--c-extrude),   /* full thickness at the face */
 1px    2px 0    var(--c-extrude),
 1.5px  3px 1px  var(--c-extrude-deep),
 2px    4px 2px  var(--c-extrude-deep),
 2.5px  5px 4px  var(--c-extrude-deep),   /* thinning as it goes back */
 3px    7px 9px  var(--c-extrude-cast),   /* where the solid meets the card */
 4px   16px 26px var(--c-extrude-cast-soft);
```

The solid is at full thickness where it leaves the letter's face and narrows to
nothing at its base, instead of ending square like a stack of hard copies — which
is what the previous version was, and why it read as a shadow. The offsets also
drift right as they go back, putting the light above and to the left, the same
place the card lighting and the brand mark's aura put it.

**The lip is the piece that sells it.** It is a hairline of light laid *above*
and slightly *left* of the glyph, outside the letterform: the ridge of sheet
thrown up around a shape that has been pushed through from behind. The letter's
own walls are turned away from the light and are in shade; this ridge is the one
surface facing it. Take the lip away and the same stack collapses back into a
drop shadow. `--c-lip` is white on the light scheme — there is nothing brighter
available — and one step up from the wall on dark, because a white ridge over a
near-white letter on a dark card reads as a second letter above the first.

`.section-title` and `.card__title` are a third the size, so they take the same
geometry at a smaller scale: three slices of wall, a half-strength lip, one
shadow. The drop cap takes the full treatment a little deeper again, so it does
not end up the only flat letter on the page.

**Readability is untouched.** The letterform itself and its colour are not
touched: every shadow is *outside* the glyph, so nothing eats into the shape and
nothing lowers the contrast between ink and page. `check-contrast.mjs` measures
what it always measured. It is on display type only — body copy, chips, captions
and the sidebar stay flat, because a paragraph of raised text is a headache. And
under `prefers-contrast: more` the whole stack is dropped: a reader who asked for
more contrast asked for fewer soft edges around type.

**What the guard checks.** `check-ui.mjs` asserts three things per scheme, each
of which has actually gone wrong at least once: the wall's luminance *separates*
from the card it sits on (the dark-mode attempt that used `#10161f` on a
`#141922` card vanished completely); the wall *tapers*, i.e. the deepest slice is
blurrier than the shallowest, since a stack of hard copies is a shadow and not a
solid; and there is a lip above the glyph that is *lighter* than the wall. It
also checks the heading is one plain string again — no per-letter elements, no
`aria-label` standing in for the real text — and that no cyan survived the
revert.

### 17.6b Icons with depth, and the ceiling on it

> **Superseded for the display icons.** Everything below still governs the
> hundred-odd small icons on the long pages, which is most of them. The display
> icons — the cards, the section headings, the panel titles, the section bar —
> are now modelled solids instead; see §20, and §20.8 for how it got past the
> ceiling this section describes.

The **display** icons — the summary cards' icons, the section headings, the
panel titles, the section-bar chips — are raised: given a thickness, lit from
the upper left like every other three-dimensional thing here, and finished with
a little of their own colour as glow. The selector list at the top of
components.css §5b is the whole of the scope.

**It is a filter chain, not geometry**, and the two honest alternatives are
worth recording because both were tried.

*In WebGL:* a browser allows about sixteen live contexts and the Publications
page already holds eight. Icons would need one canvas shared between all of
them, positioned over the document and kept in step through every scroll and
reflow — a second layout engine, for icons.

*In SVG:* the same symbol drawn several times at increasing offsets, darker
underneath. It works, it costs five extra `<use>` elements per icon, and there
are 196 icons on the Research Team page. It also breaks quietly, because those
offsets are in the symbol's own viewBox units and this sprite's symbols are 384,
448, 512 and 640 units wide — the same offset is a different depth in each.

A chain of `drop-shadow` filters is neither. Each one shadows the alpha of
everything before it, so three at half a pixel build a solid wall that follows
the glyph's real silhouette — any glyph, no markup, offsets in CSS pixels so
every icon gets the same depth whatever its viewBox, all of it on the
compositor.

**Not on every icon, and this is the important part.** Of roughly 200 icons on
the longest pages, about 190 are twelve to fourteen pixels across. Below about
sixteen an extrusion is not a thickness, it is a smudge on one side of a glyph
that was drawn to be read at that size. Around thirty icons site-wide are large
enough to carry it, and those are the ones that have it.

**Why the wall is a tint and not a shadow — the ceiling.** The icons are drawn
with `<use href="icons.svg#id">`, an *external* reference, which puts the glyph
in a shadow tree this stylesheet cannot reach into: `.fa-secondary { opacity: 1 }`
from here does nothing at all, and only inherited properties like `color` cross
that boundary. Font Awesome's duotone symbols draw their secondary layer at
`opacity: .4`, and a drop-shadow sits *behind* what casts it — so on those
translucent paths the wall shows straight through the face. With a near-black
wall that is fatal: the first attempt turned a cyan stack of books into a navy
blob. With a wall that is a deeper tone of the icon's own colour it is not.
Where it shows through it reads as the shaded part of the same object, which is
what the shaded part of a solid looks like; where it stands outside the glyph it
reads as thickness.

Getting past that ceiling — properly lit duotone, a real extrusion on the face —
needs the sprite **injected into the document** rather than referenced from it,
which would put every symbol within reach of CSS. That is a change to how every
icon on the site is drawn and it has not been made.

### 17.7 The calligraphic brand marks

The bismillah beside the name, top left. It replaced the cyan rhombus, and
unlike the rhombus it is a real object: `assets/js/modules/bismillah/index.js`
extrudes the artwork's own outlines and lights them.

**There are two of them.** The Summary page carries a square **kufic**
bismillah; every other page carries a flowing **thuluth** one. They are the same
object built twice — same trace pipeline, same extrusion, same lights, same
meteor, same columns of light — and the table in
`assets/js/modules/bismillah/marks.js` is the whole of the difference between
them.

That table lives in its own file, and not inside `index.js`, for one reason: the
module pulls in Three.js and is loaded lazily, but the **poster** — the flat
image that stands in until the solid is ready — has to be in the markup at the
first paint, and which poster it is depends on which mark the page carries. So
`chrome.js` imports the table statically. One list, two readers, and no chance
of the poster and the solid disagreeing about which mark the page is showing.

Four numbers differ between the marks, and all four for the same underlying
reason — the two scripts are physically different things:

| | kufic | thuluth | why |
|---|---|---|---|
| `depth` | 0.085 | 0.034 | The thuluth strokes are a third the width of the kufic ones. At the kufic depth every one of them came out *deeper than it is wide* — a stick pointing at the viewer, so the eye reads the walls and not the face. |
| `bevel` | 0.0022 | 0.0012 | Same argument one step in: a bevel is a fraction of a stroke, and the absolute bevel that catches a good highlight on a wide stroke swallows a narrow one whole. |
| `headroom` | 1.11 | 1.04 | How much bigger the frame is than the mark, so it can grow on hover without touching the edge. The thuluth mark needs every pixel of a fifty-pixel box to stay legible. |
| `emissive` | 0.10 | 0.045 | The kufic strokes are far enough apart that a glow between them reads as glow. The thuluth ones are not: at the same setting the gaps filled in and the mark became a luminous blob with a calligraphic outline. |

**Getting a shape out of the PNGs.** `tools/trace-bismillah.py`, and it segments
by **colour**, not by alpha, because neither source file has usable alpha: the
transparency was flattened before they reached us, so the checkerboard a
graphics editor draws behind a transparent layer is painted *into* the pixels
and every one of them is fully opaque. A pixel is part of the mark if it is dark
**or** colourful.

Each mark gets a `bismillah-<name>.json` — its letterform contours and holes,
plus one `silhouette` traced round the whole composition — and a
`bismillah-<name>-poster.png`, the flat fallback cut out against the mask as
real alpha, cropped square and palettised to about 4 KB. Today: kufic is 4
contours, 29 holes, 53 silhouette points, 27 KB; thuluth is 36 contours, 28
holes, 67 silhouette points, 16 KB.

```bash
python3 tools/trace-bismillah.py              # both
python3 tools/trace-bismillah.py thuluth      # just one
```

The thuluth mark needed one thing the kufic one did not: a **floor** under the
simplification. The polygon simplifier's epsilon is a fraction of each contour's
own perimeter, which is the wrong tool for a composition made of many small
pieces — it scales with each contour, so a dot two hundredths of the image
across is kept to a precision nothing on screen could ever show, and the thuluth
mark is mostly dots. `floor` sets a minimum epsilon as a fraction of the image's
longer side instead; with it the trace is 787 points rather than 3118, and the
two are indistinguishable at any size the mark is drawn. The kufic mark is four
big contours, needs none of it, and its floor is zero — so its output is
byte-for-byte what it was.

**Changing marks between pages announces itself.** Every page here is a real
navigation, so there is never a moment at which both marks exist and one could
be dissolved into the other. What there is instead is a *memory*: each page
records the mark it showed in `sessionStorage`, and the next page asks. If the
answer is a different mark, the new one **arrives** — one turn about its own
axis, eased out hard so almost all of it happens in the first third of a second,
growing from half size into place, with the aura flaring as it settles.

The turn and the growth are in the module rather than in CSS, and that is not a
preference. The light around the mark is rewritten every frame from the mesh's
own rotation and scale, so anything that moved the mark from outside would leave
the meteor tracing a border the mark had left. (A CSS transform on the wrapper
would also have scaled the canvas's *pixels* rather than the mark.) The one part
with no geometry in it — the aura brightening and settling — is CSS.

The first page of a session does not animate: nothing changed, and announcing a
transition that did not happen is worse than not announcing one that did.
Reading and writing `sessionStorage` both go through `try`/`catch`, because it
throws rather than returning null in a locked-down browser and a decorative
animation is not worth a broken header.

**Why the camera is orthographic.** The meteor and the light columns are SVG,
drawn in a 0–100 box laid over the WebGL canvas. For the light to sit *on* the
border rather than near it, the SVG has to know where the border ended up on
screen — every frame, because the mark leans as it goes. Under an orthographic
camera that is one line of arithmetic (`svgX = 50 + 50·x/H`), so each frame the
traced silhouette is pushed through exactly the rotation the mesh is using and
written out as a path. The light is then not *aligned with* the border; it **is**
the border. A perspective camera would have bought a little more depth and cost
this entirely, which is a bad trade for a mark fifty pixels tall.

The depth is bought back three other ways: the extrusion's own walls, a
travelling point light, and a **lean that never passes through zero**. That last
one is not a detail — dead-on to an orthographic camera an extrusion has no
visible walls at all, so a lean written as a plain sine would flatten the mark to
a sticker twice a cycle. Both leans are offset sines for that reason.

**The meteor** runs *counter-clockwise* around the mark's own border. Two copies
of the traced path with `pathLength="100"`, a long faint one for the tail and a
short bright one for the head, and a moving dash. The direction is one sign in
`fx.css`: the module normalises the silhouette's winding (it measures the
shoelace area and reverses the points when it has to) so the path runs
counter-clockwise on screen, and a **negative** `stroke-dashoffset` then runs the
dash forward along it. Flip that sign and the whole feature is lost.

**The light columns** stand off the border at random places, with random lengths
and lifetimes, bright where they leave the mark and gone by their far end. Each
one is a horizontal line inside a `translate → rotate → scale` group, which
means one attribute write per shaft per frame and a single shared gradient for
all of them. Their direction comes from the **winding**, not from the distance to
the middle of the box: the first version asked "does this point away from the
centre?", which is only the same question for a convex shape. This one has deep
notches between its lobes, and in every one of them the two tests disagree —
half the columns came out pointing inward and lay across the letterforms like
scratches.

**The aura** is light in every direction, brighter in some than others, and
always changing. Two conic gradients turning at different speeds in opposite
directions: where their bright arcs coincide the glow swells, where they oppose
it thins, and because the periods do not divide into each other the pattern
never repeats.

**On hover** it grows a tenth and beats. Both the growth and the beat are done
in the module, not in CSS, because a CSS transform on the wrapper would scale the
canvas's *pixels* — and would leave the SVG light behind while the mark grew out
from under it.

**The size** is 3.5rem against a 4rem bar. It is meant to be read, not merely
noticed.

Under `prefers-reduced-motion` the module never starts its loop: the mark is
drawn once, lit and still, and the aura and meteor hold their positions.

---

## 18. The Google Scholar figures

Two things on the site come from Google Scholar:

| Where | What |
|---|---|
| Summary — the hero card | **Citations**, **h-index** and **i10-index**, as three tiles under the affiliation line |
| Publications — each entry | **Cited by N**, on every paper that has been cited at all |

Both are optional in the strongest sense: if the numbers are not available, the
three tiles and every badge are **absent from the page**, not blank, not zero,
not a dash. Nothing reflows in from a spinner, and nothing tells a visitor that
something is missing. See "What happens when it goes wrong" below.

### 18.1 The numbers do not come from Google — they come with the page

This is the part worth understanding, because it is the answer to three
different problems at once.

**The browser never talks to Google Scholar.** It reads
`data/scholar.json`, a local file, alongside the page's other data files.
`tools/fetch-scholar.mjs` is what talks to Google, on your machine, when you run
it.

Three reasons it has to be this way:

1. **It is not possible otherwise.** Scholar sends no
   `Access-Control-Allow-Origin` header, so a browser on hsadeghi.org cannot
   read the response even when it arrives, and there is no public API to use
   instead. Every "live Scholar badge" on the web is a third-party server
   scraping Scholar on your behalf — which is another host on your critical
   path, and one you do not control.

2. **It would break the site's one rule.** §9 is a chapter about the site
   loading nothing from the internet, and `tools/check-offline.mjs` fails the
   build if anything does. The analytics tag is the single allowed exception.

3. **It is the answer to the requirement.** A visitor behind a national block on
   Google sees the figures anyway, because the figures arrived with the page
   instead of from Google. Nobody waits on a request that will time out. Nobody
   sees a half-drawn hero.

And it costs nothing. `data/scholar.json` is about 25 KB, fetched **in parallel**
with the seven data files the Summary page already waits on — so it adds no
round trip, and the hero is laid out once, complete, rather than being drawn and
then pushed down when a number turns up.

### 18.2 Refreshing the numbers

The profile changes every day. Nothing on this site is going to notice that by
itself — the browser cannot ask Google (§18.1) — so something has to run
`tools/fetch-scholar.mjs` and put the result where the page can read it. Two
things do, one per copy of the site, and between them nobody has to remember.

| | Keeps current | Runs | Needs |
|---|---|---|---|
| **`.github/workflows/refresh-scholar.yml`** | `hsadeghi.org` | twice a day, on GitHub | nothing — it is already in the repository |
| **`tools/refresh-scholar.ps1`** | the `sharif.edu` mirror, and any copy published by hand | when you run it, or daily if you register it | Node and PowerShell on your own machine |

**Neither can make the figures wrong.** Both end in `check-scholar.mjs`, and
the fetcher underneath them refuses to write a snapshot it is unsure of — a
captcha, a consent page, a timeout, a summary table that read as zero. The
failure mode stays "the numbers are a day old"; it never becomes "the numbers
are wrong" and never "the numbers vanished".

#### On GitHub, automatically

The workflow is already in the repository and starts the first time you push
it. It runs at 03:17 and 15:43 UTC, fetches the profile, validates what came
back, and commits `data/scholar.json` **only if something changed**. Pages
redeploys on the commit, so the site is current within a minute or two of the
fetch. The commit subject carries the figures, which makes
`git log --oneline -- data/scholar.json` a readable citation history of the
profile.

You can also run it by hand: **Actions → Refresh the Google Scholar snapshot →
Run workflow**.

**It is twice a day rather than once because Google answers a datacentre address
with a captcha fairly often.** When that happens the run records a notice,
changes nothing, and **finishes green** — deliberately. A workflow that goes red
for a thing that behaved correctly is a workflow whose red is ignored inside a
month, and this one has to be believable on the day it means something. Two
attempts twelve hours apart from different pools of runner addresses turn a
captcha into a delay rather than a missed day.

*If the commit lands but Pages does not rebuild*, that is the known restriction
on `GITHUB_TOKEN`: a push it makes cannot start another workflow. The built-in
Pages build is normally exempt and this works as written, but if your repository
is set up so that it is not, swap the token for a deploy key or a fine-grained
PAT with **Contents: write** and check it out with
`actions/checkout@v4` + `with: { ssh-key: … }` or `token: …`. Nothing else in
the workflow changes.

#### On this machine, for the mirror

```powershell
pwsh -File tools/refresh-scholar.ps1
```

It prints the figures before, runs the fetcher and the validator, prints the
figures after, and says what to do about it — including, when the numbers moved,
that `data/scholar.json` now has to reach the university server, which nothing
automatic can do for it. Every run appends one line to
`tools/scholar-refresh.log`.

```powershell
pwsh -File tools/refresh-scholar.ps1 -DryRun      # ask Google, print, write nothing
pwsh -File tools/refresh-scholar.ps1 -Strict      # exit 1 if Scholar refused
pwsh -File tools/refresh-scholar.ps1 -Register    # install it as a daily task
pwsh -File tools/refresh-scholar.ps1 -Unregister  # remove that task again
```

`-Register` creates a Windows scheduled task called **Refresh Scholar snapshot**
that runs the script every morning at 07:40, only while the machine is awake and
on a network, and never wakes it. It changes nothing else, and `-Unregister`
removes it. **Nothing is installed unless you pass that switch.**

Without `-Strict` the script always exits 0, for the same reason the workflow
always finishes green.

This half is also the one to reach for when Google is being difficult: it asks
from a home or campus address, which is the kind of address Scholar answers
without an argument.

#### By hand, which still works

```
node tools/fetch-scholar.mjs                 refresh
node tools/fetch-scholar.mjs --dry-run       print the report, write nothing
node tools/fetch-scholar.mjs --user XXXXXX   a different Scholar profile
node tools/check-scholar.mjs                 validate, with no network at all
```

From the site root, with Node 18 or newer. No packages to install. The fetcher
reads the profile, pages through every article, joins them to
`data/publications.json`, writes `data/scholar.json`, and prints a report.
`check-scholar.mjs` reports the figures, the age of the snapshot, how many
badges the Publications page will draw, and which Scholar entries found no
publication to attach to.

#### What the reader sees

The date the snapshot was taken is printed under the three figures in the hero,
as **"Google Scholar · 19 September 2026"**. It used to be in the `title`
attribute only, which is to say it was available to a reader with a mouse who
rested it there and waited, and to nobody on a phone.

It is there because a citation count with no date is a claim about *now*, and
with a date it is a measurement. It is also the only visible evidence that any
of the machinery above is running: a reader who sees yesterday's date knows the
site is being kept, and one who sees a date from 2024 knows what they are
looking at. `formatFetched` in `assets/js/modules/scholar.js` writes it, returns
null for a snapshot with no usable date, and the line is then simply absent —
the same rule as everything else in that file.

### 18.3 Matching a Scholar entry to a publication

The join is on the title, and titles disagree. Scholar writes *Hydromechanical*
where this site writes *Hydro-mechanical*, *fruticosa* where the site writes
*fruticose*, and truncates anything past about 190 characters with an ellipsis.
The matcher handles all three: an exact match on a normalised key first, then a
prefix match for a title Scholar itself cut short, then a character-bigram
similarity with a threshold of 0.82.

That threshold is measured, not guessed. On this profile the true pairs that are
not byte-identical score 0.841, 0.973 and 1.000; the closest pair that is **not**
the same paper scores 0.771. The gap is the margin.

Anything wider than that is left alone on purpose — a matcher loose enough to
join two genuinely different papers would put the wrong count under the wrong
title and never say so. Those go in **`data/scholar-aliases.json`**, by hand:

```json
{
  "the title exactly as Google Scholar writes it": "the title exactly as data/publications.json writes it"
}
```

The fetcher prints every entry it could not join, with its citation count, so
that file is written by reading the report. One entry is in there now.

### 18.4 Changing the badge threshold

`MIN_CITED_BY` at the top of `assets/js/modules/scholar.js`. **It is 1** — every
paper that has been cited at all carries a badge, and a paper with no citations
carries nothing, which is the distinction worth keeping.

It was 10, and the argument for 10 was editorial: a "Cited by 3" under sixty
entries is noise, and the list runs newest-first, where the newest papers are
the least cited by arithmetic alone. The argument the other way is stronger. A
citation is a fact about a paper, and a threshold of ten was hiding that fact on
**thirty-seven of the eighty-eight** papers Google knows have been cited — a
reader looking at one of those thirty-seven could not tell "not cited" from
"cited, but not enough for this website to say so". On a page whose job is the
record, that is the wrong silence.

No re-fetch is needed to change it: `data/scholar.json` carries every cited
paper, not only the ones above the line. `tools/check-scholar.mjs` and
`tools/fetch-scholar.mjs` both read the constant from `scholar.js` rather than
repeating it, so moving the line moves the tools with it.

### 18.5 What happens when it goes wrong

Every one of these ends with the page rendering exactly as it did before this
feature existed — no tiles, no badges, no gap where they were, and the explorer
back to the two views it had before it knew what a citation was:

| | |
|---|---|
| `data/scholar.json` is missing | nothing renders; the site has simply never been fetched |
| it is malformed, empty, or truncated | nothing renders |
| the citation or h-index figure is zero | the tiles do not render — a zero there means a parse failure, not a career |
| it is more than **400 days** old | nothing renders, and the console says why. An h-index that stopped being true two years ago is worse than no h-index, and worse precisely because nothing about it looks broken. The limit is `MAX_AGE_DAYS` in `assets/js/modules/scholar.js` |
| a paper is not on the Scholar profile | that one entry has no badge, and its timeline card is drawn at the base size |
| a paper is below the threshold | the same |
| **nothing joined at all** | the Impact tab is not built, the size toggle is not built, and every timeline card is one size. §15.7 |
| the automated refresh could not reach Google | nothing changes at all: the previous snapshot is still there and still being shown |

There is no code path that throws. `loadScholar()` resolves to `null` rather
than rejecting, so the page modules test a value instead of catching an error.

### 18.6 Turning it off

Delete `data/scholar.json`. That is the whole procedure — the tiles and the
badges stop appearing and nothing else changes.

Deleting it also takes the Impact view and the size toggle with it, because
both are built only when there are citations to build them from (§15.7). The
graph and the timeline stay exactly as they are.

To stop the automatic refreshes without removing anything else: delete
`.github/workflows/refresh-scholar.yml`, and run
`pwsh -File tools/refresh-scholar.ps1 -Unregister` if you registered the local
task. The figures then stay at whatever they last were, until the 400-day limit
retires them.

To remove the code as well: drop the `loadScholar()` line from the `Promise.all`
in `assets/js/pages/home.js` and from the one in `assets/js/pages/publications.js`,
and delete `assets/js/modules/scholar.js`, `tools/fetch-scholar.mjs`,
`tools/check-scholar.mjs`, `tools/refresh-scholar.ps1`, `tools/lib/scholar.mjs`,
`.github/workflows/refresh-scholar.yml` and the two data files. In
`assets/js/modules/explorer/` the citation layer removes itself when the numbers
stop arriving, so nothing there has to be touched.

---

## 19. Copying, and knowing about it

### 19.0 In practice — what you actually do

Everything in this section is already built and already running. There are two
things to set up once, and then it looks after itself.

**Set up once (about ten minutes):**

| # | What | Where |
|---|---|---|
| 1 | An email alert on the `unlicensed_origin` event | Google Analytics → Admin → Custom insights — steps in §19.3 |
| 2 | A second alert on an unexpected hostname, as a backstop | same place — steps in §19.3 |
| 3 | A Google Alert on the build-id `hs-geotech-2026-6f3ad1` | google.com/alerts — paste it in quotes |
| 4 | A Google Alert on one distinctive sentence from your biography | same, in quotes |

**Then nothing.** No maintenance, no monthly check. The site reports copies to
your own analytics by itself, and the alerts email you.

**Two things to remember:**

- If you ever put the site on a **new address** — a new server, a personal
  domain, a staging copy — add that hostname to `origins` in `data/site.json`
  first, or the site will report you to yourself from your own new server.
- If you change the build-id, change it in `assets/js/modules/canary.js` and
  re-run the header pass, then update your Google Alert to the new string.
  `node tools/check-canary.mjs` fails if the two ever drift apart.

**When an alert arrives**, go to §19.6.

---

The honest position first, because it decides everything else in this section.

**You cannot stop a web page being copied.** Every stylesheet, module and JSON
file here is sent to the visitor's browser *in order to be used*; a browser that
can render this site can save it. Nothing changes that. Minification does not —
it is one click to undo. Obfuscation does not, and it makes the site slower and
harder for you to maintain than for anyone else to take. Disabling right-click
and blocking DevTools do not — they are bypassed by pressing Ctrl-U, or by
`curl`, and in exchange they break keyboard users, screen readers, printing,
translation and the ability to copy your own email address off your own page.
Anyone selling you one of those is selling you a cost with no benefit.

So this site does not try to prevent copying. It does the three things that
actually work.

### 19.1 Say what the terms are

Every stylesheet, module and page carries a licence header naming the owner, the
year, the original address, and the fact that reuse is not permitted. This is not
decoration: in a takedown request or a complaint to a host or a university, the
first question is whether the terms were stated, and "it was in every file they
took" is a good answer. `/*!` rather than `/*` on the JavaScript, because that is
the marker minifiers are built to preserve.

### 19.2 Make a copy findable

A single unlikely string — the **build-id**, currently
`hs-geotech-2026-6f3ad1` — is embedded in the CSS, the JavaScript and the HTML.
It is deliberately something nobody types by accident, so:

- searching the web for it finds copies rather than coincidences;
- GitHub code search finds it in repositories;
- and if a copy turns up, it is evidence rather than an argument about whether
  two grids that both use flexbox are the same grid.

`tools/check-canary.mjs` fails if the build-id ever stops travelling in all
three file types. To change it, edit `FINGERPRINT` in
`assets/js/modules/canary.js` and re-run the header pass.

**Set up the searches once and they run themselves:** a Google Alert on the
build-id, and a second one on a distinctive sentence from the biography — a
phrase long enough to be unique, in quotes.

### 19.3 Make a copy announce itself

This is the part that answers "can I be told immediately".

`assets/js/modules/canary.js` runs on every page and looks at the hostname it is
executing on. If that hostname is not one of the site's own — and is not a local
address, because you develop locally — then this code is running somewhere it
was never deployed, and it says so two ways:

1. **Through the analytics that are already there.** It fires a `gtag` event
   named `unlicensed_origin`, carrying the offending hostname, the path, the
   referrer and the build-id. It goes to the same Google Analytics property as
   everything else, so it arrives where you already look. **No new host is
   contacted and no new request is made** — which is why `check-offline.mjs`
   still passes with this in place.
2. **In the console**, so anyone who inspects the copy is told whose work it is.

There is a second signal that costs nothing and works even without this file:
Google Analytics already records the **hostname** of every pageview. A wholesale
copy that keeps the tag reports itself into your property under a different
hostname whether the canary exists or not. The canary makes that explicit and
nameable rather than something you would have to go looking for.

**To get an email the moment it happens** (Google Analytics 4):

1. Admin → *Custom insights* → **Create**.
2. Evaluation frequency: **Hourly**.
3. Segment: *All users*. Metric: **Event count**.
4. Condition: `Event name` **exactly matches** `unlicensed_origin`, value is
   **greater than 0**.
5. Tick *Notify me by email*, name it "Site copied", save.

Add a second one on the hostname dimension as a backstop, in case a copier
strips the JavaScript but keeps the tag: same steps, but condition
`Hostname` **does not contain** `sharif.edu`.

**What the canary deliberately does not do** is deface the copy, redirect it,
blank the page or show a banner. That is tempting and it is wrong: the same code
would fire on a legitimate mirror, on an archive, on a translation proxy, and on
your own staging host the first time you forget to update the list — and a site
that breaks itself when it is unsure is worse than one that quietly reports. It
touches nothing a visitor can see. If it fails, it fails silently.

**Keep the list current.** `origins` in `data/site.json` — hostnames only, no
scheme, no path. Add any staging or mirror host you use, or the reports will be
about you. Subdomains of a listed host count as the same site (`www.sharif.edu`
matches `sharif.edu`); a host that merely ends with the same letters does not.

### 19.4 What is left, and what it is worth

| Measure | Stops copying? | Worth doing? |
|---|---|---|
| Licence headers | No | Yes — they are what a takedown rests on |
| Build-id fingerprint | No | Yes — turns "looks similar" into proof |
| Origin canary + GA alert | No | Yes — this is the "tell me immediately" |
| Right-click / DevTools blocking | No | **No** — real costs, no benefit |
| Obfuscation / minification | No | No, for this site |
| Images as canvas, text as image | No | No — destroys search and accessibility |
| Server-side hotlink rules | Partly | If your host allows it, yes |

The last one is the only measure here that a static site cannot do for itself.
If `sharif.edu` lets you set response headers, two are worth having:
`X-Frame-Options: SAMEORIGIN` (or `Content-Security-Policy: frame-ancestors
'self'`) so nobody can wrap your page in their own, and a `Referer`-based rule on
`assets/img/` so other sites cannot serve your photographs from your bandwidth.
Both are server configuration, not files in this folder.

### 19.5 The guard

`tools/check-canary.mjs` runs the real site on three hostnames —
`copycat.test`, `sharif.edu` and `localhost` — using Chromium's
`--host-resolver-rules` so that `location.hostname` is genuinely what the test
says it is rather than something stubbed. It requires the copy to report and the
other two to stay silent, because both failures are bad and both are quiet: a
canary that never fires exists for nothing, and one that fires on the original
fills your own analytics with reports about yourself.

One detail worth knowing if you ever rewrite that test: it reads the event out of
`dataLayer` rather than by stubbing `window.gtag`. The analytics snippet in the
page head defines `gtag` itself and overwrites any stub — which is how the first
version of this check managed to report zero events on a page that was firing
them perfectly well.

### 19.6 When an alert arrives — the runbook

An `unlicensed_origin` email means the site's own JavaScript ran on a hostname
that is not yours. Work through this in order.

**1. Rule yourself out first.** Is it a host you set up and forgot to list? A
university staging server, a colleague testing a mirror, a conference kiosk, a
web archive, an automatic translation proxy? If so, add it to `origins` in
`data/site.json` and stop — nothing has happened.

**2. Find out what it is.** In Google Analytics, open the event and read
`origin_host`, `origin_path` and `referrer`. Then open the page in a browser.
Three quite different things look the same in an alert:

| What you see | What it is | What to do |
|---|---|---|
| Your pages, your name, your photograph, on their domain | A wholesale copy | Steps 3–5 |
| Your layout and code, their name and their content | A stolen design | Steps 3–5 |
| Your page inside a frame or a proxy | Framing / scraping | Ask the host to stop; consider the header in §19.4 |
| An archive (`web.archive.org` and similar) | Not theft | Add it to `origins` or ignore it |

**3. Record it before it moves.** Save the page (Ctrl-S, "complete"), take
screenshots, and note the date. Check the copy's source for the build-id — view
source and search for `hs-geotech-2026-6f3ad1`. If it is there, you have the
strongest single piece of evidence there is: a unique string of yours inside
their files. Save a copy of the source showing it.

**4. Ask them to take it down.** One short email to whoever runs the site,
naming the pages, stating that the design, code and content are yours, pointing
at your original, and asking for removal or proper attribution by a date. Most
cases end here — a surprising number are students who copied a template without
thinking about it.

**5. If they do not, go to the host, not the person.** Find the hosting company
(a WHOIS lookup on the domain, or `host` on the domain name) and send the same
letter to their abuse address as a copyright complaint. Include the evidence
from step 3. For a university-hosted page, the equivalent is the department or
the IT office. For a Google-indexed copy, Google's Legal Removal Requests form
will de-index it, which for most academic purposes is enough — a copy nobody can
find is nearly a copy that does not exist.

**What not to do:** do not add code to attack, deface or redirect the copy. It
is satisfying and it is a mistake — it converts a clean copyright complaint,
where you are unambiguously in the right, into an argument about what your code
did to someone else's server.

---

## 20. Icons as objects — and how to go back to flat

> ### ⬅ Going back to 2D icons
>
> Open **`assets/js/modules/icons3d/index.js`** and change one line near the top:
>
> ```js
> export const ENABLED = false;
> ```
>
> Every icon on the site is immediately the flat Font Awesome glyph it has
> always been. Nothing else has to change, nothing else breaks, and no file has
> to be deleted. **The 2D sprite has never gone anywhere** — see §20.1.
>
> Two more switches, for checking rather than deciding:
>
> | | |
> |---|---|
> | one visitor, no edit | `localStorage.setItem('hs-icons3d', 'off')`, then reload. `removeItem` to undo |
> | one page | `<html data-icons3d="off">` in that page's markup |
> | one place on the page | delete its selector from `SCOPE` in the same file (§20.3) |

The **display icons** — the six cards on the Summary page, every section
heading, the sidebar panel titles, the seven page links, the sticky section bar,
the theme switch, the building in front of *Department of Civil Engineering* —
are no longer pictures of things. They are modelled solids, lit from the upper
left like everything else on this site, turning slowly, and each doing something
of its own when you point at it.

The globe on *Visiting Scholars* is the earth: an ocean sphere with continents
standing off it, turning about a tilted axis, so land goes round the limb and
comes back. The building is a building, with two masses of different depths, a
parapet and recessed glass. The book is boards and a block of leaves. The chain
link is two torus rings genuinely threaded through each other. The hourglass is
transparent glass with sand inside it and one grain falling.

There are **69 models, one for every symbol in the sprite.**

### 20.1 The flat icons never left

This is the important structural fact and the reason the switch above is a
one-liner.

An upgraded icon is the **same `<svg class="icon">` element** it always was, in
the same place in the document, with the same box and the same baseline. Two
things happen to it:

* a `<canvas>` is added inside it, in a `<foreignObject>`;
* its `<use>` — the flat glyph — is hidden with `display: none`.

That is all. `assets/icons/icons.svg` is untouched, every `"icon": "fad-book"`
in the data files still means what it meant, and `icons.js` still builds the
same markup. Turning the layer off stops one module from running; it does not
restore anything, because nothing was removed.

The canvas goes *inside* the SVG rather than beside it for a specific reason:
the stylesheets are full of selectors like `.entry-section > h3 > .icon` and
`.card__icon .icon`, and wrapping the SVG or adding a sibling would quietly
break some of them. Inside, the document structure is byte-for-byte unchanged.

Three CSS rules make up the whole of the stylesheet side, at components.css §5c:
hide the `<use>`, drop the 2D depth filter from §5b (the object has a real
thickness; a painted shadow under a lit solid looks like neither), and suppress
the keyframe animations (the object has its own motion).

### 20.2 One renderer, many canvases

A browser allows about sixteen live WebGL contexts and the Publications page
already holds several, so one context per icon is not available. §12 records the
two alternatives that were weighed before this one:

*One big canvas over the document, scissored per icon.* It works, and it costs a
second layout engine: the canvas is fixed to the viewport, so every icon's
rectangle has to be recomputed on every scroll and every reflow, and an icon
that scrolls under the sticky header paints straight over it, because the canvas
is one element with one z-index.

*What it does instead.* **One** WebGL renderer, offscreen, never in the
document, plus a small ordinary 2D `<canvas>` inside each icon. Each frame the
renderer draws one icon at 96 × 96 and the result is blitted into that icon's
own canvas with `drawImage`. The canvases are in the flow, so the browser does
the layout, the stacking, the clipping and the scrolling — all of it, for free,
correctly, including inside the sticky section bar. There is no rectangle
bookkeeping anywhere in the module. Icons are smaller than 96 px, so the blit is
a downscale, which is free supersampling.

**What it costs, and what it refuses to cost.**

* Nothing until the page is drawn. `main.js` starts it last and never awaits it.
* Nothing on a page with no icons in scope — the models are not even fetched.
* Only the model families a page uses are downloaded. Publications pulls
  `paper` and `symbols`; it never sees `brands` or `architecture`.
* Only icons on screen are drawn. An `IntersectionObserver` stops the rest.
* Nothing while the tab is hidden, and **the loop stops entirely** once no
  icon is visible, rather than idling at 60 fps.
* One static frame and no loop at all under `prefers-reduced-motion`.
* One extra WebGL context per page, total, whatever the icon count.

**Measured, not assumed.** Icons are rendered sixteen at a time into one canvas
and then blitted out of it, rather than one-render-one-blit. That matters more
than it sounds: `drawImage` from a WebGL canvas has to wait for the GPU to
finish, so drawing them one by one costs one pipeline stall *per icon per
frame*. Batching makes it one stall per sixteen.

From the console on any page:

```js
window.__icons3d.benchmark()   // { icons: 31, msPerPass: 3.2 }
window.__icons3d.cost          // ms per frame, live, averaged
window.__icons3d.drawn         // how many were actually on screen last frame
```

All thirty-one icons on the Summary page come to **about 3.2 ms** on a 2024
laptop — a fifth of a 60 Hz frame, for every icon at once, where in practice
only the eight or nine on screen are drawn. If that number ever approaches a
third of a frame, narrow `SCOPE`; do not optimise.

(Use `benchmark()` rather than `cost` when the tab is in the background or the
window is hidden. `cost` is measured inside the animation loop, and a throttled
`requestAnimationFrame` inflates it several times over — which is exactly the
trap this note exists to save you from.)

### 20.3 Scope — which icons become objects

**Not every icon, and that is deliberate.** The Research Team page carries about
196 icons, of which roughly 190 are the twelve-pixel markers in front of a
student's topic and date. A modelled solid at twelve pixels is not a solid, it
is four pixels of highlight on a glyph that was drawn to be read at that size —
and 190 of them would be 190 canvases for no gain anyone can see. Those keep the
2D depth treatment from §17.6b, which is what it was designed for.

The list is `SCOPE`, near the top of `assets/js/modules/icons3d/index.js`:

```js
export const SCOPE = [
  '.card__icon .icon',            // the six section cards on Summary
  '.entry-section > h3 > .icon',  // every section heading on every page
  '.panel__title .icon',          // sidebar panel headings
  '.panel__list a .icon',         // the Pages list — seven icons
  '.profile-list__row a .icon',   // ORCID, ResearchGate, LinkedIn, Mendeley
  '.secnav__chip .icon',          // the sticky section bar
  '.honour__title .icon',         // the 32 award stars
  …
];
```

Add a selector to put a new place in scope; delete a line to take one out. There
is also `MIN_SIZE` (13 CSS px) as a floor, and `LIMITS.maxLive` (40) as a
ceiling — the busiest real page comes to about thirty.

In practice: **31 objects on Summary, 24 on Publications, 23 on Research Team.**

### 20.4 How the models are built

```
assets/js/modules/icons3d/
├── index.js       the renderer, the scope, the loop, the switch
├── lib.js         the vocabulary every model is built from
├── registry.js    sprite id → model → how it moves
└── models/
    ├── architecture.js   buildings, and the things that stand in a room
    ├── paper.js          books, documents, calendars, pens
    ├── people.js         the bust, and the seven hats that go on it
    ├── symbols.js        stars, crowns, the earth, the clock, the signs
    └── brands.js         LinkedIn, ORCID, ResearchGate, Mendeley
```

Every model is built inside a **box one unit on a side, centred on the origin**,
and nothing in `models/` imports Three.js, touches the DOM or knows what a
renderer is. A builder is handed a `kit` and reaches for `k.box`, `k.lathe`,
`k.ring`, `k.c.gold` — so the files read as drawings rather than as graphics
programming. `index.js` then measures each finished model and scales it to a
common size, so a builder can draw a pencil long and thin and a globe round
without either of them having to know about the other.

**The test each model had to pass:** turn it forty degrees and it should still
be the thing it is. A building with a real roof gains a gable when it turns; a
building that is an extruded outline gains a grey wall. That is the whole
difference between this and giving a flat glyph a thickness.

Three kinds of thing are modelled three different ways, and the distinction is
in `symbols.js` at length:

* **Objects** — a crown, a wreath, the earth, a cog — are modelled as what they
  are.
* **Signs** — a tick, a cross, an arrow, an exclamation mark — are not objects
  and never were; nobody has held a tick. They become a sign *made of
  something*: raised off a plate or sunk into a disc, with a bevel that takes
  the key light along its edge.
* **Wordmarks** — the four brand icons — are somebody's trademark, drawn to
  exact proportions. They become the mark struck into a badge, which is what a
  logo looks like as a physical object, and the only reading of one in three
  dimensions that does not misrepresent it.

### 20.4b The camera is straight on, and models have to be built for it

Every icon is drawn by an **orthographic camera looking straight down −Z**. No
perspective, no three-quarter view. That is the right choice — §20.2 has the
argument — and it has one consequence that has now caught two models, so it is
worth stating on its own:

> **A surface that slopes away from the camera projects to a plain rectangle.**

There is no foreshortening to tell you it is sloping and no vanishing point to
tell you which way. Whatever is modelled *behind* something else is simply not
in the picture.

**`fad-home`, the Office row in the contact card, was the clean case.** It had a
*hipped* roof: two thin plates tilted about X, sloping front-to-back from a
ridge running left to right. Perfectly good geometry, and from this camera it
projected to a dark rectangle sitting on a pale box. The icon read as a
cardboard carton with its lid on, and was reported as exactly that.

The fix was to turn the roof ninety degrees. A **gable** — ridge front-to-back,
triangle facing the camera — is the oldest and most legible house there is, and
it survives being eighteen pixels wide, which no amount of shading on a hip
does. It is still a solid: the gable is extruded the full depth of the house
with a bevel on its edges, so turning the icon opens a real ridge and a real
eave. The windows went from `k.c.deep` to glossy `k.c.ocean` in the same pass —
three near-black rectangles on a pale front read as holes knocked through it,
and on the dark scheme they closed up against the page altogether.

**The rule that follows:** model the SILHOUETTE first, and check it head on
before adding anything to it. If a shape only reads once you turn it, it does
not read — because nobody turns it. `tools/preview-icons3d.html` (§20.6) shows
every icon at a size you can judge, which is where this should have been caught.

### 20.5 Motion

Idle motion is small and slow enough to be missed; hover motion is the one that
performs. A page with thirty icons all doing something interesting is a page
nobody can read, and an icon that only moves when pointed at is an icon most
visitors never see move. So: everything breathes, one thing at a time dances.

The earth turns about its axis. The gear turns. The spinner steps eight times a
second. The clock runs backwards. A grain falls through the hourglass. Point at
an envelope and the flap lifts and the letter rises out of it; at a shelf and
the leaning volume rights itself; at an open book and it opens further; at a
cowboy and the hat lifts.

The three on the theme switch are the loud exception, and they have §20.9 to
themselves: the sun turns and throws flares clear of its own box, the moon goes
round a twenty-eight-second lunar month, and the "auto" body is half of each,
turning.

`prefers-reduced-motion` stops all of it: one frame, in the resting pose, and no
animation loop is ever started.

Each row in `registry.js` names its model and, optionally, its motion. Rows with
no motion take the default — a slow turn, a slower nod, and a fraction larger
under the pointer, with a per-instance phase so six copies of one icon do not
move in lockstep.

### 20.6 The workbench

```
python tools/serve.py          (or any static server at the site root)
open http://localhost:8000/tools/preview-icons3d.html
```

Every model, on one page, at whatever size you choose, in either theme, in any
colour, with its sprite id underneath. The models are drawn at fourteen to
twenty-two pixels on the real pages, which is the right size and a hopeless size
to judge a model at — a wrong scale, a part left inside another part, a material
that vanishes on dark, all of it is one look here instead of being found by
accident six pages later. It also flags any sprite id with no model and any
model with no sprite id.

`tools/` is excluded from the shipped site, so this never reaches a visitor.

### 20.7 Adding or changing one

To change a model: edit its builder in `models/`, reload the workbench. Nothing
else refers to it.

To add one: put the symbol in `assets/icons/icons.svg` as usual (§3), write a
builder, and add a row to `REGISTRY`:

```js
'fas-rocket': { family: 'symbols', make: 'rocket' },
```

A row may also carry `motion`, `fill` (how much of its frame the model takes,
default 0.86 — §20.8b) and `bleed` (how far outside its own box it may draw,
default none — §20.9). All three are optional and all three are documented at
the top of `registry.js`.

An id with no row simply stays flat — which is also what a browser with no
WebGL, no Three.js, or a model that throws while being built gets. **There is no
state in which an icon is missing.**

### 20.8 What this supersedes

§17.6b describes a drop-shadow chain that gives the display icons a painted
thickness, and ends by saying that a real extrusion would need the sprite
injected into the document, "a change to how every icon on the site is drawn,
and it is not this one."

This is that change, arrived at from the other side: the sprite is still
referenced rather than injected, and the lighting problem it created is gone
because the lit thing is no longer the sprite. §17.6b still governs every icon
below the scope — which is most of them.

### 20.8b The six on the Summary page

The section cards carry the largest icons on the site, and when they became
modelled objects they came out **visibly smaller and quieter than the glyphs
they replaced**. Two causes, and both are now fixed.

*They were fitted too small.* A Font Awesome symbol is drawn to the edge of its
viewBox; a model is fitted to `FIT` — 0.86 of a 1.2-unit frame, about 72 per
cent of the icon's box — and the rest is room to turn in. Several of these
models made it worse by being mostly air: a laurel wreath is a thin ring, so at
72 per cent of a 21-pixel box its stroke came out about two pixels and the icon
read as nothing at all.

The turning room is not needed equally by everything. A clock face or a medal is
a disc — turn it about the vertical axis and its silhouette only gets narrower —
where a shelf of books is deep and cannot be drawn to the edge. So a registry row
may now set its own **`fill`**, and the six on this row take between 0.88 and
1.14 where the default is 0.86. It is per model because it is a fact about that
model's shape, and the only honest way to set one is to measure: the workbench
for the look, and a full hover cycle for whether the silhouette ever touches the
frame. The tile they sit in and the icon inside it also grew, 2.75 → 3.2 rem and
1.35 → 2 rem.

*Two of them were the wrong picture.* Honors & Awards was a laurel wreath, which
is not what "award" means to most readers and was the worst sufferer of the thin
-ring problem; it is now **`fad-award`**, a medal on a ribbon, in all four places
that icon appears (the card, the nav panel, the page's section heading and its
section-bar chip). And the Research Team card is now a reader who actually
reads: the book **swings open and shut continuously** and the arms move with the
covers, driven off one number in `readAloud`. That breaks the motion rule in
§20.5 on purpose — an icon this large, on the row a visitor looks straight at,
is the one place where standing still is a worse answer than the flat glyph.

**It swung the wrong way for a while, and the fix is a sign.** The covers
dropped *downward*, away from the reader's face, as the book shut — the
fore-edges travelling about a third of the model's height in the wrong
direction, with the two page faces splaying apart from 11° to 89° instead of
closing on each other. That is a paperback being bent backwards over a knee, and
at this size the eye reads the direction of a movement long before it reads the
object making it, so the whole icon read as wrong without it being obvious why.

The cause was that `bookReader` was built on `openBook()`'s default fold, which
puts the fore-edges *below* the gutter. That default is right for
`fad-book-open` — a book lying open on a table, seen from underneath — and wrong
for one being held. `openBook()` now takes **`fold: 'up'`**, `bookReader` asks
for it, and `readAloud` swings the matching way; `fad-book-open` passes nothing
and is byte-for-byte what it was.

**The two ends have to agree.** The model rests at −`OPEN_REST` / +`OPEN_REST`
and the motion function drives −`angle` / +`angle`; flip one without the other
and the icon jumps between the pose it was measured for and the pose it is drawn
at, because `fitToFrame` scales from the resting pose. The constant is exported
from `models/paper.js` and written out again in `registry.js` — deliberately,
since the model families are `import()`ed lazily and a static import for one
number would drag the whole family into the initial load.

**Then the arms had to go, and that was the bigger correction.** The figure had
a torso with two limbs hanging over the book, and at the size this is actually
drawn they read as **legs** — a figure sitting astride an open book. Which is
what they are, geometrically: two limbs coming out of a body and hanging down
over something. Nothing about the modelling was wrong; the reading was, and a
reading is the only thing an icon has.

Three reference icons of a reader were supplied, and not one of them draws an
arm. They all do the same thing: a head, a pair of shoulders, a book held up
across the chest, and **two small hands on its outer edges**. The limbs are
implied by where the hands are and the eye completes them — more legible at
eighteen pixels, and less to get wrong. So:

- **No arms, and no torso to hang them from.** `figure()` is a head and a pair
  of shoulders. The old profile was a dome 0.24 across and 0.31 tall — taller
  than it was wide on each side of the axis — so it came out as a blob under a
  ball and the pair read as a skittle. Shoulders are wider than they are tall;
  the profile is now 0.34 across and 0.26 up. A collar was added so the head
  meets them at a neck instead of sinking into them.
- **The hands are children of the covers.** Not siblings driven in parallel:
  `half.add(hand)`, so turning a cover turns the hand on it, exactly and for
  free. That deleted the two arm angles `readAloud` used to derive from `angle`
  and keep in step — a second copy of the truth, which is a thing to remove
  rather than a thing to maintain. A hand can no longer drift off the edge of
  the page it is gripping, because there is nothing left to disagree.
- **The book moved up to overlap the chest.** It used to sit clear of the body
  with a gap the arms bridged; with the arms gone that gap read as a book
  floating below a bust. The overlap now does the job the arms were doing — it
  is what says the figure is *holding* it.
- **The spine is off.** `openBook` takes `spine: false` for this icon. A spine
  is right for a book lying open on a table; on one held up and tipped toward
  you its near end drops below the covers and prints as a black wedge under the
  middle of the book, which read as a stand.

The head-to-book proportion was then set against the references rather than by
eye: the figure went to 1.4 and the book down to 1.3, because at the first
attempt the head was about a fifth of the book's width where every reference
has it nearer a half.

**It is measured, not just looked at.** `fitToFrame` scales a model once, at its
resting pose, and this one changes shape continuously — so a later pose can be
wider than the pose the fit was computed from and push outside its tile. Across
the whole swing the widest pose is **1.012×** the side the fit used, against a
ceiling of 1.136× at this icon's `fill` of 0.88. It has room.

*And one of them works.* Projects & Services is a factory with two chimneys and
two columns of smoke, and the smoke **leaves the icon**: up, leaning, swelling,
thinning, out of the tinted tile and over the card behind it, at about two and a
half times the icon's own box. That is `bleed` again (§20.9). The puffs are a
pool built once and re-used for ever, and each one's fade is timed to run out
while it is still inside the frame — a puff cut off square by the canvas edge
reads as a rendering fault, where a puff that thins into nothing reads as smoke.

**The tile size is now chosen per page.** The renderer draws every icon into a
square of `TILE` device pixels; it was a fixed 96, and once the cards grew and
the factory was given room, that was wrong in both directions — an 18-pixel
heading wanted 36 and got nearly 3× supersampling it did not need, while the
factory wanted 160 and was rendered at 96 and stretched. `chooseTile()` now
measures the page's own icons at start-up, so the renderer is still created
exactly once and never resized, just at the right size. In practice:

| page | icons | tile |
|---|---|---|
| Summary | 31 | 160 |
| Projects & Services | 18 | 112 |
| every other page | 16–38 | 96 |

The cost is quadratic, so this matters: measured in software rendering a pass at
160 costs about 1.44× one at 96. Hard-coding 160 would have billed every page on
the site for one icon on one of them.

### 20.9 The three on the theme switch

The sun, the moon and the half-and-half body in the top bar are the exception to
almost everything above, and deliberately so. Everywhere else an icon is a
label — it sits in front of a heading and says "publication" or "building", and
the right amount of motion is the amount nobody notices. The theme switch is the
one control on the site whose subject *is* light, and its three segments are
otherwise indistinguishable. So these three are drawn as the things themselves.

All three are spheres of the same radius, turning about or lit about the same
vertical axis, so the row reads as three views of one idea.

**Light — a photograph of the sun.** `assets/img/texture/sun-surface.jpg` is a
512 × 256 crop of an SDO image of the photosphere, mirrored about its own edge
so it tiles horizontally without a seam, which is what lets the sphere turn
continuously. 33 KB, used as both the diffuse and the emissive map, so the body
is lit from inside. It is the only photograph in the whole icon set, and it is
here because the sun has no *parts* to model — granulation is a surface, and no
arrangement of cones and spheres produces one.

Seven flares stand off the limb, each picking a fresh direction every eruption
and reaching, at full length, about two and a quarter times the icon's own box —
outside the button altogether. That is what `bleed` is for: a row may ask for a
canvas larger than its icon, and `index.js` then hangs the oversized canvas off
the icon's box, scales the model down by the same factor so the body still comes
out the standard size, and sets `data-icon3d-bleed` — which is what
components.css §5c keys `overflow: visible` and the stacking order off. It is
the only row in the table that uses it.

The flares' directions come from a hash of the eruption number rather than from
`Math.random()`, so the top bar photographs the same twice.

**Dark — the moon, through a lunar month.** New, waxing crescent, first quarter,
gibbous, full, and back, at a day a second: twenty-eight seconds to the cycle,
the slowest motion on this site by a wide margin. It is not an animation anyone
watches; it is a state the icon is in, different every time you come back.
Pointing at it runs the month through in about three seconds.

The phase is **not** made with light, and could not be: there is one key light,
shared by the whole icon set, in a fixed place. It is made with an opaque
half-shell a hair larger than the moon, covering the hemisphere turned away from
the sun, rotated about the vertical axis. That is the real geometry — the rim of
a half-shell is a great circle, and a great circle seen from outside projects to
an ellipse, which is exactly what a terminator is — so every crescent and
gibbous comes out right with no trigonometry anywhere.

The dark side is nearly black but not black: a pure new moon would leave that
button empty for a couple of seconds every half minute.

**Auto — half of each.** One body, the sun's photographed surface on one
hemisphere and the moon's rock and craters on the other, joined at a bright
meridian, turning steadily. Which is what the button means: "auto" is not a
third theme, it is the other two, and which one you get depends on which way the
world has turned.

Two details in there are worth stealing. Craters are a darker floor plus a
raised **rim ring** — the ring is the whole thing, because what says "crater" is
not the shadow in the middle but the lit wall on one side of it. And the flames
are a nearly black surface with a bright emissive: this scene has a lot of white
light in it, so a flame built the obvious way, orange surface and orange glow,
comes back a flat khaki. Take the diffuse to almost nothing and the emission is
the whole of the colour.
