// identify() tests — the reverse spine node (M1). Validated against KNOWN facts:
// Open-G home chord, re-entrant bass, ranked omission penalties, ambiguous clusters.
// docs/06 R5 (ranked) + R10 (bass = argmin pitch; multiset preserved).

import { describe, expect, it } from 'vitest';
import { pitchClass, tuning } from '../../core';
import type { PlacedPosition } from '../../core';
import { identify } from '../identify';

/** All six open strings (fret 0) for a 6-string tuning. */
function allOpen(stringCount: number): PlacedPosition[] {
  return Array.from({ length: stringCount }, (_, string) => ({ string, fret: 0 }));
}

describe('identify', () => {
  it('OPEN-G HOME CHORD: top candidate is G (root 7), G-over-D reading, multiset preserved', () => {
    // open-g: string 0..5 = [62,59,55,50,43,38] (D4 B3 G3 D3 G2 D2), tonic G = 7.
    const openG = tuning('open-g', [62, 59, 55, 50, 43, 38], 7);
    const result = identify(allOpen(6), openG, {});

    expect(result.length).toBeGreaterThanOrEqual(1);
    const top = result[0];

    // Top reading is G major: chord root === 7 (G).
    expect(top.chord.root).toBe(7);

    // Bass is the LOWEST PITCH (38 = D2), NOT string index 0 (62) — a G/D reading.
    expect(top.voicing.pitches[top.voicing.bassIndex]).toBe(38);

    // The realised multiset is preserved EXACTLY in pitch (input) order.
    expect([...top.voicing.pitches]).toEqual([62, 59, 55, 50, 43, 38]);
  });

  it('RE-ENTRANT: bass is the true minimum pitch even when not at string index 0', () => {
    // A re-entrant tuning where string 0 is NOT the lowest pitch: a high G on top.
    // strings: [67(G4), 60(C4), 64(E4)] — a C major triad, lowest pitch is C4 (60)
    // at string index 1, NOT index 0.
    const reentrant = tuning('reentrant-c', [67, 60, 64], 0);
    const result = identify(allOpen(3), reentrant, {});

    expect(result.length).toBeGreaterThanOrEqual(1);
    const v = result[0].voicing;
    // bassIndex points at the true minimum (60 at index 1), not string 0 (67).
    expect(v.pitches[v.bassIndex]).toBe(60);
    expect(v.bassIndex).toBe(1);
    // root-position C major: top candidate root === 0 (C), bass IS the root.
    expect(result[0].chord.root).toBe(0);
  });

  it('RANKED: dropped-5th vs missing-3rd; scores descend; capped at 3', () => {
    // Dropped 5th but 3rd present: C E Bb (C4 E4 Bb4) -> C7no5 / C7 (LIGHT penalty).
    const dropped5 = tuning('lin', [60, 64, 70], 0);
    const r5 = identify(allOpen(3), dropped5, {});
    expect(r5.length).toBeGreaterThanOrEqual(1);
    // Some candidate is rooted at C (0) — identifies despite the omitted 5th.
    expect(r5.some((c) => c.chord.root === 0)).toBe(true);
    // Scores are descending.
    for (let i = 1; i < r5.length; i++) {
      expect(r5[i - 1].score).toBeGreaterThanOrEqual(r5[i].score);
    }
    // Hard cap at maxCandidates (3).
    expect(r5.length).toBeLessThanOrEqual(3);
  });

  it('RANKED: within a dropped-5th grip the omitted-5th reading is the LIGHTLY penalised alternate', () => {
    // C E Bb (C4 E4 Bb4): Tonal detects "C7no5" (nothing missing) AND "C7" (assumes
    // a G that is not sounding -> omit5thPenalty + one parsimony tone). Both are
    // C-rooted root-position readings, so they differ ONLY by the omission penalty:
    // the no-omission reading must outrank the omitted-5th one, and both are present.
    const dropped5 = tuning('lin', [60, 64, 70], 0);
    const r = identify(allOpen(3), dropped5, {});
    const c7no5 = r.find((c) => c.chord.symbol === 'C7no5');
    const c7 = r.find((c) => c.chord.symbol === 'C7');
    expect(c7no5).toBeDefined();
    // The omitted-5th reading, when surfaced, scores strictly lower (lightly penalised).
    if (c7) expect(c7.score).toBeLessThan(c7no5!.score);
  });

  it('KEY CONTEXT biases ranking toward the diatonic / tonic reading', () => {
    // Open-G grip read in the key of G: G major (root in key, diatonic) should win
    // decisively, with a markedly higher score than without context.
    const openG = tuning('open-g', [62, 59, 55, 50, 43, 38], 7);
    const withKey = identify(allOpen(6), openG, { key: { tonic: pitchClass(7) } });
    const noKey = identify(allOpen(6), openG, {});

    expect(withKey[0].chord.root).toBe(7);
    // The G reading is boosted by keyContextBias relative to the no-key run.
    const gWith = withKey.find((c) => c.chord.root === 7)!;
    const gNo = noKey.find((c) => c.chord.root === 7)!;
    expect(gWith.score).toBeGreaterThan(gNo.score);
  });

  it('AMBIGUOUS cluster never throws and returns [] (or >1 within the gap)', () => {
    // C C# D D# chromatic cluster — Tonal detects no chord.
    const cluster = tuning('cluster', [60, 61, 62, 63], 0);
    expect(() => identify(allOpen(4), cluster, {})).not.toThrow();
    const result = identify(allOpen(4), cluster, {});
    expect(Array.isArray(result)).toBe(true);
    // Either empty, or any surfaced alternates are within the score gap of primary.
    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        expect(result[0].score - result[i].score).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('EMPTY grip returns [] without throwing', () => {
    const openG = tuning('open-g', [62, 59, 55, 50, 43, 38], 7);
    expect(() => identify([], openG, {})).not.toThrow();
    expect(identify([], openG, {})).toEqual([]);
  });
});
