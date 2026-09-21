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
 * registry.js — which sprite id is which model, and how it moves.
 *
 * One row per icon in `assets/icons/icons.svg`. A row says up to four things:
 *
 *     family   which models/ file it lives in — and therefore which module is
 *              downloaded. A page that uses eight icons from two families
 *              fetches two files, not five. See `FAMILIES`.
 *     make     the exported builder's name in that file.
 *     motion   how it behaves at rest and under the pointer. Omitted for most,
 *              which take the default below.
 *     bleed    how far outside its own box the icon may draw. Omitted for all
 *              but two — the sun, whose flares leave the button, and the
 *              factory, whose smoke leaves the card. index.js documents what it
 *              does and what it costs.
 *     fill     how much of its frame the model takes, overriding the default
 *              0.86. A disc can be drawn nearly to the edge because turning it
 *              only makes it narrower; a deep object cannot. index.js has the
 *              reasoning, and the six on the Summary page are why it exists.
 *
 * ── THE MOTION RULE ─────────────────────────────────────────────────────────
 * Idle motion is small and slow enough to be missed; hover motion is the one
 * that performs. A page with thirty icons all doing something interesting is a
 * page nobody can read, and an icon that only moves when pointed at is an icon
 * most visitors never see move. So: everything breathes, one thing at a time
 * dances.
 *
 * `prefers-reduced-motion` stops all of it — index.js renders one frame in the
 * resting pose and never asks for another.
 */

/* -------------------------------------------------------------------------- */
/* Families — the lazy-loading boundary                                        */
/* -------------------------------------------------------------------------- */

export const FAMILIES = {
  architecture: () => import('./models/architecture.js'),
  paper: () => import('./models/paper.js'),
  people: () => import('./models/people.js'),
  symbols: () => import('./models/symbols.js'),
  brands: () => import('./models/brands.js'),
};

/* -------------------------------------------------------------------------- */
/* Motion                                                                      */
/* -------------------------------------------------------------------------- */

/** Find a named part of a model, with the lookup cached on the group. */
function part(group, name) {
  if (!group.__parts) group.__parts = new Map();
  if (!group.__parts.has(name)) group.__parts.set(name, group.getObjectByName(name) || null);
  return group.__parts.get(name);
}

/** Ease a 0…1 value into something with a soft start and end. */
const ease = (x) => x * x * (3 - 2 * x);

/**
 * The resting behaviour of every icon that does not ask for another.
 *
 * A slow turn about the vertical axis, a slower nod, and the whole thing
 * fractionally larger under the pointer. The two periods are deliberately not
 * multiples of each other, so the motion never quite repeats and never reads as
 * a loop.
 *
 * `phase` is per instance, which is what stops six copies of the same icon on
 * the Summary page turning in lockstep like a rack of clocks.
 */
export function defaultMotion(group, t, s) {
  const h = ease(s.hover);
  group.rotation.y = Math.sin(t * 0.55 + s.phase) * (0.2 + h * 0.5) + h * 0.12;
  group.rotation.x = Math.sin(t * 0.37 + s.phase * 1.7) * 0.055 - h * 0.08;
  group.position.y = Math.sin(t * 0.47 + s.phase) * 0.012 + h * 0.015;
  group.scale.setScalar(1 + h * 0.07);
}

/** Turn one named part continuously about an axis. */
const spin = (name, axis, rate) => (group, t, s) => {
  defaultMotion(group, t, { ...s, hover: s.hover * 0.35 });
  const p = name ? part(group, name) : group;
  if (p) p.rotation[axis] = t * rate * (1 + ease(s.hover) * 1.6);
};

/* -------------------------------------------------------------------------- */
/* The table                                                                   */
/* -------------------------------------------------------------------------- */

