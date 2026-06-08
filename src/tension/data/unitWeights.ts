// Authoritative string unit-weight (mass per unit length) tables.
//
// Unit weight (UW) is expressed in pounds per linear inch (lb/in), exactly as
// D'Addario publishes it, so it feeds `T = UW * (2*L*F)^2 / 386.4` directly.
//
// PROVENANCE / VALIDATION (see docs/adr/0009):
//   - Plain steel (PL) + nickel-plated-steel round wound (NW): D'Addario published
//     unit weights, cross-confirmed between two independent reproductions of the
//     D'Addario tension chart (they agree to the published 8 significant digits):
//       * the EverTune string-tension chart (reproduces D'Addario electric UWs), and
//       * the D'Addario "Fretted Instrument String Tension" chart (archived).
//   - Phosphor bronze (PB): D'Addario "Fretted Instrument String Tension" chart
//     (archived). Validated by recomputing the chart's own per-note reference
//     tensions from these UWs via the formula and matching to <1% (e.g. PB022 ->
//     B3 40.5 / A3 32.2 / G3 25.5 / D3 14.3 lb; PB053 -> E2 19.1 lb).
//   - The validation set is encoded as test fixtures in src/tension/__tests__.
//
// Materials covered: plain steel (thin/unwound), nickel-plated-steel round wound
// (electric), phosphor bronze round wound (acoustic). These are the common cases
// called for in docs/05-external-data.md and docs/01-feature-set.md §E.

import type { Material } from '../types';

export interface UnitWeightEntry {
  /** Catalog item id, e.g. 'PL010', 'NW046', 'PB053'. */
  item: string;
  /** Nominal string diameter in inches. */
  gauge: number;
  /** Unit weight in lb/in (pounds per linear inch). */
  uw: number;
  material: Material;
}

export interface UnitWeightSource {
  title: string;
  url: string;
  retrieved: string;
  attribution: string;
  note: string;
}

export const UNIT_WEIGHT_SOURCE: UnitWeightSource = {
  title:
    "D'Addario string tension data (Fretted Instrument String Tension chart + " +
    'EverTune cross-reference of D’Addario electric unit weights)',
  url: 'https://www.daddario.com/globalassets/pdfs/accessories/tension_chart_13934.pdf',
  retrieved: '2026-06-08',
  attribution:
    'Unit weights © D’Addario & Company, Inc. Reproduced for tension ' +
    'computation under fair-use of published technical specifications; not affiliated ' +
    'with or endorsed by D’Addario.',
  note:
    'PL/NW cross-confirmed across two independent reproductions; PB validated by ' +
    'recomputing the chart’s own reference tensions. See docs/adr/0009.',
};

// --- Plain steel (PL) -------------------------------------------------------
const PLAIN: ReadonlyArray<[string, number, number]> = [
  ['PL007', 0.007, 0.00001085],
  ['PL008', 0.008, 0.00001418],
  ['PL0085', 0.0085, 0.00001601],
  ['PL009', 0.009, 0.00001794],
  ['PL0095', 0.0095, 0.00001999],
  ['PL010', 0.01, 0.00002215],
  ['PL0105', 0.0105, 0.00002442],
  ['PL011', 0.011, 0.0000268],
  ['PL0115', 0.0115, 0.0000293],
  ['PL012', 0.012, 0.0000319],
  ['PL013', 0.013, 0.00003744],
  ['PL0135', 0.0135, 0.00004037],
  ['PL014', 0.014, 0.00004342],
  ['PL015', 0.015, 0.00004984],
  ['PL016', 0.016, 0.00005671],
  ['PL017', 0.017, 0.00006402],
  ['PL018', 0.018, 0.00007177],
  ['PL019', 0.019, 0.00007997],
  ['PL020', 0.02, 0.00008861],
  ['PL022', 0.022, 0.00010722],
  ['PL024', 0.024, 0.0001276],
  ['PL026', 0.026, 0.00014975],
];

