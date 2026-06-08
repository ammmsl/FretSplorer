import { describe, expect, it } from 'vitest';
import {
  GRAVITY_IN_S2,
  inchesToMeters,
  lbToNewton,
  midiToFrequency,
  midiToNoteName,
  tensionLb,
  tensionNewtonMetric,
  unitWeightToLinearMass,
} from '../formula';
import { findByItem } from '../data/unitWeights';

// MIDI helpers
const E4 = 64;
const B3 = 59;
const G3 = 55;
const D3 = 50;
const A2 = 45;
const E2 = 40;

describe('midiToFrequency', () => {
  it('anchors A4 = 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
  });
  it('matches standard pitches', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 2); // C4
    expect(midiToFrequency(E4)).toBeCloseTo(329.628, 2);
    expect(midiToFrequency(E2)).toBeCloseTo(82.407, 2);
  });
});

describe('midiToNoteName', () => {
  it('spells with octave', () => {
    expect(midiToNoteName(60)).toBe('C4');
    expect(midiToNoteName(64)).toBe('E4');
    expect(midiToNoteName(40)).toBe('E2');
    expect(midiToNoteName(38)).toBe('D2');
  });
});

describe('formula constant', () => {
  it('uses 386.4 in/s^2 (g)', () => {
    expect(GRAVITY_IN_S2).toBe(386.4);
  });
});

// HARD-STOP VALIDATION SET.
// D'Addario publishes per-string tension for its sets at 25.5". These six points
// span the EXL110 (.010-.046 nickel) set and exercise plain steel + nickel wound.
// The formula + our authoritative unit weights must reproduce them within rounding.
describe('formula validated against published D Addario reference tensions (25.5")', () => {
  const L = 25.5;
  const cases: Array<[string, number, number]> = [
    // [catalog item, MIDI pitch, published tension lb]
    ['PL010', E4, 16.2],
    ['PL013', B3, 15.4],
    ['PL017', G3, 16.6],
    ['NW026', D3, 18.4],
    ['NW036', A2, 19.5],
    ['NW046', E2, 17.5],
  ];
  for (const [item, midi, published] of cases) {
    it(`${item} @ ${midiToNoteName(midi)} ~= ${published} lb`, () => {
      const e = findByItem(item)!;
      const t = tensionLb(e.uw, L, midiToFrequency(midi));
      expect(t).toBeCloseTo(published, 1); // within ~0.05 lb
    });
  }
});

// Phosphor bronze validation: PB unit weights must reproduce the D'Addario
// fretted-string chart's OWN reference tensions (acoustic runs much higher).
describe('phosphor bronze validated against chart reference tensions (25.5")', () => {
  const L = 25.5;
  it('PB022 across its column matches', () => {
    const e = findByItem('PB022')!;
    expect(tensionLb(e.uw, L, midiToFrequency(B3))).toBeCloseTo(40.5, 1);
    expect(tensionLb(e.uw, L, midiToFrequency(G3))).toBeCloseTo(25.5, 1);
    expect(tensionLb(e.uw, L, midiToFrequency(D3))).toBeCloseTo(14.3, 1);
  });
  it('PB053 @ E2 ~= 19.1 lb', () => {
    const e = findByItem('PB053')!;
    expect(tensionLb(e.uw, L, midiToFrequency(E2))).toBeCloseTo(19.1, 1);
  });
});

describe('imperial and metric-native forms agree', () => {
  const L = 25.5;
  for (const item of ['PL010', 'NW046', 'PB053']) {
    it(`${item}: T_N(metric) == lbToNewton(T_lb)`, () => {
      const e = findByItem(item)!;
      const f = midiToFrequency(E2 + 12); // arbitrary in-range pitch
      const tLb = tensionLb(e.uw, L, f);
      const tN_metric = tensionNewtonMetric(
        unitWeightToLinearMass(e.uw),
        inchesToMeters(L),
        f,
      );
      expect(tN_metric).toBeCloseTo(lbToNewton(tLb), 3);
    });
  }
});
