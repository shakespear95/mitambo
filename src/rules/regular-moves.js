/**
 * Forward diagonal movement for regular (non-king) pieces.
 * Regular pieces can only move forward diagonally by 1 square.
 */
import { createMove } from '../core/move.js';
import { getPiece } from '../core/board.js';
import { isValidPosition } from '../utils/position.js';
import { getForwardDirections } from '../utils/position.js';

/**
 * Get all legal simple (non-capture) moves for a regular piece at (row, col).
 */
export function getRegularMoves(board, row, col) {
  const piece = getPiece(board, row, col);
  if (piece === null) return [];

  const directions = getForwardDirections(piece.player);
  const moves = [];

  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;

    if (isValidPosition(newRow, newCol) && getPiece(board, newRow, newCol) === null) {
      moves.push(createMove(row, col, newRow, newCol));
    }
  }

  return moves;
}
