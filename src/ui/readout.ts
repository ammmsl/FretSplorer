// Readout view-model (/ui) — PURE assembly of the live "What you're holding" panel
// (docs/08 decision f; docs/09 UI#4; CONTEXT.md "Readout panel"). Given the focused
// neck's shape + tuning, it runs identify() and builds a tiered, render-ready view:
//
//   T1  relational sentence — the REAL relational headline (M2). When the focused tuning
//       has a grammar card (loadGrammarCard; today only "open-g"), nameTier1 runs and its
//       `sentence` is the HEADLINE; the relational detail surfaces drone roles + any
//       bite/unstable tension-vs-pedal. On a Tier-1 handoff (no home frame) we say so
//       honestly and let the T2 symbol lead. With NO card we show a small note rather
//       than fake a relational name (docs/08 f; CONTEXT.md "Readout panel"; spec §6).
//   T2  absolute symbol — the primary candidate's chord symbol + slash bass.
//   bass — the spelled LOWEST PITCH with octave (core spell + the octave digit), taken
//       from the voicing bass pitch (argmin), NOT the lowest string index (R10).
//   per-note — for each sounding note: its degree vs the primary chord ROOT (a relational
//       colour channel) AND, for OPEN strings, its drone tension vs the entity root (a
//       SEPARATE channel). Degree and drone never share a pixel-role (docs/01 §B).
//   candidates — when identify returns >1, the ranked ambiguity list (symbol + score).
//
// This module owns NO React; it is unit-tested against known shapes. It reuses the same
// /core + /naming primitives the neck overlay uses so the panel mirrors the board.

import type {
  Degree,
  GradedTension,
  KeyContext,
  Tuning,
  Voicing,
} from '../core';
import { degreeFromOffset, midi, spell, toPitchClass } from '../core';
import { identify } from '../projection';
import type { OpenStringDrone } from '../projection';
import { nameTier2 } from '../naming/tier2-tonal';
import { loadGrammarCard, loadRules } from '../kb';
import type { GrammarCard, RuleBundle } from '../kb';
import { nameTier1 } from '../naming/tier1-relational';
import type { Tier1Result } from '../naming/tier1-relational';
import { shapeToPlaced, isShapeEmpty, type Shape } from './shape';

// ─────────────────────────────────────────────────────────────────────────────
// KB load is MEMOISED — the card + rule bundle are loaded ONCE (per id for cards,
// once for the global rules), never per keystroke. buildReadout runs in the hot
// loop, so it must not re-parse YAML on every shape change.
// ─────────────────────────────────────────────────────────────────────────────

const CARD_CACHE = new Map<string, GrammarCard | null>();
let RULES_CACHE: RuleBundle | null = null;

/** Memoised grammar-card load by tuning id (null cached too, so misses are cheap). */
export function getGrammarCard(id: string): GrammarCard | null {
  if (CARD_CACHE.has(id)) return CARD_CACHE.get(id) ?? null;
  const card = loadGrammarCard(id);
  CARD_CACHE.set(id, card);
  return card;
}

