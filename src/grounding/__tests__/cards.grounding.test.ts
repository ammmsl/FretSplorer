// Grammar-card AUTHORING gate (overnight build, work item 1) — every curated grammar
// card EXCEPT standard eadgbe (deliberately card-less) is validated three ways, against
// KNOWN values authored in kb/tunings/<id>.yaml:
//
//   (A) SCHEMA-VALID — the card structurally satisfies kb/schema/card.schema.json:
//       required fields, id/shape-id kebab pattern, MIDI/tonic ranges, provenance.verifiedBy
//       on definitional|derived, and the movable-shape per-string template (play + offset).
//   (B) GROUNDED ok:true — running the REAL /mcp intents (mcpIdentify, functionOf) on the
//       card's home (all-open) grip passes checkGrounding with zero violations (ADR 0003).
//   (C) RELATIONAL NAMING FIRES — buildReadout on the home grip yields a 'relational' view
//       (the HOME frame), i.e. the differentiator fires in the readout for this tuning.
//
// Plus: the authored verifiedNote arithmetic is re-derived here (home pc-set; full-barre
// transposition) so a wrong MIDI value fails loudly rather than typing silently.

import { describe, expect, it } from 'vitest';
import type { GrammarCard } from '../../kb';
import { loadGrammarCard } from '../../kb';
import type { Grip, StringGrip } from '../../ui';
import { buildReadout } from '../../ui';
import { tuning as makeTuning, type Tuning } from '../../core';
import { mcpIdentify, functionOf } from '../../mcp';
import { nameTier1 } from '../../naming/tier1-relational';
import { loadRules } from '../../kb';
import { checkGrounding, collectKbIds } from '../index';

const kbIds = collectKbIds();
const rules = loadRules();

/** Pitch-class set of a MIDI list. */
const pcSet = (midis: readonly number[]): Set<number> =>
  new Set(midis.map((m) => ((m % 12) + 12) % 12));

/** The KNOWN authored values per card (cross-checked vs each YAML header + verifiedNote). */
const CARDS: ReadonlyArray<{
  id: string;
  name: string;
  strings: number[];
  tonic: number;
  /** Home (open-string) pitch-class set — the derived home chord. */
  homePcs: number[];
}> = [
  { id: 'open-d', name: 'Open D', strings: [62, 57, 54, 50, 45, 38], tonic: 2, homePcs: [2, 6, 9] },
  { id: 'open-e', name: 'Open E', strings: [64, 59, 56, 52, 47, 40], tonic: 4, homePcs: [4, 8, 11] },
  { id: 'open-c', name: 'Open C', strings: [64, 60, 55, 48, 43, 36], tonic: 0, homePcs: [0, 4, 7] },
  { id: 'dadgad', name: 'DADGAD', strings: [62, 57, 55, 50, 45, 38], tonic: 2, homePcs: [2, 7, 9] },
  { id: 'drop-d', name: 'Drop D', strings: [64, 59, 55, 50, 45, 38], tonic: 4, homePcs: [2, 4, 7, 9, 11] },
  { id: 'double-drop-d', name: 'Double Drop D', strings: [62, 59, 55, 50, 45, 38], tonic: 2, homePcs: [2, 7, 9, 11] },
];

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** (A) Structural validation against the documented card schema invariants. */
function expectSchemaValid(card: GrammarCard): void {
  expect(Number.isInteger(card.schemaVersion) && card.schemaVersion >= 1).toBe(true);
  expect(card.id).toMatch(KEBAB);
  expect(typeof card.name).toBe('string');
  expect(card.name.length).toBeGreaterThan(0);
  expect(Array.isArray(card.strings) && card.strings.length >= 1).toBe(true);
  for (const m of card.strings) {
    expect(Number.isInteger(m) && m >= 0 && m <= 127).toBe(true);
  }
  expect(Number.isInteger(card.tonic) && card.tonic >= 0 && card.tonic <= 11).toBe(true);

  expect(['definitional', 'theory', 'derived', 'editorial']).toContain(card.provenance.kind);
  expect(card.provenance.reasoning.length).toBeGreaterThan(0);
  if (card.provenance.kind === 'definitional' || card.provenance.kind === 'derived') {
    expect(card.provenance.verifiedBy).toBeDefined();
  }

  for (const shape of card.movableShapes ?? []) {
    expect(shape.id).toMatch(KEBAB);
    expect(shape.label.length).toBeGreaterThan(0);
    // one template entry per string
    expect(shape.strings.length).toBe(card.strings.length);
    for (const s of shape.strings) {
      expect(['open', 'mute', 'fret']).toContain(s.play);
      if (s.play === 'fret') expect(Number.isInteger(s.offset)).toBe(true);
    }
    expect(typeof shape.produces.quality).toBe('string');
    expect(shape.produces.quality.length).toBeGreaterThan(0);
    expect(['definitional', 'theory', 'derived', 'editorial']).toContain(shape.provenance.kind);
    if (shape.provenance.kind === 'derived') {
      expect(shape.provenance.verifiedBy).toBeDefined();
    }
  }
}