export const REGISTRY = {
  /* ---- buildings and places ------------------------------------------- */
  'fas-university': { family: 'architecture', make: 'university' },
  'fad-building': { family: 'architecture', make: 'building' },
  'fad-home': { family: 'architecture', make: 'home' },
  'fas-school': { family: 'architecture', make: 'school' },
  /**
   * The factory works: two chimneys, two columns of smoke, and the smoke goes
   * where smoke goes — up, sideways, and out of the icon altogether. `bleed`
   * is what gives it the room; on the Summary card it puts the smoke well
   * outside the tinted tile and out over the card behind it.
   */
  'fad-industry': {
    family: 'architecture',
    make: 'industry',
    fill: 1.1,
    bleed: 2.5,
    motion: puffAway,
  },
  'fad-industry-alt': { family: 'architecture', make: 'industryAlt' },
  'fad-phone': { family: 'architecture', make: 'phone' },
  'fad-microphone-stand': { family: 'architecture', make: 'microphoneStand' },
  'fas-microphone-stand': { family: 'architecture', make: 'microphoneStandSolid' },
  /* Raised for the Teaching card on the Summary page: a board is a flat panel,
     so it takes a larger share of its frame without ever sweeping wider. */
  'fad-chalkboard-teacher': { family: 'architecture', make: 'chalkboardTeacher', fill: 1.0 },
  'fas-chalkboard-teacher': { family: 'architecture', make: 'chalkboardTeacherSolid' },

  /**
   * The pin bobs rather than turns. A map marker is a thing that points at a
   * place, and a thing that points looks wrong swinging away from it.
   */
  'fad-map-marker-alt': {
    family: 'architecture',
    make: 'mapMarker',
    motion(group, t, s) {
      const h = ease(s.hover);
      group.position.y = Math.sin(t * 1.5 + s.phase) * 0.03 + h * 0.06;
      group.rotation.y = Math.sin(t * 0.5 + s.phase) * 0.22;
      group.rotation.z = Math.sin(t * 1.5 + s.phase + 1) * 0.04;
      group.scale.setScalar(1 + h * 0.06);
    },
  },

  /** The flag goes up when you point at it, which is what a mailbox flag is for. */
  'fad-mailbox': {
    family: 'architecture',
    make: 'mailbox',
    motion(group, t, s) {
      defaultMotion(group, t, s);
      group.rotation.y = Math.sin(t * 0.5 + s.phase) * 0.28 - ease(s.hover) * 0.5;
    },
  },

  /** The fax feeds its page out and pulls it back. */
  'fad-fax': {
    family: 'architecture',
    make: 'fax',
    motion(group, t, s) {
      defaultMotion(group, t, s);
      const sheet = part(group, 'sheet');
      if (sheet) {
        const feed = (Math.sin(t * 0.8 + s.phase) * 0.5 + 0.5) * (0.06 + ease(s.hover) * 0.14);
        sheet.position.y = 0.22 + feed;
      }
    },
  },

  /* ---- books and documents -------------------------------------------- */
  'fad-book': { family: 'paper', make: 'book' },
  'fad-file-alt': { family: 'paper', make: 'fileAlt' },
  'far-file-alt': { family: 'paper', make: 'fileAltRegular' },
  'fad-calendar-alt': { family: 'paper', make: 'calendar' },

  /** The ribbon sways behind the book, a little after the book itself moves. */
  'fad-book-alt': {
    family: 'paper',
    make: 'bookAlt',
    motion(group, t, s) {
      defaultMotion(group, t, s);
      const ribbon = part(group, 'ribbon');
      if (ribbon) ribbon.rotation.z = Math.sin(t * 0.9 + s.phase - 0.6) * (0.1 + ease(s.hover) * 0.2);
    },
  },

  /** Open books open further under the pointer. */
  'fad-book-open': { family: 'paper', make: 'bookOpen', motion: openTheBook },

  /**
   * The reader reads: the book swings open and shut, over and over, and the
   * arms holding it go with the covers.
   *
   * This one does NOT wait for the pointer, and it is the exception to the
   * motion rule at the top of this file. It is the Research Team card on the
   * Summary page, where it is the largest icon on the site and the thing the
   * eye lands on — an icon that size doing nothing is a picture, and the whole
   * argument for modelling these was that they are not pictures.
   */
  'fad-book-reader': { family: 'paper', make: 'bookReader', fill: 0.88, motion: readAloud },

  /** The leaning volume rights itself when you point at the shelf. */
  /* The Publications card. A shelf is deep, so this takes the smallest lift of
     the six — enough to close the gap to the flat glyph, not enough to put a
     corner of the leaning volume outside the frame as it turns. */
  'fad-books': {
    family: 'paper',
    make: 'books',
    fill: 1.0,
    motion(group, t, s) {
      defaultMotion(group, t, s);
      const leaning = part(group, 'leaning');
      if (leaning) {
        leaning.rotation.z = -0.33 + ease(s.hover) * 0.3 + Math.sin(t * 0.7 + s.phase) * 0.02;
      }
    },
  },

  /** Magnifiers drift over what they are reading, and settle on hover. */
  'fad-search': { family: 'paper', make: 'search' },
  'fad-file-search': { family: 'paper', make: 'fileSearch', motion: sweepTheLens },
  'fad-print-search': { family: 'paper', make: 'printSearch', motion: sweepTheLens },

  /* ---- writing --------------------------------------------------------- */
  'fad-pen-alt': { family: 'paper', make: 'penAlt', motion: writeWithIt },
  'fad-pen-fancy': { family: 'paper', make: 'penFancy', motion: writeWithIt },
  'fad-pencil-alt': { family: 'paper', make: 'pencilAlt', motion: writeWithIt },
  'fas-pencil': { family: 'paper', make: 'pencilSolid', motion: writeWithIt },
  'fas-highlighter': { family: 'paper', make: 'highlighter', motion: writeWithIt },
  'fas-paint-brush-alt': { family: 'paper', make: 'paintBrush', motion: writeWithIt },

  /* ---- people ---------------------------------------------------------- */
  'fad-user': { family: 'people', make: 'user' },
  'fad-user-check': { family: 'people', make: 'userCheck' },
  'fad-user-crown': { family: 'people', make: 'userCrown' },
  'fad-user-secret': { family: 'people', make: 'userSecret', motion: tipTheHat },
  'fad-user-cowboy': { family: 'people', make: 'userCowboy', motion: tipTheHat },
  'fad-user-graduate': { family: 'people', make: 'userGraduate', motion: swingTheTassel },
  'fal-user-graduate': { family: 'people', make: 'userGraduateLight', motion: swingTheTassel },
  'fad-graduation-cap': { family: 'people', make: 'graduationCap', motion: swingTheTassel },

  /* ---- marks ----------------------------------------------------------- */
  'fad-wreath': { family: 'symbols', make: 'wreath' },
  'fad-crown': { family: 'symbols', make: 'crown' },
  'fas-crown': { family: 'symbols', make: 'crownSolid' },
  'fad-times-octagon': { family: 'symbols', make: 'timesOctagon' },
  'fas-exclamation-triangle': { family: 'symbols', make: 'warningTriangle' },
  'fad-check-circle': { family: 'symbols', make: 'checkCircle' },
  'fal-arrow-circle-up': { family: 'symbols', make: 'arrowCircleUp' },
  'fal-copyright': { family: 'symbols', make: 'copyright' },

  /**
   * Stars ROCK rather than spin, and this was a correction.
   *
   * A star is a flat-ish solid, so a full turn about the vertical axis takes it
   * edge-on twice a cycle — at which point a sixteen-pixel star is a two-pixel
   * line. On the Honors page there are thirty-two of them in a column, and
   * thirty-two stars independently flickering out and back is the busiest thing
   * that has ever been on this site.
   *
   * So the turn is bounded: far enough that the facets swap which one catches
   * the key light, never far enough to lose the silhouette. Point at one and it
   * goes round properly, once, which is the reward for looking.
   */
  'fad-star': { family: 'symbols', make: 'starDuo', motion: rockTheStar },
  'fas-star': { family: 'symbols', make: 'star', motion: rockTheStar },
  'fal-star': { family: 'symbols', make: 'starLight', motion: rockTheStar },

  /** The heart beats: two pulses and a rest, as a heart does. */
  'fas-heart': {
    family: 'symbols',
    make: 'heart',
    motion(group, t, s) {
      const cycle = (t * 0.75 + s.phase) % 1;
      const beat = Math.max(
        Math.exp(-((cycle - 0.04) ** 2) * 900),
        Math.exp(-((cycle - 0.2) ** 2) * 700) * 0.62,
      );
      const h = ease(s.hover);
      group.scale.setScalar(1 + beat * (0.09 + h * 0.07));
      group.rotation.y = Math.sin(t * 0.5 + s.phase) * (0.18 + h * 0.4);
      group.rotation.z = -beat * 0.03;
    },
  },

  /**
   * The medal swings on its ribbon.
   *
   * `fill` is raised because this is the Honors & Awards card on the Summary
   * page and it has to read as a medal at twenty-one pixels. It is a shallow
   * object — a disc on a strap — so the turning room the default reserves is
   * room it never uses.
   */
  'fad-award': {
    family: 'symbols',
    make: 'award',
    fill: 1.03,
    motion(group, t, s) {
      defaultMotion(group, t, s);
      const medal = part(group, 'medal');
      if (medal) medal.rotation.z = Math.sin(t * 1.1 + s.phase) * (0.05 + ease(s.hover) * 0.16);
    },
  },

  /* ---- the ones that turn --------------------------------------------- */

  /**
   * The earth. Turning about its own axis, west to east, once every fifteen
   * seconds or so — slow enough to be a planet rather than a globe on a stand,
   * fast enough that a visitor who looks twice sees it has moved.
   */
  'fad-globe-americas': { family: 'symbols', make: 'globe', motion: spin('world', 'y', 0.42) },

  /** The gear turns. Gears turn. */
  'fad-cog': { family: 'symbols', make: 'cog', motion: spin('gear', 'z', 0.55) },

  /**
   * The sun turns about its axis and throws flares off its limb.
   *
   * `bleed: 2` is the unusual part and it is deliberate: it gives this one icon
   * a canvas twice its own box in each direction, so a flare can leave the
   * button entirely. index.js documents what that costs and what it does; the
   * sun's body still comes out the same size on screen as every other icon.
   */
  'fad-sun': { family: 'symbols', make: 'sun', bleed: 2.4, motion: burn },

  /**
   * The spinner steps rather than sweeps — eight positions a second, which is
   * what `anim-spin-step` does to the flat one and what makes a spinner read as
   * a spinner rather than as something falling over.
   */
  'fad-spinner': {
    family: 'symbols',
    make: 'spinner',
    motion(group, t, s) {
      const ring = part(group, 'ring');
      if (ring) ring.rotation.z = -Math.floor(t * 8) * (Math.PI / 4);
      group.rotation.y = Math.sin(t * 0.5 + s.phase) * 0.1;
      group.scale.setScalar(1 + ease(s.hover) * 0.07);
    },
  },

  /**
   * The clock runs backwards, because that is what the icon means.
   *
   * A clock face is the flattest thing in the set, so it takes the largest
   * `fill` of the six on the Summary page: turning a disc about the vertical
   * axis only ever narrows it.
   */
  'fad-history': {
    family: 'symbols',
    make: 'history',
    fill: 1.14,
    motion(group, t, s) {
      defaultMotion(group, t, { ...s, hover: s.hover * 0.4 });
      const rate = 1 + ease(s.hover) * 5;
      const minute = part(group, 'minute');
      const hour = part(group, 'hour');
      if (minute) minute.rotation.z = t * 0.9 * rate;
      if (hour) hour.rotation.z = t * 0.075 * rate;
    },
  },

  /** The last grain falls, over and over. */
  'fas-hourglass-end': {
    family: 'symbols',
    make: 'hourglass',
    motion(group, t, s) {
      defaultMotion(group, t, s);
      const grain = part(group, 'grain');
      if (grain) {
        const fall = ((t * 0.8 + s.phase) % 1);
        grain.position.y = 0.06 - fall * 0.2;
        grain.visible = fall < 0.8;
      }
    },
  },

  /** The two links turn against each other, which is what shows they are linked. */
  'fad-link': {
    family: 'symbols',
    make: 'link',
    motion(group, t, s) {
      const h = ease(s.hover);
      group.rotation.y = Math.sin(t * 0.5 + s.phase) * (0.24 + h * 0.5);
      group.rotation.x = Math.sin(t * 0.4 + s.phase) * 0.08;
      const a = part(group, 'linkA');
      const b = part(group, 'linkB');
      const swing = Math.sin(t * 1.1 + s.phase) * (0.05 + h * 0.13);
      if (a) a.rotation.z = -0.7 + swing;
      if (b) b.rotation.z = -0.7 - swing;
      group.scale.setScalar(1 + h * 0.06);
    },
  },

  /** Digging: the shovel strokes, and strokes faster when you look at it. */
  'fad-digging': {
    family: 'symbols',
    make: 'digging',
    motion(group, t, s) {
      defaultMotion(group, t, { ...s, hover: s.hover * 0.3 });
      const shovel = part(group, 'shovel');
      if (shovel) {
        const cycle = t * (1.1 + ease(s.hover) * 1.6) + s.phase;
        shovel.rotation.z = -0.5 + Math.sin(cycle) * 0.34;
        shovel.position.y = -0.12 + Math.max(0, Math.sin(cycle)) * 0.08;
      }
    },
  },

  /* ---- envelopes ------------------------------------------------------- */
  'fad-envelope': { family: 'symbols', make: 'envelope', motion: openTheEnvelope },
  'fas-envelope': { family: 'symbols', make: 'envelopeSolid', motion: openTheEnvelope },
  'fal-envelope': { family: 'symbols', make: 'envelopeLight', motion: openTheEnvelope },

  /* ---- the theme switch ------------------------------------------------ */

  /** The moon goes round the month, and the stars twinkle out of step. */
  'fad-moon-stars': { family: 'symbols', make: 'moonStars', motion: goRoundTheMonth },

  /** Half sun, half moon, turning steadily about the vertical axis. */
  'fad-adjust': {
    family: 'symbols',
    make: 'adjust',
    motion(group, t, s) {
      const ball = part(group, 'ball');
      /* A continuous turn, not a swing. The point of this icon is that the two
         halves take it in turns to face you, which a rocking motion never lets
         either of them finish doing. Roughly nine seconds to the revolution;
         about four times that under the pointer. */
      if (ball) ball.rotation.y = turnedBy(ball, t, 0.7, 1 + ease(s.hover) * 3);
      group.rotation.x = Math.sin(t * 0.37 + s.phase) * 0.05;
      group.position.y = Math.sin(t * 0.47 + s.phase) * 0.012;
      group.scale.setScalar(1 + ease(s.hover) * 0.07);
    },
  },

  /* ---- brand marks ----------------------------------------------------- */
  'fab-linkedin': { family: 'brands', make: 'linkedin', motion: turnTheBadge },
  'fab-orcid': { family: 'brands', make: 'orcid', motion: turnTheBadge },
  'fab-researchgate': { family: 'brands', make: 'researchgate', motion: turnTheBadge },
  'fab-mendeley': { family: 'brands', make: 'mendeley', motion: turnTheBadge },
};

