// GRIP model (/ui) — the per-string interaction state for one focused neck (the M1
// trace-back input), plus PURE state-transition + derivation helpers (docs/08 decision
// e; docs/09 UI#4). A grip is what the player is HOLDING: per string one of
//   - unplayed: the string is not part of the grip (nothing drawn at the nut)
//   - open:     the string rings open (sounds at fret 0)
//   - muted:    the string is deliberately damped (sounds nothing)
//   - fret N:   a finger presses fret N (sounds openStrings[string] + N)
//
// These helpers are pure (no React) so they can be unit-tested against known grips and
// reused by the hot loop. The grip array is index-aligned with Tuning.openStrings:
// index s = string s (string 0 = high). One note per string (placing replaces).

import type { PlacedPosition, Tuning } from '../core';

/** Per-string grip state. fret 0 is expressed as kind:"open", never kind:"fret",0. */
export type StringGrip =
  | { readonly kind: 'unplayed' }
  | { readonly kind: 'open' }
  | { readonly kind: 'muted' }
  | { readonly kind: 'fret'; readonly fret: number };

/** A full grip: one StringGrip per string, index-aligned with the tuning. */
export type Grip = readonly StringGrip[];

const UNPLAYED: StringGrip = { kind: 'unplayed' };

/** An empty grip for a tuning (every string unplayed). */
export function emptyGrip(stringCount: number): Grip {
  return Array.from({ length: stringCount }, () => UNPLAYED);
}

/** True when the grip sounds NOTHING (every string unplayed or muted). */
export function isGripEmpty(grip: Grip): boolean {
  return grip.every((g) => g.kind === 'unplayed' || g.kind === 'muted');
}

/**
 * Place a fretted note on a string (left-click an empty fret cell). One note per
 * string: this REPLACES whatever the string currently held (fret/open/mute). Fret 0
 * is normalised to the open marker (the open string sounds at fret 0).
 */
export function placeFret(grip: Grip, string: number, fret: number): Grip {
  const next: StringGrip = fret <= 0 ? { kind: 'open' } : { kind: 'fret', fret };
  return grip.map((g, i) => (i === string ? next : g));
}

/** Remove whatever is on a string (left-click an existing placed note) -> unplayed. */
export function removeNote(grip: Grip, string: number): Grip {
  return grip.map((g, i) => (i === string ? UNPLAYED : g));
}

/**
 * Cycle the per-string nut marker: open (O) -> muted (X) -> off (unplayed) -> open …
 * A fretted string also collapses to this cycle starting at open, so the nut marker
 * always gives a way back to a clean string.
 */
export function cycleNutMarker(grip: Grip, string: number): Grip {
  const cur = grip[string];
  let next: StringGrip;
  switch (cur?.kind) {
    case 'open':
      next = { kind: 'muted' };
      break;
    case 'muted':
      next = UNPLAYED;
      break;
    // unplayed, fret, or anything else -> open
    default:
      next = { kind: 'open' };
      break;
  }
  return grip.map((g, i) => (i === string ? next : g));
}

/** True when this string contributes a SOUNDING pitch (open or fretted, not muted). */
export function isSounding(g: StringGrip): boolean {
  return g.kind === 'open' || g.kind === 'fret';
}

/**
 * Derive the PlacedPosition[] for identify() from a grip: one entry per SOUNDING
 * string (open => fret 0; fretted => its fret). Muted and unplayed strings are
 * skipped — they sound nothing, so they are not part of the grip's pitch multiset
 * (docs/09 UI#4). Order follows string index (ascending); identify() recomputes the
 * bass from the lowest PITCH regardless of order (R10).
 */
export function gripToPlaced(grip: Grip): PlacedPosition[] {
  const out: PlacedPosition[] = [];
  grip.forEach((g, string) => {
    if (g.kind === 'open') out.push({ string, fret: 0 });
    else if (g.kind === 'fret') out.push({ string, fret: g.fret });
  });
  return out;
}

/** The sounding MIDI pitch of a string under a grip, or null if it sounds nothing. */
export function soundingPitch(grip: Grip, tuning: Tuning, string: number): number | null {
  const g = grip[string];
  if (!g) return null;
  const open = tuning.openStrings[string] as number;
  if (g.kind === 'open') return open;
  if (g.kind === 'fret') return open + g.fret;
  return null;
}
