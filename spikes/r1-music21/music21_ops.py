"""Shared Tier-3 music21 operations for the R1 spike.

The TWO calls Fretsplorer's Tier-3 needs (docs/01-feature-set.md D-Tier3, docs/03):
  1. roman_numeral(midi, key)  -> key-dependent functional analysis w/ figured-bass inversion
  2. voicing_anatomy(midi)     -> root / bass / inversion / doublings / omissions

Both consume a MIDI multiset (octaves + doublings preserved; bass = lowest pitch, R10) and
return plain JSON-able dicts. This SAME module runs in both delivery modes:
  - backend:  imported by app.py / bench_backend.py  (CPython + music21)
  - Pyodide:  fetched and exec'd in the browser        (Pyodide CPython + micropip music21)
so the comparison isolates the *delivery* variable, not the analysis code.
"""

from music21 import chord, key as m21key, roman


def _chord_from_midi(midi):
    """Build a music21 Chord from a MIDI multiset, preserving octaves/doublings."""
    # music21 pitch midi is 1:1 with our /core Midi coordinate.
    return chord.Chord([int(m) for m in midi])


def roman_numeral(midi, key):
    """Call 1: roman.romanNumeralFromChord(chord, Key) -> functional analysis."""
    c = _chord_from_midi(midi)
    k = m21key.Key(key)
    rn = roman.romanNumeralFromChord(c, k)
    return {
        "figure": rn.figure,            # e.g. "I", "V7", "I6", "ii7"
        "romanNumeral": rn.romanNumeralAlone,
        "scaleDegree": rn.scaleDegree,
        "inversion": rn.inversion(),
        "figuredBass": rn.figuresWritten,
    }


def voicing_anatomy(midi):
    """Call 2: full voicing anatomy - root/bass/inversion/doublings/omissions."""
    c = _chord_from_midi(midi)
    root = c.root()
    bass = c.bass()  # music21 computes bass from lowest pitch (matches R10)

    # Doublings: pitch classes that appear more than once in the multiset.
    pc_counts = {}
    for p in c.pitches:
        pc_counts[p.name] = pc_counts.get(p.name, 0) + 1
    doublings = {name: n for name, n in pc_counts.items() if n > 1}

    # Omissions: chord-member degrees absent relative to the full triad/7th.
    # (Guitar voicings routinely omit the 5th - docs/06 R5.)
    omissions = []
    try:
        # commonName / pitchedCommonName describe the abstract identity;
        # we report which canonical members are missing from the realised set.
        present_pcs = {p.pitchClass for p in c.pitches}
        # Expected members from music21's analysis of the chord:
        for member in c.annotateIntervals(inPlace=False, returnList=True) or []:
            pass  # annotateIntervals is display-oriented; omission logic below is simpler
    except Exception:
        pass
    # Simpler, robust omission check: 5th present?
    fifth = c.fifth
    if fifth is None:
        omissions.append("5th")

    return {
        "root": root.nameWithOctave if root else None,
        "rootPc": root.pitchClass if root else None,
        "bass": bass.nameWithOctave if bass else None,
        "bassPc": bass.pitchClass if bass else None,
        "inversion": c.inversion(),
        "commonName": c.commonName,
        "pitchedCommonName": c.pitchedCommonName,
        "pitches": [p.nameWithOctave for p in c.pitches],
        "doublings": doublings,
        "omissions": omissions,
    }


def analyze(case):
    """Run both calls for one chords.json case."""
    return {
        "id": case["id"],
        "roman": roman_numeral(case["midi"], case["key"]),
        "anatomy": voicing_anatomy(case["midi"]),
    }
