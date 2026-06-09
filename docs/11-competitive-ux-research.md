# Competitive / Comparative UI-UX Research

**Status:** Research output. Produced by a deep-research fan-out (104 agents, 22 sources
fetched, 88 claims extracted, 25 adversarially verified — 22 confirmed, 3 killed). Covers
four comparable categories: interactive fretboard tools, music-theory visualizers, AI/
conversational canvas tools, and multi-pane/morph UX.

**How to read confidence:** Claims tagged **[verified]** survived 3-vote adversarial
verification against a cited primary/secondary source. Claims tagged **[judgment]** are
design synthesis — the mapping onto Fretsplorer's components — and were not independently
fact-checked. **[killed]** notes a claim the verification stage refuted.

**Headline:** No surveyed tool combines degree-relative color, graded drone-tension,
per-tuning native lexicon, and multi-neck comparison. Those four are Fretsplorer's
whitespace. The landscape is otherwise mature, conventional, and absolute-name-centric —
which means Fretsplorer's risk is not "am I novel" (it is) but "do I respect the conventions
guitarists already have muscle memory for while introducing the novel layers legibly."

---

## Part A — Landscape & positioning

### A.1 Competitor catalog

| Tool | Category | What it does | Tuning handling | Naming / coloring | Openness |
|---|---|---|---|---|---|
| **Oolimo** (oolimo.com) | Fretboard / chord theory | Chord analyzer: place notes on a fretboard, get chord name(s) | **Tuning Manager** — non-standard tunings via presets **[verified]** | Absolute note names; chord-symbol output | Free web |
| **JGuitar** (jguitar.com) | Fretboard / chord theory | Chord Namer: identifies a chord from fretboard input, returns **plural candidate names** **[verified]** | Tuning selectable | Absolute; multiple names listed, not visibly ranked **[killed: "doesn't encode degrees" was refuted — it does expose some result detail]** | Free web |
| **altguitar.com** | Alternate-tuning fretboard | Alt-tuning fretboard explorer **[verified]**; unifies chord/scale on one surface **[killed: "two separate modes" refuted — it's more unified than claimed]** | Alt-tuning focused | Absolute | Free web |
| **muted.io** | Theory visualizer (incl. fretboard) | Virtual interactive fretboard | Fixed/preset drop tunings **[verified]** | **Highlights by absolute note name; no degree color** **[verified]** | Free web |
| **Soundslice** | Notation + fretboard player | Visual Fretboard tied to notation playback | **Supports non-standard tunings** **[verified]** | Note-name centric; synced to score | Commercial |
| **Hooktheory / Hookpad** | Theory visualizer / composer | Roman-numeral + scale-degree composition | Key-relative by design | **Relational (Roman numeral / degree) is the native language** **[verified]** | Commercial |
| **D'Addario String Tension Pro** | String-tension advisor | Per-string tension calculator **[verified]** | n/a | Tension governed by gauge, scale length, pitch, material **[verified]** | Free web |
| **rodrigocfd/string-tension-calc** | OSS tension calculator | Open-source tension calc **[verified]** | n/a | Single unit system **[killed: "three selectable unit systems" refuted — do NOT assume tri-unit toggle is a convention]** | Open source |

### A.2 What the landscape gets right (conventions to respect)

- **Input by placing notes/finger positions on a fretboard is the universal interaction
  model. [verified]** Fretsplorer's click-to-place is exactly what users expect — no
  re-education cost here.
- **Alt tunings are handled as presets / a tuning manager** (Oolimo, Soundslice, muted.io).
  **[verified]** Users expect a tuning picker, not freeform retuning gymnastics.
- **Chord identification returns multiple candidate names** (JGuitar). **[verified]** The
  many-names-for-one-pcset problem is acknowledged in the field — but nobody *ranks* them
  well. That's an opening (see B.3).
- **Relational/degree thinking already has a home in theory visualizers** (Hooktheory's
  Roman-numeral language). **[verified]** Degree-relative pedagogy is proven *off* the
  guitar — Fretsplorer is bringing a validated idea *onto* the fretboard, not inventing
  an unproven paradigm.

### A.3 The whitespace Fretsplorer owns

Verification confirmed the central positioning claim: **no surveyed tool labels notes by
scale degree with degree-relative color, none renders graded drone-tension, none derives a
per-tuning native lexicon, and none offers multi-neck comparison. [verified — synthesis of
muted.io/Oolimo/JGuitar absolute-name findings + absence across all 22 sources]**

The four defensible moats, in order of how unique they are:

1. **Graded drone-tension as a rendered semantic layer** — completely absent everywhere.
   Nobody visualizes "how this fretted note clashes with the ringing open." This is the
   most ownable and the hardest to copy.
2. **Degree-relative color + root-as-shape** — theory visualizers do degree thinking, but
   not *on a fretboard with color*. Guitar tools are stuck on absolute names.
3. **Native-lexicon-per-tuning** — every tool drags standard-tuning shapes (or just chord
   dictionaries) into alt tunings. Deriving the tuning's own grammar is unique.
4. **Deliberate multi-neck comparison** — tools show one board. Comparison-by-spawning is
   structurally absent.

**Positioning consequence:** Fretsplorer should not market itself as "a better chord
finder" (a crowded, conventional category it would be judged against on chord-dictionary
completeness). It should position as the **relational / alt-tuning exploration** tool —
a category of one — and treat chord identification as table stakes it does competently,
not as the headline.

