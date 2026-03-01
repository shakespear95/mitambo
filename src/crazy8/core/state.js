/**
 * Immutable Crazy 8 game state factory & updaters.
 *
 * Performance: Uses shallow spread + Object.freeze instead of deep clone + deepFreeze.
 * Since all nested values (hands, piles) are replaced wholesale when modified,
 * and card objects are already frozen at creation, shallow freezing is sufficient.
 */
import { HUMAN, AI, CRAZY8_FSM, DIR_FORWARD, DEAL_COUNT } from './constants.js';
import { createShuffledDeck, dealCards } from './deck.js';
import { deepFreeze } from '../../utils/deep-freeze.js';

/**
 * Create the initial game state with dealt hands.
 */
export function createCrazy8State() {
  const deck = createShuffledDeck();

  const deal1 = dealCards(deck, DEAL_COUNT);
  const deal2 = dealCards(deal1.remaining, DEAL_COUNT);

  const startCard = deal2.remaining[0];
  const drawPile = deal2.remaining.slice(1);
  const discardPile = [startCard];

  return deepFreeze({
    players: [HUMAN, AI],
    currentPlayerIndex: 0,
    direction: DIR_FORWARD,
    hands: {
      [HUMAN]: deal1.dealt,
      [AI]: deal2.dealt,
    },
    drawPile,
    discardPile,
    pendingPickup: 0,
    mustCarryOn: false,
    carryOnSuit: null,
    declaredSuit: null,
    lastCall: null,
    drawnCard: null,
    fsmState: CRAZY8_FSM.DEALING,
    winner: null,
    turnCount: 0,
  });
}

/**
 * Immutable state update — shallow spread with freeze.
 * Avoids expensive structuredClone on every update.
 */
export function updateCrazy8State(state, changes) {
  return Object.freeze({ ...state, ...changes });
}

/**
 * Get the current player id.
 */
export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

/**
 * Get the next player index, respecting direction.
 */
export function getNextPlayerIndex(state) {
  const count = state.players.length;
  return ((state.currentPlayerIndex + state.direction) % count + count) % count;
}

/**
 * Advance to the next player.
 */
export function advancePlayer(state) {
  return updateCrazy8State(state, {
    currentPlayerIndex: getNextPlayerIndex(state),
  });
}

/**
 * Get the top card of the discard pile.
 */
export function getTopDiscard(state) {
  return state.discardPile.length > 0 ? state.discardPile[0] : null;
}

/**
 * Add a card to a player's hand (returns updated state).
 */
export function addToHand(state, player, card) {
  const newHand = [...state.hands[player], card];
  const newHands = { ...state.hands, [player]: newHand };
  return updateCrazy8State(state, { hands: newHands });
}

/**
 * Remove a card from a player's hand by id (returns updated state).
 */
export function removeFromHand(state, player, cardId) {
  const hand = state.hands[player];
  const index = hand.findIndex(c => c.id === cardId);
  if (index === -1) return state;
  const newHand = [...hand.slice(0, index), ...hand.slice(index + 1)];
  const newHands = { ...state.hands, [player]: newHand };
  return updateCrazy8State(state, { hands: newHands });
}

/**
 * Play a card to the discard pile (removes from hand, adds to top of discard).
 */
export function playCardToDiscard(state, player, card) {
  const hand = state.hands[player];
  const index = hand.findIndex(c => c.id === card.id);
  const newHand = index === -1 ? hand : [...hand.slice(0, index), ...hand.slice(index + 1)];
  const newHands = { ...state.hands, [player]: newHand };
  const newDiscard = [card, ...state.discardPile];
  return updateCrazy8State(state, {
    hands: newHands,
    discardPile: newDiscard,
    declaredSuit: null,
  });
}

/**
 * Get the call status based on hand size.
 */
export function getCallStatus(handSize) {
  if (handSize === 2) return 'halfCard';
  if (handSize === 1) return 'card';
  if (handSize === 0) return 'inAir';
  return null;
}
