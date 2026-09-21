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
 * index.js — the research team as a 3D roster you can fly around.
 *
 * WHAT IT IS
 * ----------
 * Fifty-five people, each a real slab with real thickness carrying their own
 * photograph on its face and their completion year printed along the bottom,
 * arranged in five corridors — one per category — receding from the camera in
 * the order they joined. The newest person in each group is nearest and
 * highest; the corridor descends and recedes as it goes back in time.
 *
 * WHY THIS ARRANGEMENT
 * --------------------
 * Three things had to be true at once and this is the layout where they are:
 *
 *   the order must survive   the page's lists are maintained newest-first, so a
 *                            person's position in them records when they
 *                            arrived. The corridor keeps that order exactly.
 *   the categories must be   the five filter buttons correspond to the five
 *   somewhere                corridors, so filtering is a thing you can watch
 *                            happen in space rather than a list re-rendering.
 *   it must fit              thirty-two MPhil students stacked vertically is
 *                            forty-odd units of wall and no camera frames it.
 *                            Along Z perspective does the compressing for free,
 *                            which is the same reason the publications timeline
 *                            runs that way.
 *
 * WHY THREE.JS ONLY
 * -----------------
 * The rest of the site's 3D has two renderers, because the field and the
 * publications explorer are the only way to see what they show. This is not:
 * it is a second view of a list that is directly underneath it on the same
 * page. So when Three or WebGL is missing, the panel is simply not built and
 * the roster below is untouched — a real fallback that needed no second
 * implementation. `window.__roster` reports what happened.
 *
 * COST
 * ----
 * One texture (every photograph packed into a single image — see atlas.js), one
 * geometry per person, and rendering ON DEMAND: a frame is drawn when something
 * changes and not otherwise. A page left open on this section costs nothing.
 */

import { el } from '../dom.js';
import { icon } from '../icons.js';
import { loadThree } from '../fx/three.js';
import { buildAtlas } from './atlas.js';
import { CATEGORIES, buildRoster } from './data.js';

/* ---- the shape of a card ------------------------------------------------- */
const CARD_W = 1.12;
const CARD_H = 1.40;
const CARD_D = 0.17;

/* ---- the shape of the arrangement ----------------------------------------
   Each category is a block three cards wide that recedes from the camera. The
   three-wide wrap is what keeps it legible: with thirty-two MPhil students in a
   single file the whole picture became one long queue disappearing to a point,
   dominated by one group, and you could not see the shape of anything else.
   Three across and eleven back is a block you can take in.

   Reading order is preserved exactly — across the front row first, then the
   next row back — so the newest three are still the nearest three and the
   oldest is still the furthest away.
   -------------------------------------------------------------------------- */
/**
 * Cards across one category before the order wraps to the next row back.
 *
 * WHY THIS IS NOT THREE ANY MORE
 * ------------------------------
 * It was three for every group, and three is right for a group of three. It is
 * wrong for a group of thirty-two: eleven rows deep is a corridor, and beside
 * it a category with one row leaves a hole most of the picture long. The gap
 * between the groups was not spacing, it was the difference in their depths.
 *
 * And the difference is getting worse, not better. These categories do not grow
 * at the same rate — the MPhil list grows fastest by some way, the PhD and BSc
 * lists at an ordinary rate, and the postdoctoral and visiting lists barely at
 * all. A layout with a fixed width per group encodes today's proportions and is
 * wrong again by next year.
 *
 * So the width is derived from the count instead: roughly the square root of
 * it, which is the width that keeps a block square-ish however large it gets.
 * Three across for the small groups, six for the largest, and the depths come
 * out close to each other without anything having to be tuned by hand. When the
 * MPhil list reaches fifty it will widen by itself.
 */
const MIN_COLS = 3;
const MAX_COLS = 6;

/**
 * Cards across, for a category of `count` people.
 *
 * Never more than there are: a group of two laid out three wide reserves a
 * column of empty floor beside it, and six groups each reserving one is most of
 * the hole this was meant to close.
 */
function columnsFor(count) {
  return Math.max(1, Math.min(
    count,
    MAX_COLS,
    Math.max(MIN_COLS, Math.round(Math.sqrt(count * 1.1))),
  ));
}

/** Sideways spacing inside a category, before the group's own scale. */
const COL_GAP = 1.24;
/** Clear space between one category's block and the next. */
const LANE_GAP = 0.95;
/** How far back each row goes, before the group's own scale. */
const Z_STEP = 1.42;