---

## Part B — Actionable patterns mapped to Fretsplorer's components

### B.1 Neck stack & multi-neck comparison
- **Prior art:** Shared-element / layout transitions — matching IDs across states crossfade
  and reflow automatically (Motion `layoutId`; Android shared-element transitions).
  **[verified]**
- **Recommendation — ADAPT.** Your fret columns are already aligned across necks; pair that
  with **shared-element identity per note** so that when a neck spawns from another, each
  surviving note *animates from its old position to its new one* rather than the new neck
  just appearing. The alignment is the static affordance; the shared-element morph is the
  dynamic one. This is the same mechanism that powers your morph mode (B.5) — unify them
  under one note-identity model. **[judgment]**

### B.2 Degree-color & drone-tension visual language
- **Prior art:** Guitar tools universally use **absolute note names, no degree color**
  (muted.io explicitly). **[verified]** Hooktheory proves degree-relative encoding teaches
  relational hearing. **[verified]**
- **Recommendation — ADOPT your own plan, with one guardrail.** Your dual-channel design
  (color = degree, shape = root, line/halo = drone-tension) is genuinely ahead of the field.
  The guardrail: because *every* tool a guitarist has used labels by note name, the
  **note-name label mode must be trivially reachable** (not buried). Keep degree-number as
  default for pedagogy, but treat the note-name toggle as the bridge that stops a new user
  feeling illiterate on first contact. **[judgment, grounded in the verified absolute-name
  ubiquity]**
- **Pitfall to avoid:** don't let drone-tension and degree-color compete for the same
  pixel-role — your CONTEXT.md already enforces this (fill = degree, line/halo = tension).
  The research reinforces it: overloaded color channels are the #1 legibility failure in
  dense theory UIs. **[judgment]**

### B.3 Live Readout panel & tiered disclosure
- **Prior art:** JGuitar returns **plural candidate names** but doesn't rank or explain
  them. **[verified]**
- **Recommendation — ADAPT.** Your tiered disclosure (relational headline → absolute
  subline → bass/degree → anatomy → ranked candidates) is the right shape *and* fixes the
  field's gap. The specific upgrade over JGuitar: **rank the candidates and show the bias
  reason** ("ranked #1 because the open D is your tonic"). The competitor surfaces a flat
  list; your edge is the *why this name over that one*. **[judgment]**

