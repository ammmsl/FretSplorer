// Chord construction (/core) — an abstract harmonic identity: a deduplicated,
// octave-free pitch-CLASS set plus a root. NEVER carries octave or doubling info;
// anything that needs those is a Voicing (pitch-model.ts §5; CONTEXT.md "Chord").

import { Chord as TonalChord, Interval as TonalInterval, Note } from 'tonal';
import type { Chord, PitchClass } from './pitch-model';
import { pitchClass, toPitchClass } from './pitch';

/** Dedupe pitch classes, preserving first-seen order (a Chord is a SET). */
function dedupe(pcs: PitchClass[]): PitchClass[] {
  const seen = new Set<number>();
  const out: PitchClass[] = [];
  for (const pc of pcs) {
    if (!seen.has(pc)) {
      seen.add(pc);
      out.push(pc);
    }
  }
  return out;
}

/**
 * Build a Chord from a Tonal chord SYMBOL with an explicit root, e.g. "Cmaj7",
 * "G", "Dsus4". Throws on a symbol with no parseable root (the abstract identity
 * needs one). The `pitchClasses` are collapsed to a set; octave/doublings are a
 * Voicing concern, not a Chord one.
 */
export function chord(symbol: string): Chord {
  const data = TonalChord.get(symbol);
  if (data.empty || !data.tonic) {
    throw new Error(`chord: cannot parse "${symbol}" — needs an explicit root, e.g. "Cmaj7"`);
  }
  const rootPc = Note.get(data.tonic).chroma;
  if (rootPc === undefined) throw new Error(`chord: unresolved root in "${symbol}"`);
  const pcs = data.intervals.map((ivl) => toPitchClass(rootPc + (TonalInterval.get(ivl).chroma ?? 0)));
  return {
    root: pitchClass(rootPc),
    pitchClasses: dedupe(pcs),
    symbol: data.symbol || undefined,
  };
}

/**
 * Build a Chord directly from a root + pitch classes (used by identify() to mint
 * ranked candidates from a realised voicing). `symbol` is optional/derived.
 */
export function chordFromPitchClasses(
  rootPc: number,
  pcs: readonly number[],
  symbol?: string,
): Chord {
  return {
    root: pitchClass(rootPc),
    pitchClasses: dedupe(pcs.map((p) => toPitchClass(p))),
    symbol,
  };
}
