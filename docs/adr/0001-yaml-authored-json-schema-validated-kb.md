# KB is YAML-authored, JSON-Schema-validated, compiled to typed JSON/TS at build

**Status:** accepted

The knowledge base (grammar cards, rules, affective dictionary, sources) is hand-authored
in **YAML**, validated against **JSON Schema** at build time, and compiled to **typed
JSON/TS** that the app consumes. We chose this hybrid over pure JSON because the
load-bearing parts of the KB are *prose* — the provenance "why" and the relational
explanations — and YAML block scalars keep that prose readable and diff-friendly, while a
build-time validate-and-compile step gives us typed runtime access and fail-the-build
validation at zero authoring or runtime-safety cost. The KB is also the future
contribution format, and YAML (comments, low punctuation burden) is friendlier to hand
authoring than JSON.

**Trade-off accepted:** YAML's type-coercion footguns (the "Norway problem"; bare tokens
like `D`, `E`, `on` coerced to non-strings). Mitigated because pitch data is explicit MIDI
integers and quoted note strings under a strict schema, so the validator catches any
coercion surprise at build time.

## Consequences

- Runtime loading: shared data (rules, affective, sources) is bundled eagerly; grammar
  cards are **lazy-loaded per tuning** (dynamic import of the compiled card module) — the
  seam that lets the deferred contribution surface scale to many community tunings.
- `/kb` layout: `schema/`, `tunings/`, `rules/`, `affective/`, `sources/`, `README.md`.
  Provenance is an **inline first-class field** on every card and rule (not a directory);
  `sources/` holds only the reusable bibliography keyed by id. This deviates from the
  `/kb/.../provenance/` directory sketched in `03-architecture.md` — see Downstream impacts.
