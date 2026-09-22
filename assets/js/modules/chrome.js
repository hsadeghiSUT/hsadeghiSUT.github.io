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
 * chrome.js — the furniture that surrounds every page.
 *
 * The navigation bar, page heading, sidebar link lists and footer used to be
 * copy-pasted into all seven HTML files, which meant adding a menu item was a
 * seven-file edit. They are now built here from `data/site.json`, so a single
 * line in that file changes every page at once.
 */

import { $, el, fill } from './dom.js';
import { icon, brandImage } from './icons.js';
import { markFor, arriving } from './bismillah/marks.js';

/* -------------------------------------------------------------------------- */
/* Top navigation                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Build the tab bar and wire up the mobile drawer.
 * @param {object} site     Parsed site.json
 * @param {string} pageId   Which nav entry is the current page
 */
export function renderNav(site, pageId) {
  const list = $('#nav-list');
  const toggle = $('#nav-toggle');
  if (!list) return;

  fill(
    list,
    site.nav.map((item) =>
      el(
        'li',
        {},
        el('a', {
          class: 'mainnav__link',
          href: item.href,
          title: item.title || item.label,
          'aria-current': item.id === pageId ? 'page' : null,
          text: item.label,
        }),
      ),
    ),
  );

  if (!toggle) return;

  // Desktop shows the list unconditionally via CSS; `hidden` only matters below
  // the 1024px breakpoint, so we mirror that media query here.
  const wide = window.matchMedia('(min-width: 64rem)');
  const sync = () => {
    if (wide.matches) {
      list.hidden = false;
      toggle.setAttribute('aria-expanded', 'false');
    } else {
      list.hidden = toggle.getAttribute('aria-expanded') !== 'true';
    }
  };

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    list.hidden = open;
  });

  // Tapping a link, pressing Escape or resizing past the breakpoint all close it.
  list.addEventListener('click', (e) => {
    if (e.target.closest('a') && !wide.matches) {
      toggle.setAttribute('aria-expanded', 'false');
      list.hidden = true;
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !wide.matches && !list.hidden) {
      toggle.setAttribute('aria-expanded', 'false');
      list.hidden = true;
      toggle.focus();
    }
  });
  wide.addEventListener('change', sync);
  sync();

  initStickyBar();
}

/**
 * Give the sticky top bar a shadow once the page has scrolled beneath it.
 *
 * Part of the 2026 refresh: the bar sits flat against the page at rest and
 * lifts off it in use, which is what makes a sticky header read as a layer
 * rather than as part of the document.
 *
 * Uses a sentinel element and IntersectionObserver rather than a scroll
 * listener, so there is no work done per scroll event at all.
 */
function initStickyBar() {
  const bar = $('.topbar');
  if (!bar || !('IntersectionObserver' in window)) return;

  const sentinel = el('div', { 'aria-hidden': 'true' });
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;';
  document.body.prepend(sentinel);

  new IntersectionObserver(
    ([entry]) => bar.classList.toggle('is-stuck', !entry.isIntersecting),
    { threshold: 0 },
  ).observe(sentinel);
}

/* -------------------------------------------------------------------------- */
/* Sidebar widgets                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A panel of links. Used both for the site-wide "Pages" widget on the home page
 * and for the in-page section jump lists on every other page.
 *
 * @param {string} title
 * @param {Array<{href:string,label:string,icon?:string,title?:string,current?:boolean}>} links
 * @param {object} [opts]  `{ logo: true }` appends the round logo mark.
 */
export function linkPanel(title, links, opts = {}) {
  return el(
    'section',
    { class: 'panel' },
    el('h2', { class: 'panel__title', text: title }),
    el(
      'div',
      { class: 'panel__body' },
      el(
        'ul',
        { class: 'panel__list' },
        links.map((link) =>
          el(
            'li',
            {},
            el(
              'a',
              {
                href: link.href,
                title: link.title || link.label,
                class: 'hov-parent',
                'aria-current': link.current ? 'page' : null,
              },
              icon(link.icon, { class: 'hov-horizontal' }),
              el('span', { text: link.label }),
            ),
          ),
        ),
      ),
      opts.logo
        ? el('img', {
            class: 'panel__logo hov-bounce',
            src: 'assets/img/logos/logo.png',
            alt: '',
            width: 130,
            height: 130,
            loading: 'lazy',
          })
        : null,
    ),
  );
}

