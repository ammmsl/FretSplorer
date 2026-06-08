// Open-string drone map (/projection) — the GRADED drone-tension channel.
//
// Satisfies the downstream-impact requirement (docs/09 Arch KB#3 / UI#1) that the
// projection layer carries a graded drone-tension value per OPEN string, WITHOUT
// touching the pinned ProjectedPosition / Project shapes (those stay degree-only;
// that is why this is a separate function and a separate output type).
//
// For each open string we compute the interval class between the open-string
// pitch class and the entity ROOT (the harmonic anchor), then map ic -> graded
// tension + numeric rank using the FIXED ADR-0004 / kb/rules/tension-table.yaml
// mapping, reproduced below as a pure const table (the engine MUST NOT load YAML):
//   ic 0      -> reinforce / 0   (unison / octave)
//   ic 5      -> consonant / 1   (perfect 4th / 5th)
//   ic 3 | 4  -> consonant / 1   (thirds / sixths)
//   ic 2      -> color     / 2   (whole-tone shimmer)
//   ic 1      -> bite      / 3   (semitone bite)
//   ic 6      -> unstable  / 4   (tritone)
//
// M0 SCOPE: the drone value here is computed vs the CONTEXT ROOT only — a single
// harmonic anchor. The full picture — pairwise active-voice-vs-each-drone tension
// joined with the KB phrasing + provenance — is Tier-1 work (M2), not this node.
// Degree colour and this drone map are two SEPARATE visual/data channels (docs/01
// §B; CONTEXT.md), so droneMap deliberately reports tension, never degree.

import type {
  GradedTension,
  IntervalClass,
  Midi,
  PitchClass,
  ProjectableEntity,
  Tuning,
} from '../core';
import { intervalClass, toPitchClass } from '../core';

/** A per-open-string graded drone-tension reading vs the entity root (M0). */
export interface OpenStringDrone {
  /** String index into `Tuning.openStrings`. */
  readonly string: number;
  /** The open-string sounding pitch. */
  readonly pitch: Midi;
  /** The open string's pitch class. */
  readonly pitchClass: PitchClass;
  /** Interval class between the open string and the entity root (the anchor). */
  readonly intervalClass: IntervalClass;
  /** Graded tension term (ADR 0004 5-level scale). */
  readonly tension: GradedTension;
  /** Ordinal rank 0..4, ascending tension (reinforce=0 … unstable=4). */
  readonly rank: number;
}

/** FIXED ic -> (tension, rank) map, reproducing kb/rules/tension-table.yaml /
 *  ADR 0004 exactly. Indexed by interval class 0..6. */
const TENSION_BY_IC: ReadonlyArray<{ tension: GradedTension; rank: number }> = [
  { tension: 'reinforce', rank: 0 }, // ic 0
  { tension: 'bite', rank: 3 }, //      ic 1
  { tension: 'color', rank: 2 }, //     ic 2
  { tension: 'consonant', rank: 1 }, // ic 3
  { tension: 'consonant', rank: 1 }, // ic 4
  { tension: 'consonant', rank: 1 }, // ic 5
  { tension: 'unstable', rank: 4 }, //  ic 6
];

/**
 * Compute the graded drone-tension of every open string against the entity root.
 *
 * @param entity  the projected Scale or Chord — only its `root` is read (the anchor).
 * @param tuning  the tuning whose open strings are the drones.
 */
export const droneMap = (
  entity: ProjectableEntity,
  tuning: Tuning,
): readonly OpenStringDrone[] => {
  const rootPc = entity.root as number;

  return tuning.openStrings.map((open, string) => {
    const pc = toPitchClass(open);
    const ic = intervalClass((pc as number) - rootPc);
    const { tension, rank } = TENSION_BY_IC[ic];
    return {
      string,
      pitch: open,
      pitchClass: pc,
      intervalClass: ic,
      tension,
      rank,
    };
  });
};
