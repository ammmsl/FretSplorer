// Scale / mode construction (/core). The pc-set and degree labels come from Tonal's
// scale dictionary; we wrap them in the invariant types so the rest of the system
// never touches Tonal's string-keyed API directly (pitch-model.ts §4).

import { Interval as TonalInterval, Scale as TonalScale } from 'tonal';
import type { PitchClass, Scale } from './pitch-model';
import { degreeFromInterval } from './interval';
import { pitchClass, toPitchClass } from './pitch';

// Sharp spelling per pitch class — only used to feed Tonal a tonic note name; the
// resulting model is pitch-class based, so the choice of spelling here is immaterial.
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Build a Scale from a Tonal scale TYPE (e.g. "major", "dorian", "mixolydian") and
 * a root pitch class. The returned `degrees` are index-aligned with `pitchClasses`.
 */
export function scale(type: string, rootPc: number): Scale {
  const root = pitchClass(rootPc);
  const data = TonalScale.get(`${SHARP_NAMES[root]} ${type}`);
  if (data.empty || data.intervals.length === 0) {
    throw new Error(`scale: unknown scale type "${type}"`);
  }
  const pitchClasses: PitchClass[] = data.intervals.map((ivl) =>
    toPitchClass(root + (TonalInterval.get(ivl).chroma ?? 0)),
  );
  const degrees = data.intervals.map((ivl) => degreeFromInterval(ivl));
  return { name: type, root, pitchClasses, degrees };
}
