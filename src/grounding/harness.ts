// /grounding — the R9 grounding eval harness (docs/06 R9; ADR 0003).
//
// THE TESTABLE INVARIANT (ADR 0003 "The grounding contract"):
//   For any musically-checkable assertion A in a tool's output: either A is a value a
//   tool COMPUTED (trace "computed"), or A is the term/phrase of a KB entry carrying
//   provenance (trace = that entry's stable id). For kind in {definitional, theory,
//   derived} A is asserted; for `editorial` A is HEDGED. No checkable A may originate in
//   the model's own head — an untraceable assertion is confabulation = FAIL.
//
// This module makes that contract MEASURABLE: collectKbIds() enumerates the registry of
// legal trace targets; checkGrounding() walks a ToolResult's per-claim traces and reports
// every violation. The harness is the M3 gate — the representative set of real tool
// outputs must pass ok:true, and the harness must CATCH hand-built violations.

import { isHedged } from '../mcp';
import type { Claim, ToolResult } from '../mcp';
import { loadAffective, loadGrammarCard, loadRules } from '../kb';

// ─────────────────────────────────────────────────────────────────────────────
// The KB-id registry (the legal trace targets)
// ─────────────────────────────────────────────────────────────────────────────

/** The tunings whose grammar cards (+ movable-shape ids) contribute to the registry.
 *  The curated V1 set (docs/02) all have cards now EXCEPT standard "eadgbe", which is a
 *  deliberate handoff fall-through (absolute T2 naming is correct there); it resolves to
 *  null and contributes nothing, but enumerating it keeps the registry honest (ADR 0001). */
const KNOWN_TUNING_IDS: readonly string[] = [
  'open-g',
  'open-d',
  'open-e',
  'open-c',
  'dadgad',
  'drop-d',
  'double-drop-d',
  'eadgbe',
];

/**
 * A KB-id registry: the FULL set of valid trace targets, plus the subset whose
 * provenance.kind is `editorial` (the affective vibe ids). The editorial subset lets the
 * harness detect an editorial claim by its TRACE alone — even when a Claim forgot to set
 * `editorial: true` — so an unhedged taste claim cannot slip through untagged (ADR 0003:
 * editorial-kind entries MUST be hedged).
 */
export interface KbIdRegistry {
  /** Every valid KB id a trace may legally point at. */
  readonly all: ReadonlySet<string>;
  /** The ids whose KB entry is provenance.kind 'editorial' (affective vibes). */
  readonly editorial: ReadonlySet<string>;
}

/**
 * collectKbIds(): the FULL set of valid KB ids a trace may legally point at — the
 * registry the grounding contract validates against (ADR 0003 step 1). Gathers, from the
 * /kb loaders:
 *   - rule ids: every entry of the three global rule sets (relationalVocabulary,
 *     tensionTable, functionTendencies),
 *   - card ids + movable-shape ids: every known grammar card and its shapes,
 *   - affective vibe ids: every entry of the affective dictionary,
 *   - source ids: every key of the sources bibliography map.
 * Pure (reads the bundled KB). This is the union of legal trace targets; "computed" is
 * NOT a KB id (it is the runtime-computed tag) and is handled separately by checkGrounding.
 */
export function collectKbIds(): Set<string> {
  return new Set(collectRegistry().all);
}

/** The affective vibe ids (provenance.kind 'editorial') — the editorial trace targets. */
export function collectEditorialKbIds(): Set<string> {
  return new Set(collectRegistry().editorial);
}

/** Build the full registry (all ids + the editorial subset) in one pass. */
function collectRegistry(): KbIdRegistry {
  const all = new Set<string>();
  const editorial = new Set<string>();

  // Rule ids — the three global rule sets (provenance.kind 'theory').
  const rules = loadRules();
  for (const set of [
    rules.relationalVocabulary,
    rules.tensionTable,
    rules.functionTendencies,
  ]) {
    for (const r of set) all.add(r.id);
  }
  // Source bibliography ids (a trace may cite a source).
  for (const id of rules.sources.keys()) all.add(id);

  // Card ids + movable-shape ids (cards: 'definitional'; shapes: 'derived').
  for (const tuningId of KNOWN_TUNING_IDS) {
    const card = loadGrammarCard(tuningId);
    if (card == null) continue;
    all.add(card.id);
    for (const shape of card.movableShapes ?? []) all.add(shape.id);
  }

  // Affective vibe ids — provenance.kind 'editorial' (the hedged-only trace targets).
  for (const vibe of loadAffective().vibes) {
    all.add(vibe.id);
    if (vibe.provenance?.kind === 'editorial') editorial.add(vibe.id);
  }

  return { all, editorial };
}

