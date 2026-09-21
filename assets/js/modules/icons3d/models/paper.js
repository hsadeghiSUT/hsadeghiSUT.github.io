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
 * paper.js — books, documents, calendars and the things you write with.
 *
 * The family that carries most of this site: every section heading on
 * Publications, the topic line under every student on Research Team, the
 * Publications card on the Summary page.
 *
 * One idea runs through all of it. **Paper is a separate material from the
 * thing that holds it.** A book is boards and a block of leaves, not a
 * book-shaped solid; a file is a sheet with a corner genuinely turned over, not
 * a rectangle with a triangle drawn in it. That separation is what survives
 * being turned, and being turned is the whole point.
 */

/* -------------------------------------------------------------------------- */
/* Books                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A closed book: two boards, a spine and the leaves between them.
 *
 * The boards overhang the leaves on three sides — the square, in binding terms
 * — which is the detail that makes it read as a bound book rather than as a
 * striped block. It is also what catches the light along the fore-edge.
 */
function closedBook(k, opts = {}) {
  const cover = k.mat(opts.cover || k.c.base, { shine: 30 });
  const spine = k.mat(opts.spine || k.c.dark, { shine: 30 });
  const leaves = k.matte(k.c.paper);

  return k.group(
    k.box(0.48, 0.62, 0.035, cover, [0, 0, 0.075]),        // front board
    k.box(0.48, 0.62, 0.035, cover, [0, 0, -0.075]),       // back board
    k.box(0.04, 0.62, 0.19, spine, [-0.24, 0, 0]),         // spine
    k.box(0.44, 0.58, 0.115, leaves, [0.015, 0, 0]),       // the leaves
    // Four ruled lines across the fore-edge: the visible page edges. Thin boxes
    // rather than a texture, so they are still there when the book turns.
    k.repeat(4, (i) =>
      k.box(0.44, 0.004, 0.118, k.matte(k.c.pale), [0.015, 0.2 - i * 0.13, 0])),
    // A title block debossed into the front board.
    k.box(0.26, 0.018, 0.008, k.matte(opts.title || k.c.pale), [0.03, 0.17, 0.094]),
    k.box(0.18, 0.014, 0.008, k.matte(opts.title || k.c.pale), [-0.01, 0.13, 0.094]),
  );
}

/** fad-book — the closed book, tipped so both the board and the spine show. */
export function book(k) {
  const g = closedBook(k);
  g.rotation.set(0.06, -0.38, 0.02);
  return k.group(g);
}

/** fad-book-alt — the same book with a ribbon marker out of the bottom. */
export function bookAlt(k) {
  const g = closedBook(k, { cover: k.c.dark, spine: k.c.deep, title: k.c.gold });
  g.rotation.set(0.06, -0.34, 0.02);
  const ribbon = k.group(
    k.box(0.05, 0.3, 0.01, k.mat(k.c.gold, { shine: 40 }), [0.1, -0.42, 0.0]),
    k.box(0.05, 0.06, 0.01, k.mat(k.c.gold, { shine: 40 }), [0.1, -0.58, 0.02], [0.5, 0, 0]),
  );
  ribbon.name = 'ribbon';
  return k.group(g, ribbon);
}

/**
 * The angle each half rests at, away from flat.
 *
 * Exported so `readAloud` swings between the same numbers the model was built
 * with instead of repeating them — they drifted apart once already.
 */
export const OPEN_REST = 0.34;

/**
 * An open book: two leaf blocks meeting at the gutter, with the boards under
 * them.
 *
 * The leaves are wedges — thicker at the fore-edge than at the gutter — because
 * that is what a stack of pages held open actually is, and it gives the two
 * halves an outside edge to catch light on.
 *
 * Returned as a group whose two halves are named, so the pose function can open
 * and close it.
 *
 * WHICH WAY THE COVERS FOLD
 * -------------------------
 * `opts.fold` decides, and it matters more than it sounds like it should.
 *
 *   'down' (the default)  the fore-edges sit BELOW the gutter, so the two
 *                         halves make a shallow tent and the boards are what
 *                         you see. That is a book lying open on a table,
 *                         photographed from underneath — which is exactly the
 *                         reading `fad-book-open` wants, tipped away from the
 *                         camera as it is.
 *
 *   'up'                  the fore-edges rise above the gutter, so the halves
 *                         make a valley and the page faces turn toward each
 *                         other. That is a book being HELD, and it is the only
 *                         direction that works for one that shuts: the covers
 *                         have to travel toward whoever is reading it.
 *
 * `fad-book-reader` was built on the default and it was wrong — its covers
 * swung down and away from the reader's face, which is a paperback being bent
 * backwards rather than a book being closed. It asks for 'up' now, and
 * `readAloud` in registry.js swings it the matching way. Nothing else calls
 * this with an argument, so `fad-book-open` is exactly as it was.
 */
