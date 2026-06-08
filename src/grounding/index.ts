// /grounding — barrel. The R9 grounding eval harness: the load-bearing honesty
// mechanism (docs/06 R9; ADR 0003 "the testable grounding contract"). It turns the
// grounding ASPIRATION ("no checkable claim originates in the model's head") into a
// MEASURABLE pass/fail over real tool outputs.
//
// Two pure functions:
//   collectKbIds()  — the registry a trace may LEGALLY point at: every valid KB id,
//                     gathered from loadRules() / loadGrammarCard() / loadAffective()
//                     / the sources map (ADR 0003 step 1: every KB entry has a stable id).
//   checkGrounding(result, kbIds) — validate one ToolResult's per-claim traces against
//                     the contract: every checkable claim is "computed" or a valid KB id;
//                     editorial claims are hedged; an untraceable assertion = FAIL.
//
// Pure: collectKbIds reads the (already-bundled) KB via the /kb loaders; checkGrounding
// is a pure predicate over a ToolResult + the id set. Neither touches the hot loop.

export {
  collectKbIds,
  collectEditorialKbIds,
  checkGrounding,
} from './harness';

export type {
  GroundingReport,
  Violation,
  ViolationKind,
  KbIdRegistry,
} from './harness';
