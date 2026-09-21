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
 * index.js — the icons, as solid objects.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  TO GO BACK TO FLAT ICONS EVERYWHERE, SET `ENABLED` TO FALSE, BELOW.     │
 * │  Nothing else has to change. The flat Font Awesome sprite is still the   │
 * │  markup on every page; this module only ever hides it. README §20.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * WHAT THIS DOES
 * --------------
 * Finds the display-size icons on the page, and draws each one as a real
 * modelled object — lit from the upper left like everything else on this site,
 * turning slowly, and doing something of its own when you point at it. The
 * building in front of "Department of Civil Engineering" is a building. The
 * globe on "Visiting Scholars" is the earth, and it turns about its axis.
 *
 * HOW IT DRAWS THEM — one renderer, many canvases
 * -----------------------------------------------
 * A browser allows about sixteen live WebGL contexts and the Publications page
 * already holds eight, so one context per icon is not available. README §12
 * records the two ways round that were considered before this one, and why the
 * obvious one is worse than it looks:
 *
 *   *One big canvas over the document, scissored per icon.* It works, and it
 *   costs a second layout engine: the canvas is fixed to the viewport, so every
 *   icon's rectangle has to be recomputed on every scroll and every reflow, and
 *   an icon that scrolls under the sticky header paints straight over it
 *   because the canvas is one element with one z-index.
 *
 *   *What this does instead.* ONE WebGL renderer, offscreen and never in the
 *   document, plus a small ordinary 2D `<canvas>` sitting inside each icon.
 *   Each frame the renderer draws sixteen icons into one canvas as a four-by-
 *   four grid, and then blits each cell into its icon's own canvas with
 *   `drawImage` — see `GRID` for why they are batched rather than done one at a
 *   time. The canvases are in the flow, so the browser does the layout, the
 *   stacking, the clipping and the scrolling — all of it, for free, correctly,
 *   including inside the sticky section bar. There is no rectangle bookkeeping
 *   anywhere in this file.
 *
 * WHERE THE CANVAS GOES — inside the SVG
 * --------------------------------------
 * Each canvas is put in a `<foreignObject>` inside the existing
 * `<svg class="icon">`, rather than beside it. That is deliberate and it is
 * load-bearing: the stylesheets are full of selectors like
 * `.entry-section > h3 > .icon` and `.card__icon .icon`, and wrapping the SVG
 * or adding a sibling would quietly break some of them. Inside the SVG, the
 * document structure is byte-for-byte what it was — same element, same parent,
 * same box, same baseline. The flat glyph is hidden with `display: none` on the
 * `<use>`, which is the only change to how any icon renders.
 *
 * WHAT IT COSTS, AND WHAT IT REFUSES TO COST
 * ------------------------------------------
 *   · Nothing until the page is drawn. `main.js` starts it last and never
 *     awaits it.
 *   · Nothing on a page with no eligible icons — the models are not fetched.
 *   · Only the families a page actually uses are downloaded. Publications pulls
 *     `paper` and `symbols`; it never sees `brands` or `architecture`.
 *   · Only icons on screen are drawn; an IntersectionObserver stops the rest.
 *     Scroll past the section bar and its chips stop costing anything.
 *   · Nothing while the tab is hidden, and nothing after the last visible icon
 *     goes off screen — the loop stops rather than idling.
 *   · One resting frame and no loop at all under `prefers-reduced-motion`.
 *   · About 3.2 ms of main-thread work per frame for all thirty-one icons on
 *     the Summary page, measured — `window.__icons3d.benchmark()`.
 *
 * WHAT HAPPENS WHEN IT CANNOT RUN
 * -------------------------------
 * No Three.js, no WebGL, an exception anywhere in a model, a browser without
 * `foreignObject` — every one of them ends the same way: this module returns,
 * the `<use>` is never hidden, and the page keeps the flat icons it was built
 * with. There is no state in which an icon is missing.
 */

import { loadThree } from '../fx/three.js';
import { kit } from './lib.js';
import { FAMILIES, REGISTRY, entry, defaultMotion } from './registry.js';

/* ========================================================================== */
/* THE SWITCH                                                                 */
/* ========================================================================== */

/**
 * Master switch. `false` turns every icon on the site back into the flat Font
 * Awesome glyph it has always been, immediately and completely.
 *
 * There is also a per-visitor override that needs no edit at all, for checking
 * a page both ways without touching the source:
 *
 *     localStorage.setItem('hs-icons3d', 'off');   // then reload
 *     localStorage.removeItem('hs-icons3d');       // back to normal
 *
 * and a per-page one, for a single page:
 *
 *     <html data-icons3d="off">
 *
 * README §20 documents all three.
 */
export const ENABLED = true;

