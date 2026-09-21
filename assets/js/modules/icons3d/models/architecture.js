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
 * architecture.js — the buildings, and the things that stand in a room.
 *
 * Every model here is a real solid seen from the front and slightly above, not
 * a silhouette with a thickness. The test each one had to pass: turn it forty
 * degrees and it should still be the thing it is. A building with a real roof
 * gains a gable when it turns; a building that is an extruded outline gains a
 * grey wall.
 *
 * Read `lib.js` first — it defines the unit box these are drawn in and the kit
 * (`k`) every builder is handed.
 */

/** A gable, a pediment, a sawtooth: a triangle standing in the xy plane. */
function gable(k, halfWidth, height, depth, material, at) {
  const s = new k.THREE.Shape();
  s.moveTo(-halfWidth, 0);
  s.lineTo(halfWidth, 0);
  s.lineTo(0, height);
  s.closePath();
  return k.slab(s, depth, material, at, [0, 0, 0], { bevel: 0.006 });
}

/* -------------------------------------------------------------------------- */

/**
 * fas-university — the neoclassical front: steps, columns, architrave, pediment.
 *
 * Five columns rather than four, because an odd number puts one on the centre
 * line and a classical front is symmetrical about a column or about a gap, and
 * about a column is the one that looks built. They are round and they stand
 * clear of the wall behind, so turning the icon opens real gaps between them —
 * which is the single thing that separates this from the flat glyph.
 */
export function university(k) {
  const stone = k.matte(k.c.pale);
  const shadow = k.matte(k.c.dark);
  const body = k.mat(k.c.base, { shine: 18 });

  const columns = k.repeat(5, (i) => {
    const x = -0.28 + (i * 0.56) / 4;
    return [
      k.tube(0.042, 0.3, body, [x, -0.14, 0.04], null, 12),
      k.box(0.11, 0.028, 0.11, stone, [x, 0.02, 0.04]),   // capital
      k.box(0.11, 0.028, 0.11, stone, [x, -0.3, 0.04]),   // base
    ];
  });

  return k.group(
    // Three steps, each a little narrower than the one below.
    k.box(0.92, 0.045, 0.42, stone, [0, -0.45, 0]),
    k.box(0.84, 0.042, 0.37, k.matte(k.c.lit), [0, -0.405, 0.01]),
    k.box(0.76, 0.04, 0.33, stone, [0, -0.365, 0.02]),
    // The wall behind the colonnade, dark so the columns read in front of it.
    k.box(0.62, 0.34, 0.16, shadow, [0, -0.15, -0.06]),
    columns,
    k.box(0.82, 0.055, 0.34, stone, [0, 0.062, 0.02]),    // architrave
    gable(k, 0.44, 0.2, 0.3, stone, [0, 0.09, -0.12]),
    // The pediment's tympanum, set back a hair so the raking cornice reads.
    gable(k, 0.36, 0.16, 0.02, k.matte(k.c.deep), [0, 0.098, 0.04]),
  );
}

/**
 * fad-building — the office block, and the one the Summary page puts in front
 * of "Department of Civil Engineering".
 *
 * A real block: two masses of different depths so the corner has something to
 * do, windows that are recessed panes rather than painted rectangles, a parapet
 * with a lip, and a doorway cut into the base. Glass is a separate, glossier
 * material, which is what makes the windows catch the key light a moment after
 * the wall does as it turns.
 */
