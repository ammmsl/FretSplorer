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

import { useRef, useState } from 'react';
import type { Tuning } from '../core';
import { spell } from '../core';
import {
  feelingToOptions,
  findVoicingsTool,
  functionOf,
  mcpIdentify,
} from '../mcp';
import { tuningLabel } from './fixtures';
import type { Grip } from './grip';
import { degreeStyle, droneStyle } from './palette';
import type { ReadoutViewModel } from './readout';
import { Tier3Anatomy } from './Tier3Anatomy';
import {
  buildTurnView,
  intentLabel,
  route,
  type OptionView,
  type TurnView,
} from './conversation';

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
 * Tiered disclosure: T1 relational HEADLINE (the relational sentence is the headline; the
 * T2 absolute symbol is the subline — docs/08 f) -> bass -> per-note degree-vs-drone ->
 * ranked candidates -> the expandable, LAZY Tier-3 anatomy. Degree colour and drone
 * tension are SEPARATE visual channels here, mirroring the neck (docs/01 §B).
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
  const rel = readout.relational;

  return (
    <section className="panel readout-panel" aria-label="Readout: what you're holding">
      <h2>What you're holding</h2>

      {/* T1 relational — the HEADLINE (the relational sentence leads; the T2 symbol is the
          subline). On a Tier-1 handoff the symbol leads honestly; with no card we show a
          small note rather than fake a relational name (docs/08 f). */}
      {rel?.kind === 'relational' && (
        <div className="readout-relational" aria-label="relational reading">
          <p className="readout-headline">{rel.sentence}</p>
          {rel.detail.length > 0 && (
            <ul className="readout-relational-detail">
              {rel.detail.map((d, i) => (
                <li key={`reldetail-${i}`}>{d}</li>
              ))}
            </ul>
          )}
          {rel.tension && <p className="readout-relational-tension">{rel.tension}</p>}
        </div>
      )}
      {rel?.kind === 'handoff' && (
        <p className="readout-relational handoff" aria-label="relational reading">
          {rel.note}
        </p>
      )}
      {rel?.kind === 'no-card' && (
        <p className="panel-note readout-relational no-card" aria-label="relational reading">
          {rel.note}
        </p>
      )}

      {/* T2 absolute symbol + slash bass — the headline when relational leads, else the
          lead (handoff / no-card). */}
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

      {/* T3 voicing anatomy — expandable + LAZY (Pyodide loads only on expand; ADR 0008). */}
      <Tier3Anatomy voicing={readout.primaryVoicing} keyString={readout.keyString} />
    </section>
  );
}

/** One spawnable comparison option carried to the AppShell (a grip on the focused tuning). */
export interface SpawnOption {
  readonly symbol: string;
  /** Per-string frets aligned to tuning.openStrings: fret, 0 = open, null = muted. */
  readonly frets: readonly (number | null)[];
}

/** A completed conversation turn (user line + the routed, grounded model turn). */
interface ConversationTurn {
  readonly id: number;
  readonly userText: string;
  readonly intent: string;
  readonly view: TurnView;
}

/** The quick-action chips — one-tap turns onto the focused grip (docs/04 intents). */
const QUICK_ACTIONS: readonly { readonly text: string; readonly chip: string }[] = [
  { text: 'make it dreamier', chip: 'make it dreamier' },
  { text: 'darker', chip: 'darker' },
  { text: 'more open', chip: 'more open' },
  { text: 'what is this?', chip: 'what is this?' },
  { text: 'what does this do?', chip: 'what does this do?' },
  { text: 'easier way?', chip: 'easier way?' },
];

/**
 * RIGHT-bottom — the M3 CONVERSATION surface (the product gate). A deterministic intent
 * router (conversation.route) over the in-process MCP tools (/mcp): a user turn is parsed
 * for a known intent / vibe keyword and dispatched against the FOCUSED neck's grip +
 * tuning (deixis -> the focus pointer, docs/04). The ToolResult is rendered as a turn —
 * the EXPLANATION as the model line, the REASONING CHAIN expandable, and every claim's
 * TRACE made VISIBLE (computed / KB id), with editorial taste kept hedged and marked as
 * opinion (ADR 0003). The affective ("feeling") turn ALSO spawns its computed option
 * voicings as comparison necks beside the focus (comparison is the teaching act, docs/04
 * flow 2) — via onSpawnOptions, which never overwrites the user's neck.
 */
