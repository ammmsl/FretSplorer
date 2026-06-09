// /naming/tier1-relational — INDEPENDENT Tier-1 AUDIT (separate from the implementer's
// nameTier1.test.ts). Written by the Tier-1 auditor against kb/TIER1-VOCABULARY-SPEC.md
// §6 and the kb/rules/*.yaml rule files, validating:
//   1. the §6 worked example exactly (Open-G barre-5 over open low D -> IV / C major,
//      open D as the 9th, traces [frame-diatonic-function, drone-as-9th], kind theory);
//   2. the T1<->T2 handoff fires on an unframeable shape (frame=null, toTier2=true);
//   3. grounding traceability (ADR 0003): every checkable claim carries a trace (a KB
//      rule id or "computed"); rule-sourced claims have provenance kind theory; none
//      are unsourced.
// Shapes are built independently from the card (not copied from the implementer's file).

import { describe, expect, it } from 'vitest';
import type { PlacedPosition, Tuning } from '../../../core';
import { tuning as makeTuning } from '../../../core';
import { loadGrammarCard, loadRules } from '../../../kb';
import { nameTier1 } from '../index';

const card = loadGrammarCard('open-g')!;
const rules = loadRules();

// Build the tuning INDEPENDENTLY from the card's own pitch data + tonic, so the audit
// does not depend on the UI fixtures matching the card (they should, but we verify the
// engine against the verified source of truth: kb/tunings/open-g.yaml).
const openG: Tuning = makeTuning('open-g', [...card.strings], card.tonic);

// Open G open strings, string 1(high)->6(low): D4 B3 G3 D3 G2 D2 = [62,59,55,50,43,38].
// (Cross-checked vs the card header + provenance verifiedNote.)
const STR = { d4: 0, b3: 1, g3: 2, d3: 3, g2: 4, d2: 5 } as const;

/** A flat full barre at fret n (all six strings). */
const barre = (n: number): PlacedPosition[] =>
  [0, 1, 2, 3, 4, 5].map((string) => ({ string, fret: n }));

/** A barre on the upper five strings at fret n, low string 6 left open (drone). */
const barreOverLowD = (n: number): PlacedPosition[] => [
  { string: STR.d4, fret: n },
  { string: STR.b3, fret: n },
  { string: STR.g3, fret: n },
  { string: STR.d3, fret: n },
  { string: STR.g2, fret: n },
  { string: STR.d2, fret: 0 },
];

const allOpen = (): PlacedPosition[] => [0, 1, 2, 3, 4, 5].map((string) => ({ string, fret: 0 }));

