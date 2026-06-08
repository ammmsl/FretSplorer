# R1 spike — music21 delivery: Pyodide vs thin backend

Empirical spike for research item **R1** (docs/06-research-directive.md): does Tier-3
(inter-instrument analysis) ship **fully client-side via Pyodide**, or does it need a
**thin backend**? The decision is recorded in
[docs/adr/0008](../../docs/adr/0008-music21-delivery-pyodide-vs-backend.md).

This directory is **isolated**: its own `requirements.txt`, no dependency on the repo-root
`package.json`. Nothing here is spine code.

## What it measures

The **same two Tier-3 calls** (docs/01 §D-Tier3) on the shared `chords.json` set, run two ways:

1. `romanNumeralFromChord(chord, key)` — key-dependent functional analysis (figured-bass inversion)
2. voicing anatomy — root / bass / inversion / doublings / omissions

The analysis logic lives **once** in `music21_ops.py` and is reused verbatim by the backend;
`pyodide.html` inlines the same logic. So the comparison isolates **delivery cost**, not
analysis code — confirmed by the byte-identical output across both sides.

## Files

| File | Role |
|---|---|
| `chords.json` | Representative MIDI multisets + key context (incl. the Open G home chord) |
| `music21_ops.py` | The two Tier-3 calls — shared by backend + (mirrored in) Pyodide |
| `bench_backend.py` | Backend measurement: cold import + warm per-call (CPython) |
| `app.py` | The thin FastAPI backend (`POST /analyze`) — the "needs hosting" alternative |
| `pyodide.html` | Pyodide harness: loads Pyodide, micropip-installs music21, measures cold-start, warm per-call, downloaded bytes |
| `results/` | Captured measurements (`backend.json`, `pyodide.json`, `backend_network.json`) |

## Reproduce

```bash
pip install -r requirements.txt

# Backend compute numbers:
python bench_backend.py

# Backend network round-trip (use 127.0.0.1, NOT localhost, on Windows — see note):
python -m uvicorn app:app --host 127.0.0.1 --port 8732 &
#   then time POSTs to http://127.0.0.1:8732/analyze

# Pyodide numbers (real browser):
python -m http.server 8731    # serve this dir
#   open http://localhost:8731/pyodide.html ; read window.__R1__
```

## Measured results (this machine: Win11, Python 3.13, Chromium)

| Metric | Pyodide (client) | Thin backend (FastAPI) |
|---|---|---|
| Download / bundle | **15.9 MB** (runtime+music21+numpy, lazy, CDN-cached) | ~0 client (just fetch JSON) |
| Cold start | **8.2 s** first visit · ~3.4 s repeat (disk-cached, no re-download) | 0.55 s **server-side, once at boot** (not per user) |
| Warm per-call (both ops) | ~20 ms (roman 11 / anatomy 8.5) | ~12 ms compute · **12.5 ms** localhost round-trip |
| + real network | none | **+ WAN RTT** (~30–150 ms typical) per call |
| Deployment | **fully static** (CDN, zero ops) | hosted Python service (cost, ops, serverless cold-starts) |

> Windows note: probing via `localhost` showed a spurious ~2 s per call — `localhost`
> resolves to IPv6 `::1` first while uvicorn binds IPv4 `127.0.0.1`, costing a connect-timeout
> fallback. Measuring against `127.0.0.1` gives the true ~12.5 ms. Recorded so the next
> person doesn't misread it as backend latency.

**Recommendation: Pyodide, lazy-loaded.** See the ADR for the thresholds behind the call.