/* ========================================================================== */
/* SCOPE — which icons become objects                                         */
/* ========================================================================== */

/**
 * The icons that are upgraded.
 *
 * NOT EVERY ICON, AND THAT IS THE POINT. The Research Team page carries about
 * 196 icons, of which roughly 190 are the twelve-pixel markers in front of a
 * student's topic and date. A modelled object at twelve pixels is not an
 * object, it is four pixels of highlight on something that was drawn to be read
 * at that size — and 190 of them would be 190 canvases and 190 renders a frame
 * for no gain anyone can see.
 *
 * So this list is the display icons: the ones big enough to hold a form, and
 * the ones a visitor actually looks at. It is the same set as the depth-filter
 * list at components.css §5b, plus the places that list was too cautious about.
 *
 * To put a new place in scope, add its selector here. To take one out, delete
 * the line — the icons there go back to being flat, and nothing else changes.
 */
export const SCOPE = [
  '.card__icon .icon',            // the six section cards on Summary
  '.entry-section > h3 > .icon',  // every section heading on every page
  '.panel__title .icon',          // sidebar panel headings
  '.panel__list a .icon',         // the Pages list — seven icons
  '.profile-list__row a .icon',   // ORCID, ResearchGate, LinkedIn, Mendeley
  '.secnav__chip .icon',          // the sticky section bar
  '.section-head .icon',
  '.hero__roles .icon',
  '.hero__affil .icon',           // the building before the department
  '.hero__actions .icon',         // Email and ORCID on the hero
  '.contact .icon',               // the Contact panel's rows
  '.interests .icon',             // Research Interests
  /* The 32 award stars on the Honors page. They are 16 px, which is the
     smallest thing in this list, and they are in it anyway: a star is the one
     glyph in the set whose whole character is that it has facets, they are the
     signature of that page, and there is nothing else on it to look at. */
  '.honour__title .icon',
  '.theme-switch__btn .icon',     // the sun, the moon and the body that is half of each
  '.totop__icon',                 // back to top
];

/* NOT in the list, deliberately: the lightbox's close mark. The lightbox builds
   its own markup the first time a picture is opened (see lightbox.js), which is
   long after this module has scanned the page — so a selector for it would
   never match anything, and making it match would mean watching the document
   for new icons forever, to catch one. It keeps the flat glyph. */

/**
 * Below this many CSS pixels an icon is left flat whatever the selector says.
 *
 * A guard, not a policy: the selectors above are the policy. This is here so
 * that a theme change, a narrow window or a future stylesheet cannot quietly
 * put a modelled object somewhere it would be a smudge.
 */
export const MIN_SIZE = 13;

/**
 * The renderer draws every icon at this many device pixels square, and each
 * icon's canvas takes a scaled copy.
 *
 * One fixed size for everything, so the renderer is never resized — a resize is
 * a framebuffer reallocation and doing thirty a frame would cost more than the
 * drawing does. Icons are smaller than this, so the copy is a downscale, which
 * is free supersampling: the edges of a modelled object at eighteen pixels come
 * out clean without asking for MSAA.
 *
 * IT WAS ONE NUMBER, 96, AND THAT WAS WRONG IN BOTH DIRECTIONS.
 *
 * What an icon actually wants is `size × bleed × devicePixelRatio`, and the
 * spread between icons got wide once the cards grew and the factory was given
 * room for its smoke. At a retina ratio of 2, an 18 px section heading wants 36
 * and the factory on the Summary card wants 160. A single 96 gave the heading
 * a downscale of nearly three to one — free supersampling, and a fair bit of
 * fill nobody sees — while the factory was rendered at 96 and STRETCHED to 160,
 * the one icon on the page drawn below its own resolution, which is exactly the
 * thing this layer is supposed to be better at than a sprite.
 *
 * So the tile is chosen once, at start-up, from the icons the page actually
 * has. The renderer is still created exactly once and never resized — which
 * was the whole reason for a fixed size — it is simply created at the right
 * size for the page it is on. Publications and Research Team, which have no
 * bleeding icons, keep the old 96; the Summary page pays 160 for its factory.
 *
 * The cost is quadratic and worth respecting. Measured in software rendering
 * (SwiftShader, where fill dominates far more than it does on a GPU) a pass at
 * 160 costs about 1.44× one at 96. Hard-coding 160 would have handed that bill
 * to every page on the site to buy one icon on one of them.
 */

/** The smallest tile worth rendering into, and the largest the layer will ask
 *  for. The floor keeps the supersampling that makes small icons clean; the
 *  ceiling stops a future `bleed` from quietly allocating a 2048² buffer. */
const TILE_MIN = 96;
const TILE_MAX = 160;

