/**
 * Piece factory - creates immutable piece objects.
 */
import { REGULAR, KING } from './constants.js';
import { deepFreeze } from '../utils/deep-freeze.js';

/**
 * Create a new regular piece.
 */
export function createPiece(player) {
  return deepFreeze({
    player,
    type: REGULAR,
  });
}

/**
 * Promote a piece to king, returning a new piece object.
 */
export function promotePiece(piece) {
  if (piece.type === KING) {
    return piece;
  }
  return deepFreeze({
    ...piece,
    type: KING,
  });
}

/**
 * Check if a piece is a king.
 */
export function isKing(piece) {
  return piece !== null && piece.type === KING;
}

/**
 * Check if a piece belongs to a given player.
 */
export function belongsTo(piece, player) {
  return piece !== null && piece.player === player;
}
