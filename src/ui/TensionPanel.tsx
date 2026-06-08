// TensionPanel (/ui) — a SELF-CONTAINED view over /tension adviseSetup (via the MCP
// adviseSetupTool). Orthogonal to harmony: it reports per-string PHYSICAL tension (lb),
// a feel band + a floppy / fine / break-risk flag, and a gauge recommendation when the
// estimated choice could improve (docs/01 §E; ADR 0007). Numeric tensions are COMPUTED;
// the feel-band judgement is editorial inside /tension itself. Gauges are ESTIMATED here
// (no per-string gauge input yet) — every estimate is flagged uncertain, never asserted.
// PROVISIONAL: mounted in the Lab, not placed.

import { useMemo, useState } from 'react';
import type { Tuning } from '../core';
import { adviseSetupTool } from '../mcp';
import type { Instrument } from '../tension';

const FLAG_LABEL: Record<string, string> = {
  floppy: 'floppy',
  fine: 'fine',
  'break-risk': 'break risk',
};

export function TensionPanel({ tuning }: { tuning: Tuning }) {
  const [instrument, setInstrument] = useState<Instrument>('electric');

  // adviseSetupTool is pure; recompute only when the tuning or instrument changes.
  const advice = useMemo(
    () => adviseSetupTool(tuning, { instrument }).truth.advice,
    [tuning, instrument],
  );

  return (
    <div className="tension-panel" aria-label="String tension">
      <div className="tension-controls">
        <div className="seg" role="group" aria-label="instrument">
          {(['electric', 'acoustic'] as const).map((inst) => (
            <button
              key={inst}
              type="button"
              className={`seg-btn${instrument === inst ? ' on' : ''}`}
              aria-pressed={instrument === inst}
              onClick={() => setInstrument(inst)}
            >
              {inst}
            </button>
          ))}
        </div>
        <span className="tension-total">
          total <code>{advice.totalTensionLb.toFixed(1)} lb</code>
        </span>
      </div>

      <ul className="tension-rows">
        {advice.strings.map((s) => (
          <li key={s.stringIndex} className={`tension-row flag-${s.flag}`}>
            <span className="tension-note">{s.noteName}</span>
            <span className="tension-lb">{s.tension.lb.toFixed(1)} lb</span>
            <span className="tension-band">{s.band}</span>
            <span className={`tension-flag flag-${s.flag}`}>{FLAG_LABEL[s.flag] ?? s.flag}</span>
            {s.gauge.estimated && (
              <span className="tension-est" title="gauge estimated — uncertain">
                ~{s.gauge.gauge.toFixed(3)}
              </span>
            )}
            {s.recommendation && (
              <span className="tension-rec" title={s.recommendation.reason}>
                → try {s.recommendation.gauge.toFixed(3)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {advice.warnings.length > 0 && (
        <ul className="tension-warnings panel-note">
          {advice.warnings.map((w, i) => (
            <li key={`tw-${i}`}>{w}</li>
          ))}
        </ul>
      )}

      <p className="panel-note tension-prov">
        {advice.provenance.formula} · gauges estimated unless specified (uncertain).
      </p>
    </div>
  );
}
