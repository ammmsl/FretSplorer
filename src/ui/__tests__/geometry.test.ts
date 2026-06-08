// Geometry helpers — pure fret/string coordinate math (validated against the
// fixed DEFAULT_GEOMETRY: padLeft 34, fretSpacing 40, stringSpacing 26, padY 22).

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEOMETRY as G,
  fretLineX,
  geometryForStringCount,
  neckHeight,
  neckWidth,
  noteX,
  nutX,
  stringY,
} from '../geometry';

describe('fret geometry', () => {
  it('nut is at padLeft and fret 0 line coincides with the nut', () => {
    expect(nutX(G)).toBe(34);
    expect(fretLineX(G, 0)).toBe(34);
  });

  it('fret lines step right by fretSpacing', () => {
    expect(fretLineX(G, 1)).toBe(74); // 34 + 40
    expect(fretLineX(G, 12)).toBe(34 + 12 * 40);
  });

  it('open string note sits ON the nut, fretted notes mid-cell', () => {
    expect(noteX(G, 0)).toBe(34); // open string at the nut
    expect(noteX(G, 1)).toBe(34 + 0.5 * 40); // mid first cell = 54
    expect(noteX(G, 3)).toBe(34 + 2.5 * 40); // = 134
  });

  it('high string (index 0) is the top row, lower index = smaller y', () => {
    expect(stringY(G, 0)).toBe(22); // padY
    expect(stringY(G, 1)).toBe(48); // 22 + 26
    expect(stringY(G, 0)).toBeLessThan(stringY(G, 5));
  });

  it('neck dimensions follow the geometry', () => {
    expect(neckWidth(G)).toBe(34 + 24 * 40 + 18);
    expect(neckHeight(G)).toBe(22 * 2 + 5 * 26);
  });
});

describe('extended-range geometry (geometryForStringCount)', () => {
  it('6 strings is byte-for-byte identical to DEFAULT_GEOMETRY', () => {
    // The charter invariant: deriving the count must not perturb 6-string output.
    expect(geometryForStringCount(6)).toEqual(G);
  });

  it('only the string count (and thus neckHeight) changes; fret math is unchanged', () => {
    for (const n of [6, 7, 8]) {
      const g = geometryForStringCount(n);
      expect(g.stringCount).toBe(n);
      // horizontal math identical to the 6-string default
      expect(neckWidth(g)).toBe(neckWidth(G));
      expect(fretLineX(g, 12)).toBe(fretLineX(G, 12));
      expect(noteX(g, 3)).toBe(noteX(G, 3));
      // height scales with (stringCount - 1) rows
      expect(neckHeight(g)).toBe(22 * 2 + (n - 1) * 26);
    }
  });

  it('a 7-string neck adds one row below the 6-string neck', () => {
    const g7 = geometryForStringCount(7);
    expect(stringY(g7, 6)).toBe(22 + 6 * 26); // the added 7th row
    expect(neckHeight(g7)).toBeGreaterThan(neckHeight(G));
  });

  it('an 8-string neck has eight addressable rows in top-to-bottom order', () => {
    const g8 = geometryForStringCount(8);
    const ys = Array.from({ length: 8 }, (_, s) => stringY(g8, s));
    expect(ys).toEqual([...ys].sort((a, b) => a - b)); // strictly increasing (high on top)
    expect(stringY(g8, 7)).toBe(22 + 7 * 26);
  });
});
