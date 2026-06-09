// SHAPE model (/ui) — the per-string interaction state for one focused neck (the M1
// trace-back input), plus PURE state-transition + derivation helpers (docs/08 decision
// e; docs/09 UI#4). A shape is what the player is HOLDING: per string one of
//   - unplayed: the string is not part of the shape (nothing drawn at the nut)
//   - open:     the string rings open (sounds at fret 0)
//   - muted:    the string is deliberately damped (sounds nothing)
//   - fret N:   a finger presses fret N (sounds openStrings[string] + N)
//
// These helpers are pure (no React) so they can be unit-tested against known shapes and
// reused by the hot loop. The shape array is index-aligned with Tuning.openStrings:
// index s = string s (string 0 = high). One note per string (placing replaces).

import type { PlacedPosition, Tuning } from '../core';

/** Per-string shape state. fret 0 is expressed as kind:"open", never kind:"fret",0. */
export type StringShape =
  | { readonly kind: 'unplayed' }
  | { readonly kind: 'open' }
  | { readonly kind: 'muted' }
  | { readonly kind: 'fret'; readonly fret: number };

/** A full shape: one StringShape per string, index-aligned with the tuning. */
export type Shape = readonly StringShape[];

const UNPLAYED: StringShape = { kind: 'unplayed' };

/** An empty shape for a tuning (every string unplayed). */
export function emptyShape(stringCount: number): Shape {
  return Array.from({ length: stringCount }, () => UNPLAYED);
}

/** True when the shape sounds NOTHING (every string unplayed or muted). */
export function isShapeEmpty(shape: Shape): boolean {
  return shape.every((g) => g.kind === 'unplayed' || g.kind === 'muted');
}

/**
 * Place a fretted note on a string (left-click an empty fret cell). One note per
 * string: this REPLACES whatever the string currently held (fret/open/mute). Fret 0
 * is normalised to the open marker (the open string sounds at fret 0).
 */
export function placeFret(shape: Shape, string: number, fret: number): Shape {
  const next: StringShape = fret <= 0 ? { kind: 'open' } : { kind: 'fret', fret };
  return shape.map((g, i) => (i === string ? next : g));
}

/** Remove whatever is on a string (left-click an existing placed note) -> unplayed. */
export function removeNote(shape: Shape, string: number): Shape {
  return shape.map((g, i) => (i === string ? UNPLAYED : g));
}

/**
 * Cycle the per-string nut marker: open (O) -> muted (X) -> off (unplayed) -> open …
 * A fretted string also collapses to this cycle starting at open, so the nut marker
 * always gives a way back to a clean string.
 */
export function cycleNutMarker(shape: Shape, string: number): Shape {
  const cur = shape[string];
  let next: StringShape;
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
  return shape.map((g, i) => (i === string ? next : g));
}

/** True when this string contributes a SOUNDING pitch (open or fretted, not muted). */
export function isSounding(g: StringShape): boolean {
  return g.kind === 'open' || g.kind === 'fret';
}

/**
 * Derive the PlacedPosition[] for identify() from a shape: one entry per SOUNDING
 * string (open => fret 0; fretted => its fret). Muted and unplayed strings are
 * skipped — they sound nothing, so they are not part of the shape's pitch multiset
 * (docs/09 UI#4). Order follows string index (ascending); identify() recomputes the
 * bass from the lowest PITCH regardless of order (R10).
 */
export function shapeToPlaced(shape: Shape): PlacedPosition[] {
  const out: PlacedPosition[] = [];
  shape.forEach((g, string) => {
    if (g.kind === 'open') out.push({ string, fret: 0 });
    else if (g.kind === 'fret') out.push({ string, fret: g.fret });
  });
  return out;
}

/** The sounding MIDI pitch of a string under a shape, or null if it sounds nothing. */
export function soundingPitch(shape: Shape, tuning: Tuning, string: number): number | null {
  const g = shape[string];
  if (!g) return null;
  const open = tuning.openStrings[string] as number;
  if (g.kind === 'open') return open;
  if (g.kind === 'fret') return open + g.fret;
  return null;
}
