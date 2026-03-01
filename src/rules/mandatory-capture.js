/**
 * Detect available captures - used for mandatory capture enforcement.
 * In Zimbabwean Checkers, captures are mandatory when available.
 */
import { getPlayerPieces, getPiece } from '../core/board.js';
import { isKing } from '../core/piece.js';
import { getRegularCaptures } from './regular-captures.js';
import { getKingCaptures } from './king-captures.js';
import { findCaptureChains } from './capture-chain.js';

/**
 * Check if a player has any available captures.
 */
export function hasAvailableCaptures(board, player) {
  const pieces = getPlayerPieces(board, player);

  for (const { row, col, piece } of pieces) {
    const getCapturesFn = isKing(piece) ? getKingCaptures : getRegularCaptures;
    const captures = getCapturesFn(board, row, col);
    if (captures.length > 0) return true;
  }

  return false;
}

/**
 * Get all capture moves available for a player.
 * Returns capture chains (multi-jump sequences).
 */
export function getAllCaptures(board, player) {
  const pieces = getPlayerPieces(board, player);
  const allCaptures = [];

  for (const { row, col } of pieces) {
    const chains = findCaptureChains(board, row, col);
    allCaptures.push(...chains);
  }

  return allCaptures;
}

/**
 * Check if a specific piece has captures available.
 */
export function pieceHasCaptures(board, row, col) {
  const piece = getPiece(board, row, col);
  if (piece === null) return false;

  const getCapturesFn = isKing(piece) ? getKingCaptures : getRegularCaptures;
  return getCapturesFn(board, row, col).length > 0;
}
