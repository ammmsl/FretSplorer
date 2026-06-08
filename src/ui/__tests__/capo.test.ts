// CapoControl pure-helper tests + the capo->tuning integration (applyCapo, ADR 0006 /
// core tuning.ts). The control reports a CapoShift; the shell applies it via applyCapo,
// which shifts open-string pitches while PRESERVING the tonic (the pedagogical anchor).

import { describe, expect, it } from 'vitest';
import { capoShiftFrom } from '../capo';
import { applyCapo, tuning } from '../../core';
import { TUNINGS } from '../fixtures';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;

describe('capoShiftFrom', () => {
  it('a full capo clamps every string at the same fret', () => {
    expect(capoShiftFrom(2, [true, true, true, true, true, true])).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it('fret 0 is a no-op (uncapoed) whatever the mask', () => {
    expect(capoShiftFrom(0, [true, false, true, false, true, false])).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('a partial capo clamps only the masked strings, others stay open (0)', () => {
    // e.g. capo the inner four strings, leave the outer two open as drones.
    expect(capoShiftFrom(4, [false, true, true, true, true, false])).toEqual([0, 4, 4, 4, 4, 0]);
  });
});

describe('capo -> tuning (applyCapo)', () => {
  it('a full capo at 2 raises every open string a whole step, tonic preserved', () => {
    const capo = capoShiftFrom(2, openG.openStrings.map(() => true));
    const capoed = applyCapo(openG, capo);
    expect(capoed.openStrings.map((m) => m as number)).toEqual(
      openG.openStrings.map((m) => (m as number) + 2),
    );
    expect(capoed.tonic).toBe(openG.tonic); // preserved (the grammar anchor)
  });

  it('a partial capo shifts only the clamped strings (a re-entrant virtual tuning)', () => {
    const base = tuning('test', [64, 59, 55, 50, 45, 40], 4);
    const capo = capoShiftFrom(3, [false, true, true, true, true, false]);
    const capoed = applyCapo(base, capo);
    expect(capoed.openStrings.map((m) => m as number)).toEqual([64, 62, 58, 53, 48, 40]);
  });
});
