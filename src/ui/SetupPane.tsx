// SetupPane (/ui) — the string-tension / setup advisor, docked at the center bottom beside
// the Notation pane (ADR 0013 2b). It reframes /tension's per-string PHYSICAL tension as a
// DEVIATION FROM STANDARD TUNING: the same assumed gauge set is tuned to (a) this tuning and
// (b) standard EADGBE, and each string is reported as looser / tighter than its standard
// counterpart — the anchor a guitarist already feels. Absolute lb + the comfort band +
// break-risk flag (both ABSOLUTE — safety, not comparison) ride along as detail.
//
// Every assumption is surfaced (25.5" scale; a named default gauge set), never hidden — the
// grounding discipline (CONTEXT.md "Setup advice"). Held FAR from the harmonic drone map in
// the grammar card so physical tension never bleeds into harmonic graded tension.

import { useMemo, useState } from 'react';
import type { Tuning } from '../core';
import { adviseSetupTool } from '../mcp';
import type { GaugeInput, Instrument } from '../tension';
import { TUNINGS } from './fixtures';

const FLAG_LABEL: Record<string, string> = {
  floppy: 'floppy',
  fine: 'fine',
  'break-risk': 'break risk',
};

// Named default gauge sets (string 1 high -> low), extended for 7/8-string necks. Surfaced,
// not silently estimated: a clear reference beats per-string guesses (CONTEXT.md grounding).
const GAUGE_SETS: Record<Instrument, { label: string; gauges: number[] }> = {
  electric: { label: 'Regular Light (.010–.046)', gauges: [0.01, 0.013, 0.017, 0.026, 0.036, 0.046, 0.059, 0.07] },
  acoustic: { label: 'Light (.012–.053)', gauges: [0.012, 0.016, 0.024, 0.032, 0.042, 0.053, 0.064, 0.074] },
};

const STANDARD = TUNINGS.find((t) => t.id === 'eadgbe') ?? TUNINGS[0];

/** Format a per-string deviation from the standard-tuning counterpart. */
function deviationLabel(deltaLb: number): { text: string; tone: 'looser' | 'tighter' | 'same' } {
  if (Math.abs(deltaLb) < 0.5) return { text: '≈ standard', tone: 'same' };
  const mag = Math.abs(deltaLb).toFixed(1);
  return deltaLb < 0
    ? { text: `${mag} lb looser`, tone: 'looser' }
    : { text: `${mag} lb tighter`, tone: 'tighter' };
}

export function SetupPane({
  tuning,
  collapsed,
  onToggle,
}: {
  tuning: Tuning;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [instrument, setInstrument] = useState<Instrument>('electric');

  const { rows, totalLb, set } = useMemo(() => {
    const set = GAUGE_SETS[instrument];
    const n = tuning.openStrings.length;
    const gauges: GaugeInput[] = set.gauges.slice(0, n);
    const advice = adviseSetupTool(tuning, { instrument, gauges }).truth.advice;
    // Same physical gauge set tuned to standard EADGBE — the comparison baseline. Pair by
    // string position; extra strings on extended-range necks have no standard counterpart.
    const refGauges: GaugeInput[] = set.gauges.slice(0, STANDARD.openStrings.length);
    const ref = adviseSetupTool(STANDARD, { instrument, gauges: refGauges }).truth.advice;
    const rows = advice.strings.map((s, i) => {
      const refLb = ref.strings[i]?.tension.lb ?? null;
      return {
        key: s.stringIndex,
        note: s.noteName,
        lb: s.tension.lb,
        band: s.band,
        flag: s.flag,
        estimated: s.gauge.estimated,
        deviation: refLb === null ? null : deviationLabel(s.tension.lb - refLb),
      };
    });
    return { rows, totalLb: advice.totalTensionLb, set };
  }, [tuning, instrument]);

  return (
    <section className={`panel setup-pane${collapsed ? ' collapsed' : ''}`} aria-label="Setup">
      <button type="button" className="collapse-btn" onClick={onToggle} aria-expanded={!collapsed}>
        🎚 Setup {collapsed ? '›' : '▾'}
      </button>

      {!collapsed && (
        <div className="setup-body">
          <div className="setup-controls">
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
            <span className="setup-total">
              total <code>{totalLb.toFixed(1)} lb</code>
            </span>
          </div>

          <ul className="setup-rows">
            {rows.map((r) => (
              <li key={r.key} className={`setup-row flag-${r.flag}`}>
                <span className="setup-note">{r.note}</span>
                {r.deviation ? (
                  <span className={`setup-deviation tone-${r.deviation.tone}`}>{r.deviation.text}</span>
                ) : (
                  <span className="setup-deviation tone-none" title="no standard-tuning counterpart">
                    extended string
                  </span>
                )}
                <span className="setup-lb">{r.lb.toFixed(1)} lb</span>
                <span className="setup-band">{r.band}</span>
                <span className={`setup-flag flag-${r.flag}`}>{FLAG_LABEL[r.flag] ?? r.flag}</span>
              </li>
            ))}
          </ul>

          <p className="panel-note setup-prov">
            vs standard EADGBE · {set.label} · 25.5″ scale · gauges assumed (not measured).
          </p>
        </div>
      )}
    </section>
  );
}
