#!/usr/bin/env python3
"""
trace-bismillah.py — turn the calligraphic marks into polygons.

WHY THIS EXISTS
---------------
The header mark is drawn in 3D: extruded, given real thickness, lit, and traced
by a moving light around its own outline. Extruding needs outlines, and what the
site has is a PNG. This turns one into the other.

THERE ARE TWO MARKS. The Summary page carries a square KUFIC bismillah and every
other page a flowing THULUTH one, and both go through this same pipeline — see
MARKS below for the three numbers that differ, and why.

It is a build step, not something the site runs. Its outputs —
assets/img/logos/bismillah-<name>.json and the matching -poster.png — are
committed; nothing at run time needs Python, OpenCV or this file. Re-run it only
if the artwork changes:

    python3 tools/trace-bismillah.py              # both
    python3 tools/trace-bismillah.py thuluth      # just one

THE BACKGROUND IS NOT TRANSPARENT
---------------------------------
The file arrived with its transparency already flattened: the checkerboard you
see behind the artwork is *painted into the image*, and every pixel's alpha is
255. So the mark cannot be separated by alpha, and it is separated by colour
instead — the artwork is a saturated teal shading to near-black, the
checkerboard is neutral grey and white. A pixel belongs to the mark if it is
either dark or colourful; the checkerboard is neither.

That test is not a guess: sampling the four corners and the mid-left edge, which
are all background, gives pure neutrals at 230 and 255, while the artwork's
median saturation inside the mark is far above the threshold. It holds for both
marks — the thuluth one is indigo shading to near-black on the same
checkerboard — which is why one rule serves both.

WHY IT BLURS BEFORE IT THRESHOLDS
---------------------------------
Thresholding a hard-edged raster gives contours that step pixel by pixel, and
those staircases survive into the extrusion as visible serrations along every
edge. A small blur first turns the step into a ramp, and the threshold then cuts
that ramp at a consistent place — the same trick the Sharif mark's tracer uses,
and for the same reason.

WHAT COMES OUT
--------------
    shapes    one entry per contour: an outline, plus any holes inside it.
              Coordinates are normalised to -0.5…0.5 with Y up, which is what
              the 3D code wants.
    outline   ONE closed path around the whole mark, for the light that runs
              around its border. The artwork is many separate pieces, so this is
              taken from a dilated copy — swollen until the pieces merge into a
              single silhouette, traced, then pulled back in. A light that ran
              around forty-odd disconnected contours would not read as one mark.
"""

import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LOGOS = os.path.join(HERE, '..', 'assets', 'img', 'logos')

# How big a poster is, in pixels square. A mark is drawn at 56 CSS pixels, so
# this is a 2x asset and nothing larger is of any use.
POSTER_SIZE = 128
# Colours in the poster's palette. Sixty-four is indistinguishable from the
# original at this size and about a sixth of the file.
POSTER_COLOURS = 64

# A pixel is part of the mark if it is dark OR colourful. The flattened
# checkerboard is neither.
DARK = 190
COLOURFUL = 45

# Contours smaller than this many pixels are dropped: at this size they are
# artefacts of the checkerboard's own edges, not parts of the letterform.
MIN_AREA = 40

# ---------------------------------------------------------------------------
# THE MARKS
#
# Two of them: the square kufic bismillah the Summary page carries, and the
# flowing thuluth one on every other page. They go through exactly the same
# pipeline and differ only in the three numbers below.
#
#   swell     how far the mask is dilated to merge the separate pieces into one
#             silhouette, and then pulled back, in pixels of the source. It has
#             to bridge the widest gap between two pieces of the composition and
#             no more; too little and the light has several outlines to choose
#             between, too much and it stops following the artwork.
#
#   simplify  the polygon simplification, as a fraction of each contour's own
#             perimeter.
#
#   floor     a MINIMUM simplification, as a fraction of the image's longer
#             side. This is here because a relative epsilon is the wrong tool
#             for a composition made of many small pieces: it scales with each
#             contour, so a dot two hundredths of the image across is kept to a
#             precision nothing on screen could ever show, and the thuluth mark
#             is mostly dots. With the floor its trace is 787 points instead of
#             3118 and the two are indistinguishable at any size the mark is
#             drawn. The kufic mark is four big contours and needs none of it,
#             so its floor is zero and its output is unchanged.
# ---------------------------------------------------------------------------
MARKS = {
    'kufic':   {'swell': 26, 'simplify': 0.0016, 'floor': 0.0},
    'thuluth': {'swell': 20, 'simplify': 0.0016, 'floor': 0.0022},
}


def mask_of(image):
    """The mark, as a binary image."""
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB).astype(int)
    lum = rgb.mean(axis=2)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    return ((lum < DARK) | (sat > COLOURFUL)).astype(np.uint8) * 255


