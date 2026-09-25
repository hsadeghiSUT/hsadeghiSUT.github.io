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
 * roots.js — the group as a root system.
 *
 * WHAT IT SAYS THAT THE CARDS DO NOT
 * ----------------------------------
 * The card view answers "who is in the group, and how senior". It arranges
 * everyone by category and, inside a category, by the order they appear in the
 * list — which is not time. So the one thing it cannot show is the shape of the
 * group's growth: when each person arrived, which parts of it are still
 * growing, and which finished years ago.
 *
 * The roots answer that. One root per category leaves a common trunk; the
 * people on it are placed along it by year, earliest at the base and newest at
 * the tip. A root that reaches further is a line of work that has been running
 * longer. Roots still growing end in a live tip; roots whose people have all
 * finished simply stop.
 *
 * WHY A ROOT AND NOT A TREE
 * -------------------------
 * Because of what this group studies. "Ecohydrology of the rhizosphere" is one
 * of the five research interests on the front page, the laboratory is the Green
 * Geotechnology Laboratory, and the soil–plant–bacteria interaction is the
 * stated subject of the group's work. A supervision tree is a generic academic
 * metaphor; a root system is this group's own subject drawn as its own
 * structure. It also happens to be the right shape: roots branch, thin and
 * reach, which is what a growing research group does.
 *
 * WHAT THIS MODULE IS AND IS NOT
 * ------------------------------
 * It computes positions and builds geometry. It owns no renderer, no camera and
 * no scene — `index.js` keeps all of those, and the cards it places are the
 * same meshes the card view moves. That is the whole reason this is a layout
 * rather than a second panel: the Research Team page already carries thirty
 * WebGL canvases on a phone that will hold about a dozen (README §23), so a
 * second context to show the same fifty-five people would be the most
 * expensive possible way to do it.
 */

/* ---- the shape ------------------------------------------------------------ */

/** Where the trunk starts and ends, in scene units. */
const CROWN_Y = 0.55;
const TRUNK_Y = -2.45;

/* Spacing is expressed in CARD WIDTHS, not scene units.
 *
 * The cards change size with how many are on screen (see `rootCardScale`), so
 * any spacing fixed in scene units is correct at exactly one count and wrong
 * either side of it — which is how nine PhD students ended up 0.73 apart with a
 * card 1.27 wide. These are multiples of the drawn card instead, so the gaps
 * grow and shrink with the thing they are separating. */
const FAN_ACROSS = 1.06;
const FAN_UP = 1.42;
const STOP_GAP = 1.12;

/**
 * How far out a root reaches at full length.
 *
 * Roots are laid out on a disc around the trunk and they must not reach so far
 * that the block of fifty-five cards becomes a ring with a hole in it — the
 * camera frames the whole thing, so a wider ring means a smaller everything.
 */
const ROOT_REACH = 3.75;

/** How far below the crown each root leaves the trunk, per lane. */
const LANE_DEPTH = [-0.10, -0.34, -0.58, -0.84, -1.12, -1.42];

/**
 * Where each root points, as an angle around the trunk.
 *
 * Not evenly spaced. Six roots at exactly 60° apart read as a manufactured
 * object — a hub with spokes — and the thing being drawn is not manufactured.
 * These are spread irregularly enough to look grown and regularly enough that
 * no two roots overlap from the default camera.
 */
const LANE_AZIMUTH = [0.35, 1.28, 2.33, 3.31, 4.22, 5.31];

/** Root thickness at the trunk, per lane. Seniority, same order as LANE_SCALE. */
const LANE_RADIUS = [0.085, 0.075, 0.068, 0.055, 0.048, 0.042];

/** How much of its base thickness a root keeps at its tip. */
const TIP_TAPER = 0.22;

/* ---- helpers -------------------------------------------------------------- */

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * One root's centre line, as a function of `t` from 0 at the trunk to 1 at the
 * tip.
 *
 * Roots are not straight and they are not arcs either: they leave almost
 * horizontally, then turn down as they go. `t * t` on the descent is what does
 * that — it keeps the first half shallow, where the people are densest, and
 * drops the last stretch away steeply, which is what stops six roots from
 * looking like a flat asterisk seen from above.
 *
 * The sideways drift is small and different per lane, so no two roots are the
 * same curve.
 */
function rootPoint(lane, t, reach) {
  const a = LANE_AZIMUTH[lane];
  const drift = Math.sin(t * Math.PI) * 0.26 * (lane % 2 ? 1 : -1);
  const angle = a + drift * 0.32;
  const r = reach * t;
  return [
    Math.cos(angle) * r,
    LANE_DEPTH[lane] - t * t * 0.95,
    Math.sin(angle) * r,
  ];
}

