// Tier-3 anatomy (/ui) — the EXPANDABLE, LAZY inter-instrument anatomy control in the
// Readout (docs/08 f "T3 voicing anatomy (expandable)"; ADR 0008 lazy Pyodide).
//
// This is the ONE place alphaTab-style heaviness is allowed: it is OFF the hot loop.
// Pyodide + music21 MUST NOT load until the user EXPANDS the control — only then do we
// call analyzeTier3(), which boots the ~15.9 MB runtime (~8 s cold, then disk-cached).
// During the cold start we show a "loading music21…" state; a failed load renders an
// error, never a crash. The async is guarded against setState-after-unmount.

import { useEffect, useRef, useState } from 'react';
import type { Voicing } from '../core';
import { analyzeTier3 } from '../naming/tier3-music21';
import type { Tier3Result } from '../naming/tier3-music21';

/** Async UI state for the lazy Tier-3 fetch. */
type Phase =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly result: Tier3Result }
  | { readonly kind: 'error'; readonly message: string };

export interface Tier3AnatomyProps {
  /** The primary candidate's full pitch multiset (octaves/doublings preserved, R10). */
  readonly voicing: Voicing | null;
  /** music21 key string for the functional analysis, e.g. "G" (from the tuning tonic). */
  readonly keyString: string;
}

/**
 * A collapsed "▸ Tier-3 anatomy" disclosure. Pyodide stays unloaded until the FIRST
 * expand; expanding kicks off analyzeTier3() and shows the loading → ready/error states.
 * Collapsing does not unload (the runtime is cached by the analyzer); re-expanding with
 * the SAME voicing reuses the result, a changed voicing re-analyses on next expand.
 */
export function Tier3Anatomy({ voicing, keyString }: Tier3AnatomyProps) {
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  // Track the voicing identity we last analysed so a grip change invalidates the result
  // (re-analyses on next expand). Compare by the realised pitch multiset.
  const analysedKeyRef = useRef<string | null>(null);
  const voicingKey =
    voicing ? `${keyString}:${(voicing.pitches as readonly number[]).join(',')}` : null;

  useEffect(() => {
    if (!expanded || voicing === null || voicingKey === null) return;
    // Already analysed this exact voicing+key → keep the cached result.
    if (phase.kind === 'ready' && analysedKeyRef.current === voicingKey) return;

    let cancelled = false;
    setPhase({ kind: 'loading' });
    analyzeTier3(voicing, keyString)
      .then((result) => {
        if (cancelled) return;
        analysedKeyRef.current = voicingKey;
        setPhase({ kind: 'ready', result });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
    // voicingKey captures both voicing identity + keyString; expanded gates the load.
  }, [expanded, voicing, keyString, voicingKey, phase.kind]);

  return (
    <div className="readout-tier3">
      <button
        type="button"
        className="tier3-toggle"
        aria-expanded={expanded}
        disabled={voicing === null}
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? '▾' : '▸'} Tier-3 anatomy
      </button>

      {expanded && (
        <div className="tier3-body" aria-live="polite">
          {phase.kind === 'loading' && (
            <p className="tier3-loading">loading music21… (first run ~8 s)</p>
          )}
          {phase.kind === 'error' && (
            <p className="tier3-error" role="alert">
              Tier-3 analysis failed: {phase.message}
            </p>
          )}
          {phase.kind === 'ready' && <Tier3Body result={phase.result} />}
        </div>
      )}
    </div>
  );
}

/** Render the resolved Tier-3 payload: function figure + voicing anatomy. */
function Tier3Body({ result }: { result: Tier3Result }) {
  const { roman, anatomy } = result;
  const doublings = Object.entries(anatomy.doublings);
  const inversionLabel = ['root position', '1st inversion', '2nd inversion', '3rd inversion'][
    anatomy.inversion
  ] ?? `inversion ${anatomy.inversion}`;
  return (
    <dl className="tier3-anatomy">
      <div className="kv">
        <dt>function</dt>
        <dd>
          <code>{roman.figure}</code> <span className="tier3-muted">({roman.romanNumeral}, degree {roman.scaleDegree})</span>
        </dd>
      </div>
      <div className="kv">
        <dt>chord</dt>
        <dd>{anatomy.pitchedCommonName || anatomy.commonName}</dd>
      </div>
      <div className="kv">
        <dt>root</dt>
        <dd><code>{anatomy.root ?? '—'}</code></dd>
      </div>
      <div className="kv">
        <dt>bass</dt>
        <dd><code>{anatomy.bass ?? '—'}</code> <span className="tier3-muted">{inversionLabel}</span></dd>
      </div>
      <div className="kv">
        <dt>pitches</dt>
        <dd><code>{anatomy.pitches.join(' ')}</code></dd>
      </div>
      {doublings.length > 0 && (
        <div className="kv">
          <dt>doublings</dt>
          <dd>{doublings.map(([name, n]) => `${name}×${n}`).join(', ')}</dd>
        </div>
      )}
      {anatomy.omissions.length > 0 && (
        <div className="kv">
          <dt>omissions</dt>
          <dd>{anatomy.omissions.join(', ')}</dd>
        </div>
      )}
    </dl>
  );
}
