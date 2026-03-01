/**
 * Minimax with alpha-beta pruning.
 */
import { PLAYER_1, PLAYER_2 } from '../core/constants.js';
import { getAllMovesForPlayer } from '../rules/move-generator.js';
import { evaluateBoard } from './evaluator.js';
import { orderMoves } from './move-ordering.js';
import { applyMove } from './apply-move.js';

/**
 * Find the best move using minimax with alpha-beta pruning.
 */
export function findBestMove(board, player, depth) {
  const moves = orderMoves(getAllMovesForPlayer(board, player));

  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of moves) {
    const newBoard = applyMove(board, move);
    const opponent = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    const score = minimax(newBoard, depth - 1, alpha, beta, false, player, opponent);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, score);
  }

  return bestMove;
}

function minimax(board, depth, alpha, beta, isMaximizing, aiPlayer, currentPlayer) {
  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  const moves = orderMoves(getAllMovesForPlayer(board, currentPlayer));

  if (moves.length === 0) {
    // No moves = loss for current player
    return currentPlayer === aiPlayer ? -10000 + depth : 10000 - depth;
  }

  const opponent = currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const score = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer, opponent);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const score = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer, opponent);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}
