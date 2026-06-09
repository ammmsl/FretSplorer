// /mcp — INTENT TOOLS (docs/04 verbs). Each is a PURE function returning a uniform
// ToolResult<...> (contract.ts; ADR 0003) that composes the existing engines. The tools
// do NOT recompute fretboard math — they call identify / nameTier1 / nameTier2 /
// findVoicings / droneMap / adviseSetup and TRACE every checkable claim back to a
// computed value or an existing KB id. The ONE editorial seam is feelingToOptions, whose
// vibe claim is editorial + hedged (traced to the affective vibe id), while the option
// voicings it yields are fully computed/grounded.

import type {
  Chord,
  IdentifyContext,
  Tuning,
} from '../core';
import {
  chord as buildChord,
  chordFromPitchClasses,
  toPitchClass,
  voicing as buildVoicing,
} from '../core';
import { droneMap, identify } from '../projection';
import type { OpenStringDrone } from '../projection';
import { nameTier1, shouldHandoffToTier2 } from '../naming/tier1-relational';
import type { Tier1Result } from '../naming/tier1-relational';
import { nameTier2 } from '../naming/tier2-tonal';
import { findVoicings } from '../voicings';
import type { RankedVoicing } from '../voicings';
import { adviseSetup } from '../tension';
import type { SetupAdvice } from '../tension';
import {
  loadAffective,
  loadGrammarCard,
  loadRules,
} from '../kb';
import type { AffectiveVibe } from '../kb';
import type { Shape } from '../ui';

import type { Claim, ToolResult } from './contract';
import { computedClaim, editorialClaim, kbClaim } from './contract';
import {
  midiName,
  midiNameOctave,
  pcName,
  placedFromShape,
  soundingPitches,
} from './shared';

// ─────────────────────────────────────────────────────────────────────────────
// mcpIdentify — identify + Tier-1 relational headline + bass + degree-vs-drone
// ─────────────────────────────────────────────────────────────────────────────

export interface IdentifyTruth {
  /** Ranked theory candidates (identify), multiset preserved (R10). */
  readonly candidates: ReturnType<typeof identify>;
  /** The Tier-1 relational reading of the shape (frame, drones, tension). */
  readonly tier1: Tier1Result;
  /** Spelled bass note WITH octave (the lowest pitch; R10), or null if shape empty. */
  readonly bassNote: string | null;
  /** Per-open-string graded drone tension vs the best candidate's chord root. */
  readonly drones: readonly OpenStringDrone[];
  /** True when no relational frame fit and absolute (T2) naming should take over. */
  readonly handoffToTier2: boolean;
}

/**
 * mcpIdentify(shape, tuning, ctx) — the headline identify tool. Composes identify()
 * (ranked candidates, bass = argmin pitch), nameTier1() (the relational frame + drone
 * roles + tension-vs-pedal, each already trace-carrying), and droneMap() (graded
 * drone tension). Every checkable claim is traced: the bass is "computed"; the frame
 * carries its relational-vocabulary rule id; each drone role carries its drone-role
 * rule id; each tension reading carries its tension-table rule id.
 */
