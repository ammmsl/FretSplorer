// Lab (/ui) — the LAST provisional tenant. Shape discovery moved into the grammar card,
// string tension into the center-bottom Setup dock, and morph into spawn-beside (the neck
// stack's "morph to…" + the conversation's "in DADGAD?"). Only the Capo remains here, until
// it lands on the neck as a draggable overlay (ADR 0013 2c) — at which point this whole
// component and the .lab-* styles are deleted.

import { useState } from 'react';
import type { CapoShift, Tuning } from '../core';
import { CapoControl } from './CapoControl';

export interface LabProps {
  /** The focused neck's BASE tuning (before capo) — capo operates on this. */
  readonly baseTuning: Tuning;
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

export function Lab({ baseTuning, onCapoChange }: LabProps) {
  return (
    <section className="lab-region" aria-label="Lab (provisional)">
      <header className="lab-header">
        <span className="lab-badge">🧪 LAB</span>
        <span className="lab-note">provisional — capo lands on the neck next</span>
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
      </div>
    </section>
  );
}
