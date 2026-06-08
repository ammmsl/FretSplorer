// /mcp — shared helpers for the intent tools. Pure; no fretboard math is invented here
// (that lives in /core, /projection, /naming, /voicings — the tools COMPOSE them).

import type { KeyContext, Midi, PitchClass, Tuning } from '../core';
import { pitchClass, spell, toPitchClass } from '../core';
import type { Grip } from '../ui';
import { gripToPlaced } from '../ui';
import type { PlacedPosition } from '../core';

/** The tuning's tonic as a KeyContext, for in-context enharmonic spelling. */
export function tuningKey(tuning: Tuning): KeyContext {
  return { tonic: tuning.tonic };
}

/** Spell a pitch class to a note name in the tuning's key (e.g. pc 7 in G -> "G"). */
export function pcName(pc: PitchClass | number, tuning: Tuning): string {
  return spell(pitchClass(((Math.trunc(pc as number) % 12) + 12) % 12), tuningKey(tuning));
}

/** Spell a MIDI pitch WITH octave-free name in the tuning's key (drops octave). */
export function midiName(m: Midi | number, tuning: Tuning): string {
  return spell(toPitchClass(m), tuningKey(tuning));
}

/** Spell a MIDI pitch WITH its octave number, e.g. midi 38 -> "D2". Octave is the
 *  standard MIDI octave (midi 60 = C4). Used for the bass-pitch claim (R10). */
export function midiNameOctave(m: Midi | number, tuning: Tuning): string {
  const n = Math.trunc(m as number);
  const octave = Math.floor(n / 12) - 1;
  return `${midiName(n, tuning)}${octave}`;
}

/** A grip on a tuning -> the PlacedPosition[] identify/nameTier1 consume (one per
 *  SOUNDING string; muted/unplayed skipped). Delegates to the /ui grip helper. */
export function placedFromGrip(grip: Grip): PlacedPosition[] {
  return gripToPlaced(grip);
}

/** The sounding MIDI pitches of a grip on a tuning (one per sounding string). */
export function soundingPitches(grip: Grip, tuning: Tuning): number[] {
  return placedFromGrip(grip).map(
    (p) => (tuning.openStrings[p.string] as number) + p.fret,
  );
}
