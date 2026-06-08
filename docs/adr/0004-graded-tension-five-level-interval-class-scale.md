# Graded drone-tension is a 5-level ordinal scale keyed on interval class

**Status:** accepted

Tier-1 relational naming grades the tension between an active (fretted) note and each
ringing drone on a **5-level ordinal scale**, computed **pairwise** (active note × each
drone) and keyed on the **interval class (0–6)** between them:

| rank | name | interval class |
|---|---|---|
| 0 | `reinforce` | unison/octave |
| 1 | `consonant` | 3rds, 6ths, 4th, 5th |
| 2 | `color` | maj 2nd / min 7th |
| 3 | `bite` | min 2nd / maj 7th |
| 4 | `unstable` | tritone |

The numeric rank lets the UI map tension to color/line intensity directly (it already
matches `08-ux-design.md` decision (d): consonant → whole-tone → semitone → tritone, with
tritone ranked strongest). Tension is held **separate from function** (the note's degree vs
the tonic): function drives "added 9th / suspension / alteration"; tension drives
"bite / color."

**Trade-off accepted:** interval-class reduction collapses m2 and M7 into the same `bite`
rank. The rejected alternative — keying on the full directed interval (0–11) — distinguishes
them but doubles the buckets and complicates every rule. An optional `proximity` flag
(literal-adjacent semitone vs octave-spread) captures the distinction more cheaply when the
namer wants to surface it; the core scale stays interval-class-driven.

## Consequences

- The `project()`/`identify()` output contract carries this graded value per open string
  (couples to the UI drone map). Both paths must agree on the 5 ranks.
- The rule data that maps interval class → tension rank + descriptive phrase lives in
  `/kb/rules` (see the Tier-1 vocabulary spec).
