// Label-mode helper — the [none -> degree -> note] cycle and dot text resolution.
// Note mode spells the absolute pitch in the tuning's key context via core spell().

import { describe, expect, it } from 'vitest';
import { degreeFromOffset, midi, pitchClass } from '../../core';
import type { KeyContext } from '../../core';
import { DEFAULT_LABEL_MODE, dotLabel, nextLabelMode } from '../labels';

describe('label mode cycle', () => {
  it('defaults to degree number (pedagogy is relational)', () => {
    expect(DEFAULT_LABEL_MODE).toBe('degree');
  });

  it('cycles none -> degree -> note -> none', () => {
    expect(nextLabelMode('none')).toBe('degree');
    expect(nextLabelMode('degree')).toBe('note');
    expect(nextLabelMode('note')).toBe('none');
  });
});

describe('dotLabel', () => {
  const ctxG: KeyContext = { tonic: pitchClass(7) }; // key of G (prefers sharps)
  const rootDegree = degreeFromOffset(0); // label "1"
  const minorThird = degreeFromOffset(3); // label "b3"

  it('none mode shows no text', () => {
    expect(dotLabel('none', rootDegree, midi(40), ctxG)).toBe('');
  });

  it('degree mode shows the degree label', () => {
    expect(dotLabel('degree', minorThird, midi(40), ctxG)).toBe('b3');
  });

  it('note mode spells the pitch in key context', () => {
    // MIDI 61 = C#/Db; in G (sharps) -> "C#".
    expect(dotLabel('note', rootDegree, midi(61), ctxG)).toBe('C#');
  });
});
