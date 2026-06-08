// Conversation view-model (/ui) — the PURE, tested core of the M3 conversation surface
// (the product gate; docs/04-user-intent-flows.md "design the surface around intents";
// docs/03 "truth + explanation + reasoning chain"; ADR 0003 the grounding contract).
//
// There is NO LLM in this static client app (ADR 0008). The "conversation" is a
// DETERMINISTIC INTENT ROUTER over the in-process MCP tools (/mcp): a user turn is
// parsed for a known intent / vibe keyword and dispatched to the matching tool against
// the FOCUSED neck's grip + tuning (deixis -> the focus pointer, docs/04). The tool
// returns a uniform ToolResult<…> (truth + explanation + reasoningChain + per-claim
// traces); this module turns that into a render-ready TurnView the React panel paints.
//
// Two seams, both pure and unit-tested here (React is NOT tested):
//   - route(turnText)        -> the parsed Intent (which tool + any vibe argument),
//   - buildTurnView(result)  -> the model line + reasoning chain + the VISIBLE traces
//     (computed / KB id), with editorial taste-claims kept HEDGED and marked as taste.
// Making the grounding visible is the whole point of the product (docs/03), so the
// trace affordance is first-class here, not an afterthought.

import type { Claim, ToolResult } from '../mcp';
import { isHedged } from '../mcp';

// ─────────────────────────────────────────────────────────────────────────────
// Intent routing — parse a user turn to a known intent (docs/04 verbs)
// ─────────────────────────────────────────────────────────────────────────────

/** The intents the deterministic router can dispatch (docs/04 verbs). */
export type IntentKind =
  | 'feeling' // make it dreamier / darker / more open -> feelingToOptions
  | 'identify' // what is this / what am I holding -> mcpIdentify
  | 'function' // what does this do -> functionOf
  | 'voicings' // easier way -> findVoicingsTool
  | 'neighbors' // where can this go -> neighbors (adjacency / voice-leading)
  | 'translate' // …in DADGAD? / morph -> translate (same pitches on another tuning)
  | 'setup' // will this feel floppy? -> adviseSetupTool (physical tension)
  | 'unknown'; // no known intent matched

/**
 * A parsed user turn. `vibe` is set only for the affective ('feeling') intent; `target` is
 * the resolved destination tuning id for a 'translate' turn (e.g. "in dadgad" -> "dadgad").
 */
export interface Intent {
  readonly kind: IntentKind;
  /** The affective vibe id/word for 'feeling' turns (e.g. "dreamier"), else undefined. */
  readonly vibe?: string;
  /** The destination tuning id for 'translate' turns (e.g. "dadgad"), else undefined. */
  readonly target?: string;
  /** The raw turn text, normalised (trimmed, lower-cased) — for echoing the user line. */
  readonly normalized: string;
}

/** The vibe words the router recognises, mapped to their KB vibe id (dictionary.yaml). */
const VIBE_KEYWORDS: ReadonlyArray<{ readonly match: readonly string[]; readonly id: string }> = [
  { match: ['dreamier', 'dreamy', 'dream', 'ethereal', 'hazy'], id: 'dreamier' },
  { match: ['darker', 'dark', 'moodier', 'moody', 'heavier', 'heavy'], id: 'darker' },
  { match: ['more open', 'opener', 'more-open', 'airier', 'airy', 'spacious'], id: 'more-open' },
];

/**
 * Tuning names the router recognises as a TRANSLATE target, mapped to the tuning id. Ordered
 * most-specific-first so "double drop d" is matched before "drop d" (a substring of it) and
 * "open d/e/c/g" before the bare letter. Kept local (not imported from fixtures) so route()
 * stays a pure, self-contained parser.
 */
const TUNING_KEYWORDS: ReadonlyArray<{ readonly match: readonly string[]; readonly id: string }> = [
  { match: ['double drop d', 'double-drop d', 'double drop', 'double-drop-d'], id: 'double-drop-d' },
  { match: ['open g'], id: 'open-g' },
  { match: ['open d'], id: 'open-d' },
  { match: ['open e'], id: 'open-e' },
  { match: ['open c'], id: 'open-c' },
  { match: ['dadgad'], id: 'dadgad' },
  { match: ['drop d', 'drop-d'], id: 'drop-d' },
  { match: ['standard', 'eadgbe'], id: 'eadgbe' },
];