function openBook(k, opts = {}) {
  /* +1 puts the fore-edges below the gutter, −1 above. It multiplies both the
     resting angle here and, through the model that asked for it, the sign the
     motion function uses — so there is one decision rather than two that have
     to agree. */
  const fold = opts.fold === 'up' ? -1 : 1;

  const board = k.mat(k.c.base, { shine: 30 });
  const leaves = k.matte(k.c.paper);
  const rule = k.matte(k.c.pale);

  const half = (sign) => {
    const g = k.group(
      k.box(0.42, 0.02, 0.44, board, [sign * 0.22, -0.035, 0]),
      k.box(0.4, 0.022, 0.4, leaves, [sign * 0.21, -0.012, 0]),
      k.box(0.38, 0.014, 0.36, leaves, [sign * 0.2, 0.008, 0]),
      // Lines of text, running across the page rather than along it.
      k.repeat(4, (i) =>
        k.box(0.26, 0.004, 0.012, rule, [sign * 0.2, 0.017, -0.12 + i * 0.08])),
    );
    g.name = sign < 0 ? 'left' : 'right';
    return g;
  };

  const left = half(-1);
  const right = half(1);
  left.rotation.z = fold * OPEN_REST;
  right.rotation.z = -fold * OPEN_REST;

  /* The spine is optional, and `bookReader` turns it off.

     It is right for a book lying open on a table, where you see the spine
     pressed flat underneath. It is wrong for one held up and read: the spine
     then faces AWAY from you, behind the pages. Left on, with the book tipped
     toward the camera, its near end drops below the covers and prints as a
     black wedge under the middle of the book — which at icon size read as a
     stand, or a stick the book had been mounted on. */
  const g = k.group(
    left,
    right,
    opts.spine === false
      ? null
      : k.box(0.05, 0.05, 0.46, k.mat(k.c.dark, { shine: 26 }), [0, -0.06, 0]),
  );
  g.rotation.x = -0.95;      // laid open and seen from above-front
  g.position.y = 0.06;
  return g;
}

/** fad-book-open — the book, open. Unchanged: it folds the default way. */
export function bookOpen(k) { return k.group(openBook(k)); }

/**
 * fad-book-reader — someone reading, and turning the book as they go.
 *
 * The figure sits behind and above the book, the way a reader does, rather than
 * beside it. Which means the book overlaps the figure — and an overlap between
 * two solids is a depth cue that a flat icon has to draw and this one just has.
 *
 * THE BOOK OPENS AND SHUTS, CONTINUOUSLY, and the arms go with it. This is the
 * Research Team card on the Summary page: the largest icon on the site, on the
 * row a visitor looks straight at, and the one place in the set where a model
 * standing still would be a worse answer than the flat glyph it replaced.
 * `readAloud` in registry.js drives all of it off one number.
 */
