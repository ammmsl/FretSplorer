# Overview & Vision

**Working title:** _TBD_ (placeholder used as "the app" throughout)
**Status:** Pre-development planning. UI-first build to start from scratch in VS Code.
**License intent:** Open source.

---

## The problem

Guitar knowledge is almost always stored as **fretboard geometry** — shapes, boxes, CAGED, "the A-shape barre" — rather than as **pitch relationships**. A pianist never has this problem because the keyboard is an invariant coordinate system. A guitarist's instrument effectively changes shape every time they retune, so any knowledge encoded as shapes becomes invalid the moment the tuning changes.

The consequences, in the player's words:

- The moment they leave EADGBE, most players are lost and trial-and-error their way through.
- They can't **trace back voicings** — figure out what a grip they stumbled onto actually is.
- This is so slow that open and alternate tunings stay a rare textural device instead of a usable everyday color.
- They can't **communicate** what they're playing to other musicians, because most "common" guitar chords, when you compute the literal sounding pitches, turn out to be inversions and doublings guitarists have no vocabulary for.

## The core reframe (the spine of everything)

Treat **pitch-space as the invariant** and **each tuning as a projection onto the fretboard** — a change of basis. All theory lives in the invariant representation; a tuning is just a render target.

The deep insight that follows: **CAGED is not music theory.** It's an emergent artifact of standard tuning's specific interval pattern. Every tuning has its own emergent shape-system. So the honest fix is not "drag my standard shapes into the new tuning" (which fights the instrument) — it's "derive the native lexicon for _this_ tuning."

## The onboarding insight (why this is tractable)

Open tunings have a strong proclivity to use **open strings** — that's the whole reason to retune and the reason capos work. The open chord of a tuning is therefore a free **default key context**. We never name a bare pitch-set hoping to guess its function; we name a grip **over a known drone, anchored to a known tonic.** That collapses the naming ambiguity that would otherwise be unsolvable, and produces names true to how the music actually functions.

A capo is a uniform pitch shift: it transposes the home chord's root while preserving every structural relationship. Open G capo 2 is "in A" with byte-identical native logic.

## Architectural spine (see `03-architecture.md`)

1. **Invariant pitch model** is the single source of truth (MIDI integers / pitch classes).
2. **Projection layer** maps theory entities onto any tuning, and reverses fretboard positions back to theory.
3. **alphaTab** is a *component* — the notation/tab renderer and the audio engine — driven _from_ our model. It is **not** the foundation or the core data model.
4. **Three naming tiers**: native/relational (custom), absolute lead-sheet (Tonal.js), inter-instrument (music21).
5. **String-tension module** advises gauge/setup (V1).
6. **MCP layer** exposes intent-shaped tools over a declarative knowledge base, under one hard rule: *nothing musically checkable comes from the model's own head.*

## What makes this different from a chord dictionary

The product hiding inside is a **bidirectional translator**: vibes-and-shapes in, verified theory out, and verified theory back out as plain language. The conversational layer is mostly that translator plus the discipline that keeps it honest.

## Document index

| File | Purpose |
|---|---|
| `00-overview.md` | This doc. Vision, reframe, index. |
| `01-feature-set.md` | The full feature set, grouped. |
| `02-scope.md` | V1 vs deferred, with rationale. |
| `03-architecture.md` | Technical spine, data model, library placement, grounding discipline. |
| `04-user-intent-flows.md` | Conversational + interaction flows, intent verbs, example dialogues. |
| `05-external-data.md` | Libraries, datasets, soundfonts, tension data — what to pull and from where. |
| `06-research-directive.md` | Open questions to resolve before/during dev. |

## Build approach

UI-first. Start with the central fretboard surface and the (plural, disposable) neck model, stub the projection/analysis behind it, then progressively wire in the real tiers. The notation/audio pane (alphaTab) and the MCP layer come after the fretboard + invariant model feel right.
