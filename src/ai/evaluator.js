/**
 * Board evaluation heuristic for AI.
 * Evaluates board position from a player's perspective.
 */
import { BOARD_SIZE, PLAYER_1, PLAYER_2, KING, REGULAR } from '../core/constants.js';
import { getPlayerPieces } from '../core/board.js';
import { getAllMovesForPlayer } from '../rules/move-generator.js';

// Piece values
const REGULAR_VALUE = 100;
const KING_VALUE = 500;

// Positional bonus weights
const CENTER_BONUS = 10;
const ADVANCEMENT_BONUS = 5;
const BACK_ROW_BONUS = 8;
const MOBILITY_WEIGHT = 2;

/**
 * Evaluate the board from the given player's perspective.
 * Positive = good for player, negative = bad.
 */
export function evaluateBoard(board, player) {
  const opponent = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  const playerScore = evaluateSide(board, player);
  const opponentScore = evaluateSide(board, opponent);

  return playerScore - opponentScore;
}

function evaluateSide(board, player) {
  const pieces = getPlayerPieces(board, player);
  let score = 0;

  if (pieces.length === 0) return -10000;

  for (const { row, col, piece } of pieces) {
    // Material value
    score += piece.type === KING ? KING_VALUE : REGULAR_VALUE;

    // Center control (columns 2-5, rows 2-5 are more valuable)
    if (col >= 2 && col <= 5 && row >= 2 && row <= 5) {
      score += CENTER_BONUS;
    }

    // Advancement bonus (closer to promotion row)
    if (piece.type === REGULAR) {
      const advancement = player === PLAYER_1
        ? (BOARD_SIZE - 1 - row) // P1 moves up
        : row;                     // P2 moves down
      score += advancement * ADVANCEMENT_BONUS;
    }

    // Back row protection (guards against opponent kings)
    if ((player === PLAYER_1 && row === BOARD_SIZE - 1) ||
        (player === PLAYER_2 && row === 0)) {
      score += BACK_ROW_BONUS;
    }
  }

  // Mobility (number of legal moves)
  try {
    const moves = getAllMovesForPlayer(board, player);
    score += moves.length * MOBILITY_WEIGHT;
  } catch {
    // If move generation fails, skip mobility
  }

  return score;
}
