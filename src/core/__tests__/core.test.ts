import { describe, expect, it } from 'vitest';
import {
  applyCapo,
  bassPitch,
  chord,
  chordFromPitchClasses,
  degreeFromInterval,
  degreeFromOffset,
  intervalClass,
  interval,
  midi,
  pitchClass,
  scale,
  spell,
  toPitchClass,
  tuning,
  voicing,
} from '../index';
import type { KeyContext } from '../index';

// Open G, string 1 (high) -> string 6 (low): D4 B3 G3 D3 G2 D2 (re-entrant — index
// order is NOT pitch order; the lowest pitch D2=38 sits at the LAST index).
const OPEN_G = [62, 59, 55, 50, 43, 38];

describe('midi / pitchClass range-checking constructors', () => {
  it('accepts in-range values', () => {
    expect(midi(0)).toBe(0);
    expect(midi(127)).toBe(127);
    expect(pitchClass(0)).toBe(0);
    expect(pitchClass(11)).toBe(11);
  });
  it('rejects out-of-range MIDI', () => {
    expect(() => midi(-1)).toThrow(/range/);
    expect(() => midi(128)).toThrow(/range/);
    expect(() => midi(60.5)).toThrow(/integer/);
  });
  it('rejects out-of-range pitch class', () => {
    expect(() => pitchClass(-1)).toThrow(/range/);
    expect(() => pitchClass(12)).toThrow(/range/);
  });
  it('toPitchClass folds octaves (lossy)', () => {
    expect(toPitchClass(60)).toBe(0); // C4 -> C
    expect(toPitchClass(62)).toBe(2); // D4 -> D
    expect(toPitchClass(38)).toBe(2); // D2 -> D (same class, different octave)
  });
});

describe('intervalClass folds to 0..6', () => {
  it('folds beyond a tritone', () => {
    expect(intervalClass(0)).toBe(0);
    expect(intervalClass(1)).toBe(1);
    expect(intervalClass(6)).toBe(6); // tritone
    expect(intervalClass(7)).toBe(5); // P5 folds to ic5
    expect(intervalClass(11)).toBe(1); // M7 folds to ic1 (the semitone bite)
    expect(intervalClass(12)).toBe(0); // octave
    expect(intervalClass(-5)).toBe(5); // sign-agnostic
  });
});

describe('interval naming (borrowed from Tonal, quality-first)', () => {
  it('names common intervals', () => {
    expect(interval(3).name).toBe('m3');
    expect(interval(7).name).toBe('P5');
    expect(interval(6).name).toBe('d5'); // Tonal spells 6 semitones as a diminished 5th
    expect(interval(3).ic).toBe(3);
    expect(interval(6).ic).toBe(6); // ...still the tritone interval class

  });
});

describe('degree derivation', () => {
  it('degreeFromInterval gives accurate labels + chord-tone flags', () => {
    const b3 = degreeFromInterval('3m');
    expect(b3.label).toBe('b3');
    expect(b3.fromRoot).toBe(3);
    expect(b3.isChordTone).toBe(true);

    const sharp11 = degreeFromInterval('11A');
    expect(sharp11.label).toBe('#11');
    expect(sharp11.fromRoot).toBe(6);
    expect(sharp11.isChordTone).toBe(false); // an extension

    const nine = degreeFromInterval('9M');
    expect(nine.label).toBe('9');
    expect(nine.fromRoot).toBe(2);
    expect(nine.isChordTone).toBe(false);
  });
  it('degreeFromOffset uses the canonical chromatic map', () => {
    expect(degreeFromOffset(0).label).toBe('1');
    expect(degreeFromOffset(7).label).toBe('5');
    expect(degreeFromOffset(7).isChordTone).toBe(true);
    expect(degreeFromOffset(2).label).toBe('2');
    expect(degreeFromOffset(2).isChordTone).toBe(false);
    expect(degreeFromOffset(14).label).toBe('2'); // folds
  });
});

