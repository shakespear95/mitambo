/**
 * Win condition check for Tsoro.
 * A player wins when ALL their non-bank pebbles are in their bank.
 */
import { allInBank } from '../core/board.js';

/**
 * Check if the given player has won.
 *
 * @param {Object} board - The board state
 * @param {string} player - PLAYER_A or PLAYER_B
 * @param {number} bankIndex - The player's bank hole index
 * @returns {boolean} True if all non-bank holes are empty
 */
export function checkTsoroWinner(board, player, bankIndex) {
  return allInBank(board, player, bankIndex);
}
