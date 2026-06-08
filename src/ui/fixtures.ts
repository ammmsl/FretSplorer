// M0 scaffolding fixtures (/ui) — a small built-in set of tunings, scales and chords
// so the surface is interactive before KB-card loading lands (a later milestone,
// docs/07). Everything is constructed through the /core value constructors so the
// shapes are real Tuning/Scale/Chord contract values — no hand-rolled objects.
//
// Tuning seeds + tonics are taken verbatim from the build task (docs/08 fixture).
// openStrings are string 1 (HIGH) -> string N (LOW), matching Tuning's convention.

import type { Chord, Scale, Tuning } from '../core';
import { chord, scale, tuning } from '../core';

/** Built-in tunings. openStrings: string 1 (high) -> 6 (low). */
export const TUNINGS: readonly Tuning[] = [
  tuning('open-g', [62, 59, 55, 50, 43, 38], 7), // D B G D G D, tonic G
  tuning('eadgbe', [64, 59, 55, 50, 45, 40], 4), // standard E, tonic E
  tuning('dadgad', [62, 57, 55, 50, 45, 38], 2), // D A G D A D, tonic D
  tuning('drop-d', [64, 59, 55, 50, 45, 38], 4), // drop D, tonic E
];

/** Human label for a tuning id. */
export function tuningLabel(id: string): string {
  switch (id) {
    case 'open-g':
      return 'Open G';
    case 'eadgbe':
      return 'EADGBE (standard)';
    case 'dadgad':
      return 'DADGAD';
    case 'drop-d':
      return 'Drop D';
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