export function ConversationPanel({
  grip,
  tuning,
  onSpawnOptions,
}: {
  grip: Grip;
  tuning: Tuning;
  onSpawnOptions: (options: readonly SpawnOption[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<readonly ConversationTurn[]>([]);
  const [expanded, setExpanded] = useState<Readonly<Record<number, boolean>>>({});
  // Monotonic turn id from a ref counter — bumped in the submit handler, never during
  // render (Date.now()/Math.random() in render are impure; react-hooks/purity forbids them).
  const nextTurnId = useRef(0);

  function submitTurn(text: string) {
    const userText = text.trim();
    if (userText === '') return;

    const intent = route(userText);
    let view: TurnView;
    let spawn: readonly SpawnOption[] = [];

    switch (intent.kind) {
      case 'feeling': {
        const result = feelingToOptions(grip, tuning, intent.vibe ?? userText);
        // Map the COMPUTED option voicings -> spawnable grips + the turn's OptionView rows.
        const optionViews: OptionView[] = result.truth.options.map((o) => ({
          symbol: o.symbol,
          frets: o.voicing ? o.voicing.frets : tuning.openStrings.map(() => null),
          playability: o.voicing ? o.voicing.playability.flag : null,
        }));
        view = buildTurnView(result, optionViews);
        spawn = optionViews
          .filter((o) => o.frets.some((f) => f !== null))
          .map((o) => ({ symbol: o.symbol, frets: o.frets }));
        break;
      }
      case 'identify': {
        view = buildTurnView(mcpIdentify(grip, tuning));
        break;
      }
      case 'function': {
        view = buildTurnView(functionOf(grip, tuning));
        break;
      }
      case 'voicings': {
        // "easier way?" — re-voice the grip's best-fit chord. Identify the held chord
        // first so we ask findVoicings for the SAME sonority, but easier to finger.
        const id = mcpIdentify(grip, tuning);
        const symbol = id.truth.candidates[0]?.chord.symbol ?? null;
        if (symbol) {
          view = buildTurnView(findVoicingsTool(symbol, tuning));
        } else {
          view = {
            modelLine:
              'Place some notes on the focused neck first — then I can find an easier way to play that shape.',
            reasoningChain: ['The grip sounds nothing, so there is no chord to re-voice.'],
            traces: [],
            options: [],
            hasEditorial: false,
          };
        }
        break;
      }
      default: {
        view = {
          modelLine:
            "I didn't catch an intent there. Try \"what is this?\", \"what does this do?\", \"easier way?\", or \"make it dreamier / darker / more open\".",
          reasoningChain: [],
          traces: [],
          options: [],
          hasEditorial: false,
        };
      }
    }

    const turn: ConversationTurn = {
      id: nextTurnId.current++,
      userText,
      intent: intentLabel(intent.kind),
      view,
    };
    setTurns((prev) => [...prev, turn]);
    setDraft('');
    if (spawn.length > 0) onSpawnOptions(spawn);
  }

  return (
    <section className="panel conversation-panel" aria-label="Conversation">
      <h2>Conversation</h2>

      <div className="conversation-log" aria-live="polite">
        {turns.length === 0 && (
          <p className="panel-note">
            Ask about the focused grip: <em>what is this?</em>, <em>what does this do?</em>,{' '}
            <em>easier way?</em>, or <em>make it dreamier / darker / more open</em>.
          </p>
        )}
        {turns.map((t) => {
          const isOpen = expanded[t.id] === true;
          return (
            <div className="conv-turn" key={t.id}>
              <p className="conv-user">
                <span className="conv-role">you</span>
                {t.userText}
                <span className="conv-intent" title="routed intent">
                  {t.intent}
                </span>
              </p>

              <div className={`conv-model${t.view.hasEditorial ? ' editorial' : ''}`}>
                <span className="conv-role">fretsplorer</span>
                <p className="conv-line">{t.view.modelLine}</p>

                {t.view.hasEditorial && (
                  <p className="conv-taste-flag" title="editorial / affective">
                    taste, not theory — hedged on purpose
                  </p>
                )}

                {/* Spawned comparison options — a small echo (the necks appear beside). */}
                {t.view.options.length > 0 && (
                  <ul className="conv-options" aria-label="comparison options">
                    {t.view.options.map((o, i) => (
                      <li key={`opt-${t.id}-${i}`}>
                        <code>{o.symbol}</code>
                        <span className="conv-option-frets">
                          [{o.frets.map((f) => (f === null ? 'x' : f)).join(' ')}]
                        </span>
                        {o.playability && (
                          <span className="conv-option-play">{o.playability}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {(t.view.traces.length > 0 || t.view.reasoningChain.length > 0) && (
                  <button
                    type="button"
                    className="conv-expand"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [t.id]: !isOpen }))
                    }
                  >
                    {isOpen ? '▾ hide grounding' : `▸ why? (${t.view.traces.length} traces)`}
                  </button>
                )}

                {isOpen && (
                  <div className="conv-grounding">
                    {t.view.reasoningChain.length > 0 && (
                      <ol className="conv-chain" aria-label="reasoning chain">
                        {t.view.reasoningChain.map((step, i) => (
                          <li key={`chain-${t.id}-${i}`}>{step}</li>
                        ))}
                      </ol>
                    )}
                    {t.view.traces.length > 0 && (
                      <ul className="conv-traces" aria-label="claim traces">
                        {t.view.traces.map((tr, i) => (
                          <li
                            key={`trace-${t.id}-${i}`}
                            className={`conv-trace${tr.editorial ? ' editorial' : ''}`}
                          >
                            <span className="conv-trace-text">{tr.text}</span>
                            <span
                              className={`conv-trace-badge ${tr.traceKind}`}
                              title={
                                tr.editorial
                                  ? `editorial vibe id: ${tr.traceId}`
                                  : tr.traceKind === 'computed'
                                    ? 'computed by the engine'
                                    : `KB id: ${tr.traceId}`
                              }
                            >
                              {tr.editorial
                                ? `taste · ${tr.traceId}`
                                : tr.traceKind === 'computed'
                                  ? 'computed'
                                  : tr.traceId}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="conv-chips" aria-label="quick actions">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.chip}
            type="button"
            className="conv-chip"
            onClick={() => submitTurn(qa.text)}
          >
            {qa.chip}
          </button>
        ))}
      </div>

      <form
        className="conv-form"
        onSubmit={(e) => {
          e.preventDefault();
          submitTurn(draft);
        }}
      >
        <input
          type="text"
          className="conv-input"
          aria-label="ask about the focused grip"
          placeholder="ask… (e.g. make it dreamier)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="conv-send">
          send
        </button>
      </form>
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
