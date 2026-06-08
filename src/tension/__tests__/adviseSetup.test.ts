import { describe, expect, it } from 'vitest';
import { adviseSetup } from '../adviseSetup';
import type { Tuning } from '../types';

// Standard tuning EADGBE, string 1 (high E) -> string 6 (low E), as MIDI.
const STANDARD: Tuning = { strings: [64, 59, 55, 50, 45, 40] };
// Open G, string1 -> string6: D4 B3 G3 D3 G2 D2 (matches kb/tunings/open-g.yaml).
const OPEN_G: Tuning = { strings: [62, 59, 55, 50, 43, 38] };

// EXL110 nickel light gauges, high E -> low E.
const EXL110 = [0.01, 0.013, 0.017, 0.026, 0.036, 0.046];

describe('adviseSetup — standard tuning, EXL110, electric', () => {
  const advice = adviseSetup(STANDARD, { gauges: EXL110, instrument: 'electric' });

  it('reproduces published per-string tensions (within 0.1 lb of D Addario)', () => {
    // 0.1 lb tolerance reflects D'Addario's own published precision (UW given to 8
    // digits, tension to 1 decimal); the strict raw-formula gate is in formula.test.ts.
    const lbs = advice.strings.map((s) => s.tension.lb);
    const published = [16.2, 15.4, 16.6, 18.4, 19.5, 17.5];
    lbs.forEach((lb, i) => expect(Math.abs(lb - published[i])).toBeLessThanOrEqual(0.1));
  });

  it('flags every string fine (no break risk, not floppy)', () => {
    expect(advice.strings.every((s) => s.flag === 'fine')).toBe(true);
  });

  it('total set tension is in the expected ~100 lb range', () => {
    expect(advice.totalTensionLb).toBeGreaterThan(95);
    expect(advice.totalTensionLb).toBeLessThan(110);
  });

  it('reports both imperial and metric per string', () => {
    const s = advice.strings[0];
    expect(s.tension.newton).toBeCloseTo(s.tension.lb * 4.4482216, 1);
    expect(s.tension.kgf).toBeCloseTo(s.tension.lb * 0.45359237, 2);
  });

  it('carries formula + source provenance', () => {
    expect(advice.provenance.constant).toBe(386.4);
    expect(advice.provenance.formula).toContain('386.4');
    expect(advice.provenance.unitWeightSource).toMatch(/D.?Addario/);
  });
});

describe('FLOPPY edge', () => {
  // A .026 nickel-wound string tuned all the way down to low E2 is far too light:
  // ~5.8 lb, well under the floppy threshold.
  it('flags a grossly under-tensioned string floppy', () => {
    const advice = adviseSetup({ strings: [40] }, { gauges: [{ gauge: 0.026, material: 'nickel-wound' }] });
    const s = advice.strings[0];
    expect(s.band).toBe('very-loose');
    expect(s.flag).toBe('floppy');
    expect(s.tension.lb).toBeLessThan(8);
  });

  it('recommends a heavier gauge for a floppy string', () => {
    const advice = adviseSetup({ strings: [40] }, { gauges: [{ gauge: 0.026, material: 'nickel-wound' }] });
    const rec = advice.strings[0].recommendation;
    expect(rec).not.toBeNull();
    expect(rec!.gauge).toBeGreaterThan(0.026);
  });
});

describe('BREAK-RISK edge (safety-critical)', () => {
  it('flags a .010 plain string tuned up a 4th to A4 as break-risk', () => {
    const advice = adviseSetup({ strings: [69] }, { gauges: [0.01], instrument: 'electric' }); // A4
    const s = advice.strings[0];
    expect(s.gauge.material).toBe('plain-steel');
    expect(['high', 'over-limit']).toContain(s.breakRisk.level);
    expect(s.flag).toBe('break-risk');
    expect(s.breakRisk.uncertain).toBe(false); // plain steel = authoritative
    expect(advice.warnings.some((w) => /break risk/i.test(w))).toBe(true);
  });

  it('flags over-limit when a .010 plain is tuned to C5', () => {
    const advice = adviseSetup({ strings: [72] }, { gauges: [0.01] }); // C5
    const s = advice.strings[0];
    expect(s.breakRisk.level).toBe('over-limit');
    expect(s.breakRisk.fractionOfBreak!).toBeGreaterThan(1);
    expect(s.flag).toBe('break-risk');
  });

  it('a normal high E (.010 @ E4) is well clear of breaking', () => {
    const advice = adviseSetup({ strings: [64] }, { gauges: [0.01] });
    const s = advice.strings[0];
    expect(s.breakRisk.level).toBe('safe');
    expect(s.breakRisk.fractionOfBreak!).toBeLessThan(0.6);
  });

  it('recommends switching a break-risk plain string toward a safer choice', () => {
    const advice = adviseSetup({ strings: [69] }, { gauges: [0.01] });
    expect(advice.strings[0].recommendation).not.toBeNull();
  });
});

