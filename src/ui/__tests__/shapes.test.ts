// Shape discovery — PURE shape -> Shape projection at an anchor fret, validated against the
// authored cards. A realised shape shape must (a) place fretted strings at anchor+offset,
// (b) keep `open` template strings open at any anchor (a drone that does not slide), and
// (c) re-identify, through nameTier1, as the invariant the card claims (here: a full barre
// transposes the home chord -> home-transposed frame). R3 auto-derivation stays deferred.

import { describe, expect, it } from 'vitest';
import { loadGrammarCard, loadRules } from '../../kb';
import { tuning as makeTuning, type Tuning } from '../../core';
import { nameTier1 } from '../../naming/tier1-relational';
import { shapeToPlaced } from '../shape';
import { shapeAnchors, realizeShape } from '../shapes';

const rules = loadRules();

describe('realizeShape', () => {
  const openG = loadGrammarCard('open-g')!;
  const barre = openG.movableShapes!.find((s) => s.id === 'og-major-barre')!;
  const overDrone = openG.movableShapes!.find((s) => s.id === 'og-major-over-d-drone')!;

  it('a full-barre shape places every string at the anchor fret', () => {
    const shape = realizeShape(barre, 5);
    expect(shape).toEqual(Array.from({ length: 6 }, () => ({ kind: 'fret', fret: 5 })));
  });

  it('anchor 0 collapses fretted offset-0 strings to open (fret 0 = open marker)', () => {
    const shape = realizeShape(barre, 0);
    expect(shape.every((g) => g.kind === 'open')).toBe(true);
  });

  it('an `open` template string stays open at any anchor (a fixed drone)', () => {
    const shape = realizeShape(overDrone, 7);
    // string 6 (index 5) is the `open` low-D drone — open regardless of the anchor.
    expect(shape[5]).toEqual({ kind: 'open' });
    // the barred upper five sit at fret 7.
    expect(shape[0]).toEqual({ kind: 'fret', fret: 7 });
  });

  it('shapeAnchors uses the card slideExamples when present', () => {
    expect(shapeAnchors(barre)).toEqual([0, 5, 7]);
  });
});

describe('a realised barre shape re-reads as the invariant the card claims', () => {
  const openG = loadGrammarCard('open-g')!;
  const tuning: Tuning = makeTuning('open-g', [...openG.strings], openG.tonic);
  const barre = openG.movableShapes!.find((s) => s.id === 'og-major-barre')!;

  it('og-major-barre at fret 5 frames as home-transposed (the IV, C major)', () => {
    const shape = realizeShape(barre, 5);
    const r = nameTier1(shapeToPlaced(shape), tuning, openG, rules);
    expect(r.frame?.category).toBe('home-transposed');
    expect(r.frame?.romanNumeral).toBe('IV');
  });
});
