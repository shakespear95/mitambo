/**
 * Tsoro board representation and operations.
 *
 * Each player owns 8 holes in a loop (indices 0-7).
 * The board is stored as { A: [int x8], B: [int x8] }.
 *
 * Grid layout (4x4) for rendering:
 *   Row 0: B7, B6, B5, B4  (B outer, right-to-left)
 *   Row 1: B0, B1, B2, B3  (B inner, left-to-right)
 *   Row 2: A0, A1, A2, A3  (A inner, left-to-right)
 *   Row 3: A7, A6, A5, A4  (A outer, right-to-left)
 */
import { PLAYER_A, PLAYER_B, HOLES_PER_PLAYER, DIRECTION_CW } from './constants.js';
import { deepFreeze } from '../../utils/deep-freeze.js';
import { clone } from '../../utils/clone.js';

/**
 * Create an initial board with given pebbles per hole.
 * Bank holes are NOT cleared here - that happens during setup when banks are chosen.
 */
export function createInitialBoard(pebblesPerHole) {
  return deepFreeze({
    [PLAYER_A]: Array(HOLES_PER_PLAYER).fill(pebblesPerHole),
    [PLAYER_B]: Array(HOLES_PER_PLAYER).fill(pebblesPerHole),
  });
}

/**
 * Get pebble count at a specific hole.
 */
export function getPebbleCount(board, player, holeIndex) {
  return board[player][holeIndex];
}

/**
 * Set pebble count at a specific hole, returning a new board.
 */
export function setPebbleCount(board, player, holeIndex, count) {
  const newBoard = clone(board);
  newBoard[player][holeIndex] = count;
  return deepFreeze(newBoard);
}

/**
 * Add pebbles to a hole, returning a new board.
 */
export function addPebbles(board, player, holeIndex, amount) {
  const current = getPebbleCount(board, player, holeIndex);
  return setPebbleCount(board, player, holeIndex, current + amount);
}

/**
 * Get the bank pebble count for a player.
 */
export function getBankCount(board, player, bankIndex) {
  return board[player][bankIndex];
}

/**
 * Get total pebbles across all of a player's holes.
 */
export function getTotalPebbles(board, player) {
  return board[player].reduce((sum, count) => sum + count, 0);
}

/**
 * Check if all non-bank pebbles are in the bank.
 */
export function allInBank(board, player, bankIndex) {
  for (let i = 0; i < HOLES_PER_PLAYER; i++) {
    if (i !== bankIndex && board[player][i] > 0) {
      return false;
    }
  }
  return true;
}

/**
 * Get the next hole index in the sowing direction.
 * Holes are numbered 0-7 in a loop.
 * CW: 0 -> 1 -> 2 -> ... -> 7 -> 0
 * CCW: 0 -> 7 -> 6 -> ... -> 1 -> 0
 */
export function getNextHole(index, direction) {
  if (direction === DIRECTION_CW) {
    return (index + 1) % HOLES_PER_PLAYER;
  }
  return (index - 1 + HOLES_PER_PLAYER) % HOLES_PER_PLAYER;
}

/**
 * Convert a player's hole index to grid position {row, col}.
 *
 * Layout:
 *   Row 0: B7, B6, B5, B4  (B outer)
 *   Row 1: B0, B1, B2, B3  (B inner)
 *   Row 2: A0, A1, A2, A3  (A inner)
 *   Row 3: A7, A6, A5, A4  (A outer)
 */
export function holeToGrid(player, holeIndex) {
  if (player === PLAYER_B) {
    if (holeIndex <= 3) {
      // B inner row (row 1): B0=col0, B1=col1, B2=col2, B3=col3
      return { row: 1, col: holeIndex };
    }
    // B outer row (row 0): B4=col3, B5=col2, B6=col1, B7=col0
    return { row: 0, col: 7 - holeIndex };
  }

  // Player A
  if (holeIndex <= 3) {
    // A inner row (row 2): A0=col0, A1=col1, A2=col2, A3=col3
    return { row: 2, col: holeIndex };
  }
  // A outer row (row 3): A4=col3, A5=col2, A6=col1, A7=col0
  return { row: 3, col: 7 - holeIndex };
}

/**
 * Convert grid position to {player, holeIndex}.
 */
export function gridToHole(row, col) {
  switch (row) {
    case 0:
      // B outer: col0=B7, col1=B6, col2=B5, col3=B4
      return { player: PLAYER_B, holeIndex: 7 - col };
    case 1:
      // B inner: col0=B0, col1=B1, col2=B2, col3=B3
      return { player: PLAYER_B, holeIndex: col };
    case 2:
      // A inner: col0=A0, col1=A1, col2=A2, col3=A3
      return { player: PLAYER_A, holeIndex: col };
    case 3:
      // A outer: col0=A7, col1=A6, col2=A5, col3=A4
      return { player: PLAYER_A, holeIndex: 7 - col };
    default:
      return null;
  }
}

/**
 * Get all hole indices for a player that belong to the inner row (facing opponent).
 */
export function getInnerRowHoles() {
  return [0, 1, 2, 3];
}

/**
 * Get all hole indices for a player that belong to the outer row.
 */
export function getOuterRowHoles() {
  return [4, 5, 6, 7];
}
