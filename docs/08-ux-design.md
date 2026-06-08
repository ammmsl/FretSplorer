# UX / Visual Design — The Fretboard Surface & App Shell

**Status:** Design spec. No app code. Produced in a `grill-with-docs` interview that walked
the design decision tree in dependency order (device → orientation → degree-color → drone
map → grip interaction → results display → multi-neck → morph → capo → app shell →
aesthetic/accessibility).

**Scope of this doc:** the upstream UX driver the build map (`07`) places on the M0 critical
path. It shapes the `project()`/`identify()` output contract, the app shell, and surfaces
several new components. Glossary of UI terms is reconciled into the canonical `CONTEXT.md`.
Hard-to-reverse forks are recorded as ADRs in `docs/adr/` (`0005` three-region app shell,
`0006` SVG fretboard surface).

**Fixed premises (not relitigated):** degree-relative color; ephemeral / no-persistence
state (`02-scope.md`).

---

## 1. Decisions log

### (a) Device, posture, input
- **Desktop-first, landscape, single-window workspace.** Mobile (phone) **rejected** for V1
  — a narrow portrait viewport can't host multi-neck + conversation without becoming a
  different product. Touch/tablet not a V1 target.
- **Primary input = mouse-click on a fret.** Accepted as slower-but-accurate, WYSIWYG, and
  aligned with the product ethos: **dedicated, deliberate, focused exploration.**
- The player's fretting hand stays free on the real guitar; the screen is the deliberate
  translation/exploration surface.

### (b) Neck drawing (orientation)
- **Horizontal**, nut on the **left**, frets extending right.
- **High-E string on top, low string on bottom** — matches Guitar Pro's standard fretboard
  view AND TAB orientation, so the surface and the alphaTab pane read as one coherent view.
- **Clean SVG**, **24 frets**, **6 strings** (7/8 deferred), **standard dot inlay markers**,
  **no fingerboard fill** (minimal, not skeuomorphic). See **ADR 0006**.
- **Open string lives at the nut** (not a separate fret-0 column). Lefty mirror deferred
  (render orientation kept as a pure transform so a flip stays cheap later).

### (c) Degree-color visual language
- **Dual-channel: shape carries structure, color carries degree.**
  - **Root = a distinct shape** (diamond / double-ring); all other degrees = plain circles.
    Shape makes "home" 100% colorblind-safe and glanceable before color is even parsed.
  - Chord tones (3, 5, 7) read most saturated; extensions (2·9, 4·11, 6·13) lighter.
- **Colorblind-safe** on a blue↔orange/yellow + lightness axis (not red↔green for the
  critical contrasts); root-shape redundancy; degree labels always available.
- **Label mode toggle** cycles [none → degree number → note name], default **degree number**
  (pedagogy is relational; absolute note name is the grounding fallback).

### (d) Drone-map layer
- The drone map is the **second semantic layer**, kept off the dot fill by living on a
  **different geometry**: it paints the **string line + the open-dot halo at the nut/capo**.
  Dot fill stays = degree; line/halo = drone safety. No two meanings share a pixel-role.
- **Graded, not binary** (per R2): consonant pedal → calm/cool; whole-tone color → mild
  warm; **semitone bite → strong warm**; tritone → strongest. Paired with line-style
  (solid = safe, dashed/jagged = tension) for CVD-safety.
- **Dormant until a harmonic context exists.**
- **Base meaning is "this string is not actively fretted — it's ringing"**, with drone color
  layered on top. This base state is **per-string and capo-relative** (see (h)).

### (e) Grip interaction model
- Per-string state: **fretted(N) / open / muted(X) / unplayed**. **Nothing sounds until
  consciously selected** — open strings do *not* ring by default (phantom drones would
  poison `identify()` with unintended chord names).
