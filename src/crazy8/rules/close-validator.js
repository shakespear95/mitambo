/**
 * Closing rules for Crazy 8.
 * Determines whether a player can win with a specific card.
 */
import { CLOSING_RANKS } from '../core/constants.js';

/**
 * Check if a card is a valid closing card (can be the last card played to win).
 * Only ranks 3, 4, 5, 6, 9, 10, Q can be used to close.
 */
export function isClosingCard(card) {
  if (card.isJoker) return false;
  return CLOSING_RANKS.includes(card.rank);
}

/**
 * Check if a player can close (win) with this card given their hand.
 * Returns true if:
 *   - This would be their last card AND it's a valid closing rank
 *   - They still have cards remaining after playing (not closing yet)
 */
export function canCloseWith(card, handSize) {
  // If playing this card would leave 0 cards (last card)
  if (handSize === 1) {
    return isClosingCard(card);
  }
  // Not the last card, so not closing — always allowed
  return true;
}
