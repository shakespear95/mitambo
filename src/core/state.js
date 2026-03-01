/**
 * Immutable GameState factory & updater.
 */
import { PLAYER_1, PLAYER_2, MODE_LOCAL, FSM_STATES, DRAW_MOVE_LIMIT } from './constants.js';
import { createInitialBoard, countPieces } from './board.js';
import { deepFreeze } from '../utils/deep-freeze.js';
import { clone } from '../utils/clone.js';

/**
 * Create a new initial game state.
 */
export function createGameState(mode = MODE_LOCAL, aiDifficulty = null) {
  return deepFreeze({
    board: createInitialBoard(),
    currentPlayer: PLAYER_1,
    selectedPiece: null,       // { row, col } or null
    legalMoves: [],            // Array of Move objects for selected piece
    fsmState: FSM_STATES.MENU,
    mode,
    aiDifficulty,
    scores: { [PLAYER_1]: 0, [PLAYER_2]: 0 },
    movesSinceCapture: 0,
    totalMoves: 0,
    capturedPieces: { [PLAYER_1]: 0, [PLAYER_2]: 0 },
    hukura: {
      active: false,
      missedCaptures: [],
      calledBy: null,
      timerStart: null,
    },
    lastMove: null,
    winner: null,
    drawReason: null,
    isAnimating: false,
    pendingCaptures: [],       // For multi-jump sequences
    captureSequencePosition: null, // Current position during capture chain
  });
}

/**
 * Update game state immutably - returns new state with changes applied.
 */
export function updateState(state, changes) {
  const newState = { ...clone(state), ...changes };
  return deepFreeze(newState);
}

/**
 * Switch to the other player.
 */
export function switchPlayer(state) {
  const nextPlayer = state.currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;
  return updateState(state, {
    currentPlayer: nextPlayer,
    selectedPiece: null,
    legalMoves: [],
  });
}

/**
 * Record a capture in the state.
 */
export function recordCapture(state, capturedPlayer) {
  const capturedPieces = { ...state.capturedPieces };
  capturedPieces[capturedPlayer] = capturedPieces[capturedPlayer] + 1;
  return updateState(state, {
    capturedPieces,
    movesSinceCapture: 0,
  });
}

/**
 * Increment non-capture move counter.
 */
export function incrementMoveCounter(state) {
  return updateState(state, {
    movesSinceCapture: state.movesSinceCapture + 1,
    totalMoves: state.totalMoves + 1,
  });
}

/**
 * Check if draw condition is met (40 moves without capture).
 */
export function isDrawByMoveLimit(state) {
  return state.movesSinceCapture >= DRAW_MOVE_LIMIT;
}

/**
 * Get piece counts for both players.
 */
export function getPieceCounts(state) {
  return {
    [PLAYER_1]: countPieces(state.board, PLAYER_1),
    [PLAYER_2]: countPieces(state.board, PLAYER_2),
  };
}
