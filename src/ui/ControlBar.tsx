// ControlBar (/ui) — the top control bar (docs/08 §3.5; ADR 0005).
//
// Tuning selector, Scale/Chord selector, Label-mode toggle, Clear, Theme toggle.
// All controls are native, keyboard-operable elements (docs/08 §1j accessibility).
//
// The harmonic-context selector is a single <select> whose options are grouped into
// scales and chords; an empty value = no context (the dormant/cleared state).

import { CHORDS, SCALES, STRING_COUNTS, TUNINGS, tuningLabel } from './fixtures';
import { labelModeCaption, nextLabelMode, type LabelMode } from './labels';
import type { Theme } from './theme';

/** Identifies the active harmonic context selection (entity kind + fixture key). */
export interface ContextSelection {
  readonly kind: 'scale' | 'chord';
  readonly key: string;
}

export interface ControlBarProps {
  readonly tuningId: string;
  readonly stringCount: number;
  readonly selection: ContextSelection | null;
  readonly labelMode: LabelMode;
  readonly theme: Theme;
  readonly onTuningChange: (id: string) => void;
  readonly onStringCountChange: (count: number) => void;
  readonly onSelectionChange: (sel: ContextSelection | null) => void;
  readonly onLabelModeChange: (mode: LabelMode) => void;
  readonly onClear: () => void;
  readonly onThemeToggle: () => void;
}

const NONE_VALUE = '';

/** Encode a selection into a single <select> value. */
function encode(sel: ContextSelection | null): string {
  return sel ? `${sel.kind}:${sel.key}` : NONE_VALUE;
}

/** Decode a <select> value back into a selection. */
function decode(value: string): ContextSelection | null {
  if (!value) return null;
  const [kind, key] = value.split(':');
  if (kind !== 'scale' && kind !== 'chord') return null;
  return { kind, key };
}

export function ControlBar({
  tuningId,
  stringCount,
  selection,
  labelMode,
  theme,
  onTuningChange,
  onStringCountChange,
  onSelectionChange,
  onLabelModeChange,
  onClear,
  onThemeToggle,
}: ControlBarProps) {
  return (
    <div className="control-bar" role="toolbar" aria-label="Fretsplorer controls">
      <span className="brand">Fretsplorer</span>

      <label className="control">
        <span className="control-label">Tuning</span>
        <select value={tuningId} onChange={(e) => onTuningChange(e.target.value)}>
          {TUNINGS.map((t) => (
            <option key={t.id} value={t.id}>
              {tuningLabel(t.id)}
            </option>
          ))}
        </select>
      </label>

      <label className="control">
        <span className="control-label">Strings</span>
        <select
          value={stringCount}
          onChange={(e) => onStringCountChange(Number(e.target.value))}
        >
          {STRING_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="control">
        <span className="control-label">Scale / Chord</span>
        <select
          value={encode(selection)}
          onChange={(e) => onSelectionChange(decode(e.target.value))}
        >
          <option value={NONE_VALUE}>— none —</option>
          <optgroup label="Scales">
            {SCALES.map((s) => (
              <option key={s.key} value={`scale:${s.key}`}>
                {s.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Chords">
            {CHORDS.map((c) => (
              <option key={c.key} value={`chord:${c.key}`}>
                {c.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <button
        type="button"
        className="control-btn"
        onClick={() => onLabelModeChange(nextLabelMode(labelMode))}
        aria-label={`Cycle label mode (currently ${labelMode})`}
      >
        {labelModeCaption(labelMode)}
      </button>

      <button type="button" className="control-btn" onClick={onClear}>
        Clear
      </button>

      <button
        type="button"
        className="control-btn theme-toggle"
        onClick={onThemeToggle}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </div>
  );
}
