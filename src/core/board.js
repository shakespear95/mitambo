/**
 * Board creation and query helpers.
 * Board is an 8x8 2D array where each cell is either null (empty) or a piece object.
 */
import { BOARD_SIZE, PIECES_PER_PLAYER, PLAYER_1, PLAYER_2, EMPTY } from './constants.js';
import { createPiece } from './piece.js';
import { deepFreeze } from '../utils/deep-freeze.js';
import { clone } from '../utils/clone.js';
import { isDarkSquare } from '../utils/position.js';

/**
 * Create a new board with pieces in starting positions.
 * Player 2 (light) at top (rows 0-2), Player 1 (dark) at bottom (rows 5-7).
 */
export function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => EMPTY)
  );

  // Place Player 2 pieces (rows 0-2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isDarkSquare(row, col)) {
        board[row][col] = createPiece(PLAYER_2);
      }
    }
  }

  // Place Player 1 pieces (rows 5-7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isDarkSquare(row, col)) {
        board[row][col] = createPiece(PLAYER_1);
      }
    }
  }

  return deepFreeze(board);
}

/**
 * Get the piece at a given position, or null if empty/out of bounds.
 */
export function getPiece(board, row, col) {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }
  return board[row][col];
}

/**
 * Set a piece at a position, returning a new board.
 */
export function setPiece(board, row, col, piece) {
  const newBoard = clone(board);
  newBoard[row][col] = piece;
  return deepFreeze(newBoard);
}

/**
 * Remove a piece from a position, returning a new board.
 */
export function removePiece(board, row, col) {
  return setPiece(board, row, col, EMPTY);
}

/**
 * Move a piece from one position to another, returning a new board.
 */
export function movePiece(board, fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  let newBoard = clone(board);
  newBoard[fromRow][fromCol] = EMPTY;
  newBoard[toRow][toCol] = piece;
  return deepFreeze(newBoard);
}

/**
 * Get all positions of pieces belonging to a player.
 */
export function getPlayerPieces(board, player) {
  const positions = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece !== null && piece.player === player) {
        positions.push({ row, col, piece });
      }
    }
  }
  return positions;
}

/**
 * Count pieces for a player.
 */
export function countPieces(board, player) {
  let count = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null && board[row][col].player === player) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Check if a position is empty.
 */
export function isEmpty(board, row, col) {
  return getPiece(board, row, col) === null;
}
