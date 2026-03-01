/**
 * King movement - bishop-style sliding along diagonals.
 * Kings can move any number of squares diagonally.
 */
import { createMove } from '../core/move.js';
import { getPiece } from '../core/board.js';
import { isValidPosition, getDiagonalDirections } from '../utils/position.js';

/**
 * Get all legal simple (non-capture) moves for a king at (row, col).
 */
export function getKingMoves(board, row, col) {
  const piece = getPiece(board, row, col);
  if (piece === null) return [];

  const directions = getDiagonalDirections();
  const moves = [];

  for (const [dRow, dCol] of directions) {
    let r = row + dRow;
    let c = col + dCol;

    // Slide along diagonal until hitting something or edge
    while (isValidPosition(r, c) && getPiece(board, r, c) === null) {
      moves.push(createMove(row, col, r, c));
      r += dRow;
      c += dCol;
    }
  }

  return moves;
}