/* ---- the layout ----------------------------------------------------------- */

/**
 * Where every person stands in the root view.
 *
 * Position along a root is the person's YEAR, not their place in the list. That
 * is the entire point of the view, and it is also the one thing that can be
 * wrong in a way nobody notices — so a person with no readable year is placed
 * at the end of their root rather than at the middle, and reported, instead of
 * being quietly given the average.
 *
 * @param {Array} people  from buildRoster()
 * @returns {{home: Map<number, number[]>, span: {min: number, max: number},
 *           undated: number, tips: Array}}
 */
export function layoutRoots(people, cardWidth = 1.12) {
  const dated = people.map((p) => p.year).filter(Boolean);
  const min = dated.length ? Math.min(...dated) : 0;
  const max = dated.length ? Math.max(...dated) : 0;

  const home = new Map();
  const reaches = new Map();
  let undated = 0;

  const byLane = new Map();
  for (const person of people) {
    if (!byLane.has(person.lane)) byLane.set(person.lane, []);
    byLane.get(person.lane).push(person);
  }

  for (const [lane, group] of byLane) {
    /* Ordered by year, so "further along the root" and "later" are the same
       statement however the list happens to be ordered. */
    const sorted = [...group].sort((a, b) => (a.year || max) - (b.year || max));
    for (const p of sorted) if (!p.year) undated += 1;

    /* Runs of people who share a year. They cannot be strung along the root —
       they are the same point in time — so each run becomes one stop, and the
       people in it are fanned across the root at that stop. */
    const stops = [];
    for (const p of sorted) {
      const last = stops[stops.length - 1];
      if (last && last.year === (p.year || null)) last.people.push(p);
      else stops.push({ year: p.year || null, people: [p] });
    }

    /* EVENLY SPACED STOPS, NOT PROPORTIONAL TO THE YEAR.
       
       Proportional was the first version and it cannot work at this size. The
       record spans about ten years on a root under four units long, so one year
       is roughly a third of a unit — and a card is over a unit wide. Every
       group came out as a pile: nine PhD students occupied 1.5 units of root
       between them and were drawn one on top of another.
       
       So the stops are spread evenly and the ORDER carries the time. "Further
       out is later" stays exactly true; "twice as far out is twice as long ago"
       was never true anyway, because a root is not an axis with a scale on it.
       The readout gives the span in years, and every card gives its own. */
    /* THE ROOT GROWS TO HOLD WHAT IS ON IT.
    
       A fixed length divided by however many stops there are gives a spacing
       that shrinks as a group gets bigger, which is the opposite of what is
       needed. So the root is as long as its contents require — the base length
       when that is enough, longer when it is not — and the caller builds the
       tube to the length it is told. */
    const n = stops.length;
    const needed = (n - 1) * cardWidth * STOP_GAP;
    const reach = Math.max(ROOT_REACH, needed / 0.86);
    reaches.set(lane, reach);

    stops.forEach((stop, i) => {
      const t = n === 1 ? 0.62 : lerp(0.14, 1, i / (n - 1));
      const [x, y, z] = rootPoint(lane, t, reach);

      const a = LANE_AZIMUTH[lane];
      const across = [-Math.sin(a), 0, Math.cos(a)];
      const k = stop.people.length;

      /* A fan across the root and up from it, laid out as a block rather than a
         line: ten people who finished in the same year would otherwise reach
         five card-widths out to one side and leave the root. */
      const cols = Math.max(1, Math.ceil(Math.sqrt(k)));
      stop.people.forEach((p, j) => {
        const col = j % cols;
        const row = Math.floor(j / cols);
        const offset = col - (Math.min(cols, k - row * cols) - 1) / 2;
        home.set(p.index, [
          x + across[0] * offset * FAN_ACROSS * cardWidth,
          y + 0.34 + row * FAN_UP * cardWidth,
          z + across[2] * offset * FAN_ACROSS * cardWidth,
        ]);
      });
    });
  }

  return { home, reaches, span: { min, max }, undated, lanes: [...byLane.keys()] };
}

/**
 * How large to draw the cards, for a given number of them on screen.
 *
 * The root view has one length of root per group however many people are on it,
 * so the only thing that can give way is the card. Fifty-five at a readable
 * size do not fit on six roots and never will; nine do, comfortably — which is
 * exactly what filtering to a single group asks for.
 *
 * So the size follows the count, and the filter becomes the way to read the
 * view rather than a thing that happens to it. `sqrt` because the crowding is
 * two-dimensional, and the clamp keeps the whole group from becoming confetti
 * at one end and two postdocs from filling the frame at the other.
 */
