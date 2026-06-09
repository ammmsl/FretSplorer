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
// optional SHAPE (the held notes, docs/08 decision e) and, when the interaction props
// are supplied, becomes INTERACTIVE — clicking fret cells / nut markers calls back to
// the shell which owns the shape state (docs/09 UI#4). With no interaction props it is
// purely presentational, so existing tests/usage are unaffected.
//
// Shape markers are a DISTINCT third visual: a SOLID filled disc with a ring (placed
// note) + open(O)/mute(X) glyphs at the nut + a bass callout — deliberately not the
// degree dot fill and not the drone line, so the held shape never reads as an overlay.

import { useRef, useState } from 'react';
import type {
  KeyContext,
  ProjectedPosition,
  Tuning,
} from '../core';
import type { OpenStringDrone } from '../projection';
import {
  DOUBLE_INLAY_FRETS,
  SINGLE_INLAY_FRETS,
  fretLineX,
  geometryForStringCount,
  neckHeight,
  neckWidth,
  noteX,
  nutX,
  stringY,
} from './geometry';
import { degreeStyle, droneStyle } from './palette';
import { dotLabel, type LabelMode } from './labels';
import type { Shape } from './shape';

export interface NeckProps {
  readonly tuning: Tuning;
  /** Projected degree positions for the active context; [] = dormant (no overlay). */
  readonly positions: readonly ProjectedPosition[];
  /** Per-open-string drone readings; undefined = no context selected (dormant). */
  readonly drones?: readonly OpenStringDrone[];
  readonly labelMode: LabelMode;
  // ── Optional interaction (the focused neck only). Omit all to stay presentational. ──
  /** The held shape to render (solid placed-note markers + nut O/X glyphs). */
  readonly shape?: Shape;
  /** String index of the BASS (lowest pitch) note to call out; null = none. */
  readonly bassString?: number | null;
  /** Fret of the bass note (so the marker sits on the right cell; 0 = open). */
  readonly bassFret?: number | null;
  /** Click an empty fret cell -> place; click a placed note -> remove (toggle). */
  readonly onFretClick?: (string: number, fret: number) => void;
  /** Click the per-string nut marker -> cycle open/mute/off. */
  readonly onNutClick?: (string: number) => void;
  // ── Capo (ADR 0014) — a physical bar drawn ON the neck. ──
  /** The capo on THIS neck: an absolute fret + which strings it covers (contiguous). */
  readonly capo?: { readonly fret: number; readonly covered: readonly boolean[] } | null;
  /** When true (focused neck), neck pointer drags MOVE the capo instead of placing notes. */
  readonly capoEdit?: boolean;
  /** Drag report: capo at `fret`, with the pointer over `pointerString` — the shell grows a
   *  contiguous span from whichever neck EDGE is nearer the pointer out to it (ADR 0014). */
  readonly onCapoSet?: (fret: number, pointerString: number) => void;
}

const CAPO_W = 14; // thickness of the capo bar (a touch narrower than a fret cell)

const DOT_R = 9;
const SHAPE_R = 10;
const NUT_W = 18; // thickness of the nut bar (a chunky bone-nut bar)
// The nut is a rounded-corner TRAPEZOID, NOT a vertical pill (a pill reads wrong and,
// sized to overhang the strings, floats past the neck — jarring under WYSIWYG). Its two
// vertical sides are parallel but unequal: the HEADSTOCK-side (short) edge bounds the
// STRING SPREAD, tapering out to the FRET-side (long) edge which is the full NECK WIDTH —
// the same width as the fretboard underlay it butts against. Centred on nutX so an open
// note still lands ON it (noteX(fret 0) === nutX), and the strings run through its full
// thickness (the string layer starts at the nut's outer edge, not its midline).
const NUT_CORNER_R = 4; // rounding of the headstock-side nut corners (the fret-side corners are square so the nut butts flush to the neck)
const NUT_SHORT_REACH = 0.5; // the headstock-side edge reaches this fraction of the way from the outer string out to the neck edge
const NUT_SLOT_R = 11; // radius of the per-string open-string hit + hover ring
// The neck is WIDER than the strings (like a real fretboard): a background underlay
// extends NECK_SHOULDER past each outer string. This is purely an underlay — string and
// fret geometry is unchanged; the strings simply sit inset from the neck edge. The neck
// has SQUARE corners (a fretboard isn't a rounded card).
const NECK_SHOULDER_FRAC = 0.45; // neck overhang past each outer string, as a fraction of a string-spacing
const FRET_NUM_GAP = 14; // gap from the neck's bottom edge to the fret-number baseline

