// /grounding tests — the M3 GATE (docs/06 R9; ADR 0003).
//
// Two halves, both validated against KNOWN values:
//   (A) PASS on the representative set — call the ACTUAL /mcp intent tools (mcpIdentify,
//       functionOf, feelingToOptions, translate, neighbors, findVoicingsTool,
//       adviseSetupTool) on Open-G fixtures and assert checkGrounding returns ok:true for
//       every one. This is the honesty gate: real tool output is fully grounded.
//   (B) CATCH violations — hand-build ToolResults that break the contract and assert the
//       harness flags them: (a) a claim traced to a non-existent id -> UNTRACEABLE,
//       (b) an editorial claim with no hedge -> UNHEDGED-EDITORIAL, (c) an empty trace
//       -> EMPTY-TRACE.

import { describe, expect, it } from 'vitest';
import { TUNINGS } from '../../ui/fixtures';
import type { Shape } from '../../ui';
import type { Claim, ToolResult } from '../../mcp';
import {
  adviseSetupTool,
  feelingToOptions,
  findVoicingsTool,
  functionOf,
  mcpIdentify,
  neighbors,
  translate,
} from '../../mcp';
import { checkGrounding, collectKbIds, collectEditorialKbIds } from '../index';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;
const eadgbe = TUNINGS.find((t) => t.id === 'eadgbe')!;

/** The Open-G home chord shape: all six strings open (the I in G). */
const allOpenShape: Shape = openG.openStrings.map(() => ({ kind: 'open' }) as const);

// ─────────────────────────────────────────────────────────────────────────────
// collectKbIds — the registry of legal trace targets
// ─────────────────────────────────────────────────────────────────────────────

