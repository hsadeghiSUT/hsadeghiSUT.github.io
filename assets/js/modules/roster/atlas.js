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
 * atlas.js — every face in the roster, packed into one texture.
 *
 * WHY AN ATLAS
 * ------------
 * Fifty-five people means fifty-five photographs. Uploaded as fifty-five
 * separate textures that is fifty-five GPU objects, fifty-five state changes a
 * frame, and no possibility of ever batching the cards. Packed into one image
 * it is a single upload, a single bind, and every card is then just a different
 * rectangle of UVs into the same picture.
 *
 * WHAT IS IN A CELL
 * -----------------
 * The photograph, cropped square-ish and biased toward the top of the frame —
 * the same `center 18%` bias the CSS uses on the portrait, because a head sits
 * above the middle of a portrait and a centred crop cuts it — and beneath it a
 * caption band carrying the year.
 *
 * The year is BAKED IN rather than drawn as an HTML label over the canvas, and
 * that is the whole reason this file draws text at all. A DOM label has to be
 * projected and repositioned every frame, it does not turn with the card, and
 * fifty-five of them is fifty-five absolutely-positioned elements being written
 * to sixty times a second. Baked into the texture it is part of the object: it
 * rotates with the card, it recedes with the card, and it costs nothing.
 *
 * THE LAST CELL IS BLANK
 * ----------------------
 * Reserved, filled with a flat tone, and used for the five faces of the card
 * that are not the photograph. That is what gives the card its edge colour
 * without needing a second material or a second draw.
 */

/** Pixel size of one cell's photograph. */
const PHOTO = 168;

/** Height of the caption band under it. */
const CAPTION = 42;

/** Cells across the atlas. 8 × 8 holds 64, which is 63 people and the blank. */
const COLS = 8;

export const CELL_W = PHOTO;
export const CELL_H = PHOTO + CAPTION;

/**
 * Draw one image into a cell, cropped to fill and biased toward the top.
 *
 * `cover` rather than `contain`: a letterboxed portrait in a grid of cards
 * reads as a mistake, and these are all roughly portrait already.
 */
function drawCover(ctx, image, x, y, w, h) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;

  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  // Horizontally centred; vertically biased upward, toward the face.
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) * 0.18;
  ctx.drawImage(image, dx, dy, dw, dh);
}

/** Load one image. Never rejects — a missing photo becomes a null. */
function load(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Two initials from a name, for the placeholder when a photo will not load. */
function initials(name) {
  return String(name || '?')
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z؀-ۿ]/.test(w[0] || ''))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
}

/**
 * Build the atlas.
 *
 * @param {Array} people  each needs { name, photoUrl, yearLabel, tint }
 *                        where `tint` is a CSS colour string for its caption
 * @param {object} look   { ink, band, blank } CSS colours read from the theme
 * @returns {Promise<{canvas: HTMLCanvasElement, cols: number, rows: number,
 *                    blank: number, uvFor: function}>}
 */
export async function buildAtlas(people, look) {
  const rows = Math.max(1, Math.ceil((people.length + 1) / COLS));
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL_W;
  canvas.height = rows * CELL_H;

  const ctx = canvas.getContext('2d');
  // Everything not covered by a photograph is the blank tone, so a cell that
  // fails to load is still a card rather than a transparent hole.
  ctx.fillStyle = look.blank;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const images = await Promise.all(people.map((p) => load(p.photoUrl)));

  people.forEach((person, i) => {
    const cx = (i % COLS) * CELL_W;
    const cy = Math.floor(i / COLS) * CELL_H;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, CELL_W, PHOTO);
    ctx.clip();
    if (images[i]) {
      drawCover(ctx, images[i], cx, cy, CELL_W, PHOTO);
    } else {
      ctx.fillStyle = person.tint;
      ctx.fillRect(cx, cy, CELL_W, PHOTO);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.round(PHOTO * 0.34)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials(person.name), cx + CELL_W / 2, cy + PHOTO / 2);
    }
    ctx.restore();

    // The caption band, in the person's own section colour.
    ctx.fillStyle = person.tint;
    ctx.fillRect(cx, cy + PHOTO, CELL_W, CAPTION);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(CAPTION * 0.56)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(person.yearLabel, cx + CELL_W / 2, cy + PHOTO + CAPTION * 0.54);
  });

  /* The blank cell, for the sides and the back. It sits immediately after the
     last person, so the atlas never has to grow to hold it. */
  const blank = people.length;
  const bx = (blank % COLS) * CELL_W;
  const by = Math.floor(blank / COLS) * CELL_H;
  ctx.fillStyle = look.blank;
  ctx.fillRect(bx, by, CELL_W, CELL_H);

  /**
   * The UV rectangle of one cell, in the 0–1 coordinates a texture wants.
   *
   * Inset by half a texel on every side. Without that, a card's edge samples
   * the neighbouring cell — at a shallow angle the linear filter reaches across
   * the boundary and you get a thin stripe of somebody else's photograph down
   * the side of the card. It is the classic atlas artefact and it is invisible
   * until it is not.
   */
  const uvFor = (index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const hx = 0.5 / canvas.width;
    const hy = 0.5 / canvas.height;
    const u0 = (col * CELL_W) / canvas.width + hx;
    const u1 = ((col + 1) * CELL_W) / canvas.width - hx;
    // Texture V runs up from the bottom; the atlas is drawn top-down.
    const v1 = 1 - (row * CELL_H) / canvas.height - hy;
    const v0 = 1 - ((row + 1) * CELL_H) / canvas.height + hy;
    return { u0, u1, v0, v1 };
  };

  return { canvas, cols: COLS, rows, blank, uvFor, capacity: COLS * rows - 1 };
}
