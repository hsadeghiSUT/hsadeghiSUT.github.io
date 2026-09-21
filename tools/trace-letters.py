#!/usr/bin/env python3
"""
trace-letters.py — turn the name into polygons the 3D layer can extrude.

WHY THIS EXISTS
---------------
The vertical name in the left gutter of every page but Summary is not text. It
is twelve extruded solids, each one turning on its own axis, and extruding needs
outlines.

Three.js can do this at run time with `FontLoader` and `TextGeometry`, and that
was the obvious route and the wrong one. It wants a "typeface JSON": a whole
font converted to a bespoke format, several hundred kilobytes, downloaded on
every page — to draw nine distinct characters. This walks the font the site
already ships, takes the nine glyphs it actually needs, and writes about twenty
kilobytes.

WHICH FONT
----------
`caladea-700.woff`, which the site already serves. The brief asked for "Times
New Roman or something similar"; Caladea is a transitional serif of the same
family of shapes, it is the face the name is already set in everywhere else on
this site, and — the part that matters — it is already in the visitor's cache.
Shipping Times New Roman's outlines to match a font most visitors do not have
would have been a worse answer to the same question.

The BOLD weight, not the regular. A 3D solid is read from its lit faces and its
walls, and a hairline serif at fifty pixels is mostly wall.

IT IS A BUILD STEP
------------------
Its output — assets/data/name-letters.json — is committed. Nothing at run time
needs Python or fontTools. Re-run it only if the name or the face changes:

    python3 tools/trace-letters.py

WHAT COMES OUT
--------------
    text      the string the column spells, so the browser does not have to be
              told twice.
    glyphs    one entry per distinct character: `contours`, each an outer path
              with its own `holes`, plus the glyph's `advance`. Coordinates are
              in EM UNITS with Y up — what the 3D code wants, and what makes the
              numbers independent of the font's internal grid.

HOLES ARE FOUND BY CONTAINMENT, NOT BY WINDING
----------------------------------------------
TrueType says outer contours wind one way and holes the other, and fonts do not
always agree with TrueType. A point taken from each contour and tested against
every other one cannot be wrong about which is inside which: nesting depth even
means an outer path, odd means a hole. Nine glyphs is far too few for the cost
of that to matter.
"""

import json
import os
import sys

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, '..', 'assets', 'vendor', 'fonts', 'caladea-700.woff')
OUT = os.path.join(HERE, '..', 'assets', 'data', 'name-letters.json')

# The text the column spells. Only its distinct characters are written out.
TEXT = 'Hamed Sadeghi'

# Segments per curve. Six is past the point where more of them changes anything
# at the size these are drawn, and every one of them is a vertex in an extrusion
# that also has to be triangulated.
STEPS = 6


def mid(a, b):
    return ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)


def flatten(recording):
    """Pen operations to closed polygons, in font units."""
    contours = []
    current = []
    here = (0.0, 0.0)

    def quad(control, end):
        x0, y0 = here
        x1, y1 = control
        x2, y2 = end
        for i in range(1, STEPS + 1):
            t = i / STEPS
            u = 1.0 - t
            current.append((
                u * u * x0 + 2 * u * t * x1 + t * t * x2,
                u * u * y0 + 2 * u * t * y1 + t * t * y2,
            ))

    def cubic(c1, c2, end):
        x0, y0 = here
        x1, y1 = c1
        x2, y2 = c2
        x3, y3 = end
        for i in range(1, STEPS + 1):
            t = i / STEPS
            u = 1.0 - t
            current.append((
                u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
                u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
            ))

    def close():
        nonlocal current
        if len(current) > 2:
            contours.append(current)
        current = []

    for op, args in recording:
        if op == 'moveTo':
            close()
            here = args[0]
            current = [here]
        elif op == 'lineTo':
            here = args[0]
            current.append(here)
        elif op == 'curveTo':
            *controls, end = args
            # Cubics only ever arrive as two controls, from a CFF outline.
            cubic(controls[0], controls[1], end)
            here = end
        elif op == 'qCurveTo':
            points = list(args)
            #
            # A quadratic run. Every point but the last is a control point, and
            # between two consecutive control points there is an ON-CURVE point
            # the font does not store because it is always their midpoint. That
            # implied point is the whole of the TrueType quadratic format, and
            # the whole of what goes wrong if it is ignored — the outline comes
            # out visibly cornered where it should be smooth.
            #
            # A trailing None means the contour is made of off-curve points and
            # nothing else, so even the starting point is implied.
            #
            if points and points[-1] is None:
                controls = points[:-1]
                end = mid(controls[-1], controls[0])
                here = end
                current = [here]
            else:
                controls, end = points[:-1], points[-1]
            for i, control in enumerate(controls):
                stop = mid(control, controls[i + 1]) if i + 1 < len(controls) else end
                quad(control, stop)
                here = stop
        elif op in ('closePath', 'endPath'):
            close()
    close()
    return contours


def inside(point, polygon):
    """Point in polygon, by ray casting."""
    x, y = point
    hit = False
    n = len(polygon)
    for i in range(n):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            cross = x1 + (y - y1) / (y2 - y1) * (x2 - x1)
            if cross > x:
                hit = not hit
    return hit


def nest(contours):
    """Split flat contours into outer paths, each carrying its own holes."""
    depth = []
    for i, contour in enumerate(contours):
        probe = contour[0]
        depth.append(sum(
            1 for j, other in enumerate(contours) if j != i and inside(probe, other)
        ))

    shapes = []
    for i, contour in enumerate(contours):
        if depth[i] % 2:
            continue                       # a hole; collected below
        holes = [
            contours[j] for j, other in enumerate(contours)
            if depth[j] == depth[i] + 1 and inside(other[0], contour)
        ]
        shapes.append((contour, holes))
    return shapes


def main():
    font = TTFont(FONT)
    upm = float(font['head'].unitsPerEm)
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()

    def em(points):
        return [[round(x / upm, 4), round(y / upm, 4)] for (x, y) in points]

    out = {}
    for character in dict.fromkeys(TEXT):        # distinct, in order
        if character == ' ':
            continue
        code = ord(character)
        if code not in cmap:
            raise SystemExit(f'{FONT} has no glyph for "{character}"')
        name = cmap[code]
        pen = DecomposingRecordingPen(glyphs)    # components flattened into outlines
        glyphs[name].draw(pen)
        out[character] = {
            'advance': round(glyphs[name].width / upm, 5),
            'contours': [
                {'outline': em(outline), 'holes': [em(h) for h in holes]}
                for outline, holes in nest(flatten(pen.value))
            ],
        }

    # The space has no outline and still has a width, which is what gives the
    # gap between the two words a number that came from the font.
    space = cmap.get(ord(' '))
    data = {
        '_readme': 'Generated by tools/trace-letters.py. Do not edit by hand.',
        'source': os.path.basename(FONT),
        'text': TEXT,
        'space': round(glyphs[space].width / upm, 5) if space else 0.25,
        'glyphs': out,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))

    points = sum(
        len(c['outline']) + sum(len(h) for h in c['holes'])
        for g in out.values() for c in g['contours']
    )
    print(f'{len(out)} glyphs, {points} points, {os.path.getsize(OUT) // 1024} KB')


if __name__ == '__main__':
    sys.exit(main())
