// /projection tests — validated against KNOWN fretboard facts, not the impl
// (matches the src/tension/__tests__ style: assert against hand-checked truth).

import { describe, expect, it } from 'vitest';
import { chord, scale, toPitchClass, tuning } from '../../core';
import { droneMap, project } from '../index';

// Open G = D4 B3 G3 D3 G2 D2 (string 1 -> 6), tonic G (pc 7).
const OPEN_G = tuning('open-g', [62, 59, 55, 50, 43, 38], 7);
// Standard EADGBE = E4 B3 G3 D3 A2 E2, tonic E (pc 4).
const EADGBE = tuning('eadgbe', [64, 59, 55, 50, 45, 40], 4);

describe('project(chord, tuning) — C major over Open G', () => {
  const c = chord('C'); // root pc 0, pcs {0,4,7} = C E G
  const positions = project(c, OPEN_G);

  it('every emitted pitch folds to a C, E or G pitch class', () => {
    expect(positions.length).toBeGreaterThan(0);
    for (const p of positions) {
      expect([0, 4, 7]).toContain(toPitchClass(p.pitch) as number);
    }
  });

  it('degree labels are exactly 1 / 3 / 5', () => {
    const labels = new Set(positions.map((p) => p.degree.label));
    expect(labels).toEqual(new Set(['1', '3', '5']));
  });

  it('pitch math holds: pitch = openStrings[string] + fret', () => {
    for (const p of positions) {
      expect(p.pitch as number).toBe((OPEN_G.openStrings[p.string] as number) + p.fret);
    }
  });

  it('open positions (fret 0) appear exactly where an open string is C/E/G', () => {
    const openHits = positions.filter((p) => p.fret === 0).map((p) => p.string).sort();
    // Open G open strings: D4 B3 G3 D3 G2 D2 -> the G strings (idx 2 and 4) are chord tones.
    expect(openHits).toEqual([2, 4]);
  });
});

describe('project(scale, tuning) — C major over EADGBE', () => {
  const cMajor = scale('major', 0); // pcs {0,2,4,5,7,9,11}, root pc 0
  const positions = project(cMajor, EADGBE);

  it('root dots (degree "1") land exactly on the C pitch class', () => {
    const roots = positions.filter((p) => p.degree.label === '1');
    expect(roots.length).toBeGreaterThan(0);
    for (const p of roots) {
      expect(toPitchClass(p.pitch) as number).toBe(0);
    }
  });

  it('every emitted pitch class is in the C major scale', () => {
    const scalePcs = new Set(cMajor.pitchClasses.map((pc) => pc as number));
    for (const p of positions) {
      expect(scalePcs.has(toPitchClass(p.pitch) as number)).toBe(true);
    }
  });

  it('count is sane (~7 of 12 frets per string over 6 strings, frets 0..24)', () => {
    // 7 pcs / 12 * 25 frets ~= 14.6 per string * 6 ~= 87.5; allow a generous band.
    expect(positions.length).toBeGreaterThan(70);
    expect(positions.length).toBeLessThan(110);
  });
});

describe('project — switching tuning re-projects the same entity', () => {
  const c = chord('C');
  it('Open G vs EADGBE yield different position sets', () => {
    const a = project(c, OPEN_G);
    const b = project(c, EADGBE);
    const key = (ps: ReadonlyArray<{ string: number; fret: number }>) =>
      ps.map((p) => `${p.string}:${p.fret}`).join('|');
    expect(key(a)).not.toBe(key(b));
  });
});

describe('project — maxFret param is optional and bounds the scan', () => {
  it('defaults to 24 and respects a smaller cap', () => {
    const c = chord('C');
    const small = project(c, OPEN_G, 4);
    expect(small.every((p) => p.fret <= 4)).toBe(true);
    expect(project(c, OPEN_G).length).toBeGreaterThan(small.length);
  });

  it('skips pitches above MIDI 127', () => {
    // Highest open string D4 (62) + 24 = 86, well under 127; use a high tuning to probe.
    const high = tuning('high', [120], 0);
    const all = project(scale('chromatic', 0), high, 24);
    expect(all.every((p) => (p.pitch as number) <= 127)).toBe(true);
    // 120..127 inclusive = 8 playable frets of a chromatic scale.
    expect(all.length).toBe(8);
  });
});

describe('droneMap — graded drone-tension per open string', () => {
  it('Open G over chord("G"): G open strings reinforce (ic0), D strings consonant', () => {
    const drones = droneMap(chord('G'), OPEN_G);
    expect(drones.length).toBe(6);
    // Open G layout: D4 B3 G3 D3 G2 D2. G strings = idx 2,4. D strings = idx 0,3,5. B = idx 1.
    expect(drones[2].tension).toBe('reinforce');
    expect(drones[2].intervalClass).toBe(0);
    expect(drones[4].tension).toBe('reinforce');
    for (const i of [0, 3, 5]) {
      expect(drones[i].pitchClass as number).toBe(2); // D
      expect(drones[i].tension).toBe('consonant'); // ic 5 vs G
    }
  });

  it('chord("Ab") over Open G: at least one open string yields "bite" (ic1)', () => {
    const drones = droneMap(chord('Ab'), OPEN_G); // root pc 8
    const bites = drones.filter((d) => d.tension === 'bite');
    expect(bites.length).toBeGreaterThan(0);
    for (const b of bites) {
      expect(b.intervalClass).toBe(1);
      expect(b.rank).toBe(3);
    }
  });

  it('reports pitch / pitchClass / rank consistently with the tuning', () => {
    const drones = droneMap(chord('G'), OPEN_G);
    for (const d of drones) {
      expect(d.pitch as number).toBe(OPEN_G.openStrings[d.string] as number);
      expect(d.pitchClass as number).toBe(toPitchClass(d.pitch) as number);
      expect(d.rank).toBeGreaterThanOrEqual(0);
      expect(d.rank).toBeLessThanOrEqual(4);
    }
  });
});
