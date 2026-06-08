# Overnight Build Charter — surface the built layer + author content

**MODE: build (bounded autonomy).** This charter authorises an unattended run to close the
*breadth* gaps in the feature-coverage matrix (`07-build-sequencing.html`). It is a **charter,
not a path**: it states outcomes, bounds, and stop-conditions — not step-by-step instructions.
Self-verify continuously; leave everything for async review.

The governing insight (from the coverage matrix): **almost nothing is structurally absent.**
The gaps are (1) built logic with no UI surface, and (2) unauthored tuning cards. Both are
autonomy-safe — schema-frozen content and wiring against stable contracts. The one thing that
is *not* safe, and is deliberately out of scope, is **deciding where things go and how the flow
works** — that stays for an interactive session.

---

## Definition of Done

The app demonstrates every V1 feature at least once, against **more than one tuning**, with:

- Grammar cards authored + verified for the curated tuning set, so relational naming (the
  differentiator) fires in **every curated tuning**, not just Open-G.
- 7- and 8-string necks rendering correctly.
- Capo, string-tension, morph/translate, notation, and shape-discovery each **reachable** —
  via a control or a conversation route — even if their final placement is provisional.
- The full test suite green, `tsc -b` and `eslint .` clean.
- A `BUILD-LOG.md` recording what landed, what hit a stop-condition, and what needs human
  judgement in the morning.

"Reachable, not placed" is the whole point: bring every component to a mounted, functional,
flow-agnostic state so the morning's information-architecture work is pure rearrangement.

---

## Authority — may do without asking

- Create new UI components, MCP routes, fixtures, KB grammar-card YAML, and tests.
- Edit `geometry.ts`, the conversation router, `AppShell`, the panels, and fixtures.
- Mount new components in a **clearly-labelled provisional area** (a "lab" section or behind a
  dev toggle) rather than integrating them into the final layout.
- Commit per work item on a dedicated branch. Run the test/type/lint gates freely.

## Defaults — decisions already made (do not re-litigate)

- **Curated tuning set** = Open G ✓, Open D, DADGAD, Drop D, Open C, Open E, double-drop D
  (docs/02). Standard EADGBE deliberately gets **no** card — absolute (T2) naming is the
  correct behaviour there; leave it as a handoff fall-through.
- **Card schema is frozen** (ADR 0001 / `kb/schema/card.schema.json`). Author *within* it.
- **Capo** = a per-string `CapoShift` vector applied via the existing `applyCapo()`; tonic
  preserved (it's a pedagogical anchor) — see `core/tuning.ts`.
- **Extended range** = derive string count + neck height from `tuning.openStrings.length`;
  never hardcode 6.
- **alphaTab** loads lazily on first use, mirroring the Tier-3 Pyodide pattern (never in the
  hot loop). Default soundfont is fine (ADR 0012).
- Provisional placement is expected and acceptable. Visual polish is **not** a goal tonight.

## Stop-conditions — halt that item, log it, continue the others

Halt and leave for review (do **not** improvise) on any of:

- A change that would **restructure the shell layout** or decide final placement / flow
  choreography. Mount provisionally instead.
- Any edit to an **ADR, a KB schema, or a `/core` type contract.**
- **Affective-dictionary content** edits (taste call).
- **Handoff-threshold tuning** (needs a grip corpus that does not exist — cannot be done).
- **Movable-shape auto-derivation** (R3 — deferred algorithm; render hand-authored shapes only).
- Adding **persistence / sessions** (out of scope, docs/02).
- A grammar card that **cannot be made to pass the grounding harness** — author what you can,
  flag the rest; never weaken the harness to make a card pass.
- The **test suite cannot be kept green** by honest means. Never skip/delete a test or relax
  the grounding contract to go green.

---

## Work items (flow-agnostic; each ships with tests + its own commit)

Ordered so the highest-leverage / most-unblocking work lands first.

1. **Author the 6 missing grammar cards** — Open D, DADGAD, Drop D, Open C, Open E,
   double-drop D. Schema-valid; each verified `ok:true` through the grounding harness; confirm
   relational naming fires in the readout for each. *Unblocks "limits of implementation"
   visibility — do this first.*
2. **Extended-range geometry + fixtures** — derive `stringCount`/`neckHeight` from the tuning;
   add a 7-string and an 8-string fixture. 6-string output must be byte-for-byte unchanged;
   update geometry tests.
3. **GrammarCardPanel renders the card** — replace the placeholder with the real
   `grammarCardResource` (home chord, drone map, barre rule, capo behaviour, movable shapes);
   graceful note for uncarded tunings.
4. **Capo control** — a self-contained component emitting a `CapoShift`; `AppShell` applies
   `applyCapo` to the focused neck so overlay + readout re-project. Support partial capo
   (a span subset). Provisional mount.
5. **Route the 3 unrouted MCP tools** in the conversation router — `neighbors`
   ("where can this go"), `translate` ("…in DADGAD?" / morph), `adviseSetupTool`
   ("will this feel floppy?"). Render grounded traces exactly like the existing intents.
6. **Tension panel** — a self-contained component over `adviseSetup` for the focused tuning
   (per-string tension, floppy/break/fine flags, gauge recommendation). Provisional mount.
7. **Mount alphaTab in NotationPane** — lazy-load adapter + soundfont; render the focused
   grip/context; a play control. Provisional.
8. **Shape-discovery view** — render the focused card's hand-authored `movableShapes` as
   selectable grips that preview on the neck. Provisional. (Auto-derivation stays deferred.)
9. **Morph view (stretch)** — if 1–8 land cleanly, an animated string-by-string retune over
   `translate()`, side-by-side necks. Skip without penalty if the timebox is tight.

## Explicitly out of scope tonight

Final information architecture & placement · flow choreography · affective-content review ·
handoff-threshold calibration · movable-shape auto-derivation · persistence · visual polish ·
any ADR/schema/core-contract change.

---

## Verification protocol (run continuously, not just at the end)

- `npm test` green at every commit — new code adds tests; **never** skip or delete one.
- `tsc -b` clean · `eslint .` clean.
- Every new grammar card passes the grounding harness (`ok:true`).
- The M0 invariant still holds: switch a neck's tuning → overlay re-projects.

## Review artifacts to leave behind

- **`BUILD-LOG.md`** — per work item: landed / partial / skipped + why; every stop-condition
  hit and the decision it needs; test count before→after.
- Branch with one commit per work item (easy to cherry-pick or revert — *make-wrong-cheap*).
- A short "morning agenda": the placement/flow decisions now unblocked by having the pieces
  mounted provisionally.

## Timebox

Single overnight run. **Satisfice**: items 1–8 done-enough and verified beats item 9 polished.
If blocked on one item, log it and move to the next — never burn the night on one stuck thing.
