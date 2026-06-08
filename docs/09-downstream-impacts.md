# Downstream Impacts (consolidated)

Every "this pushes back on an existing doc" produced by the four parallel build paths
(Design/UI, Knowledge/Data, Decisions, Orthogonal), gathered into one place and **grouped by
the doc each impact affects**. Source lane is tagged on each item: **[KB]** Knowledge/Data,
**[UI]** Design, **[ORTH]** Orthogonal (tension + render), **[DEC]** Decisions.

ADR numbers here use the **flat consolidated sequence** (`docs/adr/0001`–`0012`). Originals:
this merge replaces the root `DOWNSTREAM-IMPACTS-kb.md` (KB lane) and §4 of `08-ux-design.md`
(UI lane); both are preserved in git history.

---

## → `00-overview.md` / `01-feature-set.md` (vocabulary)

- **[KB] Split "home chord" from "tonic."** They conflate the open-string sonority with the
  key center. **Tonic** = stored pitch-class key center (authorial); **home chord** = derived
  open-string sonority. They coincide for open tunings, diverge for DADGAD (Dsus4) and Drop D
  (no clean triad). Resolved in `CONTEXT.md` (see the "Home chord" vs "tonic" flagged
  ambiguity). (ADR 0001 — KB schema/authoring)

## → `02-scope.md` / `05-external-data.md` (seed tunings & scope)

- **[KB][UI] Finalize the seed list and add EADGBE (standard) as first-class.** Committed V1
  set: **Open G, DADGAD, Drop D, EADGBE, Open D** (chosen for schema coverage:
  clean-major / modal-sus / no-home-triad / standard / generalization-check). Stretch: Open C,
  Open E, double-drop D. `05` currently omits EADGBE; the UI session independently argued for it
  (CAGED-as-emergent-shape becomes the flagship demonstration of the thesis) — agreed. Adds an
  EADGBE grammar card to M2.
- **[KB] V2 expansion target = custom tunings, not more curated cards.** The marginal value of
  curated cards #6–8 is low; the global-rules + computed-facts design (ADR 0002) + R3 shape
  derivation are the real growth lever. A scope-framing note for `02`.
- **[ORTH] The string-tension/setup advisor is an accepted expansion effort, not critical
  path** (`02` "default soundfont fine for V1; better samples later"). V1 coverage is
  **D'Addario-only** (plain steel, nickel round wound, phosphor bronze); more brands/materials
  and the missing mid acoustic gauges are a V2 improvement, each gated on reproducing the
  source's published reference tensions. (ADR 0009)
- **[ORTH] New `05` external-data dependencies to attribute:** alphaTab (MPL-2.0) + its bundled
  Bravura font (OFL-1.1) and sonivox soundfont (Apache-2.0); D'Addario unit-weight tables; ASTM
  A228 music-wire tensile strengths. All recorded in `NOTICE.md`. (ADRs 0009, 0010, 0011, 0012)

## → `03-architecture.md`

### Knowledge base section [KB]
1. **Drop the `/kb/.../provenance/` directory.** Provenance is an **inline first-class field**
   on every card and rule; `/kb/sources` holds only the reusable bibliography keyed by id.
   (ADR 0001) — already reflected in the corrected `03` module-boundaries block.
2. **"Drone map" and "barre rule" are NOT stored card content — they are DERIVED.** `03`
   listed them under card contents; both are reclassified as computed from `strings + tonic`
   (+ rules). The card stores `strings, tonic, movableShapes, provenance, capoBehavior?,
   idiomaticProgressions?, references?`. (KB Q7)
3. **`project()`/`identify()` output contract carries a graded drone-tension value** per open
   string (the 5-level scale, ADR 0004) — independently surfaced by the UI session (below).
   Both paths must agree on the 5 ranks.
4. **MCP tool-output contract must carry per-claim traces** (KB entry id or `computed`) so the
   R9 grounding harness can verify every checkable assertion mechanically. (ADR 0003)