export function building(k) {
  const wall = k.mat(k.c.base, { shine: 20 });
  const side = k.mat(k.c.dark, { shine: 20 });
  const pane = k.gloss(k.c.pale, { emissive: 0.18 });
  const trim = k.matte(k.c.deep);

  // Five floors of four windows, inset into the front face.
  const windows = k.repeat(5, (row) =>
    k.repeat(4, (col) =>
      k.box(0.075, 0.062, 0.02, pane, [
        -0.12 + col * 0.08,
        0.28 - row * 0.105,
        0.132,
      ])));

  return k.group(
    k.box(0.46, 0.92, 0.26, wall, [-0.06, 0.0, 0]),        // main mass
    k.box(0.22, 0.64, 0.3, side, [0.24, -0.14, 0.02]),     // lower wing
    windows,
    // The wing's windows run the other way, so the two masses do not read as
    // one grid that happens to step.
    k.repeat(4, (row) =>
      k.box(0.13, 0.05, 0.02, pane, [0.24, 0.08 - row * 0.11, 0.174])),
    k.box(0.5, 0.035, 0.3, trim, [-0.06, 0.468, 0]),       // parapet
    k.box(0.26, 0.032, 0.34, trim, [0.24, 0.185, 0.02]),
    k.box(0.1, 0.13, 0.02, trim, [-0.06, -0.4, 0.135]),    // doorway
    k.box(0.52, 0.03, 0.32, k.matte(k.c.deep), [0, -0.47, 0.01]),  // plinth
  );
}

/**
 * fad-home — the Office row in the contact card: a gabled house, seen head on.
 *
 * WHY THE ROOF IS A GABLE AND NOT A HIP
 * -------------------------------------
 * It was a hipped roof: two thin plates tilted about X, sloping front-to-back
 * from a ridge running left-to-right. That is a real roof and it is the wrong
 * roof HERE, because of the camera. This layer draws every icon with an
 * ORTHOGRAPHIC camera looking straight down −Z (see index.js): there is no
 * perspective and no three-quarter view, so a surface that slopes away from you
 * projects to a plain rectangle. The house came out as a pale box with a dark
 * rectangle laid on top of it — which is to say, as a cardboard carton with its
 * lid on, and that is exactly what it was reported as.
 *
 * A gable solves it by turning the roof ninety degrees: the ridge now runs
 * front-to-back, so the TRIANGLE is what faces the camera. A triangle on a
 * square is the oldest and most legible house there is, and it survives being
 * eighteen pixels wide, which none of the shading on a hip does.
 *
 * It is still a solid, not a flat shape. The gable is extruded the full depth
 * of the house with a small bevel on its edges, so turning the icon opens a
 * real ridge and a real eave, and the key light catches the chamfer along the
 * top. The hip looked more like a roof in a modelling program; the gable looks
 * more like a roof at the size anybody sees it.
 *
 * WHAT STICKS OUT
 * ---------------
 * The chimney, and it is deliberately off-centre. Every other silhouette in
 * this family is symmetrical about its own axis, and a house that is
 * symmetrical about its axis reads as a pentagon. One thing sticking out of one
 * side is what makes the shape a building rather than a geometric figure — the
 * same argument as the schoolhouse's flag, below.
 */
export function home(k) {
  const wall = k.matte(k.c.pale);
  const roof = k.mat(k.c.base, { shine: 26 });
  /* Glass, not a hole. `k.c.deep` came out very nearly black against the pale
     wall — correct arithmetic, wrong reading: three black rectangles on a pale
     front look like openings knocked through it, and on the dark scheme they
     close up against the page entirely. `ocean` is the palette's own blue,
     already pulled a third of the way toward the icon's colour, and glossy so
     the key light lands on it — which is what a window does and a hole does
     not. */
  const glass = k.gloss(k.c.ocean);

  /* The gable, extruded the full depth of the house and then some: the eaves
     overhang the walls by 0.055 on each side, which is the shadow line that
     stops the roof reading as a hat balanced on a box. */
  const gableRoof = gable(k, 0.335, 0.26, 0.44, roof, [0, -0.01, -0.22]);

  return k.group(
    // The body. Slightly wider than it is tall, so the gable has something
    // squat to sit on — a tall box under a triangle reads as a church.
    k.box(0.56, 0.42, 0.42, wall, [0, -0.22, 0]),
    gableRoof,
    // The chimney, on the right slope. Its foot is buried in the roof solid so
    // no gap opens between the two as the icon turns.
    k.box(0.062, 0.2, 0.062, k.matte(k.c.slate), [0.2, 0.1, 0]),
    // Door, centred, with the handle on the opening side.
    k.box(0.15, 0.22, 0.025, k.matte(k.c.slate), [0, -0.32, 0.213]),
    k.ball(0.015, k.gloss(k.c.gold), [0.048, -0.31, 0.229], 8),
    // Two windows, dark against the pale wall in both schemes. Glass rather
    // than matte, so they are the one thing on the front that catches the key.
    k.box(0.12, 0.11, 0.02, glass, [-0.17, -0.13, 0.213]),
    k.box(0.12, 0.11, 0.02, glass, [0.17, -0.13, 0.213]),
  );
}

