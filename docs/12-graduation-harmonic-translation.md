# The Graduation: From Chord Finder to Harmonic Translation-Layer Visualiser

**Status:** EXPLORATION-STAGE — pre-grill. This doc captures a vision expansion while it is
still being explored, so a focused `grill-with-docs` session can take it, stress-test it
against the domain model in [CONTEXT.md](../CONTEXT.md), sharpen the terminology, and promote
the settled parts into the canonical docs (`00`, `04`, `08`) + ADRs. **Nothing here is
decided.** Open questions are flagged inline as **[GRILL]**.

**Relationship to existing docs:** extends the core reframe in [00-overview.md](00-overview.md)
(geometry → pitch) from *single chords* to *harmonic motion* and *cross-tuning translation*.
Touches the intent verbs in [04-user-intent-flows.md](04-user-intent-flows.md) (`translate`,
`neighbors`, `function_of`, `feeling_to_options`) and the notation pane's role in
[08-ux-design.md](08-ux-design.md) / [CONTEXT.md](../CONTEXT.md).

---

## 1. The thesis: a four-rung ladder

The product is not a chord dictionary with extras. It is a ladder, and the upper rungs are
the actual product:

1. **Identify** — "what am I holding?" (single shape → relational name). *Built.*
2. **Relate** — how the shape sits against the drone / home context (`function_of`,
   drone-tension). *Built.*
3. **Sequence** — how chords **move**; harmony as motion over time. *New rung.*
4. **Communicate** — say it to another musician (Tier-3 outward translation). *Sketched
   (Flow 4), but only at single-chord granularity.*

A chord dictionary stops at rung 1. Chords are the *entry point* to harmony; **harmony is
the sequence.** Rungs 3–4 are the graduation.

### 1.1 Why relational naming is foundational, not cosmetic

**Relational naming is the only representation of harmony that survives a tuning change.**

A standard-tuning player carries a progression as *remembered shapes* (G→C→D = three muscle
memories). Retune, and the shapes are invalid — so they fall back to ears and "feel." That is
not a skill gap; it is that **their harmonic vocabulary was encoded in geometry, and the
tuning invalidated exactly that** (the `00` reframe, applied to progressions). Name each chord
*relationally* against the home context (I, IV, vi… or "home chord + 9, open D ringing") and
the **progression becomes portable, communicable, and transferable** — the cure for "operating
on ears and feel" is not "play more carefully," it is *give feel a vocabulary that does not
evaporate when you retune.*

### 1.2 Fixed scope boundaries (premises — not relitigated)

Two boundaries, settled, that the rest of this doc depends on:

- **The project is rhythm-agnostic.** It models harmony, pitch, shape, and playability —
  **not rhythm.** Consequence: a "progression"/"sequence" (rung 3) is an **ordered set of
  harmonic moments, not a rhythmic score**; the walkthrough scrubs *harmonic* moments, not
  beats/meter; "rearrange the nonsense" (§3.3) is a harmonic + playability operation, never a
  rhythmic one. The notation pane may *render* rhythm visually (alphaTab), but rhythm is
  neither analysed nor named. Math rock's complexity is largely rhythmic; that complexity is
  deliberately out of scope.
- **Playability ≠ string tension. Both are physical, but they are different axes.**
  - **Playability** = "what is playable?" — a **hand-geometry** model. It is what bounds
    shape-preserving translation and rearrangement (§3). It maps to the **shapes**.
  - **String tension** = force on a string; governs **only** three narrow concerns — *ringing
    a note out (sustain), fretting (press-force), and bending.* It maps to the **strings**.
  - The harmonic ↔ string-tension orthogonality asserted in [CONTEXT.md](../CONTEXT.md)
    **holds.** Tension is never an input to "is this shape executable." (Thread-1 resolution:
    the meeting point of harmony and the physical world is **playability-geometry**, not
    tension.)

---

## 2. Harmonic motion (rung 3) — sequence over time

### 2.1 Space vs time

