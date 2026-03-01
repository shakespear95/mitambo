/**
 * Play validation for Crazy 8.
 * Determines whether a card can be legally played on the current discard pile.
 */

/**
 * Check if a card can be played on the current top discard.
 *
 * @param {Object} card - The card to play
 * @param {Object} topDiscard - The current top of the discard pile
 * @param {string|null} declaredSuit - Suit declared after an 8 was played
 * @param {number} pendingPickup - Current accumulated pickup penalty
 * @param {boolean} mustCarryOn - Whether player must play a card matching carry-on suit
 * @param {string|null} carryOnSuit - The suit required for carry-on (King's suit)
 * @returns {boolean}
 */
export function canPlayCard(card, topDiscard, declaredSuit, pendingPickup, mustCarryOn, carryOnSuit) {
  // Carry-on mode (after K): must match the K's suit
  if (mustCarryOn) {
    return canPlayDuringCarryOn(card, carryOnSuit);
  }

  // If there's a pending pickup, only certain cards can be played
  if (pendingPickup > 0) {
    return canPlayDuringPickup(card);
  }

  // 8 (wild) plays on anything
  if (card.rank === '8') {
    return true;
  }

  // Joker plays on anything
  if (card.isJoker) {
    return true;
  }

  // If a suit was declared (after 8), match the declared suit
  if (declaredSuit) {
    return card.suit === declaredSuit;
  }

  // If top discard is a Joker, only 8s and Jokers would have been handled above
  // A Joker on top with pending pickup was handled; without pending it shouldn't happen
  // but be safe: match any suit
  if (topDiscard.isJoker) {
    return true;
  }

  // Standard matching: suit or rank
  return card.suit === topDiscard.suit || card.rank === topDiscard.rank;
}

/**
 * During a pending pickup (2 or Joker), only blockers can be played:
 * - 2: adds +2 to the stack (any suit)
 * - Joker: adds +5 to the stack
 * - Ace: cancels the entire stack
 */
function canPlayDuringPickup(card) {
  if (card.rank === 'A') return true;

  if (card.rank === '2') {
    // 2 can block a 2 (match rank) or block a Joker
    return true;
  }

  if (card.isJoker) {
    return true;
  }

  return false;
}

/**
 * During carry-on (after K), player must play a card matching the K's suit.
 * The card effect still applies normally.
 */
function canPlayDuringCarryOn(card, carryOnSuit) {
  if (!carryOnSuit) return false;

  // 8 is wild, always playable
  if (card.rank === '8') return true;

  // Joker is wild
  if (card.isJoker) return true;

  return card.suit === carryOnSuit;
}

/**
 * Get all playable cards from a hand.
 */
export function getPlayableCards(hand, topDiscard, declaredSuit, pendingPickup, mustCarryOn, carryOnSuit) {
  return hand.filter(card =>
    canPlayCard(card, topDiscard, declaredSuit, pendingPickup, mustCarryOn, carryOnSuit)
  );
}

/**
 * Check if a player has any playable card.
 */
export function hasPlayableCard(hand, topDiscard, declaredSuit, pendingPickup, mustCarryOn, carryOnSuit) {
  return hand.some(card =>
    canPlayCard(card, topDiscard, declaredSuit, pendingPickup, mustCarryOn, carryOnSuit)
  );
}
