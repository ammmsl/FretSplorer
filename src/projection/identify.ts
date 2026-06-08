// Reverse identification (/projection) — the spine's REVERSE node (M1).
//
// placed positions (a /board grip) + tuning + context -> RANKED theory candidates.
// Implements the `Identify` contract pinned in src/core/pitch-model.ts §8 (see the
// compile-time assertion in index.ts). docs/03-architecture.md; docs/06 R5 + R10.
//
// HARD invariants this node upholds (R10):
//   - bass is the LOWEST PITCH (argmin), never the lowest string index — core's
//     voicing() computes bassIndex = argmin(pitches), so re-entrant tunings and
//     partial capos are handled for free.
//   - the full pitch MULTISET (octaves + doublings) is PRESERVED: every returned
//     candidate carries the SAME realised Voicing. Only the chord INTERPRETATION
//     varies across candidates; the sounding pitches never collapse to a pc-set.
//
// SYMBOL detection is borrowed from Tonal's bass-aware Chord.detect (the same tool
// /naming/tier2-tonal uses for absolute labels). We additionally run the
// `assumePerfectFifth` variant so omitted-5th grips (C-E-Bb -> C7, C-E-B -> Cmaj7)
// surface a candidate the scorer can then lightly penalise — Tonal returns nothing
// for those without the flag (verified against tonal@current).
//
// SCORING reproduces kb/rules/ranking-weights.yaml via the typed WEIGHTS /
// SURFACE_POLICY consts in ./ranking (mirrored, NOT loaded at runtime — same pattern
// as droneMap mirroring the tension table). Ranked, never one forced answer (R5).
//
// Pure function, no hidden state (matches /core, /tension, ./project conventions).

import { Chord as TonalChord, Interval as TonalInterval, Note } from 'tonal';
import type {
  Chord,
  IdentifyContext,
  Identify,
  PlacedPosition,
  RankedCandidate,
  Tuning,
  Voicing,
} from '../core';
import { chordFromPitchClasses, midi, toPitchClass, voicing } from '../core';
import { SURFACE_POLICY, WEIGHTS } from './ranking';

/** The major-scale pitch-class set rooted at `tonicPc` (for the diatonic key bias). */
function majorScalePcs(tonicPc: number): ReadonlySet<number> {
  const STEPS = [0, 2, 4, 5, 7, 9, 11];
  return new Set(STEPS.map((s) => (tonicPc + s) % 12));
}

/** Parse a Tonal detect entry "SYM/BASS" -> { symbol, slashBass? }. The chord symbol
 *  itself never contains "/", so the FIRST slash is always the bass separator. */
function splitDetected(detected: string): { symbol: string; slashBass?: string } {
  const i = detected.indexOf('/');
  if (i === -1) return { symbol: detected };
  return { symbol: detected.slice(0, i), slashBass: detected.slice(i + 1) };
}

/** Canonical chord-member pitch classes resolved from a Tonal symbol, keyed by the
 *  interval NUMBER (1 = root, 3 = third, 5 = fifth, 7 = seventh, …). Used to test
 *  which canonical members are absent from the sounding set (omission penalties). */
interface ChordMembers {
  readonly rootPc: number;
  readonly memberPcs: readonly number[]; // all canonical pcs (a set)
  readonly byDegreeNum: ReadonlyMap<number, number>; // simple degree number -> pc
}

function resolveMembers(symbol: string): ChordMembers | null {
  const g = TonalChord.get(symbol);
  if (g.empty || !g.tonic) return null;
  const rootChroma = Note.get(g.tonic).chroma;
  if (rootChroma === undefined) return null;

  const byDegreeNum = new Map<number, number>();
  const memberPcs: number[] = [];
  for (const ivl of g.intervals) {
    const parsed = TonalInterval.get(ivl);
    const chroma = parsed.chroma ?? 0;
    const pc = ((rootChroma + chroma) % 12 + 12) % 12;
    memberPcs.push(pc);
    // Fold compound degree numbers (9->2, 11->4, 13->6) to their simple form so the
    // 3rd/5th/7th tests below see the structural member regardless of extension octave.
    const num = parsed.num ?? 1;
    const simple = ((num - 1) % 7) + 1;
    if (!byDegreeNum.has(simple)) byDegreeNum.set(simple, pc);
  }
  return { rootPc: rootChroma, memberPcs, byDegreeNum };
}

/** A pre-scored interpretation of the (single, shared) voicing. */
interface ScoredCandidate {
  readonly chord: Chord;
  readonly score: number;
  /** Symbol length, used only for the simplicity tiebreak (shorter = simpler). */
  readonly symbolLength: number;
}

/**
 * Score one detected symbol against the sounding pitch classes + context (R5).
 * Returns null when the symbol has no resolvable root (un-scoreable).
 */
