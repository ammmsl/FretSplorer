# Third-party notices & attributions

Fretsplorer bundles or derives from the third-party works below. Each is used as a
dependency / reference; this list satisfies their attribution terms and the project's
open-source hygiene rule (`docs/05-external-data.md`).

> Scope note: entries added by the orthogonal-lane build (string-tension advisor +
> alphaTab notation/audio spike). Other dependencies are tracked as the project grows.

---

## Software dependencies

### alphaTab — `@coderline/alphatab` (and `@coderline/alphatab-vite`)
- **Use:** notation/tab rendering (SVG) + audio playback (alphaSynth) — the `/render` component.
- **License:** **MPL-2.0** (Mozilla Public License 2.0), file-level copyleft.
  © Daniel Kuschny and Contributors. Used as an unmodified dependency, so the file-level
  copyleft imposes no obligation on our own source. See the package's `LICENSE`.
- **Source:** https://github.com/CoderLine/alphaTab

### Bravura (SMuFL music font, shipped with alphaTab)
- **Use:** glyphs for the rendered standard notation / tab.
- **License:** **SIL Open Font License 1.1 (OFL-1.1)**. © Steinberg Media Technologies GmbH.
  See `node_modules/@coderline/alphatab/dist/font/Bravura-OFL.txt`.

### sonivox EAS soundfont (`sonivox.sf2` / `.sf3`, shipped with alphaTab)
- **Use:** the default V1 General-MIDI soundfont for alphaSynth playback (R8).
- **License:** **Apache License 2.0**. © 2004–2006 Sonic Network Inc. (Sonivox EAS, part of
  the Android Open Source Project). See
  `node_modules/@coderline/alphatab/dist/soundfont/LICENSE`.
- **Note:** richer / sympathetic-resonance samples remain deferred (`docs/02-scope.md`);
  the default is acceptable for V1 exploration.

---

## Reference data

### D'Addario string unit-weight tables (the `/tension` advisor)
- **Use:** unit weight (mass per unit length, lb/in) per string gauge/material — the input to
  the tension formula `T = UW·(2·L·F)²/386.4`.
- **Coverage:** plain steel (PL), nickel-plated-steel round wound (NW), phosphor bronze (PB).
- **Source / attribution:** unit weights © **D'Addario & Company, Inc.**, from the published
  *Fretted Instrument String Tension* chart (cross-confirmed against an EverTune reproduction
  of D'Addario's electric unit weights). Reproduced for tension computation as published
  technical specifications; this project is **not affiliated with or endorsed by D'Addario**.
- **Validation:** the formula + these unit weights reproduce D'Addario's own published set/chart
  tensions to <1% (encoded as the test suite, `src/tension/__tests__`). See
  `docs/adr/0009`.

### ASTM A228 music-wire tensile strength (plain-steel break-risk model)
- **Use:** diameter-dependent minimum ultimate tensile strength, to compute a conservative
  breaking tension for **plain-steel** strings (the safety-critical break-risk flag).
- **Source:** ASTM A228 music-wire tensile-strength-by-diameter table, as published in the
  Gibbs Wire & Steel "Phosphor Coated Music Wire" technical data sheet (gibbswire.com),
  consistent with the ASTM A228 230,000–399,000 psi specification range.
- **Note:** wound-string break tension is **not** modelled (the load-bearing steel core
  diameter is unpublished); it is reported as `unknown` rather than guessed. See
  `docs/adr/0010`.