describe('WOUND break risk is honest about uncertainty (HARD STOP discipline)', () => {
  it('never asserts a computed break tension for wound strings', () => {
    const advice = adviseSetup(STANDARD, { gauges: EXL110 });
    const wound = advice.strings.filter((s) => s.gauge.material !== 'plain-steel');
    expect(wound.length).toBeGreaterThan(0);
    for (const s of wound) {
      expect(s.breakRisk.level).toBe('unknown');
      expect(s.breakRisk.breakTensionLb).toBeNull();
      expect(s.breakRisk.model).toBe('wound-core-unavailable');
      expect(s.breakRisk.uncertain).toBe(true);
      expect(s.flag).not.toBe('break-risk'); // we don't claim break for wound
    }
    expect(advice.warnings.some((w) => /wound/i.test(w))).toBe(true);
  });
});

describe('gauge ESTIMATION carries an explicit uncertainty flag', () => {
  const advice = adviseSetup(STANDARD); // no gauges supplied

  it('estimates every string and flags it uncertain', () => {
    expect(advice.strings.every((s) => s.gauge.estimated)).toBe(true);
    expect(advice.strings.every((s) => s.uncertain)).toBe(true);
    expect(advice.warnings.some((w) => /estimated/i.test(w))).toBe(true);
  });

  it('estimates sensible materials: high strings plain, low strings wound', () => {
    expect(advice.strings[0].gauge.material).toBe('plain-steel'); // high E
    expect(advice.strings[5].gauge.material).toBe('nickel-wound'); // low E
  });

  it('estimated gauges land in a playable tension range', () => {
    for (const s of advice.strings) {
      expect(s.tension.lb).toBeGreaterThan(11);
      expect(s.tension.lb).toBeLessThan(24);
    }
  });
});

describe('acoustic vs electric comfort bands', () => {
  it('acoustic light set reads as comfortable, not tight', () => {
    // EJ16-ish: .012/.016 plain, .024/.032/.042/.053 phosphor bronze.
    const advice = adviseSetup(STANDARD, {
      gauges: [0.012, 0.016, 0.024, 0.032, 0.049, 0.053],
      instrument: 'acoustic',
    });
    // Acoustic per-string tensions ~24-31 lb should be 'comfortable', not flagged tight on an electric scale.
    const middle = advice.strings.slice(2, 5);
    expect(middle.every((s) => s.tension.lb > 24)).toBe(true);
    expect(advice.strings.every((s) => s.flag !== 'floppy')).toBe(true);
  });
});

describe('scale length presets and units', () => {
  it('Gibson 24.75" yields lower tension than Fender 25.5"', () => {
    const fender = adviseSetup(OPEN_G, { gauges: EXL110, scaleLength: 25.5 });
    const gibson = adviseSetup(OPEN_G, { gauges: EXL110, scaleLength: 24.75 });
    expect(gibson.totalTensionLb).toBeLessThan(fender.totalTensionLb);
  });

  it('accepts scale length in mm', () => {
    const inches = adviseSetup(STANDARD, { gauges: EXL110, scaleLength: 25.5 });
    const mm = adviseSetup(STANDARD, { gauges: EXL110, scaleLength: 647.7, scaleLengthUnits: 'mm' });
    expect(mm.scaleLengthIn).toBeCloseTo(25.5, 1);
    expect(mm.totalTensionLb).toBeCloseTo(inches.totalTensionLb, 0);
  });
});

describe('re-entrant / arbitrary tunings are handled per string', () => {
  it('does not assume monotonic strings (Open G low D2 is string 6)', () => {
    const advice = adviseSetup(OPEN_G, { gauges: EXL110 });
    expect(advice.strings).toHaveLength(6);
    expect(advice.strings[5].noteName).toBe('D2');
  });
});