export function school(k) {
  const wall = k.matte(k.c.pale);
  const roof = k.mat(k.c.base, { shine: 26 });

  return k.group(
    k.box(0.66, 0.38, 0.4, wall, [0, -0.24, 0]),
    k.box(0.72, 0.028, 0.46, roof, [0, -0.04, 0.12], [-0.42, 0, 0]),
    k.box(0.72, 0.028, 0.46, roof, [0, -0.04, -0.12], [0.42, 0, 0]),
    // The cupola: four posts, a little roof and the bell inside.
    k.box(0.16, 0.13, 0.16, k.matte(k.c.lit), [0, 0.11, 0]),
    k.repeat(2, (i) => k.box(0.018, 0.13, 0.018, k.matte(k.c.deep), [-0.06 + i * 0.12, 0.11, 0.07])),
    k.cone(0.14, 0.12, roof, [0, 0.24, 0], null, 4),
    k.lathe([[0, 0], [0.035, 0.005], [0.04, 0.03], [0.022, 0.06], [0.01, 0.075]],
      k.gloss(k.c.gold), [0, 0.07, 0], null, 12),
    // Flagpole and flag, offset so the silhouette is not symmetrical — a
    // schoolhouse read at eighteen pixels needs one thing sticking out of it.
    k.tube(0.008, 0.26, k.matte(k.c.deep), [0.3, 0.16, 0], null, 6),
    k.box(0.13, 0.08, 0.008, k.matte(k.c.base), [0.365, 0.25, 0]),
    k.box(0.2, 0.02, 0.02, k.matte(k.c.deep), [0, -0.08, 0.2]),
    k.box(0.14, 0.17, 0.02, k.matte(k.c.deep), [0, -0.345, 0.202]),
    k.repeat(2, (i) =>
      k.box(0.11, 0.1, 0.02, k.gloss(k.c.pale, { emissive: 0.2 }), [-0.21 + i * 0.42, -0.2, 0.202])),
  );
}

/** Shared by the two factories: a chimney with a lip. */
function stack(k, x, height, material) {
  return [
    k.tube(0.045, height, material, [x, 0.06 + height / 2 - 0.1, 0], null, 10),
    k.tube(0.056, 0.03, k.matte(k.c.deep), [x, 0.06 + height - 0.1, 0], null, 10),
  ];
}

/**
 * The smoke coming out of a chimney.
 *
 * A pool of puffs, built once and re-used for ever: each one rises, swells,
 * thins and is put back at the chimney mouth to do it again. No particles are
 * created or destroyed while the page is open, which is the whole reason it is
 * a pool — allocating a mesh a second on an icon would hand the garbage
 * collector something to do sixty times a minute for nothing.
 *
 * `smoke()` only builds and places them. Where they go is `puffAway` in
 * registry.js, which also decides when each one has gone far enough to be
 * invisible — the puffs are meant to leave the icon's box entirely, and they
 * FADE OUT BEFORE THEY REACH THE EDGE OF THE FRAME rather than being clipped by
 * it. A puff cut off square is a bug; a puff that thins into nothing is smoke.
 *
 * @param {object} k
 * @param {number} x      the chimney's x
 * @param {number} mouth  the y of the chimney's lip, where a puff starts
 * @param {number} count  how many puffs share the column
 */
