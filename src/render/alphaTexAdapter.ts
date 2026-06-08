// Thin model -> AlphaTex adapter (R12 decision: AlphaTex, not the Score API).
//
// WHY AlphaTex over building Score objects via the API (see docs/adr/0011):
//   - The fragments we render are tiny (a chord / short voicing) and pushed on a
//     slow cadence, so the Score API's programmatic precision buys us little.
//   - An AlphaTex string is a serialisable, inspectable, loggable artifact — it
//     suits the grounding/audit discipline (you can see exactly what was drawn).
//   - It keeps our model decoupled from alphaTab's internal class hierarchy: the
//     adapter boundary is a string, not a graph of Bar/Beat/Note objects.
//   - Arbitrary tunings + let-ring are first-class in AlphaTex via `\tuning` and
//     the per-note `{lr}` effect.
//
// This module is PURE (no alphaTab import, no DOM). The adapter's output is fed to
// `AlphaTabApi.tex(...)`; the round-trip is verified in __tests__.
//
// AlphaTex syntax notes pinned for alphaTab 1.8.3:
//   - No `.` metadata separators (removed in 1.8.x).
//   - `\tuning <names>` uses scientific pitch matching MIDI (E4 = 64), string 1 -> N.
//   - A chord/voicing is one beat: `(f.s f.s ...).dur`; let-ring is per-note `{lr}`.

import type { FragmentNote, RenderFragment } from './types';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI integer -> alphaTab tuning name (scientific pitch, e.g. 64 -> 'E4'). */
export function midiToTuningName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[pc]}${octave}`;
}

function escapeMeta(value: string): string {
  return value.replace(/"/g, '\\"');
}

function noteToken(note: FragmentNote, letRingAll: boolean): string {
  const lr = letRingAll || note.letRing ? '{lr}' : '';
  return `${note.fret}.${note.string}${lr}`;
}

/**
 * Convert a render fragment to an AlphaTex string suitable for `AlphaTabApi.tex()`.
 * Throws on an empty fragment (nothing to draw) or invalid string indices.
 */
export function fragmentToAlphaTex(fragment: RenderFragment): string {
  const { tuning, notes } = fragment;
  if (!tuning.strings.length) throw new Error('fragmentToAlphaTex: tuning has no strings');
  if (!notes.length) throw new Error('fragmentToAlphaTex: fragment has no notes');

  for (const n of notes) {
    if (n.string < 1 || n.string > tuning.strings.length) {
      throw new Error(
        `fragmentToAlphaTex: string ${n.string} out of range 1..${tuning.strings.length}`,
      );
    }
    if (n.fret < 0) throw new Error(`fragmentToAlphaTex: negative fret ${n.fret}`);
  }

  // alphaTab 1.8.x: metadata arguments must be wrapped in parentheses.
  const lines: string[] = [];
  if (fragment.title) lines.push(`\\title("${escapeMeta(fragment.title)}")`);
  lines.push(`\\tempo(${fragment.tempo ?? 90})`);
  lines.push(`\\tuning(${tuning.strings.map(midiToTuningName).join(' ')})`);

  const letRingAll = fragment.letRingAll ?? false;
  const duration = fragment.duration ?? 1;
  const tokens = notes.map((n) => noteToken(n, letRingAll)).join(' ');
  lines.push(`(${tokens}).${duration}`);

  return lines.join('\n');
}
