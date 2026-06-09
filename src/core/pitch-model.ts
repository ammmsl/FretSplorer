/**
 * /core — Invariant pitch-model CONTRACT (d_pitch)
 * ================================================
 *
 * This file is a TYPE-ONLY contract sketch. It pins the *shape* the spine
 * (`project()` / `identify()` in /projection, the Tier-1 namer in /naming) will
 * build against. It deliberately contains NO runtime logic: no function bodies,
 * no `const` tables, no enums — only `type`/`interface` declarations and ambient
 * `declare`s, all of which erase at compile time (the repo runs
 * `erasableSyntaxOnly` + `verbatimModuleSyntax`; see tsconfig.app.json).
 *
 * The decision behind these shapes is recorded in
 * docs/adr/0007-invariant-pitch-model-representation.md.
 *
 * Ground rules this contract encodes (with sources):
 *  - Pitch-space is the invariant; a tuning is a projection onto the fretboard
 *    (docs/00-overview.md "core reframe"; docs/03-architecture.md source-of-truth rule).
 *  - MIDI integers are the universal coordinate; pitch classes (mod 12) are for
 *    set operations (docs/01-feature-set.md §A; docs/03-architecture.md).
 *  - Spelled names (C# vs Db) are DERIVED in context, never stored
 *    (docs/01-feature-set.md §A; CONTEXT.md "Degree", "Label mode").
 *  - Hard chord-vs-voicing distinction: a chord is an abstract pc-set; a voicing
 *    is an octave-placed pitch MULTISET that preserves octaves and doublings and
 *    is NOT collapsed (CONTEXT.md "Chord"/"Voicing"; docs/03-architecture.md
 *    "identify must preserve the full pitch multiset"; docs/06 R10).
 *  - 12-TET is a hard floor; microtonal tunings are out of scope (ADR 0002).
 *  - The pitch representation must AGREE with the grammar-card schema, which
 *    already fixes per-string target pitches as MIDI integers and the tonic as a
 *    pitch class (kb/schema/card.schema.json; ADR 0001). This file does not
 *    re-define the grammar card — /kb owns that — it defines only the runtime
 *    pitch primitives the card compiles down to and the engine consumes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Atomic pitch coordinates
// ─────────────────────────────────────────────────────────────────────────────

declare const MidiBrand: unique symbol;
declare const PitchClassBrand: unique symbol;

/**
 * A sounding pitch as a MIDI integer (0..127). THE universal coordinate of the
 * whole system: every pitch fact ultimately reduces to MIDI arithmetic
 * (`pitch(string, fret) = openStringPitch + fret`, docs/03-architecture.md).
 *
 * Branded so a raw `number` (a fret count, a semitone delta, a string index)
 * cannot be passed where a pitch is expected. The spine will provide a smart
 * constructor `midi(n: number): Midi` that range-checks 0..127; this contract
 * only pins the type, not that constructor.
 *
 * Octave is meaningful and MUST be preserved through `identify()` — a voicing's
 * doublings and register are the Tier-3 payload (docs/06 R10).
 */
export type Midi = number & { readonly [MidiBrand]: true };

/**
 * A pitch class: MIDI mod 12, in 0..11 (0 = C … 11 = B). The coordinate for
 * SET operations — scale membership, chord identity, interval-class tension —
 * where octave and spelling are irrelevant. Matches `tonic` in
 * kb/schema/card.schema.json exactly (integer 0..11).
 *
 * Reducing a `Midi` to a `PitchClass` is LOSSY by design (drops octave). It is a
 * one-way door on the *set* side; the *multiset* side (Voicing) never takes it.
 */
export type PitchClass = number & { readonly [PitchClassBrand]: true };

/** A signed semitone distance between two pitches (may exceed an octave). */
export type Semitones = number;

/**
 * Interval class: the folded semitone distance in 0..6 (min(ic, 12 - ic)). The
 * key the graded-tension table is looked up by (ADR 0004; kb/rules/tension-table.yaml).
 */
export type IntervalClass = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Intervals & degrees (semitone distance + functional name)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An interval = a semitone distance PLUS its functional name. The semitone
 * distance is ours (pure arithmetic); the functional name (`"m3"`, `"P5"`,
 * `"A4"`) is BORROWED from Tonal's `Interval` module — we do not re-implement
 * interval naming (docs/05-external-data.md "Tonal.js"; build-vs-borrow below).
 */
export interface Interval {
  /** Signed semitone distance. */
  readonly semitones: Semitones;
  /** Functional name from Tonal, e.g. "m3", "P5", "A4". Derived, not stored. */
  readonly name: string;
  /** Folded class (0..6) — the tension-table lookup key (ADR 0004). */
  readonly ic: IntervalClass;
}

/**
 * A scale DEGREE relative to a root: the tuning-agnostic *meaning* a lost player
 * anchors to (CONTEXT.md "Degree"; docs/01-feature-set.md §B — overlays colour by
 * degree, never by note name). Distinct from `Interval`: a degree is relative to
 * a fixed root within a scale/chord, not the distance between two arbitrary notes.
 */
