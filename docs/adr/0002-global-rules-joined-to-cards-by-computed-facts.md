# Relational rules are global; the engine joins them to cards by computed facts

**Status:** accepted

The Tier-1 relational rule set (tension table, relational vocabulary, function tendencies)
is **global and tuning-agnostic**, stored once under `/kb/rules`. Grammar cards are
**instances** carrying only tuning-specific *data* (pitches, tonic, movable shapes, capo
prose, idiomatic progressions). They are not linked by stored ID pointers: the **engine
computes facts** from a card's pitch model (degree-vs-tonic, interval-class tension,
diatonic function) and looks up the matching global rule by those keys. The only shared
reference target is `/kb/sources` (provenance citations).

## Why

- **Contribution-readiness (02):** rules operate on computed facts that *any* `(strings,
  tonic)` produces, so a future custom tuning needs only pitches + tonic to be named —
  contributors never write naming logic. The rejected alternative (per-card rules) would
  force every crowdsourced tuning to re-implement the relational vocabulary, which would
  kill crowdsourcing. This is the seam R3 (shape derivation) also builds on.
- **Translatability (the decisive reason):** the product is a bidirectional translator.
  Localized, ad hoc per-tuning names ungrounded in computed facts could not round-trip to
  Tier-2 absolute symbols or Tier-3 inter-instrument analysis. Naming from facts rather than
  from tuning-local expectation is what keeps every Tier-1 name translatable to standard
  notation and to other instruments.
- **DRY / maintainability:** N tunings reuse one rule set; a rule fix propagates to all.

## Consequences

- **Adjacency / voice-leading is computed, not stored** — neighbors are combinatorial search
  over the pitch model, not an enumerated graph. Per-card `idiomaticProgressions` is the only
  curated, stored slice.
- **Hard floor: 12-TET.** The interval-class tension table assumes 12 semitones; microtonal
  tunings are unnameable — but that is a product-wide assumption (MIDI-integer pitch model),
  not introduced here.
- **Optional `overrides` seam (ships empty in V1):** a card *may* later shadow a global rule,
  but **only the Tier-1 relational phrasing/term** (the native-lexicon flavor) — **never** the
  computed pitch facts or the absolute (T2/T3) identity. This guarantees translatability
  survives any future override.
