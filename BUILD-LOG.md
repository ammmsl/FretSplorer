# Overnight Build Log

**Charter:** `docs/10-overnight-build-charter.md` — MODE build (bounded autonomy).
**Branch:** `overnight/built-layer-and-content` (off `ui/design-tokens-followup`), one commit per work item.
**Gates at every commit:** `npm test` green · `tsc -b` clean · `eslint .` clean.
**Test count:** 271 → **357** (+86). tsc/eslint clean. Production build OK (alphaTab stays in its own lazy chunks).

Outcome: **all 9 work items landed** (items 1–8 + the stretch item 9). No stop-condition was
hit — nothing was improvised past a boundary, no test/contract was weakened. Every new surface
is mounted **provisionally** (a clearly-labelled `🧪 LAB` strip + the existing Notation pane);
the shell's three-region layout and flow are untouched. "Reach, don't place" held.

---

## Per-item status

| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Author 6 grammar cards | **landed** | `c694e67` |
| 2 | Extended-range geometry + 7/8-string fixtures | **landed** | `9deeba8` |
| 3 | GrammarCardPanel renders the real card | **landed** | `677b56d` |
| 4 | Capo / partial-capo control + applyCapo | **landed** | `fde8f33` |
| 5 | Route neighbors / translate / adviseSetup | **landed** | `ff9e38c` |
| 6 | Tension / setup panel | **landed** | `f855800` |
| 7 | alphaTab in NotationPane (lazy) | **landed** | `61fb2cc` |
| 8 | Shape-discovery view | **landed** | `0bf5601` |
| 9 | Morph / translate view (stretch) | **landed** | `7984838` |

### 1 — Six grammar cards (the highest-leverage item; done first)
Authored `kb/tunings/{open-d,open-e,open-c,dadgad,drop-d,double-drop-d}.yaml`, each schema-valid
with hand-verified pitch provenance and hand-authored movable shapes (full barres, drone-pedal
majors, the one-finger Drop-D/DADGAD power chord). Standard EADGBE deliberately gets **no** card.
- Verified `ok:true` through the **real** grounding harness: `src/grounding/__tests__/cards.grounding.test.ts`
  runs `mcpIdentify` + `functionOf` on each card's home grip and asserts `checkGrounding(...).ok`,
  AND asserts relational naming **fires** in `buildReadout` (HOME frame) for every card.
- Re-derived the authored `verifiedNote` arithmetic in-test (home pc-set + full-barre transposition)
  so a wrong MIDI value fails loudly.
- Extended the grounding KB-id registry (`KNOWN_TUNING_IDS`) to enroll the new card + shape ids.
- **Browser-confirmed:** Open D home chord reads *"the home chord — the I in D, with the open A
  pedalling as the 5th"* (degrees 1/5/3 correct) — the relational differentiator now fires in a
  curated tuning beyond Open-G.

### 2 — Extended-range geometry + fixtures
`geometryForStringCount(n)` derives the neck layout from the tuning; `geometryForStringCount(6)`
deep-equals `DEFAULT_GEOMETRY` (6-string output **byte-for-byte unchanged** — tested). `Neck`
derives its geometry from `tuning.openStrings.length`. Added the 4 remaining curated tunings (so
their cards are reachable) + 7-/8-string standard fixtures. The readout join invariant
(fixture pitches == card pitches) is now tested.

### 3 — GrammarCardPanel
Replaced the placeholder with the live `grammarCardResource`: spelled open strings, tonic, movable
shapes (barre rule + per-anchor slide functions), capo prose, idioms, provenance. Card-less tunings
show an honest hand-off note. **Browser-confirmed** rendering the full Open D card.

### 4 — Capo / partial capo
`CapoControl` emits a `CapoShift` (full or partial). `AppShell` stores a per-neck capo and derives
each neck's effective tuning via `applyCapo` (pitches shift, **tonic preserved**, base id kept so
the card still resolves). Pure `capoShiftFrom` in `capo.ts` with tests. Mounted in the Lab.

### 5 — Route the 3 unrouted MCP tools
`neighbors` ("where can this go"), `translate` ("…in DADGAD?"), `setup`/`adviseSetup` ("will this
feel floppy?") now route in `conversation.ts`, kept distinct from look-alikes (neighbours vs the
function "where does this GO"; a most-specific-first tuning parser puts *double drop D* before
*drop D*). End-to-end tests confirm each routed tool is `checkGrounding ok:true`. New quick-action chips.