export interface Degree {
  /** Semitone offset from the root, folded to 0..11. */
  readonly fromRoot: PitchClass;
  /** Functional label, e.g. "1", "b3", "5", "#11", "b7". Derived in context. */
  readonly label: string;
  /** True for chord tones (1/3/5/7), false for extensions/added tones. Drives
   *  the degree-dot saturation channel (CONTEXT.md "Degree dot"). */
  readonly isChordTone: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Spelling — DERIVED in context, never stored
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Key context used to choose an enharmonic spelling. The home chord's root /
 * the tuning's stored `tonic` supplies this (docs/00 onboarding insight: the
 * open chord is a free key context; docs/01-feature-set.md §A). Spelling is a
 * *view concern* (CONTEXT.md "Label mode": name display is a toggle, degree is
 * the default), so it lives at the edge, not in the stored model.
 */
export interface KeyContext {
  /** Tonal pitch class of the key centre, e.g. the tuning's tonic. */
  readonly tonic: PitchClass;
  /** Optional explicit accidental bias when no key is in play. */
  readonly prefer?: "sharps" | "flats";
}

/**
 * Spell a MIDI pitch (or pitch class) into a note name within a key context,
 * e.g. midi 61 in G major → "C#", in Db major → "Db". IMPLEMENTATION (in the
 * spine, not here): defer to Tonal's note/key helpers for the dictionary, then
 * select the enharmonic that matches `ctx` (key signature from the tonic, else
 * `ctx.prefer`, else a default sharp/flat heuristic). Pure; no stored state.
 *
 * Pinned here as a type so callers (Readout panel, alphaTab adapter) bind to a
 * stable signature. Declaring the shape is not implementing it.
 */
export type Spell = (pitch: Midi | PitchClass, ctx: KeyContext) => string;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Scales / modes — pc-set + degree map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A scale / mode: an abstract pitch-class SET plus a degree map. The pc-set and
 * the canonical degree labels come from Tonal's scale dictionary
 * (docs/05-external-data.md); we wrap them in the invariant types so the rest of
 * the system never touches Tonal's string-keyed API directly.
 *
 * Octave-free by construction — a scale is a SET, so it uses PitchClass, not Midi.
 */
