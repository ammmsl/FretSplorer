// AppShell (/ui) — the three-region collapsible shell + state wiring (ADR 0005;
// docs/08). The M0 milestone surface: select a scale/chord -> project() -> degree
// dots paint on every neck; switch a neck's tuning -> re-project (overlay moves);
// the drone channel lights when a context is set; Clear removes the overlay.
//
// STATE is ephemeral (no persistence, docs/02). The shell now ALSO owns a SHAPE for
// the focused neck (docs/08 decision e) and runs the M1 hot loop: on any shape change
// it derives PlacedPosition[] and the live Readout view-model (docs/09 UI#4). Only
// alphaTab stays out of the hot loop.

import { useEffect, useMemo, useState } from 'react';
import type { CapoShift, ProjectableEntity, Tuning } from '../core';
import { applyCapo } from '../core';
import { capoShiftFrom } from './capo';
import { project, droneMap } from '../projection';
import type { OpenStringDrone } from '../projection';
import { translate } from '../mcp';
import { ControlBar, type ContextSelection } from './ControlBar';
import { NeckStack, type NeckInstance } from './NeckStack';
import {
  GrammarCardPanel,
  ReadoutPanel,
  ConversationPanel,
  type SpawnOption,
} from './panels';
import { NotationPane } from './NotationPane';
import { SetupPane } from './SetupPane';
import { CHORDS, SCALES, TUNINGS, tuningLabel } from './fixtures';
import { DEFAULT_LABEL_MODE, type LabelMode } from './labels';
import { DEFAULT_THEME, nextTheme, type Theme } from './theme';
import {
  cycleNutMarker,
  emptyShape,
  isShapeEmpty,
  placeFret,
  removeNote,
  type Shape,
} from './shape';
import { buildReadout } from './readout';

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

/**
 * The EFFECTIVE tuning for a neck = its base tuning with any capo applied. applyCapo shifts
 * the open-string pitches (so the overlay + readout re-project) while PRESERVING the tonic
 * (the capo's pedagogical anchor — core/tuning.ts). We deliberately keep the BASE id on the
 * result so the grammar card still resolves under a capo (capo preserves the grammar, only
 * absolute pitches transpose). A no-op capo (absent / all-zero / wrong length) returns base.
 */
function effectiveTuning(base: Tuning, capo: CapoShift | undefined): Tuning {
  if (!capo || capo.length !== base.openStrings.length || capo.every((c) => c === 0)) {
    return base;
  }
  return { ...applyCapo(base, capo), id: base.id };
}

/**
 * Derive the renderable capo (absolute fret + which strings it covers) from a CapoShift.
 * capoShiftFrom clamps every covered string at one fret, so the fret is the max entry and
 * the covered strings are those at that fret. Returns null for a no-op (all-zero) shift.
 */
function capoFromShift(
  shift: CapoShift | undefined,
): { fret: number; covered: boolean[] } | null {
  if (!shift || shift.length === 0) return null;
  const fret = Math.max(0, ...shift);
  if (fret === 0) return null;
  return { fret, covered: shift.map((v) => v === fret) };
}

/** A voicing's per-string frets (fret, 0 = open, null = muted) -> a renderable Shape. */
function fretsToShape(frets: readonly (number | null)[]): Shape {
  return frets.map((f) =>
    f === null
      ? ({ kind: 'muted' as const })
      : f === 0
        ? ({ kind: 'open' as const })
        : ({ kind: 'fret' as const, fret: f }),
  );
}

/** Per-neck state: identity + which tuning it projects onto. */
interface NeckState {
  readonly id: string;
  readonly tuningId: string;
  readonly tag: string;
  readonly isOrigin: boolean;
  /** Caption override (e.g. a spawned comparison option's chord symbol). */
  readonly caption?: string;
  /** A pinned shape for a spawned comparison neck (rendered without being focused). */
  readonly pinnedShape?: Shape;
}