function smoke(k, x, mouth, count = 5) {
  /* Nearly white and lit from inside, so it reads against a tinted tile in
     either theme without taking the icon's own colour — smoke that is cyan on a
     cyan page is not smoke. Low opacity, and `depthWrite` off so the puffs pass
     through each other instead of cutting rings out of one another. */
  const puffs = k.repeat(count, (i) => {
    const material = k.mat(k.shade(k.c.pale, 0.2, 0.3), {
      shine: 3, specular: 0.02, emissive: 0.6, opacity: 0.75, flat: true,
    });
    material.depthWrite = false;

    const puff = k.ball(0.095, material, [x, mouth, 0], 9);
    /* Per-puff drift and period. The x drift is what makes the column lean and
       break up rather than rise like a chimney of beads; `seed` shifts each
       one's start so the five are spread along the column from the first frame
       rather than all setting off together. */
    puff.userData.puff = {
      x,
      mouth,
      seed: i / count,
      rate: 0.34 + (i % 3) * 0.035,
      drift: 0.18 + (i % 4) * 0.085,
      lean: i % 2 ? 1 : -1,
    };
    puff.name = 'puff';
    return puff;
  });

  const column = k.group(puffs);
  column.name = 'smoke';
  return column;
}

/**
 * fad-industry — the sawtooth factory, working.
 *
 * The roof is the point of this one. Three north-light sawteeth, each a solid
 * wedge with a glazed face, so the icon turns into a recognisable roofline
 * rather than into a rectangle.
 *
 * AND IT SMOKES. Two chimneys rather than one, each with a column of puffs that
 * rises, leans, swells and thins away — out of the tinted tile the icon sits in
 * and over the card behind it. That is what `bleed` in the registry buys: the
 * canvas under this icon is wider than the icon, so the smoke has somewhere to
 * go. A factory whose smoke stops at the edge of its own box is a drawing of a
 * factory.
 *
 * The plant itself is fitted as if the smoke were not there — `fitTo` — so it
 * comes out the same size as the other five icons on the row whatever the
 * smoke happens to be doing.
 */
export function industry(k) {
  const wall = k.mat(k.c.base, { shine: 18 });
  const glassFace = k.gloss(k.c.pale, { emissive: 0.22 });

  const teeth = k.repeat(3, (i) => {
    const x = -0.22 + i * 0.22;
    return [
      gable(k, 0.11, 0.15, 0.36, k.matte(k.c.lit), [x, 0.04, -0.18]),
      k.box(0.12, 0.15, 0.015, glassFace, [x + 0.055, 0.115, 0.185], [0, 0, -0.62]),
    ];
  });

  /* The second chimney is shorter and set in from the first, so the two columns
     of smoke start at different heights and never rise as one band. */
  const tall = 0.42;
  const short = 0.3;

  const plant = k.group(
    k.box(0.72, 0.42, 0.36, wall, [0, -0.17, 0]),
    teeth,
    stack(k, -0.4, tall, k.matte(k.c.dark)),
    stack(k, -0.25, short, k.matte(k.c.deep)),
    k.box(0.76, 0.03, 0.4, k.matte(k.c.deep), [0, -0.39, 0]),
    k.repeat(3, (i) =>
      k.box(0.11, 0.1, 0.02, glassFace, [-0.22 + i * 0.22, -0.16, 0.185])),
  );
  plant.name = 'plant';

  const model = k.group(
    plant,
    smoke(k, -0.4, 0.06 + tall - 0.08, 5),
    smoke(k, -0.25, 0.06 + short - 0.08, 4),
  );
  model.userData.fitTo = plant;
  return model;
}

/**
 * fad-industry-alt — the same trade, a different plant: two tall stacks over a
 * stepped block. Deliberately a different silhouette from `industry`, because
 * the two appear on the same page and two icons that differ only in a detail
 * are one icon used twice.
 */
