// Notation helpers (/ui) — PURE shape -> RenderFragment mapping, kept out of the
// NotationPane component file so the component module exports only a component
// (react-refresh) and the mapping is unit-testable without booting alphaTab.

import type { Tuning } from '../core';
import type { RenderFragment } from '../render';
import { shapeToPlaced, type Shape } from './shape';

/**
 * Build a RenderFragment from the focused shape on a tuning. The sounding strings (open or
 * fretted) become let-ringing notes; a shape that sounds NOTHING falls back to the open
 * chord (every string open) so there is always something to draw/play. String numbers are
 * 1-based (string 1 = tuning.openStrings[0]), matching the AlphaTex adapter contract.
 */
export function shapeToFragment(shape: Shape, tuning: Tuning, tempo: number): RenderFragment {
  const strings = tuning.openStrings.map((m) => m as number);
  const placed = shapeToPlaced(shape);
  const notes =
    placed.length > 0
      ? placed.map((p) => ({ string: p.string + 1, fret: p.fret, letRing: true }))
      : strings.map((_, i) => ({ string: i + 1, fret: 0, letRing: true }));
  return { tuning: { strings }, notes, letRingAll: true, duration: 1, tempo };
}
