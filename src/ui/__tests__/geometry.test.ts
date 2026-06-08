// Geometry helpers — pure fret/string coordinate math (validated against the
// fixed DEFAULT_GEOMETRY: padLeft 34, fretSpacing 40, stringSpacing 26, padY 22).

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEOMETRY as G,
  fretLineX,
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