export function industryAlt(k) {
  const wall = k.mat(k.c.base, { shine: 18 });
  const pane = k.gloss(k.c.pale, { emissive: 0.22 });

  return k.group(
    k.box(0.44, 0.3, 0.34, wall, [-0.2, -0.28, 0]),
    k.box(0.36, 0.46, 0.3, k.mat(k.c.dark, { shine: 18 }), [0.22, -0.2, -0.02]),
    stack(k, -0.3, 0.52, k.matte(k.c.dark)),
    stack(k, -0.1, 0.4, k.matte(k.c.lit)),
    k.box(0.48, 0.028, 0.38, k.matte(k.c.deep), [-0.2, -0.125, 0]),
    k.box(0.4, 0.028, 0.34, k.matte(k.c.deep), [0.22, 0.045, -0.02]),
    k.repeat(2, (i) => k.box(0.12, 0.09, 0.02, pane, [-0.3 + i * 0.2, -0.28, 0.175])),
    k.repeat(3, (i) => k.box(0.1, 0.08, 0.02, pane, [0.22, -0.02 - i * 0.12, 0.155])),
    k.box(0.9, 0.03, 0.42, k.matte(k.c.deep), [0, -0.44, 0]),
  );
}

/**
 * fad-map-marker-alt — the pin.
 *
 * A lathe, not an extrusion: the profile is spun about the vertical axis, so
 * the pin is a solid of revolution that tapers to a real point and domes at the
 * top. The hole is a ring sunk into the face rather than a hole cut through,
 * which costs no CSG and reads the same at this size.
 */
export function mapMarker(k) {
  const shell = k.mat(k.c.base, { shine: 46 });

  return k.group(
    k.lathe([
      [0, -0.46], [0.07, -0.34], [0.16, -0.2], [0.24, -0.04],
      [0.27, 0.1], [0.24, 0.24], [0.16, 0.34], [0.08, 0.385], [0, 0.4],
    ], shell, [0, 0, 0], null, 22),
    // The eye. Set slightly forward of the surface it sits in, so the key light
    // catches its inner wall and it reads as a recess.
    k.ring(0.085, 0.028, k.matte(k.c.deep), [0, 0.08, 0.175], [0, 0, 0], 20),
    k.disc(0.075, k.matte(k.c.deep), [0, 0.08, 0.17]),
    // The shadow it casts on the ground, as a real object rather than a blur:
    // a flat disc under the tip, which also stops the pin floating.
    k.disc(0.13, k.matte(k.c.deep, { opacity: 0.45 }), [0, -0.475, 0], [-Math.PI / 2, 0, 0]),
  );
}

/**
 * fad-mailbox — the American rural mailbox: a half-cylinder on a post, with the
 * flag up.
 *
 * The body is a half-cylinder rather than a rounded box, so the icon has one
 * genuinely curved surface to run the highlight along as it turns.
 */
export function mailbox(k) {
  const body = k.mat(k.c.base, { shine: 40 });

  return k.group(
    // Laid on its side: a cylinder rotated onto the z axis, with a flat floor
    // under it so it is a tube with a bottom rather than a pipe.
    k.tube(0.19, 0.42, body, [0, 0.12, 0], [Math.PI / 2, 0, 0], 20),
    k.box(0.38, 0.02, 0.42, k.matte(k.c.deep), [0, -0.065, 0]),
    // The door at the front, a shade darker and very slightly proud.
    k.disc(0.175, k.matte(k.c.dark), [0, 0.12, 0.215]),
    k.ring(0.175, 0.016, k.matte(k.c.deep), [0, 0.12, 0.212], [0, 0, 0], 20),
    k.box(0.05, 0.016, 0.02, k.gloss(k.c.gold), [0, 0.02, 0.228]),
    // The flag, up. Up is the interesting state and the one that reads.
    k.box(0.018, 0.18, 0.018, k.matte(k.c.deep), [0.2, 0.2, -0.1]),
    k.box(0.07, 0.09, 0.012, k.mat(k.c.gold, { shine: 30 }), [0.235, 0.26, -0.1]),
    // Post.
    k.box(0.08, 0.42, 0.08, k.matte(k.c.wood), [0, -0.28, 0]),
    k.box(0.26, 0.03, 0.26, k.matte(k.c.deep), [0, -0.485, 0]),
  );
}

