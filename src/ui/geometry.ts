// Fret geometry (/ui) — PURE coordinate math for the SVG neck surface (ADR 0006).
//
// The neck is horizontal, NUT on the LEFT, frets extending right (docs/08 §1b). The
// open string lives AT the nut (fret 0), not in a separate fret-0 column. Frets are
// drawn with EQUAL spacing (a navigational diagram, not a scale-length physical
// model — docs/08 calls for a clean minimal diagram, not skeuomorphism).
//
// String order: HIGH string on TOP (y small), low string on BOTTOM (y large), to
// match Guitar Pro + TAB (docs/08 §1b). Tuning.openStrings index 0 = string 1 (high),
// so string index maps directly to a top-to-bottom row.
//
// All values are in SVG user units; the outer <svg> uses a viewBox so the whole
// thing scales resolution-independently.

/** Fixed neck layout constants — a 24-fret, 6-string diagram. */
export interface NeckGeometry {
  /** Number of frets drawn (fret lines 1..fretCount; fret 0 is the nut). */
  readonly fretCount: number;
  /** Number of strings (rows). */
  readonly stringCount: number;
  /** Left padding before the nut (room for open/mute markers). */
  readonly padLeft: number;
  /** Right padding after the last fret. */
  readonly padRight: number;
  /** Top/bottom padding around the string rows. */
  readonly padY: number;
  /** Horizontal distance between adjacent fret lines (equal spacing). */
  readonly fretSpacing: number;
  /** Vertical distance between adjacent string rows. */
  readonly stringSpacing: number;
}

export const DEFAULT_GEOMETRY: NeckGeometry = {
  fretCount: 24,
  stringCount: 6,
  padLeft: 34,
  padRight: 18,
  padY: 22,
  fretSpacing: 40,
  stringSpacing: 26,
};

/**
 * geometryForStringCount(n) — the neck layout for an n-string instrument. EXTENDED RANGE
 * (7-/8-string) support: every constant is inherited from DEFAULT_GEOMETRY except
 * `stringCount`, so only the row count (and thus neckHeight) changes; the horizontal
 * fret math is identical. By construction `geometryForStringCount(6)` is deep-equal to
 * DEFAULT_GEOMETRY, so 6-string output is byte-for-byte unchanged (the charter invariant).
 * Never hardcode 6 — derive the count from `tuning.openStrings.length`.
 */
export function geometryForStringCount(stringCount: number): NeckGeometry {
  return { ...DEFAULT_GEOMETRY, stringCount };
}

/** X of the NUT line (fret 0 sits here). */
export function nutX(g: NeckGeometry): number {
  return g.padLeft;
}

/**
 * X of a given fret's LINE (the metal fret wire). Fret 0 returns the nut line.
 * Fret N is N fret-spacings to the right of the nut.
 */
export function fretLineX(g: NeckGeometry, fret: number): number {
  return g.padLeft + fret * g.fretSpacing;
}

/**
 * X at which a NOTE for a given fret is centred. The open string (fret 0) sits ON
 * the nut; a fretted note sits in the MIDDLE of the cell just behind its fret wire
 * (the familiar "press between the wires" position).
 */
export function noteX(g: NeckGeometry, fret: number): number {
  if (fret <= 0) return g.padLeft; // open string: on the nut
  return g.padLeft + (fret - 0.5) * g.fretSpacing;
}

/** Y of a string row. String 0 (high) is the TOP row (smallest y). */
export function stringY(g: NeckGeometry, stringIndex: number): number {
  return g.padY + stringIndex * g.stringSpacing;
}

/** Total SVG width for the neck. */
export function neckWidth(g: NeckGeometry): number {
  return g.padLeft + g.fretCount * g.fretSpacing + g.padRight;
}

/** Total SVG height for the neck. */
export function neckHeight(g: NeckGeometry): number {
  return g.padY * 2 + (g.stringCount - 1) * g.stringSpacing;
}

/**
 * Standard navigational inlay-marker frets. 12 and 24 are DOUBLE dots (octave),
 * the rest single. These are purely for orientation and are visually distinct from
 * degree dots (docs/08 §1b).
 */
export const SINGLE_INLAY_FRETS: readonly number[] = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_INLAY_FRETS: readonly number[] = [12, 24];