export function mcpIdentify(
  shape: Shape,
  tuning: Tuning,
  ctx: IdentifyContext = {},
): ToolResult<IdentifyTruth> {
  const positions = placedFromShape(shape);
  const candidates = identify(positions, tuning, ctx);
  const card = loadGrammarCard(tuning.id);
  const rules = loadRules();

  const reasoningChain: string[] = [];
  const claims: Claim[] = [];

  reasoningChain.push(
    `Read the shape as ${positions.length} sounding position(s) on ${tuning.id}.`,
  );

  // Bass = the lowest PITCH of the best candidate's preserved voicing (R10).
  let bassNote: string | null = null;
  if (candidates.length > 0) {
    const best = candidates[0];
    const bassMidi = best.voicing.pitches[best.voicing.bassIndex];
    bassNote = midiNameOctave(bassMidi, tuning);
    reasoningChain.push(
      `identify() ranked ${candidates.length} candidate(s); the bass is the lowest pitch (argmin), ${bassNote}.`,
    );
    claims.push(computedClaim(`The bass note is ${bassNote}.`));
    if (best.chord.symbol) {
      claims.push(
        computedClaim(`The best-fit chord is ${best.chord.symbol}.`),
      );
    }
  } else {
    reasoningChain.push('The shape sounds nothing — no candidates.');
  }

  // Tier-1 relational reading. Its traces are already per-claim grounded; lift them.
  let tier1: Tier1Result;
  let drones: readonly OpenStringDrone[] = [];
  let handoffToTier2 = true;
  if (card != null && positions.length > 0) {
    tier1 = nameTier1(positions, tuning, card, rules);
    handoffToTier2 = shouldHandoffToTier2(tier1);
    reasoningChain.push(
      `nameTier1() read the shape relative to the ${tuning.id} drones: ${tier1.sentence}`,
    );

    // The frame headline -> a KB-traced claim (its relational-vocabulary rule id).
    if (tier1.frame != null) {
      claims.push(kbClaim(tier1.frame.phrase, tier1.frame.ruleId));
    }
    // Drone roles -> each traced to its drone-role rule id.
    for (const role of tier1.droneRoles) {
      claims.push(kbClaim(role.phrase, role.ruleId));
    }
    // Tension-vs-pedal readings -> each traced to its tension-table rule id.
    for (const t of tier1.tensionVsPedal) {
      claims.push(
        kbClaim(
          `string ${t.activeString} against drone string ${t.droneString} is ${t.tension}`,
          t.ruleId,
        ),
      );
    }

    // Graded drone tension vs the resolved chord root (or tonic if no frame root).
    const rootPc =
      tier1.frame?.chordRoot ?? candidates[0]?.chord.root ?? tuning.tonic;
    const anchor: Chord = chordFromPitchClasses(rootPc as number, [
      rootPc as number,
    ]);
    drones = droneMap(anchor, tuning);
    for (const d of drones) {
      claims.push(
        computedClaim(
          `open string ${d.string} (${pcName(d.pitchClass, tuning)}) reads as ${d.tension} against the root`,
        ),
      );
    }
  } else {
    // No card (non-open-g tuning) or empty shape: a minimal, still-grounded result.
    tier1 = {
      decomposition: { drones: [], activeVoices: [] },
      frame: null,
      droneRoles: [],
      tensionVsPedal: [],
      sentence:
        card == null
          ? `No grammar card for ${tuning.id}; relational framing unavailable.`
          : 'Empty shape.',
      traces: [],
      handoff: {
        toTier2: true,
        reason: card == null ? 'no-card' : 'empty-shape',
      },
    };
  }

  const headline =
    tier1.frame?.phrase ??
    (candidates[0]?.chord.symbol
      ? `This reads as ${candidates[0].chord.symbol}.`
      : 'No identification available.');
  const explanation =
    bassNote != null
      ? `${headline} The lowest sounding pitch is ${bassNote}.`
      : headline;

  return {
    truth: { candidates, tier1, bassNote, drones, handoffToTier2 },
    explanation,
    reasoningChain,
    claims,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// functionOf — Tier-1 frame + diatonic function + pull/resolution tendency
// ─────────────────────────────────────────────────────────────────────────────

export interface FunctionTruth {
  readonly frameCategory: string | null;
  readonly romanNumeral: string | null;
  readonly chordName: string | null;
  readonly tier1: Tier1Result;
  /** Function-tendency phrases matched (pull / resolution), each with its rule id. */
  readonly tendencies: readonly { phrase: string; ruleId: string }[];
}

/**
 * functionOf(shape, tuning) — the relational FRAME plus its diatonic function and any
 * pull/resolution tendency. Composes nameTier1() for the frame + roman numeral, then
 * joins the resolved roman numeral to the function-tendencies rule set (loadRules) by
 * its `key.function`. Each tendency claim is traced to its function-tendency rule id.
 */
export function functionOf(shape: Shape, tuning: Tuning): ToolResult<FunctionTruth> {
  const positions = placedFromShape(shape);
  const card = loadGrammarCard(tuning.id);
  const rules = loadRules();
  const claims: Claim[] = [];
  const reasoningChain: string[] = [];

  if (card == null || positions.length === 0) {
    const tier1: Tier1Result = {
      decomposition: { drones: [], activeVoices: [] },
      frame: null,
      droneRoles: [],
      tensionVsPedal: [],
      sentence:
        card == null
          ? `No grammar card for ${tuning.id}.`
          : 'Empty shape.',
      traces: [],
      handoff: { toTier2: true, reason: card == null ? 'no-card' : 'empty-shape' },
    };
    return {
      truth: {
        frameCategory: null,
        romanNumeral: null,
        chordName: null,
        tier1,
        tendencies: [],
      },
      explanation: tier1.sentence,
      reasoningChain: [tier1.sentence],
      claims,
    };
  }

  const tier1 = nameTier1(positions, tuning, card, rules);
  reasoningChain.push(`nameTier1() framed the shape: ${tier1.sentence}`);

  const rn = tier1.frame?.romanNumeral ?? null;
  if (tier1.frame != null) {
    claims.push(kbClaim(tier1.frame.phrase, tier1.frame.ruleId));
    reasoningChain.push(
      `Frame = ${tier1.frame.category}${rn ? ` (${rn})` : ''}.`,
    );
  }

  // Join the roman numeral to the function-tendency rules by key.function.
  const tendencies: { phrase: string; ruleId: string }[] = [];
  if (rn != null) {
    for (const r of rules.functionTendencies) {
      const fn = (r.key as { function?: string }).function;
      if (fn === rn && r.phrase) {
        tendencies.push({ phrase: r.phrase, ruleId: r.id });
        claims.push(kbClaim(r.phrase, r.id));
        reasoningChain.push(`Function tendency for ${rn}: ${r.phrase}`);
      }
    }
  }

  const explanation =
    tier1.frame != null
      ? tendencies.length > 0
        ? `${tier1.frame.phrase} ${tendencies.map((t) => t.phrase).join(' ')}`
        : tier1.frame.phrase
      : tier1.sentence;

  return {
    truth: {
      frameCategory: tier1.frame?.category ?? null,
      romanNumeral: rn,
      chordName: tier1.frame?.chordName ?? null,
      tier1,
      tendencies,
    },
    explanation,
    reasoningChain,
    claims,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// neighbors — adjacency: small voice-leading moves (compute a few)
// ─────────────────────────────────────────────────────────────────────────────

export interface NeighborMove {
  /** The string moved. */
  readonly string: number;
  /** From fret -> to fret (semitone step on that string). */
  readonly fromFret: number;
  readonly toFret: number;
  /** Spelled note before -> after. */
  readonly fromNote: string;
  readonly toNote: string;
  /** Resulting chord symbol (Tier-2) for the moved shape, or null. */
  readonly resultSymbol: string | null;
}

export interface NeighborsTruth {
  readonly moves: readonly NeighborMove[];
}

/**
 * neighbors(shape, tuning) — enumerate a few single-string ±1 / ±2 semitone moves
 * (the smallest voice-leading steps) and name the resulting shape via nameTier2(). Each
 * move's result symbol is COMPUTED (traced "computed"). Only moves that stay on the neck
 * (fret >= 0) are kept; we cap the list so the conversational surface stays small.
 */
export function neighbors(shape: Shape, tuning: Tuning): ToolResult<NeighborsTruth> {
  const positions = placedFromShape(shape);
  const reasoningChain: string[] = [];
  const claims: Claim[] = [];

  reasoningChain.push(
    `Enumerating single-string ±1/±2 semitone moves from ${positions.length} sounding position(s).`,
  );

  const moves: NeighborMove[] = [];
  const MAX_MOVES = 6;
  const steps = [-2, -1, 1, 2];

  for (const p of positions) {
    for (const step of steps) {
      const toFret = p.fret + step;
      if (toFret < 0) continue; // off the neck below the nut
      // Build the moved voicing's pitches and name it.
      const movedPitches = positions.map((q) =>
        q.string === p.string
          ? (tuning.openStrings[q.string] as number) + toFret
          : (tuning.openStrings[q.string] as number) + q.fret,
      );
      const v = buildVoicing(movedPitches);
      const t2 = nameTier2(v);
      moves.push({
        string: p.string,
        fromFret: p.fret,
        toFret,
        fromNote: midiName(
          (tuning.openStrings[p.string] as number) + p.fret,
          tuning,
        ),
        toNote: midiName(
          (tuning.openStrings[p.string] as number) + toFret,
          tuning,
        ),
        resultSymbol: t2.primary,
      });
      if (moves.length >= MAX_MOVES) break;
    }
    if (moves.length >= MAX_MOVES) break;
  }

  for (const m of moves) {
    claims.push(
      computedClaim(
        `moving string ${m.string} from ${m.fromNote} to ${m.toNote} gives ${m.resultSymbol ?? 'an unnamed sonority'}`,
      ),
    );
  }

  const explanation =
    moves.length > 0
      ? `Small moves from here: ${moves
          .map((m) => `${m.fromNote}->${m.toNote} (${m.resultSymbol ?? '?'})`)
          .join(', ')}.`
      : 'No single-step neighbours available (empty shape).';

  return { truth: { moves }, explanation, reasoningChain, claims };
}

// ─────────────────────────────────────────────────────────────────────────────
// findVoicingsTool — ranked fingerable voicings + playability
// ─────────────────────────────────────────────────────────────────────────────

export interface FindVoicingsTruth {
  readonly chordSymbol: string;
  readonly voicings: readonly RankedVoicing[];
}

/**
 * findVoicingsTool(chordSymbol, tuning) — ranked fingerable voicings of a chord symbol
 * on a tuning, with playability flags. Composes core chord() + /voicings findVoicings.
 * Each returned voicing's playability is COMPUTED (traced "computed").
 */
export function findVoicingsTool(
  chordSymbol: string,
  tuning: Tuning,
): ToolResult<FindVoicingsTruth> {
  const reasoningChain: string[] = [];
  const claims: Claim[] = [];

  let chord: Chord;
  try {
    chord = buildChord(chordSymbol);
  } catch (e) {
    return {
      truth: { chordSymbol, voicings: [] },
      explanation: `Could not parse the chord symbol "${chordSymbol}".`,
      reasoningChain: [String(e instanceof Error ? e.message : e)],
      claims,
    };
  }

  reasoningChain.push(
    `Parsed "${chordSymbol}" to a pitch-class set; searching fingerable shapes on ${tuning.id}.`,
  );
  const voicings = findVoicings(chord, tuning);
  reasoningChain.push(`findVoicings() returned ${voicings.length} ranked shape(s).`);

  for (const v of voicings) {
    claims.push(
      computedClaim(
        `a voicing at frets [${v.frets
          .map((f) => (f === null ? 'x' : f))
          .join(' ')}] is ${v.playability.flag} to play`,
      ),
    );
  }

  const explanation =
    voicings.length > 0
      ? `Found ${voicings.length} fingerable ${chordSymbol} voicing(s); the top one is ${voicings[0].playability.flag} to play.`
      : `No fingerable ${chordSymbol} voicings found on ${tuning.id}.`;

  return {
    truth: { chordSymbol, voicings },
    explanation,
    reasoningChain,
    claims,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// translate — morph: same pitches -> new (string, fret); flag out-of-range notes
// ─────────────────────────────────────────────────────────────────────────────

export interface TranslatedNote {
  /** The invariant sounding pitch (preserved across the morph). */
  readonly pitch: number;
  readonly note: string;
  /** The string in the target tuning the pitch lands on, or null if unreachable. */
  readonly toString: number | null;
  /** The fret on that string, or null if unreachable. */
  readonly toFret: number | null;
  /** True when the pitch falls BELOW the target open string (off the neck below nut). */
  readonly belowOpenString: boolean;
  /** True when the pitch is above the highest playable fret on every string. */
  readonly offNeck: boolean;
}

export interface TranslateTruth {
  readonly notes: readonly TranslatedNote[];
  /** Notes that could not be placed (below open string or off neck). */
  readonly unreachable: readonly TranslatedNote[];
}

/**
 * translate(shape, fromTuning, toTuning) — morph a shape's SOUNDING PITCHES (the invariant)
 * onto the target tuning, finding the lowest fret on any string that reproduces each
 * pitch (docs/04 flow 3). Pitches that fall BELOW every target open string, or above the
 * neck, are flagged unreachable. Every placement / flag is COMPUTED.
 */
export function translate(
  shape: Shape,
  fromTuning: Tuning,
  toTuning: Tuning,
  maxFret = 22,
): ToolResult<TranslateTruth> {
  const pitches = soundingPitches(shape, fromTuning);
  const reasoningChain: string[] = [];
  const claims: Claim[] = [];

  reasoningChain.push(
    `The invariant is the sounding pitch set [${pitches.join(', ')}]; re-placing it on ${toTuning.id}.`,
  );

  const notes: TranslatedNote[] = pitches.map((pitch) => {
    // Prefer the lowest-fret placement across all target strings.
    let best: { string: number; fret: number } | null = null;
    let anyAtOrBelowNeck = false;
    for (let s = 0; s < toTuning.openStrings.length; s++) {
      const open = toTuning.openStrings[s] as number;
      const fret = pitch - open;
      if (fret < 0) continue; // below this open string
      anyAtOrBelowNeck = true;
      if (fret <= maxFret && (best === null || fret < best.fret)) {
        best = { string: s, fret };
      }
    }
    const belowOpenString = !anyAtOrBelowNeck;
    const offNeck = !belowOpenString && best === null;
    return {
      pitch,
      note: midiName(pitch, toTuning),
      toString: best?.string ?? null,
      toFret: best?.fret ?? null,
      belowOpenString,
      offNeck,
    };
  });

  const unreachable = notes.filter((n) => n.belowOpenString || n.offNeck);

  for (const n of notes) {
    if (n.belowOpenString) {
      claims.push(
        computedClaim(
          `${n.note} (pitch ${n.pitch}) falls below every open string on ${toTuning.id} — unreachable`,
        ),
      );
      reasoningChain.push(`${n.note} is below the lowest open string; flagged.`);
    } else if (n.offNeck) {
      claims.push(
        computedClaim(`${n.note} (pitch ${n.pitch}) is above the playable neck`),
      );
    } else {
      claims.push(
        computedClaim(
          `${n.note} lands on string ${n.toString} fret ${n.toFret}`,
        ),
      );
    }
  }

  const explanation =
    unreachable.length > 0
      ? `Moved to ${toTuning.id}; ${unreachable.length} note(s) fall off the neck: ${unreachable
          .map((n) => n.note)
          .join(', ')}.`
      : `Moved to ${toTuning.id}; every note re-places on the neck.`;

  return {
    truth: { notes, unreachable },
    explanation,
    reasoningChain,
    claims,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// feelingToOptions — THE affective path (editorial vibe + grounded options)
// ─────────────────────────────────────────────────────────────────────────────

export interface FeelingOption {
  /** A concrete chord symbol the vibe ops produced. */
  readonly symbol: string;
  /** Top fingerable voicing for that symbol on the tuning (or null if none). */
  readonly voicing: RankedVoicing | null;
}

export interface FeelingTruth {
  readonly vibeId: string;
  readonly vibeLabel: string;
  /** The ops the vibe maps to (the editorial mechanism). */
  readonly operations: AffectiveVibe['operations'];
  /** Concrete, computed option voicings the ops yield. */
  readonly options: readonly FeelingOption[];
}

/** Folded degree (mod 12) for an extension number, e.g. 9->2, 11->5, 13->9, 6->9. */
function degreeToSemitone(degree: number): number {
  const map: Record<number, number> = {
    2: 2,
    3: 4,
    4: 5,
    5: 7,
    6: 9,
    7: 11,
    9: 2,
    11: 5,
    13: 9,
  };
  return map[degree] ?? degree % 12;
}

/**
 * feelingToOptions(shape, tuning, vibe) — THE honesty-seam tool (docs/04 flow 2; ADR 0003).
 *
 * 1. loadAffective() the vibe -> its EDITORIAL op list. The vibe rationale is taste
 *    (provenance.kind 'editorial'), so its claim is editorial:true AND hedged ("usually"),
 *    traced to the affective VIBE ID (a valid KB id).
 * 2. Apply the ops to the shape's current chord to produce concrete option chords, then
 *    findVoicings() each -> COMPUTED option voicings. Those claims are grounded ("computed").
 *
 * So ONE ToolResult mixes a hedged editorial vibe-claim with grounded computed options.
 */
export function feelingToOptions(
  shape: Shape,
  tuning: Tuning,
  vibe: string,
): ToolResult<FeelingTruth> {
  const dict = loadAffective();
  const entry =
    dict.vibes.find((v) => v.id === vibe) ??
    dict.vibes.find((v) => v.aliases?.includes(vibe));

  const reasoningChain: string[] = [];
  const claims: Claim[] = [];

  if (entry == null) {
    return {
      truth: { vibeId: vibe, vibeLabel: vibe, operations: [], options: [] },
      explanation: `No affective mapping for "${vibe}".`,
      reasoningChain: [`"${vibe}" is not in the affective dictionary.`],
      claims,
    };
  }

  reasoningChain.push(
    `"${entry.label}" maps (editorially) to ops: ${entry.operations
      .map((o) => o.op)
      .join(', ')}.`,
  );

  // The EDITORIAL vibe claim — hedged + traced to the vibe id (the ONE editorial seam).
  claims.push(
    editorialClaim(
      `"${entry.label}" usually means ${entry.operations
        .map((o) => o.op)
        .join(', ')} — taste, not theory.`,
      entry.id,
    ),
  );

  // Resolve the shape's current chord identity to morph from (best identify candidate),
  // else fall back to the tuning's home/tonic triad.
  const positions = placedFromShape(shape);
  const ctx: IdentifyContext = {};
  const cands = positions.length > 0 ? identify(positions, tuning, ctx) : [];
  const baseChord: Chord =
    cands[0]?.chord ??
    chordFromPitchClasses(tuning.tonic as number, [
      tuning.tonic as number,
      (((tuning.tonic as number) + 4) % 12),
      (((tuning.tonic as number) + 7) % 12),
    ]);

  // Apply the ops to the base chord's pitch-class set -> a derived option chord.
  const rootPc = baseChord.root as number;
  const pcs = new Set<number>(baseChord.pitchClasses.map((p) => p as number));
  for (const op of entry.operations) {
    if (op.op === 'add-tone' || op.op === 'extend') {
      if (typeof op.degree === 'number') {
        pcs.add(toPitchClass(rootPc + degreeToSemitone(op.degree)) as number);
      }
    } else if (op.op === 'omit' && typeof op.degree === 'number') {
      pcs.delete(toPitchClass(rootPc + degreeToSemitone(op.degree)) as number);
    } else if (op.op === 'suspend') {
      // replace the 3rd with the named (2 or 4) degree
      pcs.delete(toPitchClass(rootPc + 3) as number);
      pcs.delete(toPitchClass(rootPc + 4) as number);
      const d = typeof op.value === 'number' ? op.value : Number(op.value) || 4;
      pcs.add(toPitchClass(rootPc + degreeToSemitone(d)) as number);
    }
    // let-ring / widen-spacing / add-low-drone / mode-shift are voicing/register
    // textures handled by the voicing search ranking + drones, not pc-set edits here.
  }

  const optionChord = chordFromPitchClasses(rootPc, Array.from(pcs));
  reasoningChain.push(
    `Applied ops to the base chord (root ${pcName(rootPc, tuning)}) -> a derived option pc-set.`,
  );

  // COMPUTED options: find fingerable voicings for the derived chord.
  const ranked = findVoicings(optionChord, tuning, { limit: 3 });
  const options: FeelingOption[] = ranked.map((rv) => ({
    symbol: optionChord.symbol ?? `${pcName(rootPc, tuning)} (derived)`,
    voicing: rv,
  }));

  // If the derived chord yields nothing fingerable, still offer the base chord's voicings.
  if (options.length === 0 && baseChord.symbol) {
    for (const rv of findVoicings(baseChord, tuning, { limit: 2 })) {
      options.push({ symbol: baseChord.symbol, voicing: rv });
    }
  }

  for (const o of options) {
    if (o.voicing) {
      claims.push(
        computedClaim(
          `option shape [${o.voicing.frets
            .map((f) => (f === null ? 'x' : f))
            .join(' ')}] is ${o.voicing.playability.flag} to play`,
        ),
      );
    }
  }
  reasoningChain.push(`Found ${options.length} computed option voicing(s).`);

  const explanation = `${entry.label}: usually ${entry.operations
    .map((o) => o.op)
    .join(' + ')} (taste). Concretely, that gives ${options.length} fingerable option(s) on ${tuning.id}.`;

  return {
    truth: {
      vibeId: entry.id,
      vibeLabel: entry.label,
      operations: entry.operations,
      options,
    },
    explanation,
    reasoningChain,
    claims,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// adviseSetupTool — wrap /tension adviseSetup (orthogonal physical tension)
// ─────────────────────────────────────────────────────────────────────────────

export interface SetupTruth {
  readonly advice: SetupAdvice;
}

/**
 * adviseSetupTool(tuning, opts?) — wrap /tension adviseSetup. Orthogonal to harmony: it
 * advises per-string PHYSICAL tension (lb/N/kgf), feel bands, break risk, gauge picks.
 * The numeric tensions are COMPUTED; the feel-band judgement is editorial inside /tension
 * itself (already provenance-flagged there). We surface the headline flags as computed
 * claims and the per-string warnings verbatim.
 */
export function adviseSetupTool(
  tuning: Tuning,
  opts?: Parameters<typeof adviseSetup>[1],
): ToolResult<SetupTruth> {
  const advice = adviseSetup({ strings: tuning.openStrings.map((m) => m as number) }, opts);
  const reasoningChain: string[] = [
    `Computed per-string tension for ${tuning.id} from the validated tension formula.`,
  ];
  const claims: Claim[] = [];

  for (const s of advice.strings) {
    claims.push(
      computedClaim(
        `string ${s.stringIndex} (${s.noteName}) is at ${s.tension.lb} lb — ${s.flag}`,
      ),
    );
  }

  const explanation = `Total tension ${advice.totalTensionLb.toFixed(1)} lb across ${advice.strings.length} strings on ${tuning.id}.`;

  return { truth: { advice }, explanation, reasoningChain, claims };
}