/* -------------------------------------------------------------------------- */
/* The shared motions, declared after the table so the table reads as a table  */
/* -------------------------------------------------------------------------- */

/* ---- the theme switch ---------------------------------------------------- */

/**
 * Advance an angle by a rate that is allowed to change, without it jumping.
 *
 * EVERY OTHER TURN IN THIS FILE IS `t * rate`, and for every other icon that is
 * right: the rate is constant, so the angle is a pure function of the clock and
 * there is no state to keep. The three on the theme switch break that. They
 * speed up under the pointer by three, four, ten times — and `t * rate` with a
 * changing rate does not speed up, it TELEPORTS: at thirty seconds in, tripling
 * the rate moves the angle from thirty units to ninety in the time the hover
 * takes to ease in. On the moon that is the difference between a crescent and a
 * gibbous appearing out of nowhere.
 *
 * So these three integrate instead — angle plus rate times the frame's own
 * elapsed time — which is continuous however the rate moves. The accumulator
 * lives on the node, and there is exactly one of each of these icons on a page.
 *
 * @param {object} node   where to keep the accumulated angle
 * @param {number} t      the clock, in seconds
 * @param {number} rate   radians (or cycles) per second at rest
 * @param {number} [gain] multiplied into the rate this frame
 */
function turnedBy(node, t, rate, gain = 1) {
  const d = node.userData;
  // A first frame, a jump backwards in the clock, or the long pause of a
  // hidden tab all arrive here as a bad delta. Clamped to one slow frame, so
  // coming back to a tab never lurches.
  const step = Math.min(0.1, Math.max(0, t - (d.turnAt === undefined ? t : d.turnAt)));
  d.turnAt = t;
  d.turned = (d.turned || 0) + step * rate * gain;
  return d.turned;
}

