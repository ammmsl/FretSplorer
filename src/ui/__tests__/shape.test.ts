// Shape helpers — the per-string interaction state transitions + PlacedPosition[]
// derivation (docs/08 decision e; docs/09 UI#4). Validated against known shapes.

import { describe, expect, it } from 'vitest';
import { tuning } from '../../core';
import {
  cycleNutMarker,
  emptyShape,
  shapeToPlaced,
  isShapeEmpty,
  placeFret,
  removeNote,
  soundingPitch,
  type Shape,
} from '../shape';

// open-g: string 0..5 = [62,59,55,50,43,38] (D4 B3 G3 D3 G2 D2), tonic G = 7.
const openG = tuning('open-g', [62, 59, 55, 50, 43, 38], 7);

describe('emptyShape / isShapeEmpty', () => {
  it('builds one unplayed entry per string and reads as empty', () => {
    const g = emptyShape(6);
    expect(g).toHaveLength(6);
    expect(g.every((s) => s.kind === 'unplayed')).toBe(true);
    expect(isShapeEmpty(g)).toBe(true);
  });

  it('a shape of only muted strings is still empty (sounds nothing)', () => {
    let g = emptyShape(3);
    g = cycleNutMarker(cycleNutMarker(g, 0), 0); // open -> muted
    expect(g[0].kind).toBe('muted');
    expect(isShapeEmpty(g)).toBe(true);
  });

  it('a shape with one open string is NOT empty', () => {
    const g = cycleNutMarker(emptyShape(3), 0); // -> open
    expect(isShapeEmpty(g)).toBe(false);
  });
});

describe('placeFret / removeNote (one note per string)', () => {
  it('places a fretted note and replaces an existing one on that string', () => {
    let g = placeFret(emptyShape(6), 2, 3);
    expect(g[2]).toEqual({ kind: 'fret', fret: 3 });
    g = placeFret(g, 2, 5); // moves the note on the same string
    expect(g[2]).toEqual({ kind: 'fret', fret: 5 });
  });

  it('normalises fret 0 to the open marker', () => {
    const g = placeFret(emptyShape(6), 0, 0);
    expect(g[0]).toEqual({ kind: 'open' });
  });

  it('removes a placed note back to unplayed', () => {
    const g = removeNote(placeFret(emptyShape(6), 1, 4), 1);
    expect(g[1]).toEqual({ kind: 'unplayed' });
  });
});

describe('cycleNutMarker', () => {
  it('cycles unplayed -> open -> muted -> off(unplayed)', () => {
    let g = emptyShape(2);
    g = cycleNutMarker(g, 0);
    expect(g[0].kind).toBe('open');
    g = cycleNutMarker(g, 0);
    expect(g[0].kind).toBe('muted');
    g = cycleNutMarker(g, 0);
    expect(g[0].kind).toBe('unplayed');
  });

  it('a fretted string cycles to open (a clean way back)', () => {
    const g = cycleNutMarker(placeFret(emptyShape(2), 0, 5), 0);
    expect(g[0].kind).toBe('open');
  });
});

describe('shapeToPlaced (the identify() input)', () => {
  it('Open-G all-open -> six PlacedPositions at fret 0', () => {
    const allOpen: Shape = openG.openStrings.map(() => ({ kind: 'open' as const }));
    const placed = shapeToPlaced(allOpen);
    expect(placed).toEqual([
      { string: 0, fret: 0 },
      { string: 1, fret: 0 },
      { string: 2, fret: 0 },
      { string: 3, fret: 0 },
      { string: 4, fret: 0 },
      { string: 5, fret: 0 },
    ]);
  });

  it('skips muted and unplayed strings (they sound nothing)', () => {
    let g = emptyShape(4);
    g = placeFret(g, 0, 2); // fret
    g = cycleNutMarker(g, 1); // open
    g = cycleNutMarker(cycleNutMarker(g, 2), 2); // muted
    // string 3 stays unplayed
    const placed = shapeToPlaced(g);
    expect(placed).toEqual([
      { string: 0, fret: 2 },
      { string: 1, fret: 0 },
    ]);
  });
});

describe('soundingPitch', () => {
  it('returns open + fret for fretted, open pitch for open, null otherwise', () => {
    let g = emptyShape(6);
    g = placeFret(g, 5, 2); // low string 38 + 2 = 40
    expect(soundingPitch(g, openG, 5)).toBe(40);
    g = cycleNutMarker(emptyShape(6), 5); // open
    expect(soundingPitch(g, openG, 5)).toBe(38);
    expect(soundingPitch(emptyShape(6), openG, 5)).toBeNull();
  });
});