def traced(mask, simplify, floor=0.0, min_area=MIN_AREA):
    """Contours with their holes, from a binary mask."""
    span = max(mask.shape)

    def epsilon(contour):
        return max(simplify * cv2.arcLength(contour, True), floor * span)

    # Blur, then threshold: see the note above about staircases.
    soft = cv2.GaussianBlur(mask, (0, 0), 1.6)
    _, hard = cv2.threshold(soft, 127, 255, cv2.THRESH_BINARY)

    contours, hierarchy = cv2.findContours(hard, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hierarchy is None:
        return []
    hierarchy = hierarchy[0]

    shapes = []
    for i, contour in enumerate(contours):
        if hierarchy[i][3] != -1:          # a hole; collected with its parent
            continue
        if cv2.contourArea(contour) < min_area:
            continue
        outline = cv2.approxPolyDP(contour, epsilon(contour), True)
        holes = []
        child = hierarchy[i][2]
        while child != -1:
            hole = contours[child]
            if cv2.contourArea(hole) >= min_area:
                holes.append(cv2.approxPolyDP(hole, epsilon(hole), True))
            child = hierarchy[child][0]
        shapes.append((outline, holes))
    return shapes


def write_poster(image, mask, out):
    """
    The flat fallback, cut out properly.

    WHY THIS IS GENERATED AND NOT JUST THE SOURCE FILE
    -------------------------------------------------
    The source PNG has no usable alpha. Its transparency was flattened before it
    reached us — the checkerboard a graphics editor draws behind a transparent
    layer is PAINTED INTO the pixels, and every one of them is fully opaque. Put
    it in an <img> and you get the checkerboard.

    Which is also why the mask above is built from colour rather than from
    alpha; this reuses it. The mark is cropped square about its own bounding
    box, given that mask as its alpha channel with a half-pixel feather so the
    downscale does not stair-step, reduced to 2x the size it is ever drawn at,
    and palettised.
    """
    ys, xs = np.where(mask > 0)
    if not len(ys):
        return
    cy, cx = (ys.min() + ys.max()) // 2, (xs.min() + xs.max()) // 2
    # A little air, so the mark is not flush against the edge of its own box.
    half = int(max(ys.max() - ys.min(), xs.max() - xs.min()) / 2 * 1.11)
    top, bottom = max(0, cy - half), min(image.shape[0], cy + half)
    left, right = max(0, cx - half), min(image.shape[1], cx + half)

    alpha = cv2.GaussianBlur(mask[top:bottom, left:right], (3, 3), 0)
    cut = np.dstack([image[top:bottom, left:right, :3], alpha])
    cut = cv2.resize(cut, (POSTER_SIZE, POSTER_SIZE), interpolation=cv2.INTER_AREA)

    try:
        from PIL import Image
        rgba = Image.fromarray(cut[:, :, [2, 1, 0, 3]], 'RGBA')
        rgba.quantize(colors=POSTER_COLOURS, method=Image.FASTOCTREE).save(
            out, optimize=True)
    except ImportError:
        cv2.imwrite(out, cut, [cv2.IMWRITE_PNG_COMPRESSION, 9])


def trace(name, settings):
    """Trace one mark: its JSON, and its flat poster."""
    src = os.path.join(LOGOS, f'bismillah-{name}.png')
    out = os.path.join(LOGOS, f'bismillah-{name}.json')
    poster = os.path.join(LOGOS, f'bismillah-{name}-poster.png')

    image = cv2.imread(src, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise SystemExit(f'cannot read {src}')
    if image.shape[2] == 4:
        # If a genuinely transparent copy ever replaces this one, use its alpha.
        mask = (image[:, :, 3] > 128).astype(np.uint8) * 255
        if mask.mean() > 250:             # fully opaque: the alpha says nothing
            mask = mask_of(image[:, :, :3])
    else:
        mask = mask_of(image)

    height, width = mask.shape
    span = max(width, height)

    def normalise(points):
        """Pixels to -0.5…0.5, Y up, square aspect preserved."""
        result = []
        for (x, y) in points.reshape(-1, 2):
            result.append([
                round((float(x) - width / 2) / span, 5),
                round((height / 2 - float(y)) / span, 5),
            ])
        return result

    shapes = []
    for outline, holes in traced(mask, settings['simplify'], settings['floor']):
        entry = {'outline': normalise(outline)}
        if holes:
            entry['holes'] = [normalise(h) for h in holes]
        shapes.append(entry)

    # ---- the single silhouette, for the light that runs around the border ----
    swell = settings['swell']
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (swell * 2 + 1,) * 2)
    swollen = cv2.dilate(mask, kernel)
    swollen = cv2.erode(swollen, cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (swell,) * 2))
    merged = traced(swollen, simplify=0.0022, min_area=5000)
    merged.sort(key=lambda s: cv2.contourArea(s[0]), reverse=True)
    silhouette = normalise(merged[0][0]) if merged else []

    data = {
        '_readme': 'Generated by tools/trace-bismillah.py. Do not edit by hand.',
        'source': os.path.basename(src),
        'shapes': shapes,
        'silhouette': silhouette,
    }
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))

    write_poster(image, mask, poster)

    points = sum(len(s['outline']) for s in shapes)
    points += sum(len(h) for s in shapes for h in s.get('holes', []))
    holes = sum(len(s.get('holes', [])) for s in shapes)
    size = os.path.getsize(out)
    weight = os.path.getsize(poster) if os.path.exists(poster) else 0
    print(f'{name:8s} {len(shapes)} contours, {holes} holes, {points} points, '
          f'silhouette {len(silhouette)} points, {size // 1024} KB'
          f' + poster {weight // 1024} KB')


def main():
    wanted = sys.argv[1:] or list(MARKS)
    for name in wanted:
        if name not in MARKS:
            raise SystemExit(f'unknown mark "{name}" — try: {", ".join(MARKS)}')
        trace(name, MARKS[name])


if __name__ == '__main__':
    main()
