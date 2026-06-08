# Invariant pitch-model representation (d_pitch)

**Status:** accepted

## Decision

The `/core` invariant pitch model represents pitch as **MIDI integers** (the universal
coordinate) and **pitch classes (MIDI mod 12, 0..11)** for set operations. Spelled note
names are **derived in context, never stored**. A **chord** is an abstract pitch-class set;
a **voicing** is an octave-placed pitch **multiset** that preserves octaves and doublings and
is never collapsed. The model **borrows** dictionaries and naming from Tonal.js and **builds**
only the invariant wrapper, the chord/voicing distinction, and the projection contract.

The shapes are pinned in [src/core/pitch-model.ts](../../src/core/pitch-model.ts) (type-only
contract; no logic). This decision feeds the `core` node that the critical spine builds on
(`d_pitch → core`, docs/07-build-sequencing.html).

## Why each choice

### Pitch coordinate — MIDI int as universal, pitch class for sets

`Midi` (0..127) is the single coordinate; everything reduces to
`pitch(string, fret) = openStringPitch + fret` (docs/03-architecture.md). `PitchClass` (0..11)
is the lossy, octave-free reduction used only for *set* operations (scale membership, chord
identity, interval-class tension).

This is **forced to agree** with the already-accepted grammar-card schema, which fixes
per-string target pitches as MIDI integers and `tonic` as a pitch class 0..11
([kb/schema/card.schema.json](../../kb/schema/card.schema.json); ADR 0001). `/core` does
**not** re-define the grammar card — it defines only the runtime `Tuning` shape a card
compiles down to (`openStrings: Midi[]`, `tonic: PitchClass`). The card's rule that *array
index carries no pitch-order meaning* (re-entrant tunings; bass from lowest pitch) is carried
verbatim into the `Tuning`/`Voicing` doc contract (docs/06 R10).

Both `Midi` and `PitchClass` are **branded** number types so a fret count, a semitone delta,
or a string index cannot be passed where a pitch is expected. Smart constructors that
range-check are the spine's job; the contract only pins the brands.

**Hard floor: 12-TET** (consistent with ADR 0002). Microtonal tunings are unrepresentable by
design.

### Spelling (C# vs Db) — derived, never stored

Per docs/01-feature-set.md §A and CONTEXT.md ("Degree", "Label mode"), spelling is a
*view concern*: overlays default to **degree**, the absolute name is the grounding fallback
behind a toggle. So we store MIDI/pc and derive a name only when asked.

**How it is derived:** a pure `Spell(pitch, ctx)` function (signature pinned, not
implemented) that **leans on Tonal** for the note/key dictionary, then selects the enharmonic
matching a `KeyContext`. The key context comes for free from the tuning's stored `tonic` /
the home chord's root — exactly the "free default key context" the onboarding insight relies
on (docs/00-overview.md). Fallback order: key signature from the tonic → an explicit
sharps/flats preference → a default heuristic. No spelling is ever persisted in the model.

### Intervals and scales/modes

`Interval` = our semitone distance **plus** Tonal's functional name (`"m3"`, `"P5"`) plus the
folded interval class (0..6) that the graded-tension table is keyed on (ADR 0004;
kb/rules/tension-table.yaml). `Scale` = an abstract pc-set **plus** a degree map, both sourced
from Tonal's scale dictionary and wrapped so the rest of the system never touches Tonal's
string-keyed API directly. `Degree` is held distinct from `Interval` (degree is relative to a
fixed root; interval is between two arbitrary notes) because overlays colour by degree
(CONTEXT.md "Degree").

### Chord vs voicing — the load-bearing distinction

Encoded as two separate types with an explicit invariant (docs/01 §A; CONTEXT.md
"Chord"/"Voicing"; docs/03 "preserve the full pitch multiset"):

- `Chord` — root pitch class + a pitch-class **set** (deduplicated, octave-free). This is what
  Tonal's `Chord.detect` operates on; correct for a label, wrong for anatomy.
- `Voicing` — an **ordered array of `Midi`** treated as a **multiset**: never deduplicated,
  never collapsed to pitch classes. Octave placement, doublings, and register are preserved
  because they *are* the Tier-3 anatomy payload (root tripled, third doubled, no fifth in the
  low octave…) and what `identify()` needs (docs/06 R10). `bassIndex = argmin(pitches)` —
  lowest pitch, not lowest string index.

This makes the abstract/realised boundary a **type error to cross**, which is the cheapest
possible guard against the silent-collapse bug that would otherwise destroy Tier-3.

### Build vs borrow

| Concern | Source | Rationale |
|---|---|---|
| Scale & chord dictionaries, interval & note naming, MIDI helpers, enharmonic spelling | **Tonal.js** (client) | Permissive, pc-level, exactly the dictionary layer; don't re-implement (docs/05). |
| Tier-2 absolute labels (`Chord.detect`, slash chords) | **Tonal.js** | pc-level label is the right tool for T2 (docs/03 Tonal notes). |
| Invariant branded `Midi`/`PitchClass`, the chord-vs-voicing multiset model, `Tuning`/`CapoShift`, `project()`/`identify()` contract | **custom (`/core`)** | The invariant wrapper and the multiset distinction are exactly what no library gives us. |
| Voicing anatomy + Roman numerals (Tier 3) | **music21** (delivery = R1, ADR 0008) | NOT in `/core`; pc-level libs collapse the multiset. |

## Consequences

- The spine binds to `Project`/`Identify` **type signatures**, not implementations — bodies
  are the `/projection` node's work; this ADR does not implement the spine.
- Tonal becomes a `/core` dependency (added by the spine build, not this decision; the
  repo-root package.json is owned by the concurrent orthogonal build and untouched here).
- `GradedTension` and `IntervalClass` are typed in `/core` as pure pitch primitives, but the
  rule data and computation stay in `/kb` + `/naming` (ADR 0004; ADR 0002).
- A capo is a runtime per-string `CapoShift` vector over a base tuning → virtual tuning; never
  stored card state (CONTEXT.md "Capo"; docs/01 §C).
