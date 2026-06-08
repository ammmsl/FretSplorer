// /tension — string-tension / setup advisor (docs/01-feature-set.md §E, R7).
// Orthogonal to /core: depends only on a tuning's per-string MIDI pitches.

export { adviseSetup } from './adviseSetup';
export {
  midiToFrequency,
  midiToNoteName,
  tensionLb,
  tensionNewtonMetric,
  unitWeightToLinearMass,
  inchesToMeters,
  lbToNewton,
  lbToKgf,
  GRAVITY_IN_S2,
} from './formula';
export { breakTensionLbPlainSteel, minTensilePsi } from './data/wireStrength';
export {
  UNIT_WEIGHTS,
  UNIT_WEIGHT_SOURCE,
  findByItem,
  nearestEntry,
  entriesForMaterial,
} from './data/unitWeights';
export { COMFORT_BANDS } from './data/comfort';

export type {
  Tuning,
  Material,
  Instrument,
  GaugeSpec,
  GaugeInput,
  AdviseOptions,
  TensionBand,
  BreakLevel,
  Flag,
  Tension,
  BreakAssessment,
  GaugeResolved,
  Recommendation,
  StringAdvice,
  SetupAdvice,
  SetupProvenance,
} from './types';
