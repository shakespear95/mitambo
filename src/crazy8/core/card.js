/**
 * Card data model and helpers for Crazy 8.
 */
import { SUITS, RANKS, SUIT_COLORS } from './constants.js';
import { deepFreeze } from '../../utils/deep-freeze.js';

/**
 * Create a standard playing card.
 */
export function createCard(suit, rank) {
  return deepFreeze({
    suit,
    rank,
    isJoker: false,
    id: `${suit}-${rank}`,
  });
}

/**
 * Create a Joker card.
 */
export function createJoker(index) {
  return deepFreeze({
    suit: null,
    rank: null,
    isJoker: true,
    id: `joker-${index}`,
  });
}

/**
 * Get the display color of a card ('red' or 'black').
 * Jokers alternate purple/green but we return 'red' for index 0, 'black' for index 1.
 */
export function getCardColor(card) {
  if (card.isJoker) return 'black';
  return SUIT_COLORS[card.suit] || 'black';
}

/**
 * Check if two cards are the same by id.
 */
export function isSameCard(a, b) {
  return a.id === b.id;
}

/**
 * Get display rank text.
 */
export function getRankDisplay(card) {
  if (card.isJoker) return 'JOKER';
  return card.rank;
}

/**
 * Get display suit symbol.
 */
export function getSuitDisplay(card) {
  if (card.isJoker) return '\u2605'; // star
  const symbols = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
  return symbols[card.suit] || '';
}

/**
 * Create the full 54-card deck (52 standard + 2 Jokers).
 */
export function createFullDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(createCard(suit, rank));
    }
  }
  cards.push(createJoker(0));
  cards.push(createJoker(1));
  return cards;
}
