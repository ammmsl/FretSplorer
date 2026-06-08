import { describe, expect, it } from 'vitest';
import * as alphaTab from '@coderline/alphatab';
import { fragmentToAlphaTex, midiToTuningName } from '../alphaTexAdapter';
import type { RenderFragment } from '../types';

// Parse an AlphaTex string back into an alphaTab Score (pure model, no DOM).
function parse(tex: string) {
  const importer = new alphaTab.importer.AlphaTexImporter();
  importer.initFromString(tex, new alphaTab.Settings());
  return importer.readScore();
}

function firstBeat(tex: string) {
  const score = parse(tex);
  const staff = score.tracks[0].staves[0];
  return { staff, beat: staff.bars[0].voices[0].beats[0] };
}

// Open G, string1 -> string6: D4 B3 G3 D3 G2 D2 (matches kb/tunings/open-g.yaml).
const OPEN_G = [62, 59, 55, 50, 43, 38];
// DADGAD, string1 -> string6: D4 A3 G3 D3 A2 D2.
const DADGAD = [62, 57, 55, 50, 45, 38];

describe('midiToTuningName matches alphaTab convention', () => {
  it('agrees with alphaTab Tuning.getTextForTuning for every seed pitch', () => {
    for (const midi of [...OPEN_G, ...DADGAD, 40, 64, 69]) {
      const ours = midiToTuningName(midi);
      const theirs = alphaTab.model.Tuning.getTextForTuning(midi, true);
      expect(ours).toBe(theirs);
    }
  });
});

describe('fragmentToAlphaTex — round-trips through alphaTab', () => {
  it('renders an Open G open chord with all strings ringing', () => {
    const fragment: RenderFragment = {
      title: 'Open G',
      tuning: { strings: OPEN_G },
      notes: OPEN_G.map((_, i) => ({ string: i + 1, fret: 0 })),
      letRingAll: true,
    };
    const tex = fragmentToAlphaTex(fragment);
    const { staff, beat } = firstBeat(tex);

    // Arbitrary tuning carried through, string 1 -> string 6.
    expect(staff.tuning).toEqual(OPEN_G);
    // Six open notes, all ringing.
    expect(beat.notes).toHaveLength(6);
    expect(beat.notes.every((n) => n.fret === 0)).toBe(true);
    expect(beat.isLetRing).toBe(true);
    expect(beat.notes.every((n) => n.isLetRing)).toBe(true);
  });

  it('renders a DADGAD fragment with a fretted note + sustained opens', () => {
    const fragment: RenderFragment = {
      title: 'DADGAD — Dsus over drones',
      tuning: { strings: DADGAD },
      notes: [
        { string: 1, fret: 0, letRing: true },
        { string: 2, fret: 0, letRing: true },
        { string: 3, fret: 2, letRing: true }, // fretted active voice
        { string: 4, fret: 0, letRing: true },
        { string: 6, fret: 0, letRing: true }, // low D drone, string 5 muted/omitted
      ],
      tempo: 72,
    };
    const tex = fragmentToAlphaTex(fragment);
    const { staff, beat } = firstBeat(tex);

    expect(staff.tuning).toEqual(DADGAD);
    expect(beat.notes).toHaveLength(5);
    // alphaTab's internal Note.string counts from the bottom (string 1 = lowest),
    // the inverse of the AlphaTex authoring order our adapter emits. Map back.
    const N = DADGAD.length;
    const fretByOurString = Object.fromEntries(beat.notes.map((n) => [N + 1 - n.string, n.fret]));
    expect(fretByOurString[3]).toBe(2); // our string 3 (G3) fretted at 2
    expect(fretByOurString[6]).toBe(0); // our string 6 (low D) open drone
    expect(beat.notes.every((n) => n.isLetRing)).toBe(true);
  });

  it('per-note letRing is independent', () => {
    const tex = fragmentToAlphaTex({
      tuning: { strings: OPEN_G },
      notes: [
        { string: 6, fret: 0, letRing: true },
        { string: 1, fret: 3, letRing: false },
      ],
    });
    const { beat } = firstBeat(tex);
    const N = OPEN_G.length;
    const lrByOurString = Object.fromEntries(beat.notes.map((n) => [N + 1 - n.string, n.isLetRing]));
    expect(lrByOurString[6]).toBe(true);
    expect(lrByOurString[1]).toBe(false);
  });

  it('emits no removed-in-1.8 dot separators and parses clean', () => {
    const tex = fragmentToAlphaTex({ tuning: { strings: OPEN_G }, notes: [{ string: 1, fret: 0 }] });
    // Header lines start with backslash directives, body is a single beat — no stray '.' tokens.
    expect(tex).toContain('\\tuning(D4 B3 G3 D3 G2 D2)');
    expect(() => parse(tex)).not.toThrow();
  });
});

describe('fragmentToAlphaTex — guards', () => {
  it('rejects an empty fragment', () => {
    expect(() => fragmentToAlphaTex({ tuning: { strings: OPEN_G }, notes: [] })).toThrow(/no notes/);
  });
  it('rejects an out-of-range string index', () => {
    expect(() =>
      fragmentToAlphaTex({ tuning: { strings: OPEN_G }, notes: [{ string: 7, fret: 0 }] }),
    ).toThrow(/out of range/);
  });
});
