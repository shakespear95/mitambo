/**
 * Special card effect resolution for Crazy 8.
 * Each special card modifies the game state in a specific way.
 */
import { PICKUP_TWO_AMOUNT, PICKUP_JOKER_AMOUNT, DIR_FORWARD, DIR_REVERSE } from '../core/constants.js';
import { updateCrazy8State } from '../core/state.js';

/**
 * Resolve the effect of a played card on the game state.
 * Returns { state, needsSuitChoice, needsCarryOn, skipNext }.
 */
export function resolveCardEffect(state, card) {
  if (card.isJoker) {
    return resolveJoker(state);
  }

  switch (card.rank) {
    case '2': return resolveTwo(state);
    case '7': return resolveSeven(state);
    case '8': return resolveEight(state);
    case 'J': return resolveJack(state);
    case 'K': return resolveKing(state, card);
    case 'A': return resolveAce(state);
    default:  return resolveNormal(state);
  }
}

/**
 * 2 - Next player picks 2 (stacks with existing penalty).
 */
function resolveTwo(state) {
  return {
    state: updateCrazy8State(state, {
      pendingPickup: state.pendingPickup + PICKUP_TWO_AMOUNT,
    }),
    needsSuitChoice: false,
    needsCarryOn: false,
    skipNext: false,
  };
}

/**
 * 7 - Skip the next player.
 * In a 2-player game, the current player goes again.
 */
function resolveSeven(state) {
  return {
    state,
    needsSuitChoice: false,
    needsCarryOn: false,
    skipNext: true,
  };
}

/**
 * 8 - Declare suit for next play. Plays on anything.
 * The suit choice happens in the UI, so we just flag it.
 */
function resolveEight(state) {
  return {
    state,
    needsSuitChoice: true,
    needsCarryOn: false,
    skipNext: false,
  };
}

/**
 * J - Reverse direction. In 2-player game, previous player goes again
 * (same as current player going again).
 */
function resolveJack(state) {
  const newDirection = state.direction === DIR_FORWARD ? DIR_REVERSE : DIR_FORWARD;
  return {
    state: updateCrazy8State(state, { direction: newDirection }),
    needsSuitChoice: false,
    needsCarryOn: false,
    // In a 2-player game, reverse = skip (current player goes again)
    skipNext: state.players.length === 2,
  };
}

/**
 * K - Carry on. Current player must immediately play another card
 * matching the K's suit. If they can't, they draw.
 */
function resolveKing(state, card) {
  return {
    state: updateCrazy8State(state, {
      mustCarryOn: true,
      carryOnSuit: card.suit,
    }),
    needsSuitChoice: false,
    needsCarryOn: true,
    skipNext: false,
  };
}

/**
 * A - Blocks pickup penalties. Cancels the entire pending pickup stack.
 * Can be played on any suit when blocking.
 */
function resolveAce(state) {
  return {
    state: updateCrazy8State(state, {
      pendingPickup: 0,
    }),
    needsSuitChoice: false,
    needsCarryOn: false,
    skipNext: false,
  };
}

/**
 * Joker - Plays on anything. Next player picks 5 (stacks with existing).
 */
function resolveJoker(state) {
  return {
    state: updateCrazy8State(state, {
      pendingPickup: state.pendingPickup + PICKUP_JOKER_AMOUNT,
    }),
    needsSuitChoice: false,
    needsCarryOn: false,
    skipNext: false,
  };
}

/**
 * Normal card (3, 4, 5, 6, 9, 10, Q) - no special effect.
 */
function resolveNormal(state) {
  return {
    state,
    needsSuitChoice: false,
    needsCarryOn: false,
    skipNext: false,
  };
}