/**
 * The tile size this page needs: the largest canvas any of its icons will take,
 * rounded up to a multiple of 16 and held between the two bounds above.
 */
function chooseTile(targets, dpr) {
  let want = 0;
  for (const t of targets) want = Math.max(want, sizeOf(t.svg) * bleedOf(t.id) * dpr);
  const rounded = Math.ceil(want / 16) * 16;
  return Math.min(TILE_MAX, Math.max(TILE_MIN, rounded));
}

/**
 * How many cells across the offscreen canvas is, so it holds GRID × GRID icons.
 *
 * THIS IS THE PERFORMANCE FIX, AND IT IS WORTH THE PARAGRAPH.
 *
 * The first version rendered one icon and immediately blitted it — render,
 * `drawImage`, render, `drawImage`. That reads well and it is slow, because
 * `drawImage` from a WebGL canvas has to wait for the GPU to finish drawing
 * into it. One stall per icon per frame. Measured on the Publications page with
 * nine icons on screen: **18.5 ms of main-thread time per frame**, which is a
 * whole 60 Hz frame budget spent on nine pictures the size of a full stop.
 *
 * So the icons are rendered in batches instead. Sixteen of them go into one
 * 384 × 384 canvas as a four-by-four grid — `setViewport` and `setScissor` pick
 * the cell, and Three's own clear honours the scissor box, so each cell is
 * cleared and drawn independently. Then all sixteen are blitted out of the
 * finished canvas. Sixteen renders and sixteen blits, but **one stall**.
 */
const GRID = 4;

/**
 * Ceilings, in one place.
 *
 * `maxLive` is the number of icons the layer will take on at all. The busiest
 * real page comes to about thirty, so this is headroom rather than a limit that
 * bites — it is here so that a future selector added to SCOPE cannot turn a
 * long page into two hundred canvases without somebody noticing.
 *
 * An object rather than a constant because tools/preview-icons3d.html draws all
 * sixty-nine at once and has to lift it; nothing on the site changes it.
 */
export const LIMITS = { maxLive: 64 };

/* ========================================================================== */

/** Read a CSS custom property off <html>. */
function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * How big an icon is, in CSS pixels.
 *
 * `getComputedStyle().width` and NOT `getBoundingClientRect()`, and the reason
 * is a real bug that this replaced. The page transition (fx.css §, README §12.5)
 * animates `.shell` in from `perspective(1400px) translateZ(-70px) scale(.984)`
 * — and a bounding rect is measured through every ancestor transform, so for
 * the first few hundred milliseconds of every page load every icon on the page
 * measures several per cent small. This module starts inside that window. With
 * a rect, the scan below silently found nothing and every page kept its flat
 * icons; the layer worked perfectly if you ran it by hand from the console a
 * second later, which is the most misleading way for a bug to present itself.
 *
 * The computed style is the used layout size. No ancestor transform touches it,
 * no animation frame has to be waited for, and it is the number the canvas
 * backing store wants anyway.
 *
 * @returns {number} the smaller side, or 0 if it cannot be read
 */