/** Build the all-open (home) grip for a tuning. */
const allOpenGrip = (t: Tuning): Grip => t.openStrings.map(() => ({ kind: 'open' }) as StringGrip);

/** Build a grip from a movable shape at a given anchor fret (offset relative to anchor). */
function shapeGrip(card: GrammarCard, shapeId: string, anchorFret: number): Grip {
  const shape = card.movableShapes!.find((s) => s.id === shapeId)!;
  return shape.strings.map((s): StringGrip => {
    if (s.play === 'open') return { kind: 'open' };
    if (s.play === 'mute') return { kind: 'muted' };
    const fret = anchorFret + (s.offset ?? 0);
    return fret <= 0 ? { kind: 'open' } : { kind: 'fret', fret };
  });
}

describe.each(CARDS)('grammar card $name ($id)', (expected) => {
  const card = loadGrammarCard(expected.id);

  it('loads with the known strings + tonic', () => {
    expect(card).not.toBeNull();
    expect(card!.strings).toEqual(expected.strings);
    expect(card!.tonic).toBe(expected.tonic);
    expect(card!.name).toBe(expected.name);
  });

  it('(A) is schema-valid', () => {
    expectSchemaValid(card!);
  });

  it('(A) home pc-set matches the authored home chord (verifiedNote arithmetic)', () => {
    expect([...pcSet(card!.strings)].sort((a, b) => a - b)).toEqual(expected.homePcs);
  });

  it('(B) the home grip is fully grounded through mcpIdentify (ok:true)', () => {
    const t = makeTuning(expected.id, [...card!.strings], card!.tonic);
    const report = checkGrounding(mcpIdentify(allOpenGrip(t), t), kbIds);
    expect(report.violations.map((v) => `${v.kind}: ${v.reason}`)).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('(B) the home grip is fully grounded through functionOf (ok:true)', () => {
    const t = makeTuning(expected.id, [...card!.strings], card!.tonic);
    expect(checkGrounding(functionOf(allOpenGrip(t), t), kbIds).ok).toBe(true);
  });

  it('(C) relational naming FIRES in the readout (HOME frame)', () => {
    const t = makeTuning(expected.id, [...card!.strings], card!.tonic);
    const vm = buildReadout(allOpenGrip(t), t);
    expect(vm.empty).toBe(false);
    expect(vm.relational?.kind).toBe('relational');
    if (vm.relational?.kind === 'relational') {
      expect(vm.relational.sentence.length).toBeGreaterThan(0);
    }
  });

  it('every movable shape produces grounded output at a few anchors', () => {
    const t = makeTuning(expected.id, [...card!.strings], card!.tonic);
    for (const shape of card!.movableShapes ?? []) {
      for (const anchor of [0, 5, 7]) {
        const report = checkGrounding(mcpIdentify(shapeGrip(card!, shape.id, anchor), t), kbIds);
        expect(report.ok, `${shape.id} @${anchor}: ${report.violations.map((v) => v.kind).join(',')}`).toBe(true);
      }
    }
  });

  it('full-barre shapes transpose the home sonority (home-transposed frame)', () => {
    const t = makeTuning(expected.id, [...card!.strings], card!.tonic);
    const barres = (card!.movableShapes ?? []).filter((s) => s.strings.every((x) => x.play === 'fret'));
    for (const shape of barres) {
      // At anchor 5, a full barre = the home pc-set shifted up 5 semitones.
      const grip = shapeGrip(card!, shape.id, 5);
      const r = nameTier1(
        grip.flatMap((g, string) => (g.kind === 'fret' ? [{ string, fret: g.fret }] : g.kind === 'open' ? [{ string, fret: 0 }] : [])),
        t,
        card!,
        rules,
      );
      expect(r.frame?.category, `${shape.id} should read as home-transposed at fret 5`).toBe('home-transposed');
      const shifted = new Set([...pcSet(card!.strings)].map((pc) => (pc + 5) % 12));
      const gripPcs = pcSet(grip.map((g, s) => (g.kind === 'fret' ? (t.openStrings[s] as number) + g.fret : (t.openStrings[s] as number))));
      expect([...gripPcs].sort((a, b) => a - b)).toEqual([...shifted].sort((a, b) => a - b));
    }
  });
});
