// Readout view-model (/ui) — PURE assembly of the live "What you're holding" panel
// (docs/08 decision f; docs/09 UI#4; CONTEXT.md "Readout panel"). Given the focused
// neck's grip + tuning, it runs identify() and builds a tiered, render-ready view:
//
//   T1  relational sentence — a PLACEHOLDER slot ("relational naming arrives in M2");
//       we do NOT fake a relational name (that is Tier-1 work, M2).
//   T2  absolute symbol — the primary candidate's chord symbol + slash bass.
//   bass — the spelled LOWEST PITCH with octave (core spell + the octave digit), taken
//       from the voicing bass pitch (argmin), NOT the lowest string index (R10).
//   per-note — for each sounding note: its degree vs the primary chord ROOT (a relational
//       colour channel) AND, for OPEN strings, its drone tension vs the entity root (a
//       SEPARATE channel). Degree and drone never share a pixel-role (docs/01 §B).
//   candidates — when identify returns >1, the ranked ambiguity list (symbol + score).
//
// This module owns NO React; it is unit-tested against known grips. It reuses the same
// /core + /naming primitives the neck overlay uses so the panel mirrors the board.

import type {
  Degree,
  GradedTension,
  KeyContext,
  Tuning,
} from '../core';
import { degreeFromOffset, midi, spell, toPitchClass } from '../core';
import { identify } from '../projection';
import type { OpenStringDrone } from '../projection';
import { nameTier2 } from '../naming/tier2-tonal';
import { gripToPlaced, isGripEmpty, type Grip } from './grip';

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

/** The fully-assembled readout view-model. `empty` true => render the idle state. */
export interface ReadoutViewModel {
  readonly empty: boolean;
  /** T1 relational sentence — null for now (M2). The panel renders a placeholder. */
  readonly relational: null;
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
}

const IDLE: ReadoutViewModel = {
  empty: true,
  relational: null,
  symbol: null,
  slashBass: null,
  bass: null,
  notes: [],
  candidates: [],
};

/**
 * Build the live readout view-model for a grip on the focused neck (the hot loop).
 *
 * @param grip   the focused neck's grip.
 * @param tuning the focused neck's tuning (also supplies the key context tonic).
 * @param drones optional droneMap() readings for the active scale/chord overlay; when
 *               present, OPEN strings carry their context-root drone tension. The
 *               drone channel is independent of identify() — it reflects the SELECTED
 *               harmonic context, not the held grip (docs/01 §B two channels).
 */
export function buildReadout(
  grip: Grip,
  tuning: Tuning,
  drones?: readonly OpenStringDrone[],
): ReadoutViewModel {
  if (isGripEmpty(grip)) return IDLE;

  const placed = gripToPlaced(grip);
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

  return {
    empty: false,
    relational: null,
    symbol,
    slashBass,
    bass,
    notes,
    candidates,
  };
}