/**
 * How far each row RISES above the one in front of it.
 *
 * The first version let the rows descend slightly, so a group was a flat run of
 * cards going away from the camera — and with eleven rows of MPhil students the
 * ones at the back were both small and hidden behind the ones at the front. The
 * older the person, the harder they were to see or to click, which is precisely
 * backwards for a page whose job is to list everyone who has been through the
 * group. It will only get worse: these sections grow, and every new row pushes
 * the old ones further into the crowd.
 *
 * So the rows are raked, like seats in a lecture theatre. Each row sits higher
 * than the one in front, and the rake is chosen against the camera's own angle:
 * the pitch looks down at about 29 degrees and the rake climbs at about 27, so
 * every row clears the one in front of it however many of them there are.
 *
 * TWENTY-SEVEN AND NOT MORE
 * -------------------------
 * The first rake was 20 degrees, which cleared the row in front but not by
 * much: the back rows were still reading as a crowd. This one is as steep as it
 * can be made — the rake must stay UNDER the camera's pitch, because a rake
 * steeper than the angle you are looking down at folds the rows back on top of
 * each other and the far ones start hiding behind the near ones again, which is
 * the exact failure the rake exists to fix. Twenty-seven against twenty-nine is
 * the whole of the headroom, and the two degrees left are the margin.
 *
 * The rake is `ROW_RISE / Z_STEP` as an angle, so the two constants have to be
 * changed together or not at all.
 */
const ROW_RISE = 0.72;

/**
 * How large each group's cards are.
 *
 * WHY THE GROUPS ARE NOT DRAWN THE SAME SIZE
 * ------------------------------------------
 * The first version drew all fifty-five cards identically, and the picture that
 * came out emphasised the wrong people. With thirty-two MPhil students and nine
 * final-year undergraduates against three postdoctoral fellows, sheer mass put
 * the eye on the junior end of the group every time the page loaded. Nothing
 * was wrong with the arrangement: there was no hierarchy in it, and where there
 * is no hierarchy the biggest pile wins.
 *
 * So seniority is drawn. A fellow's card is about half again the size of a
 * final-year undergraduate's, and each group in turn starts a little further
 * back, so perspective adds to what the scale already says. Together they make
 * the reading order — fellows, PhDs, research assistants, MPhils, BScs — the
 * order the eye actually takes, without a caption having to say so.
 *
 * Indexed by lane: 0 Postdocs · 1 Visiting Scholars · 2 PhDs · 3 RAs ·
 * 4 MPhils · 5 BScs. One entry per category in `CATEGORIES` — the two lists are
 * read together and a short one would silently scale a whole group to nothing.
 */
const LANE_SCALE = [1.34, 1.24, 1.15, 1.02, 0.90, 0.84];

/** How much further back each group sits than the one before it. */
const LANE_SET_BACK = 1.15;

/* ---- the camera ---------------------------------------------------------- */
const MIN_DISTANCE = 4.5;
const MAX_DISTANCE = 40;
const MIN_PITCH = -0.15;
const MAX_PITCH = 0.95;

/** Seconds for a re-frame to travel. */
const FLY = 0.55;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Read a CSS custom property off <html>. */
function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Build the panel and mount it.
 *
 * @param {HTMLElement} host     where the panel goes
 * @param {object} data          data/research-team.json
 * @param {HTMLElement} listRoot the rendered roster, for click-to-scroll
 */
