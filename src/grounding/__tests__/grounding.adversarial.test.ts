// /grounding — ADVERSARIAL red-team suite (independent of the implementers; docs/06 R9;
// ADR 0003 the testable grounding contract). The companion grounding.test.ts proves the
// happy path; THIS file tries to break it:
//
//   1. CATCHES CONFABULATION — hand-build ToolResults that SHOULD fail and assert
//      checkGrounding flags each: (a) an untraceable id, (b) an unhedged editorial vibe
//      claim stated as fact, (c) an empty trace. A PASS here is a real hole.
//   2. REAL OUTPUT IS TRACEABLE — call the ACTUAL mcp tools on Open-G shapes (incl. the §6
//      barre-5-over-low-D and the all-open home chord) and assert checkGrounding(...).ok
//      and that every claim trace RESOLVES (no claim silently traced to a stale/typo id).
//      The editorial affective claim must be the ONLY editorial one, and must be hedged.
//   3. NO LAUNDERING — a tool cannot mark a CHECKABLE musical claim editorial to dodge
//      tracing; editorial is for affective/taste only.
//
// We do NOT edit any implementation. Where a probe reveals a genuine hole the failing
// assertion is KEPT (the orchestrator fixes the implementation, not this test).

import { describe, expect, it } from 'vitest';
import { TUNINGS } from '../../ui/fixtures';
import type { Shape } from '../../ui';
import type { Claim, ToolResult } from '../../mcp';
import {
  feelingToOptions,
  functionOf,
  isHedged,
  mcpIdentify,
  neighbors,
  translate,
} from '../../mcp';
import {
  checkGrounding,
  collectEditorialKbIds,
  collectKbIds,
} from '../index';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;
const eadgbe = TUNINGS.find((t) => t.id === 'eadgbe')!;

const kbIds = collectKbIds();
const editorialIds = collectEditorialKbIds();

// ── Shape fixtures (index-aligned with Tuning.openStrings; string 0 = high) ──

/** All six strings open — the Open-G home I chord (G). */
const allOpenShape: Shape = openG.openStrings.map(() => ({ kind: 'open' }) as const);

/** §6 worked example: upper five strings barred at fret 5, low string (idx 5) open low D.
 *  This is the og-major-over-d-drone shape (IV / C major over the open D drone). */
const barre5OverLowD: Shape = openG.openStrings.map((_, i) =>
  i === 5 ? ({ kind: 'open' } as const) : ({ kind: 'fret', fret: 5 } as const),
);

