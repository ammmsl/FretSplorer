// Capo helpers (/ui) — PURE CapoShift math, kept out of the CapoControl component file so
// the component module exports only a component (react-refresh) and the helper stays unit-
// testable on its own. A capo is a runtime per-string semitone shift vector (core pitch-
// model): full capo = every string clamped at one fret; partial capo = a chosen subset.

import type { CapoShift } from '../core';

/**
 * Compute a CapoShift from a fret + a per-string clamp mask: clamped strings shift up by
 * `fret`, unclamped strings stay 0 (open). A full capo = every string clamped; a partial
 * capo = a subset.
 */
export function capoShiftFrom(fret: number, clamped: readonly boolean[]): CapoShift {
  return clamped.map((on) => (on ? fret : 0));
}