const TAGS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function AppShell() {
  const [selection, setSelection] = useState<ContextSelection | null>(null);
  const [labelMode, setLabelMode] = useState<LabelMode>(DEFAULT_LABEL_MODE);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [notationCollapsed, setNotationCollapsed] = useState(true);
  const [setupCollapsed, setSetupCollapsed] = useState(true);

  const [necks, setNecks] = useState<readonly NeckState[]>([
    { id: 'neck-0', tuningId: 'eadgbe', tag: 'A', isOrigin: true },
  ]);
  const [focusedId, setFocusedId] = useState('neck-0');

  // Per-neck SHAPE (the held notes). Keyed by neck id; a neck with no entry is empty.
  const [shapes, setShapes] = useState<Readonly<Record<string, Shape>>>({});

  // Per-neck CAPO shift (provisional; set from the Lab). Keyed by neck id; no entry = uncapoed.
  const [capos, setCapos] = useState<Readonly<Record<string, CapoShift>>>({});

  // PREVIEW-WITH-RESTORE: a transient shape (from tapping a movable shape in the grammar
  // card) layered OVER the focused neck's committed shape. The neck + readout render the
  // preview; dismissing (Esc / re-tap / starting to place notes / changing focus) restores
  // the committed shape; "keep" commits it. `key` = `${shapeId}@${anchor}` (ADR 0013).
  const [preview, setPreview] = useState<{ shape: Shape; key: string } | null>(null);

  // Capo-edit mode for the FOCUSED neck: while on, neck pointer drags move the capo bar
  // instead of placing notes (ADR 0014). Reset whenever focus/tuning changes.
  const [capoEdit, setCapoEdit] = useState(false);

  // Apply the theme to the document root so CSS can theme-switch.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Esc dismisses a live preview (restores the committed shape).
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

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
      const base = tuningById.get(n.tuningId) ?? TUNINGS[0];
      const tuning = effectiveTuning(base, capos[n.id]);
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
        caption: n.caption ?? selectionLabel(selection),
        isOrigin: n.isOrigin,
        shape: n.pinnedShape,
        capo: capoFromShift(capos[n.id]),
      };
    });
  }, [necks, entity, selection, tuningById, capos]);

  const focusedNeck = necks.find((n) => n.id === focusedId) ?? necks[0];
  const focusedBaseTuning = tuningById.get(focusedNeck.tuningId) ?? TUNINGS[0];
  const focusedTuning = effectiveTuning(focusedBaseTuning, capos[focusedNeck.id]);
  const contextSummary = selectionLabel(selection);

  // Other tunings the focused shape can morph to (the "+ neck → morph to …" + conversation
  // "in DADGAD?" both feed handleMorph). Excludes the focused tuning itself.
  const morphTargets = TUNINGS.filter((t) => t.id !== focusedTuning.id).map((t) => ({
    id: t.id,
    label: tuningLabel(t.id),
  }));

  // The focused neck's COMMITTED shape (default empty for its string count), and the
  // DISPLAYED shape = a live preview layered over it, else the committed one. Everything
  // downstream (readout, bass, neck, notation, conversation) reads the displayed shape, so
  // a preview is analysed exactly as if held — without destroying the committed shape.
  const committedShape: Shape =
    shapes[focusedNeck.id] ?? emptyShape(focusedTuning.openStrings.length);
  const focusedShape: Shape = preview ? preview.shape : committedShape;

  // Drone readings for the focused neck (the open-string drone channel, when a context
  // is selected) — fed to the Readout so OPEN strings report their drone tension.
  const focusedDrones: readonly OpenStringDrone[] | undefined = useMemo(
    () => (entity ? droneMap(entity, focusedTuning) : undefined),
    [entity, focusedTuning],
  );

  // ── M1 HOT LOOP ── derive the live Readout from (shape, tuning) synchronously. Also
  // expose the bass (lowest-pitch) string+fret so the neck can draw its bass marker.
  const readout = useMemo(
    () => buildReadout(focusedShape, focusedTuning, focusedDrones),
    [focusedShape, focusedTuning, focusedDrones],
  );

  // Locate the bass note's string+fret in the shape (the lowest sounding pitch) so the
  // neck marker sits on the right cell. Mirrors identify()'s argmin-pitch bass (R10).
  const bass = useMemo(() => {
    let best: { string: number; fret: number; pitch: number } | null = null;
    focusedShape.forEach((sg, s) => {
      if (sg.kind !== 'open' && sg.kind !== 'fret') return;
      const fret = sg.kind === 'open' ? 0 : sg.fret;
      const pitch = (focusedTuning.openStrings[s] as number) + fret;
      if (!best || pitch < best.pitch) best = { string: s, fret, pitch };
    });
    return best as { string: number; fret: number; pitch: number } | null;
  }, [focusedShape, focusedTuning]);

  // Tuning selector retunes the FOCUSED neck (re-projection follows from useMemo).
  // Retuning clears that neck's shape — the held frets mean different pitches now.
  function handleTuningChange(id: string) {
    setPreview(null);
    setCapoEdit(false);
    setNecks((prev) =>
      prev.map((n) => (n.id === focusedId ? { ...n, tuningId: id } : n)),
    );
    setShapes((prev) => {
      if (!prev[focusedId]) return prev;
      const next = { ...prev };
      delete next[focusedId];
      return next;
    });
    // A retune also clears the capo: the shift vector was sized for the old string count.
    setCapos((prev) => {
      if (!prev[focusedId]) return prev;
      const next = { ...prev };
      delete next[focusedId];
      return next;
    });
  }

  // Capo for the focused neck (provisional; from the Lab). applyCapo runs in effectiveTuning,
  // so setting a capo re-projects the overlay + re-derives the readout for free.
  // A capo-drag reports (fret, spanEnd): the bar covers strings 0..spanEnd at `fret` —
  // a contiguous span from the top edge. capoShiftFrom turns that into the per-string shift.
  function handleCapoSet(fret: number, loString: number, hiString: number) {
    const n = focusedBaseTuning.openStrings.length;
    const covered = Array.from({ length: n }, (_, i) => i >= loString && i <= hiString);
    setCapos((prev) => ({ ...prev, [focusedId]: capoShiftFrom(fret, covered) }));
    // A held note BEHIND the capo on a covered string can no longer ring — the capo is the
    // new floor — so it shifts ONTO the capo line (becomes open-at-capo). Notes at/above the
    // capo are untouched (ADR 0014).
    setShapes((prev) => {
      const cur = prev[focusedId];
      if (!cur) return prev;
      let changed = false;
      const next = cur.map((sg, s) => {
        if (covered[s] && sg.kind === 'fret' && sg.fret < fret) {
          changed = true;
          return { kind: 'open' as const };
        }
        return sg;
      });
      return changed ? { ...prev, [focusedId]: next } : prev;
    });
  }

  function handleCapoClear() {
    setCapos((prev) => {
      if (!prev[focusedId]) return prev;
      const next = { ...prev };
      delete next[focusedId];
      return next;
    });
  }

  // ── Shape mutations (the focused neck only) ──
  /** Click a fret cell: remove if that string already holds THIS exact fret, else place.
   *  Starting to place notes dismisses any live preview (we edit the COMMITTED shape). */
  function handleFretClick(string: number, fret: number) {
    setPreview(null);
    setShapes((prev) => {
      const cur = prev[focusedId] ?? emptyShape(focusedTuning.openStrings.length);
      const sg = cur[string];
      const holdsThis =
        (fret === 0 && sg?.kind === 'open') ||
        (fret > 0 && sg?.kind === 'fret' && sg.fret === fret);
      const next = holdsThis ? removeNote(cur, string) : placeFret(cur, string, fret);
      return { ...prev, [focusedId]: next };
    });
  }

  /** Click the nut marker: cycle open -> muted -> off. (Also dismisses a live preview.) */
  function handleNutClick(string: number) {
    setPreview(null);
    setShapes((prev) => {
      const cur = prev[focusedId] ?? emptyShape(focusedTuning.openStrings.length);
      return { ...prev, [focusedId]: cycleNutMarker(cur, string) };
    });
  }

  // Preview a realised movable shape (from the grammar card) on the FOCUSED neck. Toggling
  // the same anchor again restores the committed shape; tapping another swaps the preview.
  function handlePreviewShape(shape: Shape, key: string) {
    setPreview((cur) => (cur?.key === key ? null : { shape, key }));
  }

  // "Keep this shape" — commit the live preview into the focused neck's held shape.
  function handleKeepPreview() {
    if (!preview) return;
    const kept = preview.shape;
    setShapes((prev) => ({ ...prev, [focusedId]: kept }));
    setPreview(null);
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

  /**
   * Morph (translate) — re-place the focused shape's SOUNDING PITCHES on a target tuning and
   * spawn the result as a new neck BESIDE the origin (docs/04 flow 3; CONTEXT.md "Origin
   * neck" — the change from it to a spawned neck drives the learning path). Unreachable
   * pitches (below the open string / off the neck) are dropped to muted on the spawned neck;
   * the conversation turn carries the full per-pitch landing detail. With an empty focused
   * shape this is just "add a neck in another tuning".
   */
  function handleMorph(targetId: string) {
    const target = tuningById.get(targetId);
    if (!target) return;
    const frets: (number | null)[] = Array.from(
      { length: target.openStrings.length },
      () => null,
    );
    if (!isShapeEmpty(focusedShape)) {
      const result = translate(focusedShape, focusedTuning, target);
      for (const note of result.truth.notes) {
        if (note.belowOpenString || note.offNeck || note.toString == null) continue;
        frets[note.toString] = note.toFret ?? 0;
      }
    }
    const morphed = fretsToShape(frets);
    setNecks((prev) => {
      const tag = TAGS[prev.length % TAGS.length];
      return [
        ...prev,
        {
          id: `neck-${Date.now()}`,
          tuningId: targetId,
          tag,
          isOrigin: false,
          caption: `morphed from ${tuningLabel(focusedTuning.id)}`,
          pinnedShape: morphed,
        },
      ];
    });
  }

  /**
   * Spawn the conversation's option voicings as comparison necks BESIDE the focused neck
   * (docs/04 flow 2 — comparison is the teaching act). Each option becomes a new neck on
   * the focused tuning, pinned to the option's shape + captioned with its symbol. We do NOT
   * touch the user's own neck or change focus (the focus pointer stays on theirs).
   */
  function handleSpawnOptions(options: readonly SpawnOption[]) {
    if (options.length === 0) return;
    setNecks((prev) => {
      const spawned: NeckState[] = options.map((o, i) => ({
        id: `neck-${Date.now()}-${i}`,
        tuningId: focusedTuning.id,
        tag: TAGS[(prev.length + i) % TAGS.length],
        isOrigin: false,
        caption: `option · ${o.symbol}`,
        pinnedShape: fretsToShape(o.frets),
      }));
      return [...prev, ...spawned];
    });
  }

  // Move focus to another neck — a live preview was relative to the previously-focused neck,
  // so it's dismissed (restoring that neck's committed shape) as focus moves.
  function handleFocus(id: string) {
    if (id !== focusedId) {
      setPreview(null);
      setCapoEdit(false);
    }
    setFocusedId(id);
  }

  function handleClose(id: string) {
    setPreview(null);
    setCapoEdit(false);
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
          onPreviewShape={handlePreviewShape}
          previewKey={preview?.key ?? null}
        />

        <main className="center-region" aria-label="Neck stack">
          {preview && (
            <div className="preview-bar" role="status" aria-live="polite">
              <span className="preview-bar-label">
                Previewing a shape from the grammar card — not kept yet.
              </span>
              <span className="preview-bar-actions">
                <button type="button" className="preview-keep" onClick={handleKeepPreview}>
                  keep this shape
                </button>
                <button
                  type="button"
                  className="preview-dismiss"
                  onClick={() => setPreview(null)}
                >
                  dismiss (Esc)
                </button>
              </span>
            </div>
          )}
          <NeckStack
            necks={neckInstances}
            focusedId={focusedId}
            labelMode={labelMode}
            focusedShape={focusedShape}
            bassString={bass ? bass.string : null}
            bassFret={bass ? bass.fret : null}
            onFocus={handleFocus}
            onClose={handleClose}
            onAddNeck={handleAddNeck}
            morphTargets={morphTargets}
            onMorph={handleMorph}
            onFretClick={handleFretClick}
            onNutClick={handleNutClick}
            capoEditActive={capoEdit}
            focusedHasCapo={!!capoFromShift(capos[focusedId])}
            onToggleCapoEdit={() => setCapoEdit((e) => !e)}
            onCapoSet={handleCapoSet}
            onCapoClear={handleCapoClear}
          />
          {/* Bottom dock — slow-cadence reference surfaces, out of the hot loop. Both
              collapsible; the neck floor (ADR 0013) keeps them from crushing the board. */}
          <div className="center-dock">
            <NotationPane
              collapsed={notationCollapsed}
              onToggle={() => setNotationCollapsed((c) => !c)}
              tuning={focusedTuning}
              shape={focusedShape}
            />
            <SetupPane
              collapsed={setupCollapsed}
              onToggle={() => setSetupCollapsed((c) => !c)}
              tuning={focusedTuning}
            />
          </div>
        </main>

        <div className="right-region">
          <ReadoutPanel readout={readout} contextSummary={contextSummary} />
          <ConversationPanel
            shape={focusedShape}
            tuning={focusedTuning}
            onSpawnOptions={handleSpawnOptions}
            onMorph={handleMorph}
          />
        </div>
      </div>
    </div>
  );
}
