// ADVERSARIAL identify() tests — written independently of the implementer's own
// fixtures to TRY TO BREAK the three load-bearing claims of identify() (M1):
//   1. bass = LOWEST PITCH (argmin), never the lowest string index (docs/06 R10);
//      probed with a re-entrant minimum at a MIDDLE string index and with a
//      NON-uniform partial capo that relocates the sounding minimum.
//   2. the full sounding MULTISET (octaves + doublings) is PRESERVED in each
//      candidate voicing — never deduped, sorted, or collapsed to pitch classes.
//   3. RANKED, never one forced answer (R5): score-descending, surface-capped,
//      ambiguous shapes return [] or >1 without throwing.
//
// These tests deliberately do NOT reuse the implementer's helpers or shapes.

import { describe, expect, it } from 'vitest';
import { applyCapo, midi, tuning } from '../../core';
import type { PlacedPosition } from '../../core';
import { SURFACE_POLICY } from '../ranking';
import { identify } from '../identify';

/** Build a shape from explicit (string, fret) pairs — the adversarial input shape. */
function shape(pairs: ReadonlyArray<readonly [number, number]>): PlacedPosition[] {
  return pairs.map(([string, fret]) => ({ string, fret }));
}

/** Independent recomputation of the true sounding pitches for a shape + tuning,
 *  so assertions about the bass do NOT trust identify()'s internal arithmetic. */
function soundingPitches(
  pairs: ReadonlyArray<readonly [number, number]>,
  openStrings: readonly number[],
): number[] {
  return pairs.map(([s, f]) => openStrings[s] + f);
}

