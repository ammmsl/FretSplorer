# Render via emitted AlphaTex, not the alphaTab Score API (R12)

The `/render` adapter turns a model fragment into an **AlphaTex string** that is handed to
`AlphaTabApi.tex(...)`, rather than building alphaTab `Score`/`Bar`/`Beat`/`Note` objects via
the API. This resolves research item R12 for V1.

## Status
accepted

## Considered Options
- **Emit AlphaTex (chosen).** A small, serialisable, inspectable text artifact. It keeps our
  invariant model decoupled from alphaTab's internal class hierarchy (the adapter boundary is
  a string, not an object graph), it logs/audits cleanly (you can see exactly what was drawn —
  it suits the grounding discipline), and arbitrary tunings + let-ring are first-class
  (`\tuning(...)`, per-note `{lr}`).
- *Build Score objects via the API.* More programmatic precision and no parse step, but more
  code, tighter coupling to alphaTab's model, and no human-readable artifact. Its advantages
  (precision at scale, no string parsing) matter for large/complex scores in a hot loop —
  exactly the case we explicitly avoid (fragments are tiny and pushed on a slow cadence).

## Consequences
- The adapter (`fragmentToAlphaTex`) is a PURE function with no alphaTab import; its output is
  verified by round-tripping through alphaTab's own importer in `src/render/__tests__`.
- Pinned AlphaTex facts for alphaTab **1.8.3**: metadata arguments must be parenthesised
  (`\tempo(90)`, `\tuning(E4 ...)`); the `.` metadata separators are removed; let-ring is a
  **per-note** effect `fret.string{lr}`; `\tuning` names are scientific pitch matching MIDI
  (E4 = 64), authored string 1 → string N. (alphaTab's *internal* `Note.string` counts from the
  bottom, the inverse of the authoring order — relevant only when reading the model back.)
- **Update cadence:** the adapter is called on commit / pause / "show it written" — never in
  the hot interactive loop. alphaTab stays a render-and-playback target, not the source of truth.
- alphaTab is MPL-2.0 (used unmodified as a dependency — see `NOTICE.md`).
