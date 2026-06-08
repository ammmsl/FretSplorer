# /tension — string-tension / setup advisor

The physical half of the adoption thesis (`docs/01-feature-set.md` §E, research item R7).
A **pure** function over a tuning's per-string target pitches — orthogonal to `/core` and the
harmonic layers, depends on nothing but a minimal tuning shape.

## Usage

```ts
import { adviseSetup } from './tension';

const advice = adviseSetup(
  { strings: [64, 59, 55, 50, 45, 40] },           // MIDI, string 1 (high) -> string N (low)
  { gauges: [0.010, 0.013, 0.017, 0.026, 0.036, 0.046], instrument: 'electric', scaleLength: 25.5 },
);
// advice.strings[i] -> { tension {lb,newton,kgf}, band, breakRisk, flag, recommendation, uncertain, notes }
// advice.totalTensionLb, advice.warnings, advice.provenance
```

- **Tuning input** is structurally a subset of a KB grammar card (`kb/schema/card.schema.json`):
  `strings` is MIDI integers, string 1 → N. No competing tuning model is invented. Re-entrant /
  arbitrary tunings work (tension is per-string, index carries no pitch-order meaning).
- **Gauges** are optional. Omit them (or individual entries) to **estimate** a gauge for each
  pitch — every estimated string is flagged `uncertain` (never a silent assumption).
- **Scale length** defaults to 25.5"; pass 24.75" for Gibson-style, or `scaleLengthUnits: 'mm'`.
- **Instrument** (`electric` | `acoustic`) selects the wound material (nickel vs phosphor
  bronze) and the comfort band (acoustic runs markedly higher tension).

## Flags

- `floppy` / `fine` / `break-risk` (the three headline flags), plus a finer `band`
  (`very-loose`…`very-tight`) and a `breakRisk` assessment.
- **Break risk is authoritative for plain steel** (ASTM A228) and reported **`unknown` for
  wound** strings (core diameter unpublished — never guessed). See `docs/adr/0010`.

## Coverage & V2 expansion (accepted)

The advisor is an **expansion effort**, not critical-path: shipping with a solid, *validated*
core is the bar, and broadening the data is explicitly a V2 improvement. Current coverage:

- **Materials:** plain steel, nickel-plated round wound (electric), phosphor bronze (acoustic).
- **Brand:** D'Addario only.
- **Known gap:** a few mid acoustic gauges (~.036–.047 phosphor bronze) are absent from the
  D'Addario single-string chart; the estimator falls back to the nearest entry and flags the
  result `uncertain`. This is acceptable for V1.

**V2 plan — widen the data, keep the bar:** add more brands/materials (e.g. Ernie Ball,
GHS; 80/20 bronze, flatwound, stainless) and fill the gauge gaps. Every added unit weight must
clear the same gate — reproduce the source's published reference tensions before shipping
(`docs/adr/0009`) — and wound break risk stays `unknown` until core diameters are
sourced (`docs/adr/0010`). New tables drop into `src/tension/data/` with their own
provenance/attribution; the pure `adviseSetup` API does not change.

## Provenance & validation

Formula, constant (386.4), units, and unit weights are validated against published D'Addario
reference tensions (HARD-STOP gate). Run the suite — it *is* the validation set:

```
npm test                 # all suites
npx vitest run src/tension
```

See `docs/adr/0009` and `NOTICE.md` for sources/attribution. Raw tables live in
`src/tension/data/` with inline provenance.