// ─────────────────────────────────────────────────────────────────────────────
// The grounding report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The three ways a claim can violate the contract:
 *   - UNTRACEABLE: a checkable claim whose trace is neither "computed" nor a member of the
 *     KB-id registry — confabulation (a claim pointing at an id that does not exist).
 *   - UNHEDGED-EDITORIAL: an editorial claim (editorial:true OR traced to an editorial-kind
 *     KB entry) whose text contains NO hedge — taste stated as bare fact.
 *   - EMPTY-TRACE: a claim with a missing/empty trace (no provenance at all).
 */
export type ViolationKind =
  | 'UNTRACEABLE'
  | 'UNHEDGED-EDITORIAL'
  | 'EMPTY-TRACE';

/** One contract violation: which claim, why, and a human reason. */
export interface Violation {
  readonly kind: ViolationKind;
  /** The offending claim (verbatim, for the report). */
  readonly claim: Claim;
  /** A human-readable explanation of the violation. */
  readonly reason: string;
}

/** The harness verdict over one ToolResult: ok iff there are zero violations. */
export interface GroundingReport {
  readonly ok: boolean;
  readonly violations: readonly Violation[];
}

/** A trace that is missing or whitespace-only counts as empty. */
function isEmptyTrace(trace: string | undefined | null): boolean {
  return trace == null || trace.trim().length === 0;
}

/**
 * checkGrounding(result, kbIds): validate one ToolResult's per-claim traces against the
 * grounding contract (ADR 0003) and return a GroundingReport.
 *
 * For each claim, in order:
 *   1. EMPTY-TRACE  — no provenance at all (missing/blank trace).
 *   2. UNTRACEABLE  — trace is not "computed" AND not in the KB-id registry (confabulation).
 *   3. UNHEDGED-EDITORIAL — the claim is editorial (editorial:true, or its trace is an
 *      editorial-kind KB id) but its text carries no hedge word.
 * A claim flagged EMPTY-TRACE or UNTRACEABLE is not additionally hedge-checked (its
 * provenance is already broken). ok is true iff no violations were found.
 *
 * `kbIds` is normally collectKbIds(); pass `editorialIds` to enable trace-based editorial
 * detection (defaults to collectEditorialKbIds(), so the contract holds even if a Claim
 * omits `editorial: true`).
 */
export function checkGrounding(
  result: ToolResult<unknown>,
  kbIds: Set<string>,
  editorialIds: Set<string> = collectEditorialKbIds(),
): GroundingReport {
  const violations: Violation[] = [];

  for (const claim of result.claims) {
    const trace = claim.trace;

    // 1. Empty/missing trace — no provenance whatsoever.
    if (isEmptyTrace(trace)) {
      violations.push({
        kind: 'EMPTY-TRACE',
        claim,
        reason: `Claim has an empty/missing trace: "${claim.text}".`,
      });
      continue;
    }

    // 2. Traceability — "computed" is always legal; otherwise the trace MUST be a known
    //    KB id, else it is confabulation (a claim pointing at a non-existent source).
    const isComputed = trace === 'computed';
    const isKnownKbId = kbIds.has(trace);
    if (!isComputed && !isKnownKbId) {
      violations.push({
        kind: 'UNTRACEABLE',
        claim,
        reason: `Claim trace "${trace}" is neither "computed" nor a valid KB id (confabulation): "${claim.text}".`,
      });
      continue;
    }

    // 3. Editorial hedging — a claim is editorial if it is flagged editorial:true OR its
    //    trace points at an editorial-kind KB entry (an affective vibe). Editorial taste
    //    must be hedged so the fact/taste seam is explicit (ADR 0003).
    const isEditorial = claim.editorial === true || editorialIds.has(trace);
    if (isEditorial && !isHedged(claim.text)) {
      violations.push({
        kind: 'UNHEDGED-EDITORIAL',
        claim,
        reason: `Editorial claim (trace "${trace}") is not hedged — taste stated as fact: "${claim.text}".`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