### B.4 Conversation / AI panel + canvas interplay
- **Prior art:** **Where AI sits in the UI is not cosmetic — it shapes the whole
  interaction. [verified]** ChatGPT Canvas uses a **dual-pane layout where the document
  (canvas) is primary and the chat is secondary**, and supports **targeted inline editing
  (select content → prompt against it). [verified]** AI interfaces cluster into ~7 recurring
  patterns. **[verified]** **Citations should sit *beside* the claim**, because **users
  rarely click citation links** in chat. **[verified]**
- **Recommendations:**
  - **ADOPT the canvas-primary / chat-secondary hierarchy.** Your neck stack is the canvas;
    the conversation is the assistant. Your three-region shell already puts conversation in
    the right rail — keep the necks dominant. The ADR-0005 "should conversation be more
    central" open question: the research leans **no** — canvas-primary is the validated
    pattern. **[judgment, grounded]**
  - **ADOPT highlight-then-prompt.** Let the user select a note / string / phrase on the
    neck or in the Readout and prompt *against that selection* ("make this one an open
    drone"), mirroring Canvas's inline editing. This is a more natural deixis than typing
    "the third" and resolving against focus. **[verified pattern → judgment mapping]**
  - **ADAPT provenance display.** Since users rarely click citations, render grounding
    **inline next to the claim** in the Readout/conversation, not as a footnote link. Your
    provenance discipline is wasted if it's a click away. **[verified]**

### B.5 Morph / translate animation
- **Prior art:** Shared-element transitions via matched IDs; Motion auto-animates layout
  position changes. **[verified]** **Most UX animations should run ~200–500ms**;
  **substantial changes (modals, big reflows) warrant longer.** **[verified]**
- **Recommendation — ADOPT with timing discipline.** Your string-by-string sequential
  retune is pedagogically right (follow the causality). Tune each per-string slide to the
  **200–500ms band**; the *full* multi-string morph is a "substantial change" so a longer
  total is justified — but gate it behind your scrub/replay control so it's deliberate, not
  a forced wait. Honor `prefers-reduced-motion` with the stepped/instant fallback you
  already spec'd. **[verified timing → judgment]**
- **Off-neck ghosting** has no direct prior art found; it's a genuine novelty. Keep it.

### B.6 Capo authoring
- **No strong external prior art surfaced.** Click-to-drop + drag-across-strings is
  reasonable. **Pitfall:** drag-to-make-partial is a discoverability risk (hidden gesture).
  Pair it with an explicit affordance (a draggable capo chip, or a per-string toggle in a
  capo popover) so the gesture is a shortcut, not the only path. **[judgment]**

### B.7 Onboarding to a tuning's grammar
- **Prior art:** Hooktheory teaches relationally and is the closest pedagogical model.
  **[verified]** Guitar chord *diagrams* are the universal literacy unit guitarists already
  read. **[verified]**
- **Recommendation — ADAPT.** Your grammar-card left rail is the right container. Seed it
  with the tuning's movable shapes rendered as **familiar chord-diagram-style minis** (the
  literacy users already have) that, on click, spawn a full neck. Bridge from the known
  (chord diagram) to the novel (degree color + drone tension on the full neck). **[judgment]**

### B.8 String-tension advisor presentation
- **Prior art:** D'Addario String Tension Pro computes per-string tension from **gauge,
  scale length, pitch, material**. **[verified]** **[killed: the "three unit systems"
  claim was refuted — do NOT assume a tri-unit kg/lb/N toggle is an established
  convention.]**
- **Recommendation — ADAPT, and reconsider the unit plan.** Your "relative to standard
  tuning" framing (looser/tighter than the familiar baseline) is a real improvement over
  D'Addario's raw-force readout — keep it. **But** since the multi-unit-toggle convention
  was refuted, don't over-invest in lb/N/kgf switching; pick the one unit that serves the
  comparison framing (relative %, or lb against the standard-tuning anchor) and keep break-
  risk as an absolute safety flag. Consider a **per-string line/bar chart** so floppy vs.
  break-risk reads at a glance rather than as a table of numbers. **[judgment]**

