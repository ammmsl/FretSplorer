// M0 scaffolding fixtures (/ui) — a small built-in set of tunings, scales and chords
// so the surface is interactive before KB-card loading lands (a later milestone,
// docs/07). Everything is constructed through the /core value constructors so the
// shapes are real Tuning/Scale/Chord contract values — no hand-rolled objects.
//
// Tuning seeds + tonics are taken verbatim from the build task (docs/08 fixture).
// openStrings are string 1 (HIGH) -> string N (LOW), matching Tuning's convention.

import type { Chord, Scale, Tuning } from '../core';
import { chord, scale, tuning } from '../core';

// Built-in tunings. openStrings: string 1 (high) -> string N (low). The 6-string entries
// (strings + tonic) match the authored kb/tunings/*.yaml grammar cards EXACTLY — the readout
// joins a card to its tuning by id and compares open-string pitch-classes, so they must agree.
// The two extended-range entries (7-/8-string standard) have NO card: they exercise the
// derived geometry (geometryForStringCount) and absolute (Tier-2) naming, not relational cards.
export const TUNINGS: readonly Tuning[] = [
  // ── curated tuning set (each has a grammar card; docs/02) ──
  tuning('open-g', [62, 59, 55, 50, 43, 38], 7), // D B G D G D, tonic G
  tuning('open-d', [62, 57, 54, 50, 45, 38], 2), // D A F# D A D, tonic D
  tuning('open-e', [64, 59, 56, 52, 47, 40], 4), // E B G# E B E, tonic E
  tuning('open-c', [64, 60, 55, 48, 43, 36], 0), // E C G C G C, tonic C
  tuning('dadgad', [62, 57, 55, 50, 45, 38], 2), // D A G D A D, tonic D
  tuning('drop-d', [64, 59, 55, 50, 45, 38], 4), // E B G D A D, tonic E (standard, low E->D)
  tuning('double-drop-d', [62, 59, 55, 50, 45, 38], 2), // D B G D A D, tonic D
  // ── standard EADGBE (deliberately card-less: absolute naming is correct here) ──
  tuning('eadgbe', [64, 59, 55, 50, 45, 40], 4), // standard E, tonic E
  // ── extended range (no card; derived geometry) ──
  tuning('standard-7', [64, 59, 55, 50, 45, 40, 35], 4), // E B G D A E B, 7-string standard, tonic E
  tuning('standard-8', [64, 59, 55, 50, 45, 40, 35, 30], 4), // + low F#1, 8-string standard, tonic E
];

/** Human label for a tuning id. */
export function tuningLabel(id: string): string {
  switch (id) {
    case 'open-g':
      return 'Open G';
    case 'open-d':
      return 'Open D';
    case 'open-e':
      return 'Open E';
    case 'open-c':
      return 'Open C';
    case 'eadgbe':
      return 'EADGBE (standard)';
    case 'dadgad':
      return 'DADGAD';
    case 'drop-d':
      return 'Drop D';
    case 'double-drop-d':
      return 'Double Drop D';
    case 'standard-7':
      return '7-string (standard)';
    case 'standard-8':
      return '8-string (standard)';
    default:
      return id;
  }
}

/** A selectable scale fixture: a display label + a thunk that builds it via core. */
export interface ScaleOption {
  readonly key: string;
  readonly label: string;
  readonly build: () => Scale;
}

/** A selectable chord fixture. */
export interface ChordOption {
  readonly key: string;
  readonly label: string;
  readonly build: () => Chord;
}

// Scales are built on root C (pc 0) for the fixture; the projection re-colours by
// degree relative to the entity root regardless of tuning, so the root choice here
// is just the fixture default — re-projection on tuning switch is what matters (M0 DoD).
export const SCALES: readonly ScaleOption[] = [
  { key: 'c-major', label: 'C major', build: () => scale('major', 0) },
  { key: 'c-minor', label: 'C minor', build: () => scale('minor', 0) },
  { key: 'c-dorian', label: 'C dorian', build: () => scale('dorian', 0) },
  { key: 'c-mixolydian', label: 'C mixolydian', build: () => scale('mixolydian', 0) },
  { key: 'c-pentatonic', label: 'C pentatonic', build: () => scale('major pentatonic', 0) },
];

export const CHORDS: readonly ChordOption[] = [
  { key: 'C', label: 'C', build: () => chord('C') },
  { key: 'G', label: 'G', build: () => chord('G') },
  { key: 'Am', label: 'Am', build: () => chord('Am') },
  { key: 'Cmaj7', label: 'Cmaj7', build: () => chord('Cmaj7') },
  { key: 'Dsus4', label: 'Dsus4', build: () => chord('Dsus4') },
];
