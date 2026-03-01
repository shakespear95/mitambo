/**
 * Apply a move to the board, returning the new board state.
 * Extracted to its own module to avoid circular dependencies.
 */
import { shouldPromote } from '../rules/promotion.js';
import { promotePiece } from '../core/piece.js';
import { clone } from '../utils/clone.js';
import { deepFreeze } from '../utils/deep-freeze.js';

/**
 * Apply a move to the board, returning the new board state.
 * Handles captures, multi-jumps, and promotions.
 */
export function applyMove(board, move) {
  const newBoard = clone(board);
  const piece = newBoard[move.from.row][move.from.col];

  // Remove piece from origin
  newBoard[move.from.row][move.from.col] = null;

  // Remove captured pieces
  for (const cap of move.captures) {
    newBoard[cap.row][cap.col] = null;
  }

  // Place piece at destination
  let finalPiece = piece;
  if (move.isPromotion || shouldPromote(move, piece.player)) {
    finalPiece = promotePiece(piece);
  }
  newBoard[move.to.row][move.to.col] = finalPiece;

  return deepFreeze(newBoard);
}
