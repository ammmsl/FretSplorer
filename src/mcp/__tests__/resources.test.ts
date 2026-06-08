// /mcp resources tests — the always-visible context + the ephemeral board model.

import { describe, expect, it } from 'vitest';
import {
  addNeck,
  boardResource,
  focusNeck,
  grammarCardResource,
  newBoard,
  setGrip,
} from '../index';
import type { Grip } from '../../ui';

describe('grammarCardResource', () => {
  it('loads the open-g card and returns null for an unknown tuning', () => {
    expect(grammarCardResource('open-g').card?.id).toBe('open-g');
    expect(grammarCardResource('no-such-tuning').card).toBeNull();
  });
});

describe('board / neck-collection model', () => {
  it('seeds, adds, focuses, and sets grips (all ephemeral, immutable)', () => {
    let board = newBoard({ id: 'n1', label: 'A', tuningId: 'open-g' });
    expect(boardResource(board).focused?.id).toBe('n1');
    expect(boardResource(board).origin?.id).toBe('n1');

    board = addNeck(board, { id: 'n2', label: 'B', tuningId: 'eadgbe' });
    expect(board.necks.length).toBe(2);

    board = focusNeck(board, 'n2');
    expect(boardResource(board).focused?.id).toBe('n2');
    // origin stays put (translate morph origin).
    expect(boardResource(board).origin?.id).toBe('n1');

    // unknown focus id is a no-op.
    expect(focusNeck(board, 'nope').focusedId).toBe('n2');

    const grip: Grip = [{ kind: 'open' }];
    board = setGrip(board, 'n2', grip);
    expect(board.necks.find((n) => n.id === 'n2')?.grip).toBe(grip);
  });
});
