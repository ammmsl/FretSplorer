// Voicing construction (/core) — THE load-bearing type. A specific octave-placed,
// possibly-doubled realisation: the actual sounding pitch MULTISET. Preserves
// octaves + doublings; NEVER deduplicated or collapsed to pitch classes
// (pitch-model.ts §5; CONTEXT.md "Voicing"; docs/06 R10).

import type { Midi, Voicing } from './pitch-model';
import { midi } from './pitch';

/**
 * Build a Voicing from an ordered list of sounding pitches. The order is preserved
 * exactly (it is a multiset, not a set) so doublings and register survive.
 *
 * `bassIndex` is `argmin(pitches)` — the index of the lowest PITCH, NOT the lowest
 * string index. Re-entrant tunings and partial capos break the string-order
 * assumption, so the bass must come from the pitch, full stop (docs/03; R10). Ties
 * resolve to the first (lowest-index) occurrence.
 */
export function voicing(pitches: ReadonlyArray<Midi | number>): Voicing {
  if (pitches.length === 0) throw new Error('voicing: cannot build from an empty pitch list');
  const ps: Midi[] = pitches.map((p) => (typeof p === 'number' ? midi(p) : p));

  let bassIndex = 0;
  for (let i = 1; i < ps.length; i++) {
    if ((ps[i] as number) < (ps[bassIndex] as number)) bassIndex = i;
  }
  return { pitches: ps, bassIndex };
}

/** Convenience accessor: the bass (lowest) pitch of a voicing. */
export function bassPitch(v: Voicing): Midi {
  return v.pitches[v.bassIndex];
}
