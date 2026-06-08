// /naming/tier3-music21 — barrel. Lazy, client-side Pyodide + music21 Tier-3
// analyzer (ADR 0008): functional roman-numeral analysis + voicing anatomy over
// the full pitch multiset. Loading is DEFERRED to first use; never at import.

export { loadTier3, analyzeTier3, buildAnalyzeCall, PY_OPS } from './tier3';
export type {
  Tier3Result,
  Tier3Roman,
  Tier3Anatomy,
  Tier3Options,
  PyRuntime,
  PyRuntimeLoader,
} from './tier3';
