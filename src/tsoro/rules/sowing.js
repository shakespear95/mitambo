/**
 * Core sowing & chaining logic for Tsoro (pure functions).
 *
 * executeSow: Single sow from a starting hole.
 * executeFullTurn: Loop sowing until outcome is 'bank' or 'empty'.
 *
 * All functions return new board states (immutable).
 */
import { clone } from '../../utils/clone.js';
import { deepFreeze } from '../../utils/deep-freeze.js';
import { getNextHole } from '../core/board.js';
import { HOLES_PER_PLAYER } from '../core/constants.js';

/**
 * Execute a single sow from a starting hole.
 *
 * @param {Object} board - The board state { A: [...], B: [...] }
 * @param {string} player - PLAYER_A or PLAYER_B
 * @param {number} startHole - The hole index to pick up from
 * @param {number} bankIndex - The player's bank hole index
 * @param {string} direction - CW or CCW
 * @returns {{ board, steps, outcome, lastHole }}
 *   - board: new board state after sowing
 *   - steps: array of { type, hole, pebblesInHand, boardSnapshot }
 *   - outcome: 'bank' | 'empty' | 'chain'
 *   - lastHole: the hole index where the last pebble landed
 */
export function executeSow(board, player, startHole, bankIndex, direction) {
  const newBoard = clone(board);
  const steps = [];

  // Pick up all pebbles from startHole
  const pebblesInHand = newBoard[player][startHole];
  if (pebblesInHand === 0) {
    return { board: board, steps: [], outcome: 'empty', lastHole: startHole };
  }
  newBoard[player][startHole] = 0;

  steps.push({
    type: 'pickup',
    hole: startHole,
    pebblesInHand,
    boardSnapshot: deepFreeze(clone(newBoard)),
  });

  // Sow one-by-one
  let currentHole = startHole;
  let remaining = pebblesInHand;

  while (remaining > 0) {
    currentHole = getNextHole(currentHole, direction);
    newBoard[player][currentHole] += 1;
    remaining -= 1;

    steps.push({
      type: 'drop',
      hole: currentHole,
      pebblesInHand: remaining,
      boardSnapshot: deepFreeze(clone(newBoard)),
    });
  }

  // Determine outcome based on where last pebble landed
  const lastHole = currentHole;

  let outcome;
  if (lastHole === bankIndex) {
    outcome = 'bank';
  } else if (newBoard[player][lastHole] === 1) {
    // Only the pebble we just dropped - hole was empty before
    outcome = 'empty';
  } else {
    // Hole had pebbles before - chain continues
    outcome = 'chain';
  }

  return {
    board: deepFreeze(newBoard),
    steps,
    outcome,
    lastHole,
  };
}

/**
 * Execute a full turn: sow repeatedly until outcome is not 'chain'.
 *
 * @param {Object} board - The board state
 * @param {string} player - PLAYER_A or PLAYER_B
 * @param {number} startHole - The initial hole to pick up from
 * @param {number} bankIndex - The player's bank hole index
 * @param {string} direction - CW or CCW
 * @returns {{ finalBoard, allSteps, chainCount, finalOutcome }}
 */
export function executeFullTurn(board, player, startHole, bankIndex, direction) {
  const allSteps = [];
  let currentBoard = board;
  let currentHole = startHole;
  let chainCount = 0;
  let result;
  const maxChains = HOLES_PER_PLAYER * 10; // safety limit

  do {
    result = executeSow(currentBoard, player, currentHole, bankIndex, direction);
    currentBoard = result.board;
    allSteps.push(...result.steps);

    if (result.outcome === 'chain') {
      chainCount += 1;
      currentHole = result.lastHole;

      // Add a chain marker step for animation purposes
      allSteps.push({
        type: 'chain',
        hole: currentHole,
        pebblesInHand: 0,
        boardSnapshot: result.board,
      });

      if (chainCount >= maxChains) {
        break;
      }
    }
  } while (result.outcome === 'chain');

  return {
    finalBoard: currentBoard,
    allSteps,
    chainCount,
    finalOutcome: result.outcome,
  };
}
