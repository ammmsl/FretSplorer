# Keep alphaTab's default sonivox soundfont for V1 (R8)

V1 ships with alphaTab's bundled **sonivox** General-MIDI soundfont (Apache-2.0) for alphaSynth
playback. Richer / sympathetic-resonance samples remain deferred unless the default proves a
dealbreaker for the drone premise. This resolves research item R8 for V1.

## Status
accepted (subjective ring/bloom quality pending user confirmation by ear)

## Why / what was verified
R8 asks whether the default soundfont's *ring and bloom* on sustained open strings is "good
enough for exploration." The full pipeline was verified in a real browser via the `/render`
demo (`demos/render-demo.html`): alternate tunings (Open G, DADGAD) render, the soundfont loads, the
player reaches `readyForPlayback`, and on play the transport advances in real time through a
let-ring whole-note chord — i.e. sustained opens do ring for their full duration.

The **subjective** judgement ("rich enough, or thin?") is inherently a listening test and is
left to the user in that demo (headless automation can verify the audio engine runs but cannot
judge tone). Engineering assessment: sonivox is a compact (~1 MB) GM soundfont — adequate for
pitch and exploration, not studio-rich on guitar timbre. This matches `docs/02-scope.md`
("default soundfont fine for V1; better samples later if the drone character demands it").

## Consequences
- No extra soundfont asset or licensing burden in V1 (sonivox ships with alphaTab; attributed
  in `NOTICE.md`).
- Seam preserved: swapping in a richer `.sf2`/`.sf3` is a one-line change to the soundfont URL
  loaded in `src/render/demo/main.ts` / the future `/render` runtime — no model or adapter change.
- If the user finds the bloom inadequate, revisit by scoping a better guitar sample layer.
