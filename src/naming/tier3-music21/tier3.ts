// /naming/tier3-music21 — Tier-3 inter-instrument anatomy via music21 (ADR 0008).
//
// This is the "expose what the guitar is actually doing" layer: key-dependent
// functional analysis (romanNumeralFromChord) + voicing anatomy (root / bass /
// inversion / doublings / omissions) over the FULL pitch MULTISET (octaves and
// doublings preserved; bass = lowest pitch, R10). It mirrors EXACTLY the two ops
// in spikes/r1-music21/music21_ops.py and reproduces results/pyodide.json.
//
// Delivery is fully client-side via Pyodide + music21, LAZY-loaded on first use
// (ADR 0008): nothing here touches Pyodide at import time or app load — only the
// first analyzeTier3()/loadTier3() call fetches the 15.9 MB runtime from the CDN
// (~8 s cold, then disk-cached). Tier-3 is NOT in the hot interactive loop; it
// fires on an explicit "expose" action (docs/01 §D/§F).
//
// The Pyodide runtime is INJECTABLE so unit tests can pass a fake that returns
// canned JSON — we never download the real 15 MB runtime under vitest. The CDN
// loader is the production default.

import type { Voicing } from '../../core';

// ─────────────────────────────────────────────────────────────────────────────
// Result shape — mirrors the spike output (results/pyodide.json) EXACTLY.
// ─────────────────────────────────────────────────────────────────────────────

/** Key-dependent functional analysis from roman.romanNumeralFromChord. */
export interface Tier3Roman {
  /** Full figure incl. figured-bass inversion, e.g. "I64", "V7", "ii7". */
  readonly figure: string;
  /** Bare roman numeral without inversion figures, e.g. "I", "V", "ii". */
  readonly romanNumeral: string;
  /** Scale degree of the root within the key (1..7). */
  readonly scaleDegree: number;
  /** music21 inversion ordinal: 0 root, 1 first, 2 second, 3 third. */
  readonly inversion: number;
  /** The figured-bass figures music21 wrote, e.g. "64", "7", "". */
  readonly figuredBass: string;
}

/** Full voicing anatomy from the realised pitch multiset. */
export interface Tier3Anatomy {
  /** Root with octave, e.g. "G2", or null if music21 finds none. */
  readonly root: string | null;
  /** Root pitch class 0..11, or null. */
  readonly rootPc: number | null;
  /** Bass (lowest pitch, R10) with octave, e.g. "D2", or null. */
  readonly bass: string | null;
  /** Bass pitch class 0..11, or null. */
  readonly bassPc: number | null;
  /** music21 inversion ordinal: 0 root, 1 first, 2 second, 3 third. */
  readonly inversion: number;
  /** music21 commonName, e.g. "major triad", "dominant seventh chord". */
  readonly commonName: string;
  /** music21 pitchedCommonName, e.g. "G-major triad". */
  readonly pitchedCommonName: string;
  /** Spelled pitches with octave, low→high, e.g. ["D2","G2","D3",...]. */
  readonly pitches: readonly string[];
  /** Pitch-class names appearing >1 → count, e.g. { D: 3, G: 2 }. */
  readonly doublings: Readonly<Record<string, number>>;
  /** Canonical chord members absent from the voicing, e.g. ["5th"]. */
  readonly omissions: readonly string[];
}

/** The complete Tier-3 payload: both ops on one voicing + key. */
export interface Tier3Result {
  readonly roman: Tier3Roman;
  readonly anatomy: Tier3Anatomy;
}

// ─────────────────────────────────────────────────────────────────────────────
// Injectable Pyodide runtime — the minimal surface the analyzer needs.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The minimal Pyodide-like surface this module calls. A real Pyodide instance
 * satisfies it (runPython returns the JSON string we json.dumps in Python). Tests
 * inject a fake whose runPython returns canned JSON, so no real runtime is loaded.
 */
export interface PyRuntime {
  /** Execute Python source; we use it for a json.dumps(...) expression → string. */
  runPython(code: string): unknown;
}