describe('scale() wraps Tonal scale dictionary', () => {
  it('builds C major as a pc-set with aligned degrees', () => {
    const s = scale('major', 0);
    expect(s.root).toBe(0);
    expect([...s.pitchClasses]).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(s.degrees.map((d) => d.label)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(s.degrees[0].isChordTone).toBe(true); // root
    expect(s.degrees[2].isChordTone).toBe(true); // 3rd
    expect(s.degrees[1].isChordTone).toBe(false); // 2nd
  });
  it('builds G dorian (b3, b7)', () => {
    const s = scale('dorian', 7);
    expect([...s.pitchClasses]).toEqual([7, 9, 10, 0, 2, 4, 5]);
    expect(s.degrees.map((d) => d.label)).toEqual(['1', '2', 'b3', '4', '5', '6', 'b7']);
  });
  it('throws on an unknown scale type', () => {
    expect(() => scale('not-a-scale', 0)).toThrow(/unknown scale/);
  });
});

describe('chord() — abstract pc-set, never a voicing', () => {
  it('builds Cmaj7 collapsed to a set', () => {
    const c = chord('Cmaj7');
    expect(c.root).toBe(0);
    expect([...c.pitchClasses]).toEqual([0, 4, 7, 11]);
    expect(c.symbol).toBe('Cmaj7');
  });
  it('deduplicates pitch classes (a chord is a SET)', () => {
    const c = chordFromPitchClasses(7, [7, 11, 2, 7, 2, 11]); // G major with dupes
    expect([...c.pitchClasses]).toEqual([7, 11, 2]);
  });
  it('throws on a rootless symbol', () => {
    expect(() => chord('maj7')).toThrow(/explicit root/);
  });
});

describe('Voicing — multiset, bass = argmin(pitch) NOT lowest string index', () => {
  it('preserves the full multiset (no collapse, no dedup, no sort)', () => {
    // C major triad with the 3rd (E) doubled an octave up — a real doubling.
    const v = voicing([48, 52, 55, 64]); // C3 E3 G3 E4
    expect([...v.pitches]).toEqual([48, 52, 55, 64]); // order/doubling preserved
    expect(v.pitches.length).toBe(4);
  });
  it('computes bass from the LOWEST PITCH on a re-entrant tuning', () => {
    // Open G open strings as a voicing: the lowest pitch (D2=38) is at the LAST
    // index (5), not index 0 (D4=62). String-order would get this wrong.
    const v = voicing(OPEN_G);
    expect(v.bassIndex).toBe(5);
    expect(bassPitch(v)).toBe(38); // D2, the open low-D drone
  });
  it('distinguishes a doubled voicing from a bare chord (same Chord, different Voicing)', () => {
    const plain = voicing([48, 52, 55]); // C major, no doubling
    const doubled = voicing([48, 52, 55, 64]); // third doubled up top
    expect(plain.pitches.length).not.toBe(doubled.pitches.length);
  });
  it('resolves ties to the first occurrence', () => {
    const v = voicing([60, 60, 64]);
    expect(v.bassIndex).toBe(0);
  });
  it('rejects an empty voicing and out-of-range pitches', () => {
    expect(() => voicing([])).toThrow(/empty/);
    expect(() => voicing([200])).toThrow(/range/);
  });
});

describe('spell() — enharmonic spelling derived in context', () => {
  const G: KeyContext = { tonic: pitchClass(7) }; // G major: 1 sharp -> sharps
  const Db: KeyContext = { tonic: pitchClass(1) }; // pc1: Db (5 flats) beats C# (7 sharps)
  it('midi 61 spells C# in a G context, Db in a Db context', () => {
    expect(spell(midi(61), G)).toBe('C#');
    expect(spell(midi(61), Db)).toBe('Db');
  });
  it('honours an explicit prefer override', () => {
    expect(spell(midi(61), { tonic: pitchClass(7), prefer: 'flats' })).toBe('Db');
    expect(spell(midi(61), { tonic: pitchClass(1), prefer: 'sharps' })).toBe('C#');
  });
  it('accepts a bare pitch class', () => {
    expect(spell(pitchClass(0), G)).toBe('C');
  });
});

describe('tuning() + applyCapo() -> virtual tuning', () => {
  it('builds Open G preserving re-entrant order', () => {
    const t = tuning('open-g', OPEN_G, 7);
    expect([...t.openStrings]).toEqual(OPEN_G);
    expect(t.tonic).toBe(7);
  });
  it('full capo at 2 shifts every string up 2, tonic (relational anchor) preserved', () => {
    const t = tuning('open-g', OPEN_G, 7);
    const capoed = applyCapo(t, [2, 2, 2, 2, 2, 2]);
    expect([...capoed.openStrings]).toEqual([64, 61, 57, 52, 45, 40]);
    expect(capoed.tonic).toBe(7); // unchanged: capo preserves the grammar (open-g.yaml)
    expect(capoed.id).toBe('open-g+capo');
  });
  it('partial capo shifts only the spanned strings', () => {
    const t = tuning('open-g', OPEN_G, 7);
    // top three strings capoed at 2, bottom three open.
    const capoed = applyCapo(t, [2, 2, 2, 0, 0, 0]);
    expect([...capoed.openStrings]).toEqual([64, 61, 57, 50, 43, 38]);
  });
  it('rejects a capo vector of the wrong length', () => {
    const t = tuning('open-g', OPEN_G, 7);
    expect(() => applyCapo(t, [2, 2])).toThrow(/length/);
  });
});
