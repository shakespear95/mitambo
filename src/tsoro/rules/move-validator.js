/**
 * Valid hole selection for Tsoro.
 */
import { HOLES_PER_PLAYER } from '../core/constants.js';

/**
 * Get all valid holes the current player can pick from.
 * A valid hole is any non-bank hole with at least 1 pebble.
 *
 * @param {Object} board - The board state
 * @param {string} player - PLAYER_A or PLAYER_B
 * @param {number} bankIndex - The player's bank hole index
 * @returns {number[]} Array of valid hole indices
 */
export function getValidHoles(board, player, bankIndex) {
  const valid = [];

  for (let i = 0; i < HOLES_PER_PLAYER; i++) {
    if (i !== bankIndex && board[player][i] > 0) {
      valid.push(i);
    }
  }

  return valid;
}

/**
 * Check if a specific hole is a valid pick.
 */
export function isValidHole(board, player, bankIndex, holeIndex) {
  return holeIndex !== bankIndex && board[player][holeIndex] > 0;
}
