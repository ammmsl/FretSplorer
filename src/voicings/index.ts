// /voicings — find_voicings + a minimal playability flag (docs/04; docs/09 [UI]; R6).
// Combinatorial fingerable-voicing search over a tuning, ranked by a tunable score.
// Reads only from /core; pure, no hidden state.

export { findVoicings, playability, scoreFeatures, PLAYABILITY_THRESHOLDS, SCORE_WEIGHTS } from './findVoicings';

export type {
  PlayabilityFlag,
  Playability,
  RankedVoicing,
  FindOpts,
} from './findVoicings';