- **Left-click empty fret → place; left-click existing dot → remove** (the familiar guitar-
  tool toggle). One note per string (clicking a new fret moves the string's note).
- **Per-string open/mute marker** at the nut/capo cycles open(O) → muted(X) → off.
- **Hover a note → readout** (degree, drone status). No click-to-select needed.
- **"Clear all" button** above the fretboard is the canonical reset (right-click context
  menu may mirror it, but browser right-click is unreliable).
- **`identify()` runs live** on every grip change (it's our lightweight code; only alphaTab
  stays out of the hot loop).
- **Division of labor:** the neck is dumb-but-familiar; the **MCP is the leverage**. Deixis,
  "move the third up", vibe→mechanism all live in conversation — so the surface needs **no
  per-note selection state** in V1.

### (f) `identify()` results & naming-tier display
- **Two output surfaces at two cadences:**
  - **Readout panel ("What you're holding")** — always-on, structured, bound to the focused
    neck, updates live. Tiered disclosure: **T1 relational sentence (headline)** → **T2
    absolute symbol (subline)** → **bass** (from lowest pitch) + **per-note degree-vs-drone**
    → **T3 voicing anatomy (expandable)** → **ranked candidates** when ambiguous.
  - **Conversation panel** — turn-based MCP dialogue; same data, speaks only on user turns.
  - Rationale: mirrors guitar's **peer-to-peer** "here's what that actually is" culture;
    keeps conversation uncluttered for teaching.
- **On-neck:** bass note gets a distinct marker; degrees ride the dots via label mode;
  (enhancement) hovering a Readout phrase highlights the note(s) it names.
- **Neighbors** = clickable **chips that spawn a comparison neck** (comparison is the act).

### (g) Multiple necks
- **Vertical stack of horizontal necks, fret columns aligned** across all necks — so the
  same grip's notes are seen *shifting position* between tunings/voicings at a glance.
- Each neck: short **label + model-set caption** ("A · your grip", "B · DADGAD"), **close
  (✕)**. Many necks → vertical scroll; auto-collapse of stale necks deferred.
- **Focused neck** = accent border/glow; Readout mirrors it; click to focus; pronouns
  resolve to it.
- **Origin neck** carries a persistent subtle **"yours"** distinction — enforcing the change
  from it to a spawned neck drives the learning path and mirrors onto the player's muscle
  memory on the real guitar.

### (h) Morph mode
- **Two stacked aligned necks: A (source) static on top, B (target) animating below.**
- **String-by-string sequential animation** (retune string by δ → its note slides −δ frets),
  so the user follows the causality. **Scrub/replay control**, not auto-loop.
- **Falling off the neck:** a note sliding past the nut (< 0, "below the open string") or
  past fret 24 is **ghosted at the edge it exits**, with a callout; Readout/conversation
  narrates the consequence (e.g. "old root drops below the open D — it falls out; you gain
  the open D as a drone").
- Confirmed SVG handles this (6 strings, few dots). **ADR 0006.**

### (i) Capo / partial capo
- **Hardware-clamp overlay at an absolute fret.** Frets behind it greyed dead; the
  open/ringing marker + drone color **relocate to the capo line**.
- **Displayed at absolute fret positions — the neck is NEVER renumbered** so the capo
  becomes fret 0. The fixed fret coordinate is the **pedagogical anchor** that survives the
  capo+tuning chord-name conflation (the core disease the app treats). Virtual-tuning math
  stays internal.
- **Partial capo = a contiguous string span from either edge** (high→low or low→high — both
  valid in open/alt-tuning practice). Set by **click-fret-to-drop, drag-across-strings-to-
  make-partial.** Model = a **per-string capo-fret** (generalizes to multiple capos; V1 UI =
  single capo).

### (j) App shell, aesthetic, accessibility
- **Three-region collapsible shell** (see **ADR 0005**): collapsible grammar-card left /
  neck-stack + docked-collapsible notation center / Readout-pinned + Conversation right.
  Flanks collapse so the neck can go near-full-width.
- **Light-first, dark optional** (light = context-aware skim/scan; dark = deep focus).
  Degree palette is **theme-aware** (legible + CVD-safe on both backgrounds).
- **Accessibility floor (V1):** WCAG AA contrast; color never sole channel; CVD palette
  toggle; `prefers-reduced-motion` → stepped/instant morph; semantic aria-labeled SVG dots;
  keyboard-operable controls + conversation (on-neck keyboard placement deferred).

---

## 2. Component inventory

### Existing (named in `00`–`07`, now given a concrete UX home)
| Component | Home / form |
|---|---|
| Fretboard **surface** (central) | Center region; SVG; vertical stack of necks |
| **Neck** (plural, disposable) | Horizontal strip; degree dots, drone treatment, capo overlay, markers, label, focus accent |
| **Multiple necks** | Vertical fret-aligned stack; spawn-beside |
| **Drone map** | String-line + nut/capo halo channel (refined from "color-coded open string") |
| **Morph mode** | Two-neck animated view + scrub + off-neck ghost |
| **Capo / partial capo** | Clamp overlay, absolute frets, per-string effective nut |
| **Conversation (MCP)** | Right rail, below Readout |
| **Grammar card resource** | Collapsible left panel |
| **alphaTab notation/audio pane** | Docked-collapsible at bottom of neck stack |
| **Turn-level focus pointer** | Accent border on the focused neck |

### Newly surfaced by this design (not in `00`–`07`)
| Component | Why it appeared |
|---|---|
| **Readout panel ("What you're holding")** | Live `identify()` needs a non-conversational, always-true cadence (decision f). **The biggest new component.** |
| **Top control bar** | Tuning / scale-chord / capo / label-mode / clear / playback need a home |
| **Label-mode toggle** | Cycles none → degree → note (decision c) |
| **Clear-all control** | Canonical reset above the board (decision e) |
| **Per-string open/mute marker** | Conscious open/mute selection at nut/capo (decision e) |
| **Bass marker (on-neck)** | Calls out the computed lowest-pitch note (decision f) |
| **Neighbor chips** | Spawn comparison necks (decision f) |
| **"Easier way?" / playability affordance** | Hard-grip → alternative voicings (see downstream impacts) |
| **Capo authoring gesture** | Click-drop + drag-partial (decision i) |
| **Morph scrub/replay control** | Deliberate, re-watchable animation (decision h) |
| **Origin-neck "yours" marker** | Persistent learning anchor (decision g) |
| **Theme toggle + CVD palette toggle** | Light/dark + colorblind accessibility (decision j) |

---

## 3. Low-fi wireframes

### 3.1 Single neck — anatomy
```
        fret:  0(nut)   1     3      5      7      9      12              24
              ║                ●inlay        ●inlay   ◎inlay
   e (hi) ─O──╫────────────────────────●(5)──────────────────────────────  ← string line
   B      ─O══╫════════════════════════════════  (cool/solid = safe drone)
   G      ─X──╫───────────────◆(R)──────────────────────────────────────   ◆ = ROOT (shape)
   D      ─O┄┄╫┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  (dashed/warm = semitone bite)
   A      ───╫────────────●(3)───────────────────────────────────────────  ● = degree dot
   D (lo) ─O──╫──█bass─────────────────────────────────────────────────────  █ = bass marker
              ↑ open/mute markers (O / X) at the nut
  [A · your grip ◆yours]                                                 [✕]
```
- `◆` root (shape), `●` other degrees (color = degree, size/saturation = chord-tone weight).
- Open string lines carry **drone status** (solid/cool = safe, dashed/warm = tension).
- `O` = open (consciously selected), `X` = muted, blank = unplayed.

### 3.2 Multi-neck stack (fret-aligned comparison)
```
┌──────────────────────────────────────────────────────────────┐
│ ◆ A · your grip                          [neck, frets aligned] │ ← focused (accent border)
│   e─O───────●──   B─O═══   G──◆──   D┄┄┄   A───●   D─█──        │
├──────────────────────────────────────────────────────────────┤
│   B · dreamier (add9, opens ring)        [neck, frets aligned] │
│   e─O──────────●  B─O═══   G──◆──   D─O═══ A───●   D─█──        │
└──────────────────────────────────────────────────────────────┘
                    ↑ same fret columns line up → see notes move
```

### 3.3 Morph (translate / retune)
```
┌──────────────────────────────────────────────────────────────┐
│ A · EADGBE  (source, static reference)                         │
│   ●──◆──●   …                                                  │
├──────────────────────────────────────────────────────────────┤
│ B · DADGAD  (morph target — animating)        ◀ ▮▮▯▯▯ ▶  ⟲    │ ← scrub/replay
│   ghost⟨◆⟩◀┊ ●──●   …   (a note slid below the open D → ghosted │
│             at the nut edge + callout)                          │
└──────────────────────────────────────────────────────────────┘
  Readout: "Your old low-E root falls below the open D — it drops
            out; you gain the open D as a drone instead."
```

### 3.4 Capo / partial capo (absolute frets, never renumbered)
```
 Full capo @3:                         Partial capo @2 (top 3 strings):
   0   3                                 0   2
 e ▓│███───●     ← greyed dead         e ─│███───●   ← capoed (open=capo line)
 B ▓│███──        behind capo          B ─│███──
 G ▓│███──                             G ─│███──
 D ▓│███──                             D ─O───────  ← uncapoed (open=real nut)
 A ▓│███──                             A ─O───────
 D ▓│███──                             D ─O───────
   ↑capo bar (hardware clamp)            ↑ per-string effective nut (stepped)
```

### 3.5 Full app shell (desktop, light-first)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Fretsplorer · [Tuning ▾] · [Scale/Chord ▾] · [+Capo] · [Labels ▾] · [⟲Clear] · [☼/☾] │
├───────────────┬────────────────────────────────────────────┬──────────────┤
│ GRAMMAR CARD  │              NECK STACK                     │  READOUT      │
│ ‹collapse     │  ┌────────────────────────────────────┐     │ "What you're  │
│  Open G›      │  │ ◆ A · your grip      [ neck ]    ✕ │     │  holding"     │
│ home: G       │  ├────────────────────────────────────┤     │ ─────────────│
│ barre = I↑    │  │   B · dreamier       [ neck ]    ✕ │     │ T1: "the I,   │
│ movable shapes│  └────────────────────────────────────┘     │  open D as 9" │
│ drone map     │                                              │ T2: Gadd9/D   │
│ capo behavior │  ┌────────────────────────────────────┐     │ bass: G2      │
│               │  │ ♪ alphaTab notation/audio ‹collapse›│     │ ▸ T3 anatomy  │
│               │  └────────────────────────────────────┘     │ neighbors:[..]│
│               │                                              ├──────────────┤
│               │                                              │ CONVERSATION  │
│               │                                              │ › make it     │
│               │                                              │   dreamier    │
│               │                                              │ ‹model …›     │
└───────────────┴────────────────────────────────────────────┴──────────────┘
  (both flanks collapse → neck stack expands to near-full width)
```

---

## 4. Downstream impacts

This session's downstream impacts (on `02`/`05` scope, `03` architecture, and `07` build map)
are consolidated with every other path's impacts in
[`09-downstream-impacts.md`](09-downstream-impacts.md) — see the **[UI]**-tagged items there.
Headlines: the `project()`/`identify()` contract gains a graded drone-tension value per open
string; capo is per-string/absolute-fret (never renumbered); the surface needs no per-note
selection state; a new always-live **Readout panel**; and the `ux` node (this doc + ADR 0005
app shell / ADR 0006 SVG surface) unblocks the M0 fretboard.

---

## 5. Deferred / open (to human testing or later)
- **Conversation dominance** — whether the conversation deserves a more central/dominant
  position than the right rail (ADR 0005) is left to **human testing**.
- **Lefty mirror**, **7/8-string necks**, **on-neck keyboard placement**, **auto-collapse of
  stale necks**, **multiple simultaneous capos** — all deferred; the models above keep them
  cheap to add.
- **Readout phrase ↔ on-neck highlight linking** — enhancement, not V1 floor.
