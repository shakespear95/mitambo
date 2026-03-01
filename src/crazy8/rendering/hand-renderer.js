/**
 * Hand rendering for Crazy 8.
 * Player hand: fan of face-up cards with hover/playable states.
 * AI hand: stack of face-down cards.
 */
import { drawFaceUpCard, drawFaceDownCard } from './card-renderer.js';
import { LAYOUT } from '../core/constants.js';

/**
 * Calculate card positions for a player's hand (fan layout).
 * Returns array of { x, y, card, index }.
 */
export function calculateHandLayout(hand, centerX, centerY, cardWidth, cardHeight, canvasWidth) {
  const count = hand.length;
  if (count === 0) return [];

  const overlap = cardWidth * LAYOUT.HAND_OVERLAP;
  const totalWidth = cardWidth + (count - 1) * overlap;
  const maxWidth = canvasWidth * 0.88;
  const actualOverlap = totalWidth > maxWidth && count > 1
    ? (maxWidth - cardWidth) / (count - 1)
    : overlap;
  const actualTotalWidth = cardWidth + (count - 1) * actualOverlap;
  const startX = centerX - actualTotalWidth / 2;

  return hand.map((card, index) => ({
    x: startX + index * actualOverlap,
    y: centerY - cardHeight / 2,
    card,
    index,
  }));
}

/**
 * Draw the player's hand (face-up fan).
 * @param {Set|null} playableIds - Set of card IDs that are playable
 * @param {number|null} hoveredIndex - Index of the card under the cursor
 */
export function drawPlayerHand(ctx, hand, centerX, centerY, cardWidth, cardHeight, canvasWidth, playableIds, hoveredIndex) {
  const positions = calculateHandLayout(hand, centerX, centerY, cardWidth, cardHeight, canvasWidth);
  const hasPlayable = playableIds && playableIds.size > 0;

  for (const pos of positions) {
    const isPlayable = playableIds && playableIds.has(pos.card.id);
    const isHovered = hoveredIndex === pos.index;

    // Determine card visual state
    let cardState = 'normal';
    if (isHovered && isPlayable) {
      cardState = 'hovered';
    } else if (isPlayable) {
      cardState = 'playable';
    } else if (hasPlayable) {
      cardState = 'dimmed';
    }

    // Hovered playable cards float up
    const yOffset = (isHovered && isPlayable) ? -cardHeight * 0.12 : 0;

    drawFaceUpCard(ctx, pos.x, pos.y + yOffset, cardWidth, cardHeight, pos.card, cardState);
  }

  return positions;
}

/**
 * Draw the AI's hand (face-down stack).
 */
export function drawAIHand(ctx, count, centerX, centerY, cardWidth, cardHeight, canvasWidth) {
  if (count === 0) return;

  const overlap = cardWidth * LAYOUT.HAND_OVERLAP;
  const totalWidth = cardWidth + (count - 1) * overlap;
  const maxWidth = canvasWidth * 0.88;
  const actualOverlap = totalWidth > maxWidth && count > 1
    ? (maxWidth - cardWidth) / (count - 1)
    : overlap;
  const actualTotalWidth = cardWidth + (count - 1) * actualOverlap;
  const startX = centerX - actualTotalWidth / 2;

  for (let i = 0; i < count; i++) {
    drawFaceDownCard(ctx, startX + i * actualOverlap, centerY - cardHeight / 2, cardWidth, cardHeight);
  }
}

/**
 * Hit test: find which card in the player's hand was clicked.
 * Cards rendered later (higher index) are on top, so test in reverse order.
 * Accounts for the Y offset applied to hovered/selected cards during rendering.
 */
export function hitTestHand(positions, px, py, cardWidth, cardHeight, hoveredIndex) {
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    // Match the render offset: hovered cards float up
    const yOffset = (pos.index === hoveredIndex) ? -cardHeight * 0.12 : 0;
    if (px >= pos.x && px <= pos.x + cardWidth &&
        py >= pos.y + yOffset && py <= pos.y + yOffset + cardHeight) {
      return { index: pos.index, card: pos.card };
    }
  }
  return null;
}
