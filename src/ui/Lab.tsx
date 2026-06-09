// Lab (/ui) — a CLEARLY-LABELLED PROVISIONAL surface that mounts the built-but-unplaced
// features so they are REACHABLE and functional without committing to a final information
// architecture ("reach, don't place" — overnight build charter). NOTHING here is a layout
// decision: each section is a self-contained component wired to the focused neck. The
// morning's IA work is pure rearrangement — lift these out of the Lab into their real homes.
//
// Sections shrink as the IA rework re-homes them (ADR 0013): Shape discovery -> grammar card;
// String tension -> the center-bottom Setup dock. Remaining provisional tenants: Capo
// (→ on-neck overlay next) · Morph (→ spawn-beside). Deleted entirely once the last re-homes.

import { useState } from 'react';
import type { CapoShift, Tuning } from '../core';
import { CapoControl } from './CapoControl';
import { MorphView } from './MorphView';
import type { Shape } from './shape';

export interface LabProps {
  /** The focused neck's EFFECTIVE tuning (after any capo) — morph reads this. */
  readonly focusedTuning: Tuning;
  /** The focused neck's BASE tuning (before capo) — capo operates on this. */
  readonly baseTuning: Tuning;
  /** The focused neck's held shape — morph translates its sounding pitches. */
  readonly focusedShape: Shape;
  /** Other tunings to offer as morph targets. */
  readonly morphTargets: readonly Tuning[];
  /** Emit a CapoShift for the focused neck (the shell applies it via applyCapo). */
  readonly onCapoChange: (capo: CapoShift) => void;
}

/** One labelled provisional sub-section of the Lab. */
export function LabSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`lab-section${open ? ' open' : ''}`}>
      <button
        type="button"
        className="lab-section-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '▾' : '▸'} {title}
      </button>
      {open && <div className="lab-section-body">{children}</div>}
    </div>
  );
}

export function Lab({
  focusedTuning,
  baseTuning,
  focusedShape,
  morphTargets,
  onCapoChange,
}: LabProps) {
  return (
    <section className="lab-region" aria-label="Lab (provisional)">
      <header className="lab-header">
        <span className="lab-badge">🧪 LAB</span>
        <span className="lab-note">
          provisional surfaces — built &amp; reachable, placement &amp; flow TBD
        </span>
      </header>

      <div className="lab-grid">
        <LabSection title="Capo / partial capo">
          {/* key=tuning id: a retune remounts the control with the right string count. */}
          <CapoControl
            key={baseTuning.id}
            stringCount={baseTuning.openStrings.length}
            onChange={onCapoChange}
          />
        </LabSection>

        <LabSection title="Morph / translate to another tuning">
          <MorphView shape={focusedShape} fromTuning={focusedTuning} targets={morphTargets} />
        </LabSection>
      </div>
    </section>
  );
}
