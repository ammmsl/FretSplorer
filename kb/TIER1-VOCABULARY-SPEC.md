# Tier-1 Relational Vocabulary Spec (R2)

The custom pedagogical core — the part no library does. Tier-1 names a grip **as a function of the
tuning's drones**, anchored to the home context, and names **dissonance against the pedal** as a
first-class textural device, not an error. This spec defines *what* the namer must articulate, the
*words* it uses, and *how* that vocabulary is stored.

Data realization: `kb/rules/relational-vocabulary.yaml` + `kb/rules/tension-table.yaml` +
`kb/rules/function-tendencies.yaml`. Decisions: ADR 0002, 0003, 0004.

---

## 1. Two orthogonal axes

01 bundles these; the spec keeps them apart.

- **Function** — an active note's *degree* relative to the **tonic** (1, 3, 5, 9, 11…). Drives
  "added 9th," "suspension," "alteration," diatonic function.
- **Tension-vs-drone** — the graded *clash* between an active note and each ringing **drone**.
  Computed **pairwise** (active note × each drone). Drives "bite," "colour."

A note can be a consonant chord tone by function yet bite against a particular drone. Both are
reported.

## 2. The relationship taxonomy (A–E)

A Tier-1 name = a **frame** (A–C) + **modifiers** + **drone commentary** (D–E).

- **A. Home identity & transposition** — `home` (the grip *is* the home chord, the I);
  `home-transposed` (flat barre at N = home chord up N semitones — stated, not rediscovered).
- **B. Home modification** — `suspension` (sus2/sus4), `added-tone` (add9/11/13/6),
  `alteration` (b5/#5/b9…), `omission` (no-3rd → open/power).
- **C. Functional re-interpretation** — `diatonic-function`: the grip + drones spell another
  chord in the key (IV, V, vi…), named relative to the tonic.
- **D. Drone roles** — each ringing open string's degree relative to the resulting chord root
  ("the open D rings through as the 9th").
- **E. Tension-against-the-pedal** — per active-note × drone, the graded tension, surfaced
  especially for `bite`/`unstable` ("that fretted C bites a semitone against the open B").

**Router property:** a grip that can't be framed by A–C is the signal to hand off to Tier-2
absolute naming. The taxonomy doubles as the T1↔T2 trigger (R4).

## 3. Graded tension scale (ADR 0004)

5-level ordinal, keyed on **interval class (0–6)**, with a numeric `rank` the UI maps to colour
intensity (matches `08-ux-design.md` decision d):

| rank | name | interval class | feel |
|---|---|---|---|
| 0 | `reinforce` | unison/octave | doubles the drone |
| 1 | `consonant` | 3rds, 6ths, 4th, 5th | sits inside, stable |
| 2 | `color` | maj 2nd / min 7th | whole-tone shimmer |
| 3 | `bite` | min 2nd / maj 7th | semitone bite |
| 4 | `unstable` | tritone | wants to resolve |

Optional `proximity` flag distinguishes a literal-adjacent semitone (tightest bite) from an
octave-spread form. Core stays interval-class-driven.

## 4. Output vocabulary (the words)

Closed enums where possible (auditable; constrains the contribution format):

- **Tension ranks:** `reinforce · consonant · color · bite · unstable`
- **Modifiers:** `suspended (sus2|sus4) · added (add9|add11|add13|add6) · altered (b5|#5|b9|#9|#11|b13) · open (no-3rd)`
- **Frames:** `home · home-up-to-{root} · {romanNumeral}`
- **Drone verbs:** `rings through as · doubles · pedals under · bites against`

## 5. Storage & the grounding seam (Q12 / ADR 0003)

Stored as a **keyed phrase-template lookup** — the KB holds *words and why*, the engine computes
*which words apply*, the LLM narrates around grounded slots:

```yaml
- id: drone-as-9th
  category: drone-role
  key: { droneDegree: 9 }          # the computed fact the engine matches on
  term: "added 9th"                # canonical label
  phrase: "the open {droneNote} rings through as the 9th"   # typed slots
  tension: color
  provenance: { kind: theory, reasoning: "...", sources: [tonal-function] }
```

- **Engine** computes the keys (degree, tension rank, modifier), looks up the entry, fills `{slots}`
  with computed values, returns `{term, phrase, tension, provenance}` + a per-claim trace.
- **LLM** may rephrase for warmth/register but **may not alter a slot fact**. The `phrase` is the
  guaranteed-true baseline, not necessarily the verbatim final sentence.
- **No embedded logic in the KB** — matching is engine code; the KB is pure data (03).

## 6. Worked example (Open G)

Grip: full barre at fret 5, low open D left ringing (shape `og-major-over-d-drone`, anchor 5).

- Engine computes: barred strings → C major triad; bass = open D2 (lowest pitch); open D = the 9th
  of C; D vs the C/E/G chord tones → `consonant`/`color`, no bite.
- Frame (C): `diatonic-function` → the **IV** in G.
- Drone role (D): `drone-as-9th` → "the open D rings through as the 9th."
- Tool returns: *"the IV (C major) with the open D ringing as its 9th"*, traces
  `[frame-diatonic-function, drone-as-9th]`, all `kind: theory`.
- LLM narrates: "You've slid up to the IV — C major — but that open D keeps ringing as a 9th on
  top, so it shimmers instead of landing flat." Every checkable fact is slotted/traced.
