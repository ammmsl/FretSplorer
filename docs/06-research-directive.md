# Research Directive

Open questions to resolve before or early in development. Each has a **why it matters**, a **what to do**, and a **decision it unblocks**. Ordered roughly by how much they gate the V1 build.

---

## R1. music21 delivery: Pyodide vs backend
- **Why:** Determines whether Tier 3 is fully client-side or needs a service — affects deployment, latency, and the "no backend" simplicity of an open-source app.
- **Do:** Prototype music21 under Pyodide. Measure bundle size, cold-start, and per-call latency for `romanNumeralFromChord` + voicing anatomy. Compare against a thin backend (FastAPI) doing the same.
- **Unblocks:** Tier 3 deployment shape; whether V1 ships fully static.

## R2. Tier 1 relational vocabulary (the custom core)
- **Why:** This is the part no library does and the pedagogical heart. Naming dissonance-against-the-pedal is the founding "textural device."
- **Do:** Define the exact set of relationships-to-drone the namer must articulate: consonant fits, added tones (9/11/13), suspensions, the graded tension of each note vs each ringing open (semitone bite vs whole-tone color vs tritone), and "alteration of the home chord." Decide the output vocabulary and how graded tension is represented (scaled, not binary).
- **Unblocks:** The entire Tier 1 implementation and the KB rule schema.

## R3. Emergent movable-shape derivation
- **Why:** The "CAGED-equivalent" for a tuning powers onboarding + shape discovery, and is the prerequisite for ever supporting arbitrary tunings.
- **Do:** Specify an algorithm that, given a tuning's interval pattern + home chord, derives the fundamental movable grips and anchor points. Validate against the hand-built grammar cards for the seed tunings (they should fall out of the algorithm).
- **Unblocks:** Shape-discovery view; the future random-tuning path.

## R4. Tier 1 ↔ Tier 2 handoff threshold
- **Why:** Mis-routing produces either forced-relational nonsense or unhelpful absolute labels.
- **Do:** Gather real grips across idioms (folk, slide, singer-songwriter, chromatic/jazz-in-alt-tuning) and tune the rule ("≥1 open ring AND diatonic-or-simple-alteration → T1"). Find the edge cases that break it.
- **Unblocks:** Naming router; UX confidence.

## R5. Chord-naming ambiguity ranking
- **Why:** One pc-set has many valid names; guitar voicings routinely omit 5ths; the "right" name is context-dependent.
- **Do:** Define the ranking heuristic for candidate names, and how key/context (from T1's home chord) biases it. Decide how many candidates to surface and how to phrase uncertainty.
- **Unblocks:** `identify()` output contract.

## R6. Voicing-generation search + playability scoring
- **Why:** `find_voicings` is constrained combinatorial search, not lookup; "is this comfortable" is fuzzy empirical domain knowledge.
- **Do:** Define the search (string subsets × fret choices) and pruning constraints (span ≈4–5, finger count, barre feasibility, mutes/opens, target inversion, register). Draft a *tunable* playability scoring model; decide whether to calibrate it with real fingering data.
- **Unblocks:** `find_voicings`, and the flags it returns.

## R7. String-tension data + formula validation
- **Why:** Wrong tension advice is worse than none (could suggest a string that breaks).
- **Do:** Source authoritative unit-weight tables (verify D'Addario or equivalent), confirm coverage across plain/wound and material types, validate the `T = UW(2LF)²/386.4` constant + units against known reference tensions, and decide behavior when the user's exact string is unknown (estimate vs ask).
- **Unblocks:** `advise_setup()` correctness; V1 tension feature.

## R8. SoundFont quality vs the drone premise
- **Why:** Open tunings live on the *ring and bloom* of sustained opens; a thin sample may undersell the whole point.
- **Do:** Test the default soundfont with `let-ring` on sustained open-string voicings. Judge whether it's "good enough for exploration." If not, scope a better sample layer (deferred unless it's a dealbreaker).
- **Unblocks:** Whether richer samples stay deferred.

## R9. Grounding eval harness
- **Why:** The product's credibility rests on never lying to beginners who can't catch errors. This must be measurable, not aspirational.
- **Do:** Build a test suite of prompts that tempt the model to invent fret positions / chord identities, and assert that every checkable claim traces to a tool result. Decide enforcement (tool-only for checkable facts; refuse/redirect otherwise).
- **Unblocks:** MCP layer sign-off.

## R10. Re-entrant tunings & partial capos in the data model
- **Why:** They break the "strings ascend monotonically / bass = string 6" assumption.
- **Do:** Confirm `identify()` computes bass from lowest *pitch*; model a partial capo as a per-string pitch shift (virtual tuning). Test with a re-entrant case and a partial-capo case end-to-end.
- **Unblocks:** Correctness of capo features + bass detection.

## R11. Seed tuning list + grammar-card schema
- **Why:** V1 ships curated, hand-verified tunings; the schema is also the future contribution format.
- **Do:** Finalize the seed list; design the grammar-card JSON/YAML schema (pitches, home chord, movable shapes, drone map, barre rule, capo behavior, explanatory provenance). Author + verify each card.
- **Unblocks:** The KB; everything that reads a grammar card.

## R12. alphaTab model-driven rendering path
- **Why:** Need the cleanest way to push our model into alphaTab for the notation/audio pane.
- **Do:** Compare generating AlphaTex strings vs building Score objects via the API for single-chord/fragment display. Confirm arbitrary-tuning rendering and `let-ring` playback. Establish the update cadence (out of hot loop).
- **Unblocks:** The notation/audio adapter.

---

## Verify-at-build (fast-moving, don't trust memory)
- Tonal current API + license.
- music21 current version + Pyodide compatibility.
- alphaTab current version (~v1.8.1), AlphaTex tuning syntax, soundfont loading.
- String unit-weight tables (manufacturer source + attribution).
