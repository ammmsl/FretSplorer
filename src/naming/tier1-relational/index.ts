// /naming/tier1-relational — barrel. The Tier-1 RELATIONAL namer (the M2 differentiator):
// names a shape as a function of the tuning's drones, anchored to the home context, and
// names dissonance-against-the-pedal as a first-class texture (kb/TIER1-VOCABULARY-SPEC.md).
//
// Public API:
//   nameTier1(positions, tuning, card, rules): Tier1Result
//     - positions: readonly PlacedPosition[] (a shape; fret 0 = open/ringing drone).
//     - tuning:    Tuning (from /core; e.g. one of /ui fixtures TUNINGS).
//     - card:      GrammarCard from /kb loadGrammarCard(id).
//     - rules:     RuleBundle  from /kb loadRules().
//   shouldHandoffToTier2(result): boolean — the T1<->T2 router (R4).

export { nameTier1 } from './nameTier1';
export { shouldHandoffToTier2 } from './handoff';

export type {
  Tier1Result,
  Decomposition,
  DroneVoice,
  ActiveVoice,
  Frame,
  FrameCategory,
  DroneRole,
  TensionVsPedal,
  Trace,
  Handoff,
} from './types';
