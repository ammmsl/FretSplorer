# Feature Set

Grouped by layer. Scope (V1 vs later) is in `02-scope.md`; this doc describes _what each feature is_, not _when_.

---

## A. The invariant core

The tuning-agnostic theory spine that everything else reads from.

- **Pitch model.** Notes as MIDI integers / pitch classes — the universal coordinate. Spelled names (C# vs Db) are *derived in context*, never stored.
- **Intervals.** Both semitone distances and functional names (m3, P5…).
- **Scales / modes.** Pitch-class sets plus a degree map.
- **Chords vs voicings.** Hard distinction between a *chord* (abstract pc-set) and a *voicing* (specific octave-placed realization). In open tunings the specific voicing/drone color is often the entire point, so both are first-class.

## B. Projection engine (two pure functions over `pitch(string, fret) = openTuning[string] + fret`)

- **Forward — `project(entity, tuning)`.** Given a scale or chord, compute every `(string, fret)` where its pitch classes occur. Color by **scale degree relative to root**, not by note name — degree color is tuning-agnostic in meaning, the anchor a lost player needs.
- **Reverse — `identify(positions, tuning, context)`.** Map frets → pitches → pc-set → theory entity(s). This is the "trace back voicings" cure.

## C. Fretboard surface (the central view)

- **Multiple necks.** Plural, cheap, disposable boards. The model demonstrates by *spawning a new neck beside* the user's, not by overwriting — comparison is the teaching act.
- **Degree-colored overlays.** Scales/chords rendered as degree-colored dots.
- **Drone map.** Each open string color-coded as a safe drone vs a tension against the current scale/chord.
- **Capo / partial capo.** Modeled as a uniform (or per-string) pitch shift — i.e. a virtual tuning — so the same engine handles it for free.
- **Morph mode.** Take a grip, retune string-by-string while frets shift to preserve pitch (retune string by δ semitones → fret moves −δ). Animated. Shows when a voicing falls off the neck or below the open string. Best shown across two necks side by side.
- **Turn-level focus.** A single pointer to "the neck we're talking about now," for pronoun resolution ("move the third up"). Ephemeral, not persisted.

## D. The three naming tiers

### Tier 1 — Native / relational (the onboarding tier, **custom-built**)

Decompose a grip into **drones (open strings ringing) + active voices (fretted notes)** and name the result *as a function of the drone* (the tuning's home chord = default tonic).

Emergent grammar this enables:
- Flat barre at fret N = home chord transposed up N semitones (stated as the foundational rule, not rediscovered).
- Partial fretting against ringing opens = alteration/extension of the home chord (sus, add, tension).
- Bass = lowest *pitch* (computed, not assumed to be string 6 — re-entrant tunings and partial capos break that).

Output is **relational**: "this is the IV with the open D ringing as a 9th," "this fretted note sits a semitone off the open B — that's your bite." Must be able to name **dissonance against the pedal**, not just consonant fits — that's the textural device the whole project is about.

Feeds a **shape-discovery view**: surfaces the tuning's emergent movable shapes (the "CAGED-equivalent"), so the lesson becomes "here are the 3–4 grips that, slid against the opens, give you the whole palette."

### Tier 2 — Absolute lead-sheet naming (Tonal.js)

When a grip leaves the open-string zone (up the neck, all six fretted, chromatic, no drones), drop relational framing and fall back to absolute lead-sheet naming: chord symbol + slash bass. Still guitar-native vocabulary, just no longer drone-anchored.

**Handoff rule (explicit + tunable):** if ≥1 open string rings AND fretted notes are diatonic to / simple alterations of the home chord → name relationally (Tier 1); else → absolute (Tier 2). Self-routing across idioms — folk/slide/singer-songwriter favor T1, chromatic/jazz fall through to T2.

### Tier 3 — Inter-instrument translation (music21)

Invoked to **expose what the guitar is actually doing** so others can double/complement/arrange. Full voicing anatomy: root, bass, inversion as figured bass, doubling/omission report, functional Roman numeral. Tier 1 already supplied the key context music21 needs. Produces the sentence guitarists can't currently make: "G major, root tripled, third doubled, no fifth in the low octave, open voicing across two octaves, functioning as I."

## E. String-tension / setup advisor (V1)

- **`advise_setup(tuning, gauges?, scaleLength)`** → per-string tension, flags (floppy / likely-to-break / fine), and gauge recommendations.
- Pure function of target pitch, gauge, scale length. Reads only the tuning's per-string target pitches plus two new inputs. Orthogonal to the harmonic layers.
- Removes the *physical* friction that makes players abandon alt tunings ("open C feels bad" is usually too-light strings, not the tuning).

## F. Notation + audio (alphaTab)

- Supplementary tab + standard-notation pane, rendered from our model (via AlphaTex or its Score API).
- Playback via alphaSynth (SoundFont2 / Web Audio) — "sound it out."
- Updates on a slower cadence (commit / pause / "show it written"), never in the hot interactive loop.
- Bonus: alphaTab imports Guitar Pro / MusicXML, enabling "drop in existing tab → retune & analyze it."

## G. Conversational layer (MCP)

- Intent-shaped tools (see `04-user-intent-flows.md`): identify, find voicings, what does this do, where can this go, translate between tunings, turn-this-feeling-into-options, advise setup.
- **Resources** (always-visible context): the tuning grammar card, the current board collection.
- **Affective → mechanism dictionary**: maps "dreamier / darker / more open / that Nick Drake thing" to theory operations. The most-skipped, highest-value layer for reaching naive players.
- **Grounding discipline**: tools return truth + explanation + reasoning chain; the model narrates, never computes fret math or asserts a voicing's identity itself.