function sizeOf(svg) {
  const style = getComputedStyle(svg);
  const w = parseFloat(style.width);
  const h = parseFloat(style.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return Math.min(w, h);
  const box = svg.getBoundingClientRect();
  return Math.min(box.width, box.height);
}

/**
 * How much of the frame a model should fill, measured across its widest side.
 *
 * The camera frames 1.2 units, so this is a fraction of the icon's box: 0.86 is
 * about 72 per cent of it. Not 1.2. The rest is the room the object needs to
 * turn in: a book that fills the frame face-on sweeps wider than the frame as it
 * comes round, and clipping the corner off an icon for a third of every cycle is
 * worse than drawing it slightly smaller all the time.
 *
 * ── BUT IT IS ALSO WHY A MODEL LOOKS SMALLER THAN THE GLYPH IT REPLACED ──────
 * A Font Awesome symbol is drawn to its viewBox edge, so swapping one for a
 * model fitted to 72 per cent is a visible step down — and on the six cards on
 * the Summary page, where the icons are the largest on the site and a visitor
 * looks straight at them, it was a bad one. Several of the models made it worse
 * by being mostly air: a laurel wreath is a thin ring, so at 72 per cent of a
 * 21-pixel box its stroke came out about two pixels and the icon read as
 * nothing at all.
 *
 * The turning room is not needed equally by everything, though. A clock face or
 * a medal is a disc: turn it about the vertical axis and its silhouette gets
 * NARROWER, never wider, so it can be drawn nearly to the edge of the box with
 * nothing to clip. A shelf of books is deep, and cannot.
 *
 * So a row may set its own `fill` and take more of the frame. It is per model
 * rather than global because it is a fact about that model's shape, and the
 * only honest way to set it is to measure: tools/preview-icons3d.html for the
 * look, and the reach figures for whether it survives a full hover cycle
 * without touching the frame.
 */
const FIT = 0.86;

/**
 * The ceiling on `fill`. 1.2 would be the model exactly filling the icon's box,
 * edge to edge, with no room for anything — including its own bevel highlight
 * and the half-pixel the downscale costs. This is as close as anything gets.
 */
const MAX_FILL = 1.14;

/** How much of its frame a sprite id asks to fill. */
function fillOf(id) {
  const row = entry(id);
  const want = row && row.fill;
  if (!Number.isFinite(want)) return FIT;
  return Math.min(MAX_FILL, Math.max(0.4, want));
}

/**
 * How far outside its own box an icon is allowed to reach.
 *
 * ONE ICON USES THIS AND IT IS THE POINT OF IT. Everything else in the set is
 * an object sitting in a box: the canvas is exactly the icon's box, the model is
 * fitted inside it, and nothing ever crosses the edge. The sun is on fire, and a
 * fire that stops politely at a boundary is not a fire — its flares have to be
 * able to leave.
 *
 * A row in the registry asks for it with `bleed: 2.4`, which means:
 *
 *   · the canvas is built 2.4 times the icon's width and height, and hung off
 *     the icon by half the difference on each side, so the icon's box stays the
 *     middle of it;
 *   · `fitToFrame` scales the model down by the same factor, so THE BODY OF THE
 *     OBJECT IS STILL THE SAME SIZE ON SCREEN as every other icon — all the
 *     extra canvas buys is room around it;
 *   · the <svg> gets `data-icon3d-bleed`, which is what components.css §5c keys
 *     the `overflow: visible` and the stacking order off.
 *
 * It costs the square of itself in fill rate, which is why it is opt-in and why
 * it is capped. At 2.4 the sun's canvas is about 73 device pixels square rather
 * than 30; the cap stops a future row asking for 8 and quietly rendering a
 * 500-pixel canvas for a fifteen-pixel icon.
 */
const MAX_BLEED = 3;

/** The bleed a sprite id asks for, clamped and defaulted to none. */
function bleedOf(id) {
  const row = entry(id);
  const want = row && row.bleed;
  if (!Number.isFinite(want) || want <= 1) return 1;
  return Math.min(MAX_BLEED, want);
}

/**
 * Centre a model in the frame and scale it to a common size.
 *
 * WHY THIS IS DONE IN CODE AND NOT BY HAND IN EACH MODEL
 * -----------------------------------------------------
 * Sixty-nine models, each built to its own natural proportions — a pencil is
 * long and thin, a globe is round, a university front is wide and low. Asking
 * each builder to also land inside the same box would mean sixty-nine
 * hand-tuned scale factors, every one of which goes stale the moment the model
 * is adjusted, and none of which is checked by anything.
 *
 * Measuring the result instead means a builder can draw the object at whatever
 * size the object wants to be drawn, and the set still comes out even. Taking a
 * finger off the university's pediment only changes the university.
 *
 * The model goes inside a second group rather than being scaled itself, because
 * the motion functions set `scale` and `position` on the group they are handed
 * and would wipe the fit out on the first frame. Two nested groups: the outer
 * one moves, the inner one holds the fit.
 */
function fitToFrame(THREE, model, bleed = 1, fill = FIT) {
  const holder = new THREE.Group();
  const outer = new THREE.Group();
  holder.add(model);
  outer.add(holder);

  /* A model may nominate ONE PART as the thing to be fitted, by putting it in
     `userData.fitTo`. The sun does: its flares reach right out to the edge of a
     doubled frame and change length every second, so measuring the whole model
     would scale the sun itself by whatever the longest flare happened to be at
     the instant it was built. What wants to come out a standard size is the
     body; the flares are allowed to be whatever length they are. */
  const measured = (model.userData && model.userData.fitTo) || model;

  const box = new THREE.Box3().setFromObject(measured);
  if (!box.isEmpty()) {
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    /* Width and height only. Depth is deliberately ignored: this is an
       orthographic camera looking down the z axis, so depth costs no screen
       space at rest — and fitting for it would shrink every deep object
       (the hourglass, the globe, the medal) for a dimension nobody sees. */
    const span = Math.max(size.x, size.y);
    if (span > 0.001) {
      /* Divided by the bleed, because a bleeding icon's frame covers a canvas
         that many times wider than the icon's own box — so a model fitted to
         the plain fill would come out that many times too big on screen. */
      const scale = fill / bleed / span;
      holder.scale.setScalar(scale);
      /* Centred on the measured part, not on the whole model: the sun has to
         sit in the middle of its doubled canvas whatever its flares are doing. */
      holder.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);
    }
  }

  return outer;
}

