// /naming/tier2-tonal — Tier-2 absolute chord-symbol namer.
//
// docs/03-architecture.md naming-tier table: "Use Chord.detect for T2 labels, not
// voicing anatomy". Tonal's Chord.detect is the correct tool for an absolute SYMBOL:
// it is bass-aware (returns slash chords) and collapses doublings — exactly right for
// a chord SYMBOL, where octaves/doublings are not part of the label.
//
// We deliberately do NOT touch the Voicing multiset's octaves/doublings for the
// symbol (that is the Tier-3 anatomy job, docs/06 R10). We only USE the voicing's
// bassIndex to order the note-name array bass-first so detect reports the right
// slash bass, and to spell the actual lowest pitch (with octave) as bassNote.
//
// Pure function, no hidden state (matches /core, /tension conventions).

import { Chord, Note } from 'tonal';
import type { KeyContext, Voicing } from '../../core';

export interface Tier2Candidate {
  /** Bare chord symbol, e.g. "GM", "Cmaj7", "Bm#5". */
  symbol: string;
  /** Spelled slash-bass note name when the candidate is an inversion, e.g. "D". */
  slashBass?: string;
}

export interface Tier2Result {
  /** Best symbol (Tonal's first candidate), or null if Tonal finds nothing. */
  primary: string | null;
  /** Ranked candidate list parsed from Tonal's detect output. */
  candidates: Tier2Candidate[];
  /** Spelled name of the lowest PITCH, octave kept (uses voicing.bassIndex; R10). */
  bassNote: string;
  /** Spelled note names of the multiset, octave-stripped, bass-first. */
  notes: string[];
}

/**
 * Parse a Tonal detect entry "SYM/BASS" into its parts. A bare "SYM" (root
 * position) yields no slashBass. Only the FIRST slash is the bass separator;
 * the symbol itself never contains "/", so a single split is safe.
 */
function parseCandidate(detected: string): Tier2Candidate {
  const slashIndex = detected.indexOf('/');
  if (slashIndex === -1) {
    return { symbol: detected };
  }
  return {
    symbol: detected.slice(0, slashIndex),
    slashBass: detected.slice(slashIndex + 1),
  };
}

/**
 * Name a realised Voicing with an absolute chord SYMBOL + slash bass + a ranked
 * candidate list, by wrapping Tonal's bass-aware Chord.detect.
 *
 * The note-name array fed to detect is ordered bass-FIRST using voicing.bassIndex
 * (the lowest PITCH, argmin — NOT array order, NOT string order; docs/06 R10), so
 * detect reports the correct slash bass (e.g. "GM/D" for the Open-G home chord).
 *
 * @param ctx.key — optional key context. Tonal's detect needs no key; it is
 *   accepted for future biasing and otherwise ignored (kept type-stable for M1).
 */
export function nameTier2(
  voicing: Voicing,
  ctx?: { key?: KeyContext },
): Tier2Result {
  void ctx; // accepted for future biasing; Tonal detect needs no key.

  const { pitches, bassIndex } = voicing;

  // Spelled note name WITH octave for every pitch (Tonal Note.fromMidiSharps:
  // 38 -> "D2"). Indices align with `pitches`.
  const namesWithOctave = pitches.map((m) => Note.fromMidiSharps(m));

  // Octave-stripped pitch-class names for detect (detect wants "D", "G", not "D2").
  const pitchClassNames = namesWithOctave.map((n) => Note.pitchClass(n));

  // Order bass-FIRST: the bass pitch's pc-name leads, then the remaining notes in
  // their multiset order. This is what makes detect return the right slash bass.
  const bassFirst: string[] = [pitchClassNames[bassIndex]];
  for (let i = 0; i < pitchClassNames.length; i++) {
    if (i !== bassIndex) bassFirst.push(pitchClassNames[i]);
  }

  const detected = Chord.detect(bassFirst);
  const candidates = detected.map(parseCandidate);

  return {
    primary: detected.length > 0 ? detected[0] : null,
    candidates,
    bassNote: namesWithOctave[bassIndex], // octave kept — the actual lowest pitch.
    notes: bassFirst,
  };
}
