"""Thin backend (FastAPI) doing the SAME two Tier-3 calls as the Pyodide side.

This is the "needs hosting/ops" alternative in R1. Reuses music21_ops.py verbatim,
so the analysis is identical to pyodide.html and bench_backend.py - only delivery differs.

Run:   uvicorn app:app --port 8732
Probe: curl -s -X POST localhost:8732/analyze -H "content-type: application/json" \
            -d '{"midi":[38,43,50,55,59,62],"key":"G"}'
"""

from fastapi import FastAPI
from pydantic import BaseModel

import music21_ops

app = FastAPI(title="Fretsplorer R1 - music21 Tier-3 backend")


class ChordIn(BaseModel):
    midi: list[int]
    key: str


@app.post("/analyze")
def analyze(c: ChordIn):
    """Both Tier-3 calls for one chord (the shape the MCP Tier-3 tool would call)."""
    return {
        "roman": music21_ops.roman_numeral(c.midi, c.key),
        "anatomy": music21_ops.voicing_anatomy(c.midi),
    }


@app.get("/health")
def health():
    return {"ok": True}
