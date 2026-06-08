"""Backend-side measurement harness for R1.

Measures, for CPython + music21 doing the two Tier-3 calls:
  - import/init cost (the backend analogue of Pyodide "cold start": time to first
    music21 import + first analysis, JIT/cache cold)
  - warm per-call latency (median over N runs), the number that matters for the
    interactive Readout panel

It does NOT measure network round-trip here (that is deployment-specific; the ADR
adds a realistic localhost + WAN estimate). This isolates the *compute* cost so the
Pyodide-vs-backend comparison is apples-to-apples on the analysis itself.

Run:  python bench_backend.py
"""

import json
import os
import statistics
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    cases = json.load(open(os.path.join(HERE, "chords.json")))["cases"]

    # --- cold: time the first import + first full analysis -------------------
    t0 = time.perf_counter()
    import music21_ops  # noqa: E402  (timing the import deliberately)
    t_import = time.perf_counter() - t0

    t0 = time.perf_counter()
    first = music21_ops.analyze(cases[0])
    t_first = time.perf_counter() - t0

    # --- warm: median per-call latency for each operation --------------------
    N = 50
    roman_times, anat_times, both_times = [], [], []
    for _ in range(N):
        for c in cases:
            t0 = time.perf_counter()
            music21_ops.roman_numeral(c["midi"], c["key"])
            roman_times.append((time.perf_counter() - t0) * 1000)

            t0 = time.perf_counter()
            music21_ops.voicing_anatomy(c["midi"])
            anat_times.append((time.perf_counter() - t0) * 1000)

            t0 = time.perf_counter()
            music21_ops.analyze(c)
            both_times.append((time.perf_counter() - t0) * 1000)

    def stats(xs):
        return {
            "median_ms": round(statistics.median(xs), 3),
            "p95_ms": round(sorted(xs)[int(len(xs) * 0.95)], 3),
            "min_ms": round(min(xs), 3),
        }

    result = {
        "engine": "CPython + music21 (backend)",
        "music21_version": __import__("music21").__version__,
        "cold": {
            "import_s": round(t_import, 3),
            "first_analysis_s": round(t_first, 3),
            "total_cold_s": round(t_import + t_first, 3),
        },
        "warm_per_call": {
            "romanNumeral": stats(roman_times),
            "voicingAnatomy": stats(anat_times),
            "both": stats(both_times),
        },
        "sample_output": first,
    }
    print(json.dumps(result, indent=2))
    out = os.path.join(HERE, "results", "backend.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(result, open(out, "w"), indent=2)


if __name__ == "__main__":
    main()
