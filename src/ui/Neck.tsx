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
// Pure presentational component: it receives the already-projected positions and the
// drone readings (computed by /projection in the shell) and the label mode + key
// context. No per-note selection state (deixis is an MCP concern, docs/09 UI#3).

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

export interface NeckProps {
  readonly tuning: Tuning;
  /** Projected degree positions for the active context; [] = dormant (no overlay). */
  readonly positions: readonly ProjectedPosition[];
  /** Per-open-string drone readings; undefined = no context selected (dormant). */
  readonly drones?: readonly OpenStringDrone[];
  readonly labelMode: LabelMode;
}

const g = DEFAULT_GEOMETRY;
const DOT_R = 9;

export function Neck({ tuning, positions, drones, labelMode }: NeckProps) {
  const w = neckWidth(g);
  const h = neckHeight(g);
  const ctx: KeyContext = { tonic: tuning.tonic };
  const strings = tuning.openStrings.length;

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

      {/* The nut. */}
      <line
        x1={nutX(g)}
        y1={stringY(g, 0)}
        x2={nutX(g)}
        y2={stringY(g, strings - 1)}
        className="nut-line"
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
    </svg>
  );
}
