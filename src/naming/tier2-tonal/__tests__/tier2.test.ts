// Tier-2 namer tests — validate against KNOWN Tonal Chord.detect outputs.
// docs/06 R10: bass = argmin(pitch), spelled with octave.

import { describe, expect, it } from 'vitest';
import { voicing } from '../../../core';
import { nameTier2 } from '../tier2';

describe('nameTier2', () => {
  it('labels the Open-G home chord as G major over bass D (slash), bassNote D2', () => {
    // D2 G2 D3 G3 B3 D4 — the open-G tuning home chord. Lowest pitch is D2 (38).
    const v = voicing([38, 43, 50, 55, 59, 62]);
    const result = nameTier2(v);

    expect(result.primary).not.toBeNull();
    // G major slash over D: "GM/D" (or "G/D" depending on Tonal symbol style).
    expect(result.primary).toMatch(/^G(M|maj)?\/D$/);
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates[0].symbol).toMatch(/^G(M|maj)?$/);
    expect(result.candidates[0].slashBass).toBe('D');
    // bassNote keeps the octave; it is the actual lowest pitch (R10).
    expect(result.bassNote).toBe('D2');
    // notes are bass-first, octave-stripped.
    expect(result.notes[0]).toBe('D');
  });

  it('labels C E G B as a Cmaj7 form with >=1 candidate', () => {
    const v = voicing([60, 64, 67, 71]); // C4 E4 G4 B4
    const result = nameTier2(v);

    expect(result.primary).toMatch(/^C(maj7|M7)$/);
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.bassNote).toBe('C4');
  });

  it('labels a plain C major root-position triad as major C with no slash', () => {
    const v = voicing([60, 64, 67]); // C4 E4 G4, bass = C4
    const result = nameTier2(v);

    expect(result.primary).not.toBeNull();
    expect(result.candidates[0].symbol).toMatch(/^C(M|maj)?$/);
    expect(result.candidates[0].slashBass).toBeUndefined();
    expect(result.bassNote).toBe('C4');
  });

  it('returns primary possibly null but never throws on an ambiguous cluster', () => {
    const v = voicing([60, 61, 62, 63]); // C C# D D# — chromatic cluster
    expect(() => nameTier2(v)).not.toThrow();
    const result = nameTier2(v);
    // Tonal returns no chord for this cluster.
    expect(result.primary).toBeNull();
    expect(result.candidates).toEqual([]);
    expect(result.bassNote).toBe('C4');
  });
});