- The **neck stack** is a **spatial** axis — it compares chords at one moment across tunings/
  voicings (fret-aligned).
- A **progression** is a **temporal** axis — same tuning, chords across time.
- The neck stack structurally cannot hold a progression. **That is the gap the notation pane
  fills.** AlphaTab stops being "show it written" and becomes **the time axis of the
  instrument.**

### 2.2 One interaction grammar for two axes

The existing **morph scrubber** and a new **progression walkthrough** are the same gesture:

> **scrub a timeline → the focused neck and Readout re-render at each step.**

- **Morph** scrubs the **tuning** axis (same shape, tuning changes — watch notes slide).
- **Walkthrough** scrubs the **harmonic** axis (same tuning, chords advance — watch shapes
  change and the relational name update).

Unifying them: necks show "now," the timeline shows "the journey," stepping narrates it
relationally. The verified research patterns (timeline-slider; shared-element transitions;
200–500 ms per element) serve both with one implementation. See
[11-competitive-ux-research.md](11-competitive-ux-research.md) §B.1, §B.5.

### 2.3 The honest fork this forces

Current docs pin the notation pane down: [CONTEXT.md](../CONTEXT.md) calls it "slow cadence …
**never in the hot interactive loop and never the source of truth**"; [08](08-ux-design.md)
docks it collapsed at the bottom. Promoting it to a scrubbable primary surface contradicts
that. Ripples:

- **[GRILL] Source of truth.** If chords are sequenced *in* the notation pane, is the sequence
  authored there, or is notation still a *time-ordered view* of necks placed on a timeline?
  (Leaning: necks stay truth, notation is the temporal view — preserves grounding discipline.)
- **[GRILL] Layout gravity.** A docked-collapsed bottom strip can't host a primary
  interaction. Does the three-region shell need a fourth consideration — *time*?
- **[GRILL] Tier-3 scales up.** "Tell the pianist" stops being one chord's anatomy and becomes
  "here's the progression, relationally, for your section to read." Bigger, more valuable.

> **Prior art (Pass-2 research):** this question has **no verified prior art yet** — the
> notation-as-primary-surface angle (Soundslice / Flat.io / MuseScore-web / Noteflight /
> Songsterr: synced cursor, click-to-edit, fretboard↔notation highlighting, when a score earns
> "primary" status) produced **no surviving claims** because the run's verification phase was
> cut short by a token limit (absence of evidence, not evidence of absence). The grill must
> resolve §2.3 from first principles, or a cheap targeted re-run can close it first. See
> [11 §Pass-2 "Still-open gaps"](11-competitive-ux-research.md).

