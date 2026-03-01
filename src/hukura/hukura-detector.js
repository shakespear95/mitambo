/**
 * Detect missed captures after a move.
 * When a player makes a non-capture move but had captures available,
 * the opponent can call "Hukura!" to penalize them.
 */
import { hasAvailableCaptures } from '../rules/mandatory-capture.js';

/**
 * Check if the player who just moved missed a mandatory capture.
 * This is called BEFORE the move is executed, checking the board state
 * at the time of the move decision.
 *
 * @param {Array} boardBeforeMove - Board state before the move
 * @param {number} player - Player who made the move
 * @param {object} move - The move that was made
 * @returns {boolean} True if captures were available but not taken
 */
export function detectMissedCapture(boardBeforeMove, player, move) {
  if (move.isCapture) return false;
  return hasAvailableCaptures(boardBeforeMove, player);
}
