# Fretsplorer

A desktop workspace for deliberate exploration of alternate guitar tunings — and a
**bidirectional theory translator**. A dumb-but-familiar fretboard surface (click to place
notes) is paired with an intelligent conversation that names what you play *relationally* —
against the tuning's own ringing drones and emergent grammar — and grounds every claim in
cited theory rather than confident guesses.

The shared vocabulary that the UI/render layer and the knowledge/data layer both bind to lives
in [`CONTEXT.md`](CONTEXT.md). The vision and planning live in [`docs/`](docs/) (`00`–`09`),
and the hard-to-reverse decisions are recorded as ADRs in [`docs/adr/`](docs/adr/).

## Status

The **"no code dependency" planning stage is complete** — all four upstream columns of the
build map ([`docs/07-build-sequencing.html`](docs/07-build-sequencing.html)) are done:

- **Design / UI** — the fretboard surface + app-shell spec ([`docs/08-ux-design.md`](docs/08-ux-design.md), ADR 0005/0006).
- **Knowledge / Data** — the grammar-card + rule schemas, the Open G card, and the Tier-1 vocabulary spec ([`kb/`](kb/), ADR 0001–0004).
- **Decisions** — the invariant pitch model and music21 delivery (ADR 0007/0008).
- **Orthogonal** — the string-tension advisor and the alphaTab render/audio adapter, both built and tested ([`src/tension/`](src/tension/), [`src/render/`](src/render/), ADR 0009–0012).

Every downstream impact these paths pushed back onto the planning docs is consolidated in
[`docs/09-downstream-impacts.md`](docs/09-downstream-impacts.md).

**Next: the critical-path spine** — implement `src/core` (pitch model) → `src/projection`
(`project()` / `identify()`) → the `src/ui` fretboard surface.

## Project layout

```
src/
  core/        invariant pitch model — MIDI/pc-set, chord-vs-voicing multiset (type-only contract today)
  projection/  project(), identify(), capo virtual-tuning            (planned — the spine)
  naming/      tier1-relational / tier2-tonal / tier3-music21         (planned)
  tension/     string-tension / setup advisor (built, validated)
  render/      model → AlphaTex → alphaTab notation + audio adapter (built)
  board/       neck collection, focus pointer, morph                 (planned)
  mcp/         resources + intent tools, grounding guardrails         (planned)
  ui/          fretboard surface, notation pane, chat                 (planned)
  App.tsx      Vite/React app shell scaffold
kb/            declarative theory data (YAML-authored, JSON-Schema-validated) + schemas
docs/          planning docs 00–09 and docs/adr/ (decision records 0001–0012)
demos/         render-demo.html — the /render adapter + audio listening test
spikes/        r1-music21 — empirical spike behind the music21-delivery decision (ADR 0008)
```

Module boundaries and the source-of-truth rule are described in
[`docs/03-architecture.md`](docs/03-architecture.md).

## Develop & run

Requires Node (with `npm`). Install once with `npm install`.

| Task | Command |
|---|---|
| Run the app (Vite dev server) | `npm run dev` → http://localhost:5173 |
| Render + audio demo | `npm run dev`, then open http://localhost:5173/demos/render-demo.html |
| Type-check + production build | `npm run build` (`tsc -b && vite build`) |
| Lint | `npm run lint` |
| All tests | `npm test` (Vitest) |
| Tension suite only | `npx vitest run src/tension` |

The **render demo** ([`demos/render-demo.html`](demos/render-demo.html)) drives the
`fragmentToAlphaTex` adapter through alphaTab's SVG renderer and alphaSynth playback — pick an
open-tuning fragment, slow the tempo, and judge whether the sustained opens ring richly enough
(the R8 listening test; see ADR 0012).

### R1 spike (music21 delivery)

The spike measuring Pyodide vs a thin backend for Tier-3 analysis is self-contained under
[`spikes/r1-music21/`](spikes/r1-music21/) (its own Python `requirements.txt`, no dependency on
the app):

```bash
cd spikes/r1-music21
pip install -r requirements.txt
python bench_backend.py                  # backend compute numbers
python -m http.server 8731               # then open /pyodide.html, read window.__R1__
```

The captured measurements (`results/*.json`) are committed as the evidence behind ADR 0008;
see [`spikes/r1-music21/README.md`](spikes/r1-music21/README.md).

## Third-party

Attributions for alphaTab (MPL-2.0), the Bravura font, the sonivox soundfont, and the
D'Addario / ASTM string-data sources are in [`NOTICE.md`](NOTICE.md).
