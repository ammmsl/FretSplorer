// NotationPane pure helper — shape -> RenderFragment, then through the real AlphaTex
// adapter (fragmentToAlphaTex) so the model the lazy alphaTab pane feeds is verified
// without booting the engine. alphaTab itself is browser-only and not unit-tested here.

import { describe, expect, it } from 'vitest';
import { TUNINGS } from '../fixtures';
import { emptyShape, placeFret, type Shape } from '../shape';
import { shapeToFragment } from '../notation';
import { fragmentToAlphaTex } from '../../render';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;

describe('shapeToFragment', () => {
  it('passes the tuning open-strings through as MIDI', () => {
    const f = shapeToFragment(emptyShape(6), openG, 60);
    expect(f.tuning.strings).toEqual([62, 59, 55, 50, 43, 38]);
    expect(f.tempo).toBe(60);
    expect(f.letRingAll).toBe(true);
  });

  it('an empty shape falls back to the open chord (every string, 1-based)', () => {
    const f = shapeToFragment(emptyShape(6), openG, 60);
    expect(f.notes).toHaveLength(6);
    expect(f.notes.map((n) => n.string)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(f.notes.every((n) => n.fret === 0)).toBe(true);
  });

  it('a fretted shape yields only the sounding strings, fret-accurate, 1-based', () => {
    // fret string index 0 at fret 5, leave the rest unplayed.
    const shape: Shape = placeFret(emptyShape(6), 0, 5);
    const f = shapeToFragment(shape, openG, 90);
    expect(f.notes).toEqual([{ string: 1, fret: 5, letRing: true }]);
  });

  it('feeds a valid AlphaTex string the adapter accepts (round-trip)', () => {
    const shape: Shape = placeFret(placeFret(emptyShape(6), 0, 5), 5, 0);
    const tex = fragmentToAlphaTex(shapeToFragment(shape, openG, 60));
    expect(tex).toContain('\\tuning(');
    expect(tex).toContain('\\tempo(60)');
    // string 1 fret 5 -> token "5.1"; open low string -> "0.6".
    expect(tex).toMatch(/5\.1/);
  });
});
