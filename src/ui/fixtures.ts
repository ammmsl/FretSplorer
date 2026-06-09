// M0 scaffolding fixtures (/ui) — a small built-in set of tunings, scales and chords
// so the surface is interactive before KB-card loading lands (a later milestone,
// docs/07). Everything is constructed through the /core value constructors so the
// shapes are real Tuning/Scale/Chord contract values — no hand-rolled objects.
//
// Tuning seeds + tonics are taken verbatim from the build task (docs/08 fixture).
// openStrings are string 1 (HIGH) -> string N (LOW), matching Tuning's convention.

import type { Chord, Scale, Tuning } from '../core';
import { chord, midi, scale, tuning } from '../core';

// Built-in tunings — all authored as 6-string. openStrings: string 1 (high) -> string N (low).
// The strings + tonic match the authored kb/tunings/*.yaml grammar cards EXACTLY — the readout
// joins a card to its tuning by id and compares open-string pitch-classes, so they must agree.
// String COUNT is no longer baked into the tuning: a neck picks a count (6/7/8) and resizeTuning
// expands the base tuning to it (extra low strings appended), so any tuning works at any count.
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
];

/** The string counts a neck may take. 6 is the default (the count tunings are authored at). */
export const STRING_COUNTS: readonly number[] = [6, 7, 8];
export const DEFAULT_STRING_COUNT = 6;

/**
 * Expand (or shrink) a base tuning to `count` strings WITHOUT changing its id or tonic — so the
 * grammar card still resolves and the relational anchor is unchanged. Added strings are appended
 * below the current lowest string, each a perfect fourth (5 semitones) below the previous one
 * (the standard extended-range convention: E2 -> B1 -> F#1, which reproduces the old
 * standard-7 / standard-8 fixtures exactly). Shrinking drops the lowest (last) strings.
 */
export function resizeTuning(base: Tuning, count: number): Tuning {
  const cur = base.openStrings;
  if (count === cur.length) return base;
  if (count < cur.length) {
    return { ...base, openStrings: cur.slice(0, count) };
  }
  const next = [...cur];
  while (next.length < count) {
    next.push(midi((next[next.length - 1] as number) - 5));
  }
  return { ...base, openStrings: next };
}

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