export async function mountRoster(host, data, listRoot) {
  const roster = buildRoster(data);
  if (!host || roster.people.length < 2) return { renderer: 'none' };

  const THREE = await loadThree();
  if (!THREE) {
    console.info('roster: Three.js is unavailable, leaving the list as it is.');
    return { renderer: 'none' };
  }

  /* ---- the palette -------------------------------------------------------
     One hue per category, from the same six the rest of the site lights
     sections with, so a PhD card is the same colour here as a PhD row is
     everywhere else. */
  const palette = CATEGORIES.map((_, i) => token(`--fx-hue-${i}`, '#0891b2'));
  roster.people.forEach((person) => { person.tint = palette[person.lane]; });

  /* ---- markup ------------------------------------------------------------
     Deliberately the explorer's own class names. The two panels are the same
     idea in two places and they should look like one thing; giving this a
     private set of nearly-identical styles is how a design system rots. */
  const canvas = el('canvas', { class: 'explorer__canvas' });
  const readout = el('p', { class: 'explorer__readout', role: 'status', 'aria-live': 'polite' });
  const stage = el('div', { class: 'explorer__stage' }, canvas, readout);

  const hint = el(
    'p',
    { class: 'explorer__hint' },
    el('span', {}, 'Drag to turn'),
    el('span', {}, 'Ctrl-drag or right-drag to move'),
    el('span', {}, 'Scroll to zoom'),
    el('span', {}, 'Click a card to open their entry'),
  );
  const resetButton = el(
    'button',
    { type: 'button', class: 'explorer__reset', title: 'Put the view back' },
    icon('fad-history'),
    el('span', { text: 'Reset view' }),
  );
  const controls = el('div', { class: 'explorer__controls' }, hint, resetButton);

  const catRow = el('div', { class: 'explorer__years', role: 'group', 'aria-label': 'Filter by group' });
  const yearRow = el('div', { class: 'explorer__years', role: 'group', 'aria-label': 'Filter by year' });

  const panel = el(
    'section',
    { class: 'explorer', 'data-view': 'roster' },
    el(
      'div',
      { class: 'explorer__head' },
      el('h3', { class: 'explorer__title', text: 'The group, in three dimensions' }),
      /* What it IS. How to work it is on the strip under the stage, where a
         reader looks when they want to work it. */
      el('p', {
        class: 'explorer__caption',
        text: 'Everyone who has worked in the group, newest nearest, '
            + 'with the year they finished. The senior groups are drawn larger.',
      }),
    ),
    stage,
    controls,
    catRow,
    yearRow,
  );
  host.replaceChildren(panel);

  /* ---- renderer ----------------------------------------------------------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('roster: no WebGL, leaving the list as it is.', err);
    host.replaceChildren();
    return { renderer: 'none' };
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);

  /* ---- the texture -------------------------------------------------------- */
  const atlas = await buildAtlas(roster.people, {
    blank: token('--c-surface-2', '#eef2f7'),
  });
  if (roster.people.length > atlas.capacity) {
    console.warn(`roster: ${roster.people.length} people but the atlas holds ${atlas.capacity}.`);
  }

  const texture = new THREE.CanvasTexture(atlas.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;   // no mipmaps: they bleed across cells
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  /* ---- the cards ----------------------------------------------------------
     A BoxGeometry per person. Three lays its UVs out face by face in the order
     +X, -X, +Y, -Y, +Z, -Z, four vertices each — so rewriting vertices 16–19
     puts the photograph on the front and leaves the other five faces pointing
     at the blank cell, which is what colours the edges. One geometry per person
     is 24 vertices; fifty-five of them is not a number worth optimising.
     -------------------------------------------------------------------- */
  const FRONT_FACE = 4;

  function faceUV(geometry, face, rect) {
    const uv = geometry.attributes.uv;
    const at = face * 4;
    // Three's per-face winding: top-left, top-right, bottom-left, bottom-right.
    uv.setXY(at + 0, rect.u0, rect.v1);
    uv.setXY(at + 1, rect.u1, rect.v1);
    uv.setXY(at + 2, rect.u0, rect.v0);
    uv.setXY(at + 3, rect.u1, rect.v0);
    uv.needsUpdate = true;
  }

  const blankRect = atlas.uvFor(atlas.blank);
  const cards = [];

  /* Where each group's block starts, left to right. The blocks are different
     widths now that the cards are different sizes, so the positions are laid
     out cumulatively and the whole row is centred afterwards — spacing them on
     a fixed pitch would leave the small groups adrift and the large ones
     touching. */
  /* How many people are in each group, and therefore how wide its block is.
     Counted from the roster rather than declared, so a category that grows
     spreads sideways on its own. */
  const laneCount = LANE_SCALE.map(() => 0);
  roster.people.forEach((person) => { laneCount[person.lane] = (laneCount[person.lane] || 0) + 1; });
  const laneCols = laneCount.map(columnsFor);

  const laneWidth = LANE_SCALE.map((scale, lane) => laneCols[lane] * COL_GAP * scale);
  const totalWidth = laneWidth.reduce((a, b) => a + b, 0) + LANE_GAP * (LANE_SCALE.length - 1);
  const laneX = [];
  let cursor = -totalWidth / 2;
  laneWidth.forEach((width) => {
    laneX.push(cursor + width / 2);
    cursor += width + LANE_GAP;
  });

  roster.people.forEach((person) => {
    const cardScale = LANE_SCALE[person.lane];
    const geometry = new THREE.BoxGeometry(
      CARD_W * cardScale, CARD_H * cardScale, CARD_D * cardScale,
    );
    for (let face = 0; face < 6; face++) faceUV(geometry, face, blankRect);
    faceUV(geometry, FRONT_FACE, atlas.uvFor(person.index));

    /* One material per card rather than one shared. It costs a little more
       state and it buys the two things the panel needs: a per-card opacity, so
       filtering can fade rather than blink, and a per-card emissive, so the one
       under the pointer can light up without a second pass. The texture — the
       expensive part — is still shared by all of them. */
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.55,
      metalness: 0.05,
      transparent: true,
      opacity: 1,
      emissive: new THREE.Color(person.tint),
      emissiveIntensity: 0,
    });

    const cols = laneCols[person.lane];
    const col = person.order % cols;
    const row = Math.floor(person.order / cols);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      laneX[person.lane] + (col - (cols - 1) / 2) * COL_GAP * cardScale,
      row * ROW_RISE * cardScale,
      -row * Z_STEP * cardScale - person.lane * LANE_SET_BACK,
    );
    mesh.userData.person = person;
    scene.add(mesh);

    cards.push({
      person,
      mesh,
      material,
      scale: cardScale,
      home: mesh.position.clone(),
      shown: 1,      // where the filter wants it: 1 in, 0 out
      eased: 1,      // where it currently is
      lit: 0,
    });
  });

  /* ---- light --------------------------------------------------------------
     A key from the upper left so the slabs' top and left edges catch it and the
     thickness is visible; a cool fill from the other side so the far faces keep
     their colour; and a broad hemisphere so the photographs stay legible, which
     is the one thing the lighting must not sacrifice. A dramatic rig on a wall
     of faces just makes half of them unrecognisable. */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb4c4, 2.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-2.4, 3.0, 4.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdcf3fb, 0.7);
  fill.position.set(3.0, -1.0, 2.0);
  scene.add(fill);

  /* ---- camera state ------------------------------------------------------- */
  /* Looking down from in front and a little to the side. The pitch is what
     makes a very wide panel work: the blocks recede sixteen units, and at a
     shallow angle all of that depth projects into almost no height, leaving a
     long thin picture in a long thin box with empty sky above and below it.
     Tipping the camera over converts depth into vertical extent, and the
     composition fills the frame. */
  const view = { yaw: 0.36, pitch: 0.50, distance: 18, target: new THREE.Vector3(0, -1.2, -6) };
  const want = { yaw: view.yaw, pitch: view.pitch, distance: view.distance, target: view.target.clone() };
  let flying = 0;

  function placeCamera() {
    const { yaw, pitch, distance, target } = view;
    camera.position.set(
      target.x + distance * Math.cos(pitch) * Math.sin(yaw),
      target.y + distance * Math.sin(pitch),
      target.z + distance * Math.cos(pitch) * Math.cos(yaw),
    );
    camera.lookAt(target);
  }

  /**
   * Frame whatever is currently visible.
   *
   * Not a bounding sphere. A bounding sphere is the right tool for a compact
   * cluster and the wrong one here: these blocks recede, so the set is long and
   * thin, and the sphere that contains it is enormous compared with what
   * actually needs to be on screen. The first attempt used one and put the
   * near cards — the big, interesting, most-recent ones — off the bottom left
   * corner while framing a great deal of empty space.
   *
   * So it solves the real question instead. Put every visible card into camera
   * space at the current yaw and pitch, and for each one ask how far back the
   * camera must be for that card to fall inside the frustum:
   *
   *     |x| <= tan(fovH / 2) * (z + d)   ->   d >= |x| / tanH - z
   *
   * and the same vertically. The answer is the largest of those, which is exact
   * and needs no iteration. It is also correct at any orientation, so turning
   * the scene and then filtering re-frames sensibly rather than snapping back
   * to a canned viewpoint.
   */
  function frameVisible(animate = true) {
    /* Position AND size. The groups are drawn at different scales, so the room
       a card needs is its own half-width, not the roster's largest — padding
       everything by the biggest wastes space around the small ones, and padding
       by the average clips the big ones off the edge. */
    const points = cards
      .filter((c) => c.shown > 0.5)
      .map((c) => ({ at: c.home, halfW: (CARD_W * c.scale) / 2, halfH: (CARD_H * c.scale) / 2 }));
    if (!points.length) return;

    const centre = new THREE.Vector3();
    for (const p of points) centre.add(p.at);
    centre.multiplyScalar(1 / points.length);

    // The camera basis at the current orientation.
    const { yaw, pitch } = view;
    const forward = new THREE.Vector3(
      -Math.cos(pitch) * Math.sin(yaw),
      -Math.sin(pitch),
      -Math.cos(pitch) * Math.cos(yaw),
    );
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const tanV = Math.tan((camera.fov * Math.PI) / 360);
    const tanH = tanV * Math.max(0.35, camera.aspect);
    /* Breathing room beyond each card's own half-size, so nothing sits flush
       against the edge of the frame. */
    const MARGIN = 0.62;

    const local = new THREE.Vector3();
    let distance = MIN_DISTANCE;

    /* Fit, then centre, then fit again.
     *
     * The fit alone leaves the picture sitting low in the frame, and the reason
     * is perspective: the projected centre of a set is NOT the projection of
     * its centre. These blocks recede, and the near cards spread much further
     * from the axis than the far ones do, so a composition framed on the
     * centroid has all its weight below the middle and a band of empty sky
     * above it.
     *
     * So after choosing a distance, the points are projected, the middle of
     * what is actually on screen is measured, and the target slides to put that
     * in the centre — which changes the extents slightly, so the distance is
     * solved again. Two rounds is convergence to well under a pixel; the third
     * is there because it costs a hundred and ten dot products. */
    for (let pass = 0; pass < 3; pass++) {
      distance = MIN_DISTANCE;
      for (const p of points) {
        local.copy(p.at).sub(centre);
        const z = local.dot(forward);
        const x = Math.abs(local.dot(right)) + p.halfW + MARGIN;
        const y = Math.abs(local.dot(up)) + p.halfH + MARGIN;
        distance = Math.max(distance, x / tanH - z, y / tanV - z);
      }
      distance = clamp(distance + 0.3, MIN_DISTANCE, MAX_DISTANCE);
      if (pass === 2) break;

      let minX = Infinity; let maxX = -Infinity;
      let minY = Infinity; let maxY = -Infinity;
      for (const p of points) {
        local.copy(p.at).sub(centre);
        const depth = local.dot(forward) + distance;
        if (depth < 0.1) continue;
        const sx = local.dot(right) / (depth * tanH);
        const sy = local.dot(up) / (depth * tanV);
        const halfW = (p.halfW + MARGIN) / (depth * tanH);
        const halfH = (p.halfH + MARGIN) / (depth * tanV);
        minX = Math.min(minX, sx - halfW); maxX = Math.max(maxX, sx + halfW);
        minY = Math.min(minY, sy - halfH); maxY = Math.max(maxY, sy + halfH);
      }
      if (!Number.isFinite(minX)) break;
      // Screen offset back into world units at the target's own depth.
      centre.addScaledVector(right, ((minX + maxX) / 2) * tanH * distance);
      centre.addScaledVector(up, ((minY + maxY) / 2) * tanV * distance);
    }

    want.target.copy(centre);
    want.distance = distance;
    if (!animate) {
      view.target.copy(want.target);
      view.distance = want.distance;
      flying = 0;
    } else {
      flying = FLY;
    }
    invalidate();
  }

  /* ---- filters ------------------------------------------------------------ */
  let activeCategory = null;   // null = all
  let activeYear = null;       // null = all

  function applyFilter() {
    let visible = 0;
    for (const card of cards) {
      const okCat = !activeCategory || card.person.categoryId === activeCategory;
      const okYear = !activeYear || card.person.year === activeYear;
      card.shown = okCat && okYear ? 1 : 0;
      if (card.shown) visible += 1;
    }

    for (const chip of catRow.children) {
      chip.classList.toggle('is-current', (chip.dataset.cat || '') === (activeCategory || ''));
    }
    for (const chip of yearRow.children) {
      chip.classList.toggle('is-current', (chip.dataset.year || '') === (activeYear ? String(activeYear) : ''));
    }

    const what = activeCategory
      ? CATEGORIES.find((c) => c.id === activeCategory).label
      : 'the whole group';
    readout.textContent = visible
      ? `${visible} of ${cards.length} — ${what}${activeYear ? `, ${activeYear}` : ''}`
      : 'Nobody matches both filters.';

    if (visible) frameVisible(true);
    invalidate();
  }

  /* ---- the chips ---------------------------------------------------------- */
  /**
   * One filter chip. `tint` puts a dot of the category's own colour on it —
   * the same colour as that block's caption bands — because five buttons and
   * five blocks with no visible correspondence is a puzzle rather than a
   * control.
   */
  const chip = (label, dataset, onPick, tint) => {
    const button = el(
      'button',
      { type: 'button', class: 'explorer__year' },
      tint ? el('span', { class: 'explorer__dot', style: `background:${tint}`, 'aria-hidden': 'true' }) : null,
      el('span', { text: label }),
    );
    Object.assign(button.dataset, dataset);
    button.addEventListener('click', onPick);
    return button;
  };

  catRow.append(chip('Everyone', { cat: '' }, () => { activeCategory = null; applyFilter(); }));
  CATEGORIES.forEach((category) => {
    const n = roster.counts[category.id] || 0;
    if (!n) return;
    catRow.append(chip(`${category.short} · ${n}`, { cat: category.id }, () => {
      activeCategory = activeCategory === category.id ? null : category.id;
      applyFilter();
    }, palette[CATEGORIES.indexOf(category)]));
  });

  yearRow.append(chip('Any year', { year: '' }, () => { activeYear = null; applyFilter(); }));
  roster.years.forEach((year) => {
    yearRow.append(chip(String(year), { year: String(year) }, () => {
      activeYear = activeYear === year ? null : year;
      applyFilter();
    }));
  });

  /* ---- pointer ------------------------------------------------------------ */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pointers = new Map();
  let dragging = false;
  let dragFrom = null;
  let pinchFrom = 0;
  let pinchAt = null;
  let hovered = null;

  /* The starting view, kept so "reset" has something to go back to. */
  const HOME = { yaw: 0, pitch: 0, distance: 0, target: new THREE.Vector3() };

  /**
   * Slide the whole scene, in the plane of the screen.
   *
   * The axes come out of the camera's own world matrix rather than being
   * rebuilt from yaw and pitch: columns 0 and 1 of `matrixWorld` ARE the
   * camera's right and up in world space, whatever convention put them there.
   * Deriving them again from the angles is a second place for a sign to be
   * wrong, and a panning control with a sign error is maddening rather than
   * obviously broken.
   *
   * The pixel-to-world conversion is the height of the frustum at the target's
   * distance divided by the height of the canvas — so a card stays under the
   * pointer as you drag it, which is the only version of panning that feels
   * like moving the thing rather than nudging a camera.
   */
  const panRight = new THREE.Vector3();
  const panUp = new THREE.Vector3();
  function pan(dx, dy) {
    camera.updateMatrixWorld();
    panRight.setFromMatrixColumn(camera.matrixWorld, 0);
    panUp.setFromMatrixColumn(camera.matrixWorld, 1);
    const perPixel = (2 * view.distance * Math.tan((camera.fov * Math.PI) / 360))
      / Math.max(1, size().height);
    // Drag right, the scene goes right — so the target goes left.
    view.target.addScaledVector(panRight, -dx * perPixel);
    view.target.addScaledVector(panUp, dy * perPixel);
    want.target.copy(view.target);
    flying = 0;
    invalidate();
  }

  const size = () => ({
    width: stage.clientWidth || 1,
    height: stage.clientHeight || 1,
  });

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      cards.filter((c) => c.shown > 0.5 && c.mesh.visible).map((c) => c.mesh),
      false,
    );
    return hits.length ? hits[0].object.userData.person : null;
  }

  function setHovered(person) {
    if (person === hovered) return;
    hovered = person;
    stage.classList.toggle('is-pointing', Boolean(person));
    if (person) {
      const bits = [person.name, person.categoryLabel];
      if (person.topic) bits.push(person.topic);
      bits.push(`${person.topicLabel === 'Former Affiliation' ? 'Contract ends' : 'Completion'} ${person.yearRaw}`);
      readout.textContent = bits.join(' · ');
    } else {
      applyReadoutSummary();
    }
    invalidate();
  }

  function applyReadoutSummary() {
    const visible = cards.filter((c) => c.shown > 0.5).length;
    const what = activeCategory
      ? CATEGORIES.find((c) => c.id === activeCategory).label
      : 'the whole group';
    readout.textContent = `${visible} of ${cards.length} — ${what}${activeYear ? `, ${activeYear}` : ''}`;
  }

  /* Right-drag has to be able to start, so the stage's context menu goes. There
     is nothing on a canvas for that menu to offer, and every 3D viewer does the
     same; it is suppressed only over the stage, never over the page. */
  stage.addEventListener('contextmenu', (event) => event.preventDefault());

  stage.addEventListener('pointerdown', (event) => {
    stage.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchFrom = Math.hypot(a.x - b.x, a.y - b.y);
      pinchAt = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    dragFrom = {
      x: event.clientX,
      y: event.clientY,
      yaw: view.yaw,
      pitch: view.pitch,
      moved: 0,
      // Either gesture means "move it": the right button for a mouse, Ctrl (or
      // Cmd) for a trackpad that has no comfortable right-drag.
      panning: event.button === 2 || event.ctrlKey || event.metaKey,
    };
    dragging = false;
  });

  stage.addEventListener('pointermove', (event) => {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    /* Two fingers: pinch to zoom. The stage is `touch-action: pan-y`, so a
       vertical swipe still scrolls the page and a two-finger gesture arrives
       here instead of zooming the document. */
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const now = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinchFrom > 0 && now > 0) {
        view.distance = clamp(view.distance * (pinchFrom / now), MIN_DISTANCE, MAX_DISTANCE);
        want.distance = view.distance;
        pinchFrom = now;
        invalidate();
      }
      // Two fingers moving together pan, the same as a right-drag.
      if (pinchAt) pan(mid.x - pinchAt.x, mid.y - pinchAt.y);
      pinchAt = mid;
      return;
    }

    if (dragFrom) {
      const dx = event.clientX - dragFrom.x;
      const dy = event.clientY - dragFrom.y;
      dragFrom.moved = Math.max(dragFrom.moved, Math.hypot(dx, dy));
      // A few pixels of slop, so a click on a card is not read as a tiny drag.
      if (dragFrom.moved > 4) {
        dragging = true;
        stage.classList.add(dragFrom.panning ? 'is-panning' : 'is-dragging');
        if (dragFrom.panning) {
          /* Panning is incremental — the delta since the last event — because
             the axes it moves along turn with the camera. Orbiting is absolute,
             from where the drag began, because that cannot drift. */
          pan(event.clientX - dragFrom.x, event.clientY - dragFrom.y);
          dragFrom.x = event.clientX;
          dragFrom.y = event.clientY;
        } else {
          view.yaw = dragFrom.yaw - dx * 0.006;
          view.pitch = clamp(dragFrom.pitch + dy * 0.005, MIN_PITCH, MAX_PITCH);
          want.yaw = view.yaw;
          want.pitch = view.pitch;
          flying = 0;
          invalidate();
        }
      }
      return;
    }

    setHovered(pick(event));
  });

  const release = (event) => {
    pointers.delete(event.pointerId);
    stage.classList.remove('is-dragging', 'is-panning');
    if (pointers.size < 2) { pinchFrom = 0; pinchAt = null; }
    if (dragFrom && !dragging) {
      /* The person under the pointer is the one that is LIT, not the one a
         fresh ray happens to hit. Hovering lifts a card toward the camera, so
         by the time the click arrives the geometry under that pixel has moved —
         and re-picking lands on whatever the lifted card was covering. Clicking
         what is highlighted is also simply what a reader expects. */
      const person = hovered || pick(event);
      if (person) jumpTo(person);
    }
    dragFrom = null;
    dragging = false;
    pinchFrom = 0;
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('pointerleave', (event) => {
    pointers.delete(event.pointerId);
    if (!dragging) setHovered(null);
  });

  stage.addEventListener('wheel', (event) => {
    /* Zoom — but the page must never feel like it has trapped the reader, and a
       panel this tall with an unconditional preventDefault does exactly that:
       you scroll down the page, the cursor crosses the panel, and the page
       stops moving.

       So the wheel is only swallowed while it is actually doing something. Once
       the zoom is against its stop, further wheel in that direction is left to
       the page and scrolling continues from where it was. Zoom out to the end
       and keep going and you simply carry on down the page, which is what
       someone reading rather than exploring is trying to do. */
    const step = Math.exp(clamp(event.deltaY, -120, 120) * 0.0016);
    const next = clamp(view.distance * step, MIN_DISTANCE, MAX_DISTANCE);
    if (Math.abs(next - view.distance) < 0.0005) return;   // at the stop: let it through

    event.preventDefault();
    view.distance = next;
    want.distance = next;
    flying = 0;
    invalidate();
  }, { passive: false });

  /**
   * Put the view back where it started.
   *
   * Not "re-frame what is visible" — a filter already does that, and it keeps
   * whatever angle the reader has turned to. Reset means the composition they
   * first saw: the same viewpoint, with the whole group in it. It exists
   * because a pan makes it possible to push the scene off the edge entirely,
   * and a 3D panel with no way back is a trap.
   */
  function resetView() {
    view.yaw = HOME.yaw;
    view.pitch = HOME.pitch;
    want.yaw = HOME.yaw;
    want.pitch = HOME.pitch;
    frameVisible(true);
  }
  resetButton.addEventListener('click', resetView);

  /**
   * Take the reader to this person's entry in the list below.
   *
   * Found by SECTION and then position within it, not by position in the whole
   * page and not by name. Two of the people here share a name — the same person
   * appears once as an MPhil student and once as a PhD student — so matching on
   * the name lands on the wrong card, and matching on a global index quietly
   * goes wrong the day a section is added or reordered.
   */
  function jumpTo(person) {
    const section = listRoot && listRoot.querySelector(`#${CSS.escape(person.categoryId)}`);
    const row = section && section.querySelectorAll('.person')[person.order];
    if (!row) return;
    row.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'center' });

    /* `is-jumped`, and deliberately NOT `is-lit`.
       
       `is-lit` belongs to fx/highlight.js, which owns it, adds it to whatever
       the pointer or the scroll position is nearest, and removes it from
       whatever it lit last. Borrowing it here means two owners for one class:
       the scroll this very function starts moves the reading marker onto some
       other row, so the page ends up with two lit rows and no way to tell which
       one was the answer to the click. A separate class has one owner and says
       one thing — "this is the person you asked for". */
    row.style.setProperty('--roster-jump', person.tint);
    row.classList.add('is-jumped');
    setTimeout(() => {
      row.classList.remove('is-jumped');
      row.style.removeProperty('--roster-jump');
    }, 2600);
  }

  /* ---- keyboard -----------------------------------------------------------
     The panel is a picture of a list that is fully navigable directly below it,
     so it does not need to be traversable card by card. What it does need is to
     be turnable and zoomable without a pointer, which is four keys. */
  stage.tabIndex = 0;
  stage.setAttribute('role', 'application');
  stage.setAttribute('aria-label', 'Research team in three dimensions. Arrow keys turn it; plus and minus zoom.');
  stage.addEventListener('keydown', (event) => {
    const step = 0.16;
    let used = true;
    if (event.key === 'ArrowLeft') view.yaw -= step;
    else if (event.key === 'ArrowRight') view.yaw += step;
    else if (event.key === 'ArrowUp') view.pitch = clamp(view.pitch + step * 0.6, MIN_PITCH, MAX_PITCH);
    else if (event.key === 'ArrowDown') view.pitch = clamp(view.pitch - step * 0.6, MIN_PITCH, MAX_PITCH);
    else if (event.key === '+' || event.key === '=') view.distance = clamp(view.distance * 0.85, MIN_DISTANCE, MAX_DISTANCE);
    else if (event.key === '-' || event.key === '_') view.distance = clamp(view.distance * 1.18, MIN_DISTANCE, MAX_DISTANCE);
    else if (event.key === '0' || event.key === 'Home') { resetView(); event.preventDefault(); return; }
    else used = false;
    if (used) {
      event.preventDefault();
      want.yaw = view.yaw; want.pitch = view.pitch; want.distance = view.distance;
      flying = 0;
      invalidate();
    }
  });

  /* ---- the loop -----------------------------------------------------------
     On demand. `invalidate()` asks for a frame; the frame draws, and schedules
     another only while something is still moving. A page sitting open on this
     section with nobody touching it costs nothing at all, which is the whole
     reason not to run a permanent animation loop for a panel like this. */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let queued = false;
  let last = 0;

  function invalidate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(tick);
  }

  function tick(now) {
    queued = false;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    let moving = false;

    if (flying > 0) {
      const k = reduced.matches ? 1 : Math.min(1, dt / FLY);
      view.distance = lerp(view.distance, want.distance, k);
      view.target.lerp(want.target, k);
      flying -= dt;
      if (flying <= 0) { view.distance = want.distance; view.target.copy(want.target); }
      moving = true;
    }

    for (const card of cards) {
      const target = card.shown;
      if (Math.abs(card.eased - target) > 0.002) {
        card.eased = reduced.matches ? target : lerp(card.eased, target, Math.min(1, dt / 0.22));
        moving = true;
      } else card.eased = target;

      const litTarget = hovered && hovered.index === card.person.index ? 1 : 0;
      if (Math.abs(card.lit - litTarget) > 0.002) {
        card.lit = reduced.matches ? litTarget : lerp(card.lit, litTarget, Math.min(1, dt / 0.14));
        moving = true;
      } else card.lit = litTarget;

      const scale = card.eased * (1 + card.lit * 0.12);
      card.mesh.visible = card.eased > 0.01;
      card.mesh.scale.setScalar(Math.max(0.001, scale));
      card.material.opacity = card.eased;
      card.material.emissiveIntensity = card.lit * 0.5;
      /* The highlight GROWS the card about its own centre and lights it, and
         it deliberately does not move it.
         
         Moving it was the first version and it is a trap. Bringing a card
         toward the camera scales its projection about the CAMERA's axis, not
         about the card's own centre, so a card away from the middle of the
         frame slides outward on screen as it rises — out from under the very
         pointer that is hovering it. The next pointer event then hits whatever
         was behind it, the highlight jumps to a neighbour, and a click lands on
         the wrong person. It cost a wrong-person bug that only showed up
         because the check clicks what it hovered and compares the two names.
         
         Scaling about the centre can only ever add coverage, never take it
         away, so the card under the pointer stays the card under the pointer. */
      card.mesh.position.copy(card.home);
    }

    placeCamera();
    renderer.render(scene, camera);
    if (moving) invalidate();
  }

  function resize() {
    const { width, height } = size();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    invalidate();
  }

  window.addEventListener('resize', resize, { passive: true });

  /* The theme can change under it: the blank cell and the caption bands are
     baked from theme colours, so the atlas is redrawn rather than re-tinted. */
  new MutationObserver(async () => {
    const rebuilt = await buildAtlas(roster.people, { blank: token('--c-surface-2', '#eef2f7') });
    texture.image = rebuilt.canvas;
    texture.needsUpdate = true;
    invalidate();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  applyFilter();
  frameVisible(false);
  // Whatever the fit chose on load IS home.
  HOME.yaw = view.yaw;
  HOME.pitch = view.pitch;
  HOME.distance = view.distance;
  HOME.target.copy(view.target);
  invalidate();

  const api = {
    renderer: 'three',
    people: cards.length,
    years: roster.years.length,
    filter(categoryId, year) { activeCategory = categoryId || null; activeYear = year || null; applyFilter(); },
    reset: resetView,
    /* The height of each row in each group, so a check can assert that the rake
       actually rakes rather than trusting a constant. */
    get rows() {
      const lanes = {};
      for (const card of cards) {
        const lane = (lanes[card.person.lane] ||= []);
        const row = Math.floor(card.person.order / laneCols[card.person.lane]);
        lanes[card.person.lane][row] = Number(card.home.y.toFixed(4));
        void lane;
      }
      return lanes;
    },
    view: () => ({ yaw: view.yaw, pitch: view.pitch, distance: view.distance, target: view.target.toArray() }),
    dispose() {
      renderer.dispose();
      cards.forEach((c) => { c.mesh.geometry.dispose(); c.material.dispose(); });
      texture.dispose();
    },
  };
  window.__roster = api;
  return api;
}