### B.9 App shell / collapsible three-region layout
- **Prior art:** Canvas-primary dual-pane (ChatGPT Canvas) validates a dominant work surface
  with a secondary assistant rail. **[verified]**
- **Recommendation — ADOPT.** Three-region collapsible shell with collapsible flanks is
  well-aligned. The only research-driven nudge: ensure the **center (neck stack) is the
  visual gravity center** at all times — flanks should feel like instruments serving the
  necks, never co-equal panes competing for attention. **[judgment]**

---

## Pitfalls to consciously avoid

1. **Absolute-name lock-in (the field's default).** Every competitor anchors on note names.
   Fretsplorer's degree-relative bet is the differentiator — but the *failure mode* is a new
   user bouncing because they can't find the note names they know. Mitigation: one-tap
   note-name label mode (B.2). **[verified ubiquity → judgment]**
2. **Hidden gestures.** Drag-to-partial-capo and select-to-prompt are powerful but
   undiscoverable if they're the only path. Always provide a visible affordance alongside.
   **[judgment]**
3. **Citations as click-away footnotes.** Users don't click them. Inline the grounding.
   **[verified]**
4. **Over-engineering the tension unit toggle.** The tri-unit convention was refuted; don't
   build switching machinery users won't use. **[killed]**
5. **Animation that blocks.** Keep per-element morphs in the 200–500ms band; never make the
   user wait through an auto-looping morph. **[verified]**

## Conventions so standard that deviating would confuse guitarists

- **Place-notes-on-a-fretboard input.** Universal. Fretsplorer matches it. ✓ **[verified]**
- **Chord diagrams as the literacy unit.** Lean on them for onboarding (B.7). **[verified]**
- **Tuning-as-preset (a tuning picker).** Expected. Fretsplorer matches it. ✓ **[verified]**
- **Note-name availability.** Even if degree is your default, note names must be one tap
  away — their absence reads as "broken," not "opinionated." **[verified ubiquity]**
- **Orientation:** the research did not return a clean verified ruling on horizontal-vs-
  vertical or string order (the fesleymusic source on "why tabs are upside down" was rated
  unreliable and yielded no verified claims). Your choice (horizontal, high-E top, matching
  Guitar Pro + TAB) is internally consistent and matches a major tool; treat it as settled
  on those grounds rather than on this research. **[not verified — flagged honestly]**

---

## Method notes & limitations

- 5 search angles, 22 sources fetched, 88 claims, 25 verified (top-ranked by the harness;
  **7 lower-priority claims were budget-dropped before verification**).
- Source quality skew: fretboard-tool and tension claims are **primary** (the tools'
  own pages). AI-canvas interaction claims lean on **blogs**, partially corroborated by
  NN/g (primary) and OpenAI. Treat B.4 as well-supported-but-not-all-primary.
- Time-sensitive (2024–2026): AI-canvas product behavior changes fast; re-verify ChatGPT
  Canvas / Claude Artifacts specifics at build time.
- The final synthesis stage collapsed the verified claim set into one summary blob; this
  document reconstructs the structure from the individual verified claims + source ratings,
  so the **[judgment]** mappings carry my reasoning, not independent verification.
- **Not found (genuine gaps in coverage), worth a follow-up pass:** dedicated DADGAD/open-
  tuning explorer UIs; GuitarToolkit / Fretboard.org / Scales-Chords specifics; solfège-
  color systems; the orientation/string-order convention question.

---

# Pass 2 — gaps + net-new scope (harmonic motion, translation, playability)

**Status:** Second deep-research run (105 agents, 23 sources, 103 claims, 25 verified). Aimed
at the Pass-1 gaps **and** the net-new scope from [12-graduation-harmonic-translation.md](12-graduation-harmonic-translation.md)
(harmonic motion, cross-tuning translation, two-hand playability, notation-as-surface).

> **READ THIS FIRST — verification was cut short by a session token limit.** The run hit the
> cap *during* the verify phase. The **5 findings below all verified 3-0 before the outage**
> and are solid. But **9 claims show as "killed" that are actually 0-0 *abstentions*** — the
> verifier agents died, they were never refuted. So claims like "MuseScore fretboard diagrams
> are left-hand only," "Soundslice's fretboard is an input not the source of truth," and
> "explorable explanations = manipulate-params→linked-view-recalculates" are **unverified, not
> disproven** (they are probably true). Treat the §"Still-open gaps" list as *no verified
> evidence yet*, not *evidence of absence*.

## Pass-2 Part A — landscape additions

| Tool / source | Category | Finding | Confidence |
|---|---|---|---|
| **fretboard.js** (moonwave99) | OSS fretboard renderer | **ISC-licensed** (OSI, MIT-equivalent). Supports **interval/degree-relative dot styling** (`style({filter:{interval:'1P'}})` — match dots by `1P/3M/5P`) and **preset + arbitrary alt tunings** (`default/halfStepDown/dropD/openG/DADGAD` + custom arrays). **Pure renderer — no pedagogy, no shape-grammar.** | high (3-0) |
| **Tab Transposer** | Cross-tuning utility | Exposes **two named modes**: "By Key" (changes pitch) vs **"By Tuning" = pitch-preserving** (recomputes frets for the same sounding pitch). Out-of-range notes flagged with `@`. | high (3-0) |
| **Guitar Pro 8** | DAW/notation | Retune dialog exposes **"Automatic Adjustment" (pitch-preserving)** vs **"Keep Finger Positions" (shape-preserving)** — two explicit user choices. *Pitfall:* GP labels the pitch-preserving option inconsistently across UI surfaces (a naming bug, not behavioral). | high (3-0) |
| **Hookpad** (Hooktheory) | Progression composer | **Roman numerals are the DEFAULT primary chord label; absolute names are the subordinate sub-label** (reversible). Non-diatonic motion shown via **applied-chord slash notation (V/ii)**, authored **pick-function-then-target**. | high (3-0; page was 403, corroborated indirectly) |
| **Neo-Riemannian / Tonnetz / Z-Tonnetz** | Harmony visualization | A **relational, non-functional** model of harmonic motion: moves between chords are **single-letter transforms (P/L/R/S/N/H)** — transform-as-edge. Color can encode **function, not pitch** (Z-Tonnetz; weaker 2-1 claim). Node *position* still encodes pitch. | high (3-0); color claim 2-1 |
| **KTH fingering thesis** (Grozman & Norman) | Playability research | Best-established model = **graph shortest-path via dynamic programming**: nodes = per-note fingerings `(string, fret, finger, duration, hand-position)`, soft edge costs = biomechanical transition difficulty. **Explicitly ignores the right hand; monophonic.** | high (3-0 / 2-0; single non-peer-reviewed source) |

**Positioning consequence:** Pass-1 whitespace holds, and **two new whitespace items emerge**:
(1) **right-hand / tapping playability** is unsolved everywhere (left-hand has solid prior art;
the right hand has none); (2) **cross-tuning translation as a taught, relational act** — the
two tools that do dual-mode translation treat it as a mechanical transpose, not a pedagogical
"here's what your shape *becomes*."

## Pass-2 Part B — patterns mapped to components

- **Cross-tuning translation → ADOPT explicit dual-mode, named consistently.** Two independent
  tools prove users tolerate and benefit from pitch-preserving vs shape-preserving as an
  *explicit, named choice* — strong validation of [docs/12 §3.2](12-graduation-harmonic-translation.md).
  Borrow Tab Transposer's **`@` off-range flag** for your "ghosted off-neck" callout. **AVOID**
  Guitar Pro's mistake: name the two modes *identically everywhere* (GP's inconsistent labels
  are a documented confusion). [verified]