// --- Nickel-plated-steel round wound (NW), electric -------------------------
const NICKEL: ReadonlyArray<[string, number, number]> = [
  ['NW017', 0.017, 0.00005524],
  ['NW018', 0.018, 0.00006215],
  ['NW019', 0.019, 0.00006947],
  ['NW020', 0.02, 0.00007495],
  ['NW021', 0.021, 0.00008293],
  ['NW022', 0.022, 0.00009184],
  ['NW024', 0.024, 0.00010857],
  ['NW026', 0.026, 0.00012671],
  ['NW028', 0.028, 0.00014666],
  ['NW030', 0.03, 0.00017236],
  ['NW032', 0.032, 0.00019347],
  ['NW034', 0.034, 0.0002159],
  ['NW036', 0.036, 0.00023964],
  ['NW038', 0.038, 0.00026471],
  ['NW039', 0.039, 0.00027932],
  ['NW042', 0.042, 0.00032279],
  ['NW044', 0.044, 0.00035182],
  ['NW046', 0.046, 0.00038216],
  ['NW048', 0.048, 0.00041382],
  ['NW049', 0.049, 0.00043014],
  ['NW052', 0.052, 0.00048109],
  ['NW054', 0.054, 0.00053838],
  ['NW056', 0.056, 0.00057598],
  ['NW059', 0.059, 0.00064191],
  ['NW060', 0.06, 0.00066542],
  ['NW062', 0.062, 0.00070697],
  ['NW064', 0.064, 0.00074984],
  ['NW066', 0.066, 0.00079889],
  ['NW068', 0.068, 0.00084614],
  ['NW070', 0.07, 0.00089304],
  ['NW072', 0.072, 0.00094124],
  ['NW074', 0.074, 0.00098869],
  ['NW080', 0.08, 0.00115011],
];

// --- Phosphor bronze round wound (PB), acoustic -----------------------------
// Coverage note: D'Addario's single-string chart omits a few mid set gauges
// (~.036-.047); the estimator falls back to the nearest available entry and
// flags the result uncertain.
const PHOSPHOR: ReadonlyArray<[string, number, number]> = [
  ['PB020', 0.02, 0.00008106],
  ['PB021', 0.021, 0.00008944],
  ['PB022', 0.022, 0.00009876],
  ['PB023', 0.023, 0.00010801],
  ['PB024', 0.024, 0.00011682],
  ['PB025', 0.025, 0.00012686],
  ['PB026', 0.026, 0.0001364],
  ['PB027', 0.027, 0.00014834],
  ['PB029', 0.029, 0.00017381],
  ['PB030', 0.03, 0.0001866],
  ['PB032', 0.032, 0.00021018],
  ['PB034', 0.034, 0.00023887],
  ['PB035', 0.035, 0.00025365],
  ['PB049', 0.049, 0.00036722],
  ['PB053', 0.053, 0.00041751],
  ['PB062', 0.062, 0.00045289],
  ['PB066', 0.066, 0.00049151],
];

function build(rows: ReadonlyArray<[string, number, number]>, material: Material): UnitWeightEntry[] {
  return rows.map(([item, gauge, uw]) => ({ item, gauge, uw, material }));
}

export const UNIT_WEIGHTS: UnitWeightEntry[] = [
  ...build(PLAIN, 'plain-steel'),
  ...build(NICKEL, 'nickel-wound'),
  ...build(PHOSPHOR, 'phosphor-bronze'),
];

const BY_ITEM = new Map(UNIT_WEIGHTS.map((e) => [e.item.toUpperCase(), e]));

export function entriesForMaterial(material: Material): UnitWeightEntry[] {
  return UNIT_WEIGHTS.filter((e) => e.material === material);
}

export function findByItem(item: string): UnitWeightEntry | undefined {
  return BY_ITEM.get(item.toUpperCase());
}

/** Nearest catalog entry of a given material to a target gauge (inches). */
export function nearestEntry(gauge: number, material: Material): UnitWeightEntry {
  const candidates = entriesForMaterial(material);
  let best = candidates[0];
  let bestDist = Math.abs(best.gauge - gauge);
  for (const e of candidates) {
    const d = Math.abs(e.gauge - gauge);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best;
}
