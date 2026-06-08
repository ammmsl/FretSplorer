# Architecture

The technical spine. A UI-first build still needs this because every UI element binds to one of these layers.

---

## Layering (data flow)

```
                 ┌─────────────────────────────────────────────┐
                 │      INVARIANT PITCH MODEL  (truth)           │
                 │  MIDI ints / pc-sets · intervals · scales ·   │
                 │  chords (abstract) · voicings (realized)      │
                 └───────────────┬───────────────────────────────┘
                                 │  source of truth
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  PROJECTION   │      │   NAMING TIERS    │      │  TENSION/SETUP   │
│  project()    │      │  T1 relational*   │      │  advise_setup()  │
│  identify()   │      │  T2 Tonal (abs)   │      │  (orthogonal)    │
│               │      │  T3 music21 (fn)  │      │                  │
└──────┬────────┘      └─────────┬─────────┘      └────────┬─────────┘
       │                         │                         │
       ▼                         ▼                         ▼
┌───────────────────────────────────────────────────────────────────┐
│                          PRESENTATION                                │
│  Fretboard surface (custom, central) · alphaTab pane (component)     │
│  · MCP conversational layer                                          │
└───────────────────────────────────────────────────────────────────┘
        * T1 is the only naming tier we build from scratch.
```

## Source-of-truth rule

The **invariant pitch model owns truth.** Everything else reads from it or projects it. Critically, **alphaTab's Score model is NOT the source of truth** — see below.

## Why alphaTab is a component, not the foundation

alphaTab's internal model is a **score** model: a timeline of bars/beats/time-signatures, built to represent *a notated piece*. Our core is the opposite shape: a tuning-invariant *pitch* model with a projection layer, organized around *harmonic objects and their fretboard realizations*, with no inherent timeline. A single chord or a scale is not naturally a score.

So: keep our invariant model as truth, and treat alphaTab as a **render-and-playback target**. Our model emits a small AlphaTex string (or builds Score objects via the API) for whatever is currently in view, hands it to alphaTab to draw the tab/notation and to sound it. alphaTab is the *view and the speaker*, not the brain.

Practical constraints:
- **Don't put alphaTab in the hot interactive loop.** Full score layout is heavy. Live fretboard interaction stays in our lightweight surface; push to alphaTab on a slower cadence (commit / pause / "show it written").
- **License:** MPL-2.0, file-level copyleft. Using it as a dependency in an otherwise open/proprietary app is fine; only modifications to alphaTab's *own* files would need sharing. Component approach keeps us clear.
- **Audio:** alphaSynth, SoundFont2 over Web Audio. `let-ring` approximates ringing opens. Default soundfont for V1.

## The two pure functions

```
pitch(string, fret) = openTuning[string] + fret          // semitones / MIDI

project(entity, tuning) -> [(string, fret, degreeRelativeToRoot)]
identify(positions, tuning, context) -> [ rankedTheoryEntity ]
```

`identify` must:
- Compute the **bass from lowest pitch**, not lowest string index (re-entrant tunings, partial capos).
- Preserve the **full pitch multiset** (octaves + doublings) — not collapse to pc-set — because doublings/inversions are the Tier 3 payload.
- Return **ranked candidates**, never a single forced answer.

## Naming-tier placement

| Tier | Engine | Runs where | Returns |
|---|---|---|---|
| T1 relational | **custom** | client | drone decomposition, home-relative role, tension-vs-pedal, neighbors |
| T2 absolute | **Tonal.js** | client | chord symbol + slash bass, candidate list |
| T3 inter-instrument | **music21** | client (Pyodide?) or backend | root/bass/inversion (figured bass), doubling/omission, Roman numeral |

Tonal notes: `Chord.detect` is bass-aware (returns slash chords like `D7/F#`) but works at pc-level and collapses doublings; returns arrays for ambiguity. Use it for T2 labels, not voicing anatomy.

music21 notes: `chord.Chord([pitches])` preserves real pitches; `.root()/.bass()/.inversion()/.commonName/.pitchedCommonName`; `roman.romanNumeralFromChord(chord, key)` is key-dependent functional analysis with figured-bass inversion. The key it needs is the home chord T1 already pinned.

## Knowledge base (declarative, inspectable)

KB is **data files (JSON/YAML), not hardcoded logic.** This gives (a) the natural contribution surface later, and (b) **auditability** — when the tutor asserts something, point at the rule it came from. Contents:

- **Tunings**: per-string target pitches, home chord, emergent movable shapes, drone map, barre rule, capo behavior.
- **Rules**: function-in-context mappings, graded tension relationships, adjacency/voice-leading graph.
- **Affective → mechanism dictionary**: vibe-word → theory operations.
- **Explanatory provenance**: the *why* stored as first-class data alongside each rule, so the model teaches from verified scaffolding.

## MCP layer

- **Resources** (always-visible, not re-fetched each turn): tuning grammar card; current board collection (the plural necks) + focus pointer.
- **Tools** (intent-shaped — see `04`): each returns structured truth **+ explanation field + reasoning chain**, never a bare answer.
- **Board mutation** is allowed and low-stakes: exploration is non-destructive, the user has the physical guitar, and the model spawns new necks rather than overwriting. State is ephemeral (no sessions); only turn-level focus persists within a conversation.

## The grounding discipline (the load-bearing rule)

> Every musically checkable fact in the model's output must trace to something a **tool computed** from the invariant model. The LLM explains, motivates, analogizes, teaches — it never does fretboard math or asserts a voicing's identity from its own head.

This is what separates a tutor from a confident liar, and it matters most precisely because the target user (the "sweet summer child" guitarist) cannot catch the errors. Build an eval harness for it (see `06`).

## Suggested module boundaries (for the VS Code start)

```
src/core        invariant pitch model, intervals, scales, chords/voicings
src/projection  project(), identify(), capo virtual-tuning
src/naming      tier1-relational/, tier2-tonal/, tier3-music21/
src/tension     advise_setup() + gauge/unit-weight tables
kb/             schema/, tunings/, rules/, affective/, sources/   (declarative data; provenance inline)
src/board       neck collection model, focus pointer, morph
src/render      alphaTab adapter (model -> AlphaTex/Score), playback
src/mcp         resources + intent tools, grounding guardrails
src/ui          fretboard surface (build first), notation pane, chat
```