- **Readout hierarchy → ADOPT (already aligned).** Hookpad makes degree-relative the *primary*
  label and absolute the *subordinate* one — exactly your Readout's relational-headline →
  absolute-subline tiering. The field's leading relational tool agrees with your default. [verified]
- **Harmonic-motion walkthrough → ADAPT transform-as-edge.** Neo-Riemannian transforms (P/L/R…)
  model each progression step as a **labeled relational MOVE between chords**, not just "the
  next chord's name." This is the missing vocabulary for *motion* (vs. naming static chords) and
  fits the rhythm-agnostic, drone-relational ethos. **ADOPT** Hookpad's **applied-chord slash
  notation (V/ii)** to surface secondary dominants / modal interchange as visible moves. **AVOID**
  adopting full Tonnetz *geometry* — node position encodes pitch and won't map onto a fretboard
  mental model. [verified; Tonnetz-color caveat 2-1]
- **Rendering substrate → ADOPT fretboard.js, ADAPT with a lexicon layer.** ISC license is
  OSS-compatible; its interval-filter styling maps *directly* onto your degree-relative coloring;
  alt tunings are first-class. It is *only* a renderer — the native-lexicon / drone-tension /
  pedagogy layer is yours to build on top. Strong "don't build the SVG neck from scratch"
  signal for a UI-first build. [verified] *(Validate: does its dot-styling reach your dual-channel
  needs — root-as-shape + line/halo drone status — or only fill color?)*
