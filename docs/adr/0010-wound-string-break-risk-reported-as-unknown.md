# Wound-string break risk is reported as unknown, not estimated

For **plain-steel** strings we compute a conservative breaking tension from the ASTM A228
music-wire tensile strength for that diameter (minimum tensile strength × cross-sectional
area), and flag break risk against it with a safety margin (caution ≥70%, break-risk ≥85% of
breaking tension). For **wound** strings (nickel, phosphor bronze) we deliberately do NOT
compute a breaking tension and instead report `breakRisk.level = 'unknown'` with an explicit
uncertainty flag and note.

## Status
accepted

## Why
A wound string's tensile load is borne almost entirely by its thin steel core, whose diameter
D'Addario does not publish per string. Computing a break tension from the *outer* gauge would
treat the whole cross-section as solid load-bearing steel and badly **overestimate** strength —
i.e. it could mark an unsafe setup as "fine." Given the HARD-STOP rule ("never recommend a
string that snaps"), an honest `unknown` is safer than a confident guess.

## Consequences
- The real-world break risk this feature must catch — a thin **plain** high string tuned up —
  is handled authoritatively (e.g. a .010 tuned to A4 flags break-risk at ~95% of its breaking
  tension; tuned to C5 it flags over-limit).
- Wound strings never raise the `break-risk` flag; their concern is conveyed by the `very-tight`
  feel band plus a per-string note and a setup-level warning that wound break risk is not
  computed.
- The estimator/gauge recommendations target *comfortable* tension, so they will not steer a
  user into an un-assessable wound-string danger zone in the first place.
- Seam: if D'Addario (or another source) publishes core diameters later, a wound break model
  can be added behind the same `breakRisk` contract without changing callers.
