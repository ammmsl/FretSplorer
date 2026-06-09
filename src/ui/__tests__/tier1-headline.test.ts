// Tier-1 headline + key-string derivation — PURE /ui helpers (M2 wiring).
// Validated against the kb/TIER1-VOCABULARY-SPEC.md §6 worked example: Open G, barre
// fret 5 on strings 1-5 + the open low D drone -> the IV (C major) with the open D as
// its 9th. The headline is the relational sentence; the T2 symbol stays the subline.

import { describe, expect, it } from 'vitest';
import type { PlacedPosition } from '../../core';
import { loadGrammarCard, loadRules } from '../../kb';
import { nameTier1 } from '../../naming/tier1-relational';
import { TUNINGS } from '../fixtures';
import { buildReadout, buildTier1View, tonicToKeyString } from '../readout';
import { emptyShape, placeFret, type Shape } from '../shape';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;

describe('tonicToKeyString', () => {
  it('maps a tuning tonic pitch class to a music21 major key string', () => {
    expect(tonicToKeyString(7)).toBe('G'); // open-g tonic
    expect(tonicToKeyString(0)).toBe('C');
    expect(tonicToKeyString(4)).toBe('E');
    expect(tonicToKeyString(2)).toBe('D');
  });
  it('wraps negative / out-of-range pitch classes', () => {
    expect(tonicToKeyString(19)).toBe('G');
    expect(tonicToKeyString(-5)).toBe('G');
  });
});

describe('buildTier1View — §6 worked example (Open G, IV over the drone)', () => {
  // §6: barre fret 5 on strings 1-5 (upper five) + open low D (string 6).
  const positions: PlacedPosition[] = [
    { string: 0, fret: 5 },
    { string: 1, fret: 5 },
    { string: 2, fret: 5 },
    { string: 3, fret: 5 },
    { string: 4, fret: 5 },
    { string: 5, fret: 0 }, // open low D drone
  ];
  const card = loadGrammarCard('open-g')!;
  const rules = loadRules();
  const t1 = nameTier1(positions, openG, card, rules);
  const view = buildTier1View(t1);

  it('is a relational reading (a home frame was found)', () => {
    expect(view.kind).toBe('relational');
  });

  it('headline names the IV (C major) over the G drones', () => {
    if (view.kind !== 'relational') throw new Error('expected relational');
    expect(view.sentence).toContain('IV');
    expect(view.sentence).toContain('C major');
  });

  it('surfaces the open D ringing as the 9th in the relational detail', () => {
    if (view.kind !== 'relational') throw new Error('expected relational');
    expect(view.detail.some((d) => d.includes('9th'))).toBe(true);
  });
});

describe('buildTier1View — handoff', () => {
  it('reports a handoff (no home frame) honestly', () => {
    const view = buildTier1View({
      decomposition: { drones: [], activeVoices: [] },
      frame: null,
      droneRoles: [],
      tensionVsPedal: [],
      sentence: 'n/a',
      traces: [],
      handoff: { toTier2: true, reason: 'no frame' },
    });
    expect(view.kind).toBe('handoff');
    if (view.kind === 'handoff') expect(view.note).toContain('no home frame');
  });
});

describe('buildReadout — relational wiring by tuning', () => {
  it('Open G all-open is a relational headline (has a card)', () => {
    const allOpen: Shape = openG.openStrings.map(() => ({ kind: 'open' as const }));
    const vm = buildReadout(allOpen, openG);
    expect(vm.relational?.kind).toBe('relational');
    expect(vm.keyString).toBe('G');
    expect(vm.primaryVoicing).not.toBeNull();
  });

  it('§6 shape reads as the IV with a C-over-D subline', () => {
    let shape: Shape = emptyShape(openG.openStrings.length);
    shape = placeFret(shape, 0, 5);
    shape = placeFret(shape, 1, 5);
    shape = placeFret(shape, 2, 5);
    shape = placeFret(shape, 3, 5);
    shape = placeFret(shape, 4, 5);
    shape = placeFret(shape, 5, 0); // open low D
    const vm = buildReadout(shape, openG);
    expect(vm.relational?.kind).toBe('relational');
    if (vm.relational?.kind === 'relational') {
      expect(vm.relational.sentence).toContain('IV');
    }
    // T2 subline: a C chord over the D bass.
    expect(vm.symbol?.startsWith('C')).toBe(true);
    expect(vm.slashBass).toBe('D');
    expect(vm.bass).toBe('D2');
  });

  it('a tuning with no card shows the no-card note, not a faked name', () => {
    const eadgbe = TUNINGS.find((t) => t.id === 'eadgbe')!;
    const allOpen: Shape = eadgbe.openStrings.map(() => ({ kind: 'open' as const }));
    const vm = buildReadout(allOpen, eadgbe);
    expect(vm.relational?.kind).toBe('no-card');
  });
});
