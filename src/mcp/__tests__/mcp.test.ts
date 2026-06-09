// /mcp tests — the DoD for the M3 intent-tool + resource layer (ADR 0003 grounding).
//
// Validated against KNOWN values: the Open-G home chord (all six strings open) is the
// canonical fixture. We assert the uniform ToolResult shape, that EVERY claim carries a
// non-empty trace, that the bass is the computed D2 (R10 argmin-pitch), that the frame
// is KB-traced, that translate flags a note falling below the open string, and that
// feelingToOptions mixes a hedged editorial vibe claim (traced to the affective id) with
// grounded computed option voicings.

import { describe, expect, it } from 'vitest';
import { TUNINGS } from '../../ui/fixtures';
import type { Shape } from '../../ui';
import { loadAffective, loadGrammarCard, loadRules } from '../../kb';
import {
  adviseSetupTool,
  feelingToOptions,
  findVoicingsTool,
  functionOf,
  isHedged,
  mcpIdentify,
  neighbors,
  translate,
  type Claim,
  type ToolResult,
} from '../index';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;
const eadgbe = TUNINGS.find((t) => t.id === 'eadgbe')!;
const dadgad = TUNINGS.find((t) => t.id === 'dadgad')!;

/** The Open-G home chord shape: all six strings open (the I in G). */
const allOpenShape: Shape = openG.openStrings.map(() => ({ kind: 'open' }) as const);

/** Build the set of ALL valid KB ids a trace may point at (the harness contract). */
function allValidKbIds(tuningId: string): Set<string> {
  const ids = new Set<string>();
  const rules = loadRules();
  for (const set of [
    rules.relationalVocabulary,
    rules.tensionTable,
    rules.functionTendencies,
  ]) {
    for (const r of set) ids.add(r.id);
  }
  const card = loadGrammarCard(tuningId);
  if (card) {
    ids.add(card.id);
    for (const s of card.movableShapes ?? []) ids.add(s.id);
  }
  for (const v of loadAffective().vibes) ids.add(v.id);
  return ids;
}

/** Assert the uniform ToolResult shape + that every claim has a non-empty trace and
 *  editorial claims are hedged + traced to a real KB id. */
function assertGrounded<T>(result: ToolResult<T>, validKbIds: Set<string>): void {
  expect(result).toHaveProperty('truth');
  expect(typeof result.explanation).toBe('string');
  expect(Array.isArray(result.reasoningChain)).toBe(true);
  expect(Array.isArray(result.claims)).toBe(true);
  for (const c of result.claims as readonly Claim[]) {
    expect(c.trace).toBeTruthy();
    expect(c.trace.length).toBeGreaterThan(0);
    if (c.trace !== 'computed') {
      expect(validKbIds.has(c.trace)).toBe(true);
    }
    if (c.editorial) {
      expect(isHedged(c.text)).toBe(true);
      // editorial claims are traced to a KB id (the affective vibe), never "computed".
      expect(c.trace).not.toBe('computed');
    }
  }
}

describe('mcpIdentify — Open-G home chord', () => {
  const validIds = allValidKbIds('open-g');

  it('returns a grounded ToolResult with the computed bass D2', () => {
    const result = mcpIdentify(allOpenShape, openG);
    assertGrounded(result, validIds);

    // Bass = lowest pitch = midi 38 = D2 (R10 argmin, not lowest string).
    expect(result.truth.bassNote).toBe('D2');
    const bassClaim = result.claims.find(
      (c) => c.text.includes('D2') && c.trace === 'computed',
    );
    expect(bassClaim).toBeDefined();
  });

  it('includes a Tier-1 frame claim traced to a KB rule id', () => {
    const result = mcpIdentify(allOpenShape, openG);
    expect(result.truth.tier1.frame).not.toBeNull();
    // The frame headline claim's trace must be a relational-vocabulary rule id.
    const frameClaim = result.claims.find((c) => c.trace.startsWith('frame-'));
    expect(frameClaim).toBeDefined();
    expect(validIds.has(frameClaim!.trace)).toBe(true);
    // The home chord -> frame-home.
    expect(result.truth.tier1.frame!.ruleId).toBe('frame-home');
  });
});

describe('functionOf', () => {
  it('returns a grounded ToolResult for the home chord (frame = home)', () => {
    const validIds = allValidKbIds('open-g');
    const result = functionOf(allOpenShape, openG);
    assertGrounded(result, validIds);
    expect(result.truth.frameCategory).toBe('home');
  });
});

