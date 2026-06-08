# SVG for the fretboard surface render

**Status:** accepted

The fretboard surface (the central view: degree-colored overlays, multi-neck stack,
drone-map string treatments, hover readouts, and the morph animation) is rendered in
**SVG**, not `<canvas>`.

The element count is tiny — 6 strings × up to 24 frets × N stacked necks, with only a
handful of animated dots at a time — so canvas's throughput advantage is irrelevant here.
SVG buys what this UI actually needs: crisp resolution-independent scaling, free
per-element hit-testing (click a fret cell, hover a single note for its readout),
CSS/JS transitions for the string-by-string morph, DOM-level accessibility, and simple
declarative styling for degree colors and labels.

**Stress test:** morph mode (animated string-by-string retune with notes sliding frets)
was the one feature that could have justified canvas. At 6 strings + a few dots per neck it
sits comfortably within SVG transition performance, so it confirms rather than threatens
this choice.

**Reversal cost:** meaningful — switching to canvas later would rewrite the entire surface
component and its interaction layer. This is recorded because a reader might assume an
animated, real-time music tool "should" use canvas; here the deliberate, low-element-count
design makes SVG the better fit. (Consistent with the `d_render` node in
docs/07-build-sequencing.html.)
