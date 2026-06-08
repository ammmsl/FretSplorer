// Degree & drone visual language (/ui) — PURE mapping helpers (docs/08 §1c, §1d).
//
// DUAL CHANNEL, two SEPARATE geometries (docs/01 §B; CONTEXT.md):
//   - DEGREE  -> dot SHAPE (root = distinct) + dot COLOUR (by degree) + saturation
//               (chord tones saturated, extensions lighter). Lives on the dot FILL.
//   - DRONE   -> open-string LINE colour + dash + nut HALO. Lives on the string
//               geometry, NEVER on the dot fill. No two meanings share a pixel-role.
//
// COLOURBLIND-SAFE: degrees ride a blue<->orange/yellow + LIGHTNESS axis, never the
// red/green axis for the critical contrasts (docs/08 §1c, §1j). Drone tension pairs
// colour with a DASH pattern so it survives CVD (docs/08 §1d). Colour is therefore
// never the SOLE channel: root has a unique shape, drone has a unique dash.
//
// Palette is theme-aware (light-first, dark optional) — we return the same hues but
// the caller renders them on the active background; we keep saturation/lightness
// chosen to keep WCAG-AA-ish contrast on both (docs/08 §1j).

import type { Degree, GradedTension } from '../core';

/** A dot's structural shape. Root is distinct (docs/08 §1c). */
export type DotShape = 'root' | 'plain';

/** Resolved visual style for a degree dot. */
export interface DegreeStyle {
  /** Distinct shape for the root; plain circle otherwise. */
  readonly shape: DotShape;
  /** Fill colour (hex). Encodes the degree along a CVD-safe hue/lightness axis. */
  readonly fill: string;
  /** Outline/text colour with good contrast against the fill. */
  readonly stroke: string;
  /** Text colour for an on-dot label. */
  readonly text: string;
}

// Degree colour by chromatic offset from root (degree.fromRoot, 0..11). The axis runs
// cool/blue (stable, low scale degrees) through teal/green to warm amber/orange
// (tense extensions) — a hue + lightness ramp, deliberately avoiding a red/green
// pairing for adjacent critical degrees. Root (0) is the strongest anchor colour.
const DEGREE_HUE: readonly string[] = [
  '#1f3a8a', // 0  root   — deep indigo
  '#5b6fb8', // 1  b2     — muted blue
  '#2563c9', // 2  2/9    — blue
  '#0e7d8c', // 3  b3     — teal
  '#0fa3a3', // 4  3      — bright teal
  '#3f9d5a', // 5  4/11   — green
  '#8a8f2f', // 6  b5/#11 — olive
  '#3d6f1f', // 7  5      — deep green (consonant anchor, kept cool-green)
  '#b6862f', // 8  b6     — gold
  '#d99a2b', // 9  6/13   — amber
  '#e07b39', // 10 b7     — orange
  '#cf5a2e', // 11 7      — burnt orange
];

/**
 * Resolve a Degree to its dot style. Root (label "1" / fromRoot 0) gets the distinct
 * shape; chord tones render at full saturation, extensions are lightened toward the
 * background so the structural tones pop (docs/08 §1c).
 */
export function degreeStyle(degree: Degree): DegreeStyle {
  const offset = ((degree.fromRoot as number) % 12 + 12) % 12;
  const base = DEGREE_HUE[offset] ?? DEGREE_HUE[0];
  const isRoot = offset === 0 || degree.label === '1';
  // Extensions are lightened (mixed toward white) so chord tones read more saturated.
  const fill = degree.isChordTone ? base : lighten(base, 0.42);
  return {
    shape: isRoot ? 'root' : 'plain',
    fill,
    stroke: isRoot ? '#ffffff' : darken(base, 0.25),
    text: '#ffffff',
  };
}

/** Resolved visual style for an open-string drone treatment. */
export interface DroneStyle {
  /** Line/halo colour for the open string. */
  readonly color: string;
  /** SVG stroke-dasharray; "" = solid. Pairs with colour for CVD-safety. */
  readonly dash: string;
  /** Stroke width for the open-string line (tension reads slightly heavier). */
  readonly width: number;
}

// GradedTension -> (colour, dash, width). Cool + solid = safe (reinforce/consonant);
// warm + dashed = tension (color/bite); strongest + jagged-dash = unstable (tritone).
// Matches ADR 0004's 5-level ordinal scale and docs/08 §1d.
const DRONE_BY_TENSION: Readonly<Record<GradedTension, DroneStyle>> = {
  reinforce: { color: '#1f6f4a', dash: '', width: 3.2 }, // unison/octave — solid green, strongest-safe
  consonant: { color: '#2f8f6f', dash: '', width: 2.4 }, // 3rds/6ths/4th/5th — solid cool
  color: { color: '#c98a2a', dash: '5 4', width: 2.4 }, //  whole-tone shimmer — warm, gentle dash
  bite: { color: '#d9622e', dash: '4 4', width: 2.6 }, //   semitone bite — strong warm, tighter dash
  unstable: { color: '#c0392b', dash: '2 4', width: 2.8 }, // tritone — strongest, jagged dash
};

/** Resolve a GradedTension term to its open-string line/halo style. */
export function droneStyle(tension: GradedTension): DroneStyle {
  return DRONE_BY_TENSION[tension];
}

// ── small colour helpers (pure) ────────────────────────────────────────────────

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Mix a colour toward white by `amount` (0..1). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Mix a colour toward black by `amount` (0..1). */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}