> **Prior art for the walkthrough itself (Pass-2, verified):** **neo-Riemannian transforms**
> (P/L/R/S/N/H) model each step of a progression as a **labeled relational *move* between
> chords** (transform-as-edge), not merely "the next chord's name" — the missing vocabulary for
> harmony-as-*motion*, and a natural fit for the drone-relational, rhythm-agnostic ethos.
> **Hookpad's applied-chord slash notation (V/ii)** is the validated way to surface secondary
> dominants / modal interchange as *visible* relational moves. **Avoid** adopting full Tonnetz
> *geometry* (node position encodes pitch; won't map onto a fretboard). See
> [11 §Pass-2](11-competitive-ux-research.md).

---

## 3. The translation layer (the concept not yet nailed)

### 3.1 Why tunings persist — the dichotomy that drives translation

Across genres, from their roots in country and blues, players retune for one of two reasons
(often both, in different proportions):

- **Tonal expansion** — sonorities you can't easily get in standard: drones, ringing
  open-string voicings, stacked-interval beds, extended/wider voicings. *About the sound.*
- **Technique / domain expansion** — the retuning rearranges the geometry so physically
  different things become playable: slide (a straight bar = a chord), fingerpicking rolls,
  and — at the extreme — **math rock**'s tapping, sweeping, harp harmonics. *About the hand.*

Historical grounding: blues → slide (domain) + drones (tonal); country/folk → picking rolls
(domain) + ring (tonal); DADGAD → modal bed (tonal) + easy modal moves (domain); math rock →
domain expansion taken to the extreme.

**This dichotomy is a design axis, not just trivia: the translation layer must answer
whichever want drove the retune.**

### 3.2 The model: hold one input fixed, solve for the third

A note is `pitch = f(geometry, tuning)`. Translation = change the tuning, hold one input
fixed, solve for the other. That yields **two opposite operations**, lining up exactly with
the two reasons tunings exist:

| Operation | Held fixed | The question | Serves | Maps to | Status |
|---|---|---|---|---|---|
| **Pitch-preserving** | the **sound** | "same notes — where do they live in the new tuning?" | communication; "my standard chord in DADGAD" | **tonal** expansion | = today's morph |
| **Shape-preserving** | the **hand** | "same finger-pattern — what does it *become* here?" | math rock; "I tapped this — what *is* it?" | **domain** expansion | **MISSING** |

(A third operation — fix tuning, change geometry — is just in-tuning exploration:
`neighbors`. Not translation.)

The app today only does the top row. The unsolved concept is the bottom row.

> **Prior art (Pass-2 research, verified):** the pitch-/shape-preserving split is **not novel —
> it is a solved, validated interaction pattern**, exposed as two *named* user choices by both
> **Tab Transposer** ("By Key" vs "By Tuning") and **Guitar Pro 8** ("Automatic Adjustment" vs
> "Keep Finger Positions"). This strongly validates surfacing it as an explicit choice, not a
> hidden default. Borrow Tab Transposer's `@` off-range flag for the ghosted-off-neck callout.
> **Pitfall to avoid:** GP labels the modes *inconsistently* across screens — name them
> identically everywhere. What stays novel is translation as a *taught, relational* act (those
> tools do a mechanical transpose; neither names what the shape *becomes*). See
> [11 §Pass-2](11-competitive-ux-research.md).

### 3.3 Shape-preserving translation IS "rearrange absolute nonsense"

The math-rocker found a pattern with their fingers; it is harmonically opaque even to them.
Shape-preserving translation is **geometry → meaning**: take the physical thing they did, name
each moment relationally, give the nonsense a vocabulary. *Only then* can they rearrange it.

**Crux — rearrangement must respect the domain reason.** You cannot "fix" a math-rock voicing
into a tidy triad if that destroys the tapping ergonomics that were the entire point. So
rearrangement is **constrained optimization: improve harmonic legibility while staying inside
the playability envelope.** That is `feeling_to_options` + `neighbors`, bounded by the *hand*,
not only the *ear* — where "the hand" is the playability model below, **not** string tension
(§1.2).

**RESOLVED — what bounds translation is a two-hand playability model, not tension.**
"Preserving the technique" reduces to one question — **"what is playable?"** — answered by a
hand-geometry model. The complexity is that domain-expansion idioms (math rock especially) use
**both hands to place notes**: left hand fretting *and* right hand **tapping**. So the
playability model must be **two-handed**. This extends the planned `find_voicings` playability
scoring ([R6](06-research-directive.md)), which currently models only the **left** hand
(span ≈4–5, finger count, barre feasibility). The right-hand/tapping model is the keystone
implementation that makes shape-preserving translation real.

> **Prior art (Pass-2 research, verified):** the split is real and asymmetric. The **left hand
> has solid prior art** — the established model treats fingering as a **graph shortest-path
> (dynamic programming)**: nodes = per-note fingerings `(string, fret, finger, duration,
> hand-position)`, soft edge costs = biomechanical transition difficulty (ADOPT this for
> left-hand reachability/stretch grading). The **right hand / tapping has NO prior art** — the
> leading model *explicitly* ignores it and is monophonic, and no inspectable tool models
> two-hand tapping technique. So the right-hand model is **additional whitespace Fretsplorer
> must design from scratch**, with no pattern to borrow. See [11 §Pass-2](11-competitive-ux-research.md).

- **[GRILL — scope, not concept]** Does the **right-hand (tapping) playability model** land in
  V1, or is V1 left-hand-only with two-hand deferred? (Conceptually settled; this is a
  sequencing/scope call. Left-hand-only still serves tonal-expansion translation; two-hand is
  what unlocks the domain-expansion / math-rock case.)

**RESOLVED — the "no clean name" case is just the Tier-3 floor, not new machinery.** When a
voicing has no Tier-1 frame and no clean Tier-2 symbol, it falls through to **Tier 3 (music21),
which names *any* multiset** — root/bass/inversion, doubling/omission, Roman numeral. The floor
always answers; there is no "honest-blank" stance to design. *Nearest-coherent rearrangement*
is a **separate, optional rung-4 operation** (the constrained optimization above), **not** the
answer to "what is this." Do not conflate "name the nonsense" (T3, always available) with
"rearrange the nonsense" (optional, playability-bounded).

### 3.4 The three values of translation, each given a home

The reasons translation matters (player's framing) now each map to a mechanism:

1. **Refer back to self-knowledge** → the **anchor**. Translation is always relative to what
   the player already knows (usually standard / CAGED). The **origin-neck "yours" marker** is
   already the anchor primitive; the translation layer reads from it.
   **[GRILL]** Is the anchor always standard tuning, or user-selectable?
2. **Grow vocabulary** → **pitch-preserving** translation: "this new sound is *that* familiar
   function, relocated."
3. **Rearrange nonsense** → **shape-preserving** translation + bounded rearrangement: "this
   geometric accident means *this*, and here's the nearest coherent version your fingers can
   still play."

### 3.5 Direction asymmetry

- **[GRILL]** Translating **FROM standard TO alt** (learning a new tuning, growing vocabulary)
  vs **FROM alt TO standard** (communicating; rearranging the nonsense into something legible)
  may be different UX flows with different defaults. Are they one feature or two?

---

## 4. What "translation-layer visualiser" means as the product

Chord finder → harmonic explorer → **translation-layer visualiser**: the player can *see*
geometry become meaning, and watch meaning relocate across tunings — both axes scrubbable
under one grammar (§2.2). The visual is the teaching act; the relational name is what makes it
portable; the grounding discipline is what makes it trustworthy.

---

## 5. Terminology candidates (for the grill to canonicalise)

Not yet in [CONTEXT.md](../CONTEXT.md); proposed, to be sharpened or rejected:

- **Harmonic motion** / **progression** / **passage** — which is canonical for rung 3?
- **Pitch-preserving translation** vs **shape-preserving translation** — names ok? (cf. the
  existing `translate` verb, which currently implies only pitch-preserving morph.)
- **Anchor** (the known-tuning reference for self-knowledge) — distinct from **origin neck**?
- **Tonal expansion** vs **domain expansion** — adopt as first-class reasons-to-retune that
  the UI can name back to the user?
- **Bounded rearrangement** — the constrained "improve harmony, stay in the playability
  envelope" operation.
- **Playability model (two-hand)** — the hand-geometry answer to "what is playable?", left
  (fretting) + right (tapping). Distinct from **string tension** (§1.2); extends `find_voicings`
  / [R6](06-research-directive.md).

---

## 6. Handoff to the grill

A focused `grill-with-docs` session should:
1. Resolve every **[GRILL]** flag above, in dependency order.
2. Decide the notation-pane promotion (§2.3) — likely an ADR (it reverses a stated premise).
3. Canonicalise terminology (§5) into [CONTEXT.md](../CONTEXT.md).
4. Test the whole model against a genuinely ugly real passage (a math-rock excerpt in a custom
   tuning with no clean chord names). The test is **not** "does it produce a name" — Tier 3
   guarantees one (§3.3). The test is: **(a)** are the names *useful* (does the T1→T2→T3
   ladder hedge honestly rather than assert false coherence), and **(b)** does *bounded
   rearrangement* yield something the **two-hand playability model** can still play? Run this
   before enshrining anything.
