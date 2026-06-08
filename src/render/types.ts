// Public types for the model -> notation/audio render adapter (/render).
//
// STUB MODEL SIDE: /core does not exist yet. These types are the thin, stable
// contract the invariant model will hand to the renderer. They are intentionally
// minimal and decoupled from alphaTab's Score model (docs/03-architecture.md:
// "alphaTab is a render-and-playback target, not the brain"). A `RenderFragment`
// describes WHAT is currently in view; the adapter turns it into AlphaTex.
//
// Cadence: fragments are pushed on a slow cadence (commit / pause / "show it
// written"), never in the hot interactive loop.

export interface RenderTuning {
  /** Open-string target pitches as MIDI integers, string 1 -> string N.
   *  Structurally compatible with a KB grammar card's `strings`. */
  strings: number[];
}

export interface FragmentNote {
  /** 1-based string number (string 1 = first entry in tuning.strings). */
  string: number;
  /** Fret number; 0 = open string. */
  fret: number;
  /** Ring this note into the following beats (the drone premise). */
  letRing?: boolean;
}

export interface RenderFragment {
  tuning: RenderTuning;
  /** Notes sounding together = one beat (a single chord / voicing) for V1. */
  notes: FragmentNote[];
  title?: string;
  /** Playback tempo in BPM (default 90). */
  tempo?: number;
  /** AlphaTex beat duration value (1 = whole, 2 = half, 4 = quarter...). Default 1. */
  duration?: number;
  /** Let every note ring — overrides per-note letRing. The default for open-tuning
   *  exploration, where sustained opens are the point. */
  letRingAll?: boolean;
}