/** Find the first tuning name mentioned in the text (most-specific-first), or undefined. */
export function findTargetTuning(normalized: string): string | undefined {
  for (const t of TUNING_KEYWORDS) {
    if (t.match.some((w) => normalized.includes(w))) return t.id;
  }
  return undefined;
}

/**
 * route(turnText) — the deterministic intent parser. Order matters: the affective
 * ("make it X") path is checked first because its trigger words are the most specific,
 * then identify / function / voicings by their keyword families. Returns 'unknown' (with
 * the normalised text preserved) when nothing matches, so the surface can answer honestly
 * rather than misfire a tool.
 */
export function route(turnText: string): Intent {
  const normalized = turnText.trim().toLowerCase();

  // 1. Affective vibe path — "make it dreamier", "darker", "more open" (the editorial seam).
  for (const v of VIBE_KEYWORDS) {
    if (v.match.some((w) => normalized.includes(w))) {
      return { kind: 'feeling', vibe: v.id, normalized };
    }
  }

  // 2. Setup / physical tension — "will this feel floppy?", "too loose/tight", gauges. The
  //    orthogonal PHYSICAL question (adviseSetup), checked early so "floppy/tension/gauge"
  //    never falls through to a harmonic intent.
  if (
    normalized.includes('floppy') ||
    normalized.includes('flabby') ||
    normalized.includes('tension') ||
    normalized.includes('gauge') ||
    normalized.includes('setup') ||
    normalized.includes('too loose') ||
    normalized.includes('too tight') ||
    normalized.includes('slinky') ||
    normalized.includes('string break') ||
    normalized.includes('break a string')
  ) {
    return { kind: 'setup', normalized };
  }

  // 3. Translate / morph — "…in DADGAD?", "same shape in open d", "translate", "morph". A
  //    named target tuning + a move word triggers re-placing the SAME pitches on that tuning.
  {
    const target = findTargetTuning(normalized);
    const moveWord =
      normalized.includes('translate') ||
      normalized.includes('morph') ||
      normalized.includes('move to') ||
      normalized.includes('move it to') ||
      normalized.includes('same shape') ||
      normalized.includes('what about') ||
      normalized.includes(' in ') ||
      normalized.startsWith('in ');
    if (target && moveWord) {
      return { kind: 'translate', target, normalized };
    }
  }

  // 4. Neighbours / adjacency — "where can this go?", "what's nearby", small voice-leading
  //    moves. Distinct from the function "where does this GO" (resolution) below.
  if (
    normalized.includes('where can this go') ||
    normalized.includes('where can i go') ||
    normalized.includes('where else') ||
    normalized.includes('neighbour') ||
    normalized.includes('neighbor') ||
    normalized.includes('nearby') ||
    normalized.includes("what's near") ||
    normalized.includes('whats near') ||
    normalized.includes('small move') ||
    normalized.includes('one step')
  ) {
    return { kind: 'neighbors', normalized };
  }

  // 5. "what does this do" / function — checked before identify ("what is this") because
  //    both start with "what", and the function family is the more specific phrasing.
  if (
    normalized.includes('what does') ||
    normalized.includes('what do') ||
    normalized.includes('function') ||
    normalized.includes('where does this go') ||
    normalized.includes('resolve')
  ) {
    return { kind: 'function', normalized };
  }

  // 3. Identify — "what is this", "what am I holding", "what's this".
  if (
    normalized.includes('what is this') ||
    normalized.includes("what's this") ||
    normalized.includes('whats this') ||
    normalized.includes('what am i holding') ||
    normalized.includes('what am i playing') ||
    normalized.includes('identify') ||
    normalized.includes('name this')
  ) {
    return { kind: 'identify', normalized };
  }

  // 4. Easier way / voicings — "easier way", "easier", "simpler", "another way".
  if (
    normalized.includes('easier') ||
    normalized.includes('simpler') ||
    normalized.includes('another way') ||
    normalized.includes('other way') ||
    normalized.includes('voicing')
  ) {
    return { kind: 'voicings', normalized };
  }

  return { kind: 'unknown', normalized };
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn view-model — a ToolResult<…> -> render-ready turn (truth + traces visible)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One render-ready trace row: the human claim sentence + its provenance label + whether
 * it is editorial taste (hedged). `traceKind` distinguishes a tool-computed value from a
 * KB-grounded one so the panel can badge them differently (the honesty seam, ADR 0003).
 */
export interface TraceView {
  readonly text: string;
  /** 'computed' (a tool produced it) or 'kb' (an existing rule/card/shape/vibe id). */
  readonly traceKind: 'computed' | 'kb';
  /** The literal trace token: "computed", or the KB id the claim points at. */
  readonly traceId: string;
  /** True for editorial/affective taste claims — rendered as taste, never asserted fact. */
  readonly editorial: boolean;
  /** True when the claim text is hedged ("usually"/"often"/…). Editorial claims must be. */
  readonly hedged: boolean;
}

/** A spawnable comparison option (feelingToOptions) — a per-string grip on the tuning. */
export interface OptionView {
  readonly symbol: string;
  /** Per-string frets aligned to tuning.openStrings: fret number, 0 = open, null = muted. */
  readonly frets: readonly (number | null)[];
  /** Playability flag (computed) for the option, or null when no voicing was found. */
  readonly playability: string | null;
}

/** The render-ready turn the Conversation panel paints. */
export interface TurnView {
  /** The model's spoken line — the tool's grounded explanation prose. */
  readonly modelLine: string;
  /** The ordered "why" steps (expandable in the UI). */
  readonly reasoningChain: readonly string[];
  /** Every checkable claim's trace, made VISIBLE (the product's whole point). */
  readonly traces: readonly TraceView[];
  /** Comparison options to SPAWN as necks beside the focus (feeling intent only). */
  readonly options: readonly OptionView[];
  /** True when ANY claim is editorial taste — the panel can flag the turn as opinion. */
  readonly hasEditorial: boolean;
}

/** Classify one Claim's trace as computed vs a KB id, preserving its editorial/hedge flags. */
function toTraceView(claim: Claim): TraceView {
  const isComputed = claim.trace === 'computed';
  return {
    text: claim.text,
    traceKind: isComputed ? 'computed' : 'kb',
    traceId: claim.trace,
    editorial: claim.editorial === true,
    hedged: isHedged(claim.text),
  };
}

/**
 * buildTurnView(result, options?) — fold a uniform ToolResult into a TurnView. The
 * explanation becomes the model line; the reasoning chain is carried verbatim; every
 * claim becomes a visible TraceView (computed vs KB id, editorial taste kept hedged).
 * `options` are the spawnable comparison grips (only the feeling intent supplies them);
 * they are passed in already-shaped (the React layer maps RankedVoicing -> OptionView)
 * so this stays free of the voicings types and trivially testable.
 */
export function buildTurnView<T>(
  result: ToolResult<T>,
  options: readonly OptionView[] = [],
): TurnView {
  const traces = result.claims.map(toTraceView);
  return {
    modelLine: result.explanation,
    reasoningChain: result.reasoningChain,
    traces,
    options,
    hasEditorial: traces.some((t) => t.editorial),
  };
}

/** A short, human label for an intent (for echoing what the router understood). */
export function intentLabel(kind: IntentKind): string {
  switch (kind) {
    case 'feeling':
      return 'feeling -> options';
    case 'identify':
      return 'identify';
    case 'function':
      return 'function';
    case 'voicings':
      return 'easier voicings';
    case 'neighbors':
      return 'where can it go';
    case 'translate':
      return 'translate / morph';
    case 'setup':
      return 'string tension';
    case 'unknown':
      return 'unrecognised';
  }
}
