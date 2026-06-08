// Side panels (/ui) — the three-region shell flanks + docked notation pane
// (ADR 0005; docs/08 §3.5). For M0 these are largely placeholders:
//   - GrammarCardPanel (LEFT, collapsible): the focused tuning's id/tonic + a
//     derived "home" line. Full KB-card loading is a later milestone (docs/07).
//   - ReadoutPanel (RIGHT, pinned): the always-live "What you're holding" mirror —
//     wired to identify() in M1; here it shows the current context summary.
//   - ConversationPanel (RIGHT, below): MCP dialogue placeholder.
//   - NotationPane (CENTER bottom, docked-collapsible): alphaTab pane placeholder.
//
// Flanks collapse so the neck stack goes near-full-width (docs/08 §1j).

import type { Tuning } from '../core';
import { spell } from '../core';
import { tuningLabel } from './fixtures';

interface CollapsibleProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

/** LEFT — grammar-card resource placeholder bound to the focused tuning. */
export function GrammarCardPanel({
  tuning,
  contextSummary,
  collapsed,
  onToggle,
}: CollapsibleProps & { tuning: Tuning; contextSummary: string }) {
  const tonicName = spell(tuning.tonic, { tonic: tuning.tonic });
  return (
    <aside className={`panel left-panel${collapsed ? ' collapsed' : ''}`} aria-label="Grammar card">
      <button type="button" className="collapse-btn" onClick={onToggle} aria-expanded={!collapsed}>
        {collapsed ? '›' : '‹ Grammar card'}
      </button>
      {!collapsed && (
        <div className="panel-body">
          <h2>{tuningLabel(tuning.id)}</h2>
          <p className="kv">
            <span>tuning</span>
            <code>{tuning.id}</code>
          </p>
          <p className="kv">
            <span>tonic</span>
            <code>{tonicName}</code>
          </p>
          <p className="kv">
            <span>home</span>
            <code>{tonicName} (derived)</code>
          </p>
          <p className="kv">
            <span>context</span>
            <code>{contextSummary}</code>
          </p>
          <p className="panel-note">Movable shapes, barre rule, capo behaviour, and the full
            drone map load from the grammar card in a later milestone.</p>
        </div>
      )}
    </aside>
  );
}

/** RIGHT-top — the always-live Readout panel placeholder. Live identify() is M1. */
export function ReadoutPanel({ contextSummary }: { contextSummary: string }) {
  return (
    <section className="panel readout-panel" aria-label="Readout: what you're holding">
      <h2>What you're holding</h2>
      <p className="readout-headline">{contextSummary}</p>
      <p className="panel-note">
        Live note-by-note identification (the tiered relational readout) is wired in M1.
      </p>
    </section>
  );
}

/** RIGHT-bottom — conversation placeholder. */
export function ConversationPanel() {
  return (
    <section className="panel conversation-panel" aria-label="Conversation">
      <h2>Conversation</h2>
      <p className="panel-note">The MCP dialogue surface arrives in a later milestone.</p>
    </section>
  );
}

/** CENTER-bottom — docked, collapsible notation/audio pane placeholder. */
export function NotationPane({ collapsed, onToggle }: CollapsibleProps) {
  return (
    <section className={`panel notation-pane${collapsed ? ' collapsed' : ''}`} aria-label="Notation">
      <button type="button" className="collapse-btn" onClick={onToggle} aria-expanded={!collapsed}>
        {collapsed ? '♪ Notation ›' : '‹ Notation'}
      </button>
      {!collapsed && (
        <p className="panel-note">alphaTab notation / audio pane lands in a later milestone.</p>
      )}
    </section>
  );
}
