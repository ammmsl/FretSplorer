// /mcp — RESOURCES: always-visible context the conversational UI keeps mounted, NOT
// re-fetched each turn (docs/03-architecture.md "resources vs tools"). Two resources:
//
//   grammarCardResource(tuningId) -> the loaded GrammarCard (the tuning cheat-sheet).
//   boardResource(board)          -> the neck collection + focus pointer.
//
// The board / neck-collection model is owned HERE (the MCP layer): board mutation is
// allowed + low-stakes (docs/03), state is EPHEMERAL (no persistence — ADR 0008 static
// client app). The mutators are pure (return a new collection) so they compose cleanly
// with the UI's ephemeral-state discipline.

import type { GrammarCard } from '../kb';
import { loadGrammarCard } from '../kb';
import type { Grip } from '../ui';

// ─────────────────────────────────────────────────────────────────────────────
// Board / neck-collection model (ephemeral; owned by the MCP layer)
// ─────────────────────────────────────────────────────────────────────────────

/** One neck in the stack: a tuning + an optional held grip. */
export interface Neck {
  readonly id: string;
  readonly label: string;
  readonly tuningId: string;
  /** The grip currently held on this neck (undefined = no grip placed yet). */
  readonly grip?: Grip;
}

/**
 * The board: the multi-neck collection plus a focus pointer + an origin pointer.
 * `focusedId` is the neck the conversation acts on; `originId` is the neck a "translate"
 * morph started from (docs/04 flow 3). Ephemeral — never persisted.
 */
export interface NeckCollection {
  readonly necks: readonly Neck[];
  readonly focusedId: string;
  readonly originId: string;
}

/** The grammar-card resource: the loaded cheat-sheet for a tuning (or null if none). */
export interface GrammarCardResource {
  readonly tuningId: string;
  readonly card: GrammarCard | null;
}

/** The board resource: the neck collection plus the resolved focused + origin necks. */
export interface BoardResource {
  readonly collection: NeckCollection;
  readonly focused: Neck | null;
  readonly origin: Neck | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource accessors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * grammarCardResource — load the always-visible tuning cheat-sheet for a tuning id.
 * Wraps /kb loadGrammarCard; `card` is null when no card exists for the id (only
 * "open-g" exists today). The `card.id` is a valid trace target (a KB id).
 */
export function grammarCardResource(tuningId: string): GrammarCardResource {
  return { tuningId, card: loadGrammarCard(tuningId) };
}

/** boardResource — resolve the focus + origin pointers into the live neck objects. */
export function boardResource(board: NeckCollection): BoardResource {
  const byId = (id: string): Neck | null =>
    board.necks.find((n) => n.id === id) ?? null;
  return {
    collection: board,
    focused: byId(board.focusedId),
    origin: byId(board.originId),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure board mutators (low-stakes, ephemeral; return a NEW collection)
// ─────────────────────────────────────────────────────────────────────────────

/** Seed a collection from a single neck (focus + origin both point at it). */
export function newBoard(neck: Neck): NeckCollection {
  return { necks: [neck], focusedId: neck.id, originId: neck.id };
}

/** Add a neck to the stack (does not move focus). */
export function addNeck(board: NeckCollection, neck: Neck): NeckCollection {
  return { ...board, necks: [...board.necks, neck] };
}

/** Move the focus pointer to an existing neck id (no-op if the id is unknown). */
export function focusNeck(board: NeckCollection, id: string): NeckCollection {
  if (!board.necks.some((n) => n.id === id)) return board;
  return { ...board, focusedId: id };
}

/** Replace the grip held on a neck (returns a new collection). */
export function setGrip(
  board: NeckCollection,
  id: string,
  grip: Grip,
): NeckCollection {
  return {
    ...board,
    necks: board.necks.map((n) => (n.id === id ? { ...n, grip } : n)),
  };
}