/**
 * The moon: one lunar month, and two stars blinking over it.
 *
 * A day a second, so the full cycle is twenty-eight seconds — new, crescent,
 * quarter, gibbous, full, and back. Pointing at it runs the month through in
 * about three, which is the reward for looking and the only way most visitors
 * will ever see it do the whole thing.
 *
 * The phase itself is `shadow.rotation.y`: zero is the dark shell facing the
 * camera and π is it facing away. `moonStars()` in models/symbols.js explains
 * why that is the whole of the trick.
 *
 * It starts at a fifth of the way round rather than at zero, so the resting
 * pose — which is ALSO the single frame drawn under `prefers-reduced-motion`,
 * where nothing ever advances — is a proper waxing crescent and not an empty
 * black disc.
 */
const MOON_START = 0.2;

function goRoundTheMonth(group, t, s) {
  const h = ease(s.hover);

  const shadow = part(group, 'shadow');
  if (shadow) {
    const month = MOON_START + turnedBy(shadow, t, 1 / 28, 1 + h * 8);
    shadow.rotation.y = month * Math.PI * 2;
  }

  /* The moon itself is tidally locked and keeps its face to us, so the body
     does not turn. All it does is lean, very slightly — a libration, which is
     the one motion a real moon has and the thing that keeps this from reading
     as a flat disc with a shadow painted on it. */
  const face = part(group, 'face');
  if (face) {
    face.rotation.y = Math.sin(t * 0.21 + s.phase) * 0.14;
    face.rotation.x = Math.sin(t * 0.17 + s.phase * 1.3) * 0.09;
  }

  group.position.y = Math.sin(t * 0.47 + s.phase) * 0.012 + h * 0.015;
  group.scale.setScalar(1 + h * 0.07);

  let i = 0;
  group.traverse((node) => {
    if (node.name !== 'twinkle') return;
    i += 1;
    if (node.userData.base === undefined) node.userData.base = node.scale.x;
    // Each star has its own period and its own offset, so the two of them never
    // blink together — which is the whole difference between a night sky and a
    // string of fairy lights.
    const pulse = 0.85 + Math.sin(t * (1.7 + i * 0.6) + i * 2.1) * 0.2;
    node.scale.setScalar(node.userData.base * pulse);
  });
}

