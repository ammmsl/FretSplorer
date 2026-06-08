// Atomic pitch coordinates + smart constructors (/core).
//
// Implements the branded Midi / PitchClass primitives pinned in pitch-model.ts.
// Branding lives only in the type system (it erases at compile time, satisfying
// `erasableSyntaxOnly`); the constructors here are the ONLY sanctioned way to mint
// a branded value, and they range-check first (docs/adr/0007).

import type { IntervalClass, Midi, PitchClass, Semitones } from './pitch-model';

/** Range-checking constructor for a MIDI pitch (0..127). Throws otherwise. */
export function midi(n: number): Midi {
  if (!Number.isInteger(n)) throw new RangeError(`midi: ${n} is not an integer`);
  if (n < 0 || n > 127) throw new RangeError(`midi: ${n} out of MIDI range 0..127`);
  return n as Midi;
}

/** Range-checking constructor for a pitch class (0..11, 0 = C). Throws otherwise. */
export function pitchClass(n: number): PitchClass {
  if (!Number.isInteger(n)) throw new RangeError(`pitchClass: ${n} is not an integer`);
  if (n < 0 || n > 11) throw new RangeError(`pitchClass: ${n} out of pitch-class range 0..11`);
  return n as PitchClass;
}

/**
 * Reduce a MIDI pitch (or any integer) to its pitch class 0..11. LOSSY by design
 * (drops octave) — the one-way door onto the set side (pitch-model.ts §1).
 */
export function toPitchClass(m: Midi | number): PitchClass {
  return (((Math.trunc(m) % 12) + 12) % 12) as PitchClass;
}

/**
 * Fold a signed semitone distance to its interval class 0..6 — the tension-table
 * lookup key (ADR 0004). `min(ic, 12 - ic)` over the absolute distance.
 */
export function intervalClass(semitones: Semitones): IntervalClass {
  const ic = ((Math.abs(Math.trunc(semitones)) % 12) + 12) % 12;
  return (ic <= 6 ? ic : 12 - ic) as IntervalClass;
}