describe('neighbors', () => {
  it('computes a few single-step voice-leading moves, all computed-traced', () => {
    const validIds = allValidKbIds('open-g');
    const result = neighbors(allOpenShape, openG);
    assertGrounded(result, validIds);
    expect(result.truth.moves.length).toBeGreaterThan(0);
    for (const c of result.claims) expect(c.trace).toBe('computed');
  });
});

describe('findVoicingsTool', () => {
  it('returns ranked playable voicings with computed claims', () => {
    const validIds = allValidKbIds('eadgbe');
    const result = findVoicingsTool('C', eadgbe);
    assertGrounded(result, validIds);
    expect(result.truth.voicings.length).toBeGreaterThan(0);
  });
});

describe('translate — flags a note below the open string', () => {
  it('flags a low note that falls below every target open string', () => {
    const validIds = allValidKbIds('eadgbe');
    // Open-G's low string is D2 (midi 38). Standard EADGBE's lowest open string is
    // E2 (midi 40). The open-G low D (38) cannot be reached on EADGBE -> belowOpenString.
    const result = translate(allOpenShape, openG, eadgbe);
    assertGrounded(result, validIds);
    const flagged = result.truth.unreachable.find((n) => n.belowOpenString);
    expect(flagged).toBeDefined();
    expect(flagged!.pitch).toBe(38);
    // and a computed claim names it as unreachable.
    const claim = result.claims.find(
      (c) => c.text.includes('below') && c.trace === 'computed',
    );
    expect(claim).toBeDefined();
  });

  it('reachable notes expose toString/toFret (the fields MorphView renders)', () => {
    // Open-G -> DADGAD: the upper voices re-place; every reachable note carries a landing.
    const result = translate(allOpenShape, openG, dadgad);
    const reachable = result.truth.notes.filter((n) => !n.belowOpenString && !n.offNeck);
    expect(reachable.length).toBeGreaterThan(0);
    for (const n of reachable) {
      expect(n.toString).not.toBeNull();
      expect(n.toFret).not.toBeNull();
      expect(n.toFret as number).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('feelingToOptions — the editorial honesty seam', () => {
  const validIds = allValidKbIds('open-g');

  it('mixes a hedged editorial vibe claim with grounded computed options', () => {
    const result = feelingToOptions(allOpenShape, openG, 'dreamier');
    assertGrounded(result, validIds);

    // The vibe maps to "dreamier".
    expect(result.truth.vibeId).toBe('dreamier');

    // Exactly the editorial claim is editorial + hedged + traced to the vibe id.
    const editorial = result.claims.filter((c) => c.editorial);
    expect(editorial.length).toBeGreaterThanOrEqual(1);
    for (const e of editorial) {
      expect(isHedged(e.text)).toBe(true);
      expect(e.trace).toBe('dreamier');
    }

    // PLUS grounded computed option claims.
    const computed = result.claims.filter((c) => c.trace === 'computed');
    expect(computed.length).toBeGreaterThan(0);
    expect(result.truth.options.length).toBeGreaterThan(0);
  });

  it('resolves an alias to the canonical vibe', () => {
    const result = feelingToOptions(allOpenShape, openG, 'ethereal');
    expect(result.truth.vibeId).toBe('dreamier');
  });
});

describe('adviseSetupTool', () => {
  it('wraps the tension advisor with computed per-string claims', () => {
    const validIds = allValidKbIds('dadgad');
    const result = adviseSetupTool(dadgad);
    assertGrounded(result, validIds);
    expect(result.truth.advice.strings.length).toBe(dadgad.openStrings.length);
    for (const c of result.claims) expect(c.trace).toBe('computed');
  });

  it('surfaces a per-string flag the Setup pane renders, across string counts', () => {
    // The Setup pane reads noteName/tension.lb/band/flag per string.
    for (const id of ['open-c', 'standard-7', 'standard-8']) {
      const t = TUNINGS.find((x) => x.id === id)!;
      const advice = adviseSetupTool(t).truth.advice;
      expect(advice.strings.length).toBe(t.openStrings.length);
      for (const s of advice.strings) {
        expect(['floppy', 'fine', 'break-risk']).toContain(s.flag);
        expect(s.tension.lb).toBeGreaterThan(0);
        expect(s.noteName.length).toBeGreaterThan(0);
      }
    }
  });
});