export interface Scale {
  /** Stable name, e.g. "major", "dorian", "mixolydian". */
  readonly name: string;
  /** Root as a pitch class. */
  readonly root: PitchClass;
  /** The scale's pitch classes (a set; order is ascending-from-root by convention). */
  readonly pitchClasses: readonly PitchClass[];
  /** Degree label per pitch class, index-aligned with `pitchClasses`. */
  readonly degrees: readonly Degree[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. The hard distinction: Chord (abstract pc-set) vs Voicing (pitch multiset)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CHORD — an abstract harmonic identity with NO octave placement: a pitch-class
 * set plus a root (CONTEXT.md "Chord"; docs/01-feature-set.md §A). This is what
 * Tonal operates on (`Chord.detect` works at pc-level and collapses doublings —
 * correct for a Chord, wrong for a Voicing; docs/03-architecture.md Tonal notes).
 *
 * INVARIANT: a Chord never carries octave or doubling information. Anything that
 * needs those is a Voicing.
 */
export interface Chord {
  /** Root pitch class. May be ambiguous → identify() returns ranked candidates. */
  readonly root: PitchClass;
  /** The chord's pitch classes (a SET — deduplicated, octave-free). */
  readonly pitchClasses: readonly PitchClass[];
  /** Tonal chord symbol/type when known, e.g. "maj7", "7", "sus4". Derived. */
  readonly symbol?: string;
}

/**
 * VOICING — a specific octave-placed, possibly-doubled realisation of a chord:
 * the actual sounding pitch MULTISET (CONTEXT.md "Voicing"; docs/01 §A; docs/03
 * "preserve the full pitch multiset"). THIS IS THE LOAD-BEARING TYPE for the
 * trace-back cure and the Tier-3 payload (docs/06 R10).
 *
 * `pitches` is an ORDERED ARRAY OF Midi — a multiset, NOT a Set. It MUST NOT be
 * deduplicated or collapsed to pitch classes: octave-placement, doublings, and
 * register are exactly what distinguish an inversion/doubling report from a bare
 * chord symbol. A C major triad with the third doubled an octave up is a
 * different Voicing from one without — same Chord, different Voicing.
 *
 * `bassIndex` points at the lowest-PITCH element, computed as `argmin(pitches)`,
 * NOT the lowest string index — re-entrant tunings and partial capos break the
 * string-order assumption (docs/03-architecture.md; docs/06 R10).
 */
export interface Voicing {
  /** The sounding pitches as a MULTISET. Preserves octaves + doublings. Never collapsed. */
  readonly pitches: readonly Midi[];
  /** Index into `pitches` of the lowest pitch (the bass). Computed from pitch, not string. */
  readonly bassIndex: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Tuning — the runtime projection target (agrees with the grammar card)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The minimal pitch view of a tuning that the projection engine consumes — the
 * runtime form a /kb grammar card compiles down to. It MUST agree with
 * kb/schema/card.schema.json: `openStrings` are MIDI integers and `tonic` is a
 * pitch class 0..11. /core does not own the full grammar card (movable shapes,
 * provenance, capo prose live in /kb); it owns only what `project()`/`identify()`
 * read.
 *
 * `openStrings` ARRAY INDEX CARRIES NO PITCH-ORDER MEANING — re-entrant tunings
 * are allowed (non-monotonic), and bass is always computed from the lowest pitch
 * (kb/schema/card.schema.json `strings` description; docs/06 R10).
 *
 * A capo (incl. partial capo) is a runtime per-string shift VECTOR applied over a
 * base tuning to yield a virtual tuning — never stored card state (CONTEXT.md
 * "Capo (visual)"; docs/01-feature-set.md §C). Hence `CapoShift` below.
 */
export interface Tuning {
  /** Stable id, mirrors the grammar card's `id` (e.g. "open-g"). */
  readonly id: string;
  /** Open-string target pitches as MIDI ints, ordered string 1 → string N. */
  readonly openStrings: readonly Midi[];
  /** The tuning's key-centre pitch class — the relational/anchoring root. */
  readonly tonic: PitchClass;
}

/**
 * A capo as a per-string semitone shift vector (a partial capo is a contiguous
 * span; full capo is uniform). Applied to a base `Tuning.openStrings` to produce
 * a virtual tuning the same engine handles for free (docs/01 §C; CONTEXT.md "Capo").
 * Length matches the tuning's string count; 0 = uncapoed string.
 */
export type CapoShift = readonly Semitones[];

// ─────────────────────────────────────────────────────────────────────────────
// 7. Graded drone-tension (owned by ADR 0004; typed here as a pitch primitive)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 5-level ordinal tension scale between an active voice and a ringing drone,
 * keyed on interval class (ADR 0004; kb/rules/tension-table.yaml). Held SEPARATE
 * from a note's degree/function. Typed here because it is a pure pitch-derived
 * value; the rule DATA and the computation live in /kb + /naming, not /core.
 */
export type GradedTension =
  | "reinforce" // ic 0   — unison/octave
  | "consonant" // ic 3,4,5 — 3rds, 6ths, 4th, 5th
  | "color" //     ic 2   — maj 2nd / min 7th
  | "bite" //      ic 1   — min 2nd / maj 7th
  | "unstable"; // ic 6   — tritone

// ─────────────────────────────────────────────────────────────────────────────
// 8. The two pure functions — CONTRACT SIGNATURES ONLY (not implemented here)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Anything `project()` can lay onto a fretboard: a scale or a chord (both
 * abstract pc-level entities). Voicings are an *output* of identify, not an input
 * to project.
 */
export type ProjectableEntity = Scale | Chord;

/**
 * One projected note position. `degree` is relative to the entity's root — the
 * tuning-agnostic colour channel (docs/01 §B "colour by scale degree, not note name").
 */
export interface ProjectedPosition {
  /** String index into `Tuning.openStrings`. */
  readonly string: number;
  /** Fret number (0 = open / at the nut, pitch-wise). */
  readonly fret: number;
  /** The sounding pitch at this position. */
  readonly pitch: Midi;
  /** Degree of this pitch relative to the projected entity's root. */
  readonly degree: Degree;
}

/**
 * A placed note the user actually clicked (the /board shape → pitches), the input
 * to identify(). Carries enough to recover the pitch via the tuning + capo.
 */
export interface PlacedPosition {
  readonly string: number;
  readonly fret: number;
}

/** Context that biases identification — chiefly the key from T1's home chord. */
export interface IdentifyContext {
  readonly key?: KeyContext;
}

/**
 * A ranked identification candidate. identify() returns these RANKED, never a
 * single forced answer (docs/03-architecture.md; docs/06 R5). The `voicing`
 * preserves the full multiset for the Tier-3 anatomy; `chord` is the collapsed
 * abstract identity for Tier-2 labelling.
 */
export interface RankedCandidate {
  readonly chord: Chord;
  readonly voicing: Voicing;
  /** Higher = better fit given context. Ranking heuristic is R5, not pinned here. */
  readonly score: number;
}

/**
 * FORWARD projection. entity (scale/chord) + tuning → every (string, fret) where
 * its pitch classes occur, degree-coloured relative to root. Math is
 * `pitch(string, fret) = openStrings[string] + fret`. SIGNATURE ONLY — the body
 * is the spine's job (the /projection node), deliberately not implemented here.
 */
export type Project = (
  entity: ProjectableEntity,
  tuning: Tuning,
) => readonly ProjectedPosition[];

/**
 * REVERSE identification. placed positions + tuning + context → ranked theory
 * entities. MUST compute bass from the lowest PITCH (not string index) and MUST
 * preserve the full pitch multiset in each candidate's `voicing` (docs/03; R10).
 * SIGNATURE ONLY — not implemented here.
 */
export type Identify = (
  positions: readonly PlacedPosition[],
  tuning: Tuning,
  context: IdentifyContext,
) => readonly RankedCandidate[];