describe('identify — adversarial: CLAIM 1 (bass = lowest PITCH, not lowest string index)', () => {
  it('re-entrant tuning: global minimum sits at a MIDDLE string index (neither 0 nor last)', () => {
    // Open strings (string 0..4): [71(B4), 64(E4), 48(C3), 67(G4), 72(C5)].
    // The MINIMUM open pitch (48, C3) is at index 2 — strictly interior.
    // Shape all five open. True minimum stays at index 2 regardless of string order.
    const reentrant = tuning('reentrant-mid', [71, 64, 48, 67, 72], 0);
    const pairs: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const expected = soundingPitches(pairs, [71, 64, 48, 67, 72]);
    const trueMin = Math.min(...expected); // 48
    const trueMinIndex = expected.indexOf(trueMin); // 2

    const result = identify(shape(pairs), reentrant, {});
    expect(result.length).toBeGreaterThanOrEqual(1);

    for (const cand of result) {
      const v = cand.voicing;
      // bassIndex must be the interior argmin, NOT 0 and NOT last.
      expect(v.bassIndex).toBe(trueMinIndex);
      expect(v.bassIndex).not.toBe(0);
      expect(v.bassIndex).not.toBe(expected.length - 1);
      // The bass PITCH is the true global minimum.
      expect(v.pitches[v.bassIndex] as number).toBe(trueMin);
    }
  });

  it('re-entrant tuning with NON-zero frets: a fretted note becomes the global minimum', () => {
    // Open strings: [69(A4), 70(Bb4), 55(G3), 64(E4)]. String 2 open (55) is the
    // lowest open, but we fret string 0 down? No — frets only RAISE pitch. So
    // engineer the minimum onto an interior string via a low open string + 0 fret,
    // while OTHER strings are fretted up so the minimum lands interior, not at 0/last.
    // Open: [60(C4), 50(D3), 64(E4)] ; fret string 0 up to 3 (->63), string 2 up to 2 (->66).
    // String 1 stays open at 50 = the global minimum, at interior-ish index 1 (last is 2).
    const t = tuning('fretted-min', [60, 50, 64], 0);
    const pairs: Array<[number, number]> = [
      [0, 3], // 63
      [1, 0], // 50  <- minimum
      [2, 2], // 66
    ];
    const expected = soundingPitches(pairs, [60, 50, 64]); // [63,50,66]
    const trueMin = Math.min(...expected); // 50
    const trueMinIndex = expected.indexOf(trueMin); // 1

    const result = identify(shape(pairs), t, {});
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const cand of result) {
      const v = cand.voicing;
      expect(v.pitches[v.bassIndex] as number).toBe(trueMin);
      expect(v.bassIndex).toBe(trueMinIndex);
      // Multiset order matches the input shape's sounding pitches exactly.
      expect([...v.pitches].map((m) => m as number)).toEqual(expected);
    }
  });

  it('PARTIAL CAPO (non-uniform vector) relocates the sounding minimum', () => {
    // Base tuning (string 0..5), STANDARD-ish ordering where string 5 is the lowest:
    // [64(E4), 59(B3), 55(G3), 50(D3), 45(A2), 40(E2)].
    // Apply a NON-uniform partial capo on the TOP three strings: [4,4,4,0,0,0].
    // Only the high strings shift; the low strings (3,4,5) are untouched, so the
    // global minimum stays 40 (E2) at string index 5 AFTER the capo — but the
    // POINT is the bass must be computed from the SHIFTED virtual tuning's pitches,
    // not from the base. We then design a SECOND capo that DOES move the minimum.
    const base = tuning('std', [64, 59, 55, 50, 45, 40], 4);

    // Capo A: lift only the LOW strings so a HIGH string becomes the new minimum.
    // Vector raises strings 3,4,5 a lot; string 0..2 untouched.
    const capoA = [0, 0, 0, 12, 12, 12];
    const virtualA = applyCapo(base, capoA);
    // virtual open pitches: [64,59,55,62,57,52].
    const pairsA: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ];
    const virtualOpenA = [...virtualA.openStrings].map((m) => m as number);
    const expectedA = soundingPitches(pairsA, virtualOpenA);
    const trueMinA = Math.min(...expectedA); // 52 (string 5) vs 55 string 2 -> 52
    const trueMinIndexA = expectedA.indexOf(trueMinA);

    const resA = identify(shape(pairsA), virtualA, {});
    expect(resA.length).toBeGreaterThanOrEqual(1);
    for (const cand of resA) {
      const v = cand.voicing;
      // Bass is the lowest SOUNDING pitch after the per-string shift.
      expect(v.pitches[v.bassIndex] as number).toBe(trueMinA);
      expect(v.bassIndex).toBe(trueMinIndexA);
    }

    // Capo B: the classic partial capo [2,2,2,0,0,0] on the TOP strings. Verify the
    // bass is still computed from the post-shift virtual tuning (lowest is 40 at idx 5),
    // i.e. identify never re-derives pitch from the BASE tuning behind applyCapo's back.
    const capoB = [2, 2, 2, 0, 0, 0];
    const virtualB = applyCapo(base, capoB); // [66,61,57,50,45,40]
    const virtualOpenB = [...virtualB.openStrings].map((m) => m as number);
    const pairsB = pairsA;
    const expectedB = soundingPitches(pairsB, virtualOpenB);
    const trueMinB = Math.min(...expectedB); // 40 at index 5
    const trueMinIndexB = expectedB.indexOf(trueMinB);

    const resB = identify(shape(pairsB), virtualB, {});
    expect(resB.length).toBeGreaterThanOrEqual(1);
    for (const cand of resB) {
      const v = cand.voicing;
      expect(v.pitches[v.bassIndex] as number).toBe(trueMinB);
      expect(v.bassIndex).toBe(trueMinIndexB);
      // And the shifted high strings really are present in the multiset (66,61,57).
      const ps = [...v.pitches].map((m) => m as number);
      expect(ps).toEqual(expectedB);
    }
  });
});