/**
 * The Research Identifiers / Professional Social Networks panels.
 * Entries carry either a sprite `icon` id or an `image` file name.
 */
export function profilePanel(group) {
  return el(
    'section',
    { class: 'panel' },
    el(
      'h2',
      { class: 'panel__title' },
      icon(group.icon, { class: 'anim-pulse' }),
      el('span', { text: group.title }),
    ),
    el(
      'div',
      { class: 'profile-list' },
      group.items.map((item) =>
        el(
          'div',
          { class: 'profile-list__row' },
          el(
            'a',
            {
              href: item.url,
              target: '_blank',
              rel: 'noopener',
              class: 'hov-parent',
            },
            item.image
              ? brandImage(item.image, item.label)
              : icon(item.icon, { class: `hov-pulse ${brandColour(item.id)}` }),
            brandLabel(item),
          ),
        ),
      ),
    ),
  );
}

/** Brand tint for the icon-based rows. */
function brandColour(id) {
  return (
    {
      orcid: 'c-orcid',
      rgate: 'c-rgate',
      linkedin: 'c-linkedin',
      mendeley: 'c-mendeley',
    }[id] || ''
  );
}

/**
 * The original hand-wrote per-letter <span>s to colour the Google Scholar
 * wordmark and to give Publons / SciExplore / Academia their two-tone look.
 * Reproduced here so nothing about the sidebar changes visually.
 *
 * Every one of these is marked `data-logotype`. That attribute is not
 * decoration: WCAG 1.4.3 exempts "text that is part of a logo or brand name"
 * from the contrast minimum, and these are brand wordmarks reproduced in each
 * brand's own colour — Scopus orange, ResearchGate teal, ORCID green, the four
 * Google letters. Recolouring them to pass a contrast meter would mean not
 * reproducing the logos, which is the one thing this site is required to do.
 * `tools/check-contrast.mjs` skips anything carrying the attribute, so the
 * exemption is declared in the markup rather than hidden in a list inside the
 * checker. Do not put it on ordinary text.
 */
function brandLabel(item) {
  const node = brandWordmark(item);
  if (item.id !== 'semantic') node.setAttribute('data-logotype', '');
  return node;
}