export function rootCardScale(visible) {
  const n = Math.max(1, visible);
  return Math.max(0.46, Math.min(1.15, 3.4 / Math.sqrt(n)));
}

/* ---- the geometry --------------------------------------------------------- */

/**
 * A tapered tube along a curve.
 *
 * Three's own `TubeGeometry` has one radius for the whole length, and a root of
 * constant thickness reads as wire. This builds the rings directly so the
 * radius can fall from base to tip — which is the difference between six wires
 * and a root system.
 *
 * Built by hand rather than by tapering a TubeGeometry afterwards because
 * moving vertices back toward a curve means recovering which ring each vertex
 * belongs to and where that ring's centre was, and that is more code than
 * simply placing them.
 */
function taperedTube(THREE, pointAt, segments, radial, r0, r1) {
  const positions = [];
  const normals = [];
  const indices = [];

  const up = new THREE.Vector3(0, 1, 0);
  const here = new THREE.Vector3();
  const next = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const lift = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    here.fromArray(pointAt(t));
    next.fromArray(pointAt(Math.min(1, t + 1 / segments)));
    tangent.subVectors(next, here);
    if (tangent.lengthSq() < 1e-9) tangent.set(0, -1, 0);
    tangent.normalize();

    /* A frame around the tangent. `up` fails when the root is vertical, which
       the last stretch of every one of them nearly is, so fall back to Z. */
    side.crossVectors(tangent, up);
    if (side.lengthSq() < 1e-6) side.crossVectors(tangent, new THREE.Vector3(0, 0, 1));
    side.normalize();
    lift.crossVectors(side, tangent).normalize();

    const r = lerp(r0, r1, t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const nx = side.x * Math.cos(a) + lift.x * Math.sin(a);
      const ny = side.y * Math.cos(a) + lift.y * Math.sin(a);
      const nz = side.z * Math.cos(a) + lift.z * Math.sin(a);
      positions.push(here.x + nx * r, here.y + ny * r, here.z + nz * r);
      normals.push(nx, ny, nz);
    }
  }

  const ring = radial + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * ring + j;
      const b = a + ring;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Build the trunk and the six roots.
 *
 * Returns one `THREE.Group` for the caller to add to its scene, plus the
 * materials so the caller can fade the whole thing with the morph. Every
 * material is transparent from the start: turning transparency on later forces
 * a shader recompile mid-animation, which is a visible hitch.
 *
 * @param {object} THREE
 * @param {Array} people      from buildRoster()
 * @param {string[]} palette  one colour per lane, the same six the cards use
 * @param {string} woodColour the trunk's colour
 */
export function buildRootGeometry(THREE, people, palette, woodColour, reaches = new Map()) {
  const group = new THREE.Group();
  const materials = [];
  const geometries = [];

  const lanes = new Set(people.map((p) => p.lane));

  /* The trunk. Straight, and thicker than any root — everything hangs off it,
     and a trunk the same weight as its roots reads as one more root. */
  const trunkGeo = taperedTube(
    THREE,
    (t) => [0, lerp(CROWN_Y, TRUNK_Y, t), 0],
    10, 10, 0.13, 0.05,
  );
  const trunkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(woodColour),
    roughness: 0.85,
    metalness: 0.0,
    transparent: true,
    opacity: 0,
  });
  group.add(new THREE.Mesh(trunkGeo, trunkMat));
  materials.push(trunkMat);
  geometries.push(trunkGeo);

  for (const lane of lanes) {
    const geometry = taperedTube(
      THREE,
      (t) => rootPoint(lane, t, reaches.get(lane) || ROOT_REACH),
      26, 8,
      LANE_RADIUS[lane] || 0.05,
      (LANE_RADIUS[lane] || 0.05) * TIP_TAPER,
    );
    /* The root is its category's own colour, mixed well down toward the wood.
       At full strength six saturated roots compete with fifty-five
       photographs, which are the subject; at nothing they stop saying which
       root is which group. A fifth of the way is enough to tell them apart. */
    const colour = new THREE.Color(palette[lane] || '#0891b2')
      .lerp(new THREE.Color(woodColour), 0.62);
    const material = new THREE.MeshStandardMaterial({
      color: colour,
      roughness: 0.82,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
    });
    group.add(new THREE.Mesh(geometry, material));
    materials.push(material);
    geometries.push(geometry);
  }

  group.visible = false;
  return { group, materials, geometries };
}
