/**
 * Top-level legal move generation.
 * Coordinates all move types and enforces mandatory capture rule.
 */
import { getPlayerPieces, getPiece } from '../core/board.js';
import { isKing } from '../core/piece.js';
import { getRegularMoves } from './regular-moves.js';
import { getKingMoves } from './king-moves.js';
import { findCaptureChains } from './capture-chain.js';
import { hasAvailableCaptures } from './mandatory-capture.js';
import { withPromotion } from '../core/move.js';
import { shouldPromote } from './promotion.js';

/**
 * Get all legal moves for a specific piece.
 * Enforces mandatory capture: if any piece of this player can capture,
 * only capture moves are returned.
 */
export function getLegalMoves(board, row, col) {
  const piece = getPiece(board, row, col);
  if (piece === null) return [];

  const player = piece.player;
  const mustCapture = hasAvailableCaptures(board, player);

  // Get capture chains for this piece
  const captureChains = findCaptureChains(board, row, col);

  if (mustCapture) {
    // Only return captures when mandatory
    return captureChains.map(move => markPromotions(move, player));
  }

  // No captures available - return simple moves
  const simpleMoves = isKing(piece)
    ? getKingMoves(board, row, col)
    : getRegularMoves(board, row, col);

  return simpleMoves.map(move => markPromotions(move, player));
}

/**
 * Get all legal moves for a player (across all their pieces).
 */
export function getAllMovesForPlayer(board, player) {
  const pieces = getPlayerPieces(board, player);
  const allMoves = [];

  for (const { row, col } of pieces) {
    const moves = getLegalMoves(board, row, col);
    allMoves.push(...moves);
  }

  return allMoves;
}

/**
 * Get pieces that have legal moves for a player.
 */
export function getMovablePieces(board, player) {
  const pieces = getPlayerPieces(board, player);
  return pieces.filter(({ row, col }) => {
    const moves = getLegalMoves(board, row, col);
    return moves.length > 0;
  });
}

/**
 * Mark promotion on a move if applicable.
 */
function markPromotions(move, player) {
  if (shouldPromote(move, player)) {
    return withPromotion(move);
  }
  return move;
}
