/**
 * Forward AND backward diagonal captures for regular pieces.
 * In Zimbabwean Checkers, regular pieces can capture both forward and backward.
 */
import { createCaptureMove } from '../core/move.js';
import { getPiece } from '../core/board.js';
import { isValidPosition, getDiagonalDirections } from '../utils/position.js';

/**
 * Get all single-step capture moves for a regular piece at (row, col).
 * Checks all 4 diagonal directions (both forward and backward).
 */
export function getRegularCaptures(board, row, col, alreadyCaptured = []) {
  const piece = getPiece(board, row, col);
  if (piece === null) return [];

  const directions = getDiagonalDirections();
  const captures = [];
  const capturedSet = new Set(alreadyCaptured.map(c => `${c.row},${c.col}`));

  for (const [dRow, dCol] of directions) {
    const midRow = row + dRow;
    const midCol = col + dCol;
    const landRow = row + 2 * dRow;
    const landCol = col + 2 * dCol;

    if (!isValidPosition(landRow, landCol)) continue;

    const midPiece = getPiece(board, midRow, midCol);
    const landPiece = getPiece(board, landRow, landCol);

    // Mid square must have an enemy piece (not already captured)
    if (midPiece === null || midPiece.player === piece.player) continue;
    if (capturedSet.has(`${midRow},${midCol}`)) continue;

    // Landing square must be empty (or our current position for chain moves)
    if (landPiece !== null && !(landRow === row && landCol === col)) continue;

    captures.push(createCaptureMove(row, col, landRow, landCol, midRow, midCol));
  }

  return captures;
}