// ────────────────────────────────────────────────────────────────────────────
// 1. §6 WORKED EXAMPLE — the hard acceptance test.
// ────────────────────────────────────────────────────────────────────────────
describe('AUDIT 1 — spec §6 worked example reproduced exactly', () => {
  const shape = barreOverLowD(5); // shape og-major-over-d-drone, anchor 5
  const r = nameTier1(shape, openG, card, rules);

  it('decomposes into one open low-D drone (D2=38) + five barred active voices', () => {
    expect(r.decomposition.drones).toHaveLength(1);
    expect(r.decomposition.drones[0]).toMatchObject({ string: STR.d2, pitch: 38 });
    // barred upper five at fret 5: [62,59,55,50,43] + 5 = [67,64,60,55,48].
    expect(r.decomposition.activeVoices.map((a) => a.pitch).sort((a, b) => a - b)).toEqual([
      48, 55, 60, 64, 67,
    ]);
  });

  it('frames it as the IV / C major via diatonic-function (named vs the G tonic)', () => {
    expect(r.frame).not.toBeNull();
    expect(r.frame!.category).toBe('diatonic-function');
    expect(r.frame!.romanNumeral).toBe('IV');
    expect(r.frame!.chordName).toContain('C major');
    expect(r.frame!.ruleId).toBe('frame-diatonic-function');
    expect(r.frame!.provenanceKind).toBe('theory');
  });

  it('reads the open D as the 9th of C (drone-role drone-as-9th)', () => {
    const dRole = r.droneRoles.find((d) => d.string === STR.d2);
    expect(dRole).toBeDefined();
    expect(dRole!.droneDegree).toBe(9);
    expect(dRole!.ruleId).toBe('drone-as-9th');
    expect(dRole!.phrase).toContain('9th');
  });

  it('grades active voices vs the open D as consonant/color, NO bite (§6: no bite)', () => {
    // C(0) vs D(2)=ic2 color; E(4) vs D(2)=ic2 color; G(7) vs D(2)=ic5 consonant; (octaves ic0).
    const tensions = new Set(r.tensionVsPedal.map((t) => t.tension));
    expect(tensions.has('color')).toBe(true);
    expect(tensions.has('bite')).toBe(false);
    expect(tensions.has('unstable')).toBe(false);
  });

  it('carries traces [frame-diatonic-function, drone-as-9th], all kind theory', () => {
    const sources = r.traces.map((t) => t.source);
    expect(sources).toContain('frame-diatonic-function');
    expect(sources).toContain('drone-as-9th');
    expect(rules.relationalVocabulary.find((x) => x.id === 'frame-diatonic-function')!.provenance.kind).toBe('theory');
    expect(rules.relationalVocabulary.find((x) => x.id === 'drone-as-9th')!.provenance.kind).toBe('theory');
  });

  it('does NOT hand off to Tier-2 (a relational frame was found)', () => {
    expect(r.handoff.toTier2).toBe(false);
  });

  it('assembles a sentence naming the IV and the ringing 9th', () => {
    expect(r.sentence).toContain('IV');
    expect(r.sentence).toContain('9th');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. T1<->T2 HANDOFF — an unframeable shape yields frame=null, toTier2=true.
// ────────────────────────────────────────────────────────────────────────────
describe('AUDIT 2 — unframeable chromatic cluster triggers the handoff', () => {
  // A tight chromatic cluster, no open drone, that spells no A-C frame: it is not the
  // home set, not a full barre, and detects no chord. Pitches 67,68,69 = G,G#,A.
  const cluster: PlacedPosition[] = [
    { string: STR.d4, fret: 5 }, // 62+5 = 67 (G)
    { string: STR.b3, fret: 9 }, // 59+9 = 68 (G#)
    { string: STR.g3, fret: 14 }, // 55+14 = 69 (A)
  ];
  const r = nameTier1(cluster, openG, card, rules);

  it('produces frame=null and handoff.toTier2=true', () => {
    expect(r.frame).toBeNull();
    expect(r.handoff.toTier2).toBe(true);
    expect(r.handoff.reason).toMatch(/tier-2|absolute/i);
  });

  it('the assembled sentence defers to absolute (Tier-2) naming', () => {
    expect(r.sentence.toLowerCase()).toContain('absolute');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. GROUNDING TRACEABILITY (ADR 0003 pre-check for the M3 harness).
//    Every checkable claim carries a trace; rule-sourced claims are kind theory;
//    none are unsourced.
// ────────────────────────────────────────────────────────────────────────────
describe('AUDIT 3 — grounding traceability across varied shapes', () => {
  const shapes: PlacedPosition[][] = [
    allOpen(),
    barre(5),
    barre(7),
    barreOverLowD(5),
    barreOverLowD(7),
  ];

  const KNOWN_RULE_IDS = new Set(
    [
      ...rules.relationalVocabulary,
      ...rules.tensionTable,
      ...rules.functionTendencies,
    ].map((r) => r.id),
  );

  it('every trace source is either a known KB rule id or the literal "computed"', () => {
    for (const shape of shapes) {
      const r = nameTier1(shape, openG, card, rules);
      expect(r.traces.length).toBeGreaterThan(0);
      for (const t of r.traces) {
        const ok = t.source === 'computed' || KNOWN_RULE_IDS.has(t.source);
        expect(ok, `trace "${t.claim}" -> unknown source "${t.source}"`).toBe(true);
      }
    }
  });

  it('the frame, when present, is joined to a KB rule whose provenance is kind theory', () => {
    for (const shape of shapes) {
      const r = nameTier1(shape, openG, card, rules);
      if (r.frame === null) continue;
      expect(KNOWN_RULE_IDS.has(r.frame.ruleId)).toBe(true);
      const rule = rules.relationalVocabulary.find((x) => x.id === r.frame!.ruleId);
      expect(rule, `frame rule ${r.frame.ruleId} must exist in the KB`).toBeDefined();
      expect(rule!.provenance.kind).toBe('theory');
      expect(r.frame.provenanceKind).toBe('theory');
    }
  });

  it('every drone role traces to a KB rule id or "computed"; KB-sourced ones are theory', () => {
    for (const shape of shapes) {
      const r = nameTier1(shape, openG, card, rules);
      for (const role of r.droneRoles) {
        const ok = role.ruleId === 'computed' || KNOWN_RULE_IDS.has(role.ruleId);
        expect(ok, `drone role degree ${role.droneDegree} -> "${role.ruleId}"`).toBe(true);
        if (role.ruleId !== 'computed') {
          const rule = rules.relationalVocabulary.find((x) => x.id === role.ruleId);
          expect(rule!.provenance.kind).toBe('theory');
        }
      }
    }
  });

  it('every tension reading traces to a tension-table rule id or "computed"', () => {
    for (const shape of shapes) {
      const r = nameTier1(shape, openG, card, rules);
      for (const t of r.tensionVsPedal) {
        const ok = t.ruleId === 'computed' || KNOWN_RULE_IDS.has(t.ruleId);
        expect(ok, `tension ic ${t.intervalClass} -> "${t.ruleId}"`).toBe(true);
      }
    }
  });
});
