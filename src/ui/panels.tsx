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
import type { Chord, Tuning } from '../core';
import { spell, pitchClass } from '../core';
import { droneMap } from '../projection';
import { realizeShape, shapeAnchors } from './shapes';
import {
  adviseSetupTool,
  feelingToOptions,
  findVoicingsTool,
  functionOf,
  grammarCardResource,
  mcpIdentify,
  neighbors,
  translate,
} from '../mcp';
import { TUNINGS, tuningLabel } from './fixtures';
import type { Shape } from './shape';
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

/** Spell the open strings of a tuning, string 1 (high) -> N (low), in the tuning's key. */
function spellOpenStrings(tuning: Tuning): string[] {
  return tuning.openStrings.map((m) => spell(pitchClass(((m as number) % 12 + 12) % 12), { tonic: tuning.tonic }));
}

/**
 * LEFT — the grammar-card RESOURCE for the focused tuning: the tuning's cheat-sheet. Loads
 * the real card via grammarCardResource and renders the open strings, tonic, and a computed
 * DRONE-MAP home-context view (each open string vs the tonic, graded) that shows for EVERY
 * tuning — carded or not — since it needs no card (it works for future custom tunings too).
 * When a card exists it also renders the interactive MOVABLE SHAPES (tap an anchor to preview
 * the realised shape on the focused neck), capo behaviour, and idioms. A card-less tuning
 * (standard EADGBE, the extended-range necks) says so honestly for the relational layer but
 * still shows open strings + tonic + drone map (docs/08 f; ADR 0003; ADR 0013).
 */
