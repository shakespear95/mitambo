/**
 * Main render orchestrator for Crazy 8.
 * Coordinates all sub-renderers, manages layout, and provides hit-testing.
 */
import { LAYOUT, CRAZY8_COLORS, HUMAN, AI, CRAZY8_FSM,
         CARD_PLAY_ANIMATION_MS, DRAW_ANIMATION_MS } from '../core/constants.js';
import { getTopDiscard, getCurrentPlayer } from '../core/state.js';
import { drawTable } from './table-renderer.js';
import { drawDrawPile, drawDiscardPile } from './pile-renderer.js';
import { drawPlayerHand, drawAIHand, calculateHandLayout, hitTestHand } from './hand-renderer.js';
import { drawFaceUpCard, drawFaceDownCard } from './card-renderer.js';
import { createAnimationManager, Easing } from '../../rendering/animation.js';

export function createCrazy8Renderer(canvas) {
  const ctx = canvas.getContext('2d');
  const animManager = createAnimationManager();
  let lastPlayerPositions = [];
  let tableCacheCanvas = null;
  let tableCacheDirty = true;

  // Layout cache
  let cachedLayout = null;
  let cachedLayoutW = 0;
  let cachedLayoutH = 0;

  // Floating card animation state
  let floatingCard = null;

  function getCardDimensions() {
    const rawWidth = canvas.width * LAYOUT.CARD_WIDTH_RATIO;
    const cardWidth = Math.min(rawWidth, LAYOUT.MAX_CARD_WIDTH);
    const cardHeight = cardWidth * LAYOUT.CARD_ASPECT;
    return { cardWidth, cardHeight };
  }

  function getLayout() {
    if (cachedLayout && cachedLayoutW === canvas.width && cachedLayoutH === canvas.height) {
      return cachedLayout;
    }
    const { cardWidth, cardHeight } = getCardDimensions();
    const cx = canvas.width / 2;
    cachedLayout = {
      cardWidth,
      cardHeight,
      aiHandCenter: { x: cx, y: canvas.height * LAYOUT.AI_HAND_Y },
      tableCenter: { x: cx, y: canvas.height * LAYOUT.TABLE_CENTER_Y },
      playerHandCenter: { x: cx, y: canvas.height * LAYOUT.PLAYER_HAND_Y },
      drawPilePos: {
        x: cx - cardWidth * 0.5 - canvas.width * LAYOUT.PILE_SPACING / 2,
        y: canvas.height * LAYOUT.TABLE_CENTER_Y - cardHeight / 2,
      },
      discardPilePos: {
        x: cx - cardWidth * 0.5 + canvas.width * LAYOUT.PILE_SPACING / 2,
        y: canvas.height * LAYOUT.TABLE_CENTER_Y - cardHeight / 2,
      },
    };
    cachedLayoutW = canvas.width;
    cachedLayoutH = canvas.height;
    return cachedLayout;
  }

  function cacheTable() {
    if (!tableCacheDirty && tableCacheCanvas &&
        tableCacheCanvas.width === canvas.width && tableCacheCanvas.height === canvas.height) {
      return;
    }
    tableCacheCanvas = document.createElement('canvas');
    tableCacheCanvas.width = canvas.width;
    tableCacheCanvas.height = canvas.height;
    const cacheCtx = tableCacheCanvas.getContext('2d');
    drawTable(cacheCtx, canvas.width, canvas.height);
    tableCacheDirty = false;
  }

  function render(gameState, playableIds, hoveredIndex) {
    const layout = getLayout();
    const { cardWidth, cardHeight } = layout;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Table background (cached)
    cacheTable();
    ctx.drawImage(tableCacheCanvas, 0, 0);

    // AI hand (face-down)
    const aiHand = gameState.hands[AI];
    drawAIHand(ctx, aiHand.length, layout.aiHandCenter.x, layout.aiHandCenter.y,
               cardWidth, cardHeight, canvas.width);

    // Draw pile
    drawDrawPile(ctx, layout.drawPilePos.x, layout.drawPilePos.y,
                 cardWidth, cardHeight, gameState.drawPile.length);

    // Discard pile
    drawDiscardPile(ctx, layout.discardPilePos.x, layout.discardPilePos.y,
                    cardWidth, cardHeight, gameState.discardPile, gameState.declaredSuit);

    // Player hand (face-up) with hover/playable highlighting
    const playerHand = gameState.hands[HUMAN];
    lastPlayerPositions = drawPlayerHand(
      ctx, playerHand, layout.playerHandCenter.x, layout.playerHandCenter.y,
      cardWidth, cardHeight, canvas.width, playableIds || null, hoveredIndex ?? null
    );

    // Draw pile interaction hint
    const current = getCurrentPlayer(gameState);
    if (current === HUMAN && (
      gameState.fsmState === CRAZY8_FSM.PLAYER_TURN ||
      gameState.fsmState === CRAZY8_FSM.CARD_SELECTED ||
      gameState.fsmState === CRAZY8_FSM.CARRY_ON
    )) {
      drawDrawPileHint(ctx, layout.drawPilePos, cardWidth, cardHeight, gameState);
    }

    // Floating card (during animation)
    if (floatingCard) {
      if (floatingCard.faceUp) {
        drawFaceUpCard(ctx, floatingCard.x, floatingCard.y,
                       floatingCard.width, floatingCard.height, floatingCard.card, false);
      } else {
        drawFaceDownCard(ctx, floatingCard.x, floatingCard.y,
                         floatingCard.width, floatingCard.height);
      }
    }

    // Pending pickup indicator
    if (gameState.pendingPickup > 0) {
      drawPickupBadge(ctx, layout.tableCenter.x, layout.tableCenter.y + cardHeight * 0.75,
                      gameState.pendingPickup);
    }
  }

  function drawDrawPileHint(ctx, pos, cardWidth, cardHeight, gameState) {
    const cx = pos.x + cardWidth / 2;
    const cy = pos.y - 8;

    if (gameState.pendingPickup > 0 && mustDrawPickup(gameState)) {
      ctx.fillStyle = '#FF5722';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Pick up ${gameState.pendingPickup}`, cx, cy);
    } else if (gameState.pendingPickup === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Draw', cx, cy);
    }
  }

  function mustDrawPickup(gameState) {
    // Quick check without importing turn-resolver
    const hand = gameState.hands[HUMAN];
    return !hand.some(c => c.rank === 'A' || c.rank === '2' || c.isJoker);
  }

  function drawPickupBadge(ctx, x, y, count) {
    const text = `+${count}`;
    ctx.font = 'bold 15px sans-serif';
    const metrics = ctx.measureText(text);
    const badgeW = metrics.width + 18;
    const badgeH = 24;

    // Pill shape
    ctx.beginPath();
    ctx.arc(x - badgeW / 2 + badgeH / 2, y, badgeH / 2, Math.PI / 2, Math.PI * 1.5);
    ctx.arc(x + badgeW / 2 - badgeH / 2, y, badgeH / 2, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fillStyle = '#D32F2F';
    ctx.fill();
    ctx.strokeStyle = '#B71C1C';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  /**
   * Get the rendered pixel position of a card by its id (from the player's hand).
   * Returns { x, y } or null.
   */
  function getCardPosition(cardId) {
    for (const pos of lastPlayerPositions) {
      if (pos.card.id === cardId) {
        return { x: pos.x, y: pos.y };
      }
    }
    return null;
  }

  /**
   * Hit test a pixel coordinate.
   * Returns { zone, cardIndex, card } or null.
   */
  function hitTest(px, py, selectedIndex) {
    const layout = getLayout();
    const { cardWidth, cardHeight } = layout;

    const handHit = hitTestHand(lastPlayerPositions, px, py, cardWidth, cardHeight, selectedIndex);
    if (handHit) {
      return { zone: 'playerHand', cardIndex: handHit.index, card: handHit.card };
    }

    const dp = layout.drawPilePos;
    if (px >= dp.x && px <= dp.x + cardWidth && py >= dp.y && py <= dp.y + cardHeight) {
      return { zone: 'drawPile' };
    }

    return null;
  }

  function resizeCanvas() {
    const container = canvas.parentElement;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;

    // Use a 3:4 aspect for better horizontal card spread
    const aspect = 3 / 4;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    w = Math.min(w, 900);
    h = Math.min(h, 1200);

    canvas.width = Math.floor(w);
    canvas.height = Math.floor(h);
    tableCacheDirty = true;
    cachedLayout = null;
  }

  /**
   * Animate a card being played from a position to the discard pile.
   */
  function animateCardPlay(card, fromX, fromY) {
    const layout = getLayout();
    const { cardWidth, cardHeight } = layout;

    floatingCard = { card, x: fromX, y: fromY, faceUp: true, width: cardWidth, height: cardHeight };

    return animManager.add({
      from: { x: fromX, y: fromY },
      to: { x: layout.discardPilePos.x, y: layout.discardPilePos.y },
      duration: CARD_PLAY_ANIMATION_MS,
      easing: Easing.easeOutQuad,
      onUpdate(current) {
        if (floatingCard) floatingCard = { ...floatingCard, x: current.x, y: current.y };
      },
      onComplete() { floatingCard = null; },
    });
  }

  /**
   * Animate drawing a card from the draw pile to a target position.
   */
  function animateCardDraw(targetX, targetY, faceUp, card) {
    const layout = getLayout();
    const { cardWidth, cardHeight } = layout;
    const dp = layout.drawPilePos;

    floatingCard = {
      card: card || {},
      x: dp.x, y: dp.y, faceUp, width: cardWidth, height: cardHeight,
    };

    return animManager.add({
      from: { x: dp.x, y: dp.y },
      to: { x: targetX - cardWidth / 2, y: targetY - cardHeight / 2 },
      duration: DRAW_ANIMATION_MS,
      easing: Easing.easeOutQuad,
      onUpdate(current) {
        if (floatingCard) floatingCard = { ...floatingCard, x: current.x, y: current.y };
      },
      onComplete() { floatingCard = null; },
    });
  }

  function updateAnimations(time) {
    return animManager.update(time);
  }

  function isAnimating() {
    return animManager.isAnimating();
  }

  function cancelAnimations() {
    animManager.clear();
    floatingCard = null;
  }

  return Object.freeze({
    render,
    hitTest,
    resizeCanvas,
    getLayout,
    getCardDimensions,
    getCardPosition,
    animateCardPlay,
    animateCardDraw,
    updateAnimations,
    isAnimating,
    cancelAnimations,
  });
}
