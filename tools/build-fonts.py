#!/usr/bin/env python3
"""
build-fonts.py — produce the vendored webfonts in assets/vendor/fonts/.

WHY THIS EXISTS
---------------
The site must run in an environment with no access to Google Fonts or any other
external repository.  Every face it uses is therefore stored in the repository
itself.  This script is the reproducible recipe for the two Latin families: it
takes the full desktop TTFs, cuts them down to the characters the site actually
needs, and writes WOFF files.

You do not need to run it to use the site — the output is already committed.
Run it only if you want to change the character coverage or swap a family.

REQUIREMENTS
------------
    pip install fonttools            # WOFF output needs no extra dependency
    pip install brotli               # OPTIONAL: adds woff2, ~30% smaller again

Source TTFs are the Debian/Ubuntu packages `fonts-crosextra-caladea` and
`fonts-crosextra-carlito`; both families are SIL Open Font License 1.1, which
permits redistribution and web embedding provided the licence travels with the
files.  Copies live beside the fonts as OFL-Caladea.txt / OFL-Carlito.txt.

USAGE
-----
    python3 tools/build-fonts.py
"""

import os
import shutil
import subprocess
import sys

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "vendor", "fonts")

# Where the source TTFs live on a Debian/Ubuntu machine.  Point these at your
# own copies if you are building elsewhere.
SRC_DIR = "/usr/share/fonts/truetype/crosextra"

FACES = [
    # (source file,            output name,      css weight)
    ("Caladea-Regular.ttf",    "caladea-400.woff",  "400"),
    ("Caladea-Bold.ttf",       "caladea-700.woff",  "700"),
    ("Carlito-Regular.ttf",    "carlito-400.woff",  "400"),
    ("Carlito-Bold.ttf",       "carlito-700.woff",  "700"),
]

# Character coverage.  Basic Latin + Latin-1 + Latin Extended-A covers every
# name and title on the site (including Géotechnique, Łukasz, Ø…), plus the
# punctuation and symbols the content uses.  Persian is NOT here — that is BZar,
# shipped whole, and governed by assets/css/farsi.css.
UNICODES = ",".join([
    "U+0020-007E",   # Basic Latin
    "U+00A0-00FF",   # Latin-1 Supplement  (é, ü, ñ, ×, °, ©, ½ …)
    "U+0100-017F",   # Latin Extended-A    (ł, š, ğ, ı …)
    "U+2010-2027",   # dashes, quotes, ellipsis
    "U+2030-205E",   # ‰ † ‡ • ′ ″ ⁄ …
    "U+20AC",        # €
    "U+2122",        # ™
    "U+2190-2193",   # ← ↑ → ↓
    "U+2212",        # − minus
    "U+FB01-FB02",   # ﬁ ﬂ ligatures
])


def build(flavor="woff"):
    made = []
    for src, dest, _weight in FACES:
        src_path = os.path.join(SRC_DIR, src)
        if not os.path.exists(src_path):
            sys.exit(f"missing source font: {src_path}\n"
                     f"install fonts-crosextra-caladea and fonts-crosextra-carlito, "
                     f"or edit SRC_DIR at the top of this script.")
        out_path = os.path.join(OUT, dest if flavor == "woff" else dest.replace(".woff", ".woff2"))
        subprocess.run([
            sys.executable, "-m", "fontTools.subset", src_path,
            f"--unicodes={UNICODES}",
            "--layout-features=kern,liga,clig,calt,onum,tnum",
            "--desubroutinize",
            f"--flavor={flavor}",
            f"--output-file={out_path}",
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        made.append((dest, os.path.getsize(out_path)))
    return made


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    results = build("woff")
    total = 0
    for name, size in results:
        print(f"  {name:22} {size/1024:6.1f} KB")
        total += size
    print(f"  {'total':22} {total/1024:6.1f} KB")
