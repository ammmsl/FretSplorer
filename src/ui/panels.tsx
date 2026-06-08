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
import { degreeStyle, droneStyle } from './palette';
import type { ReadoutViewModel } from './readout';

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

/**
 * RIGHT-top — the always-live "What you're holding" Readout (M1). Bound to the focused
 * neck's grip via the assembled ReadoutViewModel (docs/08 decision f; docs/09 UI#4).
 * Tiered disclosure: T1 relational (placeholder until M2) -> T2 absolute symbol+bass ->
 * per-note degree-vs-drone -> ranked candidates. Degree colour and drone tension are
 * SEPARATE visual channels here, mirroring the neck (docs/01 §B).
 */
export function ReadoutPanel({
  readout,
  contextSummary,
}: {
  readout: ReadoutViewModel;
  contextSummary: string;
}) {
  if (readout.empty) {
    return (
      <section className="panel readout-panel" aria-label="Readout: what you're holding">
        <h2>What you're holding</h2>
        <p className="readout-idle">Nothing yet — place notes on the focused neck.</p>
        {contextSummary !== 'nothing yet' && (
          <p className="panel-note">Overlay context: {contextSummary}</p>
        )}
      </section>
    );
  }

  const t2 = readout.symbol
    ? readout.symbol + (readout.slashBass ? `/${readout.slashBass}` : '')
    : '—';

  return (
    <section className="panel readout-panel" aria-label="Readout: what you're holding">
      <h2>What you're holding</h2>

      {/* T1 relational — PLACEHOLDER slot (no faked name; arrives in M2). */}
      <p className="readout-relational" aria-label="relational reading (coming in M2)">
        relational naming arrives in M2
      </p>

      {/* T2 absolute symbol + slash bass. */}
      <p className="readout-symbol">{t2}</p>

      {/* Bass — the spelled LOWEST PITCH with octave (argmin, R10). */}
      <p className="kv">
        <span>bass</span>
        <code>{readout.bass ?? '—'}</code>
      </p>

      {/* Per-note degree-vs-drone. Two distinct channels: a degree chip (colour by
          degree, shape by structure) and, for open strings, a drone chip (colour+dash). */}
      <ul className="readout-notes">
        {readout.notes.map((n) => {
          const ds = n.degree ? degreeStyle(n.degree) : null;
          const dr = n.drone ? droneStyle(n.drone) : null;
          return (
            <li key={`note-${n.string}`} className="readout-note">
              <span className="readout-note-name">
                {n.name}
                {n.isBass && <span className="readout-bass-badge" title="bass">B</span>}
                {n.isOpen && <span className="readout-open-badge" title="open string">○</span>}
              </span>
              {n.degree && ds && (
                <span
                  className={`readout-degree-chip${ds.shape === 'root' ? ' root' : ''}`}
                  style={{ background: ds.fill, color: ds.text }}
                  title={`degree ${n.degree.label}`}
                >
                  {n.degree.label}
                </span>
              )}
              {dr && (
                <span
                  className="readout-drone-chip"
                  style={{ borderColor: dr.color, color: dr.color }}
                  title={`drone tension: ${n.drone}`}
                >
                  {n.drone}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Ranked candidates — the ambiguity view (only when identify gave >1). */}
      {readout.candidates.length > 0 && (
        <div className="readout-candidates">
          <h3>Other readings</h3>
          <ol>
            {readout.candidates.map((c, i) => (
              <li key={`cand-${i}`}>
                <code>{c.symbol}</code>
                <span className="readout-score">{c.score.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
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
