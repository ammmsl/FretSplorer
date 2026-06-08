// /core — invariant pitch model (truth). MIDI ints / pitch-class sets, intervals,
// scales, chords (abstract) and voicings (realised). The source-of-truth layer:
// everything else reads from it or projects it (docs/03-architecture.md; ADR 0007).
//
// Runtime constructors live in the sibling modules; the type CONTRACT lives in
// pitch-model.ts and is re-exported here so consumers bind to one entry point.

export { midi, pitchClass, toPitchClass, intervalClass } from './pitch';
export { interval, degreeFromInterval, degreeFromOffset } from './interval';
export { scale } from './scale';
export { chord, chordFromPitchClasses } from './chord';
export { voicing, bassPitch } from './voicing';
export { spell } from './spell';
export { tuning, applyCapo } from './tuning';

export type {
  Midi,
  PitchClass,
  Semitones,
  IntervalClass,
  Interval,
  Degree,
  KeyContext,
  Spell,
  Scale,
  Chord,
  Voicing,
  Tuning,
  CapoShift,
  GradedTension,
  ProjectableEntity,
  ProjectedPosition,
  PlacedPosition,
  IdentifyContext,
  RankedCandidate,
  Project,
  Identify,
} from './pitch-model';
