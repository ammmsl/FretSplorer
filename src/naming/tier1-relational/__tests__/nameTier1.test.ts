// /naming/tier1-relational tests — the spec §6 WORKED EXAMPLE as the hard acceptance
// test, plus the home frame and the unframeable -> handoff cases. Validated against
// KNOWN values (kb/tunings/open-g.yaml; kb/rules/*.yaml; spec §6).

import { describe, expect, it } from 'vitest';
import type { PlacedPosition } from '../../../core';
import { loadGrammarCard, loadRules } from '../../../kb';
import { nameTier1, shouldHandoffToTier2 } from '../index';
import { TUNINGS } from '../../../ui/fixtures';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;
const card = loadGrammarCard('open-g')!;
const rules = loadRules();

describe('nameTier1 — spec §6 worked example (Open G, full barre at fret 5 over open low D)', () => {
  // Strings 0..4 barred at fret 5, string 5 (low D) left OPEN (fret 0).
  // Sounding pitches: [67,64,60,55,48, 38]  -> C major triad over the open low D.
  const grip: PlacedPosition[] = [
    { string: 0, fret: 5 },
    { string: 1, fret: 5 },
    { string: 2, fret: 5 },
    { string: 3, fret: 5 },
    { string: 4, fret: 5 },
    { string: 5, fret: 0 },
  ];
  const r = nameTier1(grip, openG, card, rules);

  it('decomposes into the open low-D drone + the five barred active voices', () => {
    expect(r.decomposition.drones).toHaveLength(1);
    expect(r.decomposition.drones[0]).toMatchObject({ string: 5, pitch: 38 });
    expect(r.decomposition.activeVoices).toHaveLength(5);
    expect(r.decomposition.activeVoices.map((a) => a.pitch).sort((a, b) => a - b)).toEqual([
      48, 55, 60, 64, 67,
    ]);
  });

  it('frames it as the IV (C major), diatonic-function', () => {
    expect(r.frame).not.toBeNull();
    expect(r.frame?.category).toBe('diatonic-function');
    expect(r.frame?.romanNumeral).toBe('IV');
    expect(r.frame?.chordName).toContain('C major');
    expect(r.frame?.ruleId).toBe('frame-diatonic-function');
    expect(r.frame?.provenanceKind).toBe('theory');
  });

  it('reads the open D as the 9th of C (drone-as-9th)', () => {
    const nine = r.droneRoles.find((d) => d.string === 5);
    expect(nine?.droneDegree).toBe(9);
    expect(nine?.ruleId).toBe('drone-as-9th');
    expect(nine?.phrase).toContain('9th');
  });

  it('assembles a relational sentence mentioning the IV and the ringing 9th', () => {
    expect(r.sentence).toContain('IV');
    expect(r.sentence).toContain('9th');
  });

  it('carries traces for the frame and the drone role, both theory provenance', () => {
    const sources = r.traces.map((t) => t.source);
    expect(sources).toContain('frame-diatonic-function');
    expect(sources).toContain('drone-as-9th');
    // Both rules are kind:theory in the KB.
    const frameRule = rules.relationalVocabulary.find((x) => x.id === 'frame-diatonic-function');
    const droneRule = rules.relationalVocabulary.find((x) => x.id === 'drone-as-9th');
    expect(frameRule?.provenance.kind).toBe('theory');
    expect(droneRule?.provenance.kind).toBe('theory');
  });

  it('does NOT hand off to Tier-2 (a relational frame was found)', () => {
    expect(r.handoff.toTier2).toBe(false);
    expect(shouldHandoffToTier2(r)).toBe(false);
  });

  it('grades the active voices vs the open D (color/consonant, no bite)', () => {
    // C(0)/D(2)=ic2 color, E(4)/D(2)=ic2 color, G(7)/D(2)=ic5 consonant.
    expect(r.tensionVsPedal).toHaveLength(5);
    const ranks = new Set(r.tensionVsPedal.map((t) => t.tension));
    expect(ranks.has('color')).toBe(true);
    expect(ranks.has('bite')).toBe(false);
  });
});

describe('nameTier1 — all-open grip frames as home (the I in G)', () => {
  const grip: PlacedPosition[] = [
    { string: 0, fret: 0 },
    { string: 1, fret: 0 },
    { string: 2, fret: 0 },
    { string: 3, fret: 0 },
    { string: 4, fret: 0 },
    { string: 5, fret: 0 },
  ];
  const r = nameTier1(grip, openG, card, rules);

  it('is the home frame, roman numeral I', () => {
    expect(r.frame?.category).toBe('home');
    expect(r.frame?.romanNumeral).toBe('I');
    expect(r.frame?.ruleId).toBe('frame-home');
    expect(r.handoff.toTier2).toBe(false);
  });

  it('has no active voices (all strings ring open)', () => {
    expect(r.decomposition.activeVoices).toHaveLength(0);
    expect(r.decomposition.drones).toHaveLength(6);
  });
});

describe('nameTier1 — full barre at fret 7 frames as home-transposed (V, D major)', () => {
  const grip: PlacedPosition[] = [0, 1, 2, 3, 4, 5].map((string) => ({ string, fret: 7 }));
  const r = nameTier1(grip, openG, card, rules);

  it('is home-transposed up to the V', () => {
    expect(r.frame?.category).toBe('home-transposed');
    expect(r.frame?.romanNumeral).toBe('V');
    expect(r.frame?.ruleId).toBe('frame-home-transposed');
  });
});

describe('nameTier1 — an unframeable cluster hands off to Tier-2', () => {
  // A deliberately non-chordal semitone cluster on the upper strings, no open drone:
  // pitches 67, 68, 69 (G, G#, A) — Tonal detects no chord -> no A-C frame.
  const grip: PlacedPosition[] = [
    { string: 0, fret: 5 }, // 67
    { string: 1, fret: 9 }, // 68
    { string: 2, fret: 14 }, // 69
  ];
  const r = nameTier1(grip, openG, card, rules);

  it('produces a null frame and handoff.toTier2 = true', () => {
    expect(r.frame).toBeNull();
    expect(r.handoff.toTier2).toBe(true);
    expect(shouldHandoffToTier2(r)).toBe(true);
  });
});
