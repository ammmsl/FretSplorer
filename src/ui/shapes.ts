// Movable-shape helpers (/ui) — PURE shape -> Shape projection at a chosen anchor fret,
// consumed by the grammar card's interactive movable-shape list (ADR 0013) and unit-testable. A
// MovableShape is a hand-authored per-string template (open / mute / fret+offset); placing
// it at anchor fret N realises a concrete Shape: a fretted string lands at N + offset, an
// `open` string stays at fret 0 (a drone that does NOT slide), a `mute` string is damped.
// R3 auto-derivation stays deferred — this renders hand-authored shapes only.

import type { MovableShape } from '../kb';
import type { Shape, StringShape } from './shape';

/**
 * Realise a movable shape as a concrete Shape at the given anchor fret. `fret` entries are
 * placed at `anchorFret + offset` (clamped to open at fret 0); `open` -> open drone; `mute`
 * -> muted. The result is index-aligned to the tuning (one StringShape per shape-string).
 */
export function realizeShape(shape: MovableShape, anchorFret: number): Shape {
  return shape.strings.map((s): StringShape => {
    if (s.play === 'open') return { kind: 'open' };
    if (s.play === 'mute') return { kind: 'muted' };
    const fret = anchorFret + (s.offset ?? 0);
    return fret <= 0 ? { kind: 'open' } : { kind: 'fret', fret };
  });
}

/** The anchor frets a shape offers (its slideExamples), or a sensible default ladder. */
export function shapeAnchors(shape: MovableShape): number[] {
  if (shape.slideExamples && shape.slideExamples.length > 0) {
    return shape.slideExamples.map((ex) => ex.anchorFret);
  }
  return [0, 5, 7];
}
