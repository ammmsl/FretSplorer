// /kb — typed interfaces mirroring kb/schema/card.schema.json + kb/schema/rule.schema.json.
//
// These are the RUNTIME-LOADED shapes the declarative KB (authored YAML) compiles to.
// They are intentionally faithful to the JSON schemas: the loader parses YAML, light-
// validates the discriminating fields, and hands back these typed records (ADR 0001
// "YAML-authored, schema-validated KB"; ADR 0002 "global rules joined by computed facts").
//
// Nothing here embeds matching/naming LOGIC — the KB is pure data (03). The engine
// (/naming/tier1-relational) computes the join keys and looks rules up; this module only
// supplies the parsed, typed data + provenance.

import type { GradedTension } from '../core';

// ─────────────────────────────────────────────────────────────────────────────
// Provenance (shared by cards + rules; card.schema.json / rule.schema.json $defs)
// ─────────────────────────────────────────────────────────────────────────────

/** How a stored claim was classified + may be spoken (ADR 0003). `computed` is a
 *  RUNTIME-only kind (tool results), never stored, so it is not in this union. */
export type ProvenanceKind = 'definitional' | 'theory' | 'derived' | 'editorial';

export interface Provenance {
  readonly kind: ProvenanceKind;
  readonly reasoning: string;
  readonly sources?: readonly string[];
  readonly verifiedBy?: 'computation' | 'reference' | 'both';
  readonly verifiedNote?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grammar card (card.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/** One per-string template entry in a movable shape. `open` = absolute fret 0 (a
 *  drone, does not slide); `fret` carries a semitone `offset` relative to the
 *  shape's anchor (barre) fret; `mute` = silenced string. */
export interface ShapeString {
  readonly play: 'open' | 'mute' | 'fret';
  /** Required when play === 'fret': semitone offset from the anchor fret. */
  readonly offset?: number;
}

export interface ShapeProduces {
  /** The INVARIANT the shape generates, e.g. "major triad on the upper five strings". */
  readonly quality: string;
}

export interface SlideExample {
  readonly anchorFret: number;
  readonly function: string;
}

export interface MovableShape {
  readonly id: string;
  readonly label: string;
  /** Per-string template, ordered string 1 -> string N (same indexing as the card). */
  readonly strings: readonly ShapeString[];
  readonly produces: ShapeProduces;
  readonly slideExamples?: readonly SlideExample[];
  readonly provenance: Provenance;
}

/** A declarative per-tuning KB record (card.schema.json). Stores authorial intent +
 *  raw pitch data only; everything computable (home chord, drone map, bass, shape
 *  function) is DERIVED by the engine, never stored. */
export interface GrammarCard {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly aliases?: readonly string[];
  /** Open-string target pitches as MIDI integers, string 1 -> string N. Index carries
   *  NO pitch-order meaning (re-entrant tunings allowed; bass is computed). */
  readonly strings: readonly number[];
  /** Pitch class (0=C..11=B) of the key center / drone root. */
  readonly tonic: number;
  readonly movableShapes?: readonly MovableShape[];
  readonly capoBehavior?: string;
  readonly idiomaticProgressions?: readonly string[];
  readonly references?: readonly string[];
  readonly provenance: Provenance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rules (rule.schema.json) — three rule sets share one shape via `set`
// ─────────────────────────────────────────────────────────────────────────────

export type RuleSet = 'tension-table' | 'relational-vocabulary' | 'function-tendencies';

export type RuleCategory =
  | 'tension'
  | 'frame'
  | 'drone-role'
  | 'tension-vs-pedal'
  | 'ambiguity'
  | 'function-tendency';

/** A global, tuning-agnostic rule entry. The engine computes the join `key` from a
 *  card's pitch model and matches by it (ADR 0002 — no stored card<->rule pointers).
 *  `key` is an open object: each rule set uses its own keys (e.g. {intervalClass:1},
 *  {droneDegree:9}, {frame:'home'}, {modifier:'suspension'}, {function:'IV'}). */
export interface Rule {
  readonly id: string;
  readonly category: RuleCategory;
  readonly key: Readonly<Record<string, unknown>>;
  readonly term?: string;
  readonly phrase?: string;
  readonly tension?: GradedTension;
  readonly rank?: number;
  readonly proximity?: boolean;
  readonly provenance: Provenance;
}

/** The naming-ambiguity ranking weights (kb/rules/ranking-weights.yaml). NOT a
 *  rule-set file — a flat tunable config of signed score adjustments (R5). */
export interface RankingWeights {
  readonly weights: Readonly<Record<string, number>>;
  readonly surfacePolicy: Readonly<Record<string, number>>;
  readonly provenance?: Provenance;
}

/** A loaded source bibliography entry (kb/sources/references.yaml). */
export interface SourceEntry {
  readonly id: string;
  readonly title?: string;
  readonly author?: string;
  readonly note?: string;
  readonly status?: string;
}

/** The full rule bundle the namer consumes. Each rule-set is a typed array; plus the
 *  ranking weights and (cheaply) a sources map keyed by id. */
export interface RuleBundle {
  readonly relationalVocabulary: readonly Rule[];
  readonly tensionTable: readonly Rule[];
  readonly functionTendencies: readonly Rule[];
  readonly rankingWeights: RankingWeights;
  readonly sources: ReadonlyMap<string, SourceEntry>;
}
