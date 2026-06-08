// Comfort/feel thresholds and break-risk safety margins.
//
// IMPORTANT — provenance kind: EDITORIAL (heuristic), not physical law. Unlike the
// unit weights, the formula, and the A228 breaking tensions (all authoritative),
// "floppy" vs "comfortable" vs "tight" is a perceptual judgement with no hard
// physical boundary. These bands are therefore HEDGED guidance, centred on the
// per-string tensions of D'Addario's own standard light/regular sets for each
// instrument (electric ~15-18 lb/string; acoustic ~24-31 lb/string — acoustics are
// built for markedly higher tension). They are tunable and must be spoken as
// "tends to feel..." not "is".
//
// The break-risk margins below ARE applied on top of an authoritative breaking
// tension (A228); the FRACTIONS are the editorial safety choice (how much headroom
// to demand), the breaking tension itself is not.

import type { Instrument } from '../types';

export interface ComfortBand {
  /** Below this (lb) the string tends to feel slack/floppy. */
  floppyBelowLb: number;
  /** Below this (lb) it is light but playable. */
  looseBelowLb: number;
  /** Above this (lb) it starts to feel stiff/tight. */
  tightAboveLb: number;
  /** Above this (lb) it feels very stiff. */
  veryTightAboveLb: number;
  /** Target tension (lb) used when recommending/estimating a gauge. */
  targetLb: number;
}

export const COMFORT_BANDS: Record<Instrument, ComfortBand> = {
  electric: {
    floppyBelowLb: 11,
    looseBelowLb: 13,
    tightAboveLb: 20,
    veryTightAboveLb: 24,
    targetLb: 16,
  },
  acoustic: {
    floppyBelowLb: 18,
    looseBelowLb: 24,
    tightAboveLb: 33,
    veryTightAboveLb: 38,
    targetLb: 28,
  },
};

export const COMFORT_SOURCE = {
  kind: 'editorial' as const,
  note:
    'Heuristic feel bands centred on D’Addario standard-set per-string tensions ' +
    '(electric light/regular ~15-18 lb; acoustic light ~24-31 lb). Spoken hedged.',
};

/**
 * Break-risk safety margins, expressed as a fraction of the authoritative
 * (A228, min-tensile) breaking tension. Applied to PLAIN STEEL only.
 *   T/Tbreak < caution           -> safe
 *   caution <= T/Tbreak < high   -> caution
 *   high <= T/Tbreak < 1.0       -> high  (treated as break-risk)
 *   T/Tbreak >= 1.0              -> over-limit (treated as break-risk)
 */
export const BREAK_MARGIN = {
  cautionFraction: 0.7,
  highFraction: 0.85,
};
