// CapoControl (/ui) — a SELF-CONTAINED control that emits a CapoShift vector (core
// pitch-model). A capo is a runtime per-string semitone shift: a FULL capo presses every
// string at the same fret; a PARTIAL capo presses only a chosen subset (a span), leaving
// the others open as drones (docs/01 §C; CONTEXT.md "Capo"). The component owns only its
// own widget state (fret + which strings are clamped) and reports the resulting CapoShift
// up via onChange — it never applies the shift itself (the shell does, via applyCapo), so
// it stays pure, testable, and flow-agnostic. PROVISIONAL: mounted in the Lab, not placed.
//
// The parent remounts this (key=tuning id) on a retune, so `stringCount` is fixed per mount
// and onChange is reported from the event handlers — no setState-in-effect.

import { useState } from 'react';
import type { CapoShift } from '../core';
import { capoShiftFrom } from './capo';

export interface CapoControlProps {
  /** String count of the tuning the capo applies to (CapoShift length must match). */
  readonly stringCount: number;
  /** Emits the per-string semitone shift vector whenever it changes. */
  readonly onChange: (capo: CapoShift) => void;
}

const MAX_CAPO_FRET = 9;

export function CapoControl({ stringCount, onChange }: CapoControlProps) {
  const [fret, setFret] = useState(0);
  // Which strings the capo presses. Defaults to ALL (a full capo).
  const [clamped, setClamped] = useState<boolean[]>(() =>
    Array.from({ length: stringCount }, () => true),
  );

  function changeFret(next: number) {
    setFret(next);
    onChange(capoShiftFrom(next, clamped));
  }

  function toggleString(i: number) {
    const next = clamped.map((p, j) => (j === i ? !p : p));
    setClamped(next);
    onChange(capoShiftFrom(fret, next));
  }

  const partial = clamped.some((c) => !c);

  return (
    <div className="capo-control" aria-label="Capo">
      <div className="capo-row">
        <label className="capo-fret-label">
          fret
          <input
            type="range"
            min={0}
            max={MAX_CAPO_FRET}
            value={fret}
            onChange={(e) => changeFret(Number(e.target.value))}
            aria-label="capo fret"
          />
          <code className="capo-fret-value">{fret === 0 ? 'off' : fret}</code>
        </label>
      </div>

      <div className="capo-strings" role="group" aria-label="strings under the capo">
        {clamped.map((on, i) => (
          <button
            key={`capo-str-${i}`}
            type="button"
            className={`capo-string-toggle${on ? ' on' : ''}`}
            aria-pressed={on}
            title={`string ${i + 1} ${on ? 'clamped' : 'open'}`}
            onClick={() => toggleString(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <p className="capo-summary panel-note">
        {fret === 0
          ? 'no capo — open tuning'
          : `${partial ? 'partial' : 'full'} capo at fret ${fret}${
              partial
                ? ` (strings ${clamped.map((c, i) => (c ? i + 1 : null)).filter(Boolean).join(', ')})`
                : ''
            } — tonic (the grammar anchor) is preserved; only pitches transpose.`}
      </p>
    </div>
  );
}
