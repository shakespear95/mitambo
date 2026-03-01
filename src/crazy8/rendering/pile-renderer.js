/**
 * Draw pile and discard pile rendering for Crazy 8.
 */
import { drawFaceDownCard, drawFaceUpCard } from './card-renderer.js';
import { CRAZY8_COLORS, SUIT_SYMBOLS } from '../core/constants.js';

/**
 * Draw the draw pile (stack of face-down cards).
 */
export function drawDrawPile(ctx, x, y, cardWidth, cardHeight, pileSize) {
  if (pileSize === 0) {
    // Empty pile placeholder
    drawEmptyPile(ctx, x, y, cardWidth, cardHeight, 'Draw');
    return;
  }

  // Draw a stack effect (offset cards underneath)
  const stackCount = Math.min(pileSize, 3);
  for (let i = stackCount - 1; i >= 0; i--) {
    drawFaceDownCard(ctx, x - i * 1.5, y - i * 1.5, cardWidth, cardHeight);
  }

  // Card count label
  drawPileCount(ctx, x + cardWidth / 2, y + cardHeight + 12, pileSize);
}

/**
 * Draw the discard pile (top card face-up, slight fan).
 */
export function drawDiscardPile(ctx, x, y, cardWidth, cardHeight, discardPile, declaredSuit) {
  if (discardPile.length === 0) {
    drawEmptyPile(ctx, x, y, cardWidth, cardHeight, 'Discard');
    return;
  }

  // Show previous card slightly offset if pile has > 1
  if (discardPile.length > 1) {
    const prevCard = discardPile[1];
    drawFaceUpCard(ctx, x - 2, y - 2, cardWidth, cardHeight, prevCard, 'normal');
  }

  // Top card
  const topCard = discardPile[0];
  drawFaceUpCard(ctx, x, y, cardWidth, cardHeight, topCard, 'normal');

  // Show declared suit indicator if active
  if (declaredSuit) {
    drawDeclaredSuit(ctx, x + cardWidth + 8, y + cardHeight / 2, declaredSuit);
  }
}

/**
 * Draw an empty pile placeholder.
 */
function drawEmptyPile(ctx, x, y, width, height, label) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  ctx.beginPath();
  const r = 4;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + width / 2, y + height / 2);
}

/**
 * Draw pile card count.
 */
function drawPileCount(ctx, x, y, count) {
  ctx.fillStyle = CRAZY8_COLORS.DRAW_PILE_LABEL;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${count}`, x, y);
}

/**
 * Draw the declared suit indicator (after an 8 is played).
 */
function drawDeclaredSuit(ctx, x, y, suit) {
  const symbol = SUIT_SYMBOLS[suit] || '';
  const color = (suit === 'hearts' || suit === 'diamonds')
    ? CRAZY8_COLORS.CARD_RED
    : CRAZY8_COLORS.CARD_BLACK;

  const radius = 18;

  // Glow
  ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
  ctx.shadowBlur = 8;

  // Background circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = CRAZY8_COLORS.HIGHLIGHT_BORDER;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Suit symbol
  ctx.fillStyle = color;
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, x, y + 1);
}
