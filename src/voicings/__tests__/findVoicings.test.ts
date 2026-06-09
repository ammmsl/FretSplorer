import { describe, expect, it } from 'vitest';
import { chord, tuning, toPitchClass } from '../../core';
import {
  findVoicings,
  playability,
  scoreFeatures,
  PLAYABILITY_THRESHOLDS,
} from '../findVoicings';

// Standard EADGBE, string 1 → 6 (high E first), as MIDI ints. tonic = E (pc 4).
// E4=64 B3=59 G3=55 D3=50 A2=45 E2=40
const EADGBE = tuning('EADGBE', [64, 59, 55, 50, 45, 40], 4);

// C major triad pitch classes {C=0, E=4, G=7}.
const CMAJ = chord('C');
const C_PCS = new Set<number>([0, 4, 7]);

describe('playability', () => {
  it('flags an open-position narrow shape easy', () => {
    // open C chord shape frets: x3201 0 → fretted {3,2,1}, span 2
    const p = playability([3, 2, 1]);
    expect(p.fretSpan).toBe(2);
    expect(p.fingerCount).toBe(3);
    expect(['easy', 'moderate']).toContain(p.flag);
    expect(p.flag).toBe('easy');
  });

  it('treats open and muted strings as zero-finger', () => {
    const p = playability([0, 0, 2, 2, 0]); // zeros ignored
    expect(p.fretSpan).toBe(0);
    expect(p.fingerCount).toBe(1);
    expect(p.flag).toBe('easy');
  });

  it('flags a wide barre-like shape hard', () => {
    // frets spanning 7..12 → span 5 (> hardSpan 4, ≤ impossibleSpan 6)
    const p = playability([7, 9, 12]);
    expect(p.fretSpan).toBe(5);
    expect(p.flag).toBe('hard');
  });

  it('flags an unreachable wide span impossible', () => {
    const p = playability([2, 10]); // span 8 > impossibleSpan 6
    expect(p.fretSpan).toBe(8);
    expect(p.flag).toBe('impossible');
  });

  it('flags too-many-fingers-across-a-wide-span impossible', () => {
    // 5 distinct fretted positions across span 5 → impossible
    const p = playability([3, 4, 5, 7, 8]);
    expect(p.fingerCount).toBe(5);
    expect(p.fretSpan).toBe(5);
    expect(p.flag).toBe('impossible');
  });

  it('honours the documented thresholds', () => {
    expect(PLAYABILITY_THRESHOLDS.hardSpan).toBe(4);
    expect(PLAYABILITY_THRESHOLDS.impossibleSpan).toBe(6);
  });
});

describe('findVoicings', () => {
  it('returns ≥1 voicing for C major on EADGBE', () => {
    const out = findVoicings(CMAJ, EADGBE);
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it('every result sounds only {C,E,G} and includes the root C', () => {
    const out = findVoicings(CMAJ, EADGBE, { limit: 8 });
    for (const rv of out) {
      const pcs = rv.voicing.pitches.map((p) => toPitchClass(p) as number);
      expect(pcs.length).toBeGreaterThanOrEqual(3);
      for (const pc of pcs) expect(C_PCS.has(pc)).toBe(true);
      expect(pcs).toContain(0); // root C present
    }
  });

  it('aligns frets to the tuning string count', () => {
    const out = findVoicings(CMAJ, EADGBE, { limit: 3 });
    for (const rv of out) {
      expect(rv.frets.length).toBe(EADGBE.openStrings.length);
    }
  });

  it('returns results sorted by score descending', () => {
    const out = findVoicings(CMAJ, EADGBE, { limit: 8 });
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
    }
  });

  it('respects the limit option', () => {
    const out = findVoicings(CMAJ, EADGBE, { limit: 2 });
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it('never returns an impossible-to-fret shape', () => {
    const out = findVoicings(CMAJ, EADGBE, { limit: 8 });
    for (const rv of out) {
      expect(rv.playability.flag).not.toBe('impossible');
    }
  });

  it('returns [] for a chord with no fit in range, without throwing', () => {
    // A tuning whose only string is far from any C/E/G within a tiny fret window
    // — but more directly: cap maxFret so no in-chord fret can be reached on enough
    // strings. Use a single-pitch-class impossible target via a bizarre tuning.
    const weird = tuning('one', [40, 41], 0); // only 2 strings → can't reach ≥3 sounding
    expect(() => findVoicings(CMAJ, weird)).not.toThrow();
    expect(findVoicings(CMAJ, weird)).toEqual([]);
  });

  it('bass is computed by pitch (argmin), not string index', () => {
    const out = findVoicings(CMAJ, EADGBE, { limit: 1 });
    const rv = out[0];
    const pitches = rv.voicing.pitches.map((p) => p as number);
    const min = Math.min(...pitches);
    expect(pitches[rv.voicing.bassIndex]).toBe(min);
  });
});

describe('scoreFeatures', () => {
  it('rewards completeness and easy playability over sparse/hard shapes', () => {
    const good = scoreFeatures({
      hasThird: true,
      hasSeventh: false,
      complete: true,
      mutedCount: 0,
      fretSpan: 1,
      lowestFret: 0,
      flag: 'easy',
    });
    const bad = scoreFeatures({
      hasThird: false,
      hasSeventh: false,
      complete: false,
      mutedCount: 3,
      fretSpan: 5,
      lowestFret: 9,
      flag: 'hard',
    });
    expect(good).toBeGreaterThan(bad);
  });
});