/**
 * A loader that yields a ready PyRuntime (Pyodide booted + music21 installed +
 * ops defined). Injectable for tests; the production default loads from the CDN.
 */
export type PyRuntimeLoader = () => Promise<PyRuntime>;

/** Options accepted by loadTier3 / analyzeTier3. */
export interface Tier3Options {
  /** Inject a runtime/loader (tests). Omit in production → CDN Pyodide. */
  readonly runtime?: PyRuntime;
  readonly loader?: PyRuntimeLoader;
  /** Pyodide version to load from jsdelivr. Default matches the spike (0.27.2). */
  readonly pyodideVersion?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Embedded Python — the SAME logic as music21_ops.py, plus a JSON entrypoint.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Python ops module, defined once into the runtime globals. Identical in
 * spirit to spikes/r1-music21/music21_ops.py: chord.Chord([midi...]),
 * roman.romanNumeralFromChord(c, key.Key(keyString)), root/bass from the chord,
 * doublings = pcs appearing >1, omission = 5th absent (bass = lowest = R10).
 */
export const PY_OPS = `
import json
from music21 import chord, key as m21key, roman

def _chord_from_midi(midi):
    # music21 pitch midi is 1:1 with our /core Midi coordinate; preserve octaves/doublings.
    return chord.Chord([int(m) for m in midi])

def roman_numeral(midi, k):
    c = _chord_from_midi(midi)
    kk = m21key.Key(k)
    rn = roman.romanNumeralFromChord(c, kk)
    return {
        "figure": rn.figure,
        "romanNumeral": rn.romanNumeralAlone,
        "scaleDegree": rn.scaleDegree,
        "inversion": rn.inversion(),
        "figuredBass": rn.figuresWritten,
    }

def voicing_anatomy(midi):
    c = _chord_from_midi(midi)
    root = c.root()
    bass = c.bass()  # music21 computes bass from the lowest pitch (matches R10)
    pc_counts = {}
    for p in c.pitches:
        pc_counts[p.name] = pc_counts.get(p.name, 0) + 1
    doublings = {name: n for name, n in pc_counts.items() if n > 1}
    omissions = [] if c.fifth is not None else ["5th"]
    return {
        "root": root.nameWithOctave if root else None,
        "rootPc": root.pitchClass if root else None,
        "bass": bass.nameWithOctave if bass else None,
        "bassPc": bass.pitchClass if bass else None,
        "inversion": c.inversion(),
        "commonName": c.commonName,
        "pitchedCommonName": c.pitchedCommonName,
        "pitches": [p.nameWithOctave for p in c.pitches],
        "doublings": doublings,
        "omissions": omissions,
    }

def analyze_voicing(midi, k):
    return json.dumps({
        "roman": roman_numeral(midi, k),
        "anatomy": voicing_anatomy(midi),
    })
`;

/**
 * Build the per-call Python that runs BOTH ops on a concrete midi multiset + key
 * and returns a JSON string. References the midi multiset and the key directly
 * (literal-embedded) so the call is self-contained and verifiable in tests.
 */
export function buildAnalyzeCall(midi: readonly number[], keyString: string): string {
  // Embed the midi multiset and key as Python literals; json round-trips both safely.
  const midiLiteral = `[${midi.map((m) => String(Math.trunc(m))).join(', ')}]`;
  const keyLiteral = JSON.stringify(keyString); // valid Python str literal too
  return `analyze_voicing(${midiLiteral}, ${keyLiteral})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy production loader — Pyodide from the CDN, then micropip music21, then ops.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PYODIDE_VERSION = '0.27.2'; // the version the R1 spike measured.

/**
 * The shape of the global loadPyodide the CDN script exposes. Declared locally so
 * we don't pull a hard dependency on Pyodide's types into the build.
 */
interface LoadedPyodide {
  loadPackage(names: string | string[]): Promise<void>;
  pyimport(name: string): { install(pkg: string): Promise<void> };
  runPython(code: string): unknown;
  globals: { set(name: string, value: unknown): void };
}
type LoadPyodideFn = (opts: { indexURL: string }) => Promise<LoadedPyodide>;

/**
 * Cached production runtime promise. Lives at module scope but is NEVER created at
 * import — only the first loadTier3()/analyzeTier3() call without an injected
 * runtime/loader assigns it. Subsequent calls reuse it (idempotent, ADR 0008).
 */
let cachedRuntime: Promise<PyRuntime> | null = null;

/**
 * Dynamically load the Pyodide CDN script (browser only), boot the runtime,
 * micropip-install music21, define the ops, and return a PyRuntime. This is the
 * production default; it runs ONLY when no runtime/loader was injected.
 */
async function loadCdnRuntime(version: string): Promise<PyRuntime> {
  const indexURL = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;

  // Lazily inject the loader script if the global isn't already present.
  const w = globalThis as unknown as { loadPyodide?: LoadPyodideFn };
  if (typeof w.loadPyodide !== 'function') {
    if (typeof document === 'undefined') {
      throw new Error(
        'Tier-3: no document to inject the Pyodide CDN script — run in a browser, ' +
          'or inject a runtime/loader via analyzeTier3(v, key, { runtime }).',
      );
    }
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${indexURL}pyodide.js`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Tier-3: failed to load the Pyodide CDN script.'));
      document.head.appendChild(s);
    });
  }

  const loadPyodide = (globalThis as unknown as { loadPyodide: LoadPyodideFn }).loadPyodide;
  const pyodide = await loadPyodide({ indexURL });

  await pyodide.loadPackage('micropip');
  const micropip = pyodide.pyimport('micropip');
  await micropip.install('music21');

  pyodide.runPython(PY_OPS);

  // Adapt the booted Pyodide to our minimal PyRuntime surface.
  return { runPython: (code: string) => pyodide.runPython(code) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick the runtime promise for this call: an injected runtime > an injected
 * loader > the cached CDN runtime (created lazily, once).
 */
function resolveRuntime(opts?: Tier3Options): Promise<PyRuntime> {
  if (opts?.runtime) return Promise.resolve(opts.runtime);
  if (opts?.loader) return opts.loader();
  if (cachedRuntime === null) {
    cachedRuntime = loadCdnRuntime(opts?.pyodideVersion ?? DEFAULT_PYODIDE_VERSION);
  }
  return cachedRuntime;
}

/**
 * Idempotently bring up the Tier-3 runtime (Pyodide + music21 + ops). DEFERRED:
 * does nothing until called. First production call is ~8 s cold (then cached);
 * later calls are no-ops returning the same cached runtime. Show a loading state
 * in the UI while this resolves (see module notes).
 *
 * In tests, pass { runtime } or { loader } to avoid touching real Pyodide.
 */
export async function loadTier3(opts?: Tier3Options): Promise<void> {
  await resolveRuntime(opts);
}

/**
 * Run BOTH Tier-3 ops on a voicing's pitch MULTISET (octaves/doublings preserved,
 * bass = lowest pitch via music21 = R10) plus a key context, returning the parsed
 * Tier3Result. Triggers the lazy load on first use if not already loaded.
 *
 * @param voicing   the realised pitch multiset (voicing.pitches), NOT collapsed.
 * @param keyString a music21 key string, e.g. "G", "C", "a", "f#" (Tier-1 supplies it).
 * @param opts.runtime / opts.loader  inject a runtime in tests; omit for CDN Pyodide.
 */
export async function analyzeTier3(
  voicing: Voicing,
  keyString: string,
  opts?: Tier3Options,
): Promise<Tier3Result> {
  const runtime = await resolveRuntime(opts);
  const code = buildAnalyzeCall(voicing.pitches as readonly number[], keyString);
  const raw = runtime.runPython(code);
  if (typeof raw !== 'string') {
    throw new Error(
      `Tier-3: expected a JSON string from runPython, got ${typeof raw}. The Python ` +
        'analyze_voicing must json.dumps its result.',
    );
  }
  return JSON.parse(raw) as Tier3Result;
}

/** TEST-ONLY: clear the cached production runtime so laziness can be re-asserted. */
export function __resetTier3RuntimeForTests(): void {
  cachedRuntime = null;
}
