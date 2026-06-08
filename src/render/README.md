# /render — model → alphaTab notation/audio adapter

The notation/tab + "sound it out" component (`docs/01-feature-set.md` §F, research items
R12 + R8). alphaTab is a **render-and-playback target, not the source of truth**, and is kept
out of the hot interactive loop (`docs/03-architecture.md`).

## What this is (and isn't, yet)

- A thin **pure** adapter, `fragmentToAlphaTex(fragment)`, that turns a model fragment into an
  AlphaTex string for `AlphaTabApi.tex(...)`. R12 decision: AlphaTex over the Score API
  (`docs/adr/0011`).
- The **model side is stubbed** — `/core` does not exist yet. `RenderFragment` / `FragmentNote`
  / `RenderTuning` (`types.ts`) are the minimal, stable contract the invariant model will emit.
- A runnable demo (`demos/render-demo.html` + `demo/main.ts`) wiring the adapter to alphaTab's SVG
  render + alphaSynth playback with the default soundfont.

## Usage

```ts
import { fragmentToAlphaTex } from './render';

const tex = fragmentToAlphaTex({
  title: 'Open G — open drone chord',
  tuning: { strings: [62, 59, 55, 50, 43, 38] }, // MIDI, string 1 -> N
  notes: [{ string: 1, fret: 0 }, /* ... */ { string: 6, fret: 0 }],
  letRingAll: true,   // sustain the opens — the drone premise
  tempo: 60,
});
api.tex(tex);
```

## Arbitrary-tuning support

`\tuning(...)` is emitted from the fragment's MIDI pitches (scientific pitch, e.g. 64 → `E4`),
so **any** tuning renders — re-entrant, dropped, partial-capo-as-virtual-tuning, whatever the
model hands over. Verified for Open G, DADGAD, and standard in `__tests__` by round-tripping
through alphaTab's own importer. (Note: alphaTab's internal `Note.string` counts from the
bottom, the inverse of AlphaTex authoring order — handled in the tests, irrelevant to callers.)

## Update cadence

The adapter is called on a **slow cadence** — commit / pause / "show it written" — never per
interactive frame. Live fretboard interaction stays in the (future) lightweight `/ui` surface;
notation/audio is pushed when the view settles.

## Running the demo (render + audio, R8 listening test)

```
npm run dev        # then open http://localhost:5173/demos/render-demo.html
```

Pick an open-tuning fragment, slow the tempo, press Play, and judge by ear whether the
sustained opens *ring and bloom* richly enough (R8). Default soundfont verdict + the technical
verification (render + playback pipeline confirmed) are in `docs/adr/0012`.