export function bookReader(k) {
  /* Head and shoulders, and nothing below them.

     The first version had a torso with two arms hanging over the book, and at
     the size this is actually drawn they read as LEGS — a figure sitting astride
     an open book. Which is what they are, geometrically: two limbs coming out
     of a body and hanging down over something. Nothing about the modelling was
     wrong; the reading was.

     Every reference for this icon does the same thing instead, and not one of
     them draws an arm: a head, a pair of shoulders, a book held up across the
     chest, and two small hands on its outer edges. The limbs are implied by
     where the hands are and the eye completes them, which is both more legible
     at eighteen pixels and less to get wrong.

     The fit in index.js scales a model by its LONGEST side, so every bit of
     height that is not doing anything comes straight off the width — and a
     tall, thin composition in a square tile reads as a small icon however
     correctly it is fitted. Hence chest-up, and no further. */
  const person = figure(k, 1.4);
  person.position.set(0, 0.17, -0.3);
  person.name = 'figure';

  /* THE BOOK IS TURNED MUCH MORE TOWARD THE VIEWER than `bookOpen` presents
     it. That one is a book on a table, seen from above-front, and the pages are
     foreshortened almost to nothing; this one is being held up and read, and the
     pale pages are the only part of the icon that says "book" at thirty pixels.
     Face-on they are two bright wedges either side of the gutter, and the
     covers swinging shut over them is the motion this icon is for. See
     `readAloud` in registry.js. */
  /* 'up', so the covers close TOWARD the figure's face rather than away from
     it — see `openBook` and `readAloud`. The head sits at y = +0.2 and the book
     at y = −0.2, so "toward the face" is upward, and this is the sign that
     decides whether this icon reads as a book being read or as one being bent
     the wrong way over someone's knee. */
  const b = openBook(k, { fold: 'up', spine: false });
  b.scale.setScalar(1.3);
  /* HIGH ENOUGH TO OVERLAP THE CHEST. It used to sit at -0.2, clear of the body,
     with a gap between the two that the arms bridged; with the arms gone that
     gap read as a book floating below a bust. Held up against the chest, the way
     all three references hold it, the overlap does the job the arms were doing —
     it is what says the figure is holding the book. */
  b.position.set(0, -0.06, 0.24);
  /* POSITIVE, where `openBook` itself uses a negative angle, and the sign is
     the whole difference between a book and a dark chevron. A rotation of +θ
     about x takes the page normal (0, 1, 0) to (0, cos θ, sin θ) — toward the
     camera. Negative takes it away, which shows the boards from underneath:
     correct for a book lying open on a table, which is what `bookOpen` is, and
     wrong for one held up and read, which is what this is. The pale pages are
     the only part of this icon that says "book" at thirty pixels. */
  b.rotation.x = 0.5;
  b.name = 'book';

  /* The hands, PARENTED TO THE COVERS.

     Each is a child of the half it holds, so it rides that cover wherever the
     cover goes. That is the whole reason the old arms needed the motion
     function's help and these do not: `readAloud` turns the covers, and the
     hands come along because they are part of them. A hand can no longer drift
     off the edge of the page it is meant to be gripping, because there is no
     second copy of the angle left to disagree with the first.

     Flattened spheres rather than blocks. A hand at this size is a shape, not a
     hand, and the shape that reads is the soft vertical oval every one of the
     references uses — elongated along the page's own long axis, which in the
     half's local space is Z. */
  const skin = k.mat(k.c.skin, { shine: 22 });
  for (const side of ['left', 'right']) {
    const sign = side === 'left' ? -1 : 1;
    let half = null;
    b.traverse((node) => { if (!half && node.name === side) half = node; });
    if (!half) continue;
    /* x: just inside the board's outer edge at 0.43, so the fingers overlap the
       cover instead of floating past it. y: proud of the page surface. */
    const hand = k.ball(0.085, skin, [sign * 0.395, 0.035, 0.02], 14);
    hand.scale.set(0.66, 0.5, 1.25);
    hand.name = side === 'left' ? 'handL' : 'handR';
    half.add(hand);
  }

  return k.group(person, b);
}

/**
 * A reader: a head and a pair of shoulders, and nothing else.
 *
 * NO ARMS, and no torso to hang them from. They were part of this once, welded
 * in at a fixed angle; then `bookReader` built its own so they could swing with
 * the covers; now there are none, because at the size this is drawn an arm over
 * a book is a leg over a book. `bookReader` puts hands on the cover edges
 * instead and lets the eye supply the rest.
 *
 * WIDE AND LOW, which is the other half of the same correction. The old profile
 * was a dome 0.24 across and 0.31 tall — taller than it was wide on each side of
 * the axis, so it came out as a rounded blob under a ball and the pair read as a
 * skittle rather than as a person. Shoulders are wider than they are tall. This
 * profile is 0.34 across and 0.26 up, and the difference between the two is the
 * difference between a bowling pin and somebody sitting at a desk.
 */
