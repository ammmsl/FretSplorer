// Shape discovery — PURE shape -> Grip projection at an anchor fret, validated against the
// authored cards. A realised shape grip must (a) place fretted strings at anchor+offset,
// (b) keep `open` template strings open at any anchor (a drone that does not slide), and
// (c) re-identify, through nameTier1, as the invariant the card claims (here: a full barre
// transposes the home chord -> home-transposed frame). R3 auto-derivation stays deferred.

import { describe, expect, it } from 'vitest';
import { loadGrammarCard, loadRules } from '../../kb';
import { tuning as makeTuning, type Tuning } from '../../core';
import { nameTier1 } from '../../naming/tier1-relational';
import { gripToPlaced } from '../grip';
import { shapeAnchors, shapeToGrip } from '../shapes';

const rules = loadRules();

describe('shapeToGrip', () => {
  const openG = loadGrammarCard('open-g')!;
  const barre = openG.movableShapes!.find((s) => s.id === 'og-major-barre')!;
  const overDrone = openG.movableShapes!.find((s) => s.id === 'og-major-over-d-drone')!;

  it('a full-barre shape places every string at the anchor fret', () => {
    const grip = shapeToGrip(barre, 5);
    expect(grip).toEqual(Array.from({ length: 6 }, () => ({ kind: 'fret', fret: 5 })));
  });

  it('anchor 0 collapses fretted offset-0 strings to open (fret 0 = open marker)', () => {
    const grip = shapeToGrip(barre, 0);
    expect(grip.every((g) => g.kind === 'open')).toBe(true);
  });

  it('an `open` template string stays open at any anchor (a fixed drone)', () => {
    const grip = shapeToGrip(overDrone, 7);
    // string 6 (index 5) is the `open` low-D drone — open regardless of the anchor.
    expect(grip[5]).toEqual({ kind: 'open' });
    // the barred upper five sit at fret 7.
    expect(grip[0]).toEqual({ kind: 'fret', fret: 7 });
  });

  it('shapeAnchors uses the card slideExamples when present', () => {
    expect(shapeAnchors(barre)).toEqual([0, 5, 7]);
  });
});

describe('a realised barre grip re-reads as the invariant the card claims', () => {
  const openG = loadGrammarCard('open-g')!;
  const tuning: Tuning = makeTuning('open-g', [...openG.strings], openG.tonic);
  const barre = openG.movableShapes!.find((s) => s.id === 'og-major-barre')!;

  it('og-major-barre at fret 5 frames as home-transposed (the IV, C major)', () => {
    const grip = shapeToGrip(barre, 5);
    const r = nameTier1(gripToPlaced(grip), tuning, openG, rules);
    expect(r.frame?.category).toBe('home-transposed');
    expect(r.frame?.romanNumeral).toBe('IV');
  });
});
