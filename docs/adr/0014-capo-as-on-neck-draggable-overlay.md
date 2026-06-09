# Capo as an on-neck draggable overlay with a per-neck edit mode

**Status:** accepted (replaces the provisional toggle-based `CapoControl`)

The provisional capo was a slider + per-string clamp toggles in the Lab that silently
re-transposed the projection and drew **nothing on the neck**. We instead make the capo a
**physical bar rendered on the neck itself**, manipulated directly — realising the
**Capo (visual)** glossary term (hardware clamp at an absolute fret; frets behind it dead; the
open/ringing + drone markers relocate to the capo line).

## The interaction

- A per-neck **"Capo" pill** toggles a transient **capo-edit mode**. While lit, clicks/drags on
  the neck move the capo (horizontal = fret; vertical drag of the bar's end = string coverage).
  Toggling it off freezes the capo as a rendered overlay and returns clicks to placing a shape.
- Partial capos are a **contiguous span anchored to an edge** — the bar retracts inward from one
  edge. This is what the glossary already specifies ("a contiguous span from either edge") and
  what real partial capos do; middle-floating spans are deliberately disallowed.
- The engine math is unchanged: `applyCapo` already shifts each clamped string's open pitch and
  preserves the **tonic**, and `capoShiftFrom` already clamps a straight bar at one fret. Only
  the *rendering* and the *input gesture* are new.

## Considered options

- **Keep the toggle widget** (arbitrary per-string subsets, no on-neck visual). Rejected: it
  violates the glossary's visual-capo intent, and its feedback loop is broken — the control that
  changes the neck didn't show on the neck. The arbitrary-subset capability it allowed is
  deliberately dropped in favour of the physically-accurate contiguous bar.

## Consequences

- Capo editing now shares the neck surface with shape placement, hence the explicit mode toggle
  to disambiguate clicks.
- Three rendering consequences become in-scope (today they render nothing): dead frets behind
  the capo reject shape clicks; the open/ringing marker relocates to the capo line per capped
  string; the per-string **drone status** colouring relocates to the capo line. Uncapped strings
  (partial capo) keep their nut-anchored open + drone treatment — the partial-capo drone premise.
