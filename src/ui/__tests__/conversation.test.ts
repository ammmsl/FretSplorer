// Conversation view-model — PURE router + turn-view assembly (the M3 product gate).
// The deterministic intent router (docs/04 verbs) and the ToolResult -> TurnView fold,
// tested against the grounding contract (ADR 0003): editorial taste stays hedged + marked,
// computed vs KB traces are distinguished, and the affective turn yields spawnable options.
// React is NOT tested here (per the build task) — only the pure helpers.

import { describe, expect, it } from 'vitest';
import type { ToolResult } from '../../mcp';
import { feelingToOptions } from '../../mcp';
import { TUNINGS } from '../fixtures';
import { emptyGrip, placeFret, type Grip } from '../grip';
import { buildTurnView, intentLabel, route, type OptionView } from '../conversation';

const openG = TUNINGS.find((t) => t.id === 'open-g')!;
/** Open-G home grip (all six strings open) — the M-series gate grip. */
const allOpen: Grip = openG.openStrings.map(() => ({ kind: 'open' as const }));

describe('route — affective vibe path (the editorial seam)', () => {
  it('"make it dreamier" -> feeling, vibe dreamier', () => {
    const i = route('make it dreamier');
    expect(i.kind).toBe('feeling');
    expect(i.vibe).toBe('dreamier');
  });
  it('"darker" -> feeling, vibe darker', () => {
    expect(route('darker').vibe).toBe('darker');
  });
  it('"more open" -> feeling, vibe more-open', () => {
    expect(route('can you make it more open').vibe).toBe('more-open');
  });
  it('aliases resolve to the canonical vibe id', () => {
    expect(route('something hazy').vibe).toBe('dreamier');
    expect(route('make it moodier').vibe).toBe('darker');
    expect(route('a bit more spacious').vibe).toBe('more-open');
  });
});

describe('route — the question intents', () => {
  it('"what is this?" -> identify', () => {
    expect(route('what is this?').kind).toBe('identify');
  });
  it('"what am I holding" -> identify', () => {
    expect(route('what am I holding right now').kind).toBe('identify');
  });
  it('"what does this do?" -> function (checked before identify)', () => {
    expect(route('what does this do?').kind).toBe('function');
  });
  it('"easier way?" -> voicings', () => {
    expect(route('is there an easier way?').kind).toBe('voicings');
  });
  it('unrecognised text -> unknown (honest miss, no misfire)', () => {
    expect(route('tell me a joke').kind).toBe('unknown');
  });
  it('normalised text is preserved (trimmed, lower-cased)', () => {
    expect(route('  WHAT IS THIS?  ').normalized).toBe('what is this?');
  });
});

describe('intentLabel', () => {
  it('gives a human label per intent', () => {
    expect(intentLabel('identify')).toBe('identify');
    expect(intentLabel('unknown')).toBe('unrecognised');
  });
});

describe('buildTurnView — fold a ToolResult into a render-ready turn', () => {
  const fixture: ToolResult<{ ok: boolean }> = {
    truth: { ok: true },
    explanation: 'This reads as G over D.',
    reasoningChain: ['step one', 'step two'],
    claims: [
      { text: 'The bass note is D2.', trace: 'computed' },
      { text: 'home frame on the I', trace: 'rel.frame.home' },
      {
        text: '"dreamier" usually means add-tone — taste, not theory.',
        trace: 'dreamier',
        editorial: true,
      },
    ],
  };

  const view = buildTurnView(fixture);

  it('the explanation becomes the model line', () => {
    expect(view.modelLine).toBe('This reads as G over D.');
  });
  it('the reasoning chain is carried verbatim', () => {
    expect(view.reasoningChain).toEqual(['step one', 'step two']);
  });
  it('classifies computed vs KB traces distinctly', () => {
    expect(view.traces[0].traceKind).toBe('computed');
    expect(view.traces[0].traceId).toBe('computed');
    expect(view.traces[1].traceKind).toBe('kb');
    expect(view.traces[1].traceId).toBe('rel.frame.home');
  });
  it('marks editorial taste claims and confirms they are hedged', () => {
    const ed = view.traces[2];
    expect(ed.editorial).toBe(true);
    expect(ed.hedged).toBe(true); // contains "usually"
    expect(ed.traceId).toBe('dreamier'); // points at the affective vibe id
    expect(view.hasEditorial).toBe(true);
  });
  it('carries spawnable options through unchanged', () => {
    const opts: OptionView[] = [{ symbol: 'Gadd9', frets: [2, 0, 0, 0, null, null], playability: 'easy' }];
    expect(buildTurnView(fixture, opts).options).toEqual(opts);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end seam: route a real "make it dreamier" turn against the live MCP tool
// on the Open-G home grip and confirm the TurnView is grounded + hedged + spawnable.
// ─────────────────────────────────────────────────────────────────────────────

describe('end to end — "make it dreamier" on the Open-G home grip', () => {
  const intent = route('make it dreamier');
  const result = feelingToOptions(allOpen, openG, intent.vibe!);
  const optionViews: OptionView[] = result.truth.options.map((o) => ({
    symbol: o.symbol,
    frets: o.voicing ? o.voicing.frets : openG.openStrings.map(() => null),
    playability: o.voicing ? o.voicing.playability.flag : null,
  }));
  const view = buildTurnView(result, optionViews);

  it('routed to the affective vibe id', () => {
    expect(intent.kind).toBe('feeling');
    expect(intent.vibe).toBe('dreamier');
  });
  it('the model line is present (the grounded explanation)', () => {
    expect(view.modelLine.length).toBeGreaterThan(0);
  });
  it('exactly one editorial taste claim, and it is hedged (ADR 0003)', () => {
    const editorial = view.traces.filter((t) => t.editorial);
    expect(editorial).toHaveLength(1);
    expect(editorial[0].hedged).toBe(true);
    expect(editorial[0].traceId).toBe('dreamier'); // the affective vibe KB id
  });
  it('every non-editorial trace is grounded (computed or a KB id, never empty)', () => {
    for (const t of view.traces) {
      expect(t.traceId.length).toBeGreaterThan(0);
      if (!t.editorial) expect(['computed', t.traceId]).toContain(t.traceId);
    }
  });
  it('yields at least one spawnable option voicing (the teaching comparison)', () => {
    expect(view.options.length).toBeGreaterThan(0);
    // each option's frets array is aligned to the 6 strings
    expect(view.options[0].frets).toHaveLength(6);
  });
});

describe('buildTurnView — an empty grip still produces a valid (if thin) turn', () => {
  it('feeling on an empty grip routes but yields a defined view', () => {
    const r = feelingToOptions(emptyGrip(6), openG, 'dreamier');
    const v = buildTurnView(r);
    expect(v.modelLine.length).toBeGreaterThan(0);
    expect(v.hasEditorial).toBe(true); // the editorial vibe claim is always present
  });
  it('a single fretted note is routable for identify', () => {
    const g = placeFret(emptyGrip(6), 5, 3);
    expect(route('what is this').kind).toBe('identify');
    expect(g[5]).toEqual({ kind: 'fret', fret: 3 });
  });
});