function figure(k, scale = 1) {
  const cloth = k.mat(k.c.base, { shine: 20 });
  const skin = k.mat(k.c.skin, { shine: 24 });
  const g = k.group(
    k.ball(0.15, skin, [0, 0.21, 0], 18),
    // A collar, so the head meets the shoulders at a neck rather than sinking
    // into them. Two solids that merely intersect read as one lumpy solid.
    k.lathe([[0, 0], [0.075, 0.01], [0.08, 0.05], [0.07, 0.07]],
      k.mat(k.c.dark, { shine: 20 }), [0, 0.05, 0], null, 14),
    k.lathe([[0, 0], [0.22, 0.015], [0.31, 0.07], [0.34, 0.14], [0.3, 0.21], [0.16, 0.25], [0, 0.26]],
      cloth, [0, -0.16, 0], null, 20),
  );
  g.scale.setScalar(scale);
  return g;
}

/**
 * fad-books — three volumes on a shelf, the last one leaning.
 *
 * The lean is doing real work: three uprights of different heights still read
 * as a bar chart, and one book at an angle makes the group unmistakably a
 * shelf. It is also the part that moves.
 */
export function books(k) {
  const spineOf = (colour, w, h, x, tilt) => {
    const g = k.group(
      k.box(w, h, 0.34, k.mat(colour, { shine: 30 }), [0, 0, 0]),
      k.box(w * 0.55, h * 0.94, 0.35, k.matte(k.c.paper), [w * 0.3, 0, 0]),
      k.box(w * 0.7, 0.016, 0.352, k.matte(k.c.pale), [-w * 0.1, h * 0.28, 0]),
      k.box(w * 0.7, 0.016, 0.352, k.matte(k.c.pale), [-w * 0.1, -h * 0.3, 0]),
    );
    g.position.set(x, 0, 0);
    g.rotation.z = tilt;
    return g;
  };

  const leaning = spineOf(k.c.lit, 0.15, 0.6, 0.27, -0.33);
  leaning.position.y = -0.03;
  leaning.name = 'leaning';

  return k.group(
    k.box(0.9, 0.035, 0.4, k.matte(k.c.deep), [0, -0.38, 0]),   // shelf
    spineOf(k.c.base, 0.16, 0.66, -0.26, 0),
    spineOf(k.c.dark, 0.14, 0.58, -0.06, 0),
    leaning,
  );
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A sheet of paper with the top-right corner genuinely turned over.
 *
 * The corner is a separate triangle lying at an angle above the sheet, and the
 * sheet has that corner cut out of its outline. So the fold has an underside,
 * casts its own shading, and opens as the icon turns — which is the difference
 * between a folded page and a page with a triangle printed on it.
 */
function sheet(k, opts = {}) {
  const w = 0.5;
  const h = 0.68;
  const fold = 0.17;
  const paper = k.matte(opts.paper || k.c.paper);

  const s = new k.THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2 - fold);
  s.lineTo(w / 2 - fold, h / 2);
  s.lineTo(-w / 2, h / 2);
  s.closePath();

  const corner = new k.THREE.Shape();
  corner.moveTo(0, 0);
  corner.lineTo(fold, 0);
  corner.lineTo(0, -fold);
  corner.closePath();

  const lines = k.repeat(opts.lines || 4, (i) =>
    k.box(0.3 - (i % 2) * 0.06, 0.02, 0.008, k.matte(opts.ink || k.c.base),
      [-0.02, 0.1 - i * 0.1, 0.022]));

  return k.group(
    k.slab(s, 0.03, paper, [0, 0, 0], null, { bevel: 0.004 }),
    // The turned corner, hinged along the diagonal and lifted off the sheet.
    k.slab(corner, 0.02, k.matte(k.c.pale), [w / 2 - fold, h / 2, 0.02], [0, 0, 0],
      { bevel: 0.003 }),
    lines,
  );
}

/** fad-file-alt — a document. */
export function fileAlt(k) {
  const g = k.group(sheet(k));
  g.rotation.set(0.04, -0.2, 0);
  return g;
}

/**
 * far-file-alt — the same document in the regular weight.
 *
 * In the flat set "regular" is an outline, and an outline has no 3D meaning: a
 * hollow page is a page with a hole in it. What it becomes here is a page with
 * a raised border and nothing printed on it — thinner, emptier, lighter, which
 * is what the regular weight is for on a page that already has the duotone one.
 */
