/**
 * King promotion logic.
 * A piece is promoted when it reaches the opponent's back row.
 */
import { PLAYER_1, PLAYER_2, BOARD_SIZE } from '../core/constants.js';

/**
 * Check if a position is a promotion row for a given player.
 * Player 1 (moves up) promotes at row 0.
 * Player 2 (moves down) promotes at row 7.
 */
export function isPromotionRow(row, player) {
  if (player === PLAYER_1) return row === 0;
  if (player === PLAYER_2) return row === BOARD_SIZE - 1;
  return false;
}

/**
 * Check if a move results in promotion.
 */
export function shouldPromote(move, player) {
  return isPromotionRow(move.to.row, player);
}
