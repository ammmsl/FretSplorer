// Intervals & degrees (/core). Semitone distance is ours (pure arithmetic); the
// functional NAME is borrowed from Tonal's Interval module — we do not re-implement
// interval naming (pitch-model.ts §2; docs/05-external-data.md).

import { Interval as TonalInterval } from 'tonal';
import type { Degree, Interval, PitchClass, Semitones } from './pitch-model';
import { intervalClass, pitchClass } from './pitch';

/** Tonal canonical form is `<num><quality>` (e.g. "3m"); reformat to the
 *  conventional quality-first "m3"/"P5"/"A4" the contract documents. */
function conventionalName(ivlName: string): string {
  const g = TonalInterval.get(ivlName);
  if (g.empty || g.num === undefined || g.q === undefined) return ivlName;
  return `${g.q}${g.num}`;
}

/** Build an Interval from a signed semitone distance. */
export function interval(semitones: Semitones): Interval {
  return {
    semitones,
    name: conventionalName(TonalInterval.fromSemitones(semitones)),
    ic: intervalClass(semitones),
  };
}

/** Chord tones are scale positions 1/3/5/7 (folded over the octave); 2/4/6/9/11/13
 *  are extensions/added tones — drives the degree-dot saturation channel. */
function isChordToneNum(num: number): boolean {
  const simple = ((num - 1) % 7) + 1;
  return simple === 1 || simple === 3 || simple === 5 || simple === 7;
}

function accidental(alt: number): string {
  if (alt < 0) return 'b'.repeat(-alt);
  if (alt > 0) return '#'.repeat(alt);
  return '';
}

/**
 * A Degree derived from a Tonal interval name (the accurate path used by scale()
 * and chord(), where the diatonic spelling is known). e.g. "3m" -> { fromRoot: 3,
 * label: "b3", isChordTone: true }; "11A" -> { fromRoot: 6, label: "#11", false }.
 */
export function degreeFromInterval(ivlName: string): Degree {
  const g = TonalInterval.get(ivlName);
  const num = g.num ?? 1;
  const alt = g.alt ?? 0;
  return {
    fromRoot: pitchClass(((g.chroma ?? 0) % 12 + 12) % 12),
    label: `${accidental(alt)}${num}`,
    isChordTone: isChordToneNum(num),
  };
}

// Canonical chromatic degree map for when no spelled interval context exists
// (e.g. projecting a bare Chord, where only root + pitch classes are known). Both
// thirds and both sevenths read as chord tones so major/minor colour correctly;
// precise relational labelling is Tier-1's job (M2), not this colour channel.
const CANONICAL: ReadonlyArray<{ label: string; chordTone: boolean }> = [
  { label: '1', chordTone: true }, // 0
  { label: 'b2', chordTone: false }, // 1
  { label: '2', chordTone: false }, // 2
  { label: 'b3', chordTone: true }, // 3
  { label: '3', chordTone: true }, // 4
  { label: '4', chordTone: false }, // 5
  { label: 'b5', chordTone: false }, // 6
  { label: '5', chordTone: true }, // 7
  { label: 'b6', chordTone: false }, // 8
  { label: '6', chordTone: false }, // 9
  { label: 'b7', chordTone: true }, // 10
  { label: '7', chordTone: true }, // 11
];

/** A Degree from a raw semitone offset, folded to 0..11, using the canonical
 *  chromatic map. Used where only the offset is known (chord projection). */
export function degreeFromOffset(offsetSemitones: number): Degree {
  const folded = ((Math.trunc(offsetSemitones) % 12) + 12) % 12;
  const e = CANONICAL[folded];
  return { fromRoot: folded as PitchClass, label: e.label, isChordTone: e.chordTone };
}
