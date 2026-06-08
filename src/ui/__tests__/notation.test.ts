// NotationPane pure helper — grip -> RenderFragment, then through the real AlphaTex
// adapter (fragmentToAlphaTex) so the model the lazy alphaTab pane feeds is verified
// without booting the engine. alphaTab itself is browser-only and not unit-tested here.

import { describe, expect, it } from 'vitest';
import { TUNINGS } from '../fixtures';
import { emptyGrip, placeFret, type Grip } from '../grip';
import { gripToFragment } from '../notation';
import { fragmentToAlphaTex } from '../../render';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;

describe('gripToFragment', () => {
  it('passes the tuning open-strings through as MIDI', () => {
    const f = gripToFragment(emptyGrip(6), openG, 60);
    expect(f.tuning.strings).toEqual([62, 59, 55, 50, 43, 38]);
    expect(f.tempo).toBe(60);
    expect(f.letRingAll).toBe(true);
  });

  it('an empty grip falls back to the open chord (every string, 1-based)', () => {
    const f = gripToFragment(emptyGrip(6), openG, 60);
    expect(f.notes).toHaveLength(6);
    expect(f.notes.map((n) => n.string)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(f.notes.every((n) => n.fret === 0)).toBe(true);
  });

  it('a fretted grip yields only the sounding strings, fret-accurate, 1-based', () => {
    // fret string index 0 at fret 5, leave the rest unplayed.
    const grip: Grip = placeFret(emptyGrip(6), 0, 5);
    const f = gripToFragment(grip, openG, 90);
    expect(f.notes).toEqual([{ string: 1, fret: 5, letRing: true }]);
  });

  it('feeds a valid AlphaTex string the adapter accepts (round-trip)', () => {
    const grip: Grip = placeFret(placeFret(emptyGrip(6), 0, 5), 5, 0);
    const tex = fragmentToAlphaTex(gripToFragment(grip, openG, 60));
    expect(tex).toContain('\\tuning(');
    expect(tex).toContain('\\tempo(60)');
    // string 1 fret 5 -> token "5.1"; open low string -> "0.6".
    expect(tex).toMatch(/5\.1/);
  });
});
