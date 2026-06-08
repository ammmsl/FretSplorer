// /render — model -> alphaTab notation/audio adapter (docs/01-feature-set.md §F, R12/R8).
// alphaTab stays a COMPONENT (render-and-playback target), never the source of truth,
// and never in the hot interactive loop (docs/03-architecture.md).

export { fragmentToAlphaTex, midiToTuningName } from './alphaTexAdapter';
export type { RenderFragment, FragmentNote, RenderTuning } from './types';
