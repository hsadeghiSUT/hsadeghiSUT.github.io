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
 * theme.js — light / dark colour scheme switching.
 *
 * ── The model ───────────────────────────────────────────────────────────────
 * There are three *preferences* but only two *themes*:
 *
 *     preference        resolves to
 *     ──────────        ───────────
 *     'light'           light
 *     'dark'            dark
 *     'auto' (default)  whatever the operating system is set to, live
 *
 * "Auto" is a real, selectable option rather than just the absence of a choice.
 * Someone whose laptop switches to dark at sunset gets the site switching with
 * it, and can see at a glance that that is what is happening.
 *
 * ── How it reaches the CSS ──────────────────────────────────────────────────
 * The preference is written as one attribute on the <html> element:
 *
 *     <html data-theme="light">    forced light
 *     <html data-theme="dark">     forced dark
 *     <html>                       no attribute — follow the system
 *
 * theme.css keys off that attribute. Deliberately, "auto" removes the attribute
 * rather than setting `data-theme="auto"`: with no attribute present the plain
 * `@media (prefers-color-scheme: dark)` rule applies, so the browser does the
 * following for us and there is nothing to keep in sync.
 *
 * ── Persistence ─────────────────────────────────────────────────────────────
 * The choice is stored in localStorage under `hs-theme`. It is read back by a
 * tiny inline script in each page's <head> — see the `PRE_PAINT_SNIPPET` note
 * at the bottom of this file — so the correct colours are applied before the
 * first paint and there is never a flash of the wrong theme.
 *
 * Every localStorage call is wrapped: Safari in private mode and some locked-
 * down corporate profiles throw on access. If storage is unavailable the site
 * still works, it just forgets the choice when the tab closes.
 */

import { el } from './dom.js';
import { icon } from './icons.js';

/** localStorage key. Change it here and in the inline <head> snippet together. */
const STORAGE_KEY = 'hs-theme';

/** The three options, in the order they appear in the switch. */
const OPTIONS = [
  { value: 'light', label: 'Light',            icon: 'fad-sun',        hint: 'Always use the light theme' },
  { value: 'auto',  label: 'Match my device',  icon: 'fad-adjust',     hint: 'Follow the system setting' },
  { value: 'dark',  label: 'Dark',             icon: 'fad-moon-stars', hint: 'Always use the dark theme' },
];

/** The `<meta name="theme-color">` value per resolved theme — this is what tints
 *  the browser chrome on Android and the status bar on iOS. */
const META_COLOR = { light: '#00CCFF', dark: '#14171c' };

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

function readPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

function writePreference(pref) {
  try {
    if (pref === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* Storage blocked — the theme still applies, it just will not persist. */
  }
}

/** Turn a preference into the theme actually on screen. */
const resolve = (pref) => (pref === 'auto' ? (systemDark.matches ? 'dark' : 'light') : pref);

/* -------------------------------------------------------------------------- */
/* Applying                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Put a preference into effect.
 *
 * @param {'light'|'dark'|'auto'} pref
 * @param {boolean} animate  Cross-fade the colours. False on first load, where
 *                           the theme is already correct and a fade would just
 *                           look like the page repainting itself.
 */
function apply(pref, { animate = false } = {}) {
  const root = document.documentElement;

  if (animate) startCrossFade(root);

  if (pref === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLOR[resolve(pref)]);
}

/**
 * Colour transitions are normally off — see the `.theme-anim` note in theme.css.
 * They are switched on for the length of one change and then switched off again,
 * so hovers stay snappy and the initial paint does not wash in.
 */
let fadeTimer;
function startCrossFade(root) {
  root.classList.add('theme-anim');
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => root.classList.remove('theme-anim'), 400);
}

