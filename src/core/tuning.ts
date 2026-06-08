// Tuning + capo (/core) — the runtime projection target the engine consumes, the
// form a /kb grammar card compiles down to (pitch-model.ts §6). `openStrings` index
// carries NO pitch-order meaning (re-entrant tunings allowed).

import type { CapoShift, Midi, Tuning } from './pitch-model';
import { midi, pitchClass } from './pitch';

/** Build a Tuning from an id, open-string MIDI pitches (string 1 -> N), and tonic pc. */
export function tuning(
  id: string,
  openStrings: ReadonlyArray<Midi | number>,
  tonic: number,
): Tuning {
  if (openStrings.length === 0) throw new Error('tuning: needs at least one string');
  const strings: Midi[] = openStrings.map((s) => (typeof s === 'number' ? midi(s) : s));
  return { id, openStrings: strings, tonic: pitchClass(tonic) };
}

/**
 * Apply a capo (a per-string semitone shift vector — partial capo = a contiguous
 * span, full capo = uniform) to a base tuning, yielding a VIRTUAL tuning the same
 * engine handles for free (pitch-model.ts §6; CONTEXT.md "Capo"; docs/01 §C).
 *
 * Each string's open pitch shifts up by its capo entry (0 = uncapoed). The `tonic`
 * (pitch class) is DELIBERATELY preserved: the capo is a pedagogical anchor whose
 * whole point is that every relationship to the drones is unchanged — only absolute
 * pitches transpose (kb/tunings/open-g.yaml capoBehavior). Rendering shows absolute
 * frets + a clamp overlay; it never renumbers (docs/08 decision i; ADR 0006).
 */
export function applyCapo(base: Tuning, capo: CapoShift): Tuning {
  if (capo.length !== base.openStrings.length) {
    throw new Error(
      `applyCapo: capo vector length ${capo.length} != string count ${base.openStrings.length}`,
    );
  }
  const openStrings: Midi[] = base.openStrings.map((m, i) => midi((m as number) + capo[i]));
  return { id: `${base.id}+capo`, openStrings, tonic: base.tonic };
}
