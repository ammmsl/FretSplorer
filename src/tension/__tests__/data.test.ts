import { describe, expect, it } from 'vitest';
import { breakTensionLbPlainSteel, minTensilePsi } from '../data/wireStrength';
import { entriesForMaterial, nearestEntry, UNIT_WEIGHTS } from '../data/unitWeights';

describe('ASTM A228 break tension (plain steel)', () => {
  it('PL010 (.010) breaks at ~30 lb (conservative)', () => {
    // 387000 psi * pi*(.005)^2 = ~30.4 lb. A .010 high E (16.2 lb @ E4) sits ~53%.
    expect(breakTensionLbPlainSteel(0.01)).toBeCloseTo(30.4, 0);
  });

  it('break tension rises with diameter', () => {
    expect(breakTensionLbPlainSteel(0.008)).toBeLessThan(breakTensionLbPlainSteel(0.012));
    expect(breakTensionLbPlainSteel(0.012)).toBeLessThan(breakTensionLbPlainSteel(0.016));
  });

  it('min tensile strength decreases with diameter and is clamped at the ends', () => {
    expect(minTensilePsi(0.01)).toBe(387000);
    expect(minTensilePsi(0.001)).toBe(439000); // clamped to thinnest entry
    expect(minTensilePsi(1)).toBe(330000); // clamped to thickest entry
    expect(minTensilePsi(0.011)).toBeLessThan(minTensilePsi(0.01));
  });

  it('interpolates between table points', () => {
    const mid = minTensilePsi(0.017); // between .016 (362000) and .018 (356000)
    expect(mid).toBeLessThan(362000);
    expect(mid).toBeGreaterThan(356000);
  });
});

describe('unit weight tables', () => {
  it('cover plain steel, nickel wound, phosphor bronze', () => {
    expect(entriesForMaterial('plain-steel').length).toBeGreaterThan(10);
    expect(entriesForMaterial('nickel-wound').length).toBeGreaterThan(10);
    expect(entriesForMaterial('phosphor-bronze').length).toBeGreaterThan(5);
  });

  it('are monotonic in gauge within each material (heavier = more mass)', () => {
    for (const material of ['plain-steel', 'nickel-wound', 'phosphor-bronze'] as const) {
      const e = entriesForMaterial(material).slice().sort((a, b) => a.gauge - b.gauge);
      for (let i = 1; i < e.length; i++) {
        expect(e[i].uw).toBeGreaterThan(e[i - 1].uw);
      }
    }
  });

  it('every entry has a positive unit weight and well-formed item id', () => {
    for (const e of UNIT_WEIGHTS) {
      expect(e.uw).toBeGreaterThan(0);
      expect(e.gauge).toBeGreaterThan(0);
      expect(e.item).toMatch(/^(PL|NW|PB)\d+$/);
    }
  });

  it('nearestEntry snaps to the closest catalog gauge of the right material', () => {
    expect(nearestEntry(0.0101, 'plain-steel').item).toBe('PL010');
    expect(nearestEntry(0.047, 'nickel-wound').item).toBe('NW046');
  });
});
