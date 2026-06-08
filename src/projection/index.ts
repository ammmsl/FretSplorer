// /projection — the forward-projection spine node (docs/03-architecture.md; ADR 0007).
//
// project(): entity + tuning -> degree-coloured (string, fret) positions. Matches
// the pinned `Project` contract (src/core/pitch-model.ts §8) — see the assertion below.
// droneMap(): the SEPARATE graded drone-tension channel per open string (ADR 0004).

import type { Project } from '../core';
import { project } from './project';

// Compile-time guard: `project` MUST be assignable to the pinned 2-arg `Project`
// contract (the optional 3rd `maxFret` arg does not break this). Erases at runtime.
const _projectIsAProject: Project = project;
void _projectIsAProject;

export { project } from './project';
export { droneMap } from './droneMap';
export type { OpenStringDrone } from './droneMap';
