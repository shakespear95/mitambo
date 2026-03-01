/**
 * Multi-jump path building.
 * Recursively finds all possible capture chains from a position.
 */
import { getRegularCaptures } from './regular-captures.js';
import { getKingCaptures } from './king-captures.js';
import { getPiece, movePiece } from '../core/board.js';
import { isKing } from '../core/piece.js';
import { createChainMove } from '../core/move.js';

/**
 * Find all possible capture chains from a position.
 * Returns an array of chain moves (each with all steps and captured pieces).
 */
export function findCaptureChains(board, row, col) {
  const piece = getPiece(board, row, col);
  if (piece === null) return [];

  const chains = [];
  buildChains(board, row, col, piece, [], [], row, col, chains);
  return chains;
}

function buildChains(board, startRow, startCol, piece, steps, captured, currentRow, currentCol, results) {
  const getCapturesFn = isKing(piece) ? getKingCaptures : getRegularCaptures;
  const singleCaptures = getCapturesFn(board, currentRow, currentCol, captured);

  if (singleCaptures.length === 0) {
    // No more captures - save chain if we have at least one capture
    if (steps.length > 0) {
      results.push(createChainMove(startRow, startCol, steps, captured));
    }
    return;
  }

  for (const capture of singleCaptures) {
    const newSteps = [...steps, { row: capture.to.row, col: capture.to.col }];
    const newCaptured = [...captured, ...capture.captures];

    // Move piece on a temporary board for next jump calculation
    const tempBoard = movePiece(board, currentRow, currentCol, capture.to.row, capture.to.col);

    buildChains(
      tempBoard,
      startRow,
      startCol,
      piece,
      newSteps,
      newCaptured,
      capture.to.row,
      capture.to.col,
      results
    );
  }
}

/**
 * Get the longest capture chains (by number of captures).
 * In some checkers variants, you must take the longest chain.
 * For Zimbabwean Checkers, any capture chain is valid, but all captures
 * in a chosen chain must be completed.
 */
export function getLongestChains(chains) {
  if (chains.length === 0) return [];

  const maxCaptures = Math.max(...chains.map(c => c.captures.length));
  return chains.filter(c => c.captures.length === maxCaptures);
}