/** Wrap claims in a minimal ToolResult so the harness can be exercised directly. */
function resultWith(claims: Claim[]): ToolResult<null> {
  return {
    truth: null,
    explanation: 'adversarial fixture',
    reasoningChain: ['fixture'],
    claims,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PROBE 1 — the harness CATCHES confabulation (these MUST fail checkGrounding)
// ════════════════════════════════════════════════════════════════════════════

describe('PROBE 1 — confabulation must be caught', () => {
  it('1a: a checkable claim traced to a non-existent id ("frame-does-not-exist") is UNTRACEABLE', () => {
    const result = resultWith([
      {
        text: 'This shape frames as a secret Lydian pivot.',
        trace: 'frame-does-not-exist',
      },
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].kind).toBe('UNTRACEABLE');
    expect(report.violations[0].claim.trace).toBe('frame-does-not-exist');
    // Guard against the trap of the typo id accidentally existing in the registry.
    expect(kbIds.has('frame-does-not-exist')).toBe(false);
  });

  it('1b: an editorial vibe claim with the hedge REMOVED ("dreamy MEANS …" as fact) is UNHEDGED-EDITORIAL', () => {
    // Stated as bare fact, no usually/often/tends-to; traced to a REAL editorial vibe id.
    const result = resultWith([
      { text: 'Dreamy MEANS added 9ths and a dropped third.', trace: 'dreamier', editorial: true },
    ]);
    expect(isHedged('Dreamy MEANS added 9ths and a dropped third.')).toBe(false);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].kind).toBe('UNHEDGED-EDITORIAL');
  });

  it('1b-bis: the same unhedged taste claim is caught by TRACE alone even with editorial:true omitted', () => {
    // The author "forgot" editorial:true — the trace (an editorial vibe id) must still trip it.
    const result = resultWith([
      { text: 'Dreamy MEANS added 9ths and a dropped third.', trace: 'dreamier' },
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations[0].kind).toBe('UNHEDGED-EDITORIAL');
  });

  it('1c: a claim with an EMPTY trace is EMPTY-TRACE', () => {
    const empty = resultWith([{ text: 'A claim with no provenance whatsoever.', trace: '' }]);
    const er = checkGrounding(empty, kbIds);
    expect(er.ok).toBe(false);
    expect(er.violations[0].kind).toBe('EMPTY-TRACE');

    // Whitespace-only is also empty (the harness trims).
    const ws = checkGrounding(resultWith([{ text: 'blank.', trace: '   ' }]), kbIds);
    expect(ws.ok).toBe(false);
    expect(ws.violations[0].kind).toBe('EMPTY-TRACE');
  });

  it('1d: all three confabulations together produce exactly the three distinct violations', () => {
    const result = resultWith([
      { text: 'The bass note is D2.', trace: 'computed' }, // legitimate
      { text: 'A secret Lydian pivot.', trace: 'frame-does-not-exist' }, // UNTRACEABLE
      { text: 'Dreamy MEANS added 9ths.', trace: 'dreamier', editorial: true }, // UNHEDGED-EDITORIAL
      { text: 'Orphan.', trace: '' }, // EMPTY-TRACE
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations.map((v) => v.kind).sort()).toEqual([
      'EMPTY-TRACE',
      'UNHEDGED-EDITORIAL',
      'UNTRACEABLE',
    ]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PROBE 2 — REAL tool output is genuinely traceable (every trace resolves)
// ════════════════════════════════════════════════════════════════════════════

/** A representative set of REAL tool calls over Open-G shapes (+ a cross-tuning translate). */
function representativeSet(): { name: string; result: ToolResult<unknown> }[] {
  return [
    { name: 'mcpIdentify(barre-5-over-low-D)', result: mcpIdentify(barre5OverLowD, openG) },
    { name: 'mcpIdentify(all-open home)', result: mcpIdentify(allOpenShape, openG) },
    { name: 'functionOf(barre-5-over-low-D)', result: functionOf(barre5OverLowD, openG) },
    { name: 'functionOf(all-open home)', result: functionOf(allOpenShape, openG) },
    { name: 'neighbors(all-open home)', result: neighbors(allOpenShape, openG) },
    { name: 'neighbors(barre-5-over-low-D)', result: neighbors(barre5OverLowD, openG) },
    { name: 'translate(Open-G home -> EADGBE)', result: translate(allOpenShape, openG, eadgbe) },
    { name: 'feelingToOptions(dreamier, home)', result: feelingToOptions(allOpenShape, openG, 'dreamier') },
    { name: 'feelingToOptions(darker, barre-5)', result: feelingToOptions(barre5OverLowD, openG, 'darker') },
    { name: 'feelingToOptions(more-open, home)', result: feelingToOptions(allOpenShape, openG, 'more-open') },
  ];
}

describe('PROBE 2 — real tool output is traceable', () => {
  it('every tool in the representative set passes checkGrounding (ok:true)', () => {
    for (const { name, result } of representativeSet()) {
      const report = checkGrounding(result, kbIds);
      expect(
        { name, violations: report.violations.map((v) => `${v.kind}: ${v.reason}`) },
      ).toEqual({ name, violations: [] });
      expect(report.ok).toBe(true);
    }
  });

  it('every claim trace actually RESOLVES — "computed" or a live KB id (no stale/typo ids)', () => {
    for (const { name, result } of representativeSet()) {
      for (const claim of result.claims) {
        const resolves = claim.trace === 'computed' || kbIds.has(claim.trace);
        expect(
          { name, text: claim.text, trace: claim.trace, resolves },
        ).toMatchObject({ resolves: true });
      }
    }
  });

  it('the §6 barre-5-over-low-D identify carries a KB-traced relational frame claim', () => {
    const result = mcpIdentify(barre5OverLowD, openG);
    // There must be at least one non-computed (KB-id) claim — the relational frame —
    // and it must resolve to a real KB id (the laundering guard: it is NOT "computed").
    const kbClaims = result.claims.filter((c) => c.trace !== 'computed');
    expect(kbClaims.length).toBeGreaterThan(0);
    for (const c of kbClaims) expect(kbIds.has(c.trace)).toBe(true);
  });

  it('feelingToOptions has EXACTLY ONE editorial claim and it is hedged + traced to a vibe id', () => {
    for (const vibe of ['dreamier', 'darker', 'more-open']) {
      const result = feelingToOptions(allOpenShape, openG, vibe);
      const editorial = result.claims.filter(
        (c) => c.editorial === true || editorialIds.has(c.trace),
      );
      // The ONE editorial seam.
      expect({ vibe, count: editorial.length }).toEqual({ vibe, count: 1 });
      const ed = editorial[0];
      expect(isHedged(ed.text)).toBe(true);
      expect(editorialIds.has(ed.trace)).toBe(true);
      // Every OTHER claim from this tool is non-editorial AND grounded (computed/KB).
      for (const c of result.claims) {
        if (c === ed) continue;
        expect(c.editorial === true || editorialIds.has(c.trace)).toBe(false);
        expect(c.trace === 'computed' || kbIds.has(c.trace)).toBe(true);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PROBE 3 — NO LAUNDERING (checkable musical claims cannot hide behind editorial)
// ════════════════════════════════════════════════════════════════════════════

describe('PROBE 3 — no laundering of checkable claims as editorial', () => {
  it('a CHECKABLE musical claim mis-tagged editorial but traced to a NON-vibe id is still UNTRACEABLE', () => {
    // Attempt: dodge tracing a fabricated musical assertion by slapping editorial:true on
    // it. But editorial does not exempt traceability — the trace must STILL resolve. Here
    // the trace is a made-up id, so the harness must still flag UNTRACEABLE (laundering fails).
    const result = resultWith([
      {
        text: 'This usually resolves to the bVII (an objective theory claim, dressed as taste).',
        trace: 'fabricated-theory-id',
        editorial: true,
      },
    ]);
    const report = checkGrounding(result, kbIds);
    expect(report.ok).toBe(false);
    expect(report.violations[0].kind).toBe('UNTRACEABLE');
  });

  it('real tools never tag a COMPUTED/THEORY claim editorial — editorial implies a vibe-id trace', () => {
    // Across the representative set, any claim flagged editorial:true must be traced to an
    // editorial vibe id (taste), never to "computed" or a theory rule id. If a grounded
    // musical claim were mis-tagged editorial, this catches it.
    for (const { name, result } of representativeSet()) {
      for (const c of result.claims) {
        if (c.editorial === true) {
          expect({ name, text: c.text, trace: c.trace, isVibe: editorialIds.has(c.trace) })
            .toMatchObject({ isVibe: true });
          expect(c.trace).not.toBe('computed');
        }
      }
    }
  });

  it('conversely, no NON-editorial claim is traced to a vibe id (taste smuggled in as fact)', () => {
    // A claim traced to an editorial vibe id but NOT flagged editorial is the inverse
    // laundering: taste presented as plain theory. The harness still treats it as editorial
    // (trace-based detection) and requires a hedge — so real tools must not produce one
    // that is both vibe-traced AND unhedged. Verify none exist in the representative set.
    for (const { name, result } of representativeSet()) {
      for (const c of result.claims) {
        if (editorialIds.has(c.trace)) {
          expect({ name, text: c.text, hedged: isHedged(c.text) })
            .toMatchObject({ hedged: true });
        }
      }
    }
  });
});
