#!/usr/bin/env python3
"""
trace-logo.py — turn the Sharif University mark into polygons.

WHY THIS EXISTS
---------------
The header logo is drawn in 3D: the mark is extruded, given real thickness, and
turned about its vertical axis. Extruding needs outlines, and what the site has
is a 260x260 PNG. This traces one into the other.

It is a build step, not something the site runs. Its output,
assets/img/logos/logo.json, is committed; nothing at run time needs Python,
OpenCV, or this file. Re-run it only if the logo image itself changes:

    python3 tools/trace-logo.py

WHAT IT SEPARATES
-----------------
The PNG has exactly three regions, and they are treated differently because
they mean different things:

    transparent   outside the disc            — nothing
    white         the disc behind the mark    — a flat plate, NO thickness
    navy #2E3192  the mark itself             — extruded

That split is the whole point: giving the white background thickness would turn
the logo into a coin with the mark sunk into it, instead of a mark standing off
a plate.

HOW
---
The navy mask is upsampled 4x before tracing, so the contours land on quarter-
pixel boundaries and the gear teeth and Persian letterforms keep their shape;
then each contour is simplified with Douglas-Peucker to keep the file small.
OpenCV's CCOMP hierarchy gives outer contours and their holes in one pass, which
matters here — the letterforms are full of counters.

Coordinates come out normalised to -0.5..0.5 with Y pointing up, which is what
the 3D code wants; the renderer scales from there.
"""

import json
import os
import sys

import numpy as np
import cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SOURCE = os.path.join(ROOT, 'assets', 'img', 'logos', 'logo.png')
TARGET = os.path.join(ROOT, 'assets', 'img', 'logos', 'logo.json')

# Trace at 4x. Higher makes barely any visual difference and a much larger file.
SCALE = 4

# Douglas-Peucker tolerance, in source pixels. 0.35 keeps the letterforms
# readable at any size the header uses while cutting the point count by ~85%.
EPSILON = 0.35 * SCALE

# Contours smaller than this many source pixels squared are noise from the
# anti-aliased edges, not parts of the mark.
MIN_AREA = 2.0 * SCALE * SCALE


def load_masks(path):
    """Return (mark, disc) boolean masks: the navy artwork, and the whole disc."""
    image = np.array(Image.open(path).convert('RGBA'))
    alpha = image[..., 3]
    rgb = image[..., :3].astype(int)
    opaque = alpha > 128
    luminance = rgb.sum(axis=2) / 3.0
    mark = opaque & (luminance < 140)
    return mark.astype(np.uint8) * 255, opaque.astype(np.uint8) * 255


def trace(mask):
    """Contours and their holes, in pixel coordinates of the upsampled mask."""
    big = cv2.resize(mask, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_CUBIC)
    # Blur before thresholding. Upsampling a bitmap only makes the staircase
    # bigger; blurring first turns it into a gradient, and thresholding the
    # gradient puts the edge where the eye reads it — which is what keeps the
    # gear teeth from coming out visibly stepped once the mark is extruded.
    big = cv2.GaussianBlur(big, (0, 0), sigmaX=SCALE * 0.42)
    _, big = cv2.threshold(big, 127, 255, cv2.THRESH_BINARY)

    contours, hierarchy = cv2.findContours(big, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is None:
        return []
    hierarchy = hierarchy[0]

    shapes = []
    for i, contour in enumerate(contours):
        # In CCOMP, a contour with no parent is an outline; one with a parent is
        # a hole in it. Two levels is all this artwork needs.
        if hierarchy[i][3] != -1:
            continue
        if cv2.contourArea(contour) < MIN_AREA:
            continue

        holes = []
        child = hierarchy[i][2]
        while child != -1:
            if cv2.contourArea(contours[child]) >= MIN_AREA:
                holes.append(contours[child])
            child = hierarchy[child][0]

        shapes.append((contour, holes))
    return shapes


def simplify(contour):
    approx = cv2.approxPolyDP(contour, EPSILON, True)
    return approx.reshape(-1, 2)


def normalise(points, size):
    """Pixels to -0.5..0.5, Y up."""
    out = []
    for x, y in points:
        out.append([
            round(x / (size * SCALE) - 0.5, 4),
            round(0.5 - y / (size * SCALE), 4),
        ])
    return out


def main():
    if not os.path.exists(SOURCE):
        sys.exit('No logo at ' + SOURCE)

    mark, disc = load_masks(SOURCE)
    size = mark.shape[0]

    shapes = []
    points = 0
    for outline, holes in trace(mark):
        simplified = simplify(outline)
        if len(simplified) < 3:
            continue
        entry = {'outline': normalise(simplified, size)}
        points += len(simplified)

        hole_rings = []
        for hole in holes:
            ring = simplify(hole)
            if len(ring) >= 3:
                hole_rings.append(normalise(ring, size))
                points += len(ring)
        if hole_rings:
            entry['holes'] = hole_rings
        shapes.append(entry)

    # The white plate: the disc the mark sits on, as a circle.
    ys, xs = np.nonzero(disc)
    radius = float(max(xs.max() - xs.min(), ys.max() - ys.min())) / 2.0 / size

    data = {
        '_readme': (
            'Generated by tools/trace-logo.py from assets/img/logos/logo.png. '
            'Coordinates are -0.5..0.5 with Y up. "shapes" is the navy mark, '
            'which is extruded; "disc" is the white plate behind it, which is '
            'not. Re-run the script if the logo image changes.'
        ),
        'source': 'assets/img/logos/logo.png',
        'disc': {'radius': round(radius, 4)},
        'shapes': shapes,
    }

    with open(TARGET, 'w', encoding='utf-8') as handle:
        json.dump(data, handle, separators=(',', ':'))

    print('shapes: %d   holes: %d   points: %d' % (
        len(shapes), sum(len(s.get('holes', [])) for s in shapes), points))
    print('disc radius: %.4f' % radius)
    print('wrote %s (%.1f KB)' % (TARGET, os.path.getsize(TARGET) / 1024))


if __name__ == '__main__':
    main()
