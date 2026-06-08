# Scope

What ships in V1, what's deferred, and why. The principle: V1 must deliver the **bidirectional translator** (vibes/shapes in → verified theory out → plain language back) for a curated set of tunings, with the conversational layer honest and grounded.

---

## V1 — In scope

### Core (non-negotiable spine)
- **Invariant pitch model** as single source of truth.
- **Projection engine**: `project()` and `identify()`.
- **Fretboard surface** with multiple necks, degree-colored overlays, drone map, turn-level focus.
- **Capo / partial capo** as virtual tunings.

### Naming
- **Tier 1 (relational)** — the custom core. Drone decomposition, home-chord-relative naming, dissonance-against-pedal naming, barre-as-transpose rule, shape-discovery view.
- **Tier 2 (absolute)** — Tonal.js integration, with the explicit Tier1↔Tier2 handoff rule.
- **Tier 3 (inter-instrument)** — music21 voicing anatomy + Roman numeral. *In V1, but* its delivery mechanism (client via Pyodide vs backend service) is an open research question — see `06-research-directive.md`. If Pyodide proves impractical, V1 ships Tier 3 behind a small backend.

### Physical
- **String-tension / setup advisor** — `advise_setup()`. Promoted into V1: it's computable, helpful, zero-confabulation, and serves the founding adoption thesis (the *physical* half of "alt tunings get abandoned"). Architecturally orthogonal, so it doesn't endanger the core.

### Notation / audio
- **alphaTab** as render + playback component, driven from the model. Default soundfont acceptable for V1.

### Conversational
- **MCP layer** with the V1 intent verbs and the two resources (grammar card, board collection).
- **Affective → mechanism dictionary** — seeded, not exhaustive. Enough vibe-words to prove the translation premise.
- **Grounding discipline** enforced from day one.

### Tunings
- A **curated set** of well-understood tunings (e.g. Open G, Open D, DADGAD, Drop D, Open C, Open E, double-drop D). Each ships with a complete, hand-verified grammar card.

## V1 — Explicitly out

- **Crowdsourced / arbitrary "random" tunings.** The engine must *handle* any tuning mathematically, but curated grammar cards (with verified explanatory provenance) are V1-only for the seed set. Random-tuning auto-grammar derivation is a research item (emergent-shape derivation).
- **Contribution surface.** Community submission of tunings, vibe mappings, explanations — deferred. KB is declarative data from day one *so that* this can bolt on later, but no contributor tooling/UI in V1.
- **Richer / sympathetic-resonance samples.** Default soundfont for V1; better samples later if the drone character demands it. (User: "I can look for better samples if I need it later.")
- **Sessions / persistence.** None. Exploration is ephemeral; the physical guitar and the user's memory are the persistence layer. Only turn-level focus state exists.
- **Tracked changes, scores, multi-bar transcription authoring.** alphaTab can *render* fragments; we are not a notation editor or DAW.

## Deferred — clean post-V1 bolt-ons

The architecture leaves seams for each:

| Feature | Seam it plugs into |
|---|---|
| Crowdsourced tunings + auto-grammar | Declarative tuning KB + emergent-shape derivation |
| Contribution UI | Declarative KB files (JSON/YAML) |
| Richer samples | alphaTab/alphaSynth soundfont swap |
| Advanced playability/fingering scoring | Voicing generator's scoring hook |
| Import-and-analyze existing tab | alphaTab's GP/MusicXML import |

## Non-goals (philosophy)

- Not a tab editor, not a DAW, not a backing-track app.
- Not a replacement for the instrument — the guitar stays in the user's hands; the app is an exploration + translation surface.
- Not a system that teaches general music theory — the LLM already knows that. We supply *tuning-native* logic and *ground* the model in computed truth.