export function fileAltRegular(k) {
  const g = k.group(
    sheet(k, { paper: k.c.pale, lines: 3 }),
    k.box(0.5, 0.012, 0.04, k.mat(k.c.base, { shine: 40 }), [0, -0.335, 0]),
    k.box(0.012, 0.68, 0.04, k.mat(k.c.base, { shine: 40 }), [-0.244, 0, 0]),
  );
  g.rotation.set(0.04, -0.16, 0);
  return g;
}

/**
 * A magnifier: a real lens in a real rim with a handle.
 *
 * Glass, not a hole. The lens is a transparent disc slightly proud of its rim,
 * which means what is behind it shows through tinted and a specular highlight
 * runs across it as the icon turns. The flat icon's empty circle cannot do
 * either, and they are the two things that say "lens".
 */
export function magnifier(k, scale = 1) {
  const metal = k.gloss(k.c.base);
  const g = k.group(
    k.ring(0.24, 0.035, metal, [0, 0.08, 0], [0, 0, 0], 26),
    k.disc(0.235, k.glass(k.c.pale, 0.34), [0, 0.08, 0.005]),
    k.disc(0.235, k.glass(k.c.pale, 0.2), [0, 0.08, -0.005], [0, Math.PI, 0]),
    // The handle, running down and to the right on the usual diagonal.
    k.capsule(0.043, 0.24, k.mat(k.c.dark, { shine: 60 }), [0.22, -0.23, 0], [0, 0, -0.78]),
    k.tube(0.05, 0.06, metal, [0.15, -0.12, 0], [0, 0, -0.78], 12),
  );
  g.scale.setScalar(scale);
  return g;
}

/** fad-search — the magnifier on its own. */
export function search(k) {
  const g = magnifier(k);
  g.rotation.set(0.05, -0.12, 0);
  return k.group(g);
}

/** fad-file-search — a document being read closely. */
export function fileSearch(k) {
  const doc = k.group(sheet(k, { lines: 3 }));
  doc.scale.setScalar(0.86);
  doc.position.set(-0.08, 0.06, 0);
  doc.rotation.set(0.04, -0.14, 0);

  const lens = magnifier(k, 0.72);
  lens.position.set(0.17, -0.13, 0.22);
  lens.name = 'lens';

  return k.group(doc, lens);
}

/** fad-print-search — a printer, its page, and a lens over the page. */
export function printSearch(k) {
  const shell = k.mat(k.c.pale, { shine: 34 });

  const printer = k.group(
    k.box(0.62, 0.26, 0.4, shell, [0, -0.26, 0]),
    k.box(0.5, 0.06, 0.34, k.mat(k.c.base, { shine: 30 }), [0, -0.09, -0.02]),
    k.box(0.44, 0.02, 0.06, k.matte(k.c.deep), [0, -0.04, 0.08]),
    k.box(0.12, 0.05, 0.016, k.gloss(k.c.pale, { emissive: 0.3 }), [-0.2, -0.22, 0.205]),
    k.repeat(3, (i) => k.box(0.03, 0.03, 0.016, k.matte(k.c.deep), [0.04 + i * 0.05, -0.22, 0.205])),
  );

  const page = k.group(
    k.box(0.38, 0.4, 0.008, k.matte(k.c.paper), [0, 0.2, 0.0], [-0.14, 0, 0]),
    k.repeat(3, (i) => k.box(0.22, 0.014, 0.004, k.matte(k.c.base), [0, 0.3 - i * 0.07, 0.014])),
  );
  page.name = 'sheet';

  const lens = magnifier(k, 0.6);
  lens.position.set(0.22, 0.2, 0.26);
  lens.name = 'lens';

  return k.group(printer, page, lens);
}

/**
 * fad-calendar-alt — a wall calendar: a block with a coloured header, two rings
 * through the top and a grid of days sunk into the face.
 *
 * The rings are what make it a calendar rather than a card; they are also real
 * torus loops that pass behind the header and come out in front of it, which is
 * a thing the flat glyph draws as two notches.
 */
