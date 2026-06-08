# Fretsplorer Knowledge Base

The declarative theory data behind Fretsplorer. **Data, not code** (`03-architecture.md`):
when the tutor asserts something musically checkable, it points at a file here. This KB is also
the future community-contribution format (`02-scope.md`).

> Designed in the Knowledge/Data `grill-with-docs` session. Glossary: `CONTEXT.md` (repo root).
> Decisions: `docs/adr/0001`–`0004`. Cross-path impacts: `docs/09-downstream-impacts.md`.

## Layout

```
/kb
  schema/      JSON Schemas (the validation contracts)
    card.schema.json         grammar cards
    rule.schema.json         tension-table / relational-vocabulary / function-tendencies
    affective.schema.json    vibe -> mechanism dictionary (PROVISIONAL)
    sources.schema.json      shared bibliography
  tunings/     one YAML grammar card per tuning   (open-g.yaml, ...)
  rules/       global, tuning-agnostic rule data
    tension-table.yaml         interval class -> graded tension rank + phrase
    relational-vocabulary.yaml the A-E keyed phrase lookup (Tier-1 naming)
    function-tendencies.yaml   diatonic function -> pull/resolution prose
    ranking-weights.yaml       tunable naming-ambiguity ranking weights (R5)
  affective/   dictionary.yaml   vibe word -> theory operations (PROVISIONAL, review post-build)
  sources/     references.yaml   bibliography keyed by id
```

## Authoring & build pipeline (ADR 0001)

1. **Author in YAML** — human-friendly, comment- and prose-friendly.
2. **Validate against JSON Schema** at build — fail the build on any violation.
3. **Compile to typed JSON/TS** consumed by the app.
4. **Runtime loading:** rules / affective / sources are bundled eagerly; **grammar cards are
   lazy-loaded per tuning** — the seam that scales to many community tunings later.

## Core principles

- **Store authorial intent + raw pitch data only; derive everything computable.** A card stores
  `strings` (MIDI) + `tonic` (+ shapes, provenance, prose). The **home chord, drone map, barre
  rule, bass, and a shape's function are DERIVED** — never stored, so they can't drift.
- **Array index carries no pitch-order meaning.** `strings` is ordered string 1 -> string N;
  re-entrant tunings (non-monotonic) are allowed; bass is always the lowest *pitch*.
- **Spelled note names are never stored** — `62`, not `"D4"`. Names are derived in context.
- **Global rules, instance cards** (ADR 0002). Rules are tuning-agnostic and apply to every card;
  the engine joins them by *computed facts*, not stored pointers. This is what makes custom
  tunings tractable later and keeps every Tier-1 name translatable to Tier 2/3.
- **Graded tension is a 5-level scale** keyed on interval class (ADR 0004):
  `reinforce(0) · consonant(1) · color(2) · bite(3) · unstable(4)`.

## Provenance & the grounding discipline (ADR 0003)

Every asserting entry carries `provenance { kind, reasoning, sources, verifiedBy?, verifiedNote? }`.

| kind | used by | spoken as |
|---|---|---|
| `definitional` | tuning facts | asserted (must be verified) |
| `theory` | global rules | asserted |
| `derived` | shape `produces.quality` | asserted (must be verified) |
| `editorial` | affective dictionary | **hedged** ("usually") |

`verifiedBy` is **required** for `definitional` and `derived` claims — an unverified card fails
validation. "Verified" = an independent recomputation agrees with the claim (not human eyeballing).
The runtime kind `computed` (identify/project results) is traced to the tool call, not stored here.

> **Grounding contract:** every musically-checkable assertion in the model's output traces to a
> tool computation or a KB entry with provenance; `editorial` claims are hedged; nothing checkable
> comes from the model's head. Tools return per-claim traces (KB id or `computed`) so the R9 eval
> harness can verify this mechanically.

## Verifying a card

1. Recompute each open-string MIDI from note+octave; confirm `strings`.
2. Compute the open-string pc-set; confirm the derived home chord and that `tonic` is right.
3. For each movable shape, compute the actual pitches at a concrete anchor fret; confirm
   `produces.quality` is literally true. Record `verifiedBy` / `verifiedNote`.

Once the engine exists, these become **test fixtures** — each card's claims become assertions in
the suite so a card can't silently rot.

## Status

- **Seed tunings (V1):** Open G (authored + verified here), DADGAD, Drop D, EADGBE (standard),
  Open D. Stretch: Open C, Open E, double-drop D. **V2 expansion target = custom tunings**, not
  more curated cards.
- **`affective/` is PROVISIONAL** — review post-build for whether it earns its place.
- **`sources/` has `to-verify` entries** — confirm citations at build before shipping.
