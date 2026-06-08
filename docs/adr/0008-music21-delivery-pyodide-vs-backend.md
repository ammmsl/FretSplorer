# music21 delivery: Pyodide (client-side), lazy-loaded (R1)

**Status:** accepted

## Decision

Tier-3 inter-instrument analysis (`romanNumeralFromChord` + voicing anatomy) ships **fully
client-side via Pyodide + music21**, **lazy-loaded** on first Tier-3 use, not eagerly. We do
**not** stand up a backend. The thin FastAPI backend is kept in the spike as a documented
fallback, not the V1 path.

This keeps the `d_music21` infra fork resolved as **static** — the property docs/00 and R1
call out ("the no-backend simplicity of an open-source app"). It is the one decision flagged
as able to force structural rework if deferred (docs/07-build-sequencing.html); resolving it
to *static* means no service layer, no CORS, no hosting in the architecture.

## Evidence (measured, not estimated)

Both sides ran the **same two calls** on the same chords via the same `music21_ops` logic, so
this isolates *delivery*, not analysis. Output was byte-identical across both
(`results/backend.json` vs `results/pyodide.json`), incl. the canonical Open G home chord:
`G/D`, root G, bass D (lowest pitch — R10 holds), `I64`, D tripled / G doubled — the Tier-3
sentence docs/01 promised. Spike: [spikes/r1-music21/](../../spikes/r1-music21/).

| Metric | Pyodide (chosen) | Thin backend (rejected) |
|---|---|---|
| Bundle / download | **15.9 MB** — runtime + music21 + numpy; lazy + CDN/disk-cached | ~0 client |
| Cold start | **8.2 s** first visit · **~3.4 s** repeat (cached, no re-download) | 0.55 s once at server boot (not per user) |
| Warm per-call (both ops) | ~20 ms (roman 11.2 / anatomy 8.5) | ~12 ms compute; **12.5 ms** localhost round-trip |
| Real-network per-call | none (in-process) | + WAN RTT, **~30–150 ms** typical, per call |
| Deployment | **fully static** (CDN, zero ops, forkable) | hosted Python svc: cost, ops, serverless cold-starts |

Measured on Win11 / Python 3.13 / Chromium. (Localhost note: a spurious ~2 s/call from the
Windows IPv6 `::1`-before-`127.0.0.1` fallback was identified and corrected to ~12.5 ms — see
the spike README.)

## The thresholds behind the call

The decision is **not** about warm per-call latency — both pass comfortably, and **Tier-3 is
not in the hot interactive loop** (it fires on commit / "expose what the guitar is doing",
docs/01 §D, §F; the live loop is the lightweight SVG surface). The real trade is **one-time
8 s + 15.9 MB on the client** vs **a permanent service to host**. We chose client because:

- **Static-shipping is a stated product value** (open source, forkable, self-hostable,
  zero-ops). A backend forfeits it permanently; the client cost is paid once and cached.
- **Lazy loading hides the cost**: the app shell, fretboard, projection, and Tier-1/Tier-2
  (Tonal, client) need none of this. Pyodide loads in the background only when the user first
  asks for inter-instrument translation — an explicit, infrequent action, not page load.
- **A backend's cold-start is worse where it bites**: serverless Python scaling from zero
  re-imports music21 on *every* cold instance (~0.5 s+ server-side, plus network), recurring
  for every user after idle — vs Pyodide's once-per-device, then cached.

Reversal triggers — adopt the (already-built) backend if any hold:
1. Tier-3 moves **into the hot loop** (it won't, per the docs cadence).
2. A required per-call budget is **<16 ms p99 including network** (then in-process Pyodide
   wins anyway — this argues *for* the choice, not against).
3. The bundle/cold-start proves intolerable on low-end target devices in real testing, OR a
   future feature needs the **full music21 corpus** (large, impractical to ship client-side).
   Only then does a thin backend earn its ops cost.

## Consequences

- Tier-3 (`t3` node) is a **lazy client module**; Pyodide init is deferred and cached, off the
  app-shell critical path.
- No service, no hosting, no CORS in the V1 architecture; the app stays a static deploy.
- music21 stays **out of `/core`** — `/core` is pitch primitives only (ADR 0007);
  Tier-3 consumes the `Voicing` multiset that `/core` preserves.
- `requirements.txt` (backend fallback) is spike-local; the repo-root `package.json` is
  untouched (owned by the concurrent orthogonal build).