describe('collectKbIds', () => {
  it('gathers rule ids, the open-g card id + shape ids, and affective vibe ids', () => {
    const ids = collectKbIds();
    expect(ids.size).toBeGreaterThan(0);
    // The open-g card id is a member.
    expect(ids.has('open-g')).toBe(true);
    // The affective vibe ids are members.
    expect(ids.has('dreamier')).toBe(true);
    expect(ids.has('darker')).toBe(true);
    // The home-frame relational rule is a member.
    expect(ids.has('frame-home')).toBe(true);
    // "computed" is NOT a KB id (it is the runtime tag, handled separately).
    expect(ids.has('computed')).toBe(false);
  });

  it('marks the affective vibe ids (and only those) as editorial', () => {
    const editorial = collectEditorialKbIds();
    expect(editorial.has('dreamier')).toBe(true);
    expect(editorial.has('more-open')).toBe(true);
    // A theory rule id is NOT editorial.
    expect(editorial.has('frame-home')).toBe(false);
    // The card id is not editorial.
    expect(editorial.has('open-g')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A) PASS on the representative set of REAL tool outputs (the M3 gate)
// ─────────────────────────────────────────────────────────────────────────────

describe('checkGrounding — the representative set passes (M3 gate)', () => {
  const kbIds = collectKbIds();

  /** Run the harness and surface the violation reasons on failure for a readable diff. */
  function expectGrounded(result: ToolResult<unknown>): void {
    const report = checkGrounding(result, kbIds);
    expect(report.violations.map((v) => `${v.kind}: ${v.reason}`)).toEqual([]);
    expect(report.ok).toBe(true);
  }

  it('mcpIdentify(Open-G home chord) is fully grounded', () => {
    expectGrounded(mcpIdentify(allOpenShape, openG));
  });

  it('functionOf(Open-G home chord) is fully grounded', () => {
    expectGrounded(functionOf(allOpenShape, openG));
  });

  it('neighbors(Open-G home chord) is fully grounded', () => {
    expectGrounded(neighbors(allOpenShape, openG));
  });

  it('findVoicingsTool(C on EADGBE) is fully grounded', () => {
    expectGrounded(findVoicingsTool('C', eadgbe));
  });

  it('translate(Open-G -> EADGBE) is fully grounded', () => {
    expectGrounded(translate(allOpenShape, openG, eadgbe));
  });

  it('feelingToOptions(dreamier on Open-G) — editorial seam + computed options — is grounded', () => {
    const result = feelingToOptions(allOpenShape, openG, 'dreamier');
    // The editorial vibe claim must itself be detected as editorial AND hedged.
    const editorial = result.claims.filter((c) => c.editorial);
    expect(editorial.length).toBeGreaterThanOrEqual(1);
    expectGrounded(result);
  });

  it('adviseSetupTool(Open-G) is fully grounded', () => {
    expectGrounded(adviseSetupTool(openG));
  });

  it('the WHOLE representative set passes in aggregate (ok:true everywhere)', () => {
    const results: ToolResult<unknown>[] = [
      mcpIdentify(allOpenShape, openG),
      functionOf(allOpenShape, openG),
      neighbors(allOpenShape, openG),
      findVoicingsTool('C', eadgbe),
      translate(allOpenShape, openG, eadgbe),
      feelingToOptions(allOpenShape, openG, 'dreamier'),
      adviseSetupTool(openG),
    ];
    for (const r of results) {
      expect(checkGrounding(r, kbIds).ok).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B) CATCH violations — hand-built ToolResults that break the contract
// ─────────────────────────────────────────────────────────────────────────────

/** Wrap a list of claims in a minimal ToolResult for the harness. */
function resultWith(claims: Claim[]): ToolResult<null> {
  return {
    truth: null,
    explanation: 'hand-built fixture',
    reasoningChain: ['fixture'],
    claims,
  };
}

describe('checkGrounding — catches violations', () => {
  const kbIds = collectKbIds();

  it('flags UNTRACEABLE for a claim traced to a totally-made-up id', () => {
    const result = resultWith([
      { text: 'This shape is a secret augmented eleventh.', trace: 'totally-made-up-id' },
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].kind).toBe('UNTRACEABLE');
    expect(report.violations[0].claim.trace).toBe('totally-made-up-id');
  });

  it('flags UNHEDGED-EDITORIAL for an editorial claim with no hedge', () => {
    const result = resultWith([
      // editorial:true but the text states taste as bare fact (no usually/often/tends).
      { text: 'Dreamier means add a 9th and drop the third.', trace: 'dreamier', editorial: true },
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].kind).toBe('UNHEDGED-EDITORIAL');
  });

  it('flags UNHEDGED-EDITORIAL by TRACE even when editorial:true is omitted', () => {
    // The claim forgot to set editorial:true, but its trace is an editorial vibe id.
    const result = resultWith([
      { text: 'Darker is a Phrygian shift with a low drone.', trace: 'darker' },
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations[0].kind).toBe('UNHEDGED-EDITORIAL');
  });

  it('PASSES a hedged editorial claim traced to a real vibe id', () => {
    const result = resultWith([
      { text: 'Dreamier usually means add a 9th and let the opens ring.', trace: 'dreamier', editorial: true },
    ]);
    expect(checkGrounding(result, kbIds).ok).toBe(true);
  });

  it('flags EMPTY-TRACE for a claim with a blank trace', () => {
    const result = resultWith([{ text: 'A claim with no provenance.', trace: '' }]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations[0].kind).toBe('EMPTY-TRACE');
  });

  it('reports MULTIPLE violations across a mixed result', () => {
    const result = resultWith([
      { text: 'The bass note is D2.', trace: 'computed' }, // ok
      { text: 'A made-up assertion.', trace: 'no-such-id' }, // UNTRACEABLE
      { text: 'More open means widen the spacing.', trace: 'more-open', editorial: true }, // UNHEDGED-EDITORIAL
      { text: 'Orphan claim.', trace: '' }, // EMPTY-TRACE
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    const kinds = report.violations.map((v) => v.kind).sort();
    expect(kinds).toEqual(['EMPTY-TRACE', 'UNHEDGED-EDITORIAL', 'UNTRACEABLE']);
  });
});