/**
 * Path for a quadrilateral with rounded corners. `pts` are the four corners in order
 * (clockwise); each corner is replaced by a quadratic fillet whose radius is `r` (a single
 * radius for all corners, or one per corner), clamped to half the shorter adjacent edge so
 * thin shapes don't self-overlap. A radius of 0 leaves that corner square.
 */
function roundedQuadPath(
  pts: ReadonlyArray<readonly [number, number]>,
  r: number | readonly number[],
): string {
  const n = pts.length;
  const radii = typeof r === 'number' ? pts.map(() => r) : r;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i - 1 + n) % n];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[(i + 1) % n];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(radii[i], d1 / 2, d2 / 2);
    const ax = cx + ((px - cx) / d1) * rr;
    const ay = cy + ((py - cy) / d1) * rr;
    const bx = cx + ((nx - cx) / d2) * rr;
    const by = cy + ((ny - cy) / d2) * rr;
    parts.push(`${i === 0 ? 'M' : 'L'} ${ax.toFixed(2)} ${ay.toFixed(2)}`);
    parts.push(`Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${bx.toFixed(2)} ${by.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

export function Neck({
  tuning,
  positions,
  drones,
  labelMode,
  shape,
  bassString,
  bassFret,
  onFretClick,
  onNutClick,
  capo,
  capoEdit,
  onCapoSet,
}: NeckProps) {
  // Geometry is DERIVED from the tuning's string count (7-/8-string necks size correctly);
  // 6-string necks are byte-for-byte identical to the old DEFAULT_GEOMETRY (never hardcode 6).
  const strings = tuning.openStrings.length;
  const g = geometryForStringCount(strings);
  const w = neckWidth(g);
  const h = neckHeight(g);
  const ctx: KeyContext = { tonic: tuning.tonic };
  const interactive = Boolean(onFretClick || onNutClick);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [capoDragging, setCapoDragging] = useState(false);

  // A string's OPEN/ringing position: at the nut normally, but RELOCATED to the capo line
  // when the capo covers it (ADR 0014 — open + drone markers move to the capo). Frets behind
  // the capo on a covered string are dead.
  const openX = (s: number): number =>
    capo && capo.covered[s] ? noteX(g, capo.fret) : nutX(g);
  const isDeadCell = (s: number, fret: number): boolean =>
    !!capo && capo.covered[s] && fret < capo.fret;

  // Pointer (client) -> { fret, string } in neck coordinates, for capo dragging.
  const pointToCell = (e: { clientX: number; clientY: number }): { fret: number; string: number } | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    const fret = Math.max(1, Math.min(g.fretCount, Math.ceil((loc.x - g.padLeft) / g.fretSpacing)));
    const string = Math.max(0, Math.min(strings - 1, Math.round((loc.y - g.padY) / g.stringSpacing)));
    return { fret, string };
  };

  // Neck + nut geometry. The fretboard underlay is the full NECK WIDTH — the string span
  // plus a shoulder past each outer string — and runs from the nut to the last fret.
  const nutCy = (stringY(g, 0) + stringY(g, strings - 1)) / 2;
  const stringSpan = stringY(g, strings - 1) - stringY(g, 0);
  const neckHalf = stringSpan / 2 + NECK_SHOULDER_FRAC * g.stringSpacing; // half the neck width
  const nutLeft = nutX(g) - NUT_W / 2;
  const nutRight = nutX(g) + NUT_W / 2;
  // Nut TRAPEZOID: the fret-side (right) edge is the full neck width and butts flush
  // against the underlay (square corners so it touches the neck line). The headstock-side
  // (left) edge reaches NUT_SHORT_REACH of the way from the outer string out to the neck
  // edge (rounded corners). Both centred on nutCy.
  const nutShortHalf = stringSpan / 2 + NUT_SHORT_REACH * (neckHalf - stringSpan / 2);
  const nutPath = roundedQuadPath(
    [
      [nutLeft, nutCy - nutShortHalf], // headstock top (rounded)
      [nutRight, nutCy - neckHalf], // fret top — neck width (square)
      [nutRight, nutCy + neckHalf], // fret bottom — neck width (square)
      [nutLeft, nutCy + nutShortHalf], // headstock bottom (rounded)
    ],
    [NUT_CORNER_R, 0, 0, NUT_CORNER_R],
  );
  // The neck now reaches below the bottom string, so the fret-number captions hang a fixed
  // gap below the NECK edge (not the old `h - 4`, which assumed the neck ended at the
  // string). Extend the viewBox to make room for them.
  const neckBottom = nutCy + neckHalf;
  const fretNumberY = neckBottom + FRET_NUM_GAP;
  const svgH = Math.max(h, fretNumberY + 5);

  return (
    <svg
      ref={svgRef}
      className={`neck-svg${capoEdit ? ' capo-edit' : ''}`}
      viewBox={`0 0 ${w} ${svgH}`}
      width="100%"
      role="img"
      aria-label={`Fretboard for ${tuning.id}`}
      preserveAspectRatio="xMinYMid meet"
    >
      {/* Fretboard underlay — the NECK surface, wider than the strings (a shoulder past
          each outer string). It begins at the nut's fret-side edge (where the nut reaches
          full neck width) and runs to the last fret, so the nut's tapered head sits at the
          headstock boundary. Backmost layer. */}
      <rect
        className="fretboard-underlay"
        x={nutRight}
        y={nutCy - neckHalf}
        width={fretLineX(g, g.fretCount) - nutRight}
        height={neckHalf * 2}
        aria-hidden="true"
      />

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
            y1={nutCy - neckHalf}
            x2={fretLineX(g, f)}
            y2={nutCy + neckHalf}
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
              y={fretNumberY}
              className="fret-number"
              textAnchor="middle"
            >
              {f}
            </text>
          ))}
      </g>

      {/* The nut — a rounded-corner TRAPEZOID (headstock edge = string spread, fret edge =
          full neck width), like a real bone nut sitting across the strings, not a thin
          line, so it reads as a physical element and, when interactive, as a strip you can
          click to ring strings open (docs/09 UI#4). Open notes land ON it (noteX(fret 0)
          === nutX); the strings run through its full thickness. */}
      <path d={nutPath} className="nut-bar" aria-hidden="true" />

      {/* String lines — carry the DRONE channel when a context is active. Under a capo the
          live (ringing) portion of a COVERED string starts at the capo line; the segment
          behind the capo reads dead (ADR 0014). */}
      <g className="neck-strings">
        {tuning.openStrings.map((_, s) => {
          const drone = drones?.[s];
          const style = drone ? droneStyle(drone.tension) : undefined;
          const y = stringY(g, s);
          const liveX1 = openX(s);
          return (
            <g key={`string-${s}`}>
              {capo && capo.covered[s] && (
                <line
                  className="string-line dead"
                  x1={nutLeft}
                  y1={y}
                  x2={liveX1}
                  y2={y}
                  aria-hidden="true"
                />
              )}
              <line
                x1={liveX1}
                y1={y}
                x2={fretLineX(g, g.fretCount)}
                y2={y}
                className={style ? 'string-line drone-active' : 'string-line'}
                stroke={style?.color}
                strokeWidth={style?.width}
                strokeDasharray={style?.dash || undefined}
                aria-label={drone ? `string ${s + 1} drone: ${drone.tension}` : undefined}
              />
            </g>
          );
        })}
      </g>

      {/* Nut halos — the open-string drone halo. Relocates to the capo line on covered strings. */}
      {drones && (
        <g className="neck-halos">
          {drones.map((drone, s) => {
            const style = droneStyle(drone.tension);
            return (
              <circle
                key={`halo-${s}`}
                cx={openX(s)}
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

      {/* The CAPO — a physical bar across the covered strings at its absolute fret (ADR 0014).
          A contiguous span; the open/ringing + drone markers for covered strings have already
          relocated to this line. Drawn above the strings so it reads as clamped on top. */}
      {capo &&
        (() => {
          const coveredIdx = capo.covered
            .map((c, i) => (c ? i : -1))
            .filter((i) => i >= 0);
          if (coveredIdx.length === 0) return null;
          const cx = noteX(g, capo.fret);
          const top = stringY(g, coveredIdx[0]) - g.stringSpacing * 0.42;
          const bottom = stringY(g, coveredIdx[coveredIdx.length - 1]) + g.stringSpacing * 0.42;
          return (
            <g className="neck-capo" aria-label={`capo at fret ${capo.fret}`} role="img">
              <rect
                className="capo-bar"
                x={cx - CAPO_W / 2}
                y={top}
                width={CAPO_W}
                height={bottom - top}
                rx={5}
              />
            </g>
          );
        })()}

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

      {/* SHAPE placed notes — a SOLID disc + ring, visually distinct from the degree
          dot fill and the drone line (docs/08 decision e). Rendered above the overlay
          so the held shape reads as the foreground subject. */}
      {shape && (
        <g className="neck-shape">
          {shape.map((sg, s) => {
            if (sg.kind !== 'open' && sg.kind !== 'fret') return null;
            const fret = sg.kind === 'open' ? 0 : sg.fret;
            const cx = sg.kind === 'open' ? openX(s) : noteX(g, fret);
            const cy = stringY(g, s);
            const isBass = bassString === s && (bassFret ?? 0) === fret;
            return (
              <g
                key={`shape-${s}`}
                className={`shape-note${isBass ? ' shape-bass' : ''}`}
                role="img"
                aria-label={`held note on string ${s + 1} ${
                  fret === 0 ? 'open' : `fret ${fret}`
                }${isBass ? ' (bass)' : ''}`}
              >
                <circle className="shape-disc" cx={cx} cy={cy} r={SHAPE_R} />
                {isBass && (
                  <circle className="shape-bass-ring" cx={cx} cy={cy} r={SHAPE_R + 4} fill="none" />
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* BASS marker label — a small "B" badge calling out the computed lowest pitch. */}
      {shape && bassString != null && (
        <text
          className="shape-bass-label"
          x={bassFret ? noteX(g, bassFret) : openX(bassString)}
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
              const dead = isDeadCell(s, fret); // behind the capo on a covered string
              return (
                <rect
                  key={`cell-${s}-${fret}`}
                  className={`fret-cell${dead ? ' dead' : ''}`}
                  x={fretLineX(g, fret - 1)}
                  y={cy - g.stringSpacing / 2}
                  width={g.fretSpacing}
                  height={g.stringSpacing}
                  onClick={dead ? undefined : () => onFretClick(s, fret)}
                  role={dead ? undefined : 'button'}
                  aria-label={dead ? undefined : `string ${s + 1} fret ${fret}`}
                />
              );
            }),
          )}
        </g>
      )}

      {/* Per-string NUT markers — sit ON the nut bar (cx === nutX), exactly where an
          open note's shape disc lands, so the control and its result are co-located.
          Rendered ABOVE the fret-cell layer so a click right at the nut rings the string
          open (cycle open -> muted -> off) rather than landing on fret 1. Visual states:
            - open  : shown by the solid shape disc on the nut (drawn above).
            - muted : an X glyph on the nut.
            - off   : no persistent mark — the chunky nut bar is the affordance; a soft
                      accent ring appears on hover to confirm the string is clickable.
          Shown whenever interactive OR a shape is present. */}
      {(shape || interactive) && (
        <g className="neck-nut-markers">
          {tuning.openStrings.map((_, s) => {
            const sg = shape?.[s];
            const cx = openX(s);
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

      {/* Capo-edit drag overlay — topmost while editing, so a pointer drag MOVES the capo
          (x -> fret, y -> the span grows from the nearer neck edge out to the pointer string)
          rather than placing notes (ADR 0014). */}
      {capoEdit && onCapoSet && (
        <rect
          className="capo-drag-overlay"
          x={fretLineX(g, 0)}
          y={nutCy - neckHalf}
          width={fretLineX(g, g.fretCount) - fretLineX(g, 0)}
          height={neckHalf * 2}
          onPointerDown={(e) => {
            const c = pointToCell(e);
            if (!c) return;
            try {
              (e.target as Element).setPointerCapture(e.pointerId);
            } catch {
              /* capture unavailable (e.g. synthetic event) — drag still works via move */
            }
            setCapoDragging(true);
            onCapoSet(c.fret, c.string);
          }}
          onPointerMove={(e) => {
            if (!capoDragging) return;
            const c = pointToCell(e);
            if (c) onCapoSet(c.fret, c.string);
          }}
          onPointerUp={(e) => {
            setCapoDragging(false);
            try {
              (e.target as Element).releasePointerCapture(e.pointerId);
            } catch {
              /* pointer already released */
            }
          }}
        />
      )}
    </svg>
  );
}
