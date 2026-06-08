// /naming/tier1-relational — pure theory helpers the namer computes FACTS with.
//
// These produce the values the engine joins to the global KB rules (ADR 0002): the
// roman numeral of a root vs the tonic, the degree of a drone vs a chord root, the
// chord identity of a pc-set. No KB data is read here — these are pure computations
// whose results are the rule-lookup KEYS. Tonal supplies chord/scale dictionaries
// (the same borrow /core and /naming/tier2-tonal use); the relational MEANING is ours.

import { Chord as TonalChord, Note } from 'tonal';
import type { PitchClass } from '../../core';
import { toPitchClass } from '../../core';

/** Roman-numeral degrees of the 7 diatonic scale steps of a MAJOR key, by semitone
 *  offset from the tonic. Case encodes the diatonic triad quality (I/IV/V major;
 *  ii/iii/vi minor; vii° diminished) — the conventional functional labels. */
const DIATONIC_ROMAN: Readonly<Record<number, string>> = {
  0: 'I',
  2: 'ii',
  4: 'iii',
  5: 'IV',
  7: 'V',
  9: 'vi',
  11: 'vii',
};

/** Chromatic (non-diatonic) roman fallbacks, upper-case with an accidental — used
 *  only when a chord root is not a diatonic scale step of the key. */
const CHROMATIC_ROMAN: Readonly<Record<number, string>> = {
  1: 'bII',
  3: 'bIII',
  6: 'bV',
  8: 'bVI',
  10: 'bVII',
};

/**
 * The roman numeral of a chord root relative to a tonic (both pitch classes).
 * Diatonic roots get the conventional functional numeral; chromatic roots get a
 * flat-degree fallback. The numeral is a COMPUTED join key (function-tendencies +
 * frame-diatonic-function rules look it up).
 */
export function romanNumeral(rootPc: number, tonicPc: number): string {
  const offset = ((rootPc - tonicPc) % 12 + 12) % 12;
  return DIATONIC_ROMAN[offset] ?? CHROMATIC_ROMAN[offset] ?? `+${offset}`;
}

/**
 * The functional degree of a drone (an open-string pitch class) relative to a chord
 * root, expressed as the chord-extension number the KB drone-role rules key on:
 *   unison/octave -> 1, m2/M2 -> 9, m3/M3 -> 3, P4 -> 11, P5 -> 5, M6 -> 13, m7/M7 -> 7.
 * Seconds report as 9 and sixths as 13 because a ringing OPEN string an octave-plus
 * above the root reads as the extension, which is exactly the open-tuning add-9/add-13
 * colour the drone-role vocabulary names (spec §6: open D over C = the 9th).
 */
export function droneDegree(dronePc: number, chordRootPc: number): number {
  const offset = ((dronePc - chordRootPc) % 12 + 12) % 12;
  switch (offset) {
    case 0:
      return 1;
    case 1:
    case 2:
      return 9; // minor/major 2nd -> ninth (the add-9 drone colour)
    case 3:
    case 4:
      return 3;
    case 5:
      return 11;
    case 6:
      return 5; // diminished/augmented 5th region; closest functional slot
    case 7:
      return 5;
    case 8:
      return 13; // augmented 5th / minor 6th -> thirteenth colour
    case 9:
      return 13;
    case 10:
    case 11:
      return 7;
    default:
      return offset;
  }
}

/** A detected chord identity from a pc-set: root pitch class + a human quality label. */
export interface DetectedChord {
  readonly rootPc: PitchClass;
  /** Tonal chord type, e.g. "major", "minor", "" (a bare triad has type "major"). */
  readonly quality: string;
  /** Bare Tonal symbol, e.g. "C", "Am", "Csus4". */
  readonly symbol: string;
  /** Human chord name, e.g. "C major", "A minor". */
  readonly name: string;
}

/** Sharp note names per pitch class (only to feed Tonal; identity is pc-based). */
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Map a Tonal chord type to a human quality word for the chordName slot. */
function humanQuality(type: string): string {
  if (type === 'major' || type === '') return 'major';
  if (type === 'minor') return 'minor';
  if (type === 'diminished') return 'diminished';
  if (type === 'augmented') return 'augmented';
  return type;
}

/**
 * Detect the chord a pc-set spells, rooted-first by the given bass pc so a slash/
 * inversion resolves to the intended root. Returns null if Tonal finds nothing.
 * `bassPc` is optional; when omitted the set order decides.
 */
export function detectChord(
  pcs: readonly number[],
  bassPc?: number,
): DetectedChord | null {
  const unique = Array.from(new Set(pcs.map((p) => ((p % 12) + 12) % 12)));
  if (unique.length === 0) return null;

  // Order bass-first so detect can prefer the root we expect from the lowest active note.
  let ordered = unique;
  if (bassPc !== undefined) {
    const bf = ((bassPc % 12) + 12) % 12;
    ordered = [bf, ...unique.filter((p) => p !== bf)];
  }
  const names = ordered.map((p) => SHARP_NAMES[p]);

  const detected = [
    ...TonalChord.detect(names),
    ...TonalChord.detect(names, { assumePerfectFifth: true }),
  ];
  for (const d of detected) {
    const symbol = d.indexOf('/') === -1 ? d : d.slice(0, d.indexOf('/'));
    const g = TonalChord.get(symbol);
    if (g.empty || !g.tonic) continue;
    const rootChroma = Note.get(g.tonic).chroma;
    if (rootChroma === undefined) continue;
    return {
      rootPc: toPitchClass(rootChroma),
      quality: g.type ?? '',
      symbol,
      name: `${SHARP_NAMES[rootChroma]} ${humanQuality(g.type ?? '')}`.trim(),
    };
  }
  return null;
}
