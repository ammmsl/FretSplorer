# String-tension data source and formula validation

We compute string tension with the D'Addario formula `T = UW·(2·L·F)²/386.4` (UW = unit
weight lb/in, L = scale length in, F = frequency Hz, T = lb; 386.4 = g in in/s²), using
D'Addario's published unit weights for plain steel, nickel-plated round wound, and phosphor
bronze. Before building on it we validated the formula, constant, units, and unit weights
against published reference tensions — D'Addario's own EXL110 set values (16.2 / 15.4 / 16.6
/ 18.4 / 19.5 / 17.5 lb at 25.5") and the chart's per-note phosphor-bronze tensions — and all
agree to <1%. This was a HARD-STOP gate: wrong tension advice can recommend a string that
snaps, so we refused to proceed on unvalidated numbers.

## Status
accepted

## Considered Options
- **D'Addario published unit weights (chosen).** Authoritative, manufacturer-published, and
  cross-confirmed between two independent reproductions (the D'Addario *Fretted Instrument
  String Tension* chart and an EverTune reproduction of D'Addario's electric unit weights),
  which agree to the published 8 significant digits.
- *Computing UW from first principles (diameter × density).* Rejected: wound strings are a
  thin core + helical wrap with air gaps and a different wrap material; first-principles mass
  is wrong for them, and even plain steel would drift from the manufacturer's measured values.

## Consequences
- The validation set is the test suite (`src/tension/__tests__`): the advisor cannot silently
  drift from the references.
- Metric is provided two ways and shown to agree: `lb × 4.4482216 → N` (and `× 0.45359237 →
  kgf`), plus a metric-native `T_N = μ·(2·L·F)²`. The linear mass density μ is derived through
  the *same* 386.4 constant so the two forms match exactly (386.4 is D'Addario's rounded g;
  using the textbook 386.09 would introduce a ~0.08% discrepancy).
- Data is attributed in `NOTICE.md`; we are not affiliated with D'Addario.
- Coverage gap: a few mid acoustic gauges (~.036–.047 PB) are absent from the single-string
  chart; the estimator falls back to the nearest entry and flags the result uncertain.
- Coverage is **D'Addario-only** for V1 and is an accepted **expansion effort**: more brands /
  materials and the missing gauges are a V2 improvement. Every added unit weight must clear the
  same validation gate (reproduce the source's published reference tensions). See
  `src/tension/README.md` → "Coverage & V2 expansion".