### 6 — Tension / setup panel
`TensionPanel` over `adviseSetupTool`: per-string tension (lb), feel band, floppy/fine/break-risk
flag, gauge recommendation, total; electric/acoustic toggle. Gauges estimated → flagged uncertain.
**Browser-confirmed** live data. Mounted in the Lab.

### 7 — alphaTab in NotationPane (lazy)
Real notation+playback pane. alphaTab dynamic-imports (engine + Bravura + sonivox) only on first
expand — never the hot loop, mirroring the Tier-3 Pyodide pattern. Renders the focused grip (or the
open chord) via the pure `fragmentToAlphaTex` adapter; play/pause arms on soundfont load; api
destroyed on unmount. Build confirms alphaTab stays in separate ~1.2 MB dynamic chunks.

### 8 — Shape-discovery view
`ShapeDiscovery` lists card movable shapes; clicking a slide anchor realises the shape as a Grip
(`shapeToGrip`) and previews it on the focused neck. Tested incl. that a realised barre re-reads
through `nameTier1` as the home-transposed invariant the card claims. R3 auto-derivation stays deferred.

### 9 — Morph / translate view (stretch)
`MorphView` shows the focused grip's pitches re-placed on a chosen target tuning via `translate()`:
the retune (source vs target open strings) side by side + each pitch's landing or off-the-neck flag.
Full neck **animation deferred as polish**; the grounded before→after mapping is the substance.

---

## Stop-conditions

**None hit.** No edits to any ADR, KB schema, or `/core` type contract; no affective-dictionary
edits; no handoff-threshold tuning; no movable-shape auto-derivation (hand-authored only); no
persistence; the shell layout/flow was not restructured; no test or grounding contract was weakened.

The one boundary-adjacent change worth flagging for review (not a stop-condition, no decision needed):
`src/grounding/harness.ts` `KNOWN_TUNING_IDS` was extended to enroll the new card ids. This is the
file's own documented extension point ("enumerating them keeps the registry honest as cards are
authored") — the grounding **contract** (`checkGrounding`) is untouched.

---

## Decisions needing your judgement (none blocking)

1. **Drop-D tonic = E (pc 4), not D.** I kept the card's tonic matching the existing M0 fixture (E),
   on the rationale that Drop D is standard tuning with only the low string lowered, so the upper
   five strings stay E-centred and absolute naming remains correct. The card documents the low-D
   drone + one-finger power chord. **If you'd rather re-centre Drop D on D** (arguably more honest to
   how the tuning is used), it's a one-line change in both `kb/tunings/drop-d.yaml` and the `drop-d`
   fixture — cheap to flip. Flagging because it's a taste/pedagogy call, not a computed fact.
   (DADGAD kept tonic D; the open-major cards are unambiguous.)

---

## Morning agenda — placement/flow decisions now unblocked

Everything below is *mounted and functional* in the provisional `🧪 LAB` strip (or the Notation
pane). The morning's work is pure information-architecture rearrangement — lift each piece into its
real home and decide the flow:

1. **Capo** — where does the capo control live (a control-bar affordance? a neck-level gizmo on the
   nut?), and should it visualise as a clamp overlay on the neck (ADR 0006 mentions an absolute-fret
   clamp overlay — deliberately not built tonight as polish)?
2. **Tension/setup** — is this a peer panel, a tab in the readout, or a per-neck badge? It's
   orthogonal to harmony, so it can sit anywhere; decide whether it's always-visible or on-demand.
3. **Notation/playback** — the pane exists docked-collapsible; decide default state, whether play is
   a first-class transport, and whether it follows the focused neck or a pinned selection.
4. **Shape discovery** — should selecting a shape *preview* (current: replaces the focused grip) or
   *spawn a comparison neck* (like the feeling flow)? This is a flow choice, not a code one.
5. **Morph** — the data view exists; decide if the morph should *spawn the target as a side-by-side
   neck* (the "side-by-side necks" half of the stretch) and whether to invest in the string-by-string
   retune animation.
6. **Curated-tuning surfacing** — all 7 curated tunings + 2 extended-range necks are now selectable.
   Decide how the tuning picker presents the curated set vs standard vs extended range.
7. **Drop-D tonic** — see decision (1) above.

Suggested first move in the morning: open the app, expand the Lab, and exercise each section against
a couple of tunings — that's the fastest way to feel which pieces want to be promoted and where.