function brandWordmark(item) {
  switch (item.id) {
    case 'scholar':
      return el('span', {
        class: 'gs',
        html: '<i>G</i><i>o</i><i>o</i><i>g</i><i>l</i><i>e</i><span>&nbsp;Scholar</span>',
      });
    case 'publons':
      return el('span', {
        html: '<span style="background:#326395;color:#fff;font-family:\'Times New Roman\',Times,serif;padding:0 .15em">P</span><span class="c-publons">ublons</span>',
      });
    case 'linkedin':
      return el('span', {
        // #0073b0 with the original #e9e5df sits at 4.1:1; a shade deeper and
        // pure white clears AA while staying unmistakably LinkedIn blue.
        html: '<span class="c-linkedin">Linked</span><span style="background:#00618f;color:#fff;padding:0 .15em">in</span>',
      });
    case 'sciexplore':
      return el('span', {
        html: '<span class="c-sciexplore">Sci</span><span style="background:#007398;color:#fff;font-weight:lighter;padding:0 .15em">Explore</span>',
      });
    case 'semantic':
      return el('span', {
        html: '<span style="font-weight:lighter">Semantic&nbsp;</span><span style="font-weight:900">Scholar</span>',
      });
    case 'orcid':
      return el('span', { html: '<span class="c-orcid-grey">ORC<span class="c-orcid">ID</span></span>' });
    case 'scopus':
      return el('span', { class: 'c-scopus', text: item.label });
    case 'rgate':
      return el('span', { class: 'c-rgate', text: item.label });
    case 'mendeley':
      return el('span', { class: 'c-mendeley', text: item.label });
    case 'academia':
      return el('span', { class: 'c-academia', text: item.label });
    default:
      return el('span', { text: item.label });
  }
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

export function renderFooter(site) {
  const host = $('#site-footer');
  if (!host) return;
  const f = site.footer;
  fill(
    host,
    /* The two credit lines are a ROW of their own, and the notice is a third
       thing under both of them.

       The obvious build is three paragraphs in the flex container, and it puts
       the notice under the copyright line and leaves the "designed by" line
       floating at the vertical middle of a two-line block — level with neither.
       Wrapping the two lines in a row keeps them level with each other, which
       is what was asked for, and lets the notice run the full width beneath. */
    el(
      'div',
      { class: 'footer__row' },
      el(
        'p',
        {},
        copyrightMark(),
        ` ${new Date().getFullYear()} ${site.name}. All rights reserved.`,
      ),
      el(
        'p',
        {},
        `${f.credit} `,
        heartMark(),
        ' by ',
        el('a', { href: f.authorUrl, target: '_blank', rel: 'noopener', text: f.authorName }),
        '.',
      ),
    ),
    /* The terms, in the smallest type on the site. The glyph is a separate
       element because it is the only part of the sentence that is lit — see
       layout.css §5, and note that it is `--c-brand-ink` rather than
       `--c-brand`: the brand cyan is 1.9:1 on the page and cannot legally
       carry a letter. The glow around it is the bright cyan. */
    f.notice
      ? el(
        'p',
        { class: 'footer__note' },
        el('span', { class: 'footer__note-mark', text: '©' }),
        ` ${f.notice}`,
      )
      : null,
    /* The footer used to end with a second back-to-top link, inherited from the
       original site. It is gone: `backtotop.js` puts one control on the page
       that is there whenever it is wanted and nowhere near the content, which
       makes a duplicate at the very bottom — the one place you have already
       finished scrolling to — redundant. */
  );
}

/**
 * The copyright mark at the head of the footer line.
 *
 * The character goes in immediately and the modelled one replaces it only once
 * Three and WebGL have both answered — `data-mark="three"` on the wrapper is
 * what hides the character, so the line never has a hole in it. The character
 * is also what a screen reader gets either way: the canvas is decorative and
 * the wrapper carries the label.
 */
function copyrightMark() {
  const canvas = el('canvas', { class: 'mark3d__canvas', 'aria-hidden': 'true' });
  const wrap = el(
    'span',
    { class: 'mark3d', role: 'img', 'aria-label': 'Copyright' },
    canvas,
    el('span', { class: 'mark3d__flat', 'aria-hidden': 'true', text: '©' }),
  );

  import('./copyright3d.js')
    /* Kept on `window` for `tools/check-ui.mjs`, which cannot photograph a
       drop mid-fall reliably and asks the module what it is doing instead. */
    .then(({ mountCopyright }) => mountCopyright(wrap, canvas))
    .then((mark) => { if (mark) window.__copyright = mark; })
    .catch(() => { /* the character stays */ });

  return wrap;
}

/**
 * The heart in the footer line.
 *
 * The sprite goes in immediately and the modelled one replaces it only once
 * Three and WebGL have both answered — `data-heart="three"` on the wrapper is
 * what hides the sprite, so the sentence never has a hole in it. See
 * `modules/heart3d.js` for what the solid is and why it is not an extrusion.
 */
function heartMark() {
  const canvas = el('canvas', { class: 'heart3d__canvas', 'aria-hidden': 'true' });
  const wrap = el(
    'span',
    { class: 'heart3d', role: 'img', 'aria-label': 'love' },
    canvas,
    icon('fas-heart', { class: 'anim-pulse c-accent heart3d__flat' }),
  );

  /* Not awaited and not on the critical path: the footer is complete without
     it, and it is at the bottom of the page in any case. */
  import('./heart3d.js')
    .then(({ mountHeart }) => mountHeart(wrap, canvas))
    .catch(() => { /* the sprite stays */ });

  return wrap;
}

/* -------------------------------------------------------------------------- */
/* Page heading                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The calligraphic mark in the top left.
 *
 * The PNG goes in immediately and the modelled mark replaces it only once the
 * trace, Three and WebGL have all answered — `data-bismillah="three"` on the
 * wrapper is what hides the poster, so the header never has a hole in it.
 *
 * The light — the meteor on the border and the columns standing off it — is
 * built by the module rather than written here, because both of them are
 * recomputed from the mesh's own rotation every frame. See
 * `modules/bismillah/index.js` for why that has to be so, and why the camera
 * is orthographic.
 */
function bismillahMark(site) {
  /* Which mark, decided synchronously. `marks.js` is tiny and imported at the
     top of this file precisely so that this line can run before the first
     paint: the poster below has to be the right one from the start, and the
     solid that replaces it a moment later has to be the same one. */
  const mark = markFor(document.body.dataset.page);
  const arrive = arriving(mark);

  const canvas = el('canvas', { class: 'bismillah__canvas', 'aria-hidden': 'true' });
  const lights = el('span', { class: 'bismillah__lights', 'aria-hidden': 'true' });
  const wrap = el(
    'span',
    { class: 'bismillah' },
    el('span', { class: 'bismillah__aura', 'aria-hidden': 'true' }),
    el('img', {
      class: 'bismillah__poster',
      /* The poster, not the artwork. Both source PNGs have their transparency
         flattened — each has a checkerboard painted into it — so neither can be
         shown as-is at any size. `tools/trace-bismillah.py` writes these: the
         same mark, cut out against real alpha, at twice the size it is drawn. */
      src: mark.poster,
      alt: '',
      width: 56,
      height: 56,
      loading: 'eager',
      decoding: 'async',
    }),
    canvas,
    lights,
  );

  /* Not awaited: the header is complete without it. */
  import('./bismillah/index.js')
    .then(({ mountBismillah }) => mountBismillah(
      wrap, canvas, lights, wrap.closest('.brand') || wrap, mark, arrive,
    ))
    .catch(() => { /* the poster stays */ });

  return wrap;
}

export function renderBrand(site) {
  const host = $('#brand');
  if (!host) return;
  fill(
    host,
    el(
      'a',
      { class: 'brand', href: 'index.html', 'aria-label': `${site.name} — home` },
      /* The mark, with light around it — the aura behind, the meteor and the
         shafts in front. All of it is decoration and all of it is marked as
         such; the link's aria-label is what carries the meaning. See fx.css
         §9. */
      bismillahMark(site),
      el(
        'span',
        { class: 'brand__text' },
        el('span', { class: 'brand__name', text: site.name }),
        // Keeps the `masthead__fa` class: that is the hook farsi.css uses to
        // pin the Persian name's face and size. Do not rename it.
        el('span', { class: 'masthead__fa', lang: 'fa', dir: 'rtl', text: site.nameFa }),
      ),
    ),
  );
}

/*
 * `renderAliases()` used to live here.
 *
 * It filled a `visually-hidden`, `aria-hidden` div with 37 spellings of the
 * name — carried over from the original WordPress site, which had them as a
 * stack of near-invisible <h2>s. Text hidden from users but served to crawlers
 * is what Google's spam policies call hidden text, and most of those 37 were
 * not name variants at all but whole search queries ("حامد صادقی مهندسی
 * ژئوتکنیک دانشگاه صنعتی شریف").
 *
 * The genuine name forms are now in `alternateName` in the structured data
 * (§21.2), which is the sanctioned way to say the same thing. Removed
 * 2026-09-23; §21.5 has the reasoning.
 */
