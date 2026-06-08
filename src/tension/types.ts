// Public types for the string-tension / setup advisor (/tension).
//
// Tuning input alignment: a `Tuning` here is structurally a subset of a KB grammar
// card (kb/schema/card.schema.json) — `strings` is open-string target pitches as
// MIDI integers, ordered string 1 -> string N. We do NOT invent a competing tuning
// model; a full card satisfies this shape. Array index carries no pitch-order
// meaning (re-entrant tunings allowed); tension is per-string and independent.

export type Material = 'plain-steel' | 'nickel-wound' | 'phosphor-bronze';
export type Instrument = 'electric' | 'acoustic';

export interface Tuning {
  /** Open-string target pitches as MIDI integers, string 1 -> string N. */
  strings: number[];
}

export interface GaugeSpec {
  /** String diameter in inches, e.g. 0.010. */
  gauge: number;
  /** If omitted, inferred from gauge + instrument (thin -> plain steel). */
  material?: Material;
}

/** Per-string gauge input. A bare number is a gauge in inches; null/undefined => estimate. */
export type GaugeInput = GaugeSpec | number | null | undefined;

export interface AdviseOptions {
  /**
   * Per-string gauges, string 1 -> string N (same order as `tuning.strings`).
   * Omit entirely, or leave individual entries null/undefined, to estimate the
   * gauge (every estimated string is flagged uncertain).
   */
  gauges?: GaugeInput[];
  /** Scale length. Default 25.5 (Fender-style). 24.75 is the Gibson-style preset. */
  scaleLength?: number;
  /** Units for `scaleLength`. Default 'in'. */
  scaleLengthUnits?: 'in' | 'mm';
  /** Default material family + comfort band + gauge target. Default 'electric'. */
  instrument?: Instrument;
}

export type TensionBand = 'very-loose' | 'loose' | 'comfortable' | 'tight' | 'very-tight';
export type BreakLevel = 'safe' | 'caution' | 'high' | 'over-limit' | 'unknown';
/** The three headline flags called for in docs/01-feature-set.md §E. */
export type Flag = 'floppy' | 'fine' | 'break-risk';

export interface Tension {
  lb: number;
  /** Newtons (lb x 4.4482216). */
  newton: number;
  /** Kilograms-force (lb x 0.45359237). */
  kgf: number;
}

export interface BreakAssessment {
  level: BreakLevel;
  /** Conservative breaking tension (lb). null when not modellable (wound). */
  breakTensionLb: number | null;
  /** tension / breakTension. null when not modellable. */
  fractionOfBreak: number | null;
  model: 'astm-a228-plain-steel' | 'wound-core-unavailable';
  /** True when the break assessment cannot be authoritatively computed. */
  uncertain: boolean;
  note?: string;
}

export interface GaugeResolved {
  gauge: number;
  material: Material;
  /** True when the gauge was estimated rather than supplied. */
  estimated: boolean;
  /** Catalog item id whose unit weight was used, e.g. 'PL010'. */
  item: string;
  /** Unit weight actually used (lb/in). */
  unitWeight: number;
  /** True when the supplied gauge was not an exact catalog entry (nearest used). */
  approximated: boolean;
}

export interface Recommendation {
  gauge: number;
  material: Material;
  item: string;
  tensionLb: number;
  reason: string;
}

export interface StringAdvice {
  /** 1-based string number (string 1 = first entry in `tuning.strings`). */
  stringIndex: number;
  midi: number;
  noteName: string;
  frequencyHz: number;
  gauge: GaugeResolved;
  tension: Tension;
  band: TensionBand;
  breakRisk: BreakAssessment;
  flag: Flag;
  /** A gauge suggestion when the current/estimated choice could be improved; else null. */
  recommendation: Recommendation | null;
  /** True if anything about this string's advice carries acknowledged uncertainty. */
  uncertain: boolean;
  notes: string[];
}

export interface SetupProvenance {
  formula: string;
  constant: number;
  unitWeightSource: string;
  wireStrengthSource: string;
  comfortBands: string;
  notes: string[];
}

export interface SetupAdvice {
  scaleLengthIn: number;
  instrument: Instrument;
  strings: StringAdvice[];
  totalTensionLb: number;
  totalTensionNewton: number;
  /** Headline warnings (break-risk strings, uncertainty notices). */
  warnings: string[];
  provenance: SetupProvenance;
}