/* -------------------------------------------------------------------------- */
/* The control                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Build the three-way switch and wire it up.
 *
 * Accessibility notes:
 *  - It is a `radiogroup`, because the three options are mutually exclusive —
 *    that is what a screen reader announces ("Colour theme, Dark, 3 of 3").
 *  - Roving tabindex: one Tab press enters the group, then Left/Right (or
 *    Up/Down) move between options, per the WAI-ARIA radio pattern. Home and
 *    End jump to the ends.
 *  - `aria-checked` is the single source of truth; the CSS styles the selected
 *    segment off that attribute rather than a separate class, so the visual
 *    state and the announced state cannot drift apart.
 *
 * @param {HTMLElement} host  The mount point (`#theme-toggle` in the page shell)
 */
export function renderThemeSwitch(host) {
  if (!host) return;

  let current = readPreference();

  const group = el('div', {
    class: 'theme-switch',
    role: 'radiogroup',
    'aria-label': 'Colour theme',
  });

  const buttons = OPTIONS.map((opt) => {
    const checked = opt.value === current;
    const btn = el(
      'button',
      {
        type: 'button',
        class: 'theme-switch__btn',
        role: 'radio',
        'aria-checked': String(checked),
        'aria-label': opt.label,
        title: opt.hint,
        tabindex: checked ? '0' : '-1',
        dataset: { themeValue: opt.value },
      },
      icon(opt.icon),
    );
    btn.addEventListener('click', () => select(opt.value, { focus: false }));
    return btn;
  });

  group.append(...buttons);
  host.replaceChildren(group);

  /** Move selection to `value`, update the DOM, persist, and repaint. */
  function select(value, { focus = true } = {}) {
    const changed = value !== current;
    current = value;

    buttons.forEach((btn) => {
      const isOn = btn.dataset.themeValue === value;
      btn.setAttribute('aria-checked', String(isOn));
      btn.tabIndex = isOn ? 0 : -1;
      btn.classList.toggle('is-picked', isOn && changed);
      if (isOn && focus) btn.focus();
    });

    // Let the pop animation finish, then clear the class so it can run again.
    if (changed) setTimeout(() => buttons.forEach((b) => b.classList.remove('is-picked')), 500);

    writePreference(value);
    apply(value, { animate: changed });
  }

  /* Arrow-key navigation across the group. */
  group.addEventListener('keydown', (e) => {
    const index = OPTIONS.findIndex((o) => o.value === current);
    let next = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % OPTIONS.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + OPTIONS.length) % OPTIONS.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = OPTIONS.length - 1;
        break;
      case ' ':
      case 'Enter':
        // The buttons already fire click for these; stop the page scrolling.
        e.preventDefault();
        return;
      default:
        return;
    }
    e.preventDefault();
    select(OPTIONS[next].value);
  });

  /* When the preference is "auto", follow the system as it changes — no reload
     needed if the OS flips to dark at sunset while the page is open. */
  const onSystemChange = () => {
    if (current === 'auto') apply('auto', { animate: true });
  };
  if (systemDark.addEventListener) systemDark.addEventListener('change', onSystemChange);
  else systemDark.addListener(onSystemChange); // Safari < 14

  /* Another tab on the same site changed the theme — mirror it here. */
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const pref = readPreference();
    if (pref !== current) select(pref, { focus: false });
  });
}

/**
 * Re-assert the stored preference once the module loads.
 *
 * The inline <head> snippet has already done this before first paint; calling it
 * again is cheap and makes the module self-contained, so the switch still works
 * on a page where the snippet was left out.
 */
export function initTheme() {
  apply(readPreference(), { animate: false });
}

/* -----------------------------------------------------------------------------
 * PRE_PAINT_SNIPPET
 * -----------------------------------------------------------------------------
 * This is the copy that lives inline in every page's <head>. It has to be inline
 * and synchronous: an external module would load after first paint, and dark-
 * mode visitors would see a white flash on every navigation.
 *
 *     <script>
 *       try {
 *         var t = localStorage.getItem('hs-theme');
 *         if (t === 'light' || t === 'dark') {
 *           document.documentElement.setAttribute('data-theme', t);
 *         }
 *       } catch (e) {}
 *     </script>
 *
 * If you change STORAGE_KEY above, change it there too — in all seven pages.
 * -------------------------------------------------------------------------- */
