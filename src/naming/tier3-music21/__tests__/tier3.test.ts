// Tier-3 analyzer tests — NO real Pyodide (15 MB, no browser under vitest).
// We inject a fake PyRuntime whose runPython returns the spike's KNOWN-GOOD JSON
// (spikes/r1-music21/results/pyodide.json sample_output) for the Open-G home
// chord, and assert: (1) the parser yields the canonical Tier-3 sentence, (2) the
// Python source built references the midi multiset and the key, (3) loadTier3 is
// lazy (untouched until called) and idempotent.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { voicing } from '../../../core';
import {
  analyzeTier3,
  buildAnalyzeCall,
  loadTier3,
  PY_OPS,
  __resetTier3RuntimeForTests,
} from '../tier3';
import type { PyRuntime } from '../tier3';

// The Open-G home chord, low-D drone: D2 G2 D3 G3 B3 D4 (midi multiset, R10).
const OPEN_G_HOME = [38, 43, 50, 55, 59, 62] as const;
const KEY_G = 'G';

// KNOWN-GOOD output (mirrors results/pyodide.json sample_output exactly for the
// fields the spike printed; the extra Tier3Result fields are the consistent
// music21 values for this same chord — romanNumeralAlone "I", figuresWritten
// "64", root pc 7 (G), bass pc 2 (D), pitchedCommonName "G-major triad").
const KNOWN_GOOD_JSON = JSON.stringify({
  roman: {
    figure: 'I64',
    romanNumeral: 'I',
    scaleDegree: 1,
    inversion: 2,
    figuredBass: '64',
  },
  anatomy: {
    root: 'G2',
    rootPc: 7,
    bass: 'D2',
    bassPc: 2,
    inversion: 2,
    commonName: 'major triad',
    pitchedCommonName: 'G-major triad',
    pitches: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
    doublings: { D: 3, G: 2 },
    omissions: [],
  },
});

/** A fake runtime that records the code it ran and returns canned JSON. */
function fakeRuntime(json: string): PyRuntime & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    runPython(code: string) {
      calls.push(code);
      return json;
    },
  };
}

afterEach(() => {
  __resetTier3RuntimeForTests();
  vi.restoreAllMocks();
});

describe('analyzeTier3 (fake runtime)', () => {
  it('parses the Open-G home chord into the canonical Tier-3 sentence', async () => {
    const runtime = fakeRuntime(KNOWN_GOOD_JSON);
    const v = voicing([...OPEN_G_HOME]);

    const result = await analyzeTier3(v, KEY_G, { runtime });

    // Roman: I64, second inversion, scale degree 1 (matches pyodide.json).
    expect(result.roman.figure).toBe('I64');
    expect(result.roman.inversion).toBe(2);
    expect(result.roman.scaleDegree).toBe(1);
    expect(result.roman.romanNumeral).toBe('I');
    expect(result.roman.figuredBass).toBe('64');

    // Anatomy: root G2, bass D2 (lowest pitch = R10), doublings D:3 G:2.
    expect(result.anatomy.root).toBe('G2');
    expect(result.anatomy.bass).toBe('D2');
    expect(result.anatomy.inversion).toBe(2);
    expect(result.anatomy.doublings).toEqual({ D: 3, G: 2 });
    expect(result.anatomy.commonName).toBe('major triad');
    expect(result.anatomy.pitches).toEqual(['D2', 'G2', 'D3', 'G3', 'B3', 'D4']);
    expect(result.anatomy.omissions).toEqual([]);
  });

  it('builds Python that references the midi multiset and the key', async () => {
    const runtime = fakeRuntime(KNOWN_GOOD_JSON);
    const v = voicing([...OPEN_G_HOME]);

    await analyzeTier3(v, KEY_G, { runtime });

    expect(runtime.calls).toHaveLength(1);
    const code = runtime.calls[0];
    // The exact midi multiset, in order, octaves/doublings preserved.
    expect(code).toContain('[38, 43, 50, 55, 59, 62]');
    // The key string.
    expect(code).toContain('"G"');
    // It invokes the op that runs BOTH analyses.
    expect(code).toContain('analyze_voicing');
  });

  it('buildAnalyzeCall embeds the multiset and key as a self-contained call', () => {
    const code = buildAnalyzeCall([...OPEN_G_HOME], KEY_G);
    expect(code).toBe('analyze_voicing([38, 43, 50, 55, 59, 62], "G")');
  });

  it('PY_OPS defines both ops with the spike logic (chord/roman/key)', () => {
    expect(PY_OPS).toContain('romanNumeralFromChord');
    expect(PY_OPS).toContain('chord.Chord');
    expect(PY_OPS).toContain('m21key.Key');
    expect(PY_OPS).toContain('def voicing_anatomy');
    expect(PY_OPS).toContain('def roman_numeral');
    // 5th-omission rule and doublings logic from music21_ops.py.
    expect(PY_OPS).toContain('"5th"');
  });

  it('throws a clear error if runPython does not return a JSON string', async () => {
    const badRuntime: PyRuntime = { runPython: () => ({ not: 'a string' }) };
    const v = voicing([...OPEN_G_HOME]);
    await expect(analyzeTier3(v, KEY_G, { runtime: badRuntime })).rejects.toThrow(
      /expected a JSON string/,
    );
  });
});

describe('loadTier3 laziness + idempotency', () => {
  it('does NOT touch the runtime until called (lazy)', async () => {
    // A loader we can observe: it must not run during import or before loadTier3.
    const loader = vi.fn(async (): Promise<PyRuntime> => fakeRuntime(KNOWN_GOOD_JSON));

    // Importing the module / constructing nothing has not called the loader.
    expect(loader).not.toHaveBeenCalled();

    await loadTier3({ loader });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('caches the CDN runtime: boots Pyodide once across many calls (idempotent)', async () => {
    // Stub the global loadPyodide the CDN script would expose, so the cached
    // production path runs WITHOUT injecting a runtime/loader — exercising the
    // module-scope cache that ADR 0008 requires (no re-download, no re-init).
    let bootCount = 0;
    const micropip = { install: vi.fn(async () => undefined) };
    const fakePyodide = {
      loadPackage: vi.fn(async () => undefined),
      pyimport: vi.fn(() => micropip),
      runPython: vi.fn(() => KNOWN_GOOD_JSON),
      globals: { set: vi.fn() },
    };
    const loadPyodide = vi.fn(async () => {
      bootCount += 1;
      return fakePyodide;
    });
    // The global the CDN pyodide.js would define; present → no script injection.
    (globalThis as unknown as { loadPyodide: unknown }).loadPyodide = loadPyodide;

    const v = voicing([...OPEN_G_HOME]);
    try {
      // No runtime/loader → cached CDN path. Many calls, ONE boot.
      await loadTier3();
      await analyzeTier3(v, KEY_G);
      const again = await analyzeTier3(v, KEY_G);

      expect(bootCount).toBe(1);
      expect(loadPyodide).toHaveBeenCalledTimes(1);
      expect(micropip.install).toHaveBeenCalledWith('music21');
      // PY_OPS defined exactly once at boot; per-call code ran for each analyze.
      expect(fakePyodide.runPython).toHaveBeenCalledWith(PY_OPS);
      expect(again.roman.figure).toBe('I64');
    } finally {
      delete (globalThis as unknown as { loadPyodide?: unknown }).loadPyodide;
    }
  });
});
