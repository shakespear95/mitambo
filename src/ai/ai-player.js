/**
 * AI controller with difficulty configuration.
 */
import { AI_DEPTH, AI_HUKURA_CHANCE } from '../core/constants.js';
import { findBestMove } from './minimax.js';

// Re-export applyMove for convenience (used by main.js)
export { applyMove } from './apply-move.js';

/**
 * Create an AI player controller.
 */
export function createAIPlayer(player, difficulty) {
  const depth = AI_DEPTH[difficulty] || AI_DEPTH.MEDIUM;
  const hukuraChance = AI_HUKURA_CHANCE[difficulty] || AI_HUKURA_CHANCE.MEDIUM;

  /**
   * Choose the best move for the AI.
   */
  function chooseMove(board) {
    return findBestMove(board, player, depth);
  }

  /**
   * Decide whether to call Hukura on a missed capture.
   */
  function shouldCallHukura() {
    return Math.random() < hukuraChance;
  }

  return Object.freeze({
    player,
    difficulty,
    depth,
    chooseMove,
    shouldCallHukura,
  });
}
