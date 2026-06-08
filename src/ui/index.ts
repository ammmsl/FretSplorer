// /ui — the SVG fretboard surface + three-region app shell (the M0 milestone node).
// Built per docs/08-ux-design.md, ADR 0005 (three-region shell), ADR 0006 (SVG surface).
//
// Barrel: re-exports the public components + the pure helpers (+ their types) that
// other modules / tests bind to. Imports /core via "../core" and the forward
// projection via "../projection".

export { AppShell } from './AppShell';
export { Neck } from './Neck';
export type { NeckProps } from './Neck';
export { NeckStack } from './NeckStack';
export type { NeckInstance, NeckStackProps } from './NeckStack';
export { ControlBar } from './ControlBar';
export type { ControlBarProps, ContextSelection } from './ControlBar';

export {
  GrammarCardPanel,
  ReadoutPanel,
  ConversationPanel,
  NotationPane,
} from './panels';

export { TUNINGS, SCALES, CHORDS, tuningLabel } from './fixtures';
export type { ScaleOption, ChordOption } from './fixtures';

export { degreeStyle, droneStyle, lighten, darken } from './palette';
export type { DegreeStyle, DroneStyle, DotShape } from './palette';

export {
  DEFAULT_GEOMETRY,
  nutX,
  fretLineX,
  noteX,
  stringY,
  neckWidth,
  neckHeight,
  SINGLE_INLAY_FRETS,
  DOUBLE_INLAY_FRETS,
} from './geometry';
export type { NeckGeometry } from './geometry';

export {
  DEFAULT_LABEL_MODE,
  LABEL_MODE_ORDER,
  nextLabelMode,
  labelModeCaption,
  dotLabel,
} from './labels';
export type { LabelMode } from './labels';

export { DEFAULT_THEME, nextTheme } from './theme';
export type { Theme } from './theme';