- **Two-hand playability → ADOPT the left-hand DP model; OWN the right hand.** Use the
  KTH graph/soft-cost approach for left-hand reachability/stretch grading (cost-graded, surfaced
  visually). The right-hand/tapping model has **no prior art to adopt** — it is whitespace
  Fretsplorer must design itself. Directly resolves the implementation half of
  [docs/12 §3.3](12-graduation-harmonic-translation.md). [verified]

## Still-open gaps (no *verified* evidence — outage, not absence)

These were requested but produced no surviving claims (verification cut short):
1. **Notation-as-primary-surface** (Soundslice / Flat.io / MuseScore-web / Noteflight / Songsterr):
   synced cursor, click-to-edit, fretboard↔notation highlighting, when a score earns "primary"
   status. **The [docs/12 §2.3](12-graduation-harmonic-translation.md) notation-pane-promotion
   question has NO verified prior art yet** — the grill must resolve it from first principles or
   a targeted re-run.
2. **Progression step-through UX** in Scaler 2 / Captain Chords / ChordChord / Odesi / Chordify
   — how "now" vs "the journey" is shown, rhythm-agnostically.
3. **Cross-domain step-through grammar** (algorithm visualizers, debuggers, explorable
   explanations) for the unified morph+walkthrough scrubber gesture.
4. **Orientation / string-order conventions** — unresolved across *both* passes; still no
   reliable evidence. Treat your horizontal / high-E-top choice as settled on "matches Guitar
   Pro," not on research.
5. **Solfège-color (Kodály/Curwen)** and keyboard degree-relative color systems.

**Source-quality notes:** fretboard.js, Tab Transposer, GP8, neo-Riemannian (Open Music
Theory), and the KTH thesis are **primary**. Hookpad's page returned **HTTP 403** — confirmed
via consistent search summaries + forum + a 2026 review (adequate for non-extraordinary
feature claims, but not a direct read). Z-Tonnetz color-encodes-function is **interpretive**
(2-1; no prose docs, tool self-described "highly experimental"). The two-hand gap rests on a
**single non-peer-reviewed** thesis. A re-run after the limit resets could close gaps 1–3 cheaply.