export function calendar(k) {
  const bodyMat = k.matte(k.c.paper);
  const header = k.mat(k.c.base, { shine: 26 });
  const dayMat = k.matte(k.c.pale);

  const days = k.repeat(3, (row) =>
    k.repeat(4, (col) =>
      k.box(0.075, 0.062, 0.012, dayMat, [
        -0.15 + col * 0.1,
        -0.04 - row * 0.105,
        0.078,
      ])));

  return k.group(
    k.box(0.68, 0.64, 0.14, bodyMat, [0, -0.04, 0]),
    k.box(0.7, 0.16, 0.152, header, [0, 0.21, 0]),
    days,
    // Today, marked.
    k.box(0.079, 0.066, 0.016, k.mat(k.c.dark, { shine: 40 }), [-0.05, -0.145, 0.08]),
    k.repeat(2, (i) =>
      k.ring(0.045, 0.014, k.gloss(k.c.pale), [-0.18 + i * 0.36, 0.3, 0], [0, 0, 0], 16)),
    k.box(0.7, 0.014, 0.16, k.matte(k.c.deep), [0, 0.128, 0]),
  );
}

/* -------------------------------------------------------------------------- */
/* Things you write with                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The common body of every pen, pencil and brush in the set: a rod lying on the
 * usual diagonal, with a tip at one end and a tail at the other.
 *
 * Built once because six icons are the same object with a different point on
 * it, and because a set of writing tools that do not agree about their angle
 * looks like six drawings rather than one drawer.
 *
 * @param {object} k
 * @param {object[]} parts  meshes to add, positioned along the local y axis
 *                          with 0 at the middle of the barrel
 */
function penBody(k, parts) {
  const g = k.group(parts);
  // Point down-left, tail up-right — the angle a pen rests at in a hand, and
  // the same diagonal the flat glyphs use.
  g.rotation.set(0, 0, 0.72);
  return k.group(g);
}

/** fad-pen-alt — a ballpoint: barrel, grip, cone, clip. */
export function penAlt(k) {
  const barrel = k.mat(k.c.base, { shine: 70 });
  const metal = k.gloss(k.c.pale);
  return penBody(k, [
    k.tube(0.07, 0.44, barrel, [0, 0.1, 0], null, 16),
    k.taper(0.07, 0.035, 0.16, metal, [0, -0.19, 0], null, 16),
    k.cone(0.035, 0.1, k.gloss(k.c.deep), [0, -0.32, 0], [Math.PI, 0, 0], 12),
    k.tube(0.075, 0.03, metal, [0, 0.33, 0], null, 16),
    // The clip: a flat strap down the side, standing off the barrel.
    k.box(0.024, 0.16, 0.02, metal, [0, 0.26, 0.078]),
    k.box(0.024, 0.03, 0.045, metal, [0, 0.335, 0.068]),
  ]);
}

/**
 * fad-pen-fancy — a fountain pen.
 *
 * The nib is the difference, and a nib is a shape a cylinder cannot be: it is
 * lathed to a point and then flattened in z, with a slit down the middle and a
 * breather hole. At eighteen pixels you see a tapered metal point that catches
 * one hard highlight, which is exactly what you see of a real nib at arm's
 * length.
 */
export function penFancy(k) {
  const barrel = k.mat(k.c.dark, { shine: 90 });
  const metal = k.gloss(k.c.gold, { shine: 140 });

  const nib = k.lathe(
    [[0, -0.36], [0.03, -0.3], [0.055, -0.2], [0.07, -0.1], [0.072, 0]],
    metal, [0, -0.06, 0], null, 14,
  );
  nib.scale.z = 0.55;

  return penBody(k, [
    k.tube(0.072, 0.4, barrel, [0, 0.16, 0], null, 16),
    k.tube(0.078, 0.035, metal, [0, -0.045, 0], null, 16),
    nib,
    k.box(0.012, 0.2, 0.03, k.matte(k.c.deep), [0, -0.16, 0.02]),
    k.ball(0.022, k.matte(k.c.deep), [0, -0.075, 0.03], 8),
    k.tube(0.076, 0.03, metal, [0, 0.35, 0], null, 16),
    k.box(0.022, 0.15, 0.02, metal, [0, 0.29, 0.08]),
  ]);
}

/** A hexagonal pencil — the barrel both pencil icons share. */
function pencilBarrel(k, length, colour) {
  const shape = new k.THREE.Shape();
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3;
    const x = Math.cos(a) * 0.075;
    const y = Math.sin(a) * 0.075;
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  // Extruded along z and then stood up, so the six facets run the length of the
  // pencil. A cylinder would be a dowel; the facets are what make it a pencil.
  return k.slab(shape, length, k.mat(colour, { shine: 46 }), [0, 0, 0],
    [Math.PI / 2, 0, 0], { bevel: 0 });
}

