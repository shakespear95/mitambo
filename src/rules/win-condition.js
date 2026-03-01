/**
 * Win/draw detection for Zimbabwean Checkers.
 */
import { PLAYER_1, PLAYER_2, DRAW_MOVE_LIMIT } from '../core/constants.js';
import { countPieces } from '../core/board.js';
import { getAllMovesForPlayer } from './move-generator.js';

/**
 * Check for a winner. Returns player number or null.
 * Win conditions:
 * - Opponent has no pieces left
 * - Opponent has no legal moves
 */
export function checkWinner(board, currentPlayer) {
  const opponent = currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  // Opponent has no pieces
  if (countPieces(board, opponent) === 0) {
    return currentPlayer;
  }

  // Opponent has no legal moves
  const opponentMoves = getAllMovesForPlayer(board, opponent);
  if (opponentMoves.length === 0) {
    return currentPlayer;
  }

  return null;
}

/**
 * Check for draw conditions.
 * Returns a reason string or null.
 */
export function checkDraw(movesSinceCapture) {
  if (movesSinceCapture >= DRAW_MOVE_LIMIT) {
    return `Draw: ${DRAW_MOVE_LIMIT} moves without a capture`;
  }
  return null;
}
