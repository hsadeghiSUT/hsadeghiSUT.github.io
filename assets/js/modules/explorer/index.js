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
 * index.js — the publications explorer: three 3D views of the same list.
 *
 * WHAT IT IS
 * ----------
 * A panel at the top of the Publications page with three views, all computed
 * from data/publications.json and none of them decoration:
 *
 *   Collaboration   every co-author as a node, every shared paper as an edge,
 *                   laid out by force in three dimensions. Node size is papers
 *                   written — or citations earned, at the press of a toggle;
 *                   colour is the section they mostly publish in. Hover a name
 *                   to light their collaborations; click to filter the list
 *                   below to their papers.
 *
 *   Timeline        the same papers as cards floating at their year's depth in
 *                   a receding corridor. The shape of the corridor is the
 *                   output over time, and the size of a card is how often that
 *                   paper has been cited. Pick a year to fly to it; click a
 *                   card to jump to that entry in the list.
 *
 *   Impact          one column per year, its height the citations that year's
 *                   papers have earned, each paper a segment of it. Present
 *                   only when there are citations to draw it from.
 *
 * WHY IT EARNS ITS PLACE
 * ----------------------
 * Because it says things the list cannot. A hundred entries in a column tell
 * you there are a hundred; the graph tells you who the work was done with and
 * which groups it clusters into, the timeline tells you how it grew, and the
 * skyline tells you what came of it. All three are recomputed from the data on
 * every load, so adding a paper updates them — there is no second copy of
 * anything to maintain.
 *
 * WHERE THE CITATIONS COME FROM
 * -----------------------------
 * The page hands them in, already joined to the entries, as a Map of
 * "section:item" ids to counts — the same numbers that draw the "Cited by N"
 * badges in the list, from the same local snapshot, so the canvas and the list
 * can never disagree. This module knows nothing about Google, `scholar.js` or
 * title matching; it knows that some papers have a number and some do not.
 * README §18 for where the snapshot comes from, §15.7 for this.
 *
 * **Every one of them is optional.** With no citations the Impact tab is not
 * built, the size toggle is not built, the cards are all one size and the panel
 * is the two-view panel it was before. There is one flag for that case,
 * `graph.citations.known`, and it is read in four places.
 *
 * WHAT IT NEVER DOES
 * ------------------
 * Stand between a reader and the publications. It is mounted after the list has
 * rendered, it is skipped entirely without WebGL, and everything it can do —
 * filtering by collaborator, jumping to a year — is also a plain button in the
 * list underneath it, which is what keyboard and screen-reader users get and
 * what everyone gets when the canvas cannot be drawn.
 */

import { $, el } from '../dom.js';
import { icon } from '../icons.js';
import { buildGraph, attachCitations, withoutSelf } from './data.js';
import { loadFaces } from '../faces.js';
import { solveLayout } from './layout.js';
import {
  buildGraphScene, buildTimelineScene, buildImpactScene, buildInfluenceScene, YEAR_GAP,
} from './scene.js';
import { matrices, project, easeInOut, FOV } from './camera.js';
import { createRenderer as createGL } from './gl.js';
import { createRenderer as createThree } from './three.js';
import { loadThree } from '../fx/three.js';
import { parseColor, token } from '../fx/index.js';

/** How many names carry a permanent label; the rest appear on hover. */
const ALWAYS_LABELLED = 7;

/** Radians per second of idle rotation in the graph view. */
const SPIN = 0.075;

/** How close the pointer has to be to a node, in CSS pixels. */
const HOVER_SLOP = 26;

/**
 * Is this view about people, or about papers?
 *
 * Every scene falls into one of the two, and the difference decides four things
 * at once: what the hit test is picking, what the highlight lights up, whether
 * the labels are names or years, and what a click does. Collaboration and
 * Influence are people; Timeline and Impact are papers.
 *
 * Tested on the scene's own shape rather than on a list of `kind` strings, so a
 * fifth view is a scene that exposes `nodes` and `edges` and nothing here has
 * to be edited to admit it. That is not hypothetical — this function exists
 * because adding the Influence view otherwise meant four separate places all
 * saying `kind === 'graph'` and all of them having to be found.
 */
const aboutPeople = (scene) => !!(scene && scene.nodes);

/**
 * 2066 → "2,066".
 *
 * Grouped by hand rather than with `toLocaleString()`, which renders Persian
 * digits for a visitor whose browser is set to fa — correct on the Persian
 * section of the list and wrong in a readout that is otherwise English. The
 * same decision, and the same reason, as `formatCount` in `scholar.js`; it is
 * four lines rather than an import because that import would be this module's
 * only line of knowledge about where citations come from, and it does not have
 * any and should not gain one.
 */
const count = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

/** The six section hues, read from the same tokens the page highlight uses. */
function readPalette() {
  const palette = [];
  for (let i = 0; i < 6; i++) {
    palette.push(parseColor(token('--fx-hue-' + i)) || [0.4, 0.6, 0.8]);
  }
  return palette;
}

function readLook() {
  return {
    lit: parseColor(token('--c-ink-strong')) || [1, 1, 1],
    opacity: 1,
    edge: parseColor(token('--c-ink-faint')) || [0.6, 0.6, 0.6],
  };
}

/* -------------------------------------------------------------------------- */
/* Mounting                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * @param {HTMLElement} host        where the panel goes
 * @param {object} publications     data/publications.json
 * @param {object} aliases          data/author-aliases.json, keys only
 * @param {Map<string,number>} [citations]  "section:item" id -> citation count,
 *                                  from the same snapshot the list's badges use.
 *                                  Optional in every sense: see the header.
 * @param {(ids: string[]|null, label: string) => void} onFilter
 * @param {(id: string) => void} onReveal
 */
