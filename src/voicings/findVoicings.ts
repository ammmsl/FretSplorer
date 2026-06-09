// /voicings — combinatorial fingerable-voicing search + a minimal playability flag.
//
// Sources honoured:
//  - docs/04 intent "find_voicings"; docs/09 [UI] "bring a minimal playability flag forward"; R6.
//  - Pitch math is the /core invariant: pitch(string, fret) = openStrings[string] + fret
//    (docs/03-architecture.md). MIDI ints are the universal coordinate.
//  - A Chord is an abstract pc-SET; a Voicing is a never-collapsed Midi MULTISET
//    (CONTEXT.md "Chord"/"Voicing"; pitch-model.ts §5; docs/06 R10).
//  - Bass = argmin(pitch), NOT lowest string index — handled inside core voicing()
//    (docs/06 R10). We never assume string order here either.
//
// Pure functions, no hidden state. Search is a straight per-string cartesian product
// over {muted} ∪ {frets whose pitch class ∈ chord.pitchClasses}, pruned to valid,
// playable shapes, then ranked by a small testable scoring function over features.

import type { Chord, Midi, Tuning, Voicing } from '../core';
import { toPitchClass, voicing } from '../core';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type PlayabilityFlag = 'easy' | 'moderate' | 'hard' | 'impossible';

export interface Playability {
  readonly flag: PlayabilityFlag;
  /** Fret span = max - min over the FRETTED (non-zero) frets. 0 if ≤1 fretted. */
  readonly fretSpan: number;
  /** Approximate finger count: distinct fretted (non-zero) fret positions. */
  readonly fingerCount: number;
}

export interface RankedVoicing {
  readonly voicing: Voicing;
  /** Per-string shape aligned to tuning.openStrings: fret number, 0 = open, null = muted. */
  readonly frets: readonly (number | null)[];
  readonly playability: Playability;
  readonly score: number;
}

