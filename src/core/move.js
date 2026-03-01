/**
 * Move representation.
 * A move describes piece movement from one position to another,
 * optionally capturing pieces along the way.
 */
import { deepFreeze } from '../utils/deep-freeze.js';

/**
 * Create a simple move (no capture).
 */
export function createMove(fromRow, fromCol, toRow, toCol) {
  return deepFreeze({
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    captures: [],
    isCapture: false,
    isPromotion: false,
    steps: [{ row: toRow, col: toCol }],
  });
}

/**
 * Create a capture move (single capture).
 */
export function createCaptureMove(fromRow, fromCol, toRow, toCol, capturedRow, capturedCol) {
  return deepFreeze({
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    captures: [{ row: capturedRow, col: capturedCol }],
    isCapture: true,
    isPromotion: false,
    steps: [{ row: toRow, col: toCol }],
  });
}

/**
 * Create a multi-jump capture move (chain of captures).
 */
export function createChainMove(fromRow, fromCol, steps, captures) {
  const lastStep = steps[steps.length - 1];
  return deepFreeze({
    from: { row: fromRow, col: fromCol },
    to: { row: lastStep.row, col: lastStep.col },
    captures: [...captures],
    isCapture: true,
    isPromotion: false,
    steps: [...steps],
  });
}

/**
 * Mark a move as resulting in promotion.
 */
export function withPromotion(move) {
  return deepFreeze({
    ...move,
    isPromotion: true,
  });
}
