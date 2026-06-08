// Neck (/ui) — the SVG fretboard surface for one tuning (ADR 0006; docs/08 §1b-d).
//
// Horizontal neck, NUT on the LEFT, 24 frets extending right, 6 strings with the
// HIGH string on TOP (matches Guitar Pro + TAB; Tuning.openStrings[0] = string 1 =
// high). Clean, no fingerboard fill. Standard navigational inlay markers, visually
// distinct from degree dots.
//
// Two SEPARATE channels (docs/01 §B):
//   - degree dots: ride the dot FILL (shape = structure, colour = degree).
//   - drone map: rides the open-string LINE + a nut HALO (never the dot fill);
//     dormant until a harmonic context is selected.
//
// MOSTLY presentational: it receives the already-projected positions + drone readings
// (computed by /projection in the shell) and the label mode. It ALSO renders an
// optional GRIP (the held notes, docs/08 decision e) and, when the interaction props
// are supplied, becomes INTERACTIVE — clicking fret cells / nut markers calls back to
// the shell which owns the grip state (docs/09 UI#4). With no interaction props it is
// purely presentational, so existing tests/usage are unaffected.
//
// Grip markers are a DISTINCT third visual: a SOLID filled disc with a ring (placed
// note) + open(O)/mute(X) glyphs at the nut + a bass callout — deliberately not the
// degree dot fill and not the drone line, so the held grip never reads as an overlay.

import type {
  KeyContext,
  ProjectedPosition,
  Tuning,
} from '../core';
import type { OpenStringDrone } from '../projection';
import {
  DEFAULT_GEOMETRY,
  DOUBLE_INLAY_FRETS,
  SINGLE_INLAY_FRETS,
  fretLineX,
  neckHeight,
  neckWidth,
  noteX,
  nutX,
  stringY,
} from './geometry';
import { degreeStyle, droneStyle } from './palette';
import { dotLabel, type LabelMode } from './labels';
import type { Grip } from './grip';

export interface NeckProps {
  readonly tuning: Tuning;
  /** Projected degree positions for the active context; [] = dormant (no overlay). */
  readonly positions: readonly ProjectedPosition[];
  /** Per-open-string drone readings; undefined = no context selected (dormant). */
  readonly drones?: readonly OpenStringDrone[];
  readonly labelMode: LabelMode;
  // ── Optional interaction (the focused neck only). Omit all to stay presentational. ──
  /** The held grip to render (solid placed-note markers + nut O/X glyphs). */
  readonly grip?: Grip;
  /** String index of the BASS (lowest pitch) note to call out; null = none. */
  readonly bassString?: number | null;
  /** Fret of the bass note (so the marker sits on the right cell; 0 = open). */
  readonly bassFret?: number | null;
  /** Click an empty fret cell -> place; click a placed note -> remove (toggle). */
  readonly onFretClick?: (string: number, fret: number) => void;
  /** Click the per-string nut marker -> cycle open/mute/off. */
  readonly onNutClick?: (string: number) => void;
}

const g = DEFAULT_GEOMETRY;
const DOT_R = 9;
const GRIP_R = 10;
const NUT_W = 15; // width of the nut bar (a chunky bone-nut look)
const NUT_MARGIN_Y = 6; // gap from the top/bottom of the neck to the nut bar's ends
const NUT_SLOT_R = 11; // radius of the per-string open-string hit + hover ring