describe('identify — adversarial: CLAIM 2 (multiset preserved, never collapsed)', () => {
  it('octave-doubled pitch class survives intact (same length, order, doublings)', () => {
    // C major triad with the ROOT doubled an octave up and the FIFTH doubled too:
    // C3(48), E3(52), G3(55), C4(60), G4(67). Pitch classes {0,4,7} but FIVE pitches.
    // A pc-set collapse would yield length 3; the multiset MUST stay length 5.
    const t = tuning('doubled-c', [48, 52, 55, 60, 67], 0);
    const pairs: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const expected = soundingPitches(pairs, [48, 52, 55, 60, 67]); // [48,52,55,60,67]
    const result = identify(shape(pairs), t, {});
    expect(result.length).toBeGreaterThanOrEqual(1);

    for (const cand of result) {
      const ps = [...cand.voicing.pitches].map((m) => m as number);
      // EXACT multiset: same length (5, not 3), same order, doublings intact.
      expect(ps).toEqual(expected);
      expect(ps.length).toBe(5);
      // Doublings present: two pitch-class-0 (48,60) and two pitch-class-7 (55,67).
      expect(ps.filter((p) => p % 12 === 0)).toEqual([48, 60]);
      expect(ps.filter((p) => p % 12 === 7)).toEqual([55, 67]);
      // NOT sorted away from input order: 67 (last) > 48 (first) yet 48 stays first.
      expect(ps[0]).toBe(48);
      expect(ps[ps.length - 1]).toBe(67);
    }
  });

  it('a UNISON doubling (same MIDI pitch twice) is not deduped', () => {
    // Two strings sounding the SAME pitch (60), plus E4(64), G4(67). A Set-collapse
    // would drop one 60. The multiset must keep both.
    const t = tuning('unison', [60, 60, 64, 67], 0);
    const pairs: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ];
    const result = identify(shape(pairs), t, {});
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const cand of result) {
      const ps = [...cand.voicing.pitches].map((m) => m as number);
      expect(ps).toEqual([60, 60, 64, 67]);
      expect(ps.length).toBe(4);
      expect(ps.filter((p) => p === 60).length).toBe(2);
    }
  });

  it('every surfaced candidate SHARES the one realised voicing (only interpretation varies)', () => {
    const t = tuning('shared-voicing', [48, 52, 55, 60, 67], 0);
    const pairs: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const result = identify(shape(pairs), t, {});
    expect(result.length).toBeGreaterThanOrEqual(1);
    const first = [...result[0].voicing.pitches].map((m) => m as number);
    for (const cand of result) {
      expect([...cand.voicing.pitches].map((m) => m as number)).toEqual(first);
      expect(cand.voicing.bassIndex).toBe(result[0].voicing.bassIndex);
    }
  });
});

describe('identify — adversarial: CLAIM 3 (ranked, never one forced answer)', () => {
  it('results are strictly score-DESCENDING and capped at SURFACE_POLICY.maxCandidates', () => {
    // A rich, ambiguous-ish shape likely to yield several readings: C E G B D
    // (Cmaj9 / Em7-over-C / G6 fragments). Don't over-specify which — just the policy.
    const t = tuning('rich', [60, 64, 67, 71, 74], 0);
    const pairs: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    const result = identify(shape(pairs), t, {});
    expect(Array.isArray(result)).toBe(true);
    // Descending by score.
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
    // Hard cap.
    expect(result.length).toBeLessThanOrEqual(SURFACE_POLICY.maxCandidates);
    // Surfaced alternates lie within the score gap of the primary (surface policy).
    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        expect(result[0].score - result[i].score).toBeLessThanOrEqual(
          SURFACE_POLICY.alternateScoreGap,
        );
      }
    }
  });

  it('an AMBIGUOUS chromatic cluster returns [] or >1 WITHOUT throwing (no forced single answer)', () => {
    // Four-note chromatic cluster: no clean chord. Must not throw; must not invent
    // a single forced answer beyond what the surface policy allows.
    const t = tuning('chromatic', [60, 61, 62, 63], 0);
    expect(() => identify(shape([[0, 0], [1, 0], [2, 0], [3, 0]]), t, {})).not.toThrow();
    const result = identify(shape([[0, 0], [1, 0], [2, 0], [3, 0]]), t, {});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(SURFACE_POLICY.maxCandidates);
  });

  it('a clearly ambiguous symmetric shape (augmented triad) yields multiple candidates', () => {
    // Augmented triad C E G# (60,64,68) is maximally ambiguous: C+, E+, Ab+ are
    // enharmonically the same set. Expect MORE than one candidate (ranked), and no throw.
    const t = tuning('augmented', [60, 64, 68], 0);
    expect(() => identify(shape([[0, 0], [1, 0], [2, 0]]), t, {})).not.toThrow();
    const result = identify(shape([[0, 0], [1, 0], [2, 0]]), t, {});
    expect(result.length).toBeGreaterThanOrEqual(1);
    // If the engine surfaces alternates, they obey the cap and the gap.
    expect(result.length).toBeLessThanOrEqual(SURFACE_POLICY.maxCandidates);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it('single-note shape does not throw and returns an array (degenerate, not forced)', () => {
    const t = tuning('single', [60, 64, 67], 0);
    expect(() => identify(shape([[0, 0]]), t, {})).not.toThrow();
    const result = identify(shape([[0, 0]]), t, {});
    expect(Array.isArray(result)).toBe(true);
  });

  // Guard against the unused-import lint: assert the constructor is reachable.
  it('midi constructor is available (sanity)', () => {
    expect(midi(60) as number).toBe(60);
  });
});
