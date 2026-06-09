// /naming/tier1-relational — the Tier-1 RELATIONAL namer output contract.
//
// Tier-1 names a shape as a FUNCTION OF THE TUNING'S DRONES, anchored to the home
// context, and names dissonance-against-the-pedal as a first-class textural device
// (kb/TIER1-VOCABULARY-SPEC.md; ADR 0002/0003/0004). The A-E taxonomy in the spec
// (§2) is reported here as: a decomposition (drones vs active voices), a frame (A-C),
// drone roles (D), pairwise tension-vs-pedal (E), an assembled relational sentence,
// per-claim traces (ADR 0003 grounding), and the T1<->T2 handoff flag (R4).
//
// Everything checkable carries a trace: either a KB rule id (the rule supplied the
// phrase + provenance; the engine filled the {slots} with computed values) or
// "computed" (a value a tool produced). No checkable fact originates in a model's head.

import type { GradedTension, PitchClass } from '../../core';
import type { ProvenanceKind } from '../../kb';

/** A ringing open string (fret 0): a drone the frame is read against. */
export interface DroneVoice {
  readonly string: number;
  readonly pitch: number;
  readonly pitchClass: PitchClass;
}

/** A fretted note (fret > 0): an active voice that carries the chord identity. */
export interface ActiveVoice {
  readonly string: number;
  readonly fret: number;
  readonly pitch: number;
  readonly pitchClass: PitchClass;
}

/** The shape split into its two channels (spec §1): ringing drones vs active voices. */
export interface Decomposition {
  readonly drones: readonly DroneVoice[];
  readonly activeVoices: readonly ActiveVoice[];
}

/** A-C frame category (spec §2): home / home-transposed / modification /
 *  diatonic-function. A `null` frame (with handoff.toTier2) is the absence of all A-C. */
export type FrameCategory =
  | 'home'
  | 'home-transposed'
  | 'modification'
  | 'diatonic-function';

/** The frame (A-C): the headline relational identity, joined to a relational-vocabulary
 *  rule. Slots are filled with COMPUTED values; `phrase` is the grounded baseline. */
export interface Frame {
  readonly category: FrameCategory;
  /** Canonical term from the matched rule (e.g. "diatonic function"). */
  readonly term: string;
  /** Grounded baseline sentence with {slots} filled by computed values. */
  readonly phrase: string;
  /** Roman numeral of the chord root vs the tonic (diatonic-function / home-transposed). */
  readonly romanNumeral?: string;
  /** The resulting chord's root pitch class. */
  readonly chordRoot?: PitchClass;
  /** Human chord name, e.g. "C major". */
  readonly chordName?: string;
  /** The relational-vocabulary rule id this frame was joined to (the trace). */
  readonly ruleId: string;
  /** Provenance kind of that rule (always "theory" for the global rules). */
  readonly provenanceKind: ProvenanceKind;
}

/** A drone role (D): one open string's degree relative to the resulting chord root,
 *  joined to a drone-role rule by { droneDegree }. */
export interface DroneRole {
  readonly string: number;
  /** Degree of the open string vs the chord root, e.g. 9, 5, 1, 3. */
  readonly droneDegree: number;
  readonly term: string;
  readonly phrase: string;
  readonly tension?: GradedTension;
  readonly ruleId: string;
}

/** A pairwise tension-vs-pedal reading (E): one active voice against one drone,
 *  graded on the interval-class tension scale, joined to a tension-table rule. */
export interface TensionVsPedal {
  readonly activeString: number;
  readonly droneString: number;
  readonly intervalClass: number;
  readonly tension: GradedTension;
  readonly rank: number;
  readonly ruleId: string;
}

/** A per-claim grounding trace: a KB rule id, or the literal "computed" (ADR 0003). */
export interface Trace {
  readonly claim: string;
  readonly source: string;
}

/** The T1<->T2 router (R4): true when NO A-C frame fits, signalling Tier-2 absolute naming. */
export interface Handoff {
  readonly toTier2: boolean;
  readonly reason: string;
}

/** The full Tier-1 relational reading of a shape. */
export interface Tier1Result {
  readonly decomposition: Decomposition;
  readonly frame: Frame | null;
  readonly droneRoles: readonly DroneRole[];
  readonly tensionVsPedal: readonly TensionVsPedal[];
  /** The assembled relational sentence from the filled phrase template(s). */
  readonly sentence: string;
  readonly traces: readonly Trace[];
  readonly handoff: Handoff;
}
