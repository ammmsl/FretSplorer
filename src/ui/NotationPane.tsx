// NotationPane (/ui) — the docked notation + playback pane, now mounting alphaTab LAZILY
// (item 7; ADR 0011/0012). alphaTab is heavy, so — mirroring the Tier-3 Pyodide pattern —
// it is NEVER imported in the hot loop and NOT loaded until the user first EXPANDS the pane.
// On expand we dynamic-import the engine + the Bravura font + the sonivox soundfont, boot an
// AlphaTabApi against a container div, and render the focused shape (or, if empty, the open
// chord) via our pure model->AlphaTex adapter (fragmentToAlphaTex). A play/pause control
// arms once the soundfont has loaded. Re-rendering on shape/tuning change is a slow-cadence
// tex() push, never the interactive loop. Load failure shows an error, never a crash.
// PROVISIONAL placement (it already lived in the shell as a placeholder; only the content is new).

import { useEffect, useRef, useState } from 'react';
import type { Tuning } from '../core';
import { fragmentToAlphaTex } from '../render';
import type { Shape } from './shape';
import { shapeToFragment } from './notation';

interface CollapsibleProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

type Phase = 'idle' | 'loading' | 'ready' | 'error';

/** Minimal structural view of the bits of AlphaTabApi we drive (avoids a type import). */
interface AlphaTabApiLike {
  tex(tex: string): void;
  playPause(): void;
  stop(): void;
  destroy(): void;
  readonly soundFontLoaded: { on(cb: () => void): void };
  readonly error: { on(cb: (e: unknown) => void): void };
}

export function NotationPane({
  collapsed,
  onToggle,
  tuning,
  shape,
}: CollapsibleProps & { tuning: Tuning; shape: Shape }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<AlphaTabApiLike | null>(null);
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>('');
  const [soundReady, setSoundReady] = useState(false);
  const [tempo] = useState(60);

  // LAZY boot: on first expand, dynamic-import the engine + assets and create the api.
  // Guard with a ref (not `phase`) so that calling setPhase('loading') below does NOT
  // re-trigger this effect — doing so would fire the cleanup, flip `cancelled` on the
  // in-flight boot, and the async closure would bail right before setPhase('ready'),
  // leaving the pane stuck on "loading alphaTab…" forever.
  useEffect(() => {
    if (collapsed || startedRef.current || containerRef.current === null) return;
    startedRef.current = true;
    let cancelled = false;
    setPhase('loading');

    (async () => {
      try {
        const [at, bravura, soundfont] = await Promise.all([
          import('@coderline/alphatab'),
          import('@coderline/alphatab/font/Bravura.woff2?url'),
          import('@coderline/alphatab/soundfont/sonivox.sf3?url'),
        ]);
        if (cancelled || containerRef.current === null) return;
        const api = new at.AlphaTabApi(containerRef.current, {
          core: {
            engine: 'svg',
            logLevel: 'warning',
            smuflFontSources: new Map([[at.FontFileFormat.Woff2, bravura.default]]),
          },
          player: { enablePlayer: true, soundFont: soundfont.default, enableCursor: true },
          display: { scale: 0.9 },
        }) as unknown as AlphaTabApiLike;
        api.error.on((e) => {
          if (!cancelled) setError(String((e as Error)?.message ?? e));
        });
        api.soundFontLoaded.on(() => {
          if (!cancelled) setSoundReady(true);
        });
        apiRef.current = api;
        api.tex(fragmentToAlphaTex(shapeToFragment(shape, tuning, tempo)));
        setPhase('ready');
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only the first expand boots the engine; shape/tuning re-render is a separate effect.
    // `phase` is intentionally NOT a dep (see comment above); startedRef makes this run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  // Destroy the api on unmount (it owns a worker + audio context).
  useEffect(() => {
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  // Slow-cadence re-render: when the shape or tuning changes and the engine is ready, push a
  // fresh AlphaTex. Never runs in the hot interactive loop (only on a committed shape change).
  // shapeToFragment always yields a valid, non-empty fragment (it falls back to the open chord
  // and frets are >= 0), so fragmentToAlphaTex cannot throw here.
  useEffect(() => {
    if (phase !== 'ready' || apiRef.current === null) return;
    apiRef.current.tex(fragmentToAlphaTex(shapeToFragment(shape, tuning, tempo)));
  }, [shape, tuning, tempo, phase]);

  return (
    <section className={`panel notation-pane${collapsed ? ' collapsed' : ''}`} aria-label="Notation">
      <button type="button" className="collapse-btn" onClick={onToggle} aria-expanded={!collapsed}>
        {collapsed ? '♪ Notation ›' : '‹ Notation'}
      </button>
      {!collapsed && (
        <div className="notation-body">
          <div className="notation-controls">
            <button
              type="button"
              className="notation-play"
              disabled={!soundReady}
              onClick={() => apiRef.current?.playPause()}
            >
              ▶ / ❚❚
            </button>
            <button
              type="button"
              className="notation-stop"
              disabled={!soundReady}
              onClick={() => apiRef.current?.stop()}
            >
              ◼
            </button>
            <span className="notation-status panel-note">
              {phase === 'loading' && 'loading alphaTab…'}
              {phase === 'error' && `notation error: ${error}`}
              {phase === 'ready' && (soundReady ? 'ready — press play' : 'rendered ✓ — loading soundfont…')}
              {phase === 'idle' && 'expand to load notation'}
            </span>
          </div>
          {/* alphaTab renders its SVG into this container. */}
          <div ref={containerRef} className="notation-surface" />
        </div>
      )}
    </section>
  );
}
