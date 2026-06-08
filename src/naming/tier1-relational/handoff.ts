// /naming/tier1-relational — the folded-in T1<->T2 handoff trigger (R4; spec §2).
//
// The A-E taxonomy doubles as the router: a grip that CANNOT be framed by A-C
// (home / home-transposed / diatonic-function) is the signal to hand off to Tier-2
// absolute naming. This helper lets the UI / integrator detect that from a Tier1Result
// (or directly from a frame) without re-deriving the rule.

import type { Tier1Result } from './types';

/** True when a Tier-1 result has no relational frame and must be named absolutely (T2). */
export function shouldHandoffToTier2(result: Tier1Result): boolean {
  return result.frame === null && result.handoff.toTier2;
}
