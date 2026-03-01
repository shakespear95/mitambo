/**
 * King fly-capture - jump enemy at distance, land anywhere beyond.
 * Kings scan diagonals for enemy pieces, then check landing spots beyond.
 */
import { createCaptureMove } from '../core/move.js';
import { getPiece } from '../core/board.js';
import { isValidPosition, getDiagonalDirections } from '../utils/position.js';

/**
 * Get all single-step capture moves for a king at (row, col).
 * The king flies along a diagonal, finds an enemy, and can land on any
 * empty square beyond that enemy.
 */
export function getKingCaptures(board, row, col, alreadyCaptured = []) {
  const piece = getPiece(board, row, col);
  if (piece === null) return [];

  const directions = getDiagonalDirections();
  const captures = [];
  const capturedSet = new Set(alreadyCaptured.map(c => `${c.row},${c.col}`));

  for (const [dRow, dCol] of directions) {
    let r = row + dRow;
    let c = col + dCol;
    let enemyFound = null;

    // Scan along diagonal
    while (isValidPosition(r, c)) {
      const target = getPiece(board, r, c);

      if (target !== null) {
        if (target.player === piece.player) {
          // Friendly piece blocks this diagonal
          break;
        }

        if (capturedSet.has(`${r},${c}`)) {
          // Already captured in this chain - treat as blocking
          break;
        }

        if (enemyFound !== null) {
          // Second enemy on same diagonal - can't jump two
          break;
        }

        // Found an enemy to potentially capture
        enemyFound = { row: r, col: c };
      } else if (enemyFound !== null) {
        // Empty square beyond an enemy - valid landing spot
        captures.push(createCaptureMove(row, col, r, c, enemyFound.row, enemyFound.col));
      }

      r += dRow;
      c += dCol;
    }
  }

  return captures;
}
