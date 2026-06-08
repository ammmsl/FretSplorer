// Naming-ambiguity ranking weights (R5) — /projection.
//
// These constants REPRODUCE kb/rules/ranking-weights.yaml EXACTLY (schemaVersion 1).
// The ranking ALGORITHM is engine code (identify.ts); these WEIGHTS are tunable
// data. As with droneMap mirroring the tension table, the engine MUST NOT load YAML
// at runtime — the source of truth is the YAML file, mirrored here as a typed const
// so the build stays dependency-free and the values are checked by the compiler.
//
// If you change a number here, change kb/rules/ranking-weights.yaml to match (and
// vice-versa). See docs/06 R5; docs/03-architecture.md (ranked, never one forced answer).

/** Signed score adjustments, mirroring `weights:` in ranking-weights.yaml. */
export const WEIGHTS = {
  /** boost: candidate root is the tonic OR diatonic to the home key (biggest factor). */
  keyContextBias: 3.0,
  /** boost: computed bass IS the candidate's root -> prefer root-position over slash. */
  bassIsRoot: 2.0,
  /** LIGHT: guitarists omit the 5th constantly. */
  omit5thPenalty: -0.5,
  /** HEAVY: dropping the 3rd changes identity. */
  omit3rdPenalty: -3.0,
  /** HEAVY: an absent root is a weak reading. */
  omitRootPenalty: -3.0,
  /** per added/assumed tone in the symbol not actually sounding. */
  parsimonyPenalty: -1.0,
  /** tiny nudge toward the simpler name when scores tie. */
  simplicityTiebreak: 0.25,
} as const;

/** Surfacing policy, mirroring `surfacePolicy:` in ranking-weights.yaml. */
export const SURFACE_POLICY = {
  /** always one headline candidate. */
  primaryCount: 1,
  /** surface an alternate only if within this score gap of the primary. */
  alternateScoreGap: 1.5,
  /** hard cap on surfaced candidates — no long tail of weak guesses. */
  maxCandidates: 3,
} as const;