/** The sprite id an existing icon is drawing, e.g. 'fad-book'. */
function spriteId(svg) {
  const use = svg.querySelector('use');
  const href = use && (use.getAttribute('href') || use.getAttribute('xlink:href'));
  const hash = href && href.indexOf('#');
  return hash > -1 ? href.slice(hash + 1) : null;
}

/** Is the switch on? */
function switchedOn() {
  if (!ENABLED) return false;
  if (document.documentElement.dataset.icons3d === 'off') return false;
  try {
    if (localStorage.getItem('hs-icons3d') === 'off') return false;
  } catch {
    /* Private mode, blocked storage: not a reason to withhold the icons. */
  }
  return true;
}

/* ========================================================================== */
/* Mounting                                                                   */
/* ========================================================================== */

/**
 * Turn the page's display icons into objects.
 *
 * Never throws and never rejects: every failure returns null, leaving the flat
 * icons exactly as they were.
 *
 * @returns {Promise<object|null>} a handle with `stop()`, `start()` and
 *          `dispose()`, or null if the page is staying flat
 */
export async function initIcons3d() {
  if (!switchedOn()) return null;
  if (typeof document.createElementNS !== 'function') return null;

  /* ---- 1. find the work, before paying for anything ---------------------- */
  const targets = [];
  const seen = new Set();
  for (const selector of SCOPE) {
    let found;
    try {
      found = document.querySelectorAll(selector);
    } catch {
      continue;     // a selector this browser cannot parse is not a reason to stop
    }
    for (const svg of found) {
      if (seen.has(svg) || svg.tagName.toLowerCase() !== 'svg') continue;
      const id = spriteId(svg);
      if (!id || !entry(id)) continue;
      if (sizeOf(svg) < MIN_SIZE) continue;
      seen.add(svg);
      targets.push({ svg, id });
      if (targets.length >= LIMITS.maxLive) break;
    }
    if (targets.length >= LIMITS.maxLive) break;
  }
  if (!targets.length) {
    console.info('icons3d: no icon on this page is in scope and large enough; keeping the flat set.');
    return null;
  }

  /* ---- 2. the library, then the renderer --------------------------------- */
  const THREE = await loadThree();
  if (!THREE) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const TILE = chooseTile(targets, dpr);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(TILE * GRID, TILE * GRID, false);
    /* Every render below is confined to one cell. Three clips its clear to the
       scissor box too, which is what lets sixteen icons share one canvas
       without each one wiping the fifteen before it. */
    renderer.setScissorTest(true);
  } catch (err) {
    console.info('icons3d: no WebGL, keeping the flat icons.', err);
    return null;
  }
  const source = renderer.domElement;

  /* ---- 3. one scene, one camera, one set of lights ----------------------- */
  const scene = new THREE.Scene();

  /* Orthographic, not perspective. A perspective camera this close to an object
     this small splays its near corners, and at eighteen pixels that reads as a
     wobble rather than as depth. Orthographic keeps the icon an icon: the
     silhouette is the shape, and the shading is what makes it solid. */
  const camera = new THREE.OrthographicCamera(-0.6, 0.6, 0.6, -0.6, 0.01, 12);
  camera.position.set(0, 0, 4);
  camera.lookAt(0, 0, 0);

  /* The key is at (−x, +y, +z) — upper left, toward the viewer — which is where
     every other three-dimensional thing on this site is lit from: the logo, the
     bismillah marks, the footer heart, the copyright mark, and the direction
     the flat icons' drop-shadow wall falls away from. Getting it backwards is
     not subtle; the objects look pressed into the page instead of standing off
     it. */
  /* The four intensities were tuned on tools/preview-icons3d.html rather than
     guessed. The first pass had them at roughly twice this and every rounded
     surface in the set had a white hole burnt through it: there is no tone
     mapping here (a filmic curve on an eighteen-pixel object costs a shader and
     buys nothing), so anything over 1.0 simply clips, and a sphere lit to 2.5
     clips across a third of its face. */
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(-1.1, 1.5, 2.2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(1.7, -0.7, 1.0);
  /* A rim from behind, which is what separates a dark object from a dark page
     — the one light doing a job the key cannot. */
  const rim = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(0.3, 0.9, -1.6);
  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(key, fill, rim, ambient);

  /* Whatever is being drawn this instant hangs here. One node in and out, per
     icon, per frame — cheaper than keeping thirty models in the scene and
     hiding twenty-nine of them, because the renderer walks what is in the
     graph whether it is visible or not. */
  const stage = new THREE.Group();
  scene.add(stage);
  let mounted = null;

  /* ---- 4. the models ----------------------------------------------------- */

  /* Keyed by sprite id AND colour: the same icon appears in the accent colour in
     a heading and in the faint ink colour in the contact list, and a model is
     built with its colours baked into its materials. Two colours, two models —
     which is two hundred triangles, and far less work than re-tinting a
     material tree on every frame. */
  const models = new Map();
  const families = new Map();

  async function familyOf(name) {
    if (!families.has(name)) families.set(name, FAMILIES[name]().catch(() => null));
    return families.get(name);
  }

  async function modelFor(id, colour) {
    const cacheKey = `${id}|${colour}`;
    if (models.has(cacheKey)) return models.get(cacheKey);

    const row = entry(id);
    const promise = familyOf(row.family).then((module) => {
      const build = module && module[row.make];
      if (typeof build !== 'function') return null;
      const model = build(kit(THREE, {
        base: colour,
        ink: token('--c-ink-strong', '#0f172a'),
      }, {
        /* A model that loads a photograph calls this when the image lands. By
           then the loop has very likely stopped — one icon on a quiet page goes
           to sleep in under a second — so without it the sun would sit in flat
           gold until something else happened to wake the layer up. */
        repaint: () => wake(),
      }));
      if (!model) return null;
      const group = fitToFrame(THREE, model, bleedOf(id), fillOf(id));
      /* The builder's own resting orientation, kept so a motion function can
         add to it rather than having to know it. */
      group.userData.rest = group.rotation.clone();
      return group;
    }).catch((err) => {
      console.info(`icons3d: ${id} could not be built; it stays flat.`, err);
      return null;
    });

    models.set(cacheKey, promise);
    return promise;
  }

  /* ---- 5. one canvas per icon -------------------------------------------- */

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const items = [];

  for (const target of targets) {
    const bleed = bleedOf(target.id);
    const px = Math.max(1, Math.min(TILE, Math.round(sizeOf(target.svg) * bleed * dpr)));

    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    /* An ordinary icon's canvas is its box exactly. A bleeding one is `bleed`
       times as wide, hung half the difference off each side — so the icon's own
       box is still the middle of the picture and nothing in the layout moves. */
    const inset = ((1 - bleed) / 2) * 100;
    const host = document.createElementNS(SVG_NS, 'foreignObject');
    host.setAttribute('x', `${inset}%`);
    host.setAttribute('y', `${inset}%`);
    host.setAttribute('width', `${bleed * 100}%`);
    host.setAttribute('height', `${bleed * 100}%`);
    host.setAttribute('class', 'icon3d');
    host.append(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    target.svg.append(host);
    /* The flat glyph goes only once its replacement is in place and has a
       context to draw into, so there is no frame in which the icon is blank. */
    target.svg.dataset.icon3d = 'on';
    // components.css §5c lets this one out of its box and lifts it over its
    // neighbours. Set only when it is needed, so the ordinary icons keep the
    // ordinary rules.
    if (bleed > 1) target.svg.dataset.icon3dBleed = String(bleed);

    items.push({
      id: target.id,
      svg: target.svg,
      canvas,
      ctx,
      px,
      bleed,
      colour: null,
      model: null,
      /* Per-instance, so six copies of one icon on the Summary page do not turn
         in lockstep like a rack of clocks. Derived from the position in the
         list rather than from Math.random(), so a screenshot of the page is the
         same picture twice. */
      phase: items.length * 1.37,
      hover: 0,
      want: 0,
      visible: false,
    });
  }

  if (!items.length) {
    renderer.dispose();
    return null;
  }

  /* ---- 6. colour, and keeping up with the theme -------------------------- */

  function recolour() {
    for (const item of items) {
      const next = getComputedStyle(item.svg).color || '#00ccff';
      if (next === item.colour) continue;
      item.colour = next;
      item.model = null;
      modelFor(item.id, next).then((group) => { item.model = group; wake(); });
    }
  }

  /** Throw away every model and build them again in the new colours. */
  function repalette() {
    /* A theme change invalidates every model, because the colours are in the
       materials. Dropping the cache and rebuilding is a few milliseconds and it
       happens when someone clicks the switch — which is the one moment in the
       life of the page where a few milliseconds are already being spent on a
       cross-fade. */
    for (const promise of models.values()) {
      promise.then((group) => group && disposeGroup(group)).catch(() => {});
    }
    models.clear();
    if (mounted) { stage.remove(mounted); mounted = null; }
    for (const item of items) { item.colour = null; item.model = null; }
    recolour();
  }

  const themeWatch = new MutationObserver(repalette);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* `data-theme` is absent while the switch is on Auto, so a visitor who changes
     their system appearance changes every colour on the page without any
     attribute moving. This is the other half of that. */
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  if (systemDark.addEventListener) systemDark.addEventListener('change', repalette);

  recolour();

  /* ---- 7. hover ---------------------------------------------------------- */

  /* The thing a visitor points at is the card, the heading or the link — not
     the eighteen-pixel icon inside it. So the listener goes on whatever
     enclosing thing the icon belongs to, and the icon answers for it. */
  for (const item of items) {
    const host = item.svg.closest('a, button, li, h2, h3, .card, .secnav__chip')
      || item.svg.parentElement;
    if (!host) continue;
    host.addEventListener('pointerenter', () => { item.want = 1; wake(); });
    host.addEventListener('pointerleave', () => { item.want = 0; wake(); });
    host.addEventListener('focusin', () => { item.want = 1; wake(); });
    host.addEventListener('focusout', () => { item.want = 0; wake(); });
  }

  /* ---- 8. only what is on screen ----------------------------------------- */

  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const item = items.find((i) => i.svg === e.target);
        if (item) item.visible = e.isIntersecting;
      }
      wake();
    }, { rootMargin: '120px' });
    for (const item of items) observer.observe(item.svg);
  } else {
    for (const item of items) item.visible = true;
  }

  /* ---- 9. the loop ------------------------------------------------------- */

  const start = performance.now();
  const clock = () => (performance.now() - start) / 1000;

  let running = false;
  let frame = 0;

  /**
   * Pose one icon's model and render it into cell `slot` of the shared canvas.
   *
   * Nothing is blitted here — see `flush()`. Splitting the two is the whole
   * point of the batching described at `GRID`.
   *
   * @returns {boolean} whether anything was drawn
   */
  function render(item, slot, t) {
    const group = item.model;
    if (!group || !group.userData) return false;

    const row = REGISTRY[item.id];
    const rest = group.userData.rest;
    group.position.set(0, 0, 0);
    group.rotation.copy(rest);
    group.scale.setScalar(1);

    const state = { hover: reduced.matches ? 0 : item.hover, phase: item.phase, t };
    const motion = row && row.motion ? row.motion : defaultMotion;
    try {
      if (reduced.matches) {
        /* One pose, held: the resting frame of the same motion, so a visitor
           who has asked for no animation still gets the object rather than a
           different object. */
        motion(group, 0, { hover: 0, phase: item.phase, t: 0 });
      } else {
        motion(group, t, state);
      }
    } catch {
      /* A motion function that throws must not take the page's animation loop
         with it; the icon simply sits in its resting pose. */
      group.rotation.copy(rest);
    }

    if (mounted !== group) {
      if (mounted) stage.remove(mounted);
      stage.add(group);
      mounted = group;
    }

    const cx = (slot % GRID) * TILE;
    const cy = Math.floor(slot / GRID) * TILE;
    renderer.setViewport(cx, cy, TILE, TILE);
    renderer.setScissor(cx, cy, TILE, TILE);
    renderer.render(scene, camera);
    return true;
  }

  /**
   * Copy a rendered batch out of the shared canvas and into the icons' own.
   *
   * The y flip is not optional: WebGL's viewport origin is the BOTTOM left of
   * the drawing buffer and a 2D canvas's is the top left, so cell row 0 — the
   * one `render()` puts at the bottom — has to be read from the bottom of the
   * source. Getting this wrong is not subtle; the grid comes out upside down in
   * rows but not within them, which looks like the models being wrong.
   */
  function flush(batch) {
    batch.forEach((item, slot) => {
      const sx = (slot % GRID) * TILE;
      const sy = (GRID - 1 - Math.floor(slot / GRID)) * TILE;
      item.ctx.clearRect(0, 0, item.px, item.px);
      item.ctx.drawImage(source, sx, sy, TILE, TILE, 0, 0, item.px, item.px);
    });
  }

  /** Render a list of icons, at most GRID² at a time, and blit each batch. */
  function drawAll(list, t) {
    const PER_PASS = GRID * GRID;
    for (let from = 0; from < list.length; from += PER_PASS) {
      /* Built by pushing rather than by `filter`, so an icon that declines to
         render does not leave a gap: the slot a model is drawn into has to be
         the slot `flush` reads it back from, and `filter`'s index is the index
         BEFORE filtering. One skipped icon would otherwise shift every icon
         after it in the batch into its neighbour's picture. */
      const batch = [];
      for (const item of list.slice(from, from + PER_PASS)) {
        if (render(item, batch.length, t)) batch.push(item);
      }
      flush(batch);
    }
  }

  /* A rolling average of how long one pass over the visible icons takes, in
     milliseconds. Kept because "it feels fine" is not a measurement and this is
     the number that decides whether the scope in SCOPE is too wide:
 
         window.__icons3d.cost      // ms of main-thread work per frame
         window.__icons3d.drawn     // icons drawn in the last frame
 
     A frame is 16.7 ms at 60 Hz. Anything approaching a third of that on a
     middling machine is a reason to narrow the scope, not to optimise. */
  let cost = 0;
  let drawn = 0;

  function tick() {
    if (!running) return;
    const began = performance.now();
    const t = clock();
    let live = 0;

    const live_ = [];
    for (const item of items) {
      if (!item.visible || !item.model) continue;
      /* Hover eases in and out rather than snapping, which is what makes the
         change read as the object responding rather than as a state swap. */
      item.hover += (item.want - item.hover) * 0.16;
      if (Math.abs(item.want - item.hover) < 0.002) item.hover = item.want;
      live_.push(item);
    }
    drawAll(live_, t);
    live = live_.length;

    /* Nothing on screen: stop, rather than burn a frame a sixtieth of a second
       for the rest of the visit. The observer and the hover listeners both call
       `wake()`, so there is always a way back. */
    if (!live) { running = false; return; }

    // An exponential moving average, so one slow frame during a scroll does not
    // become the reported number and one fast one does not hide a trend.
    drawn = live;
    cost = cost ? cost * 0.9 + (performance.now() - began) * 0.1 : performance.now() - began;

    frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (reduced.matches) {
      /* No loop at all. One frame each, in the resting pose. */
      drawAll(items.filter((item) => item.visible && item.model), 0);
      return;
    }
    if (running || document.hidden) return;
    running = true;
    frame = requestAnimationFrame(tick);
  }

  function sleep() {
    running = false;
    cancelAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()));
  if (reduced.addEventListener) reduced.addEventListener('change', () => { sleep(); wake(); });

  /* The root font size is fluid on this site (base.css §3), so an icon that is
     1em is a different number of pixels at 1280 than at 1920 — and a canvas
     backing store that is not re-sized to match is a soft icon in a sharp page.
     Debounced, because a drag across a monitor edge fires this a hundred times
     and reallocating forty canvases a hundred times is a stall. */
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      for (const item of items) {
        const px = Math.max(1, Math.min(TILE, Math.round(sizeOf(item.svg) * item.bleed * dpr)));
        if (px === item.px) continue;
        item.px = px;
        item.canvas.width = px;
        item.canvas.height = px;
      }
      wake();
    }, 180);
  }, { passive: true });

  wake();

  /* ---- 10. going back to flat -------------------------------------------- */

  function disposeGroup(group) {
    group.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        for (const m of [].concat(node.material)) m.dispose();
      }
    });
  }

  const handle = {
    /** How many icons this page turned into objects. */
    count: items.length,
    /** The tile size chosen for this page. See `chooseTile`. */
    tile: TILE,
    /** Main-thread milliseconds per frame, averaged. See `tick()`. */
    get cost() { return Math.round(cost * 100) / 100; },
    /** Icons drawn in the last frame — the rest were off screen. */
    get drawn() { return drawn; },
    /**
     * Time a full pass over EVERY icon on the page, on screen or not.
     *
     * Synchronous on purpose: `cost` above is measured inside the animation
     * loop, and a browser that is throttling `requestAnimationFrame` — a
     * background tab, a hidden window, a headless capture — inflates it wildly
     * because the GPU is asleep between calls. This runs the same work in one
     * task and gives a number that means something.
     *
     *     window.__icons3d.benchmark()   // { icons, msPerPass }
     *
     * On the Summary page, thirty-one icons, a 2024 laptop: about 3.2 ms. Only
     * the ones on screen are drawn in reality, so the live figure is lower.
     */
    benchmark(passes = 40) {
      const list = items.filter((i) => i.model);
      drawAll(list, 0);                       // warm up, and discard it
      const t0 = performance.now();
      for (let n = 0; n < passes; n += 1) drawAll(list, n / 60);
      return { icons: list.length, msPerPass: (performance.now() - t0) / passes };
    },
    start: wake,
    stop: sleep,
    /**
     * Put every icon back exactly as it was. Used by nothing on the site — it is
     * here so that turning the layer off in a console is a real, complete
     * undo rather than a freeze.
     */
    dispose() {
      sleep();
      if (observer) observer.disconnect();
      themeWatch.disconnect();
      for (const item of items) {
        const host = item.svg.querySelector('foreignObject.icon3d');
        if (host) host.remove();
        delete item.svg.dataset.icon3d;
        delete item.svg.dataset.icon3dBleed;
      }
      for (const promise of models.values()) {
        promise.then((group) => group && disposeGroup(group)).catch(() => {});
      }
      models.clear();
      renderer.dispose();
    },
  };

  return handle;
}