/**
 * fad-fax — a desktop machine with a sheet coming out of it.
 *
 * The sheet is the moving part: it feeds up out of the slot and curls over. It
 * is also what makes the object a fax rather than a box with buttons.
 */
export function fax(k) {
  const shell = k.mat(k.c.pale, { shine: 34 });
  const dark = k.matte(k.c.deep);

  return k.group(
    k.box(0.66, 0.3, 0.42, shell, [0, -0.25, 0]),
    k.box(0.6, 0.12, 0.36, k.mat(k.c.base, { shine: 30 }), [0, -0.03, -0.02], [-0.22, 0, 0]),
    k.box(0.44, 0.02, 0.06, dark, [0, 0.03, 0.06]),                 // paper slot
    // Handset resting on the left.
    k.box(0.18, 0.06, 0.1, k.mat(k.c.dark, { shine: 40 }), [-0.22, -0.06, 0.14]),
    // Keypad.
    k.repeat(3, (row) =>
      k.repeat(3, (col) =>
        k.box(0.045, 0.032, 0.016, dark, [-0.03 + col * 0.06, -0.17 - row * 0.05, 0.212]))),
    k.box(0.16, 0.06, 0.016, k.gloss(k.c.pale, { emissive: 0.3 }), [0.21, -0.16, 0.212]),
    // The page, named so the pose function can find it and feed it.
    Object.assign(
      k.box(0.4, 0.3, 0.008, k.matte(k.c.paper), [0, 0.22, 0.02], [-0.16, 0, 0]),
      { name: 'sheet' },
    ),
    k.repeat(3, (i) =>
      k.box(0.24, 0.012, 0.004, k.matte(k.c.deep), [0, 0.3 - i * 0.06, 0.03])),
  );
}

/**
 * fad-phone — the handset.
 *
 * Earpiece, mouthpiece and the bar between them, tipped so the icon is read
 * three-quarters on. Built from two lathed cups and a curved bar rather than
 * from the flat glyph's outline, because the flat glyph's outline is the
 * silhouette of exactly this object seen from one angle.
 */
export function phone(k) {
  const shell = k.mat(k.c.base, { shine: 60 });
  const cup = [[0, 0], [0.11, 0.005], [0.125, 0.04], [0.115, 0.08], [0.06, 0.095], [0, 0.098]];

  const handset = k.group(
    k.lathe(cup, shell, [-0.2, 0.2, 0], [0, 0, 2.5], 16),
    k.lathe(cup, shell, [0.2, -0.2, 0], [0, 0, -0.64], 16),
    k.capsule(0.055, 0.42, shell, [0, 0, 0], [0, 0, Math.PI / 4]),
    k.disc(0.09, k.matte(k.c.deep), [-0.225, 0.225, 0.02], [0, 0, 0]),
    k.disc(0.075, k.matte(k.c.deep), [0.225, -0.225, 0.02], [0, 0, 0]),
  );
  handset.rotation.z = -0.1;
  return k.group(handset);
}

