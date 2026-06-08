// Plain-steel breaking-tension model, grounded in the music-wire material spec.
//
// Plain guitar strings are high-carbon "music wire" (ASTM A228). Its ultimate
// tensile strength is diameter-dependent (thinner wire is drawn harder, so it is
// stronger per unit area). Breaking tension = tensile_strength(d) * cross-section.
//
// We use the MINIMUM published tensile strength for the diameter, which is the
// conservative (safety-favouring) choice: it yields the LOWEST breaking tension,
// so we warn earlier rather than later. This is the safety-critical half of the
// advisor (HARD STOP: never recommend a string that snaps).
//
// SCOPE: this applies to PLAIN STEEL only. Wound strings carry their load on a
// thin steel core whose diameter D'Addario does not publish per string; computing
// a break tension from the OUTER gauge would badly overestimate strength (unsafe),
// so wound break risk is reported as `unknown` rather than guessed. See
// docs/adr/0010.
//
// SOURCE: ASTM A228 music-wire tensile-strength table by diameter, as published in
// Gibbs Wire & Steel "Phosphor Coated Music Wire" technical data sheet
// (gibbswire.com), consistent with the ASTM A228 230,000-399,000 psi spec range.
// Retrieved 2026-06-08.

export interface WireStrengthEntry {
  /** Wire diameter in inches. */
  dia: number;
  /** Minimum ultimate tensile strength, psi. */
  minPsi: number;
  /** Maximum ultimate tensile strength, psi. */
  maxPsi: number;
}

export const WIRE_STRENGTH_SOURCE = {
  title: 'ASTM A228 music-wire tensile strength by diameter',
  url: 'http://www.gibbswire.com/pdf/pmw-phos-coated-music-wire.pdf',
  retrieved: '2026-06-08',
  note:
    'Min tensile strength used (conservative). Spec range 230-399 ksi; values are ' +
    'diameter-specific. Applies to plain steel; wound-core strength not modelled.',
};

// Ascending by diameter. (Covers well beyond the plain-steel gauge range we ship.)
export const A228_TENSILE: WireStrengthEntry[] = [
  { dia: 0.004, minPsi: 439000, maxPsi: 485000 },
  { dia: 0.005, minPsi: 426000, maxPsi: 471000 },
  { dia: 0.006, minPsi: 415000, maxPsi: 459000 },
  { dia: 0.007, minPsi: 407000, maxPsi: 449000 },
  { dia: 0.008, minPsi: 399000, maxPsi: 441000 },
  { dia: 0.009, minPsi: 393000, maxPsi: 434000 },
  { dia: 0.01, minPsi: 387000, maxPsi: 428000 },
  { dia: 0.011, minPsi: 382000, maxPsi: 422000 },
  { dia: 0.012, minPsi: 377000, maxPsi: 417000 },
  { dia: 0.013, minPsi: 373000, maxPsi: 412000 },
  { dia: 0.014, minPsi: 369000, maxPsi: 408000 },
  { dia: 0.015, minPsi: 365000, maxPsi: 404000 },
  { dia: 0.016, minPsi: 362000, maxPsi: 400000 },
  { dia: 0.018, minPsi: 356000, maxPsi: 393000 },
  { dia: 0.02, minPsi: 350000, maxPsi: 387000 },
  { dia: 0.022, minPsi: 345000, maxPsi: 382000 },
  { dia: 0.024, minPsi: 341000, maxPsi: 377000 },
  { dia: 0.026, minPsi: 337000, maxPsi: 373000 },
  { dia: 0.028, minPsi: 333000, maxPsi: 368000 },
  { dia: 0.03, minPsi: 330000, maxPsi: 365000 },
];

/**
 * Minimum tensile strength (psi) for a plain-steel diameter, linearly interpolated
 * between table points and clamped to the table ends.
 */
export function minTensilePsi(diaIn: number): number {
  const t = A228_TENSILE;
  if (diaIn <= t[0].dia) return t[0].minPsi;
  if (diaIn >= t[t.length - 1].dia) return t[t.length - 1].minPsi;
  for (let i = 1; i < t.length; i++) {
    if (diaIn <= t[i].dia) {
      const lo = t[i - 1];
      const hi = t[i];
      const f = (diaIn - lo.dia) / (hi.dia - lo.dia);
      return lo.minPsi + f * (hi.minPsi - lo.minPsi);
    }
  }
  return t[t.length - 1].minPsi;
}

/** Conservative breaking tension (lb) for a plain-steel string of diameter `diaIn`. */
export function breakTensionLbPlainSteel(diaIn: number): number {
  const area = Math.PI * (diaIn / 2) * (diaIn / 2); // in^2
  return minTensilePsi(diaIn) * area;
}