export async function mountExplorer(
  host,
  { publications, aliases, citations, onFilter, onReveal },
) {
  if (!host) return null;

  const graph = attachCitations(buildGraph(publications, aliases), citations || new Map());
  if (graph.people.length < 3) { host.remove(); return null; }

  /** Whether there is anything to draw an Impact view or a size toggle from. */
  const cited = !!(graph.citations && graph.citations.known);

  /* The faces, if there are any.
     Started after the graph and never awaited. A node is complete without its
     photograph — the label and the readout say who it is — so a roster that is
     slow, missing or broken costs the reader nothing. When it does land,
     whatever is already under the cursor is described again, so the face
     appears without the reader having to move and come back. */
  let faces = new Map();
  loadFaces(new Set(graph.people.map((p) => p.key)))
    .then((found) => {
      if (!found.size) return;
      faces = found;
      describe(hovered !== null ? hovered : selected);
    })
    .catch(() => {});

  /* Which question the graph's node sizes answer. It survives a theme change
     and a view change, because a reader who asked for citations did not ask for
     them until they next touched something. */
  let sizeBy = 'papers';

  const layout = solveLayout(graph.people, graph.edges);
  const palette = readPalette();
  let look = readLook();

  const scenes = {
    graph: buildGraphScene(graph, layout, palette, look.edge, sizeBy),
    timeline: buildTimelineScene(graph, palette),
    /* Built only when there is something to build it from. `showView` and the
       tab row both test for what exists rather than for the flag, so "no
       citations" and "the view failed to build" are the same case and there is
       one path out of both. */
    ...(cited ? { impact: buildImpactScene(graph, palette) } : {}),
  };

  /**
   * The Influence city, built the first time somebody asks for it.
   *
   * IT IS THE ONE VIEW THAT IS NOT BUILT UP FRONT, and the reason is eighty
   * milliseconds. It needs the collaboration graph solved a second time, as a
   * plan rather than a ball (layout.js), and that solve costs about what the
   * first one costs — 7,021 pairs × 320 iterations. Paying it on load would
   * double the explorer's cost for every reader, including the great majority
   * who never open this tab, on a page whose one rule is that nothing about
   * drawing a graph may delay the publications.
   *
   * Paid on the first click instead, it is a pause nobody sees: the tab switch
   * was going to rebuild and re-upload a scene anyway, and eighty milliseconds
   * inside that is indistinguishable from the switch itself. Afterwards it is
   * cached like every other scene.
   */
  let ground = null;
  let city = null;
  const LAZY = {
    influence: () => {
      if (!city) {
        /* The site owner is left out of this one — see `withoutSelf`. He is on
           every paper, so his tower would be three times the height of the next
           and his edges would be a third of all of them, and both facts are
           true without being informative. The Collaboration view keeps him,
           where the star is the subject. */
        city = withoutSelf(graph);
        ground = solveLayout(city.people, city.edges, { flat: true });
      }
      return buildInfluenceScene(city, ground, readPalette(), look.edge);
    },
  };

  /** A scene, building it first if it is one of the ones that waits. */
  function sceneFor(which) {
    if (!scenes[which] && cited && LAZY[which]) scenes[which] = LAZY[which]();
    return scenes[which];
  }

  /* ---- DOM --------------------------------------------------------------- */
  const canvas = el('canvas', { class: 'explorer__canvas' });
  const labels = el('div', { class: 'explorer__labels', 'aria-hidden': 'true' });
  const readout = el('p', { class: 'explorer__readout', role: 'status', 'aria-live': 'polite' });

  /* The face of whoever is under the cursor.
     It is `aria-hidden` and it carries no text the readout does not already
     say, because the readout is the accessible answer to "what am I pointing
     at" and saying it twice is worse than saying it once. This is the same
     sentence for the eye. */
  const portraitImg = el('img', { class: 'explorer__portrait-img', alt: '', decoding: 'async' });
  const portraitName = el('b', { class: 'explorer__portrait-name' });
  const portraitGroup = el('span', { class: 'explorer__portrait-group' });
  const portrait = el(
    'figure',
    { class: 'explorer__portrait', hidden: true, 'aria-hidden': 'true' },
    portraitImg,
    el('figcaption', { class: 'explorer__portrait-cap' }, portraitName, portraitGroup),
  );

  const stage = el('div', { class: 'explorer__stage' }, canvas, labels, readout, portrait);

  const tabs = {};
  const tabRow = el('div', { class: 'explorer__tabs', role: 'tablist', 'aria-label': 'Explorer view' });
  for (const [id, label, iconId] of [
    ['graph', 'Collaboration', 'fad-book-reader'],
    ['timeline', 'Timeline', 'fad-history'],
    /* The last two only when the citations arrived. A tab that opens onto an
       empty stage is worse than a tab that is not there.

       Influence goes last although it is the one that joins the other three,
       and that is the order it wants: it is the view that makes most sense
       once you already know what the graph and the skyline are each saying. */
    ...(cited ? [
      ['impact', 'Impact', 'fad-building'],
      ['influence', 'Influence', 'fad-globe-americas'],
    ] : []),
  ]) {
    const button = el(
      'button',
      { type: 'button', class: 'explorer__tab', role: 'tab', 'aria-selected': String(id === 'graph'), dataset: { view: id } },
      icon(iconId),
      el('span', { text: label }),
    );
    button.addEventListener('click', () => showView(id));
    tabs[id] = button;
    tabRow.append(button);
  }

  const hint = el(
    'p',
    { class: 'explorer__hint' },
    el('span', {}, 'Drag to turn'),
    el('span', {}, 'Ctrl-drag or right-drag to move'),
    el('span', {}, 'Scroll to zoom'),
    el('span', {}, 'Click to filter or open'),
  );
  const resetButton = el(
    'button',
    { type: 'button', class: 'explorer__reset', title: 'Put the view back' },
    icon('fad-history'),
    el('span', { text: 'Reset view' }),
  );

  /* The size toggle.

     One button that swaps the question the collaboration graph's node sizes
     answer: how much someone has written, or how much what they wrote has been
     read. Those two rankings are genuinely different on this record — the
     busiest co-author after the site owner has 31 papers and 264 citations, the
     most-cited has 11 papers and 641 — and watching the ball re-proportion
     between them is the only way to see that at a glance.

     A button and not two radio buttons or a select: there are exactly two
     states, it says which one it is in, and pressing it goes to the other one.
     It is hidden on the other two views rather than disabled, because it does
     not apply there and a permanently dead control is furniture. */
  const sizeButton = cited
    ? el(
      'button',
      {
        type: 'button',
        class: 'explorer__size',
        title: 'Size the co-authors by papers written, or by citations earned',
        'aria-live': 'polite',
      },
      icon('fad-adjust'),
      el('span', { class: 'explorer__size-label', text: 'Size: papers' }),
    )
    : null;
  if (sizeButton) sizeButton.addEventListener('click', () => toggleSize());

  const controls = el('div', { class: 'explorer__controls' }, hint, sizeButton, resetButton);

  const yearRow = el('div', { class: 'explorer__years', hidden: true });
  const allYears = el('button', {
    type: 'button',
    class: 'explorer__year explorer__year--all is-current',
    text: 'All years',
  });
  allYears.addEventListener('click', () => flyTo(null, allYears));
  yearRow.append(allYears);
  scenes.timeline.bands.forEach((band) => {
    const chip = el('button', {
      type: 'button',
      class: 'explorer__year',
      text: String(band.year),
      title: band.count + (band.count === 1 ? ' publication' : ' publications'),
    });
    chip.addEventListener('click', () => flyTo(band, chip));
    yearRow.append(chip);
  });

  const clearButton = el(
    'button',
    { type: 'button', class: 'explorer__clear', hidden: true },
    icon('fal-arrow-circle-up'),
    el('span', { text: 'Show all publications' }),
  );
  clearButton.addEventListener('click', () => applyFilter(null));

  const panel = el(
    'section',
    { class: 'explorer', 'data-view': 'graph' },
    el(
      'header',
      { class: 'explorer__head' },
      tabRow,
      el('p', { class: 'explorer__caption' }),
    ),
    stage,
    controls,
    yearRow,
    clearButton,
    buildWrittenView(),
  );

  host.replaceChildren(panel);
  const caption = $('.explorer__caption', panel);

  /* ---- renderer ---------------------------------------------------------- */
  let renderer = null;
  let kind = 'none';

  const THREE = await loadThree();
  if (THREE) {
    try { renderer = createThree(THREE, canvas); kind = 'three'; }
    catch (err) { console.warn('explorer: Three.js failed to start, using the built-in renderer.', err); }
  }
  if (!renderer) { renderer = createGL(canvas); kind = renderer ? 'webgl' : 'none'; }

  if (!renderer) {
    // No WebGL. The canvas goes, the written view stays open, and every action
    // the 3D offered is still there as a button.
    panel.classList.add('explorer--flat');
    stage.remove();
    yearRow.hidden = true;
    caption.textContent = 'Your browser cannot draw the 3D views, so here is the same information as a list.';
    const written = $('.explorer__written', panel);
    if (written) written.open = true;
    window.__explorer = { renderer: 'none', people: graph.people.length, edges: graph.edges.length };
    return { renderer: 'none' };
  }

  renderer.setLook(look);

  /* ---- state ------------------------------------------------------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let view = 'graph';
  let scene = scenes.graph;
  let hovered = null;
  let selected = null;
  let raf = 0;
  let last = 0;
  let visible = false;
  let dragging = null;

  /**
   * Where the timeline camera sits sideways and vertically.
   *
   * Held as a constant because every fly-to keeps it: travelling to a year
   * should move you *along* the corridor, not re-frame the whole composition.
   * Resetting x and y on each jump was the first version, and the scene visibly
   * lurched sideways every time a year was picked.
   */
  const TIMELINE_OFFSET = [-2.1, 0.9];

  /** Distance for the whole span, and for a single year.
   *
   *  The span was 16.5 and the newest band — the biggest, nearest and most
   *  interesting one — ran off the right edge of a letterbox canvas. Standing
   *  back a little keeps the whole corridor, including the near end, inside the
   *  frame; the year view is unchanged, because that one is meant to fill it. */
  /* Both grew with the cards. Sizing a card by its citations means the grid
     pitch has to clear the BIGGEST card rather than the average one, so a busy
     band is now about a third wider and taller than it was, and the camera that
     framed the old bands cut the near one off — the same bug the note above
     records from the first version, arriving again for a different reason.

     Scaling both by that third is the arithmetic and it is not the answer: the
     span is dominated by the corridor's length in Z, which did not change, so
     the honest scaling (about 27) stands so far back that the whole thing
     becomes a model of a corridor on a large empty table. Measured on the
     stage instead, 21.5 is where the near band sits clear of the right edge at
     a desktop width with room to spare, and nothing at the far end has
     collapsed into the vanishing point. */
  const SPAN_DISTANCE = 21.5;
  const YEAR_DISTANCE = 11;

  const camera = {
    graph: { yaw: 0.5, pitch: -0.18, distance: layout.radius * 1.95, target: [0, 0, 0] },
    // Angled, not straight down the corridor: looking along Z stacks every band
    // on top of the nearest one and the depth disappears. From the side and
    // slightly above, the years separate and the shape of the output over time
    // is the thing you actually see.
    timeline: {
      yaw: 0.62,
      pitch: -0.15,
      distance: SPAN_DISTANCE,
      target: [TIMELINE_OFFSET[0], TIMELINE_OFFSET[1], -3.4 * YEAR_GAP],
    },
    /* The skyline is framed almost square-on and a little above, which is the
       angle a row of columns is actually read at: enough yaw for the footprints
       to foreshorten and say which way round the scene is, not so much that the
       near columns hide the far ones. The target sits at mid-height rather than
       on the ground, so the row is centred in the frame instead of sitting on
       the bottom edge of it.

       The distance and the height of the target are placeholders that
       `fitImpact()` replaces as soon as the stage has been measured — see there
       for why this view, alone of the three, is fitted rather than framed by
       hand. */
    ...(scenes.impact ? {
      impact: { yaw: 0.34, pitch: -0.16, distance: 14, target: [0, 2.5, 0] },
    } : {}),
    /* The city is seen from lower and further round than the skyline. Lower,
       because a city read from above is a map and the towers stop having
       height; further round, because the streets are the only thing in the
       scene that is not billboarded, and they need enough angle to foreshorten
       and say which way the ground is lying.
   
       Fitted like the skyline, and for a sharper version of the same reason:
       the plan grows in both directions as co-authors are added, so a distance
       written down here would be wrong in a way nobody would notice until the
       far side of the city was outside the frame. */
    ...(cited ? {
      influence: { yaw: 0.62, pitch: -0.26, distance: 16, target: [0, 1.4, 0] },
    } : {}),
  };

  /* A deep copy of where each view starts, so "reset" has somewhere to go back
     to. Taken before anything can move it — panning makes it possible to push
     the scene off the edge entirely, and a 3D panel with no way back is a trap.
     `structuredClone` rather than a spread: `target` is an array, and a shallow
     copy would hand the "original" the very array the camera then mutates. */
  const HOME = structuredClone(camera);

  let fly = null;

  const size = () => ({
    width: stage.clientWidth || 1,
    height: stage.clientHeight || 1,
  });

  function resize() {
    const { width, height } = size();
    renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
  }

  /**
   * Stand the skyline camera back far enough to hold the whole row.
   *
   * WHY THIS ONE VIEW IS FITTED AND THE OTHER TWO ARE NOT
   * -----------------------------------------------------
   * Because it is the only one whose shape fights the stage's. The graph is a
   * compact ball a few units across, and the timeline recedes along the axis
   * the frame does not constrain; either can be framed with a number written
   * down once. The skyline is a row seventeen columns wide and five units tall,
   * and the stage runs from about 4:1 on a desktop to about 1.4:1 on a phone.
   * A single distance that fits both does not exist: the one that fills a
   * desktop stage cuts a phone's row off at 2015, and the one that holds the
   * phone leaves a desktop reader looking at a model of a skyline on a large
   * empty table. The first version of this used one number and did the latter.
   *
   * So it is solved instead, from the frustum, twice: the distance at which the
   * row's width fits across, and the distance at which its height fits up. The
   * larger wins, because fitting means fitting both.
   *
   * It is called on mount, on resize and on every switch to this view, and it
   * moves `HOME` with it so `Reset view` comes back to the fitted framing
   * rather than to a distance that was right on some other screen.
   */
  function fitImpact() {
    fitOne('impact');
    fitOne('influence');
  }

  /**
   * Stand a camera back far enough to hold its whole scene.
   *
   * Two of the four views need this and the other two do not. The graph is a
   * compact ball and the timeline recedes along the axis the frame does not
   * constrain, so both can be framed with a number written down once. The
   * skyline is a row eighteen units wide and five tall, and the city is a plan
   * that grows in both directions every year — on a stage that runs from about
   * 4:1 on a desktop to 1.1:1 on a phone. No single distance fits both ends of
   * that: the one that fills a desktop stage cuts a phone's row off at 2015.
   *
   * So it is solved from the frustum instead, twice per view: the distance at
   * which the scene's width fits across, and the distance at which its height
   * fits up. The larger wins, because fitting means fitting both.
   *
   * Called on mount, on resize and on every switch to one of these views, and
   * it moves `HOME` with it so `Reset view` comes back to the fitted framing
   * rather than to a distance that was right on some other screen. Once the
   * reader has zoomed or panned, the framing is theirs and a resize does not
   * take it back.
   */
  function fitOne(which) {
    const scene4 = scenes[which];
    if (!scene4 || !camera[which]) return;
    const { width, height } = size();

    /* A stage with no area cannot be fitted to, and must not be guessed at.
       `size()` floors both to 1 so nothing divides by zero, which means a
       panel that has not been laid out yet reports a 1×1 stage — an aspect of
       0.4 after the clamp, about a ninth of the real one, which sends the
       camera to a distance of fifty for a scene eight units wide. The view then
       opens as a speck and stays there, because nothing else recomputes it.

       Leaving the distance alone instead costs nothing: the ResizeObserver
       calls this again the moment the stage has a size, and until then there is
       nothing on screen to be wrong. It happens for real when the panel is
       inside a collapsed ancestor, and it happened here in a browser whose
       viewport had gone to zero. */
    if (width < 2 || height < 2) return;

    const aspect = Math.max(0.4, width / Math.max(1, height));
    const t = Math.tan(FOV / 2);

    /* What has to be in shot, as a box, from the ground up.

       The city is a different shape and wants working out rather than guessing.
       Its ground plane is a disc of radius R lying flat, and a disc tilted by
       the camera's pitch stands up the frame over [−R·sinθ, +R·sinθ] — centred on
       zero, because the ground is at zero. The towers then rise from wherever
       their base lands, so the whole scene spans about −R·sinθ up to R·sinθ plus
       the tallest tower.

       BOTH HALVES OF THAT WERE WRONG ONCE, in opposite directions, and the
       second was the one that showed. The first version allowed a flat 0.55 of
       the plan's width for the rise and over-estimated it by more than double.
       The second computed the rise properly but then centred the camera on the
       middle of [floor, ceiling] — which put the target a clear unit and a half
       above the city, so it sat along the bottom edge of the stage with the sky
       above it. The centre is half the tower height, not half the box. */
    const isCity = which === 'influence';

    let halfW;
    let halfH;
    let centreY;

    if (isCity) {
      const rise = Math.abs(Math.sin(camera[which].pitch)) * scene4.radius;
      halfW = scene4.halfWidth + 0.4;
      halfH = rise + scene4.top / 2 + 0.25;
      centreY = scene4.top / 2;
    } else {
      /* The skyline's floor is generous and its ceiling is not, which is
         deliberate: the space below holds the year labels, which hang beneath
         the baseline, and because the box is centred in the frame, taking it
         from the bottom also lifts the whole row clear of the controls strip. A
         symmetrical margin put the leftmost label half outside the stage, which
         `overflow: hidden` on the label layer then cut in half. */
      const floor = -1.45;
      const ceiling = scene4.top + 0.45;
      halfW = scene4.halfWidth + 0.6;
      halfH = (ceiling - floor) / 2;
      centreY = (ceiling + floor) / 2;
    }

    const forWidth = halfW / (t * aspect);
    const forHeight = halfH / t;
    // 1.06 is air around the edges; the clamp is the same range the wheel works
    // in, so a fit can never put the reader outside their own zoom limits.
    const fitted = Math.max(2.5, Math.min(90, Math.max(forWidth, forHeight) * 1.06));

    camera[which].target[1] = centreY;
    HOME[which].target[1] = camera[which].target[1];
    HOME[which].distance = fitted;
    /* Only move the live camera if the reader has not taken it somewhere. Once
       they have zoomed or panned, the framing is theirs and a resize must not
       confiscate it — `Reset view` is how they ask for it back. */
    if (!touched[which]) camera[which].distance = fitted;
  }

  /* Which views the reader has moved for themselves. See `fitOne`. */
  const touched = { impact: false, influence: false };

  /* ---- highlighting ------------------------------------------------------ */

  /** Rewrite the per-vertex state arrays for the current hover/selection. */
  function paintStates() {
    const active = hovered !== null ? hovered : selected;
    const quads = scene.quads.state;
    const lines = scene.lines.state;

    if (active === null) {
      quads.fill(0);
      lines.fill(0);
    } else if (aboutPeople(scene)) {
      const neighbours = new Set();
      scene.edges.forEach((e) => {
        if (e.source === active) neighbours.add(e.target);
        else if (e.target === active) neighbours.add(e.source);
      });
      for (let i = 0; i < scene.nodes.length; i++) {
        const value = i === active ? 1 : neighbours.has(i) ? 0.55 : -1;
        for (let c = 0; c < 6; c++) quads[i * 6 + c] = value;
      }
      scene.edges.forEach((e, k) => {
        const on = e.source === active || e.target === active;
        lines[k * 2] = lines[k * 2 + 1] = on ? 1 : -1;
      });
    } else {
      for (let i = 0; i < scene.cards.length; i++) {
        const value = i === active ? 1 : -1;
        for (let c = 0; c < 6; c++) quads[i * 6 + c] = value;
      }
    }
    renderer.updateState();
  }

  /* ---- labels ------------------------------------------------------------ */

  const labelPool = [];
  const bandPool = [];

  function poolAt(pool, i, extraClass) {
    if (!pool[i]) {
      const node = el('span', { class: 'explorer__label' + (extraClass ? ' ' + extraClass : '') });
      labels.append(node);
      pool[i] = node;
    }
    return pool[i];
  }
  const labelAt = (i) => poolAt(labelPool, i);
  const bandAt = (i) => poolAt(bandPool, i, 'explorer__label--year');

  /** Hide a pool. `forEach` and not `for…of`: these arrays have holes. */
  const hideAll = (pool) => pool.forEach((tag) => { if (tag) tag.hidden = true; });

  /**
   * The year markers on the timeline.
   *
   * Each band gets its year above it, fading with distance — which is what
   * turns a field of cards into a corridor you can read: without them the
   * further bands are just smaller cards.
   */
  function paintYears(view4, projection, width, height) {
    // Nearest first, so that when two years collide it is the further one that
    // gives way — at the far end of the corridor a dozen labels land within a
    // few pixels of each other and, unmanaged, print as a smudge.
    const placed = [];
    const overlaps = (box) => placed.some((other) =>
      Math.abs(box.x - other.x) < (box.w + other.w) / 2 &&
      Math.abs(box.y - other.y) < (box.h + other.h) / 2);

    /* The timeline's bands recede along Z and are all centred on x = 0; the
       skyline's stand side by side along X and are all at z = 0. One painter
       serves both because a band says where it is rather than assuming, and a
       band with no `x` is at the origin, which is what the timeline's are. */
    const impact = scene.kind === 'impact';

    /* WHICH LABEL WINS A COLLISION

       The boxes are claimed in the order they are visited, so the order is the
       priority. On the timeline that is nearest-first, because at the far end
       of the corridor a dozen labels land within a few pixels of each other and
       the near ones are the legible ones.

       On the skyline seventeen years share a row about five hundred pixels
       wide, so fewer than half the labels can be drawn whatever is done, and
       the question is which half. Tallest-first: the columns worth naming are
       the ones a reader is looking at, and a row labelled 2016, 2020, 2024 says
       something, where the same row labelled 2009, 2010, 2012 — which is what
       source order gives — says only that those years came first. */
    const order = impact
      ? scene.bands
        .map((band, i) => ({ band, i }))
        .sort((a, b) => b.band.citations - a.band.citations)
      : scene.bands.map((band, i) => ({ band, i }));

    order.forEach(({ band, i }) => {
      const tag = bandAt(i);
      const p = project([band.x || 0, band.top, band.z || 0], view4, projection, width, height);
      if (!p.visible || p.x < -60 || p.x > width + 60) { tag.hidden = true; return; }

      /* On the skyline the number beside the year is the citations, because
         that is what the column's height is; on the timeline it is the papers,
         because that is what the band's size is. In both cases the label says
         what the shape under it means, which is the only thing a label on a
         chart is for. */
      const text = impact
        ? band.year + ' · ' + band.citations
        : band.year + ' · ' + band.count;
      const w = text.length * 7.4 + 8;
      /* The end labels are nudged back inside the stage.

         A label is centred on its column, and on the skyline the outermost
         columns stand at the edge of the frame — so half of "2009 · 6" hangs
         over the side, where the label layer's `overflow: hidden` cuts it in
         half and leaves "009 · 6". Standing the camera further back to make
         room would shrink the whole row for the sake of two labels; a chart
         does not do that either, it tucks its end labels in. The nudge is at
         most half a label and only ever at the two ends. */
      const x = impact ? Math.min(width - w / 2 - 2, Math.max(w / 2 + 2, p.x)) : p.x;

      const box = { x, y: p.y, w, h: 20 };
      if (overlaps(box)) { tag.hidden = true; return; }
      placed.push(box);

      if (tag.textContent !== text) tag.textContent = text;
      tag.hidden = false;
      tag.style.transform = 'translate(-50%, -50%) translate(' +
        Math.round(x) + 'px,' + Math.round(p.y) + 'px)';
      // Nearer years are more legible than far ones, which is the point.
      tag.style.opacity = String(Math.max(0.3, Math.min(1, 16 / Math.max(1, p.depth))));
    });
  }

  /**
   * Draw the name tags.
   *
   * They are HTML, positioned over the canvas, rather than text rendered into
   * it. Three reasons, all of which matter here: Persian names get the site's
   * own Persian face and its right-to-left shaping for free; the text is real
   * text, so it is crisp at any pixel ratio; and it costs no texture atlas.
   */
  function paintLabels(view4, projection) {
    const { width, height } = size();

    if (!aboutPeople(scene)) {
      hideAll(labelPool);
      paintYears(view4, projection, width, height);
      return;
    }
    hideAll(bandPool);
    const active = hovered !== null ? hovered : selected;
    const neighbours = new Set();
    if (active !== null) {
      scene.edges.forEach((e) => {
        if (e.source === active) neighbours.add(e.target);
        else if (e.target === active) neighbours.add(e.source);
      });
    }

    // Candidates in order of importance. The order matters: it is also the
    // order they claim space in, so when two labels collide the less important
    // one is the one that goes.
    const wanted = [];
    if (active !== null) wanted.push(active);
    scene.nodes.forEach((_, i) => { if (neighbours.has(i) && i !== active) wanted.push(i); });
    if (active === null) {
      for (let i = 0; i < scene.nodes.length && wanted.length < ALWAYS_LABELLED; i++) wanted.push(i);
    }
    const wantedSet = new Set(wanted);

    /* Collision avoidance. Without it the labels pile up on the hub — which is
       exactly where the graph is densest and where the names matter most — and
       the result is unreadable however good the layout underneath is. Boxes are
       approximated from the text length rather than measured, because measuring
       forces a layout pass per label per frame. */
    const placed = [];
    const overlaps = (box) => placed.some((other) =>
      Math.abs(box.x - other.x) < (box.w + other.w) / 2 &&
      Math.abs(box.y - other.y) < (box.h + other.h) / 2);

    for (const i of wanted) {
      const node = scene.nodes[i];
      const tag = labelAt(i);
      /* A node says where its own name goes when the two are not the same
         place. On the graph they are — a sphere's name belongs over its middle.
         On the city they are not: a tower's anchor is its middle, which is
         where the pointer should find it, but a tag printed there sits across
         the front of the building and hides exactly the height it is there to
         label. The tallest towers are the ones that get named, so this was not
         a small blemish; it covered the whole subject of the view. */
      const p = project(node.labelPosition || node.position, view4, projection, width, height);
      if (!p.visible) { tag.hidden = true; continue; }

      if (tag.textContent !== node.person.label) {
        tag.textContent = node.person.label;
        // Persian names need the Persian face and right-to-left shaping; both
        // come from the document once the element is marked.
        if (node.person.script === 'fa') { tag.lang = 'fa'; tag.dir = 'rtl'; }
      }

      const x = p.x;
      // A node that named its own anchor has already put it clear of itself;
      // lifting it again by the hover radius would leave it floating.
      const y = p.y - (node.labelPosition ? 8 : node.radius * 26 + 10);
      const box = { x, y, w: node.person.label.length * 6.4 + 14, h: 20 };

      // The lit node always gets its label; everything else yields to it.
      if (i !== active && (overlaps(box) || x < 0 || x > width || y < 0 || y > height)) {
        tag.hidden = true;
        continue;
      }
      placed.push(box);

      tag.hidden = false;
      tag.classList.toggle('is-lit', i === active);
      tag.style.transform = 'translate(-50%, -50%) translate(' +
        Math.round(x) + 'px,' + Math.round(y) + 'px)';
      tag.style.opacity = String(Math.max(0.35, Math.min(1, 26 / p.depth)));
    }

    // Anything not in this frame's shortlist is hidden.
    labelPool.forEach((tag, i) => { if (tag && !wantedSet.has(i)) tag.hidden = true; });
  }

  /* ---- the loop ---------------------------------------------------------- */

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    const cam = camera[view];

    if (fly) {
      fly.t = Math.min(1, fly.t + dt / fly.duration);
      const k = easeInOut(fly.t);
      for (let i = 0; i < 3; i++) cam.target[i] = fly.from[i] + (fly.to[i] - fly.from[i]) * k;
      cam.distance = fly.fromDistance + (fly.toDistance - fly.fromDistance) * k;
      if (fly.t >= 1) fly = null;
    }

    /* The idle turn is the ball's alone.

       The city was given it too at first and it was wrong twice over: a plan
       drifting under a fixed light keeps changing which towers stand in front
       of which, so the picture never settles long enough to be read, and the
       street you were about to point at walks out from under the cursor. The
       ball has no such reading — it is a cloud you are meant to see around —
       and the turn is what shows you that it is one. */
    if (view === 'graph' && !dragging && hovered === null && !reduced.matches) {
      cam.yaw += SPIN * dt;
    }

    const { width, height } = size();
    const { projection, view: viewMatrix } = matrices(cam, width / Math.max(1, height));
    renderer.draw(viewMatrix, projection);
    paintLabels(viewMatrix, projection);

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  /** One frame, for the reduced-motion and paused cases. */
  function drawOnce() {
    const cam = camera[view];
    const { width, height } = size();
    const { projection, view: viewMatrix } = matrices(cam, width / Math.max(1, height));
    renderer.draw(viewMatrix, projection);
    paintLabels(viewMatrix, projection);
  }

  const sync = () => {
    if (visible && !document.hidden) start();
    else { stop(); }
  };

  /* ---- hit testing ------------------------------------------------------- */

  function itemsOf(current) {
    return aboutPeople(current) ? current.nodes : current.cards;
  }

  /** The nearest item to a point in CSS pixels, or null. */
  function pick(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cam = camera[view];
    const { projection, view: viewMatrix } = matrices(cam, rect.width / Math.max(1, rect.height));

    let best = null;
    let bestDistance = Infinity;
    itemsOf(scene).forEach((item, i) => {
      const p = project(item.position, viewMatrix, projection, rect.width, rect.height);
      if (!p.visible) return;
      const d = Math.hypot(p.x - x, p.y - y);
      // Bigger things are easier to hit, which is both physically right and
      // what makes the hubs feel solid.
      const reach = HOVER_SLOP + item.radius * 22;
      if (d < reach && d < bestDistance) { bestDistance = d; best = i; }
    });
    return best;
  }

  /**
   * The portrait, for a person who has one.
   *
   * `src` is left in place when the frame hides: the same face is usually the
   * next one asked for — hover out, hover back — and clearing it would throw
   * away a decoded image to gain nothing.
   */
  function showFace(person) {
    const face = person && faces.get(person.key);
    if (!face) {
      portrait.hidden = true;
      return;
    }
    if (portraitImg.getAttribute('src') !== face.url) {
      portraitImg.src = face.url;
      portraitImg.alt = '';
    }
    portraitName.textContent = face.name || person.label;
    portraitGroup.textContent = face.group || '';
    portrait.hidden = false;
  }

  function describe(index) {
    if (index === null) {
      caption.textContent = hintFor(view);
      readout.textContent = '';
      showFace(null);
      return;
    }
    if (aboutPeople(scene)) {
      const person = scene.nodes[index].person;
      const partners = scene.edges.filter((e) => e.source === index || e.target === index).length;
      readout.textContent = person.label + ' · ' + person.count +
        (person.count === 1 ? ' publication' : ' publications') + ' · ' +
        partners + (partners === 1 ? ' co-author' : ' co-authors') +
        // Only when there is a number, and only when it is not zero: "0
        // citations" under a first-year student's name is a true sentence that
        // reads as a verdict.
        (cited && person.citations ? ' · ' + count(person.citations) + ' citations' : '');
      showFace(person);
    } else {
      showFace(null);
      const paper = scene.cards[index].paper;
      /* The citation count goes FIRST on the skyline and last on the timeline.
         On the skyline it is what the reader is pointing at — the height of the
         segment under the cursor is that number — so it leads; on the timeline
         the paper is what they are pointing at and the number is a footnote to
         it. Same data, and the order is the difference between answering the
         question and burying it. */
      const impact = scene.kind === 'impact';
      /* A zero is left unsaid everywhere, the skyline included.
         The skyline used to append "not yet cited" on the argument that the
         reader is pointing at a block four pixels tall and deserves to know
         why. But the height already says it, and spelling it out turns a
         neutral absence into a verdict delivered under the paper's own title —
         which is the same reason the graph and the timeline have always left a
         zero unsaid. The year and the title still answer "what am I pointing
         at", which is what the readout is for. */
      const cites = paper.citedBy
        ? count(paper.citedBy) + (paper.citedBy === 1 ? ' citation' : ' citations')
        : '';
      /* The count leads on the skyline and trails on the timeline — on the
         skyline it is what the cursor is actually on, so it goes first. Both
         branches now have to cope with it being absent, hence the separator
         travelling WITH the count rather than sitting between the two: an
         empty count must not leave a leading or a doubled "·". */
      readout.textContent = impact
        ? (cites ? cites + ' · ' : '') + paper.year + ' · ' + paper.title
        : paper.year + ' · ' + paper.sectionTitle + ' · ' + paper.title +
          (cites ? ' · ' + cites : '');
    }
  }

  /* ---- interaction ------------------------------------------------------- */

  /**
   * Slide the scene in the plane of the screen.
   *
   * The axes are read out of the view matrix rather than rebuilt from yaw and
   * pitch. For a column-major world-to-view matrix the ROWS of its rotation
   * part are the camera's own axes in world space — `(m0, m4, m8)` is right and
   * `(m1, m5, m9)` is up — whichever way round the conventions in camera.js
   * happen to be. Deriving them again from the angles is a second place for a
   * sign to be wrong, and a pan with a sign error is maddening rather than
   * obviously broken.
   *
   * Pixels become world units through the height of the frustum at the target's
   * distance, so a node stays under the pointer while you drag it. Anything else
   * feels like nudging a camera rather than moving the thing.
   */
  function pan(dx, dy) {
    const cam = camera[view];
    const { width, height } = size();
    const { view: m } = matrices(cam, width / Math.max(1, height));
    const right = [m[0], m[4], m[8]];
    const up = [m[1], m[5], m[9]];
    const perPixel = (2 * cam.distance * Math.tan(FOV / 2)) / Math.max(1, height);
    for (let i = 0; i < 3; i++) {
      // Drag right and the scene goes right, so the target goes left.
      cam.target[i] += -dx * perPixel * right[i] + dy * perPixel * up[i];
    }
    if (touched[view] === false) touched[view] = true;
    fly = null;
    if (!raf) drawOnce();
  }

  /** Put the view back to the composition the reader first saw. */
  function resetView() {
    /* On a fitted view "Reset" means "fit it to this stage again", not "go back
       to the number you were born with" — the reader may have resized the
       window since, and the fitted framing is the composition they are asking
       for. `fitOne` rewrites HOME, so the copy below picks it up. */
    if (touched[view] !== undefined) { touched[view] = false; fitOne(view); }
    const home = HOME[view];
    const cam = camera[view];
    cam.yaw = home.yaw;
    cam.pitch = home.pitch;
    cam.distance = home.distance;
    cam.target = [...home.target];
    fly = null;
    if (!raf) drawOnce();
  }
  resetButton.addEventListener('click', resetView);

  /* Right-drag has to be able to start, so the stage's context menu goes. There
     is nothing on a canvas for it to offer, and it is suppressed only over the
     stage, never over the page. */
  stage.addEventListener('contextmenu', (e) => e.preventDefault());

  /* How near and how far the wheel may take you. Wide, because the two views
     are framed at completely different scales — a compact ball of nodes and a
     corridor two decades long. */
  const MIN_DISTANCE = 2.5;
  const MAX_DISTANCE = 90;

  stage.addEventListener('wheel', (e) => {
    /* Zoom — but the wheel is only swallowed while it is doing something. A
       panel this tall with an unconditional `preventDefault` traps the reader:
       you scroll down the page, the cursor crosses the panel, and the page
       stops moving. Once the zoom is against its stop, further wheel in that
       direction is left to the page and scrolling continues, so someone reading
       rather than exploring simply carries on down the page. */
    const cam = camera[view];
    const step = Math.exp(Math.max(-120, Math.min(120, e.deltaY)) * 0.0016);
    const next = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, cam.distance * step));
    if (Math.abs(next - cam.distance) < 0.0005) return;

    e.preventDefault();
    cam.distance = next;
    if (touched[view] === false) touched[view] = true;
    /* A fly-to in progress owns `distance`, and would drag it straight back to
       wherever it was going. Cancel it: the reader has taken over. */
    fly = null;
    if (!raf) drawOnce();
  }, { passive: false });

  stage.addEventListener('pointermove', (e) => {
    if (dragging) {
      const cam = camera[view];
      const dx = e.clientX - dragging.x;
      const dy = e.clientY - dragging.y;
      dragging.x = e.clientX;
      dragging.y = e.clientY;
      dragging.moved += Math.abs(dx) + Math.abs(dy);
      if (dragging.panning) { pan(dx, dy); return; }
      cam.yaw += dx * 0.006;
      cam.pitch = Math.max(-1.2, Math.min(1.2, cam.pitch + dy * 0.005));
      if (!raf) drawOnce();
      return;
    }
    const hit = pick(e.clientX, e.clientY);
    if (hit === hovered) return;
    hovered = hit;
    stage.classList.toggle('is-pointing', hit !== null);
    paintStates();
    describe(hit);
    if (!raf) drawOnce();
  });

  stage.addEventListener('pointerleave', () => {
    if (hovered === null) return;
    hovered = null;
    stage.classList.remove('is-pointing');
    paintStates();
    describe(selected);
    if (!raf) drawOnce();
  });

  stage.addEventListener('pointerdown', (e) => {
    // The right button for a mouse; Ctrl (or Cmd) for a trackpad with no
    // comfortable right-drag. Either one means "move it" rather than "turn it".
    const panning = e.button === 2 || e.ctrlKey || e.metaKey;
    dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, panning };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add(panning ? 'is-panning' : 'is-dragging');
  });

  const endDrag = (e) => {
    if (!dragging) return;
    const wasClick = dragging.moved < 6;
    const at = { x: e.clientX, y: e.clientY };
    dragging = null;
    stage.classList.remove('is-dragging', 'is-panning');
    if (wasClick && at.x !== undefined) {
      const hit = pick(at.x, at.y);
      if (hit !== null) activate(hit);
    }
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', () => {
    dragging = null;
    stage.classList.remove('is-dragging', 'is-panning');
  });

  /** Clicking a node filters the list; clicking a card jumps to the entry. */
  function activate(index) {
    if (aboutPeople(scene)) {
      const person = scene.nodes[index].person;
      selected = selected === index ? null : index;
      applyFilter(selected === null ? null : person);
    } else {
      const paper = scene.cards[index].paper;
      selected = index;
      paintStates();
      if (onReveal) onReveal(paper.id);
    }
  }

  function applyFilter(person) {
    if (!person) {
      selected = null;
      clearButton.hidden = true;
      paintStates();
      describe(null);
      if (onFilter) onFilter(null, '');
      return;
    }
    clearButton.hidden = false;
    paintStates();
    describe(selected);
    if (onFilter) onFilter(person.papers, person.label);
  }

  /* ---- views ------------------------------------------------------------- */

  const GRAPH_HINT = graph.people.length + ' co-authors, ' + graph.edges.length +
    ' collaborations. Drag to turn it; point at a name to light their work; click to filter the list.'
    + (cited ? ' Sizes are papers written — press “Size” for citations earned.' : '');
  const TIMELINE_HINT = scenes.timeline.cards.length + ' dated publications, ' +
    scenes.timeline.bands.length + ' years. Pick a year to fly to it; click a card to jump to the entry.'
    + (cited ? ' A bigger card is a more-cited paper.' : '');
  const IMPACT_HINT = scenes.impact
    ? count(scenes.impact.total) + ' citations across ' + scenes.impact.bands.length +
      ' years. Each column is a year and each block in it a paper; taller is more '
      + 'cited. Click a block to jump to the entry.'
    : '';
  const INFLUENCE_HINT = cited
    ? 'Every co-author as a tower: its height is the citations their papers have '
      + 'earned, its footprint the papers they have written, and the lines on the '
      + 'ground are the papers they share. Hamed Sadeghi himself is not in it — he '
      + 'is on every paper, so the shape is what the work looks like without him. '
      + 'Click a tower to filter the list.'
    : '';

  /** What the caption says over each view. */
  const HINTS = {
    graph: GRAPH_HINT,
    timeline: TIMELINE_HINT,
    impact: IMPACT_HINT,
    influence: INFLUENCE_HINT,
  };
  const hintFor = (which) => HINTS[which] || '';

  /**
   * Swap the graph's node sizes between papers and citations.
   *
   * The scene is rebuilt rather than having its `size` buffer rewritten in
   * place. Rebuilding is about a millisecond at this size, it reuses the solved
   * layout so nothing moves — only the radii change, which is exactly the
   * comparison the toggle exists to make — and it keeps `radiusFor` and
   * `radiusForCitations` as the only two places a node's size is decided.
   */
  function toggleSize() {
    if (!cited) return;
    sizeBy = sizeBy === 'citations' ? 'papers' : 'citations';
    scenes.graph = buildGraphScene(graph, layout, readPalette(), look.edge, sizeBy);
    // `sizeBy` is what the scene actually did, which is not always what was
    // asked — with no usable citation totals it falls back to papers, and the
    // label has to say the truth rather than the request.
    const actual = scenes.graph.sizeBy;
    if (sizeButton) {
      $('.explorer__size-label', sizeButton).textContent =
        actual === 'citations' ? 'Size: citations' : 'Size: papers';
      sizeButton.classList.toggle('is-on', actual === 'citations');
    }
    if (view === 'graph') {
      scene = scenes.graph;
      renderer.setScene(scene);
      paintStates();
      if (!raf) drawOnce();
    }
  }

  function showView(next) {
    if (next === view || !(scenes[next] || (cited && LAZY[next]))) return;
    view = next;
    scene = sceneFor(next);
    hovered = null;
    selected = null;
    clearButton.hidden = true;
    if (onFilter) onFilter(null, '');
    panel.dataset.view = next;
    yearRow.hidden = next !== 'timeline';
    // The stage may have been resized while another view was in front.
    if (touched[next] !== undefined) fitOne(next);
    // The toggle belongs to the graph; the other two views size themselves.
    if (sizeButton) sizeButton.hidden = next !== 'graph';
    for (const [id, button] of Object.entries(tabs)) {
      button.setAttribute('aria-selected', String(id === next));
    }
    renderer.setScene(scene);
    paintStates();
    describe(null);
    if (!raf) drawOnce();
  }

  /**
   * Travel to one year, or back to the whole span.
   *
   * @param {object|null} band  null means "show everything"
   */
  function flyTo(band, chip) {
    const cam = camera.timeline;
    const toDistance = band ? YEAR_DISTANCE : SPAN_DISTANCE;
    // The sideways offset is measured in world units, so it has to shrink with
    // the camera distance or the composition slides off screen as you zoom in.
    const k = toDistance / SPAN_DISTANCE;
    const to = band
      ? [TIMELINE_OFFSET[0] * k, TIMELINE_OFFSET[1] * k, band.z]
      : [TIMELINE_OFFSET[0], TIMELINE_OFFSET[1], -3.4 * YEAR_GAP];

    if (reduced.matches) {
      // Someone who asked for less motion gets the destination, not the trip.
      cam.target = to;
      cam.distance = toDistance;
      fly = null;
    } else {
      fly = {
        from: cam.target.slice(),
        to,
        fromDistance: cam.distance,
        toDistance,
        t: 0,
        duration: 0.9,
      };
    }

    for (const other of yearRow.children) other.classList.toggle('is-current', other === chip);
    readout.textContent = band
      ? band.year + ' · ' + band.count + (band.count === 1 ? ' publication' : ' publications')
      : '';
    if (!raf) drawOnce();
  }

  /* ---- the written view -------------------------------------------------- */

  /**
   * The same actions as plain HTML: the top collaborators and every year, as
   * buttons. It is always in the document — collapsed when the 3D is working,
   * open when it is not — so keyboard users, screen readers and browsers
   * without WebGL are not offered a worse version of the page, just a
   * different-looking one.
   */
  function buildWrittenView() {
    const top = graph.people.filter((p) => !p.self).slice(0, 12);
    const people = el(
      'ul',
      { class: 'explorer__list' },
      top.map((person) =>
        el(
          'li',
          {},
          el(
            'button',
            { type: 'button', class: 'explorer__pick', dataset: { author: person.key } },
            el('span', { class: 'explorer__pick-name', text: person.label, lang: person.script === 'fa' ? 'fa' : null, dir: person.script === 'fa' ? 'rtl' : null }),
            el('span', {
              class: 'explorer__pick-count',
              text: String(person.count),
              /* The 3D has two figures per person and this list had one. The
                 second goes in the tooltip rather than in a second chip: the
                 list is a column of buttons whose job is to filter, and a
                 second number in each of them turns a control into a table. */
              title: cited && person.citations
                ? person.count + ' publications · ' + count(person.citations) + ' citations'
                : person.count + (person.count === 1 ? ' publication' : ' publications'),
            }),
          ),
        ),
      ),
    );
    people.addEventListener('click', (e) => {
      const button = e.target.closest('.explorer__pick');
      if (!button) return;
      const person = graph.people.find((p) => p.key === button.dataset.author);
      if (!person) return;
      const already = button.classList.contains('is-on');
      [...people.querySelectorAll('.explorer__pick')].forEach((b) => b.classList.remove('is-on'));
      if (already) { applyFilter(null); return; }
      button.classList.add('is-on');
      selected = graph.index.get(person.key) ?? null;
      applyFilter(person);
    });

    return el(
      'details',
      { class: 'explorer__written' },
      el('summary', { text: 'Most frequent co-authors — click to filter' }),
      people,
      el('p', {
        class: 'explorer__note',
        text: graph.people.length + ' co-authors across ' + graph.papers.length +
          ' publications, computed from the list below. ' +
          /* The same sentence the Impact view draws, written out. Someone
             without WebGL should be told what the skyline would have said, not
             merely that there is a skyline they cannot see — and the figure is
             the interesting one: most of the citations on this record belong to
             a handful of papers. */
          (cited
            ? count(graph.citations.total) + ' citations across '
              + graph.citations.cited + ' of them. '
            : '') +
          (scenes.timeline.undated
            ? scenes.timeline.undated + ' undated entries are absent from the timeline.'
            : ''),
      }),
    );
  }

  /* ---- lifecycle --------------------------------------------------------- */

  renderer.setScene(scene);
  resize();
  fitImpact();
  describe(null);
  drawOnce();

  const onResize = () => { resize(); fitImpact(); if (!raf) drawOnce(); };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(stage);
  else window.addEventListener('resize', onResize, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      sync();
    }, { threshold: 0.05 }).observe(panel);
  } else { visible = true; sync(); }

  document.addEventListener('visibilitychange', sync);

  new MutationObserver(() => {
    look = readLook();
    renderer.setLook(look);
    const next = readPalette();
    // `sizeBy` is passed back in, not defaulted: a reader who switched the graph
    // to citations and then switched the page to dark mode did not ask for the
    // sizes to change back, and having them do so was the kind of bug that
    // looks like the toggle is broken rather than like the theme is.
    scenes.graph = buildGraphScene(graph, layout, next, look.edge, sizeBy);
    scenes.timeline = buildTimelineScene(graph, next);
    if (scenes.impact) scenes.impact = buildImpactScene(graph, next);
    // The solved plan is reused, not re-solved: a change of colour scheme is
    // not a reason to move a hundred and nineteen people.
    if (scenes.influence) scenes.influence = buildInfluenceScene(city, ground, next, look.edge);
    scene = scenes[view];
    renderer.setScene(scene);
    paintStates();
    if (!raf) drawOnce();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const api = {
    renderer: kind,
    people: graph.people.length,
    edges: graph.edges.length,
    papers: graph.papers.length,
    // What check-ui.mjs asks, so the citation layer can be tested without
    // reading pixels: whether the numbers arrived, how many joined, and which
    // question the graph is currently sizing by.
    cited: graph.citations.cited,
    citations: graph.citations.total,
    // What the tabs offer, not what has been built — `influence` waits for its
    // first click (see LAZY) and a checker must not read that as missing.
    views: Object.keys(tabs),
    // The tallest tower in the city, once there is a city. Zero before it has
    // been opened, so check-ui asks after switching to it rather than before.
    cityTop: () => (scenes.influence ? scenes.influence.top : 0),
    sizeBy: () => scenes.graph.sizeBy,
    toggleSize,
    view: () => view,
    show: showView,
    stop,
    /* Where the camera is, for the two views that compute it rather than being
       told (`fitOne`). A framing bug in those is invisible from the DOM and
       maddening to chase from a screenshot; this is the number to print. */
    camera: () => ({ ...camera[view], target: [...camera[view].target] }),
  };
  window.__explorer = api;
  return api;
}