/** Shared by both microphone icons. */
function micStand(k, solid) {
  const metal = solid ? k.gloss(k.c.base) : k.gloss(k.c.pale);
  const head = k.mat(k.c.dark, { shine: 70 });

  return k.group(
    // The capsule: a ball with three grille rings round it, which is what makes
    // it a microphone rather than a lollipop.
    k.ball(0.15, head, [0, 0.27, 0], 20),
    k.repeat(3, (i) =>
      k.ring(0.148 - i * 0.008, 0.008, k.matte(k.c.deep), [0, 0.32 - i * 0.05, 0], [0.1, 0, 0], 18)),
    k.tube(0.035, 0.08, metal, [0, 0.13, 0], null, 12),   // collar
    k.tube(0.022, 0.42, metal, [0, -0.12, 0], null, 12),  // pole
    k.lathe([[0, 0], [0.2, 0], [0.22, 0.02], [0.2, 0.035], [0.05, 0.04], [0, 0.04]],
      k.matte(k.c.deep), [0, -0.36, 0], null, 22),        // weighted base
  );
}

/** fad-microphone-stand — the lecture microphone. */
export function microphoneStand(k) { return micStand(k, false); }

/** fas-microphone-stand — the solid weight of the same object. */
export function microphoneStandSolid(k) { return micStand(k, true); }

/** Shared by both chalkboard icons: the board, its frame, its legs and a tray. */
function board(k, frame) {
  return k.group(
    k.box(0.58, 0.42, 0.03, k.matte(k.c.slate), [-0.1, 0.16, -0.08]),
    k.box(0.62, 0.46, 0.02, k.matte(frame), [-0.1, 0.16, -0.1]),
    k.box(0.6, 0.03, 0.06, k.matte(k.c.wood), [-0.1, -0.07, -0.05]),   // chalk tray
    k.box(0.05, 0.014, 0.014, k.matte(k.c.paper), [-0.28, -0.048, -0.03]),
    k.box(0.024, 0.34, 0.024, k.matte(k.c.wood), [-0.36, -0.26, -0.02], [0, 0, 0.16]),
    k.box(0.024, 0.34, 0.024, k.matte(k.c.wood), [0.16, -0.26, -0.02], [0, 0, -0.16]),
    // Three chalk strokes, raised off the slate so they catch the light.
    k.repeat(3, (i) =>
      k.box(0.3 - i * 0.07, 0.016, 0.006, k.matte(k.c.paper), [-0.16 + i * 0.03, 0.28 - i * 0.09, -0.06])),
  );
}

/** A small standing figure — the teacher, and the reader in `bookReader`. */
export function figurine(k, scale = 1, material) {
  const skin = material || k.mat(k.c.skin, { shine: 24 });
  const cloth = k.mat(k.c.base, { shine: 20 });
  const g = k.group(
    k.ball(0.085, skin, [0, 0.21, 0], 16),
    k.capsule(0.075, 0.16, cloth, [0, 0.01, 0]),
    k.capsule(0.03, 0.14, cloth, [-0.1, 0.02, 0.01], [0, 0, 0.5]),
    k.capsule(0.03, 0.14, cloth, [0.1, 0.02, 0.01], [0, 0, -0.5]),
    k.capsule(0.035, 0.14, k.mat(k.c.deep, { shine: 16 }), [-0.045, -0.2, 0]),
    k.capsule(0.035, 0.14, k.mat(k.c.deep, { shine: 16 }), [0.045, -0.2, 0]),
  );
  g.scale.setScalar(scale);
  return g;
}

/**
 * fad-chalkboard-teacher / fas-chalkboard-teacher — the board, and someone at it.
 *
 * The two differ the way the flat duotone and solid faces differ: the duotone
 * has a wooden frame and a lighter figure, the solid is all one weight of the
 * icon's own colour. Same scene, same geometry, one palette apart.
 */
function chalkboardScene(k, solid) {
  const person = figurine(k, 0.86, solid ? k.mat(k.c.base, { shine: 24 }) : null);
  person.position.set(0.3, -0.12, 0.16);
  person.name = 'figure';
  return k.group(board(k, solid ? k.c.base : k.c.wood), person);
}

export function chalkboardTeacher(k) { return chalkboardScene(k, false); }
export function chalkboardTeacherSolid(k) { return chalkboardScene(k, true); }
