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
 * namecolumn/index.js — the name, standing up, in the left gutter.
 *
 * WHAT IT IS
 * ----------
 * Every page but Summary carries the name down the left of the screen as twelve
 * separate solids: real extruded serif letters, cyan, lit, each one on its own
 * vertical axis. Three things happen to them, in a cycle:
 *
 *   the climb    a meteor spirals up around the column from below the bottom
 *                letter to above the top one, while the letters stand still. It
 *                has a bright head that carries its own light, a tail behind
 *                it, and rays standing off it at random lengths.
 *
 *   the cascade  the top letter starts to turn. Ten degrees later the next one
 *                starts, ten degrees after that the third, and so on down — so
 *                the turn travels down the column as a wave rather than
 *                arriving everywhere at once. Each letter makes exactly one
 *                revolution and stops facing forward again.
 *
 *   the rest     nothing, for several seconds, and then the meteor comes back.
 *
 * WHY THERE IS A REST
 * -------------------
 * The brief describes the sequence once and does not say what happens after it.
 * Playing it once and stopping leaves a dead object on the screen for the rest
 * of the visit; looping it with no gap puts a permanently spinning column in
 * the corner of every page, which is exactly the kind of thing a reader ends up
 * covering with their hand. The rest is what makes it an occasional event
 * instead of either — and the loop does not even draw during it.
 *
 * WHY THE LETTERS ARE NOT TEXT
 * ----------------------------
 * They are `assets/data/name-letters.json`, written by `tools/trace-letters.py`
 * out of the site's own serif. Three.js will build text at run time from a
 * "typeface JSON", and that is a whole font converted to a bespoke format —
 * hundreds of kilobytes, on every page, to draw nine distinct characters. The
 * trace is twenty.
 *
 * WHERE IT IS
 * -----------
 * The left gutter, and only where there IS a left gutter: the content shell is
 * 75rem wide and centred, so below about 88rem of viewport there is no room
 * beside it and the column is not rendered at all. Its TOP is aligned with the
 * page's kicker — the small line above the page title — so the column and the
 * page start together; see `align()`. It is `pointer-events: none` and
 * `aria-hidden` — the name is already in the header, in text, and this is the
 * same name said again in light.
 */

import { guardContext, loadThree } from '../fx/three.js';

/** Where the traced glyphs live. */
const LETTERS = 'assets/data/name-letters.json';

/** How thick a letter is, in em. */
const DEPTH = 0.13;

/** Vertical spacing between letters, and the extra a space adds, in em. */
const STEP = 0.76;
const WORD_GAP = 0.72;

/** How far from the column's axis the meteor flies, in em. */
const ORBIT = 0.62;

/** How many turns the meteor makes on its way up. */
const TURNS = 3.25;

/** Seconds: the climb, one letter's revolution, and the rest between cycles. */
const CLIMB_SECONDS = 1.4;
const SPIN_SECONDS = 2.4;
const REST_SECONDS = 5.5;

/** Seconds for the travelling highlight to come round again. */
const SWEEP_SECONDS = 7.5;

/**
 * How far ahead of the next letter each letter turns before that one starts.
 *
 * This is the number the brief is actually about. Ten degrees at the top means
 * the twelfth letter starts a hundred and ten degrees after the first, which at
 * one revolution per SPIN_SECONDS is about three quarters of a second — long
 * enough to read as a wave travelling down the column, short enough that the
 * whole thing is one gesture rather than twelve.
 */
const LEAD_DEGREES = 10;

/** How many rays stand off the meteor's head. */
const RAYS = 9;

/**
 * Frames per second during the rest.
 *
 * The rest is more than half the cycle and the only thing moving in it is the
 * travelling highlight, which is a light sliding along twelve letters over
 * seven and a half seconds. Sixty frames a second of that is sixty frames a
 * second of nothing anyone can see, on a page already holding eight other WebGL
 * contexts. The field makes the same trade for the same reason (§12.2).
 */
const REST_FPS = 24;

/**
 * The lean the letters keep when they are not turning.
 *
 * It is not zero, and that is the same lesson the brand mark taught: a solid
 * seen exactly face-on has no visible walls at all, so a column at rest with no
 * lean is a column of flat cyan letterforms. A tenth of a radian is enough to
 * show a sliver of every letter's side and nowhere near enough to make the name
 * hard to read.
 */
const REST_LEAN = 0.20;

