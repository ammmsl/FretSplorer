// Forward projection (/projection) — the spine's forward node.
//
// entity (Scale | Chord) + tuning -> every (string, fret) where the entity's
// pitch classes occur on the fretboard, degree-coloured relative to the entity
// root. The pitch math is the system invariant:
//   pitch(string, fret) = openStrings[string] + fret
// MIDI integers are the universal coordinate (docs/03-architecture.md; ADR 0007).
//
// This implements the `Project` contract pinned in src/core/pitch-model.ts §8.
// The exported `project` const is assignable to `Project` (a 2-arg type); the
// optional `maxFret` 3rd arg extends it WITHOUT breaking that assignability.
//
// Degree colour and the drone map are SEPARATE channels (docs/01 §B; CONTEXT.md):
//   - Scale: reuse the accurately-spelled, index-aligned entity.degrees[i].
//   - Chord: derive from the chromatic offset (chords carry no degree map), via
//     core's canonical degreeFromOffset (both thirds/sevenths read as chord tones
//     so major/minor colour correctly; precise relational labels are Tier-1 / M2).
// Scale vs Chord is feature-detected on "degrees" (NOT instanceof) — a Scale has
// the degree map, a Chord does not (pitch-model.ts §4 vs §5).

import type {
  Degree,
  ProjectableEntity,
  ProjectedPosition,
  Scale,
  Tuning,
} from '../core';
import { degreeFromOffset, midi, toPitchClass } from '../core';

/** Default highest fret to project to (a generous full-scale neck). */
const DEFAULT_MAX_FRET = 24;

/** Feature-detect a Scale (has an index-aligned `degrees` map) vs a bare Chord. */
function isScale(entity: ProjectableEntity): entity is Scale {
  return Array.isArray((entity as Scale).degrees);
}

/**
 * Forward-project a Scale or Chord onto a tuning's fretboard.
 *
 * For each string s (0..N-1) and fret f (0..maxFret): pitch = openStrings[s] + f.
 * Pitches above MIDI 127 are skipped (off the top of the playable range). If the
 * pitch's class is in `entity.pitchClasses`, emit a ProjectedPosition with the
 * degree relative to the entity root.
 *
 * @param entity   a Scale or Chord (abstract pc-level ProjectableEntity)
 * @param tuning   the projection target (open-string MIDI pitches)
 * @param maxFret  highest fret to scan (default 24); optional 3rd arg keeps the
 *                 export assignable to the pinned 2-arg `Project` type.
 */
export const project = (
  entity: ProjectableEntity,
  tuning: Tuning,
  maxFret: number = DEFAULT_MAX_FRET,
): readonly ProjectedPosition[] => {
  const scaleEntity = isScale(entity) ? entity : null;
  const positions: ProjectedPosition[] = [];

  for (let string = 0; string < tuning.openStrings.length; string++) {
    const open = tuning.openStrings[string] as number;
    for (let fret = 0; fret <= maxFret; fret++) {
      const pitch = open + fret;
      if (pitch > 127) break; // monotonic in fret — nothing higher is playable
      const pc = toPitchClass(pitch);
      const idx = entity.pitchClasses.indexOf(pc);
      if (idx === -1) continue;

      const degree: Degree = scaleEntity
        ? // Scale: reuse the aligned, accurately-spelled degree label.
          scaleEntity.degrees[idx]
        : // Chord: derive from the chromatic offset to the chord root.
          degreeFromOffset(((pc as number) - (entity.root as number) + 12) % 12);

      positions.push({ string, fret, pitch: midi(pitch), degree });
    }
  }

  return positions;
};
