// AppShell (/ui) — the three-region collapsible shell + state wiring (ADR 0005;
// docs/08). The M0 milestone surface: select a scale/chord -> project() -> degree
// dots paint on every neck; switch a neck's tuning -> re-project (overlay moves);
// the drone channel lights when a context is set; Clear removes the overlay.
//
// STATE is ephemeral (no persistence, docs/02). No per-note selection state (deixis
// is an MCP concern, docs/09 UI#3). identify()/Readout-live wiring is OUT of scope (M1).

import { useEffect, useMemo, useState } from 'react';
import type { ProjectableEntity, Tuning } from '../core';
import { project, droneMap } from '../projection';
import type { OpenStringDrone } from '../projection';
import { ControlBar, type ContextSelection } from './ControlBar';
import { NeckStack, type NeckInstance } from './NeckStack';
import {
  GrammarCardPanel,
  ReadoutPanel,
  ConversationPanel,
  NotationPane,
} from './panels';
import { CHORDS, SCALES, TUNINGS } from './fixtures';
import { DEFAULT_LABEL_MODE, type LabelMode } from './labels';
import { DEFAULT_THEME, nextTheme, type Theme } from './theme';

/** Build the active ProjectableEntity from a selection, or null if none. */
function buildEntity(sel: ContextSelection | null): ProjectableEntity | null {
  if (!sel) return null;
  if (sel.kind === 'scale') {
    return SCALES.find((s) => s.key === sel.key)?.build() ?? null;
  }
  return CHORDS.find((c) => c.key === sel.key)?.build() ?? null;
}

/** A short caption for the active context (used in captions + readout placeholder). */
function selectionLabel(sel: ContextSelection | null): string {
  if (!sel) return 'nothing yet';
  const opt =
    sel.kind === 'scale'
      ? SCALES.find((s) => s.key === sel.key)
      : CHORDS.find((c) => c.key === sel.key);
  return opt ? opt.label : 'nothing yet';
}

/** Per-neck state: identity + which tuning it projects onto. */
interface NeckState {
  readonly id: string;
  readonly tuningId: string;
  readonly tag: string;
  readonly isOrigin: boolean;
}

const TAGS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function AppShell() {
  const [selection, setSelection] = useState<ContextSelection | null>(null);
  const [labelMode, setLabelMode] = useState<LabelMode>(DEFAULT_LABEL_MODE);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [notationCollapsed, setNotationCollapsed] = useState(true);

  const [necks, setNecks] = useState<readonly NeckState[]>([
    { id: 'neck-0', tuningId: 'eadgbe', tag: 'A', isOrigin: true },
  ]);
  const [focusedId, setFocusedId] = useState('neck-0');

  // Apply the theme to the document root so CSS can theme-switch.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const entity = useMemo(() => buildEntity(selection), [selection]);

  const tuningById = useMemo(() => {
    const m = new Map<string, Tuning>();
    for (const t of TUNINGS) m.set(t.id, t);
    return m;
  }, []);

  // Build the renderable neck instances: project() the active entity onto each neck's
  // tuning, and compute the drone map when a context exists. Re-runs on selection or
  // tuning change -> the overlay moves (the M0 DoD).
  const neckInstances: NeckInstance[] = useMemo(() => {
    return necks.map((n) => {
      const tuning = tuningById.get(n.tuningId) ?? TUNINGS[0];
      const positions = entity ? project(entity, tuning) : [];
      const drones: readonly OpenStringDrone[] | undefined = entity
        ? droneMap(entity, tuning)
        : undefined;
      return {
        id: n.id,
        tuning,
        positions,
        drones,
        tag: n.tag,
        caption: selectionLabel(selection),
        isOrigin: n.isOrigin,
      };
    });
  }, [necks, entity, selection, tuningById]);

  const focusedNeck = necks.find((n) => n.id === focusedId) ?? necks[0];
  const focusedTuning = tuningById.get(focusedNeck.tuningId) ?? TUNINGS[0];
  const contextSummary = selectionLabel(selection);

  // Tuning selector retunes the FOCUSED neck (re-projection follows from useMemo).
  function handleTuningChange(id: string) {
    setNecks((prev) =>
      prev.map((n) => (n.id === focusedId ? { ...n, tuningId: id } : n)),
    );
  }

  function handleAddNeck() {
    setNecks((prev) => {
      const tag = TAGS[prev.length % TAGS.length];
      const id = `neck-${Date.now()}`;
      const next: NeckState = {
        id,
        tuningId: focusedTuning.id,
        tag,
        isOrigin: false,
      };
      return [...prev, next];
    });
  }

  function handleClose(id: string) {
    setNecks((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((n) => n.id !== id);
      if (id === focusedId) setFocusedId(remaining[0].id);
      return remaining;
    });
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <ControlBar
        tuningId={focusedTuning.id}
        selection={selection}
        labelMode={labelMode}
        theme={theme}
        onTuningChange={handleTuningChange}
        onSelectionChange={setSelection}
        onLabelModeChange={setLabelMode}
        onClear={() => setSelection(null)}
        onThemeToggle={() => setTheme(nextTheme(theme))}
      />

      <div className={`shell-body${leftCollapsed ? ' left-collapsed' : ''}`}>
        <GrammarCardPanel
          tuning={focusedTuning}
          contextSummary={contextSummary}
          collapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed((c) => !c)}
        />

        <main className="center-region" aria-label="Neck stack">
          <NeckStack
            necks={neckInstances}
            focusedId={focusedId}
            labelMode={labelMode}
            onFocus={setFocusedId}
            onClose={handleClose}
            onAddNeck={handleAddNeck}
          />
          <NotationPane
            collapsed={notationCollapsed}
            onToggle={() => setNotationCollapsed((c) => !c)}
          />
        </main>

        <div className="right-region">
          <ReadoutPanel contextSummary={contextSummary} />
          <ConversationPanel />
        </div>
      </div>
    </div>
  );
}