/** Read a CSS custom property off <html>. */
function token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * A soft round dot, as a texture.
 *
 * Generated rather than shipped: it is a radial gradient, it is used for the
 * meteor's head-glow, and a file for it would be a request for something the
 * browser can draw in a tenth of a millisecond.
 */
function dotTexture(THREE) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Mount the column into `host`.
 *
 * @param {HTMLElement} host
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement|null} anchor  the element the top of the "H" lines up
 *                                   with — the page's kicker
 */
export async function mountNameColumn(host, canvas, anchor) {
  let letters;
  try {
    const response = await fetch(LETTERS, { cache: 'force-cache' });
    if (!response.ok) throw new Error(String(response.status));
    letters = await response.json();
  } catch (err) {
    console.info('name column: no glyph trace, skipping.', err);
    return null;
  }

  const THREE = await loadThree();
  if (!THREE) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.info('name column: no WebGL, skipping.', err);
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);

  const brand = () => new THREE.Color(token('--c-brand', '#22d3ee'));
  /* What is behind the column, so the meteor's tail can fade into it. */
  const page = () => new THREE.Color(token('--c-page', '#fafafb'));

  /* ---- the letters --------------------------------------------------------
     One solid each, centred on its own bounding box so that turning it about Y
     turns it about ITSELF. Left where the trace puts them, a letter would swing
     around the origin of the em square instead, and the column would come apart
     the moment the cascade started.

     The colour is a DEEP cyan, not the brand cyan. The letters are large, there
     are twelve of them, and they sit in the margin beside the reading column —
     at full strength they competed with the text they are keeping company. The
     lights below are what bring them back up where they should be bright. */
  const material = new THREE.MeshStandardMaterial({
    color: brand().multiplyScalar(0.52),
    roughness: 0.24,
    metalness: 0.58,
    emissive: brand(),
    emissiveIntensity: 0.14,
  });

  const column = new THREE.Group();
  scene.add(column);

  const glyphs = [];
  let y = 0;
  let capTop = 0;

  for (const character of letters.text) {
    if (character === ' ') {
      y -= WORD_GAP;
      continue;
    }
    const entry = letters.glyphs[character];
    if (!entry) continue;

    const shapes = entry.contours.map((contour) => {
      const shape = new THREE.Shape();
      contour.outline.forEach(([x, ly], i) => (i ? shape.lineTo(x, ly) : shape.moveTo(x, ly)));
      shape.closePath();
      for (const hole of contour.holes || []) {
        const path = new THREE.Path();
        hole.forEach(([x, ly], i) => (i ? path.lineTo(x, ly) : path.moveTo(x, ly)));
        path.closePath();
        shape.holes.push(path);
      }
      return shape;
    });

    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.008,
      bevelOffset: 0,
      bevelSegments: 2,
      curveSegments: 1,
    });
    geometry.center();
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.rotation.y = REST_LEAN;
    column.add(mesh);
    glyphs.push(mesh);
    if (glyphs.length === 1) capTop = y + geometry.boundingBox.max.y;
    y -= STEP;
  }

  if (!glyphs.length) return null;

  /* Centre the column on the origin, so the camera can look straight at it. */
  const top = glyphs[0].position.y;
  const bottom = glyphs[glyphs.length - 1].position.y;
  const middle = (top + bottom) / 2;
  for (const glyph of glyphs) glyph.position.y -= middle;
  capTop -= middle;
  const HIGH = top - middle;
  const LOW = bottom - middle;

  /* ---- the meteor ---------------------------------------------------------
     A bright head, a soft halo around it, a tail behind, rays standing off it,
     and a light of its own that travels with it — which is what makes the
     letters brighten as it passes rather than merely being passed. */
  const dot = dotTexture(THREE);
  const meteor = new THREE.Group();
  scene.add(meteor);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 20, 14),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: brand(), emissiveIntensity: 2.4,
      roughness: 0.15, metalness: 0.1,
    }),
  );
  meteor.add(head);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dot, color: brand(), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.setScalar(0.62);
  meteor.add(halo);

  const lamp = new THREE.PointLight(brand(), 3.2, 3.2, 2);
  meteor.add(lamp);

  /* The tail.

     ANALYTIC, not a history. The obvious build keeps the head's last few dozen
     positions and draws them, and it has two faults that only show up once it
     is running: the beads are spaced by FRAME RATE rather than by distance, so
     the tail is a smear on a fast machine and a dotted line on a slow one, and
     the first frames of every climb have no history to draw. Since the path is
     a formula, the tail is simply that formula evaluated behind the head.

     One line strip with per-vertex colour, and it fades toward the PAGE'S OWN
     BACKGROUND rather than toward black. Additive blending was the first choice
     and it is right on a dark page and wrong on a light one: there is nothing
     left to add to white, so the streak came out as a dark scratch across the
     letters. */
  const TAIL = 34;
  const TAIL_SPAN = 0.16;                 // how far back along the climb it reaches
  const tailPositions = new Float32Array(TAIL * 3);
  const tailColours = new Float32Array(TAIL * 3);
  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
  tailGeometry.setAttribute('color', new THREE.BufferAttribute(tailColours, 3));
  const tail = new THREE.Line(tailGeometry, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
  }));
  scene.add(tail);

  /* The rays. `LineSegments` with per-vertex colour: bright at the head, black
     at the far end, drawn additively so black is the same as gone. Their
     directions and lengths are rolled again every time the meteor sets off. */
  const rayPositions = new Float32Array(RAYS * 2 * 3);
  const rayColours = new Float32Array(RAYS * 2 * 3);
  const rayGeometry = new THREE.BufferGeometry();
  rayGeometry.setAttribute('position', new THREE.BufferAttribute(rayPositions, 3));
  rayGeometry.setAttribute('color', new THREE.BufferAttribute(rayColours, 3));
  const rays = new THREE.LineSegments(rayGeometry, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  meteor.add(rays);

  const rayDirs = [];
  function rollRays() {
    rayDirs.length = 0;
    for (let i = 0; i < RAYS; i++) {
      const v = new THREE.Vector3(
        Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1,
      );
      if (v.lengthSq() < 1e-6) v.set(1, 0, 0);
      rayDirs.push(v.normalize().multiplyScalar(0.16 + Math.random() * 0.34));
    }
    const colour = brand();
    for (let i = 0; i < RAYS; i++) {
      rayPositions.set([0, 0, 0], i * 6);
      rayPositions.set([rayDirs[i].x, rayDirs[i].y, rayDirs[i].z], i * 6 + 3);
      rayColours.set([colour.r, colour.g, colour.b], i * 6);
      rayColours.set([0, 0, 0], i * 6 + 3);
    }
    rayGeometry.attributes.position.needsUpdate = true;
    rayGeometry.attributes.color.needsUpdate = true;
  }
  rollRays();

  /* ---- light --------------------------------------------------------------
     The same rig as the brand mark in the header, for the same reason: enough
     ambient that a letter turned away from the key is still a shape, a key from
     the upper left for the form, a cyan rim from behind so every letter is
     drawn in light against the page whichever way it faces — and a TRAVELLER,
     a point light on a slow circuit whose specular slides along the column and
     is what says "solid" rather than "sticker".

     The traveller is why the letters can be a deep cyan and still read as
     bright: it is the light that is bright, not the paint. */
  scene.add(new THREE.HemisphereLight(0xd8f6ff, 0x061620, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.7);
  key.position.set(-1.4, 1.6, 2.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(brand(), 1.6);
  rim.position.set(1.6, -0.8, -1.4);
  scene.add(rim);
  const traveller = new THREE.PointLight(0xffffff, 3.4, 6, 2);
  scene.add(traveller);

  /* ---- the frame ----------------------------------------------------------
     Fitted to whichever of the two is binding: the column's height, or the
     meteor's orbit across a box far taller than it is wide. On a narrow gutter
     the orbit is what decides it. */
  let halfH = 1;
  function frame(aspect) {
    halfH = Math.max((HIGH - LOW) / 2 + 0.5, (ORBIT + 0.12) / Math.max(0.01, aspect));
    camera.aspect = aspect;
    camera.position.set(0, 0, halfH / Math.tan((camera.fov * Math.PI / 180) / 2));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  /**
   * Line the top of the "H" up with the page's kicker.
   *
   * The column is `position: fixed`, so this is an alignment at the top of the
   * page rather than a permanent tie — scroll, and the kicker leaves while the
   * column stays. That is the intended reading: the two start together, which
   * is what makes the margin feel like part of the page rather than a strip
   * bolted to the side of it.
   *
   * The arithmetic is the camera's, run backwards. Under a perspective camera
   * at distance d looking at the origin, a point at height y lands at
   * `(0.5 − y / 2·halfH)` of the way down the canvas — so the cap of the H is
   * that many pixels below the top edge, and the box has to start that many
   * pixels above where the cap is wanted. The kicker's position is taken in
   * DOCUMENT coordinates and not viewport ones, so a reload part-way down the
   * page still lands in the same place.
   */
  function align() {
    if (!anchor || !anchor.isConnected) return;
    const height = canvas.getBoundingClientRect().height || 1;
    const capOffset = (0.5 - capTop / (2 * halfH)) * height;
    const anchorTop = anchor.getBoundingClientRect().top + window.scrollY;
    host.style.top = `${Math.round(anchorTop - capOffset)}px`;
  }

  /**
   * Where the meteor is, `p` of the way up.
   *
   * Eased at both ends: one that arrives at the top still travelling at full
   * speed reads as one that was cut off. The extra bit at each end is so it
   * comes up from BELOW the bottom letter and finishes ABOVE the top one, which
   * is what makes it a visitor rather than something that appears inside the
   * column and stops inside it.
   */
  const flight = new THREE.Vector3();
  function flightAt(p) {
    const eased = p * p * (3 - 2 * p);
    const angle = eased * TURNS * Math.PI * 2;
    return flight.set(
      Math.sin(angle) * ORBIT,
      LOW - 0.4 + eased * (HIGH - LOW + 0.8),
      Math.cos(angle) * ORBIT,
    );
  }

  /* ---- the cycle ---------------------------------------------------------- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* How long the whole cascade takes: the last letter's start, plus its turn. */
  const spinSpan = SPIN_SECONDS + (glyphs.length - 1) * (LEAD_DEGREES / 360) * SPIN_SECONDS;
  const CYCLE = CLIMB_SECONDS + spinSpan + REST_SECONDS;

  let raf = 0;
  let running = false;
  let clock = 0;
  let last = 0;
  let cycleStart = 0;
  let idleClock = 0;

  function draw(dt) {
    clock += dt;
    let t = clock - cycleStart;
    if (t >= CYCLE) {
      cycleStart = clock;
      t = 0;
      rollRays();
    }

    /* ---- the travelling highlight ----------------------------------------
       Up the front of the column and back down, forever, including through the
       rest. It is the one thing that never stops, and it is why a column doing
       nothing still looks like twelve solid objects rather than a picture of
       them. */
    const sweep = (clock % SWEEP_SECONDS) / SWEEP_SECONDS;
    const along = Math.sin(sweep * Math.PI * 2);
    traveller.position.set(
      -0.35 + Math.cos(sweep * Math.PI * 2) * 0.25,
      along * (HIGH - LOW) * 0.55,
      1.15,
    );
    traveller.intensity = 2.4 + Math.abs(along) * 1.6;

    /* ---- the climb ----------------------------------------------------- */
    const climbing = t < CLIMB_SECONDS;
    meteor.visible = climbing;
    tail.visible = climbing;
    if (climbing) {
      const p = t / CLIMB_SECONDS;
      const here = flightAt(p);
      meteor.position.copy(here);
      lamp.intensity = 3.2 * (0.35 + Math.sin(p * Math.PI) * 0.9);
      halo.scale.setScalar(0.52 + Math.sin(p * Math.PI * 7) * 0.06);

      const colour = brand();
      const behind = page();
      for (let i = 0; i < TAIL; i++) {
        const back = Math.max(0, p - (i / (TAIL - 1)) * TAIL_SPAN);
        const point = flightAt(back);
        tailPositions[i * 3] = point.x;
        tailPositions[i * 3 + 1] = point.y;
        tailPositions[i * 3 + 2] = point.z;
        /* Squared, so the tail is bright right behind the head and gone by the
           middle of its length rather than fading evenly the whole way. */
        const fade = Math.pow(1 - i / (TAIL - 1), 2) * Math.min(1, p * 4);
        tailColours[i * 3] = behind.r + (colour.r - behind.r) * fade;
        tailColours[i * 3 + 1] = behind.g + (colour.g - behind.g) * fade;
        tailColours[i * 3 + 2] = behind.b + (colour.b - behind.b) * fade;
      }
      tailGeometry.attributes.position.needsUpdate = true;
      tailGeometry.attributes.color.needsUpdate = true;
    }

    /* ---- the cascade ----------------------------------------------------
       Letter n starts turning when the letter above it has already turned
       LEAD_DEGREES. Each turn is exactly one revolution, so every letter ends
       where it started — at REST_LEAN, not at zero.

       AT A CONSTANT RATE, AND THAT IS THE INTERESTING PART.
       The first version eased each revolution — slow, fast, slow — because an
       eased turn is nicer than a linear one nearly everywhere else. Here it
       quietly broke the thing the whole feature is about. "The next letter
       starts when this one has turned ten degrees" is a statement about the
       GAP between neighbours, and under easing that gap is ten degrees for one
       instant and then something else: measured mid-cascade it had opened to
       fifteen. At a constant rate the gap is ten degrees for as long as both
       letters are turning, which is what was asked for and what you can
       actually see travelling down the column.

       Nothing is lost by it. A letter is face-on at both ends of a full
       revolution, so the only discontinuity is in angular velocity, and at a
       revolution every couple of seconds the eye does not find it. */
    const lead = (LEAD_DEGREES / 360) * SPIN_SECONDS;
    for (let i = 0; i < glyphs.length; i++) {
      const since = t - CLIMB_SECONDS - i * lead;
      glyphs[i].rotation.y = REST_LEAN + ((since <= 0 || since >= SPIN_SECONDS)
        ? 0
        : (since / SPIN_SECONDS) * Math.PI * 2);
    }

    renderer.render(scene, camera);
  }

  function frameLoop(now) {
    if (!running) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;

    /* Full rate while anything is happening, a quarter of it while nothing is.
       The clock still advances at the real rate either way — the skipped time
       is handed to the next frame that draws, so the cycle keeps proper time. */
    idleClock += dt;
    const t = clock - cycleStart;
    const busy = t < CLIMB_SECONDS + spinSpan;
    if (busy || idleClock >= 1 / REST_FPS) {
      draw(idleClock);
      idleClock = 0;
    }
    raf = requestAnimationFrame(frameLoop);
  }

  function start() {
    if (running || document.hidden || reduced.matches) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frameLoop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function size() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 80;
    const h = rect.height || 544;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    frame(w / h);
    align();
  }

  size();
  draw(0);
  host.dataset.namecolumn = 'three';

  /* A phone may take the context away — it drops the oldest when a page asks
     for more than the device allows, and this site asks for about thirty. Put
     the flat mark back rather than leaving an empty box. See fx/three.js. */
  guardContext(canvas, {
    onLost() {
      stop();
      host.dataset.namecolumn = 'css';
    },
    onRestored() {
      // Attribute first: the canvas is display:none until it is set, and a
      // hidden canvas measures zero.
      host.dataset.namecolumn = 'three';
      size();
      draw(0);
    },
  });

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', () => { size(); if (!running) draw(0); }, { passive: true });

  new MutationObserver(() => {
    const next = brand();
    material.color.copy(next).multiplyScalar(0.52);
    material.emissive.copy(next);
    head.material.emissive.copy(next);
    halo.material.color.copy(next);
    rim.color.copy(next);
    lamp.color.copy(next);
    rollRays();
    if (!running) draw(0);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  start();

  return {
    start, stop, align,
    /** For the guard: where the cycle is, and what the letters are doing. */
    state: () => ({
      cycle: CYCLE,
      at: clock - cycleStart,
      letters: glyphs.length,
      turning: glyphs.filter((g) => Math.abs(g.rotation.y - REST_LEAN) > 0.001).length,
      meteor: meteor.visible,
      /* The wave, as the number the brief is about: how far apart two
         neighbouring letters are, in degrees, while both are turning. */
      lead: (() => {
        for (let i = 0; i + 1 < glyphs.length; i++) {
          const a = glyphs[i].rotation.y - REST_LEAN;
          const b = glyphs[i + 1].rotation.y - REST_LEAN;
          if (a > 0.001 && b > 0.001) return (a - b) * 180 / Math.PI;
        }
        return null;
      })(),
      /* Where the top of the "H" is on screen, so a check can compare it with
         the kicker it is supposed to line up with. */
      capTop: (() => {
        const box = canvas.getBoundingClientRect();
        return box.top + (0.5 - capTop / (2 * halfH)) * box.height;
      })(),
    }),
    dispose() {
      stop();
      renderer.dispose();
      glyphs.forEach((g) => g.geometry.dispose());
      material.dispose();
    },
  };
}
