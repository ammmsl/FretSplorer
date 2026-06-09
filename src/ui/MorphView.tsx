// MorphView (/ui, item 9 stretch) — a SELF-CONTAINED morph/translate view: take the
// focused shape's SOUNDING PITCHES (the invariant) and re-place them on a chosen target
// tuning via the MCP translate() tool, showing the retune (source vs target open strings)
// and, per pitch, where it lands (string/fret) or that it falls off the neck. This is the
// data spine of the "…in DADGAD?" flow made visual, side by side. Full neck animation is
// deferred polish; the grounded before->after mapping is the substance. PROVISIONAL: Lab.

import { useState } from 'react';
import type { Tuning } from '../core';
import { translate } from '../mcp';
import { tuningLabel } from './fixtures';
import type { Shape } from './shape';
import { isShapeEmpty } from './shape';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiName = (m: number): string => `${SHARP_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

export function MorphView({
  shape,
  fromTuning,
  targets,
}: {
  shape: Shape;
  fromTuning: Tuning;
  targets: readonly Tuning[];
}) {
  const options = targets.filter((t) => t.id !== fromTuning.id);
  const [targetId, setTargetId] = useState<string>(options[0]?.id ?? '');
  const target = options.find((t) => t.id === targetId) ?? options[0];

  if (isShapeEmpty(shape)) {
    return <p className="panel-note">Place a shape on the focused neck, then morph it to another tuning.</p>;
  }
  if (!target) {
    return <p className="panel-note">No other tuning to morph to.</p>;
  }

  const result = translate(shape, fromTuning, target);

  return (
    <div className="morph-view" aria-label="Morph to another tuning">
      <label className="morph-target">
        morph to&nbsp;
        <select value={target.id} onChange={(e) => setTargetId(e.target.value)} aria-label="target tuning">
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {tuningLabel(t.id)}
            </option>
          ))}
        </select>
      </label>

      {/* The retune itself — source open strings -> target open strings, side by side. */}
      <div className="morph-retune">
        <span className="morph-side">
          <em>{tuningLabel(fromTuning.id)}</em>
          <code>{fromTuning.openStrings.map((m) => midiName(m as number)).join(' ')}</code>
        </span>
        <span className="morph-arrow">→</span>
        <span className="morph-side">
          <em>{tuningLabel(target.id)}</em>
          <code>{target.openStrings.map((m) => midiName(m as number)).join(' ')}</code>
        </span>
      </div>

      {/* Per-pitch landing — the invariant pitch and where it lands (or off the neck). */}
      <ul className="morph-notes">
        {result.truth.notes.map((n, i) => (
          <li
            key={`morph-${i}`}
            className={`morph-note${n.belowOpenString || n.offNeck ? ' unreachable' : ''}`}
          >
            <span className="morph-pitch">{n.note}</span>
            <span className="morph-landing">
              {n.belowOpenString
                ? 'below every open string'
                : n.offNeck
                  ? 'above the playable neck'
                  : `string ${n.toString! + 1}, fret ${n.toFret}`}
            </span>
          </li>
        ))}
      </ul>

      <p className="panel-note morph-summary">{result.explanation}</p>
    </div>
  );
}