export function Neck({
  tuning,
  positions,
  drones,
  labelMode,
  grip,
  bassString,
  bassFret,
  onFretClick,
  onNutClick,
}: NeckProps) {
  const w = neckWidth(g);
  const h = neckHeight(g);
  const ctx: KeyContext = { tonic: tuning.tonic };
  const strings = tuning.openStrings.length;
  const interactive = Boolean(onFretClick || onNutClick);

  return (
    <svg
      className="neck-svg"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label={`Fretboard for ${tuning.id}`}
      preserveAspectRatio="xMinYMid meet"
    >
      {/* Inlay markers — navigational, behind everything, distinct from degree dots. */}
      <g className="neck-inlays" aria-hidden="true">
        {SINGLE_INLAY_FRETS.filter((f) => f <= g.fretCount).map((f) => (
          <circle
            key={`inlay-${f}`}
            cx={noteX(g, f)}
            cy={h / 2}
            r={3.2}
            className="inlay-dot"
          />
        ))}
        {DOUBLE_INLAY_FRETS.filter((f) => f <= g.fretCount).map((f) => (
          <g key={`inlay2-${f}`}>
            <circle cx={noteX(g, f)} cy={stringY(g, 1)} r={3.2} className="inlay-dot" />
            <circle cx={noteX(g, f)} cy={stringY(g, strings - 2)} r={3.2} className="inlay-dot" />
          </g>
        ))}
      </g>

      {/* Fret wires (1..fretCount). The nut (fret 0) is drawn heavier below. */}
      <g className="neck-frets" aria-hidden="true">
        {Array.from({ length: g.fretCount }, (_, i) => i + 1).map((f) => (
          <line
            key={`fret-${f}`}
            x1={fretLineX(g, f)}
            y1={stringY(g, 0)}
            x2={fretLineX(g, f)}
            y2={stringY(g, strings - 1)}
            className="fret-line"
          />
        ))}
        {/* Fret-number captions under selected markers. */}
        {[...SINGLE_INLAY_FRETS, ...DOUBLE_INLAY_FRETS]
          .filter((f) => f <= g.fretCount)
          .map((f) => (
            <text
              key={`fretnum-${f}`}
              x={noteX(g, f)}
              y={h - 4}
              className="fret-number"
              textAnchor="middle"
            >
              {f}
            </text>
          ))}
      </g>

      {/* The nut — a chunky rounded BAR (like a real bone nut) spanning the full neck
          height, not a thin line, so it reads as a physical element and, when
          interactive, as a strip you can click to ring strings open (docs/09 UI#4).
          Open notes land ON this bar (noteX(fret 0) === nutX). */}
      <rect
        x={nutX(g) - NUT_W / 2}
        y={NUT_MARGIN_Y}
        width={NUT_W}
        height={h - NUT_MARGIN_Y * 2}
        rx={NUT_W / 2}
        className="nut-bar"
        aria-hidden="true"
      />

      {/* String lines — carry the DRONE channel when a context is active. */}
      <g className="neck-strings">
        {tuning.openStrings.map((_, s) => {
          const drone = drones?.[s];
          const style = drone ? droneStyle(drone.tension) : undefined;
          const y = stringY(g, s);
          return (
            <line
              key={`string-${s}`}
              x1={nutX(g)}
              y1={y}
              x2={fretLineX(g, g.fretCount)}
              y2={y}
              className={style ? 'string-line drone-active' : 'string-line'}
              stroke={style?.color}
              strokeWidth={style?.width}
              strokeDasharray={style?.dash || undefined}
              aria-label={
                drone
                  ? `string ${s + 1} drone: ${drone.tension}`
                  : undefined
              }
            />
          );
        })}
      </g>

      {/* Nut halos — the open-string drone halo, second drone geometry. */}
      {drones && (
        <g className="neck-halos">
          {drones.map((drone, s) => {
            const style = droneStyle(drone.tension);
            return (
              <circle
                key={`halo-${s}`}
                cx={nutX(g)}
                cy={stringY(g, s)}
                r={DOT_R + 3}
                className="drone-halo"
                fill="none"
                stroke={style.color}
                strokeWidth={2}
                strokeDasharray={style.dash || undefined}
                aria-hidden="true"
              />
            );
          })}
        </g>
      )}

      {/* Degree dots — the DEGREE channel (shape + colour fill). */}
      <g className="neck-dots">
        {positions.map((p, i) => {
          const style = degreeStyle(p.degree);
          const cx = noteX(g, p.fret);
          const cy = stringY(g, p.string);
          const label = dotLabel(labelMode, p.degree, p.pitch, ctx);
          return (
            <g
              key={`dot-${p.string}-${p.fret}-${i}`}
              className="degree-dot"
              role="img"
              aria-label={`degree ${p.degree.label} on string ${p.string + 1} fret ${p.fret}`}
            >
              {style.shape === 'root' ? (
                // Root = a distinct DIAMOND (CVD-safe before colour is parsed).
                <rect
                  x={cx - DOT_R}
                  y={cy - DOT_R}
                  width={DOT_R * 2}
                  height={DOT_R * 2}
                  transform={`rotate(45 ${cx} ${cy})`}
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth={2}
                />
              ) : (
                <circle cx={cx} cy={cy} r={DOT_R} fill={style.fill} stroke={style.stroke} strokeWidth={1.2} />
              )}
              {label && (
                <text x={cx} y={cy} className="dot-label" textAnchor="middle" fill={style.text}>
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* GRIP placed notes — a SOLID disc + ring, visually distinct from the degree
          dot fill and the drone line (docs/08 decision e). Rendered above the overlay
          so the held grip reads as the foreground subject. */}
      {grip && (
        <g className="neck-grip">
          {grip.map((sg, s) => {
            if (sg.kind !== 'open' && sg.kind !== 'fret') return null;
            const fret = sg.kind === 'open' ? 0 : sg.fret;
            const cx = noteX(g, fret);
            const cy = stringY(g, s);
            const isBass = bassString === s && (bassFret ?? 0) === fret;
            return (
              <g
                key={`grip-${s}`}
                className={`grip-note${isBass ? ' grip-bass' : ''}`}
                role="img"
                aria-label={`held note on string ${s + 1} ${
                  fret === 0 ? 'open' : `fret ${fret}`
                }${isBass ? ' (bass)' : ''}`}
              >
                <circle className="grip-disc" cx={cx} cy={cy} r={GRIP_R} />
                {isBass && (
                  <circle className="grip-bass-ring" cx={cx} cy={cy} r={GRIP_R + 4} fill="none" />
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* BASS marker label — a small "B" badge calling out the computed lowest pitch. */}
      {grip && bassString != null && (
        <text
          className="grip-bass-label"
          x={noteX(g, bassFret ?? 0)}
          y={stringY(g, bassString)}
          textAnchor="middle"
        >
          B
        </text>
      )}

      {/* Interactive fret-cell hit layer — transparent rects over every FRETTED cell
          (fret 1..fretCount). A click places a note on an empty cell or removes the note
          already on that string's cell. The OPEN position is owned by the nut markers
          (drawn ABOVE this layer so they win the overlap zone right at the nut). */}
      {onFretClick && (
        <g className="neck-fret-cells">
          {tuning.openStrings.map((_, s) =>
            Array.from({ length: g.fretCount }, (_, i) => {
              const fret = i + 1;
              const cy = stringY(g, s);
              return (
                <rect
                  key={`cell-${s}-${fret}`}
                  className="fret-cell"
                  x={fretLineX(g, fret - 1)}
                  y={cy - g.stringSpacing / 2}
                  width={g.fretSpacing}
                  height={g.stringSpacing}
                  onClick={() => onFretClick(s, fret)}
                  role="button"
                  aria-label={`string ${s + 1} fret ${fret}`}
                />
              );
            }),
          )}
        </g>
      )}

      {/* Per-string NUT markers — sit ON the nut bar (cx === nutX), exactly where an
          open note's grip disc lands, so the control and its result are co-located.
          Rendered ABOVE the fret-cell layer so a click right at the nut rings the string
          open (cycle open -> muted -> off) rather than landing on fret 1. Visual states:
            - open  : shown by the solid grip disc on the nut (drawn above).
            - muted : an X glyph on the nut.
            - off   : no persistent mark — the chunky nut bar is the affordance; a soft
                      accent ring appears on hover to confirm the string is clickable.
          Shown whenever interactive OR a grip is present. */}
      {(grip || interactive) && (
        <g className="neck-nut-markers">
          {tuning.openStrings.map((_, s) => {
            const sg = grip?.[s];
            const cx = nutX(g);
            const cy = stringY(g, s);
            const isOpen = sg?.kind === 'open';
            const isMuted = sg?.kind === 'muted';
            return (
              <g
                key={`nut-${s}`}
                className={`nut-marker${onNutClick ? ' clickable' : ''}`}
                onClick={onNutClick ? () => onNutClick(s) : undefined}
                role={onNutClick ? 'button' : undefined}
                aria-label={
                  onNutClick
                    ? `string ${s + 1} nut: ${
                        isOpen ? 'open' : isMuted ? 'muted' : 'off'
                      } (click to ring open)`
                    : undefined
                }
              >
                {onNutClick && (
                  <circle cx={cx} cy={cy} r={NUT_SLOT_R} className="nut-marker-hit" />
                )}
                {/* Hover-only ring — invisible at rest, accent on hover. */}
                {onNutClick && !isOpen && !isMuted && (
                  <circle cx={cx} cy={cy} r={NUT_SLOT_R - 2} className="nut-open-slot" fill="none" />
                )}
                {isMuted && (
                  <text x={cx} y={cy} className="nut-marker-glyph" textAnchor="middle">
                    X
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