export function GrammarCardPanel({
  tuning,
  contextSummary,
  collapsed,
  onToggle,
  onPreviewShape,
  previewKey,
}: CollapsibleProps & {
  tuning: Tuning;
  contextSummary: string;
  /** Preview a realised movable shape on the focused neck (key = `${shapeId}@${anchor}`). */
  onPreviewShape: (shape: Shape, key: string) => void;
  /** The currently-previewed shape key, so the active anchor reads as pressed (or null). */
  previewKey: string | null;
}) {
  const tonicName = spell(tuning.tonic, { tonic: tuning.tonic });
  const { card } = grammarCardResource(tuning.id);
  const openNotes = spellOpenStrings(tuning).join(' · ');
  // The home-context drone map: each open string graded vs the TONIC (droneMap reads only
  // entity.root). Computed, never stored — so it renders for card-less + custom tunings too.
  // (Under a capo this reflects the focused/effective tuning; the tonic is preserved.)
  const homeEntity: Chord = { root: tuning.tonic, pitchClasses: [tuning.tonic] };
  const homeDrones = droneMap(homeEntity, tuning);

  return (
    <aside className={`panel left-panel${collapsed ? ' collapsed' : ''}`} aria-label="Grammar card">
      <button type="button" className="collapse-btn" onClick={onToggle} aria-expanded={!collapsed}>
        {collapsed ? '›' : '‹ Grammar card'}
      </button>
      {!collapsed && (
        <div className="panel-body">
          <h2>{card ? card.name : tuningLabel(tuning.id)}</h2>

          <p className="kv">
            <span>open strings</span>
            <code>{openNotes}</code>
          </p>
          <p className="kv">
            <span>tonic</span>
            <code>{tonicName}</code>
          </p>
          <p className="kv">
            <span>context</span>
            <code>{contextSummary}</code>
          </p>

          {/* Drone map — home-context, every tuning. Each open string vs the tonic, graded on
              the 5-level scale; colour + the term carry the tension (cf. live drone status). */}
          <section className="card-dronemap" aria-label="drone map (home context)">
            <h3>
              Drone map <span className="card-section-sub">· each open string vs the tonic</span>
            </h3>
            <ul className="card-drone-list">
              {homeDrones.map((d) => {
                const ds = droneStyle(d.tension);
                const name = spell(d.pitchClass, { tonic: tuning.tonic });
                return (
                  <li
                    key={`drone-${d.string}`}
                    className="card-drone-row"
                    style={{ borderLeftColor: ds.color }}
                  >
                    <span className="card-drone-string">str {d.string + 1}</span>
                    <span className="card-drone-note">{name}</span>
                    <span className="card-drone-tension" style={{ color: ds.color }}>
                      {d.tension}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {card ? (
            <>
              {card.movableShapes && card.movableShapes.length > 0 && (
                <section className="card-shapes" aria-label="movable shapes">
                  <h3>
                    Movable shapes <span className="card-section-sub">· tap a fret to try it</span>
                  </h3>
                  <ul>
                    {card.movableShapes.map((s) => (
                      <li key={s.id} className="card-shape">
                        <div className="card-shape-head">
                          <strong>{s.label}</strong>
                          <span className="card-shape-quality">{s.produces.quality}</span>
                        </div>
                        <div
                          className="card-shape-anchors"
                          role="group"
                          aria-label={`${s.label} anchors`}
                        >
                          {shapeAnchors(s).map((anchor) => {
                            const ex = s.slideExamples?.find((e) => e.anchorFret === anchor);
                            const key = `${s.id}@${anchor}`;
                            const active = previewKey === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`card-shape-anchor${active ? ' active' : ''}`}
                                aria-pressed={active}
                                title={ex ? ex.function : `anchor fret ${anchor}`}
                                onClick={() => onPreviewShape(realizeShape(s, anchor), key)}
                              >
                                fret {anchor}
                                {ex ? <span className="card-shape-fn"> · {ex.function}</span> : null}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {card.capoBehavior && (
                <section className="card-capo" aria-label="capo behaviour">
                  <h3>Capo</h3>
                  <p className="panel-prose">{card.capoBehavior}</p>
                </section>
              )}

              {card.idiomaticProgressions && card.idiomaticProgressions.length > 0 && (
                <section className="card-idioms" aria-label="idiomatic progressions">
                  <h3>Idioms</h3>
                  <ul className="card-idiom-list">
                    {card.idiomaticProgressions.map((p, i) => (
                      <li key={`idiom-${i}`}>{p}</li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="panel-note card-provenance">
                {card.provenance.kind} · verified {card.provenance.verifiedBy ?? '—'}
              </p>
            </>
          ) : (
            <p className="panel-note">
              No grammar card for this tuning — relational naming hands off to the absolute
              (chord-symbol) reading, which is the correct behaviour here. Open strings + tonic above
              are still live.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

/**
 * RIGHT-top — the always-live "What you're holding" Readout (M1). Bound to the focused
 * neck's shape via the assembled ReadoutViewModel (docs/08 decision f; docs/09 UI#4).
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
      <section className="panel readout-panel" aria-label="Readout: this shape">
        <h2>This shape</h2>
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
    <section className="panel readout-panel" aria-label="Readout: this shape">
      <h2>This shape</h2>

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

/** One spawnable comparison option carried to the AppShell (a shape on the focused tuning). */
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

/** The quick-action chips — one-tap turns onto the focused shape (docs/04 intents). */
const QUICK_ACTIONS: readonly { readonly text: string; readonly chip: string }[] = [
  { text: 'make it dreamier', chip: 'make it dreamier' },
  { text: 'darker', chip: 'darker' },
  { text: 'more open', chip: 'more open' },
  { text: 'what is this?', chip: 'what is this?' },
  { text: 'what does this do?', chip: 'what does this do?' },
  { text: 'easier way?', chip: 'easier way?' },
  { text: 'where can this go?', chip: 'where can this go?' },
  { text: 'same shape in DADGAD?', chip: 'in DADGAD?' },
  { text: 'will this feel floppy?', chip: 'will this feel floppy?' },
];

/**
 * RIGHT-bottom — the M3 CONVERSATION surface (the product gate). A deterministic intent
 * router (conversation.route) over the in-process MCP tools (/mcp): a user turn is parsed
 * for a known intent / vibe keyword and dispatched against the FOCUSED neck's shape +
 * tuning (deixis -> the focus pointer, docs/04). The ToolResult is rendered as a turn —
 * the EXPLANATION as the model line, the REASONING CHAIN expandable, and every claim's
 * TRACE made VISIBLE (computed / KB id), with editorial taste kept hedged and marked as
 * opinion (ADR 0003). The affective ("feeling") turn ALSO spawns its computed option
 * voicings as comparison necks beside the focus (comparison is the teaching act, docs/04
 * flow 2) — via onSpawnOptions, which never overwrites the user's neck.
 */
export function ConversationPanel({
  shape,
  tuning,
  onSpawnOptions,
}: {
  shape: Shape;
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
        const result = feelingToOptions(shape, tuning, intent.vibe ?? userText);
        // Map the COMPUTED option voicings -> spawnable shapes + the turn's OptionView rows.
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
        view = buildTurnView(mcpIdentify(shape, tuning));
        break;
      }
      case 'function': {
        view = buildTurnView(functionOf(shape, tuning));
        break;
      }
      case 'neighbors': {
        // "where can this go?" — small single-string voice-leading moves from here.
        view = buildTurnView(neighbors(shape, tuning));
        break;
      }
      case 'translate': {
        // "…in DADGAD?" — re-place the SAME sounding pitches on the named target tuning.
        const target = TUNINGS.find((t) => t.id === intent.target);
        if (target) {
          view = buildTurnView(translate(shape, tuning, target));
        } else {
          view = {
            modelLine:
              "I can move this shape to another tuning — tell me which (e.g. \"in DADGAD?\", \"same shape in open D\").",
            reasoningChain: [],
            traces: [],
            options: [],
            hasEditorial: false,
          };
        }
        break;
      }
      case 'setup': {
        // "will this feel floppy?" — orthogonal physical string-tension advice for the tuning.
        view = buildTurnView(adviseSetupTool(tuning));
        break;
      }
      case 'voicings': {
        // "easier way?" — re-voice the shape's best-fit chord. Identify the held chord
        // first so we ask findVoicings for the SAME sonority, but easier to finger.
        const id = mcpIdentify(shape, tuning);
        const symbol = id.truth.candidates[0]?.chord.symbol ?? null;
        if (symbol) {
          view = buildTurnView(findVoicingsTool(symbol, tuning));
        } else {
          view = {
            modelLine:
              'Place some notes on the focused neck first — then I can find an easier way to play that shape.',
            reasoningChain: ['The shape sounds nothing, so there is no chord to re-voice.'],
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
            Ask about the focused shape: <em>what is this?</em>, <em>what does this do?</em>,{' '}
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
          aria-label="ask about the focused shape"
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