/** fad-pencil-alt — pencil with an eraser and a ferrule. */
export function pencilAlt(k) {
  return penBody(k, [
    pencilBarrel(k, 0.42, k.c.base),
    k.cone(0.075, 0.13, k.matte(k.c.wood), [0, -0.275, 0], [Math.PI, 0, 0], 12),
    k.cone(0.03, 0.05, k.matte(k.c.slate), [0, -0.335, 0], [Math.PI, 0, 0], 10),
    k.tube(0.076, 0.055, k.gloss(k.c.pale), [0, 0.24, 0], null, 14),
    k.repeat(2, (i) => k.ring(0.077, 0.006, k.gloss(k.c.deep), [0, 0.225 + i * 0.03, 0], [Math.PI / 2, 0, 0], 12)),
    k.tube(0.07, 0.07, k.mat(0xef8a7a, { shine: 12 }), [0, 0.3, 0], null, 14),
  ]);
}

/** fas-pencil — the short solid pencil: no eraser, all point. */
export function pencilSolid(k) {
  return penBody(k, [
    pencilBarrel(k, 0.5, k.c.base),
    k.cone(0.075, 0.15, k.matte(k.c.wood), [0, -0.325, 0], [Math.PI, 0, 0], 12),
    k.cone(0.032, 0.06, k.matte(k.c.slate), [0, -0.395, 0], [Math.PI, 0, 0], 10),
    k.tube(0.076, 0.03, k.matte(k.c.deep), [0, 0.24, 0], null, 14),
  ]);
}

/**
 * fas-highlighter — a marker with a chisel tip.
 *
 * Chisel, which means the tip is a wedge and not a cone: cut at an angle, so
 * turning the icon shows first the flat of the nib and then its edge. That is
 * the whole character of a highlighter.
 */
export function highlighter(k) {
  const body = k.mat(k.c.base, { shine: 55 });
  const nib = k.mat(k.c.gold, { shine: 18 });

  return penBody(k, [
    k.box(0.16, 0.38, 0.13, body, [0, 0.12, 0]),
    k.box(0.17, 0.06, 0.14, k.mat(k.c.dark, { shine: 55 }), [0, -0.09, 0]),
    k.box(0.13, 0.12, 0.1, k.matte(k.c.deep), [0, -0.16, 0]),
    // The wedge: a box with its far face sheared by rotating it about x.
    k.box(0.12, 0.13, 0.09, nib, [0, -0.26, 0.012], [0.42, 0, 0]),
    k.box(0.155, 0.03, 0.125, k.gloss(k.c.pale), [0, 0.3, 0]),
    // A stripe of what it lays down, under the tip.
    k.box(0.34, 0.05, 0.006, k.mat(k.c.gold, { shine: 8, opacity: 0.5 }), [0.12, -0.34, -0.06]),
  ]);
}

/**
 * fas-paint-brush-alt — handle, ferrule, bristles.
 *
 * The bristles are a tapered lathe that is squashed flat, so the brush has a
 * broad face and a thin edge like a real flat brush, and the ferrule is
 * crimped metal between them. Three materials in one object, which is what
 * gives it something to do in the light.
 */
export function paintBrush(k) {
  const bristles = k.lathe(
    [[0, -0.42], [0.05, -0.34], [0.085, -0.2], [0.095, -0.08], [0.09, 0]],
    k.matte(k.c.dark), [0, -0.08, 0], null, 14,
  );
  bristles.scale.z = 0.5;
  bristles.name = 'bristles';

  return penBody(k, [
    k.taper(0.06, 0.085, 0.4, k.mat(k.c.wood, { shine: 40 }), [0, 0.22, 0], null, 14),
    k.ball(0.06, k.mat(k.c.wood, { shine: 40 }), [0, 0.42, 0], 12),
    k.tube(0.09, 0.14, k.gloss(k.c.pale), [0, 0.0, 0], null, 16),
    k.repeat(2, (i) => k.ring(0.091, 0.007, k.gloss(k.c.deep), [0, -0.03 + i * 0.06, 0], [Math.PI / 2, 0, 0], 14)),
    bristles,
    k.box(0.3, 0.05, 0.006, k.mat(k.c.base, { shine: 8, opacity: 0.55 }), [0.1, -0.38, -0.05]),
  ]);
}
