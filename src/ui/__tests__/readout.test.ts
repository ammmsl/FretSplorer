// Readout view-model assembly — the live "What you're holding" panel data (docs/08
// decision f; docs/09 UI#4). Validated against the Open-G home chord (the M1 gate):
// all open => a G-over-D reading, bass D2, per-note degrees vs the G root.

import { describe, expect, it } from 'vitest';
import { chord, pitchClass, tuning } from '../../core';
import { droneMap } from '../../projection';
import { buildReadout, spellWithOctave } from '../readout';
import { emptyShape, placeFret, type Shape } from '../shape';

// open-g: string 0..5 = [62,59,55,50,43,38] (D4 B3 G3 D3 G2 D2), tonic G = 7.
const openG = tuning('open-g', [62, 59, 55, 50, 43, 38], 7);
const allOpenG: Shape = openG.openStrings.map(() => ({ kind: 'open' as const }));

describe('spellWithOctave', () => {
  it('spells MIDI with scientific octave (60 = C4)', () => {
    expect(spellWithOctave(60, { tonic: pitchClass(0) })).toBe('C4');
    expect(spellWithOctave(38, { tonic: pitchClass(7) })).toBe('D2'); // low D, key of G (sharps)
    expect(spellWithOctave(43, { tonic: pitchClass(7) })).toBe('G2');
  });
});

describe('buildReadout — idle', () => {
  it('an empty shape is the idle state', () => {
    const vm = buildReadout(emptyShape(6), openG);
    expect(vm.empty).toBe(true);
    expect(vm.symbol).toBeNull();
    expect(vm.notes).toHaveLength(0);
  });
});

describe('buildReadout — Open-G home chord (M1 gate)', () => {
  const vm = buildReadout(allOpenG, openG);

  it('is not idle', () => {
    expect(vm.empty).toBe(false);
  });

  it('T2 symbol is a G chord', () => {
    expect(vm.symbol).toBeTruthy();
    // Tonal yields "GM" (or "G"); either way it starts with G.
    expect(vm.symbol!.startsWith('G')).toBe(true);
  });

  it('reads as G OVER D — the slash bass is D', () => {
    expect(vm.slashBass).toBe('D');
  });

  it('bass is the LOWEST PITCH D2 (argmin, not lowest string index) — R10', () => {
    expect(vm.bass).toBe('D2');
  });

  it('one row per sounding string, ordered low pitch -> high; bass row is D2', () => {
    expect(vm.notes).toHaveLength(6);
    expect(vm.notes[0].name).toBe('D2');
    expect(vm.notes[0].isBass).toBe(true);
    expect(vm.notes.every((n, i) => i === 0 || !n.isBass)).toBe(true);
    // ascending pitch
    for (let i = 1; i < vm.notes.length; i++) {
      expect(vm.notes[i].pitch).toBeGreaterThanOrEqual(vm.notes[i - 1].pitch);
    }
  });

  it('degrees are relative to the G root: D = 5, G = 1, B = 3', () => {
    const byPc = new Map(vm.notes.map((n) => [n.pitch % 12, n.degree?.label]));
    expect(byPc.get(2)).toBe('5'); // D
    expect(byPc.get(7)).toBe('1'); // G (root)
    expect(byPc.get(11)).toBe('3'); // B
  });

  it('open strings carry a drone reading when a context overlay is supplied', () => {
    // Use the chord G as the harmonic context anchor for the drone channel.
    const drones = droneMap(chord('G'), openG);
    const vmd = buildReadout(allOpenG, openG, drones);
    // every sounding string is open here, so every note has a non-null drone term.
    expect(vmd.notes.every((n) => n.isOpen && n.drone !== null)).toBe(true);
  });
});

describe('buildReadout — un-nameable shape still exposes notes + Tier-3 (no idle collapse)', () => {
  // A chromatic trichord (C, C#, D) Tonal cannot name as any chord, so identify() returns
  // []. The readout must NOT collapse to the idle state: the held notes still have a bass,
  // per-note rows, and a realised voicing for the LAZY Tier-3 anatomy — the "what is this
  // sound, really?" path must survive a missing chord symbol.
  const cluster = tuning('cluster', [62, 61, 60], 0); // D4 C#4 C4, all open
  const allOpen: Shape = cluster.openStrings.map(() => ({ kind: 'open' as const }));
  const vm = buildReadout(allOpen, cluster);

  it('is not idle even though no chord was identified', () => {
    expect(vm.empty).toBe(false);
  });

  it('carries no T2 symbol (nothing nameable) but still reports the bass (lowest pitch)', () => {
    expect(vm.symbol).toBeNull();
    expect(vm.slashBass).toBeNull();
    expect(vm.bass).toBe('C4');
  });

  it('has one row per sounding note with null degrees (no chord root to measure against)', () => {
    expect(vm.notes).toHaveLength(3);
    expect(vm.notes.every((n) => n.degree === null)).toBe(true);
  });

  it('exposes the full voicing so the lazy Tier-3 anatomy can analyse it', () => {
    expect(vm.primaryVoicing).not.toBeNull();
    expect(vm.primaryVoicing!.pitches).toHaveLength(3);
  });
});

describe('buildReadout — live update on shape change', () => {
  it('changing the shape changes the reading', () => {
    const before = buildReadout(allOpenG, openG);
    // Fret the low D string (5) up two -> E2, breaking the clean G triad reading.
    const changed = placeFret(allOpenG, 5, 2);
    const after = buildReadout(changed, openG);
    expect(after.bass).not.toBe(before.bass); // new lowest pitch (E2)
    expect(after.bass).toBe('E2');
  });
});
