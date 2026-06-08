// Enharmonic spelling — DERIVED in context, never stored (pitch-model.ts §3;
// CONTEXT.md "Label mode"). A view concern that lives at the edge, not in the model.
//
// Strategy: `ctx.prefer` wins if given. Otherwise pick the sharp/flat axis from the
// key signature of the tonic — and because the contract's `tonic` is a pitch CLASS
// (so C#/Db are indistinguishable), choose the enharmonic tonic spelling with the
// FEWER accidentals, then follow that key's sign. This recovers "in Db -> Db"
// (5 flats beats C#'s 7 sharps) from a pc alone, while keeping "in G -> C#".

import { Key } from 'tonal';
import type { Midi, PitchClass, Spell } from './pitch-model';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function fold(pc: Midi | PitchClass | number): number {
  return ((Math.trunc(pc) % 12) + 12) % 12;
}

function keyAlteration(noteName: string): number {
  return Key.majorKey(noteName).alteration ?? 0;
}

/** Does the key centred on this pitch class prefer sharps? Picks the simpler
 *  enharmonic of the tonic (fewer accidentals; ties -> sharps). */
function tonicPrefersSharps(tonicPc: number): boolean {
  const sharpAlt = keyAlteration(SHARP_NAMES[tonicPc]);
  const flatAlt = keyAlteration(FLAT_NAMES[tonicPc]);
  if (Math.abs(flatAlt) < Math.abs(sharpAlt)) return false;
  return true;
}

/** Spell a pitch (or pitch class) into a note name (no octave) within a key context. */
export const spell: Spell = (pitch, ctx) => {
  const pc = fold(pitch);
  let useSharps: boolean;
  if (ctx.prefer) {
    useSharps = ctx.prefer === 'sharps';
  } else {
    useSharps = tonicPrefersSharps(fold(ctx.tonic));
  }
  return (useSharps ? SHARP_NAMES : FLAT_NAMES)[pc];
};
