// /mcp — barrel. The M3 intent-tool + resource layer: the in-process, intent-shaped
// surface the conversational UI calls (this is a STATIC client app — ADR 0008 — so the
// "MCP layer" is in-process, not a server). Every tool returns the uniform ToolResult
// carrying TRUTH + EXPLANATION + REASONING CHAIN with PER-CLAIM TRACES (docs/03; ADR 0003).
//
// Exports: the grounding contract (Trace / Claim / ToolResult + helpers), every intent
// tool, and the resources (+ the ephemeral board model). The grounding harness and the
// conversational UI both bind to this barrel.

// ── The grounding contract (defined ONCE here) ──
export type { Trace, Claim, ToolResult } from './contract';
export {
  HEDGE_WORDS,
  isHedged,
  computedClaim,
  kbClaim,
  editorialClaim,
} from './contract';

// ── Intent tools (docs/04 verbs) ──
export {
  mcpIdentify,
  functionOf,
  neighbors,
  findVoicingsTool,
  translate,
  feelingToOptions,
  adviseSetupTool,
} from './tools';

export type {
  IdentifyTruth,
  FunctionTruth,
  NeighborMove,
  NeighborsTruth,
  FindVoicingsTruth,
  TranslatedNote,
  TranslateTruth,
  FeelingOption,
  FeelingTruth,
  SetupTruth,
} from './tools';

// ── Resources (always-visible context) + the ephemeral board model ──
export {
  grammarCardResource,
  boardResource,
  newBoard,
  addNeck,
  focusNeck,
  setGrip,
} from './resources';

export type {
  Neck,
  NeckCollection,
  GrammarCardResource,
  BoardResource,
} from './resources';
