# Provenance is a uniform field keyed by `kind`; grounding is a per-claim trace contract

**Status:** accepted

Every KB entry that asserts something carries a uniform `provenance` field
`{ kind, reasoning, sources }`, where **`kind`** classifies the claim and decides how it may
be spoken:

| kind | used by | verification | namer phrasing |
|---|---|---|---|
| `definitional` | tuning facts (`strings`, `tonic`) | cross-computed once | assert as fact |
| `theory` | global rules (tension, vocabulary, tendencies) | theory references | assert as fact |
| `derived` | shape `produces.quality` | computing pitches confirms it | assert as fact |
| `editorial` | affective dictionary | not verifiable (taste) | **must hedge** |

A fifth kind, `computed`, is **not stored** — it tags runtime `identify()`/`project()`
results, whose provenance is the tool call itself.

## The grounding contract (testable invariant)

> For any musically-checkable assertion *A* in the model's output: either *A* is a value a
> tool computed, or *A* is the `term`/`phrase` of a KB entry carrying provenance. For
> `kind ∈ {definitional, theory, derived}` *A* is asserted; for `editorial` *A* is hedged.
> No checkable *A* may originate in the model's own head.

## How it feeds the eval harness (R9)

1. Every KB entry has a **stable `id`** (rules, vocab entries, shapes, vibes, sources).
2. **Tools return per-claim traces** — each checkable fact in a tool result is tagged
   `computed` or with a KB entry `id`. (Extends `03`'s "truth + explanation + reasoning
   chain.")
3. The harness asserts every checkable assertion carries a valid trace and that
   `editorial`-sourced claims are hedged. An untraceable assertion = confabulation = fail.

## Why / trade-off

A naive implementation would use a free-text "notes" field. Keying provenance by `kind` is
what lets *one* honesty mechanism cover both hard facts (asserted + verified) and pure taste
(hedged + quarantined) — essential because the affective layer is subjective but the product
forbids confabulation. The per-claim trace requirement turns the grounding *aspiration* into
a *measurable* pass/fail, at the cost of a heavier tool-output contract.

## Consequence (downstream, `/mcp`)

The MCP tool-output contract **must** carry per-claim traces. Forced by this design even
though the MCP layer is built later.
