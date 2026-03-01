/**
 * Canvas-drawn playing cards with suit symbols and rank text.
 * No images — everything is drawn with Canvas 2D paths.
 */
import { CRAZY8_COLORS, SUIT_SYMBOLS } from '../core/constants.js';

const CORNER_RADIUS = 5;

/**
 * Draw a face-up card at the given position.
 * @param {string} state - 'normal' | 'playable' | 'hovered' | 'dimmed'
 */
export function drawFaceUpCard(ctx, x, y, width, height, card, state) {
  const color = getCardDrawColor(card);
  const cardState = state || 'normal';

  drawCardBase(ctx, x, y, width, height, CRAZY8_COLORS.CARD_FACE, cardState);

  if (card.isJoker) {
    drawJokerFace(ctx, x, y, width, height);
    return;
  }

  const rank = card.rank;
  const suitSymbol = SUIT_SYMBOLS[card.suit] || '';
  const fontSize = Math.max(11, width * 0.24);
  const suitSize = Math.max(9, width * 0.2);

  // Top-left corner: rank + suit
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, x + width * 0.1, y + height * 0.06);
  ctx.font = `${suitSize}px serif`;
  ctx.fillText(suitSymbol, x + width * 0.1, y + height * 0.06 + fontSize * 0.95);

  // Bottom-right corner: rank + suit (rotated)
  ctx.save();
  ctx.translate(x + width * 0.9, y + height * 0.94);
  ctx.rotate(Math.PI);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, 0, 0);
  ctx.font = `${suitSize}px serif`;
  ctx.fillText(suitSymbol, 0, fontSize * 0.95);
  ctx.restore();

  // Center suit symbol (large)
  const centerSize = Math.max(18, width * 0.5);
  ctx.fillStyle = color;
  ctx.font = `${centerSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suitSymbol, x + width / 2, y + height / 2);
}

/**
 * Draw a face-down card at the given position.
 */
export function drawFaceDownCard(ctx, x, y, width, height) {
  drawCardBase(ctx, x, y, width, height, CRAZY8_COLORS.CARD_BACK, 'normal');

  // Inner border pattern
  const inset = width * 0.1;
  ctx.strokeStyle = CRAZY8_COLORS.CARD_BACK_PATTERN;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + inset, y + inset, width - inset * 2, height - inset * 2, CORNER_RADIUS - 1);
  ctx.stroke();

  // Diamond pattern in center
  const cx = x + width / 2;
  const cy = y + height / 2;
  const dw = width * 0.22;
  const dh = height * 0.13;

  ctx.fillStyle = CRAZY8_COLORS.CARD_BACK_PATTERN;
  ctx.beginPath();
  ctx.moveTo(cx, cy - dh);
  ctx.lineTo(cx + dw, cy);
  ctx.lineTo(cx, cy + dh);
  ctx.lineTo(cx - dw, cy);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw the card base (rounded rectangle with shadow and state-based styling).
 */
function drawCardBase(ctx, x, y, width, height, fillColor, cardState) {
  // Shadow — bigger for hovered
  const shadowOffset = cardState === 'hovered' ? 4 : 2;
  const shadowAlpha = cardState === 'hovered' ? 0.45 : 0.25;
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  roundRect(ctx, x + shadowOffset, y + shadowOffset, width, height, CORNER_RADIUS);
  ctx.fill();

  // Card body
  ctx.fillStyle = fillColor;
  roundRect(ctx, x, y, width, height, CORNER_RADIUS);
  ctx.fill();

  // State-based border and effects
  if (cardState === 'playable') {
    // Green glowing border
    ctx.strokeStyle = CRAZY8_COLORS.PLAYABLE_BORDER;
    ctx.lineWidth = 2.5;
    roundRect(ctx, x, y, width, height, CORNER_RADIUS);
    ctx.stroke();
    // Subtle green tint
    ctx.fillStyle = CRAZY8_COLORS.PLAYABLE;
    roundRect(ctx, x, y, width, height, CORNER_RADIUS);
    ctx.fill();
  } else if (cardState === 'hovered') {
    // Bright gold glowing border for hovered playable card
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = CRAZY8_COLORS.HIGHLIGHT_BORDER;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, width, height, CORNER_RADIUS);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    // Light overlay
    ctx.fillStyle = CRAZY8_COLORS.HOVER;
    roundRect(ctx, x, y, width, height, CORNER_RADIUS);
    ctx.fill();
  } else if (cardState === 'dimmed') {
    // Dim non-playable cards slightly
    ctx.strokeStyle = '#BBBBBB';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, CORNER_RADIUS);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    roundRect(ctx, x, y, width, height, CORNER_RADIUS);
    ctx.fill();
  } else {
    // Normal border
    ctx.strokeStyle = CRAZY8_COLORS.CARD_BORDER;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, CORNER_RADIUS);
    ctx.stroke();
  }
}

/**
 * Draw the Joker face.
 */
function drawJokerFace(ctx, x, y, width, height) {
  const fontSize = Math.max(9, width * 0.18);

  ctx.fillStyle = CRAZY8_COLORS.JOKER_PURPLE;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const letters = ['J', 'O', 'K', 'E', 'R'];
  for (let i = 0; i < letters.length; i++) {
    ctx.fillText(letters[i], x + width / 2, y + height * (0.08 + i * 0.12));
  }

  // Star symbol
  const starSize = Math.max(16, width * 0.4);
  ctx.fillStyle = CRAZY8_COLORS.JOKER_GREEN;
  ctx.font = `${starSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2605', x + width / 2, y + height * 0.78);
}

/**
 * Get the draw color for a card (red or black).
 */
function getCardDrawColor(card) {
  if (card.isJoker) return CRAZY8_COLORS.JOKER_PURPLE;
  if (card.suit === 'hearts' || card.suit === 'diamonds') return CRAZY8_COLORS.CARD_RED;
  return CRAZY8_COLORS.CARD_BLACK;
}

/**
 * Draw a rounded rectangle path.
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
