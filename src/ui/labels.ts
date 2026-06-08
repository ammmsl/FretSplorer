// Label mode (/ui) — PURE helper deciding what text rides a degree dot.
//
// The toggle cycles [none -> degree number -> note name], DEFAULT = degree number
// (pedagogy is relational; the absolute note name is the grounding fallback —
// docs/08 §1c). Note name uses core spell(pitch, { tonic }) so the enharmonic is
// chosen in the tuning's key context, never stored (pitch-model.ts §3).

import type { Degree, KeyContext, Midi } from '../core';
import { spell } from '../core';

/** The three label modes, in cycle order. */
export type LabelMode = 'none' | 'degree' | 'note';

export const LABEL_MODE_ORDER: readonly LabelMode[] = ['none', 'degree', 'note'];

/** Default label mode (docs/08 §1c). */
export const DEFAULT_LABEL_MODE: LabelMode = 'degree';

/** Next mode in the cycle. */
export function nextLabelMode(mode: LabelMode): LabelMode {
  const i = LABEL_MODE_ORDER.indexOf(mode);
  return LABEL_MODE_ORDER[(i + 1) % LABEL_MODE_ORDER.length];
}

/** Short human caption for the toggle button. */
export function labelModeCaption(mode: LabelMode): string {
  switch (mode) {
    case 'none':
      return 'Labels: off';
    case 'degree':
      return 'Labels: degree';
    case 'note':
      return 'Labels: note';
  }
}

/**
 * The text to render on a dot for the given mode. Returns "" for 'none'. For 'note'
 * it spells the absolute pitch in the tuning's key context.
 */
export function dotLabel(
  mode: LabelMode,
  degree: Degree,
  pitch: Midi,
  ctx: KeyContext,
): string {
  switch (mode) {
    case 'none':
      return '';
    case 'degree':
      return degree.label;
    case 'note':
      return spell(pitch, ctx);
  }
}
