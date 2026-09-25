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
 * retention/model.js — the soil-water retention surface.
 *
 * WHAT IS BEING DRAWN
 * -------------------
 * Every other 3D object on this site is a picture of the CV: who was written
 * with, when people joined, how long a post lasted. This one is a picture of
 * the subject. It is the soil-water retention curve — how much water a soil
 * holds against how hard the soil is pulling on it — and it is a surface rather
 * than a curve because there is a third axis that matters here more than
 * anywhere else in the field:
 *
 *   x   matric suction, 0.1 to 100 000 kPa, on a log scale because a retention
 *       curve spans six orders of magnitude and a linear axis shows one of them
 *   z   void ratio: how loosely the soil is packed
 *   y   degree of saturation, 0 to 1
 *
 * WHY VOID RATIO IS THE THIRD AXIS
 * --------------------------------
 * Because it is the question this group's most-cited paper asks. "Water
 * retention and volumetric characteristics of intact and re-compacted loess"
 * (2016, 277 citations) is about exactly this: the same soil, packed two ways,
 * holds water differently. Compacting a loess destroys the open structure that
 * held water at low suction, so the curve slides. A single curve cannot show
 * that. A surface is the shape of the finding.
 *
 * THE MODEL
 * ---------
 * Van Genuchten (1980), which is the standard closed form for this curve:
 *
 *     Se = [ 1 + (alpha * psi)^n ] ^ -m ,      m = 1 - 1/n
 *     Sr = Sres + (1 - Sres) * Se
 *
 * `alpha` is the inverse of the air-entry value — the suction at which air
 * first gets into the pores — and `n` is how sharply the curve falls once it
 * does. The void-ratio dependence is put on `alpha`, following the usual
 * argument that a looser soil has larger pores, a lower air-entry value and
 * therefore a larger alpha:
 *
 *     alpha(e) = alpha_ref * (e / e_ref) ^ beta
 *
 * WHAT THESE NUMBERS ARE, AND ARE NOT
 * -----------------------------------
 * **The parameters in `data/retention.json` are illustrative defaults chosen to
 * show the SHAPE of the relationship. They are not measurements, and they are
 * not attributed to any publication.** The page says so where a reader can see
 * it.
 *
 * That is a deliberate choice and not a placeholder to be forgotten: putting
 * invented numbers on a researcher's own website under the heading of their own
 * field would be worse than drawing nothing. If the published parameters for a
 * real soil are dropped into that file — with the citation in `source` — the
 * surface becomes a figure rather than a diagram, and nothing else has to
 * change.
 */

/**
 * Degree of saturation at one suction, for one set of parameters.
 *
 * @param {number} psi        matric suction, kPa. Zero or less is full saturation.
 * @param {number} alpha      1/kPa
 * @param {number} n          > 1
 * @param {number} residual   residual degree of saturation, 0..1
 */
export function saturation(psi, alpha, n, residual) {
  if (!(psi > 0)) return 1;
  const m = 1 - 1 / n;
  const se = Math.pow(1 + Math.pow(alpha * psi, n), -m);
  return residual + (1 - residual) * se;
}

/**
 * `alpha` for a given void ratio.
 *
 * Looser soil, bigger pores, lower air-entry value, larger alpha. `beta` is how
 * strongly the packing matters; at zero the surface becomes a single curve
 * extruded sideways, which is exactly the picture this view exists to replace.
 */
export function alphaFor(e, { alphaRef, eRef, beta }) {
  const ratio = Math.max(0.05, e) / Math.max(0.05, eRef);
  return alphaRef * Math.pow(ratio, beta);
}

/** The air-entry value implied by an alpha, in kPa — the readable form of it. */
export const airEntry = (alpha) => 1 / alpha;

/**
 * The surface, as a grid of samples.
 *
 * Returned as plain numbers rather than geometry: the renderer decides what to
 * do with them, the checks can assert on them, and neither needs Three.js.
 *
 * @param {object} p              parameters, as in data/retention.json
 * @param {number} cols           samples along the suction axis
 * @param {number} rows           samples along the void-ratio axis
 * @returns {{cols, rows, suction: number[], voids: number[], sat: Float32Array}}
 */
export function sampleSurface(p, cols = 72, rows = 40) {
  const { suctionMin, suctionMax, voidMin, voidMax, n, residual } = p;
  const logMin = Math.log10(suctionMin);
  const logMax = Math.log10(suctionMax);

  const suction = new Array(cols);
  for (let i = 0; i < cols; i++) {
    suction[i] = Math.pow(10, logMin + ((logMax - logMin) * i) / (cols - 1));
  }

  const voids = new Array(rows);
  for (let j = 0; j < rows; j++) {
    voids[j] = voidMin + ((voidMax - voidMin) * j) / (rows - 1);
  }

  const sat = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    const alpha = alphaFor(voids[j], p);
    for (let i = 0; i < cols; i++) {
      sat[j * cols + i] = saturation(suction[i], alpha, n, residual);
    }
  }

  return { cols, rows, suction, voids, sat };
}

/**
 * Where a sample sits in the box the surface is drawn in.
 *
 * The suction axis is the log of the suction, so that six decades are six equal
 * steps — which is how every retention curve in the literature is plotted, and
 * the only way the interesting part of the curve is visible at all.
 */
export function placeSample(i, j, grid, p, box) {
  const logMin = Math.log10(p.suctionMin);
  const logMax = Math.log10(p.suctionMax);
  const tx = (Math.log10(grid.suction[i]) - logMin) / (logMax - logMin);
  const tz = grid.rows > 1 ? j / (grid.rows - 1) : 0.5;
  const sr = grid.sat[j * grid.cols + i];
  return [
    (tx - 0.5) * box.width,
    (sr - 0.5) * box.height,
    (tz - 0.5) * box.depth,
  ];
}
