// Palette helpers — degree -> dot style and tension -> drone style mappings.
// The root is a DISTINCT SHAPE; chord tones are more saturated than extensions;
// every GradedTension term resolves to a style and tense terms get a dash (CVD).

import { describe, expect, it } from 'vitest';
import type { Degree, GradedTension, PitchClass } from '../../core';
import { darken, degreeStyle, droneStyle, lighten } from '../palette';

function deg(fromRoot: number, label: string, isChordTone: boolean): Degree {
  return { fromRoot: fromRoot as PitchClass, label, isChordTone };
}

describe('degreeStyle', () => {
  it('marks the root (fromRoot 0 / label "1") with the distinct shape', () => {
    expect(degreeStyle(deg(0, '1', true)).shape).toBe('root');
  });

  it('non-root degrees are plain circles', () => {
    expect(degreeStyle(deg(7, '5', true)).shape).toBe('plain');
    expect(degreeStyle(deg(2, '9', false)).shape).toBe('plain');
  });

  it('extensions are lightened relative to the same-hue chord tone', () => {
    // b3 (offset 3) as chord tone vs as extension -> extension fill differs (lighter).
    const chordTone = degreeStyle(deg(3, 'b3', true)).fill;
    const extension = degreeStyle(deg(3, 'b3', false)).fill;
    expect(extension).not.toBe(chordTone);
  });

  it('always returns a valid hex fill', () => {
    for (let pc = 0; pc < 12; pc++) {
      expect(degreeStyle(deg(pc, String(pc), pc % 2 === 0)).fill).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('droneStyle', () => {
  const all: GradedTension[] = ['reinforce', 'consonant', 'color', 'bite', 'unstable'];

  it('resolves every tension term to a style', () => {
    for (const t of all) {
      const s = droneStyle(t);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(s.width).toBeGreaterThan(0);
    }
  });

  it('safe drones are SOLID, tense drones are DASHED (CVD redundancy)', () => {
    expect(droneStyle('reinforce').dash).toBe('');
    expect(droneStyle('consonant').dash).toBe('');
    expect(droneStyle('color').dash).not.toBe('');
    expect(droneStyle('bite').dash).not.toBe('');
    expect(droneStyle('unstable').dash).not.toBe('');
  });
});

describe('colour mix helpers', () => {
  it('lighten moves toward white, darken toward black', () => {
    expect(lighten('#000000', 1)).toBe('#ffffff');
    expect(darken('#ffffff', 1)).toBe('#000000');
    expect(lighten('#808080', 0)).toBe('#808080');
  });
});