/** Memoised global rule bundle (loaded once). */
export function getRules(): RuleBundle {
  if (RULES_CACHE === null) RULES_CACHE = loadRules();
  return RULES_CACHE;
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Derive a music21 key string from a tuning's tonic pitch class. music21 spells a
 * MAJOR key with an UPPERCASE tonic letter (e.g. "G", "C", "F#"); Tier-3's roman
 * analysis is anchored to the home tonic of the tuning (the tuning's drone root —
 * the relational home), so we read the tuning tonic as a major key string. PURE +
 * testable (the Tier-3 key-string derivation per the task brief).
 */
export function tonicToKeyString(tonicPc: number): string {
  return SHARP_NAMES[((tonicPc % 12) + 12) % 12];
}

/** Spell a MIDI pitch WITH its octave (e.g. 38 -> "D2") in a key context. The octave
 *  is scientific-pitch (MIDI 60 = C4), matching Tonal's Note octave convention so the
 *  spelled letter + our octave agree. spell() chooses the enharmonic; we append octave. */
export function spellWithOctave(pitch: number, ctx: KeyContext): string {
  const name = spell(midi(pitch), ctx);
  const octave = Math.floor(pitch / 12) - 1;
  return `${name}${octave}`;
}

/** One sounding note's readout row — degree channel + (open strings) drone channel. */
export interface ReadoutNote {
  /** String index (0 = high). */
  readonly string: number;
  /** Sounding MIDI pitch. */
  readonly pitch: number;
  /** Spelled note name with octave, in the key context. */
  readonly name: string;
  /** Degree relative to the PRIMARY chord root (null when no chord was identified). */
  readonly degree: Degree | null;
  /** True if this is the bass (lowest pitch) note. */
  readonly isBass: boolean;
  /** True if this string is ringing OPEN (carries a drone reading). */
  readonly isOpen: boolean;
  /** Drone tension vs the entity/context root, for OPEN strings only (else null). */
  readonly drone: GradedTension | null;
}

/** A ranked alternate interpretation (the ambiguity view). */
export interface ReadoutCandidate {
  readonly symbol: string;
  readonly score: number;
}

/**
 * The Tier-1 RELATIONAL headline view-model (the panel headline; the T2 symbol is the
 * subline). One of three render states:
 *   kind 'relational' — the tuning HAS a card and a relational frame was found: the
 *       headline `sentence` leads, and `detail` carries drone roles + bite/unstable text.
 *   kind 'handoff'    — the tuning has a card but NO frame fits (Tier-1 R4 handoff):
 *       no home frame, so the T2 symbol leads; `note` says so honestly.
 *   kind 'no-card'    — the tuning has no grammar card: we do NOT fake a relational name.
 */
export type RelationalView =
  | {
      readonly kind: 'relational';
      /** The relational HEADLINE sentence (nameTier1.sentence). */
      readonly sentence: string;
      /** Per-drone-role colour detail (open-string degree-vs-chord roles). */
      readonly detail: readonly string[];
      /** A bite/unstable tension-vs-pedal note, when present (the texture). */
      readonly tension: string | null;
    }
  | {
      readonly kind: 'handoff';
      /** Honest "no home frame" lead — the absolute (T2) reading takes over. */
      readonly note: string;
    }
  | {
      readonly kind: 'no-card';
      /** A small "relational naming needs a grammar card for this tuning" note. */
      readonly note: string;
    };

/**
 * Build the Tier-1 headline view-model from a nameTier1 result. PURE + unit-tested.
 * Splits the headline (sentence) from the colour detail (drone roles) and surfaces the
 * strongest bite/unstable tension-vs-pedal as a separate texture line.
 */
export function buildTier1View(t1: Tier1Result): RelationalView {
  if (t1.frame === null || t1.handoff.toTier2) {
    return {
      kind: 'handoff',
      note: 'no home frame — absolute reading:',
    };
  }
  const detail = [
    ...new Set(
      t1.droneRoles
        .filter((r) => r.droneDegree === 9 || r.droneDegree === 13 || r.droneDegree === 5)
        .map((r) => r.phrase),
    ),
  ];
  const bite = t1.tensionVsPedal.find(
    (tp) => tp.tension === 'bite' || tp.tension === 'unstable',
  );
  const tension = bite
    ? bite.tension === 'unstable'
      ? 'a tritone against the drone wants to resolve'
      : 'one fretted note bites a semitone against the drone — that is the texture, not a wrong note'
    : null;
  return { kind: 'relational', sentence: t1.sentence, detail, tension };
}

/** The fully-assembled readout view-model. `empty` true => render the idle state. */
export interface ReadoutViewModel {
  readonly empty: boolean;
  /** T1 relational HEADLINE view-model (M2). null only in the idle state. */
  readonly relational: RelationalView | null;
  /** T2 absolute symbol, e.g. "GM" or "G". null when nothing was identified. */
  readonly symbol: string | null;
  /** Slash-bass note name for the T2 symbol, e.g. "D" (omitted in root position). */
  readonly slashBass: string | null;
  /** Spelled bass note WITH octave, e.g. "D2" (the lowest pitch, R10). */
  readonly bass: string | null;
  /** Per sounding note, bass-channel + degree + drone. Ordered low pitch -> high. */
  readonly notes: readonly ReadoutNote[];
  /** Ranked alternates when identify returned more than one candidate. */
  readonly candidates: readonly ReadoutCandidate[];
  /** The primary candidate's full pitch MULTISET (for lazy Tier-3 anatomy). null when
   *  nothing was identified. NOT consumed in the hot loop — only on a Tier-3 expand. */
  readonly primaryVoicing: Voicing | null;
  /** music21 key string for Tier-3 (from the tuning tonic), e.g. "G". */
  readonly keyString: string;
}

const IDLE: ReadoutViewModel = {
  empty: true,
  relational: null,
  symbol: null,
  slashBass: null,
  bass: null,
  notes: [],
  candidates: [],
  primaryVoicing: null,
  keyString: 'C',
};

/**
 * Build the live readout view-model for a shape on the focused neck (the hot loop).
 *
 * @param shape   the focused neck's shape.
 * @param tuning the focused neck's tuning (also supplies the key context tonic).
 * @param drones optional droneMap() readings for the active scale/chord overlay; when
 *               present, OPEN strings carry their context-root drone tension. The
 *               drone channel is independent of identify() — it reflects the SELECTED
 *               harmonic context, not the held shape (docs/01 §B two channels).
 */
export function buildReadout(
  shape: Shape,
  tuning: Tuning,
  drones?: readonly OpenStringDrone[],
): ReadoutViewModel {
  if (isShapeEmpty(shape)) return IDLE;

  const placed = shapeToPlaced(shape);
  if (placed.length === 0) return IDLE;

  const ctx: KeyContext = { tonic: tuning.tonic };
  const ranked = identify(placed, tuning, { key: ctx });
  if (ranked.length === 0) return IDLE;

  const primary = ranked[0];
  const v = primary.voicing;
  const rootPc = primary.chord.root as number;

  // T2 symbol + slash bass via the same Tier-2 namer the absolute label uses.
  const t2 = nameTier2(v, { key: ctx });
  const symbol = t2.primary
    ? t2.candidates[0].symbol
    : (primary.chord.symbol ?? null);
  const slashBass = t2.primary ? (t2.candidates[0].slashBass ?? null) : null;

  // Bass = the spelled LOWEST PITCH with octave (argmin, not lowest string) — R10.
  const bassPitch = v.pitches[v.bassIndex] as number;
  const bass = spellWithOctave(bassPitch, ctx);

  // Map string index -> open-string drone reading (for the open-string drone channel).
  const droneByString = new Map<number, GradedTension>();
  if (drones) for (const d of drones) droneByString.set(d.string, d.tension);

  // One row per sounding note, ordered low pitch -> high (mirrors the readout reading
  // order: bass first). We derive the (string, pitch, open?) from the placed list, then
  // sort by pitch so the bass leads.
  const rows: ReadoutNote[] = placed.map((p) => {
    const pitch = (tuning.openStrings[p.string] as number) + p.fret;
    const pc = toPitchClass(pitch) as number;
    const isOpen = p.fret === 0;
    return {
      string: p.string,
      pitch,
      name: spellWithOctave(pitch, ctx),
      degree: degreeFromOffset(((pc - rootPc) % 12 + 12) % 12),
      isBass: false, // set after the sort, against the true bass pitch
      isOpen,
      drone: isOpen ? (droneByString.get(p.string) ?? null) : null,
    };
  });
  rows.sort((a, b) => a.pitch - b.pitch);
  const notes: ReadoutNote[] = rows.map((r, i) => ({ ...r, isBass: i === 0 }));

  // Ambiguity view: surface ranked alternates only when identify gave more than one.
  const candidates: ReadoutCandidate[] =
    ranked.length > 1
      ? ranked.map((c) => ({
          symbol: c.chord.symbol ?? spell(c.chord.root, ctx),
          score: c.score,
        }))
      : [];

  // ── T1 RELATIONAL HEADLINE ── only when the focused tuning HAS a grammar card
  // (today "open-g"). nameTier1 runs the relational reading vs the home drones; we split
  // its sentence (headline) from the colour detail. With no card we do NOT fake a name —
  // the panel shows a small note and lets the T2 symbol lead. Card + rules are MEMOISED.
  const card = getGrammarCard(tuning.id);
  const relational: RelationalView = card
    ? buildTier1View(nameTier1(placed, tuning, card, getRules()))
    : {
        kind: 'no-card',
        note: 'relational naming needs a grammar card for this tuning',
      };

  return {
    empty: false,
    relational,
    symbol,
    slashBass,
    bass,
    notes,
    candidates,
    primaryVoicing: v,
    keyString: tonicToKeyString(tuning.tonic as number),
  };
}
