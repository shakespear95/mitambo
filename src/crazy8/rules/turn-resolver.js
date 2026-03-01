/**
 * Full turn orchestration for Crazy 8.
 * Coordinates play validation, card effects, drawing, and turn advancement.
 */
import { CRAZY8_FSM, AI } from '../core/constants.js';
import {
  updateCrazy8State, getCurrentPlayer, advancePlayer,
  getTopDiscard, playCardToDiscard, addToHand,
  getCallStatus,
} from '../core/state.js';
import { drawCard, drawMultiple } from '../core/deck.js';
import { canPlayCard, getPlayableCards, hasPlayableCard } from './play-validator.js';
import { canCloseWith } from './close-validator.js';
import { resolveCardEffect } from './special-cards.js';

/**
 * Attempt to play a card from the current player's hand.
 * Returns { state, valid, needsSuitChoice, needsCarryOn, skipNext } or { valid: false }.
 */
export function playCard(state, cardId) {
  const player = getCurrentPlayer(state);
  const hand = state.hands[player];
  const card = hand.find(c => c.id === cardId);

  if (!card) return { state, valid: false };

  const topDiscard = getTopDiscard(state);

  // Check if the card can be played
  if (!canPlayCard(card, topDiscard, state.declaredSuit, state.pendingPickup, state.mustCarryOn, state.carryOnSuit)) {
    return { state, valid: false };
  }

  // Check closing rules - if this is the last card, it must be a valid closer
  if (!canCloseWith(card, hand.length)) {
    return { state, valid: false };
  }

  // Play the card
  let newState = playCardToDiscard(state, player, card);

  // Clear carry-on state (card was played, satisfying carry-on requirement)
  newState = updateCrazy8State(newState, {
    mustCarryOn: false,
    carryOnSuit: null,
  });

  // Resolve card effects
  const effect = resolveCardEffect(newState, card);
  newState = effect.state;

  // Update call status
  const newHandSize = newState.hands[player].length;
  const callStatus = getCallStatus(newHandSize);
  newState = updateCrazy8State(newState, { lastCall: callStatus });

  // Check for win
  if (newHandSize === 0) {
    newState = updateCrazy8State(newState, {
      fsmState: CRAZY8_FSM.GAME_OVER,
      winner: player,
    });
    return { state: newState, valid: true, needsSuitChoice: false, needsCarryOn: false, skipNext: false };
  }

  return {
    state: newState,
    valid: true,
    needsSuitChoice: effect.needsSuitChoice,
    needsCarryOn: effect.needsCarryOn,
    skipNext: effect.skipNext,
  };
}

/**
 * Declare a suit after playing an 8.
 */
export function declareSuit(state, suit) {
  return updateCrazy8State(state, {
    declaredSuit: suit,
  });
}

/**
 * Handle the carry-on draw (player couldn't play a matching card after K).
 */
export function handleCarryOnDraw(state) {
  const player = getCurrentPlayer(state);
  const result = drawCard(state.drawPile, state.discardPile);

  if (!result.card) {
    // No cards left, just clear carry-on
    return updateCrazy8State(state, {
      mustCarryOn: false,
      carryOnSuit: null,
      drawPile: result.drawPile,
      discardPile: result.discardPile,
    });
  }

  let newState = updateCrazy8State(state, {
    drawPile: result.drawPile,
    discardPile: result.discardPile,
    mustCarryOn: false,
    carryOnSuit: null,
  });
  newState = addToHand(newState, player, result.card);

  return newState;
}

/**
 * Draw a card for the current player (normal draw when they can't play).
 * Returns the updated state with the drawn card stored for play-immediately option.
 */
export function drawForPlayer(state) {
  const player = getCurrentPlayer(state);
  const result = drawCard(state.drawPile, state.discardPile);

  if (!result.card) {
    // No cards available at all
    return updateCrazy8State(state, {
      drawPile: result.drawPile,
      discardPile: result.discardPile,
      drawnCard: null,
      fsmState: CRAZY8_FSM.TURN_COMPLETE,
    });
  }

  let newState = updateCrazy8State(state, {
    drawPile: result.drawPile,
    discardPile: result.discardPile,
  });
  newState = addToHand(newState, player, result.card);

  // Check if the drawn card can be played immediately
  const topDiscard = getTopDiscard(newState);
  const canPlay = canPlayCard(result.card, topDiscard, newState.declaredSuit, newState.pendingPickup, false, null);

  if (canPlay && canCloseWith(result.card, newState.hands[player].length)) {
    return updateCrazy8State(newState, {
      drawnCard: result.card,
      fsmState: CRAZY8_FSM.DRAWN_PLAY_OPTION,
    });
  }

  // Can't play drawn card, turn ends
  return updateCrazy8State(newState, {
    drawnCard: null,
    fsmState: CRAZY8_FSM.TURN_COMPLETE,
  });
}

/**
 * Apply pending pickup penalty to the current player.
 * Called when a player can't block a 2/Joker.
 */
export function applyPickupPenalty(state) {
  const player = getCurrentPlayer(state);
  const count = state.pendingPickup;

  if (count === 0) return state;

  const result = drawMultiple(state.drawPile, state.discardPile, count);

  let newState = updateCrazy8State(state, {
    drawPile: result.drawPile,
    discardPile: result.discardPile,
    pendingPickup: 0,
  });

  // Add all drawn cards to hand
  const newHand = [...newState.hands[player], ...result.cards];
  const newHands = { ...newState.hands, [player]: newHand };
  newState = updateCrazy8State(newState, { hands: newHands });

  return newState;
}

/**
 * Complete the current turn and advance to the next player.
 * Handles skip logic for 7s and Jacks.
 */
export function completeTurn(state, skipNext) {
  let newState = updateCrazy8State(state, {
    drawnCard: null,
    turnCount: state.turnCount + 1,
  });

  // Advance player
  newState = advancePlayer(newState);

  // If skip, advance again
  if (skipNext) {
    newState = advancePlayer(newState);
  }

  const nextPlayer = getCurrentPlayer(newState);
  const nextFsm = nextPlayer === AI
    ? CRAZY8_FSM.AI_THINKING
    : CRAZY8_FSM.PLAYER_TURN;

  return updateCrazy8State(newState, { fsmState: nextFsm });
}

/**
 * Check if the current player must pick up (pending pickup with no blockers).
 */
export function mustPickUp(state) {
  if (state.pendingPickup === 0) return false;

  const player = getCurrentPlayer(state);
  const hand = state.hands[player];
  const topDiscard = getTopDiscard(state);

  return !hasPlayableCard(hand, topDiscard, state.declaredSuit, state.pendingPickup, false, null);
}

/**
 * Get the full set of playable cards for the current player.
 */
export function getPlayerPlayableCards(state) {
  const player = getCurrentPlayer(state);
  const hand = state.hands[player];
  const topDiscard = getTopDiscard(state);

  const playable = getPlayableCards(
    hand, topDiscard, state.declaredSuit,
    state.pendingPickup, state.mustCarryOn, state.carryOnSuit
  );

  // Filter out cards that can't close (last card must be a valid closer)
  return playable.filter(card => canCloseWith(card, hand.length));
}