export interface FindOpts {
  /** Highest fret to consider (inclusive). Default 15. */
  readonly maxFret?: number;
  /** Max number of ranked results returned. Default 8. */
  readonly limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tunable thresholds & weights (plain const objects — no enums, erasable syntax)
// ─────────────────────────────────────────────────────────────────────────────

/** Playability thresholds. A barre counts as one finger across same-fret strings. */
export const PLAYABILITY_THRESHOLDS = {
  /** Fret span above this is "hard". */
  hardSpan: 4,
  /** Fret span above this is "impossible". */
  impossibleSpan: 6,
  /** Distinct fretted positions above this, combined with a wide span, is "impossible". */
  maxFingers: 4,
  /** Span considered "wide" when paired with too many fingers. */
  wideSpan: 4,
  /** A shape whose span ≤ this and uses few fingers is "easy". */
  easySpan: 2,
  easyFingers: 3,
} as const;

/** Scoring weights. Higher score = better. Documented inline. */
export const SCORE_WEIGHTS = {
  /** Reward for the 3rd being present in the sounding set. */
  hasThird: 3,
  /** Reward for the 7th being present (when the chord defines one). */
  hasSeventh: 2,
  /** Reward for sounding every chord pitch class (completeness). */
  complete: 2,
  /** Playability bonus by flag. "impossible" shapes are pruned before scoring. */
  playability: { easy: 4, moderate: 2, hard: -2, impossible: -1000 },
  /** Penalty per muted string. */
  mutedPenalty: -0.5,
  /** Penalty per semitone of fret span. */
  spanPenalty: -0.4,
  /** Penalty per fret of lowest-position (prefer lower on the neck). */
  positionPenalty: -0.15,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Playability
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a shape by the FRETTED (non-zero) fret numbers only — open (0) and muted
 * strings cost no finger. `fretSpan` is max - min over the fretted positions (0 when
 * ≤1 fretted note). `fingerCount` approximates fingers as the count of DISTINCT
 * fretted positions (a barre across one fret ≈ one finger).
 *
 * Rules (docs/04 / R6): span > 4 → hard; span > 6, OR > maxFingers distinct fretted
 * positions across a wide (> wideSpan) span → impossible; a tight low-finger shape → easy.
 */
export function playability(frettedFrets: readonly number[]): Playability {
  const fretted = frettedFrets.filter((f) => f > 0);
  const distinct = Array.from(new Set(fretted)).sort((a, b) => a - b);
  const fingerCount = distinct.length;
  const fretSpan =
    distinct.length <= 1 ? 0 : distinct[distinct.length - 1] - distinct[0];

  const t = PLAYABILITY_THRESHOLDS;

  let flag: PlayabilityFlag;
  if (
    fretSpan > t.impossibleSpan ||
    (fingerCount > t.maxFingers && fretSpan > t.wideSpan)
  ) {
    flag = 'impossible';
  } else if (fretSpan > t.hardSpan) {
    flag = 'hard';
  } else if (fretSpan <= t.easySpan && fingerCount <= t.easyFingers) {
    flag = 'easy';
  } else {
    flag = 'moderate';
  }

  return { flag, fretSpan, fingerCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_FRET = 15;
const DEFAULT_LIMIT = 8;

/** Per-string candidate: a fret (0 = open) or null (muted). */
type StringOption = number | null;

/** Features used by the scoring function — extracted so scoring is a pure, testable fn. */
interface VoicingFeatures {
  readonly hasThird: boolean;
  readonly hasSeventh: boolean;
  readonly complete: boolean;
  readonly mutedCount: number;
  readonly fretSpan: number;
  readonly lowestFret: number;
  readonly flag: PlayabilityFlag;
}

/**
 * Score a voicing from its computed features. Pure and small so it is unit-testable
 * in isolation. See SCORE_WEIGHTS for the rationale of each term.
 */
export function scoreFeatures(f: VoicingFeatures): number {
  const w = SCORE_WEIGHTS;
  let s = 0;
  if (f.hasThird) s += w.hasThird;
  if (f.hasSeventh) s += w.hasSeventh;
  if (f.complete) s += w.complete;
  s += w.playability[f.flag];
  s += w.mutedPenalty * f.mutedCount;
  s += w.spanPenalty * f.fretSpan;
  s += w.positionPenalty * f.lowestFret;
  return s;
}

/**
 * Find fingerable voicings of `chord` on `tuning`. For each string the candidates
 * are "muted" plus every fret in 0..maxFret whose pitch class is in the chord. We
 * take the cartesian product across strings, keep shapes that (a) sound only chord
 * pitch classes, (b) contain the chord ROOT at least once, (c) use ≥ 3 sounding
 * strings, and (d) are not "impossible" to fret; then rank by score and cap.
 */
export function findVoicings(
  chord: Chord,
  tuning: Tuning,
  opts?: FindOpts,
): RankedVoicing[] {
  const maxFret = opts?.maxFret ?? DEFAULT_MAX_FRET;
  const limit = opts?.limit ?? DEFAULT_LIMIT;

  const chordPcs = new Set<number>(chord.pitchClasses);
  const rootPc = chord.root as number;

  // The 3rd and (optional) 7th, as pitch classes, for the completeness/quality reward.
  const thirdPc = pcAtOffsets(rootPc, [3, 4], chordPcs); // m3 or M3
  const seventhPc = pcAtOffsets(rootPc, [10, 11], chordPcs); // m7 or M7

  // Per-string candidate options: muted, plus each in-chord fret.
  const perString: StringOption[][] = tuning.openStrings.map((open) => {
    const options: StringOption[] = [null];
    for (let fret = 0; fret <= maxFret; fret++) {
      const pc = toPitchClass((open as number) + fret) as number;
      if (chordPcs.has(pc)) options.push(fret);
    }
    return options;
  });

  const results: RankedVoicing[] = [];

  const nStrings = perString.length;
  const shape: StringOption[] = new Array(nStrings).fill(null);

  const recurse = (stringIdx: number): void => {
    if (stringIdx === nStrings) {
      evaluateShape();
      return;
    }
    for (const opt of perString[stringIdx]) {
      shape[stringIdx] = opt;
      recurse(stringIdx + 1);
    }
    shape[stringIdx] = null;
  };

  const evaluateShape = (): void => {
    const frets: (number | null)[] = shape.slice();
    const soundingPitches: Midi[] = [];
    const soundingPcs = new Set<number>();
    let hasRoot = false;
    let soundingCount = 0;

    for (let s = 0; s < nStrings; s++) {
      const fret = frets[s];
      if (fret === null) continue;
      const pitch = ((tuning.openStrings[s] as number) + fret) as Midi;
      const pc = toPitchClass(pitch) as number;
      // By construction pc ∈ chordPcs already, but assert the invariant explicitly.
      if (!chordPcs.has(pc)) return;
      soundingPitches.push(pitch);
      soundingPcs.add(pc);
      if (pc === rootPc) hasRoot = true;
      soundingCount++;
    }

    if (soundingCount < 3) return;
    if (!hasRoot) return;

    const frettedFrets = frets.filter((f): f is number => f !== null && f > 0);
    const play = playability(frettedFrets);
    if (play.flag === 'impossible') return;

    const mutedCount = frets.filter((f) => f === null).length;
    const soundingFrets = frets.filter((f): f is number => f !== null);
    const lowestFret =
      soundingFrets.length === 0 ? 0 : Math.min(...soundingFrets);

    const features: VoicingFeatures = {
      hasThird: thirdPc !== null && soundingPcs.has(thirdPc),
      hasSeventh: seventhPc !== null && soundingPcs.has(seventhPc),
      complete: chord.pitchClasses.every((pc) => soundingPcs.has(pc as number)),
      mutedCount,
      fretSpan: play.fretSpan,
      lowestFret,
      flag: play.flag,
    };

    results.push({
      voicing: voicing(soundingPitches),
      frets,
      playability: play,
      score: scoreFeatures(features),
    });
  };

  recurse(0);

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Return the first pitch class at `root + offset` (for any offset in `offsets`) that
 * is actually present in the chord's pitch-class set, else null. Used to locate the
 * chord's 3rd / 7th regardless of major/minor quality.
 */
function pcAtOffsets(
  rootPc: number,
  offsets: readonly number[],
  chordPcs: ReadonlySet<number>,
): number | null {
  for (const off of offsets) {
    const pc = toPitchClass(rootPc + off) as number;
    if (chordPcs.has(pc)) return pc;
  }
  return null;
}