function scoreCandidate(
  symbol: string,
  soundingPcs: ReadonlySet<number>,
  bassPc: number,
  diatonicKeyPcs: ReadonlySet<number> | null,
  keyTonic: number | null,
): ScoredCandidate | null {
  const members = resolveMembers(symbol);
  if (!members) return null;

  let score = 0;

  // keyContextBias: root is the key tonic OR diatonic to that major key.
  if (diatonicKeyPcs) {
    if (members.rootPc === keyTonic || diatonicKeyPcs.has(members.rootPc)) {
      score += WEIGHTS.keyContextBias;
    }
  }

  // bassIsRoot: the computed bass pitch class equals the candidate root.
  if (bassPc === members.rootPc) score += WEIGHTS.bassIsRoot;

  // Omission penalties — apply when a CANONICAL member is ABSENT from the sounding pcs.
  if (!soundingPcs.has(members.rootPc)) score += WEIGHTS.omitRootPenalty;
  const thirdPc = members.byDegreeNum.get(3);
  if (thirdPc !== undefined && !soundingPcs.has(thirdPc)) score += WEIGHTS.omit3rdPenalty;
  const fifthPc = members.byDegreeNum.get(5);
  if (fifthPc !== undefined && !soundingPcs.has(fifthPc)) score += WEIGHTS.omit5thPenalty;

  // parsimonyPenalty: per canonical member the symbol ASSUMES that is not sounding.
  let assumedAbsent = 0;
  for (const pc of members.memberPcs) if (!soundingPcs.has(pc)) assumedAbsent++;
  score += WEIGHTS.parsimonyPenalty * assumedAbsent;

  // simplicityTiebreak: a tiny nudge toward the simpler (shorter) symbol.
  score += WEIGHTS.simplicityTiebreak * (1 / (symbol.length || 1));

  // Mint the abstract Chord identity for this interpretation. We hand
  // chordFromPitchClasses the SOUNDING pitch classes (what is actually heard),
  // rooted at the detected root, tagged with the detected symbol. The realised
  // multiset is preserved separately in the shared Voicing (R10).
  const soundingArr = Array.from(soundingPcs);
  const chord = chordFromPitchClasses(members.rootPc, soundingArr, symbol);

  return { chord, score, symbolLength: symbol.length };
}

/**
 * identify(positions, tuning, context) — reverse-identify a grip into ranked
 * candidates. Never throws on an empty/ambiguous grip; returns [] or a best effort.
 */
export const identify: Identify = (
  positions: readonly PlacedPosition[],
  tuning: Tuning,
  context: IdentifyContext,
): readonly RankedCandidate[] => {
  if (positions.length === 0) return [];

  // 1. Sounding pitches -> the ONE realised Voicing (multiset, argmin bass). Every
  //    candidate shares this exact voicing; only the interpretation varies (R10).
  const pitches = positions.map((p) =>
    midi((tuning.openStrings[p.string] as number) + p.fret),
  );
  const v: Voicing = voicing(pitches);
  const bassPc = toPitchClass(v.pitches[v.bassIndex]) as number;
  const soundingPcs = new Set<number>(v.pitches.map((m) => toPitchClass(m) as number));

  // 2. Candidate symbols via Tonal's bass-aware detect, ordered BASS-FIRST so slash
  //    chords report the right bass. Merge the plain + assumePerfectFifth variants so
  //    omitted-5th grips surface a candidate (the scorer then penalises the omission).
  const namesWithOctave = v.pitches.map((m) => Note.fromMidiSharps(m));
  const pcNames = namesWithOctave.map((n) => Note.pitchClass(n));
  const bassFirst: string[] = [pcNames[v.bassIndex]];
  for (let i = 0; i < pcNames.length; i++) if (i !== v.bassIndex) bassFirst.push(pcNames[i]);

  const detectedRaw = [
    ...TonalChord.detect(bassFirst),
    ...TonalChord.detect(bassFirst, { assumePerfectFifth: true }),
  ];

  // Dedup by the bare SYMBOL (the chord identity); the slash bass is redundant here
  // because the bass is already fixed by the shared voicing (bassIsRoot handles it).
  const seenSymbols = new Set<string>();
  const symbols: string[] = [];
  for (const d of detectedRaw) {
    const { symbol } = splitDetected(d);
    if (!seenSymbols.has(symbol)) {
      seenSymbols.add(symbol);
      symbols.push(symbol);
    }
  }
  if (symbols.length === 0) return [];

  // 3. Key context (optional): the major-key diatonic set used for the key bias.
  const keyTonic = context.key ? (context.key.tonic as number) : null;
  const diatonicKeyPcs = keyTonic !== null ? majorScalePcs(keyTonic) : null;

  // 4. Score every candidate.
  const scored: ScoredCandidate[] = [];
  for (const symbol of symbols) {
    const sc = scoreCandidate(symbol, soundingPcs, bassPc, diatonicKeyPcs, keyTonic);
    if (sc) scored.push(sc);
  }
  if (scored.length === 0) return [];

  // 5. Sort by score desc; break ties toward the simpler (shorter) symbol.
  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.symbolLength - b.symbolLength,
  );

  // 6. Surface policy: always the primary; alternates only within the score gap of
  //    the primary; hard cap at maxCandidates (no long tail of weak guesses).
  const primaryScore = scored[0].score;
  const surfaced = scored
    .filter(
      (sc, idx) =>
        idx < SURFACE_POLICY.primaryCount ||
        primaryScore - sc.score <= SURFACE_POLICY.alternateScoreGap,
    )
    .slice(0, SURFACE_POLICY.maxCandidates);

  // 7. Each candidate carries the SAME realised voicing (multiset preserved, R10).
  return surfaced.map((sc) => ({ chord: sc.chord, voicing: v, score: sc.score }));
};
