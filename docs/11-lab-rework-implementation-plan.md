# Lab rework — implementation charter

**MODE: build.** Spec the bounds, gate on irreversible/source-touching actions, self-verify,
review async. Execute the plan resolved in the grill-with-docs session and recorded in
**ADR 0013** (dissolve the Lab → glossary homes) and **ADR 0014** (capo as on-neck overlay).
Terminology and the setup-advice framing are already updated in **CONTEXT.md**.

This is pure rearrangement + UI realisation of already-built logic — no engine, no schema, no
new tools. Almost every "new" capability already exists in `/core`, `/projection`, `/mcp`,
`/tension`; the work is *rendering* and *wiring*, plus one rename.

---

## Bounds

- **Authority:** refactor freely within `src/ui`. Move/rename code; delete the surfaces the plan
  retires. Keep `CONTEXT.md` and the ADRs accurate if reality diverges.
- **Defaults:** match surrounding code style; ephemeral state only (no persistence); no new
  dependencies; keep the full suite green (271+ tests). Degree-vs-drone stay separate channels.
- **Stop and ask (do NOT proceed autonomously) if:** a new dependency seems needed; `/core` or
  any engine math must change; the KB card/rule **schema** must change; authored KB content
  would be deleted or edited; or a design decision arises that the plan + ADRs don't cover.
- **Planned deletions (allowed):** `Lab.tsx`, `ShapeDiscovery.tsx`, `MorphView.tsx`,
  `CapoControl.tsx` (the toggle widget) + their tests. Deleting anything else → stop.

---

## Sequence (by dependency, not time)

### Phase 0 — Rename `grip` → `shape` (mechanical; do first so all later code is correct)
- `src/ui/grip.ts` → `shape.ts`; type `Grip` → `Shape`; `emptyGrip`→`emptyShape`,
  `isGripEmpty`→`isShapeEmpty`, `placeFret`/`removeNote`/`cycleNutMarker` keep names.
- `src/ui/shapes.ts`: `shapeToGrip(movableShape, anchor)` → **`realizeShape(movableShape, anchor): Shape`**.
- Sweep identifiers/props: `focusedGrip`→`focusedShape`, `onPreviewGrip`→`onPreviewShape`,
  `pinnedGrip`→`pinnedShape`, `Neck.grip`→`Neck.shape`, etc., across `ui/`, `mcp/`, `projection/`.
- UI copy + a11y: "grip" → "shape"; Readout heading **"What you're holding" → "This shape"**;
  conversation prose ("the focused grip") → "the focused shape".
- Update all touched tests.
- **Verify:** `tsc -b`, `vitest run` green, `eslint .` clean, app boots.

### Phase 1 — Shell invariant (the layout spine everything lands into)
- Remove the `<Lab>` from `AppShell` and the `.lab-region` from the `100vh` flex column.
- Establish the **neck floor**: the neck keeps a usable `min-height`; the left panel, the
  center bottom dock, and the neck stack each **scroll internally** and never resize the neck
  (ADR 0013 invariant). Kill the `min-height:0`-on-the-body crush path.
- **Verify (Playwright):** opening any panel never clips the neck or the conversation input;
  no element overlaps the (now-removed) Lab strip.

### Phase 2 — Disperse the four surfaces

**2a · Grammar card absorbs Shape discovery + drone-map view** (`panels.tsx`)
- Make `card.movableShapes` clickable → `onPreviewShape(realizeShape(shape, anchor))`.
- **Preview-with-restore** in `AppShell`: a transient `previewShape` for the focused neck layered
  over the committed shape; Readout/neck render `previewShape ?? committedShape`. Dismiss
  (restore) on: same shape re-clicked, Escape, or the user starting to place notes. An explicit
  **"keep this shape"** affordance commits `previewShape` into `shapes`.
- Add the **drone-map home-context view**: each open string vs the **tonic**, graded
  `reinforce·consonant·color·bite·unstable` on the neck's 5-level palette. Computed (interval
  class vs tonic) → render for **all** tunings, card-less included. Keep the honest "no authored
  shapes/relational grammar" note only on the shape/frame section for card-less tunings.
- Delete `ShapeDiscovery.tsx` (+ test).

**2b · String tension / setup → bottom dock beside Notation** (`NotationPane` neighbour)
- The center-bottom dock holds two collapsible surfaces (or tabs): **Notation** and **Setup**.
- Reframe the panel as **deviation from standard tuning**: call `adviseSetup` twice with the
  *same* assumed gauges — once for the focused tuning, once for EADGBE — and show per-string
  *looser/tighter* deltas as the headline; absolute lb + comfort band + break-risk flags as
  detail (flags stay absolute).
- Define named default gauge sets, passed as `gauges` (not estimated): electric **Regular Light
  .010–.046**, acoustic **Light .012–.053**; 7/8-string extends the set. Surface every
  assumption ("assumes 25.5″ scale; Regular Light set"). Scale length fixed 25.5″.

**2c · Capo → on-neck overlay + per-neck edit mode** (`Neck.tsx`, `geometry.ts`) — *largest item*
- Render the capo **bar** on the neck at its absolute fret; per-neck **"Capo" pill** toggles
  capo-edit mode (horizontal drag = fret; vertical drag of the bar end = contiguous-from-edge
  span). Emit the `CapoShift` the shell already consumes.
- Realise the three consequences: frets behind the bar **reject shape clicks** + read dead;
  open/ringing marker **relocates to the capo line** per capped string; **drone status**
  colouring relocates to the capo line. Uncapped strings keep nut-anchored treatment.
- Reuse `applyCapo`/`capoShiftFrom` unchanged. Delete `CapoControl.tsx` (+ test).

**2d · Morph → spawn-beside** (`AppShell`, `conversation.ts`, `panels.tsx`)
- `translate()` result spawns a **new neck in the target tuning beside the origin** (reuse the
  `handleSpawnOptions` machinery; keep the origin marked "yours"). Carry the re-placed shape.
- Surface per-pitch landing + "off the neck" detail in the **conversation turn** and as a
  warning on the spawned neck.
- Add the non-conversational trigger: **"+ neck"** offers *same tuning* (today) *or* *morph this
  shape to [tuning]*. Delete `MorphView.tsx` (+ test).

### Phase 3 — Verify (the Definition of Done)
- `tsc -b` clean · `vitest run` green (≥ prior count) · `eslint .` clean.
- **Playwright user-flow pass** (the flows that drove this rework):
  1. Click a movable shape in the card → previews on the focused neck, Readout names it,
     Escape restores the prior shape; "keep" commits it.
  2. Toggle the Capo pill → drag the bar to fret 3 → bar renders, frets 1–2 dead, open/drone
     markers sit on the capo line; partial capo leaves uncapped strings ringing at the nut.
  3. Open Setup in the bottom dock → per-string deltas vs standard render; **the neck does not
     shrink**.
  4. "in DADGAD?" (and "+ neck → morph") → a target-tuning neck spawns beside the origin; off-neck
     pitches reported.
- Confirm the neck-floor invariant holds: no panel open-state clips the neck or conversation.

---

## Out of scope (unchanged this run)
Engine/`core`, naming tiers, KB schema, authored card content, the deferred movable-shape
auto-derivation (R3), and the affective-seed review. The capo *visual* is new; the capo *math*
is not.
