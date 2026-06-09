// NeckStack (/ui) — the vertical stack of horizontal necks with fret columns
// ALIGNED across necks (docs/08 §1g). Each neck row carries a short label + caption,
// a close (x), a focus accent (the focused neck) and a persistent "yours" marker on
// the ORIGIN neck. For M0 the shell seeds one neck and a "+ neck" control spawns more.
//
// Alignment is free because every Neck renders with the same fixed geometry/viewBox,
// so the nut and every fret line up vertically across the stack.

import type { ProjectedPosition, Tuning } from '../core';
import type { OpenStringDrone } from '../projection';
import { Neck } from './Neck';
import type { LabelMode } from './labels';
import type { Shape } from './shape';
import { tuningLabel } from './fixtures';

/** One neck instance in the stack. */
export interface NeckInstance {
  readonly id: string;
  readonly tuning: Tuning;
  readonly positions: readonly ProjectedPosition[];
  readonly drones?: readonly OpenStringDrone[];
  /** Short letter label, e.g. "A", "B". */
  readonly tag: string;
  /** Caption beneath the tag, e.g. context summary. */
  readonly caption: string;
  /** True for the origin ("yours") neck — a persistent subtle marker. */
  readonly isOrigin: boolean;
  /** A pinned shape to render on a NON-focused neck (e.g. a spawned comparison option).
   *  The focused neck draws the live `focusedShape` instead; this lets a spawned option
   *  neck show its concrete voicing without being focused (docs/04 flow 2). */
  readonly shape?: Shape;
  /** The capo on this neck (absolute fret + covered strings), or null (ADR 0014). */
  readonly capo?: { readonly fret: number; readonly covered: readonly boolean[] } | null;
}

export interface NeckStackProps {
  readonly necks: readonly NeckInstance[];
  readonly focusedId: string;
  readonly labelMode: LabelMode;
  /** The FOCUSED neck's shape (rendered + interactive); other necks stay presentational. */
  readonly focusedShape?: Shape;
  /** Bass (lowest-pitch) string+fret to call out on the focused neck; null = none. */
  readonly bassString?: number | null;
  readonly bassFret?: number | null;
  readonly onFocus: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onAddNeck: () => void;
  /** Tunings the focused shape can morph to (spawns a re-placed neck beside the origin). */
  readonly morphTargets?: readonly { readonly id: string; readonly label: string }[];
  readonly onMorph?: (targetId: string) => void;
  // ── Capo, on the FOCUSED neck (ADR 0014). ──
  /** Whether capo-edit mode is on (neck drags move the capo). */
  readonly capoEditActive?: boolean;
  /** Whether the focused neck currently has a capo (gates the "remove" affordance). */
  readonly focusedHasCapo?: boolean;
  readonly onToggleCapoEdit?: () => void;
  readonly onCapoSet?: (fret: number, loString: number, hiString: number) => void;
  readonly onCapoClear?: () => void;
  /** Shape interaction on the focused neck (place/remove a fret; cycle the nut marker). */
  readonly onFretClick?: (string: number, fret: number) => void;
  readonly onNutClick?: (string: number) => void;
}

export function NeckStack({
  necks,
  focusedId,
  labelMode,
  focusedShape,
  bassString,
  bassFret,
  onFocus,
  onClose,
  onAddNeck,
  morphTargets,
  onMorph,
  capoEditActive,
  focusedHasCapo,
  onToggleCapoEdit,
  onCapoSet,
  onCapoClear,
  onFretClick,
  onNutClick,
}: NeckStackProps) {
  return (
    <div className="neck-stack">
      {necks.map((n) => {
        const focused = n.id === focusedId;
        return (
          <section
            key={n.id}
            className={`neck-panel${focused ? ' focused' : ''}${n.isOrigin ? ' origin' : ''}`}
            aria-current={focused ? 'true' : undefined}
            tabIndex={0}
            onClick={() => onFocus(n.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFocus(n.id);
              }
            }}
          >
            <header className="neck-head">
              <span className="neck-tag" aria-label={`neck ${n.tag}`}>
                {n.tag}
              </span>
              <span className="neck-caption">
                {tuningLabel(n.tuning.id)} · {n.caption}
              </span>
              {n.isOrigin && (
                <span className="neck-origin" title="your original neck">
                  yours
                </span>
              )}
              {focused && onToggleCapoEdit && (
                <span className="neck-capo-controls">
                  <button
                    type="button"
                    className={`neck-capo-pill${capoEditActive ? ' active' : ''}`}
                    aria-pressed={!!capoEditActive}
                    title="Drag a capo onto the neck (drag down to cover more strings)"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCapoEdit();
                    }}
                  >
                    Capo
                  </button>
                  {focusedHasCapo && onCapoClear && (
                    <button
                      type="button"
                      className="neck-capo-clear"
                      title="Remove the capo"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCapoClear();
                      }}
                    >
                      remove
                    </button>
                  )}
                </span>
              )}
              <button
                type="button"
                className="neck-close"
                aria-label={`close neck ${n.tag}`}
                disabled={necks.length <= 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(n.id);
                }}
              >
                ×
              </button>
            </header>
            <Neck
              tuning={n.tuning}
              positions={n.positions}
              drones={n.drones}
              labelMode={labelMode}
              shape={focused ? focusedShape : n.shape}
              bassString={focused ? bassString : null}
              bassFret={focused ? bassFret : null}
              onFretClick={focused ? onFretClick : undefined}
              onNutClick={focused ? onNutClick : undefined}
              capo={n.capo}
              capoEdit={focused ? capoEditActive : false}
              onCapoSet={focused ? onCapoSet : undefined}
            />
          </section>
        );
      })}
      <div className="add-neck-group">
        <button type="button" className="add-neck" onClick={onAddNeck}>
          + neck
        </button>
        {onMorph && morphTargets && morphTargets.length > 0 && (
          <select
            className="morph-select"
            aria-label="morph the focused shape to another tuning"
            value=""
            onChange={(e) => {
              if (e.target.value) onMorph(e.target.value);
            }}
          >
            <option value="">morph to…</option>
            {morphTargets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
