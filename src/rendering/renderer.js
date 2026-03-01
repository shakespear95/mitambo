/**
 * Main render loop orchestrator.
 * Coordinates all rendering subsystems.
 */
import { BOARD_SIZE, CANVAS_PADDING } from '../core/constants.js';
import { drawBoard } from './board-renderer.js';
import { drawPieces, drawPiece } from './piece-renderer.js';
import { drawSelectedHighlight, drawMoveHighlights, drawMovablePieceHints } from './highlight-renderer.js';
import { createAnimationManager, Easing } from './animation.js';
import { createEffectsManager } from './effects.js';
import { PIECE_RADIUS_RATIO, ANIMATION_DURATION_MS } from '../core/constants.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const animationManager = createAnimationManager();
  const effects = createEffectsManager();

  let boardCacheCanvas = null;
  let boardCacheDirty = true;
  let lastCellSize = 0;
  let lastOffsetX = 0;
  let lastOffsetY = 0;

  // Animated piece state: map of "row,col" → { x, y, piece }
  const animatedPieces = new Map();

  function calculateLayout() {
    const padding = CANVAS_PADDING;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2 - 30; // Extra space for labels
    const cellSize = Math.floor(Math.min(availableWidth, availableHeight) / BOARD_SIZE);
    const boardPixelSize = cellSize * BOARD_SIZE;
    const offsetX = Math.floor((canvas.width - boardPixelSize) / 2);
    const offsetY = Math.floor((canvas.height - boardPixelSize) / 2);

    if (cellSize !== lastCellSize) {
      boardCacheDirty = true;
      lastCellSize = cellSize;
      lastOffsetX = offsetX;
      lastOffsetY = offsetY;
    }

    return { cellSize, offsetX, offsetY };
  }

  function cacheBoardBackground(cellSize, offsetX, offsetY) {
    if (!boardCacheDirty && boardCacheCanvas) return;

    boardCacheCanvas = document.createElement('canvas');
    boardCacheCanvas.width = canvas.width;
    boardCacheCanvas.height = canvas.height;
    const cacheCtx = boardCacheCanvas.getContext('2d');

    drawBoard(cacheCtx, cellSize, offsetX, offsetY);
    boardCacheDirty = false;
  }

  function render(gameState) {
    const { cellSize, offsetX, offsetY } = calculateLayout();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#2C1810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cached board
    cacheBoardBackground(cellSize, offsetX, offsetY);
    ctx.drawImage(boardCacheCanvas, 0, 0);

    // Highlights
    if (gameState.selectedPiece) {
      drawSelectedHighlight(
        ctx,
        gameState.selectedPiece.row,
        gameState.selectedPiece.col,
        cellSize,
        offsetX,
        offsetY
      );
      drawMoveHighlights(ctx, gameState.legalMoves, cellSize, offsetX, offsetY);
    }

    // Draw pieces (skip animated ones)
    const animatingKeys = animatedPieces.size > 0 ? animatedPieces : null;
    drawPieces(ctx, gameState.board, cellSize, offsetX, offsetY, animatingKeys);

    // Draw animated pieces at their interpolated positions
    for (const [, animState] of animatedPieces) {
      const radius = cellSize * PIECE_RADIUS_RATIO;
      drawPiece(ctx, animState.x, animState.y, radius, animState.piece);
    }

    // Draw effects
    effects.update(ctx);
  }

  function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight, 800);
    canvas.width = size;
    canvas.height = size;
    boardCacheDirty = true;
  }

  /**
   * Animate a piece moving from one board position to another.
   */
  function animateMove(fromRow, fromCol, toRow, toCol, piece) {
    const { cellSize, offsetX, offsetY } = calculateLayout();
    const key = `${fromRow},${fromCol}`;

    const fromX = offsetX + fromCol * cellSize + cellSize / 2;
    const fromY = offsetY + fromRow * cellSize + cellSize / 2;
    const toX = offsetX + toCol * cellSize + cellSize / 2;
    const toY = offsetY + toRow * cellSize + cellSize / 2;

    animatedPieces.set(key, { x: fromX, y: fromY, piece });

    return animationManager.add({
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY },
      duration: ANIMATION_DURATION_MS,
      easing: Easing.easeOutQuad,
      onUpdate: (current) => {
        animatedPieces.set(key, { x: current.x, y: current.y, piece });
      },
      onComplete: () => {
        animatedPieces.delete(key);
      },
    });
  }

  /**
   * Spawn capture visual effect at board position.
   */
  function spawnCaptureEffect(row, col, color) {
    const { cellSize, offsetX, offsetY } = calculateLayout();
    const x = offsetX + col * cellSize + cellSize / 2;
    const y = offsetY + row * cellSize + cellSize / 2;
    effects.spawnCaptureEffect(x, y, color);
  }

  /**
   * Spawn promotion visual effect.
   */
  function spawnPromotionEffect(row, col) {
    const { cellSize, offsetX, offsetY } = calculateLayout();
    const x = offsetX + col * cellSize + cellSize / 2;
    const y = offsetY + row * cellSize + cellSize / 2;
    effects.spawnPromotionEffect(x, y);
  }

  /**
   * Convert pixel coordinates to board position.
   */
  function pixelToBoard(pixelX, pixelY) {
    const { cellSize, offsetX, offsetY } = calculateLayout();
    const col = Math.floor((pixelX - offsetX) / cellSize);
    const row = Math.floor((pixelY - offsetY) / cellSize);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return null;
    }

    return { row, col };
  }

  return {
    render,
    resizeCanvas,
    animateMove,
    spawnCaptureEffect,
    spawnPromotionEffect,
    pixelToBoard,
    calculateLayout,
    isAnimating: () => animationManager.isAnimating(),
    updateAnimations: (time) => animationManager.update(time),
    hasEffects: () => effects.hasActiveEffects(),
  };
}
