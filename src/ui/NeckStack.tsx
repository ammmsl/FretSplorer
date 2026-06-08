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
}

export interface NeckStackProps {
  readonly necks: readonly NeckInstance[];
  readonly focusedId: string;
  readonly labelMode: LabelMode;
  readonly onFocus: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onAddNeck: () => void;
}

export function NeckStack({
  necks,
  focusedId,
  labelMode,
  onFocus,
  onClose,
  onAddNeck,
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
            />
          </section>
        );
      })}
      <button type="button" className="add-neck" onClick={onAddNeck}>
        + neck
      </button>
    </div>
  );
}
