// /mcp — the uniform grounding CONTRACT for every intent tool + resource.
//
// This is the M3 spine's load-bearing honesty seam (docs/03-architecture.md "every
// resource/tool returns truth + explanation + reasoning chain"; ADR 0003 the testable
// grounding contract). Defined ONCE here and re-exported through the barrel so every
// tool and the grounding harness bind to the SAME shape.
//
// THE RULE (ADR 0003): every musically-CHECKABLE assertion that appears in a tool's
// `explanation` or `truth` must surface as a Claim whose `trace` is either:
//   - "computed"  — a value a tool itself produced (identify, nameTier1, findVoicings…),
//   - or an existing KB id — a rule id (loadRules), card id / shape id (loadGrammarCard),
//     or an affective vibe id (loadAffective).
// No checkable claim may be untraceable — that is confabulation, and the harness fails
// it. EDITORIAL claims (affective/taste, provenance.kind 'editorial') are the ONE
// exception to "checkable": they carry `editorial: true` AND must be HEDGED in prose
// ("usually", "often", "tends to") so the seam between fact and taste is explicit.

/**
 * A per-claim grounding trace (ADR 0003). The literal "computed" means a tool produced
 * the value; any other string MUST be an existing KB entry id (rule / card / shape /
 * affective vibe). The grounding harness enumerates all valid KB ids and validates that
 * every non-"computed" trace is in that set.
 */
export type Trace = 'computed' | string;

/** The hedge words an editorial claim MUST contain (so taste is never stated as fact). */
export const HEDGE_WORDS: readonly string[] = [
  'usually',
  'often',
  'tends to',
  'tend to',
  'typically',
  'generally',
  'commonly',
];

/** True when `text` contains at least one hedge word (case-insensitive). */
export function isHedged(text: string): boolean {
  const lower = text.toLowerCase();
  return HEDGE_WORDS.some((w) => lower.includes(w));
}

/**
 * One grounded assertion. `text` is the human sentence; `trace` is its provenance.
 * `editorial: true` marks a taste/affective claim — it is exempt from the "checkable ->
 * traceable-to-computed-or-KB" rule, but in exchange its `trace` MUST be a KB id (the
 * affective vibe) and its `text` MUST be hedged.
 */
export interface Claim {
  readonly text: string;
  readonly trace: Trace;
  readonly editorial?: boolean;
}

/**
 * The uniform result every intent tool returns:
 *   - truth: the structured engine output (the verifiable payload),
 *   - explanation: grounded prose, slots filled from computed values / KB phrases,
 *   - reasoningChain: the ordered steps that produced the answer (the "why"),
 *   - claims: the per-claim traces backing every checkable assertion above.
 */
export interface ToolResult<T> {
  readonly truth: T;
  readonly explanation: string;
  readonly reasoningChain: readonly string[];
  readonly claims: readonly Claim[];
}

/** Mint a computed (tool-produced) claim. */
export function computedClaim(text: string): Claim {
  return { text, trace: 'computed' };
}

/** Mint a KB-grounded claim (trace = an existing rule / card / shape id). */
export function kbClaim(text: string, kbId: string): Claim {
  return { text, trace: kbId };
}

/**
 * Mint an EDITORIAL claim (affective/taste), traced to an affective vibe id. Throws if
 * `text` is not hedged — editorial taste stated as bare fact is exactly what ADR 0003
 * forbids, so we fail loudly at construction rather than leak an unhedged claim.
 */
export function editorialClaim(text: string, vibeId: string): Claim {
  if (!isHedged(text)) {
    throw new Error(
      `editorialClaim: editorial claim must be hedged (usually/often/tends to): "${text}"`,
    );
  }
  return { text, trace: vibeId, editorial: true };
}
