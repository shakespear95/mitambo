/**
 * Priority-based AI player for Crazy 8.
 * Uses heuristics rather than minimax (hidden information game).
 */
import { SUITS } from '../core/constants.js';
import { getCurrentPlayer, getTopDiscard } from '../core/state.js';
import { canPlayCard, getPlayableCards } from '../rules/play-validator.js';
import { canCloseWith } from '../rules/close-validator.js';
import { clone } from '../../utils/clone.js';

/**
 * Choose the best card to play from the AI's hand.
 * Returns { card, suitChoice } or null if no playable card.
 *
 * Priority order:
 * 1. If pending pickup: play blocker (prefer Ace > 2/Joker)
 * 2. Play special cards strategically (7/J to skip, 2/Joker to force draw)
 * 3. Match cards preferring the suit AI has most of
 * 4. Save 8s as last resort
 * 5. When declaring suit: pick suit with most cards in hand
 */
export function chooseCard(state) {
  const player = getCurrentPlayer(state);
  const hand = state.hands[player];
  const topDiscard = getTopDiscard(state);

  // Get all playable cards (respecting close rules)
  const playable = getPlayableCards(
    hand, topDiscard, state.declaredSuit,
    state.pendingPickup, state.mustCarryOn, state.carryOnSuit
  ).filter(card => canCloseWith(card, hand.length));

  if (playable.length === 0) return null;

  let chosen = null;

  // Priority 1: Handle pending pickup
  if (state.pendingPickup > 0) {
    chosen = chooseDuringPickup(playable, hand);
  }

  // Priority 2-4: Normal play
  if (!chosen) {
    chosen = chooseNormalPlay(playable, hand, state);
  }

  if (!chosen) {
    chosen = playable[0]; // fallback
  }

  // Determine suit choice if an 8 was played
  const suitChoice = chosen.rank === '8' ? chooseSuit(hand, chosen) : null;

  return { card: chosen, suitChoice };
}

/**
 * During a pending pickup, prefer blockers in this order:
 * 1. Ace (cancels everything)
 * 2. 2 or Joker (stacks more punishment)
 */
function chooseDuringPickup(playable, hand) {
  // Prefer Ace to cancel
  const ace = playable.find(c => c.rank === 'A');
  if (ace) return ace;

  // Stack with 2 or Joker
  const joker = playable.find(c => c.isJoker);
  if (joker) return joker;

  const two = playable.find(c => c.rank === '2');
  if (two) return two;

  return null;
}

/**
 * Normal play strategy.
 */
function chooseNormalPlay(playable, hand, state) {
  const suitCounts = countSuits(hand);

  // Separate 8s from other cards (save 8s for last)
  const nonWild = playable.filter(c => c.rank !== '8' && !c.isJoker);
  const wilds = playable.filter(c => c.rank === '8' || c.isJoker);

  if (nonWild.length > 0) {
    // Try to play offensive specials if opponent has few cards
    const opponentHandSize = getOpponentHandSize(state);

    if (opponentHandSize <= 3) {
      // Play 2 or Joker to force pickup
      const offensive = nonWild.find(c => c.rank === '2');
      if (offensive) return offensive;
    }

    // Play 7 or J to skip/reverse (good in 2-player)
    const skip = nonWild.find(c => c.rank === '7');
    if (skip) return skip;

    const reverse = nonWild.find(c => c.rank === 'J');
    if (reverse) return reverse;

    // Play K (carry-on) if we have follow-up cards in that suit
    const kings = nonWild.filter(c => c.rank === 'K');
    for (const king of kings) {
      const followUps = hand.filter(c =>
        c.id !== king.id && !c.isJoker && c.suit === king.suit
      );
      if (followUps.length > 0) return king;
    }

    // Play normal cards, preferring the suit we have most of
    const normalCards = nonWild.filter(c =>
      !['2', '7', 'J', 'K', 'A'].includes(c.rank)
    );

    if (normalCards.length > 0) {
      return pickBySuitPreference(normalCards, suitCounts);
    }

    // Play remaining specials (A, K without follow-up, etc.)
    return pickBySuitPreference(nonWild, suitCounts);
  }

  // Only wilds left
  if (wilds.length > 0) {
    // Prefer Joker over 8 (Joker forces pickup)
    const joker = wilds.find(c => c.isJoker);
    if (joker) return joker;
    return wilds[0];
  }

  return null;
}

/**
 * Choose the suit to declare when playing an 8.
 * Pick the suit the AI has the most of (excluding the 8 being played).
 */
function chooseSuit(hand, playedCard) {
  const remaining = hand.filter(c => c.id !== playedCard.id && !c.isJoker && c.suit);
  const counts = countSuits(remaining);

  let bestSuit = SUITS[0];
  let bestCount = -1;

  for (const suit of SUITS) {
    if ((counts[suit] || 0) > bestCount) {
      bestCount = counts[suit] || 0;
      bestSuit = suit;
    }
  }

  return bestSuit;
}

/**
 * Pick the card from the suit we have the most of.
 */
function pickBySuitPreference(cards, suitCounts) {
  let best = cards[0];
  let bestScore = -1;

  for (const card of cards) {
    const score = card.suit ? (suitCounts[card.suit] || 0) : 0;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }

  return best;
}

/**
 * Count cards per suit in a hand.
 */
function countSuits(hand) {
  const counts = {};
  for (const card of hand) {
    if (card.suit) {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Get the opponent's hand size.
 */
function getOpponentHandSize(state) {
  const current = getCurrentPlayer(state);
  for (const player of state.players) {
    if (player !== current) {
      return state.hands[player].length;
    }
  }
  return 0;
}

/**
 * Choose a card during carry-on (after K).
 * Returns a card matching the carry-on suit, or null.
 */
export function chooseCarryOnCard(state) {
  const player = getCurrentPlayer(state);
  const hand = state.hands[player];
  const playable = hand.filter(c =>
    canPlayCard(c, getTopDiscard(state), state.declaredSuit, state.pendingPickup, true, state.carryOnSuit)
    && canCloseWith(c, hand.length)
  );

  if (playable.length === 0) return null;

  // Prefer non-special cards for carry-on
  const normal = playable.find(c =>
    !['2', '7', '8', 'J', 'K', 'A'].includes(c.rank) && !c.isJoker
  );
  if (normal) return normal;

  return playable[0];
}

/**
 * Decide whether to play a drawn card immediately.
 * AI always plays if possible.
 */
export function shouldPlayDrawnCard(state) {
  return state.drawnCard !== null;
}
