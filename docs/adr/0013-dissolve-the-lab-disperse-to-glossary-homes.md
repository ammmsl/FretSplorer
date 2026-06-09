# Dissolve the Lab: disperse provisional surfaces to glossary-implied homes

**Status:** accepted (supersedes the provisional Lab from the overnight build charter, docs/10)

The overnight build mounted four built-but-unplaced surfaces — capo, string-tension/setup,
shape discovery, morph/translate — in a clearly-labelled provisional **Lab** strip below the
three-region shell ("reach, don't place"). This ADR records the "place" half: the Lab is
**deleted**, and each surface moves to the home its glossary term already implies, rather than
being promoted to a real named surface. "Lab" never enters the ubiquitous language.

## The dispersal

- **Capo → onto the neck.** A draggable on-neck overlay + a per-neck pill, realising the
  existing **Capo (visual)** term. See ADR 0014.
- **Shape discovery → the grammar card.** ADR 0005 already homes movable shapes in the left
  panel. `ShapeDiscovery` folds into `GrammarCardPanel`: the card's movable shapes become
  clickable (preview-with-restore on the focused neck via `realizeShape`), and the card gains
  the **drone-map home-context view** (each open string vs the **tonic**, graded; computed, so
  shown for *all* tunings — including card-less and future custom tunings).
- **String tension / setup → the bottom dock beside Notation.** Both are slow-cadence
  reference surfaces that stay out of the hot loop. Critically, this keeps **physical string
  tension** maximally far from the **harmonic drone map** now rendered in the grammar card —
  the two must never bleed (CONTEXT.md "Tension" ambiguity). The advisor is reframed as a
  per-string **deviation from standard tuning** (same assumed gauge set, 25.5″ scale).
- **Morph → spawn-beside.** `translate()` re-places a shape's sounding pitches on a **new neck
  in the target tuning, spawned beside the origin neck** — the origin→spawned learning path the
  domain model already encodes (`originId`, CONTEXT.md "Origin neck"). `MorphView` is deleted;
  landing/off-neck detail surfaces in the conversation turn + a spawned-neck warning. Reachable
  from the conversation ("in DADGAD?") *and* a non-conversational "+ neck → morph to [tuning]".

## Enabling constraint — the neck floor

The Lab's defining defect was that it was a flex sibling competing for a fixed `100vh` height
with `min-height:0`, so opening it crushed the neck (clipped, unrecoverable — no page scroll).
Dispersal would recreate this in the bottom dock. The invariant that prevents it: **the neck
has a protected minimum height; every other region (left panel, bottom dock, neck stack)
absorbs its own overflow via internal scroll and never resizes the neck.**

## Consequences

- `Lab`, `ShapeDiscovery`, `MorphView`, and `CapoControl` (the toggle widget) are removed.
- Stays entirely within ADR 0005's three regions — no new top-level layout, so reversal cost is
  moderate (components rebind to a region) rather than high.
- The grammar card becomes the convergence point for two surfaces (shapes + capo context); the
  card turns from a passive plaque into the interactive native-lexicon surface the glossary
  describes.
