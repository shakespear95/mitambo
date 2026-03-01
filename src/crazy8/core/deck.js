/**
 * Deck operations for Crazy 8: create, shuffle, draw, reshuffle.
 * Uses slice-based immutability instead of structuredClone for performance.
 */
import { createFullDeck } from './card.js';

/**
 * Fisher-Yates shuffle (returns new array).
 */
export function shuffle(cards) {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Create a shuffled 54-card deck.
 */
export function createShuffledDeck() {
  return shuffle(createFullDeck());
}

/**
 * Deal cards from the top of the draw pile.
 * Returns { dealt, remaining } — both new arrays.
 */
export function dealCards(drawPile, count) {
  return {
    dealt: drawPile.slice(0, count),
    remaining: drawPile.slice(count),
  };
}

/**
 * Draw a single card from the top of the draw pile.
 * If the draw pile is empty, reshuffles the discard pile (keeping the top card).
 * Returns { card, drawPile, discardPile }.
 */
export function drawCard(drawPile, discardPile) {
  let draw = drawPile;
  let discard = discardPile;

  if (draw.length === 0) {
    const reshuffled = reshuffleDiscard(discard);
    draw = reshuffled.drawPile;
    discard = reshuffled.discardPile;
  }

  if (draw.length === 0) {
    return { card: null, drawPile: draw, discardPile: discard };
  }

  return {
    card: draw[0],
    drawPile: draw.slice(1),
    discardPile: discard,
  };
}

/**
 * Reshuffle the discard pile into the draw pile, keeping the top discard card.
 * Returns { drawPile, discardPile }.
 */
export function reshuffleDiscard(discardPile) {
  if (discardPile.length <= 1) {
    return { drawPile: [], discardPile: [...discardPile] };
  }

  const topCard = discardPile[0];
  const reshuffled = shuffle(discardPile.slice(1));
  return { drawPile: reshuffled, discardPile: [topCard] };
}

/**
 * Draw multiple cards from the pile (for pickup penalties).
 * Returns { cards, drawPile, discardPile }.
 */
export function drawMultiple(drawPile, discardPile, count) {
  let draw = drawPile;
  let discard = discardPile;
  const cards = [];

  for (let i = 0; i < count; i++) {
    const result = drawCard(draw, discard);
    if (result.card === null) break;
    cards.push(result.card);
    draw = result.drawPile;
    discard = result.discardPile;
  }

  return { cards, drawPile: draw, discardPile: discard };
}
