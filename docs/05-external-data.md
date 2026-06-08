# External Data & Dependencies

What to pull, from where, with license and integration notes. Verify versions at build time (see `06` — some of this is fast-moving).

---

## Libraries

### Tonal.js — Tier 2 absolute naming + pitch utilities
- **What:** JS music-theory library. `Chord.detect` (bass-aware, returns slash chords e.g. `D7/F#`, returns candidate arrays), `Note.midi`, `Interval`, `Scale`, chord/scale dictionaries.
- **Use for:** Tier 2 lead-sheet naming; scale/chord pitch-set dictionaries for the invariant core; MIDI/interval helpers.
- **Caveats:** Works at pc-level — collapses octaves/doublings, so NOT for voicing anatomy. Known quirk: slash detection keys off note ordering. Returns arrays (handle multi-candidate).
- **Runs:** client.
- **License:** permissive (verify current).

### music21 — Tier 3 inter-instrument analysis
- **What:** Python toolkit. `chord.Chord([pitches])` preserves real pitches; `.root()/.bass()/.inversion()/.commonName/.pitchedCommonName`; `roman.romanNumeralFromChord(chord, key)` = key-dependent functional analysis with figured-bass inversion.
- **Use for:** Tier 3 voicing anatomy (doublings/omissions/inversion) + Roman numeral. Key context comes from Tier 1's home chord.
- **Caveats:** Heavyweight Python dependency. **Client-side via Pyodide/WASM is unverified** — feasibility + bundle size + latency is a research item (`06`). Fallback: small backend service.
- **License:** BSD.

### alphaTab — notation/tab rendering + audio
- **What:** Cross-platform notation + guitar-tab rendering. Loads Guitar Pro 3–7, AlphaTex, MusicXML; renders SVG/raster; plays via built-in alphaSynth (SoundFont2 / Web Audio). Models arbitrary tunings. Latest ~v1.8.1 (verify).
- **Use for:** the supplementary tab/notation pane + "sound it out." Driven from our model (AlphaTex string or Score API). Also: import GP/MusicXML → analyze (post-V1 bonus).
- **Caveats:** Component, not foundation. Keep out of the hot loop. Needs a SoundFont (.sf2).
- **License:** MPL-2.0 (file-level copyleft — fine as a dependency).

## Datasets / content to assemble

### Tuning definitions (curated seed set)
- Per-string target pitches, home chord, emergent movable shapes, drone map, barre rule, capo behavior.
- Seed: Open G, Open D, DADGAD, Drop D, Open C, Open E, double-drop D (finalize list).
- **Hand-verified** for V1. Source from theory references + cross-check by computing them.
- Optional enrichment for the affective dictionary: representative artists/songs per tuning (informational, not reproduced).

### Scale / chord dictionaries
- Largely from Tonal. Confirm coverage of modes + extended/altered chords needed for Tier 1/2.

### Affective → mechanism dictionary
- Custom-authored. Vibe-word → theory operations (e.g. dreamier → add 9ths / let opens ring / drop 3rd; darker → flatten toward Phrygian; more open → wider spacing + drones).
- Seed manually; this is the highest-value custom data. Structure as KB so it's extendable later.

### String unit-weight / gauge tables (for tension, V1)
- **Need:** unit weight (mass per unit length) per gauge, by string type (plain steel vs wound; nickel vs phosphor bronze, etc.).
- **Source:** manufacturer published tables (e.g. D'Addario publishes unit weights) — verify and attribute; consider coverage across brands/materials.
- **Formula (imperial):** `T = (UW × (2 × L × F)²) / 386.4` — T in lb, UW in lb/in, L scale length in inches, F frequency in Hz. (Validate constant + units at build; provide metric variant.)
- **Defaults:** scale length 25.5" (Fender-style) and 24.75" (Gibson-style) presets; let user set custom.

### SoundFont(s)
- A decent acoustic/electric guitar .sf2 for alphaSynth (V1 default).
- Sympathetic-resonance / richer samples = deferred ("look for better samples later").

## Things explicitly NOT pulled in V1
- Crowdsourced tuning databases (deferred with contribution surface).
- Any copyrighted tab/song libraries (we render user/derived content, not a tab repository).

## Attribution / open-source hygiene
- Track each dependency's license in a top-level NOTICE/THIRD-PARTY file.
- KB data files carry their own provenance fields (where a tuning's grammar/explanation came from) — doubles as auditability for the grounding discipline.
