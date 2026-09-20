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
 * bismillah/marks.js — which mark a page carries, and whether it just changed.
 *
 * WHY THIS IS A SEPARATE FILE FROM THE MARK ITSELF
 * -----------------------------------------------
 * `bismillah/index.js` pulls in Three.js and is loaded lazily, off the critical
 * path — the header is complete without it. But the POSTER, the flat image that
 * stands in until the solid is ready, has to be in the markup from the very
 * first paint, and which poster it is depends on which mark this page carries.
 *
 * So the choice lives here, in a file small enough for `chrome.js` to import
 * statically, and `index.js` imports the same table. One list, two readers, no
 * chance of the poster and the solid disagreeing about which mark the page is
 * showing — which they would the moment either was copied.
 */

/**
 * THE TWO MARKS
 *
 * The Summary page carries a square KUFIC bismillah and every other page a
 * flowing THULUTH one. They are the same object built twice: the same trace
 * pipeline (`tools/trace-bismillah.py`), the same extrusion, the same lights,
 * the same meteor and the same columns of light. Only `depth` and `bevel`
 * differ, and both differ for one reason — the two scripts are physically
 * different things.
 *
 *   depth   The kufic mark is drawn with strokes about a twentieth of its
 *           height, so an extrusion a twelfth deep reads as a solid slab of
 *           letterform. The thuluth mark's strokes are a third of that width,
 *           and at the same depth every one of them came out as a stick
 *           pointing at the viewer — deeper than it is wide, so the eye reads
 *           the WALLS and not the face. Thin strokes want a thin extrusion.
 *
 *   bevel   The same argument one step further in: a bevel is a fraction of a
 *           stroke, and the absolute bevel that catches a good highlight on a
 *           wide stroke swallows a narrow one whole.
 *
 *   headroom  How much bigger the frame is than the mark. It is there so the
 *           mark can grow a tenth on hover and be stroked by the meteor without
 *           either touching the edge of the canvas — but the thuluth mark needs
 *           every pixel of a fifty-pixel box to stay legible, and it grows from
 *           a smaller starting scale, so it takes less.
 *
 *   emissive  How much light the mark gives off by itself. The kufic mark's
 *           strokes are far enough apart that a glow between them reads as
 *           glow; the thuluth mark's are not, and at the same setting the
 *           spaces between the strokes filled in and the whole thing became a
 *           luminous blob with a calligraphic outline.
 */
export const MARKS = {
  kufic: {
    name: 'kufic',
    trace: 'assets/img/logos/bismillah-kufic.json',
    poster: 'assets/img/logos/bismillah-kufic-poster.png',
    depth: 0.085,
    bevel: 0.0022,
    headroom: 1.11,
    emissive: 0.10,
  },
  thuluth: {
    name: 'thuluth',
    trace: 'assets/img/logos/bismillah-thuluth.json',
    poster: 'assets/img/logos/bismillah-thuluth-poster.png',
    depth: 0.034,
    bevel: 0.0012,
    headroom: 1.04,
    emissive: 0.045,
  },
};

/** Which mark a page carries. The Summary page keeps the one it had. */
export function markFor(page) {
  return page === 'home' ? MARKS.kufic : MARKS.thuluth;
}

/** Where the last page's mark is remembered. */
const REMEMBERED = 'hs-brand-mark';

/**
 * Did the mark just change?
 *
 * Every page here is a real navigation, so there is no moment at which both
 * marks exist and one could be dissolved into the other. What there is instead
 * is a memory: the page records which mark it showed, and the next page asks.
 * If the answer is a different mark, the new one ARRIVES — it spins in and
 * grows into place instead of simply being there.
 *
 * The first page of a session gets no arrival, because nothing changed: it is
 * the first mark you have seen, and animating it would be the header announcing
 * a transition that did not happen.
 *
 * Reading and writing both go through try/catch. `sessionStorage` throws rather
 * than returning null in a locked-down browser, and a decorative animation is
 * not worth a broken header.
 */
export function arriving(mark) {
  let previous = null;
  try {
    previous = window.sessionStorage.getItem(REMEMBERED);
    window.sessionStorage.setItem(REMEMBERED, mark.name);
  } catch {
    return false;
  }
  return !!previous && previous !== mark.name;
}
