Three.js goes in this folder.
=============================

The site works without it. If this folder is empty except for this file, the
field behind the pages is drawn by the built-in renderer
(assets/js/modules/fx/field-gl.js) — same lattice, same shaders, same camera, a
few kilobytes instead of about 1.8 MB. Installing Three.js is an upgrade, not a
requirement.

WHAT TO DOWNLOAD
----------------
Since r165, Three.js ships as TWO files. `three.module.js` is only the renderer
half; its first line is

    import { Matrix3, Vector2, … } from './three.core.js';

so on its own it cannot load. Both files are needed, and both must come from the
SAME version or the imports will not line up:

    https://unpkg.com/three@0.185.0/build/three.module.js
    https://unpkg.com/three@0.185.0/build/three.core.js

(r185 is what this site has been tested against; any recent release works, as
long as BOTH files come from the same one.)

Or take both out of the `build/` folder of any release at
https://github.com/mrdoob/three.js/releases

WHERE THEY GO
-------------
    assets/vendor/three/three.module.js
    assets/vendor/three/three.core.js
    assets/vendor/three/LICENSE          ← Three.js is MIT-licensed; keep it,
                                           as assets/vendor/fonts/ does for the
                                           typefaces.

That is the whole installation. No build step, no package manager, no other file
to edit. Reload the page and check in the browser console:

    window.__fx.renderer        // 'three'  (was 'webgl')

WHY THEY ARE NOT ALREADY HERE
-----------------------------
This site is built to run in an environment with no access to npm, PyPI or any
CDN, so it cannot fetch them for you, and a zip of the site does not carry them
— which also means re-extracting the site over this folder will never overwrite
a copy you installed yourself.

If the files are missing, the browser console shows one line:

    fx: Three.js not loaded (…). Using the built-in renderer. See README §12.

That line is informational. Nothing is broken.
