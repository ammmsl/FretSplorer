// /kb loader tests — validated against the KNOWN values in the authored YAML
// (kb/tunings/open-g.yaml + kb/rules/*.yaml). ADR 0001/0002.

import { describe, expect, it } from 'vitest';
import { loadGrammarCard, loadRules } from '../index';

describe('loadGrammarCard', () => {
  it('loads the open-g card with its known pitch model', () => {
    const card = loadGrammarCard('open-g');
    expect(card).not.toBeNull();
    if (!card) return;
    // Known open-string MIDI (D B G D G D, string 1 -> 6) and tonic G (pc 7).
    expect(card.strings).toEqual([62, 59, 55, 50, 43, 38]);
    expect(card.tonic).toBe(7);
    expect(card.id).toBe('open-g');
    expect(card.name).toBe('Open G');
  });

  it('loads the two movable shapes with their ids + offsets', () => {
    const card = loadGrammarCard('open-g');
    expect(card?.movableShapes).toHaveLength(2);
    const ids = card?.movableShapes?.map((s) => s.id);
    expect(ids).toContain('og-major-barre');
    expect(ids).toContain('og-major-over-d-drone');
    // The over-d-drone shape leaves string 6 open (a fixed pedal).
    const drone = card?.movableShapes?.find((s) => s.id === 'og-major-over-d-drone');
    expect(drone?.strings[5].play).toBe('open');
    expect(drone?.strings[0]).toEqual({ play: 'fret', offset: 0 });
  });

  it('returns null for an unknown card id', () => {
    expect(loadGrammarCard('nonexistent-tuning')).toBeNull();
  });
});

describe('loadRules', () => {
  it('loads the three rule sets with expected ids present', () => {
    const rules = loadRules();
    const relIds = rules.relationalVocabulary.map((r) => r.id);
    expect(relIds).toContain('frame-home');
    expect(relIds).toContain('frame-diatonic-function');
    expect(relIds).toContain('drone-as-9th');
    expect(relIds).toContain('drone-as-pedal-5th');

    const tenIds = rules.tensionTable.map((r) => r.id);
    expect(tenIds).toContain('tension-ic1');
    expect(tenIds).toContain('tension-ic6');

    const fnIds = rules.functionTendencies.map((r) => r.id);
    expect(fnIds).toContain('tendency-IV');
  });

  it('preserves rule keys + tension/rank facts the engine joins on', () => {
    const rules = loadRules();
    const drone9 = rules.relationalVocabulary.find((r) => r.id === 'drone-as-9th');
    expect(drone9?.key).toMatchObject({ droneDegree: 9 });
    expect(drone9?.tension).toBe('color');
    expect(drone9?.provenance.kind).toBe('theory');

    const ic1 = rules.tensionTable.find((r) => r.id === 'tension-ic1');
    expect(ic1?.key).toMatchObject({ intervalClass: 1 });
    expect(ic1?.rank).toBe(3);
    expect(ic1?.tension).toBe('bite');
  });

  it('loads ranking weights + a sources map', () => {
    const rules = loadRules();
    expect(rules.rankingWeights.weights.omit3rdPenalty).toBe(-3.0);
    expect(rules.rankingWeights.surfacePolicy.maxCandidates).toBe(3);
    expect(rules.sources.get('tonal-function')).toBeDefined();
  });
});
