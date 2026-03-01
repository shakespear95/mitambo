/**
 * Immutable Tsoro game state factory & updater.
 */
import { PLAYER_A, PLAYER_B, TSORO_FSM_STATES } from './constants.js';
import { createInitialBoard } from './board.js';
import { deepFreeze } from '../../utils/deep-freeze.js';
import { clone } from '../../utils/clone.js';

/**
 * Create a new initial Tsoro game state.
 */
export function createTsoroState(pebblesPerHole = 2) {
  return deepFreeze({
    board: createInitialBoard(pebblesPerHole),
    pebblesPerHole,
    currentPlayer: PLAYER_A,
    fsmState: TSORO_FSM_STATES.SETUP_PEBBLES,

    // Setup configuration
    setup: {
      bankA: null,        // hole index chosen as A's bank
      bankB: null,        // hole index chosen as B's bank
      directionA: null,   // CW or CCW
      directionB: null,   // CW or CCW
    },

    // Game state
    selectedHole: null,     // { player, holeIndex } or null
    validHoles: [],         // array of hole indices the current player can pick
    sowingSteps: [],        // animation step queue
    turnCount: 0,
    lastSowingResult: null, // { finalBoard, allSteps, chainCount }

    // Winner
    winner: null,           // PLAYER_A or PLAYER_B or null
  });
}

/**
 * Update Tsoro state immutably.
 */
export function updateTsoroState(state, changes) {
  const newState = { ...clone(state), ...changes };
  return deepFreeze(newState);
}

/**
 * Switch to the other player.
 */
export function switchTsoroPlayer(state) {
  const nextPlayer = state.currentPlayer === PLAYER_A ? PLAYER_B : PLAYER_A;
  return updateTsoroState(state, {
    currentPlayer: nextPlayer,
    selectedHole: null,
    validHoles: [],
    sowingSteps: [],
    lastSowingResult: null,
  });
}