/**
 * A number in 0 … 1 from an integer, that looks random and is not.
 *
 * The flares need a fresh direction every time one of them fires, and
 * `Math.random()` would give them one — at the cost of the whole layer's
 * reproducibility (index.js §5). This is the standard sine hash: no state, no
 * clock, same answer for the same cycle number for ever.
 */
function scatter(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * The sun: the body turns, and the corona throws flares.
 *
 * Each flare runs its own loop — erupt, reach, fall back — and picks a new
 * direction at the start of each one. The seven loops have periods that are not
 * multiples of one another, so at any instant a few are out at full length, a
 * few are folding back, and the thing never pulses in time with itself.
 *
 * At full length a flare's tip is outside the button; see `bleed` in the table
 * above and in index.js.
 */
function burn(group, t, s) {
  const h = ease(s.hover);

  const body = part(group, 'sun');
  if (body) {
    /* About twenty seconds to the revolution at rest. Slow — the surface has
       to read as boiling rather than as spinning — and three times that under
       the pointer, where the far side is worth bringing round. */
    body.rotation.y = turnedBy(body, t, 0.32, 1 + h * 2.2);
  }

  const corona = part(group, 'corona');
  if (corona) {
    corona.children.forEach((arm, i) => {
      const tongue = arm.children[0];
      const f = tongue && tongue.userData.flare;
      if (!f) return;

      /* Where this flare is in its own loop: `n` counts the eruptions, `u` runs
         0 → 1 through one of them. A new `n` is a new direction. */
      const x = t * f.rate * (1 + h * 1.5) + f.offset;
      const n = Math.floor(x);
      const u = x - n;

      arm.rotation.z = scatter(n * 3.7 + i * 17.3) * Math.PI * 2;

      /* Out and back, with the rise faster than the fall — which is what a
         prominence does and what keeps this from reading as a throb. */
      const reach = u < 0.32 ? u / 0.32 : 1 - (u - 0.32) / 0.68;
      const grow = Math.max(0, Math.sin(reach * Math.PI * 0.5));
      /* How far this particular eruption gets. Even the shortest clears the
         icon's own box; the longest reach about two and a quarter times it,
         which puts their tips outside the button altogether.
         THE TOP OF THIS RANGE IS NOT FREE TO RAISE. Past roughly 1.33 a flare
         runs into the edge of the camera's frame and is cut off square, which
         reads as a bug rather than as a flame — and the frame cannot be widened
         without widening the canvas, which is `bleed` in the table above. */
      const span = (0.48 + scatter(n * 5.1 + i * 2.9) * 0.68) * (1 + h * 0.15);
      const length = grow * span;

      tongue.scale.set(0.55 + grow * 0.65, Math.max(0.001, length), 1);
      // The cone is built centred on its own height, so its foot stays on the
      // limb only if its centre moves out by half of whatever it now is.
      tongue.position.y = f.foot + (0.52 * length) / 2;
      tongue.material.opacity = 0.2 + grow * 0.7;
    });
  }

  group.rotation.z = Math.sin(t * 0.29 + s.phase) * 0.05;
  group.position.y = Math.sin(t * 0.47 + s.phase) * 0.012;
  // A smaller swell on hover than the rest of the set gets, because everything
  // here is already tuned to the last few hundredths of the frame — the icon
  // answers the pointer by burning harder instead.
  group.scale.setScalar(1 + h * 0.04);
}

/* ---- the six on the Summary page ----------------------------------------- */

/**
 * A reader, reading: the book swings open and shut and the arms go with it.
 *
 * ONE MOTION DRIVING THE WHOLE ICON FROM ONE NUMBER. `swing` runs 0 (wide open)
 * to 1 (nearly shut) and back on a sine, and the two covers and a small nod of
 * the figure are read off it. The hands are not driven at all: they hang off
 * the covers in the model, so they follow without anything here knowing they
 * exist.
 *
 * It never closes completely. A book that shuts flat is a closed book, and for
 * one or two frames of every cycle this icon would be the wrong icon; stopping
 * a little short keeps it unmistakably a book being read.
 *
 * WHICH WAY THE COVERS TRAVEL, AND WHY IT WAS BACKWARDS
 * -----------------------------------------------------
 * Toward the reader's face, which sits above the book. It used to be the other
 * way — the fore-edges dropped about a third of the model's height DOWNWARD as
 * the book shut, and the two page faces splayed from 11° apart to 89° apart
 * instead of closing on each other. That is a paperback being bent backwards
 * over a knee, not a book being read, and at this size the eye reads the
 * direction long before it reads the object.
 *
 * The signs here are the mirror of the ones the model rests at: `bookReader`
 * builds its book with `fold: 'up'`, so the halves rest at −OPEN_REST and
 * +OPEN_REST, and every angle below follows that. **Change one and you must
 * change the other**, or the icon jumps between the pose it was framed at and
 * the pose it is drawn at.
 */
function readAloud(group, t, s) {
  const h = ease(s.hover);

  /* Roughly a four-second cycle, halving under the pointer. Slower than it
     wants to be: this is a page-navigation card, not a toy, and a book
     flapping at reading speed in the corner of the eye is a distraction. */
  const swing = 0.5 - Math.cos(t * (1.55 + h * 1.5) + s.phase) * 0.5;

  /* The resting angle `openBook()` builds the halves at. Written out rather
     than imported, and that is the lazy loading's price, not an oversight: the
     model families are `import()`ed on demand (see FAMILIES at the top), so a
     static import of one constant from `models/paper.js` would drag the whole
     family into the initial load to save four characters. It is `OPEN_REST`
     there, exported and named, so a search finds both ends. */
  const OPEN = 0.34;
  const angle = 0.1 + swing * (OPEN + 0.34);

  /* Negated on the left and positive on the right — the mirror of `bookOpen`'s
     default, and what makes the fore-edges rise toward the face rather than
     drop away from it. See the note above. */
  const left = part(group, 'left');
  const right = part(group, 'right');
  if (left) left.rotation.z = -angle;
  if (right) right.rotation.z = angle;

  /* THE HANDS NEED NOTHING HERE. They are children of the covers now (see
     `bookReader`), so turning a cover turns the hand on it, exactly and for
     free. What used to be here was two more angles derived from `angle` and
     kept in step with it by hand — a second copy of the truth, which is a thing
     to delete rather than a thing to maintain. */

  /* The head follows the page, down the line and back. */
  const figure = part(group, 'figure');
  if (figure) figure.rotation.x = 0.12 + swing * 0.1;

  group.rotation.y = Math.sin(t * 0.42 + s.phase) * (0.16 + h * 0.3);
  group.rotation.x = Math.sin(t * 0.31 + s.phase * 1.7) * 0.04 - h * 0.05;
  group.position.y = Math.sin(t * 0.47 + s.phase) * 0.012 + h * 0.015;
  group.scale.setScalar(1 + h * 0.06);
}

/** Every puff in a model, found once and kept. */
function puffsOf(group) {
  if (!group.__puffs) {
    const found = [];
    group.traverse((node) => { if (node.userData && node.userData.puff) found.push(node); });
    group.__puffs = found;
  }
  return group.__puffs;
}

/**
 * The factory, smoking.
 *
 * Each puff runs its own loop: out of the chimney, up, leaning as it goes,
 * swelling and thinning until there is nothing left of it. The loop is a pure
 * function of the clock and the puff's own seed, so there is no state to keep
 * and nine puffs cost nine sine calls.
 *
 * THE FADE IS LOAD-BEARING, NOT DECORATION. The puffs are meant to leave the
 * icon's box — that is what `bleed: 2` is for — but the canvas still has an
 * edge, and a puff that reaches it is cut off in a straight line, which reads
 * as a rendering fault rather than as smoke. So a puff's life is timed to run
 * out while it is still inside the frame: at the end of its rise it is already
 * transparent. Raising `RISE` without raising `bleed` to match is the way to
 * break this.
 */
const RISE = 0.55;

function puffAway(group, t, s) {
  const h = ease(s.hover);

  /* The plant turns like any other building, but only about half as far — the
     smoke is the thing to watch, and a chimney swinging through twenty degrees
     drags its own column sideways across the card. */
  group.rotation.y = Math.sin(t * 0.55 + s.phase) * (0.12 + h * 0.26) + h * 0.06;
  group.rotation.x = Math.sin(t * 0.37 + s.phase * 1.7) * 0.04 - h * 0.05;
  group.position.y = Math.sin(t * 0.47 + s.phase) * 0.012 + h * 0.015;
  group.scale.setScalar(1 + h * 0.05);

  for (const node of puffsOf(group)) {
    const p = node.userData.puff;

    // Where this puff is in its own life, 0 at the chimney mouth and 1 gone.
    const x = t * p.rate * (1 + h * 0.7) + p.seed;
    const u = x - Math.floor(x);

    node.position.y = p.mouth + u * RISE;
    /* Two different sideways motions: a steady lean away from the stack, and a
       slow waver across it. Together they stop the column reading as a string
       of beads on a wire. */
    node.position.x = p.x + u * p.lean * 0.16 + Math.sin(u * 3.1 + p.seed * 6.3) * p.drift * 0.1;
    node.position.z = Math.sin(u * 2.2 + p.seed * 4.1) * 0.04;

    // Smoke expands as it cools. It never contracts, so neither does this.
    node.scale.setScalar(0.42 + u * 1.45);

    /* In quickly at the mouth, then out over the rest, and STEEPLY — the
       exponent is the knob that decides how much of the rise is spent visible.
       At 2.6 a puff is gone by about seven tenths of the way up, which is what
       keeps the visible smoke inside the frame while the motion still covers
       the whole distance. The curve is also what separates smoke from a
       blinking dot: quick in, slow out. */
    const alpha = 0.78 * Math.min(1, u * 7) * (1 - u) ** 1.9;
    node.material.opacity = alpha;

    /* Taken out of the scene once there is nothing left to see. A transparent
       mesh at two per cent still costs a draw call and a sorted blend, and
       nine of them per factory is most of what this icon spends. */
    node.visible = alpha > 0.03;
  }
}

/* ---- everything else ----------------------------------------------------- */

/** A star rocking on its axis, and turning right round under the pointer. */
function rockTheStar(group, t, s) {
  const h = ease(s.hover);
  // The idle amplitude eases out as the hover spin eases in, so the two never
  // fight each other for the same axis.
  group.rotation.y = Math.sin(t * 0.7 + s.phase) * 0.55 * (1 - h) + t * 1.6 * h;
  group.rotation.x = Math.sin(t * 0.45 + s.phase) * 0.1;
  group.rotation.z = Math.sin(t * 0.33 + s.phase) * 0.06;
  group.scale.setScalar(1 + h * 0.1);
}

/** An open book: the two halves lift away from the gutter. */
function openTheBook(group, t, s) {
  defaultMotion(group, t, { ...s, hover: s.hover * 0.6 });
  const h = ease(s.hover);
  const breathe = Math.sin(t * 0.8 + s.phase) * 0.035;
  const left = part(group, 'left');
  const right = part(group, 'right');
  if (left) left.rotation.z = 0.34 + breathe + h * 0.22;
  if (right) right.rotation.z = -0.34 - breathe - h * 0.22;
}

/**
 * A lens passing over a page, and settling where you are looking.
 *
 * `home()` is used rather than a captured constant because the model is shared
 * between every instance of the icon on the page: whatever the previous
 * instance left in `position` is what this one would otherwise drift away
 * from. Recording the builder's original value once, on the object, is what
 * keeps them independent.
 */
function sweepTheLens(group, t, s) {
  defaultMotion(group, t, { ...s, hover: s.hover * 0.5 });
  const lens = part(group, 'lens');
  if (!lens) return;

  const rest = home(lens);
  const h = ease(s.hover);
  const roam = 1 - h;          // under the pointer it stops wandering
  lens.position.x = rest.x + Math.sin(t * 0.7 + s.phase) * 0.09 * roam;
  lens.position.y = rest.y + Math.cos(t * 0.9 + s.phase) * 0.05 * roam + h * 0.04;
  lens.scale.setScalar(1 + h * 0.12);
}

/** Where the builder left a part. Recorded once, on first use. */
function home(node) {
  if (!node.userData.home) node.userData.home = node.position.clone();
  return node.userData.home;
}

/** A pen held at rest, and put to work under the pointer. */
function writeWithIt(group, t, s) {
  const h = ease(s.hover);
  const stroke = Math.sin(t * 6) * h;
  group.rotation.y = Math.sin(t * 0.55 + s.phase) * (0.24 + h * 0.4);
  group.rotation.x = Math.sin(t * 0.4 + s.phase) * 0.05;
  group.rotation.z = stroke * 0.05;
  group.position.x = stroke * 0.05;
  group.position.y = Math.sin(t * 0.47 + s.phase) * 0.012 - Math.abs(stroke) * 0.015;
  group.scale.setScalar(1 + h * 0.06);
}

/** A hat lifted a little, the way a hat is. */
function tipTheHat(group, t, s) {
  defaultMotion(group, t, s);
  const hat = part(group, 'hat');
  if (!hat) return;
  const h = ease(s.hover);
  if (hat.userData.y === undefined) hat.userData.y = hat.position.y;
  hat.position.y = hat.userData.y + h * 0.07 + Math.sin(t * 0.9 + s.phase) * 0.006;
  hat.rotation.z = h * 0.22;
}

/** The tassel swings from the button, a beat behind the head. */
function swingTheTassel(group, t, s) {
  defaultMotion(group, t, s);
  const tassel = part(group, 'tassel');
  if (!tassel) return;
  const h = ease(s.hover);
  tassel.rotation.z = Math.sin(t * 1.4 + s.phase - 0.7) * (0.12 + h * 0.4);
  tassel.rotation.x = Math.sin(t * 1.1 + s.phase - 0.4) * (0.08 + h * 0.2);
}

/**
 * The flap lifts and the letter rises out of it.
 *
 * Entirely hover-driven: an envelope that opens and closes by itself on a
 * contact panel is a distraction, and one that opens when you reach for it is
 * an answer.
 */
function openTheEnvelope(group, t, s) {
  defaultMotion(group, t, { ...s, hover: s.hover * 0.5 });
  const h = ease(s.hover);
  const flap = part(group, 'flap');
  const letter = part(group, 'letter');
  if (flap) flap.rotation.x = h * 2.5;
  if (letter) {
    if (letter.userData.y === undefined) letter.userData.y = letter.position.y;
    letter.position.y = letter.userData.y + h * 0.17;
    letter.position.z = 0.012 + h * 0.02;
  }
}

/**
 * A badge turning on its own axis.
 *
 * Further than the default, because a tile seen edge-on is the clearest signal
 * that it is a tile and not a picture of one — and because these four sit in a
 * list beside five flat brand images, where the difference is the point.
 */
function turnTheBadge(group, t, s) {
  const h = ease(s.hover);
  group.rotation.y = Math.sin(t * 0.5 + s.phase) * (0.32 + h * 0.75);
  group.rotation.x = Math.sin(t * 0.33 + s.phase) * 0.07 - h * 0.06;
  group.scale.setScalar(1 + h * 0.08);
}

/* -------------------------------------------------------------------------- */

/** Every sprite id this module can draw. Used by tools/check-icons3d.mjs. */
export const KNOWN = Object.keys(REGISTRY);

/** The row for an id, or null if the sprite has no model. */
export function entry(id) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, id) ? REGISTRY[id] : null;
}
