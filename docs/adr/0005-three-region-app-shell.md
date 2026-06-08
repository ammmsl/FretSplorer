# Three-region collapsible app shell

**Status:** accepted (layout proportions pending human testing)

The desktop shell is three regions under a top control bar:

- **Center — the neck stack** (dominant), with the **alphaTab notation/audio pane docked
  at its bottom, collapsible**. Necks are wide (24 frets) and are the central surface, so
  they hold the center; the notation pane is slow-cadence ("show it written") and stays
  collapsible so it never intrudes on the hot interactive loop.
- **Right rail — Readout pinned on top + Conversation below.** These are the two output
  *cadences*: the Readout is the always-live, structured mirror of the focused neck; the
  Conversation is the turn-based MCP dialogue (the "leverage" surface) and gets the bulk
  of the rail.
- **Left — the grammar-card resource, collapsible.** The tuning's cheat sheet (home chord,
  movable shapes, drone map, barre rule, capo behavior).

**Both flanks collapse** so the neck stack can expand to near-full width for pure board
focus, matching the deliberate-exploration ethos.

**Open / deferred:** whether the Conversation should be *more* central/dominant (given how
load-bearing the MCP is to the product thesis) is deliberately left to human testing rather
than decided now. Committing to this overall shape now is what lets us invest incrementally
in each region (e.g. enriching the left panel) without rework.

**Reversal cost:** high — this is the frontend's top-level layout; most components bind to
one of these regions. Recorded so the regions and their rationale are explicit before code.