### From the UI session [UI]
1. **`project()`/`identify()` output contract gains graded drone-tension per open string** —
   the UI's drone map demands a graded value (safe ↔ semitone bite ↔ tritone) relative to the
   current context, not just a degree. Tightens the `project()` signature; couples to R2.
   (Same impact as KB #3 above — both lanes converged on it.)
2. **Open/ringing position is per-string and capo-relative.** The UI computes an **effective
   nut per string**; capo = a **per-string capo-fret** model (matches `03`'s per-string pitch
   shift; generalizes to multiple capos). **Render shows absolute frets + clamp overlay —
   explicitly NOT renumbered.** Flagged so no one later "simplifies" capo into a renumbered
   nut, destroying the pedagogical fret anchor.
3. **Deixis is resolved by MCP + focus pointer at neck granularity** — the fretboard surface
   needs **no per-note selection state** in V1. A genuine simplification of the surface's state
   model.
4. **`identify()` is confirmed in the live hot loop** (runs on every grip change); only
   alphaTab is excluded. Reinforces `03`'s "identify is lightweight client code."
5. **New top-level component: the Readout panel** — an always-live, structured `identify()`
   mirror, distinct from the conversation. Binds directly to the `identify()` contract and the
   focus pointer.

### From the Decisions / Orthogonal lanes [DEC][ORTH]
6. **[DEC] music21/Tier-3 delivery resolves the `d_music21` infra fork as fully static** —
   client-side Pyodide, lazy-loaded; **no backend, no CORS, no hosting** in the V1
   architecture. music21 stays out of `/core`. (ADR 0008)
7. **[DEC] `/core` pitch model is MIDI-integer / pitch-class, chord-vs-voicing as a typed
   multiset distinction**, forced to agree with the grammar-card schema. The spine binds to
   `project()`/`identify()` type signatures. (ADR 0007)
8. **[ORTH] alphaTab is a render-and-playback target via emitted AlphaTex** (a pure
   `fragmentToAlphaTex` adapter, no Score-API coupling), kept out of the hot loop — consistent
   with `03`'s "alphaTab is a component, not the foundation." (ADRs 0011, 0012)

## → `06-research-directive.md` (research items) [KB]

- **R2 (Tier-1 vocabulary):** specified — see `kb/TIER1-VOCABULARY-SPEC.md`, ADR 0004.
- **R3 (shape derivation, deferred):** the `movableShapes` schema is built so R3 emits into the
  *same* structure a human authors today — contribution-readiness satisfied.
- **R4 (T1↔T2 handoff):** the A–E taxonomy doubles as the router — "can't be framed by A–C" is
  the handoff trigger. Threshold tuning still R4's job.
- **R5 (ranking):** algorithm = engine code; **weights = tunable data** (`ranking-weights.yaml`).
  Surface policy: 1 primary + alternates within a score gap, cap 3.
- **R9 (grounding harness):** fed by stable entry ids + provenance + per-claim tool traces;
  asserts every checkable claim is traceable and `editorial` claims are hedged. (ADR 0003)
- **R10 (re-entrant / partial capo):** schema imposes no monotonic ordering on `strings`; capo
  is a runtime per-string shift vector (parallel to `strings`), never stored. Engine end-to-end
  test is still R10's job.
- **R11 (seed list + card schema):** delivered — schemas under `/kb/schema`, Open G authored +
  verified.
- **[ORTH] R1 (music21 delivery), R8 (soundfont), R12 (render path):** resolved by spike +
  ADRs 0008 / 0012 / 0011 respectively.

## → `07-build-sequencing.html` (build map)

- **[UI] `find_voicings` + playability (R6) wires into the UI earlier** than its "parallel
  after core" slot implies — the "discovered grip is hard → ask for an easier way → land on a
  different voicing" flow needs a **playability signal in the Readout** and an **"easier way?"
  affordance** that spawns alternative voicings as comparison necks. Bring a minimal
  playability flag forward toward M1/M2.
- **[UI] The `ux` node now has concrete output** (`08-ux-design.md` + ADRs 0005 app shell /
  0006 SVG surface), unblocking `fretboard` (the M0 node) with a real spec: SVG, 24 frets, the
  dot vocabulary, the drone channel, the click model, and the shell regions.
- **[UI] Drone map is no longer "just color the open strings"** — it is a graded, capo-relative,
  second-geometry layer (string line + nut/capo halo). M0/M2 fretboard work should budget for
  that channel and the effective-nut computation.
- **[DEC] The `d_music21` fork (flagged in `07` as able to force structural rework if deferred)
  is resolved to static** — removes the service-layer branch from the build map. (ADR 0008)

---

## Provisional / review-later [KB]

- **Affective dictionary is PROVISIONAL.** Schema + 3 seed vibes shipped as *recommended* only;
  review post-build for whether it earns its place. The `provenance.kind: editorial` honesty
  guard stays regardless. (User: "I need to see it in action.")
- **`sources/references.yaml` has `to-verify` citations** — confirm at build (05
  verify-at-build); no shipped V1 claim should rest on a `to-verify` source.

## New, unbuilt requirement these sessions force

- **[KB] MCP tools must emit per-claim provenance traces** (see Architecture → KB #4) — not
  anticipated as an explicit contract in `00`–`07`, but required by the grounding design.
  Belongs to the `/mcp` build, flagged now so the tool signatures are designed for it from the
  start. (ADR 0003)
