/**
 * Main Tsoro render orchestrator.
 * Coordinates board, hole, pebble, hand overlay, and highlight rendering.
 */
import { GRID_ROWS, GRID_COLS, TSORO_CANVAS_PADDING, TSORO_COLORS, HOLE_RADIUS_RATIO,
         SOWING_ANIMATION_MS, CHAIN_PAUSE_MS, HAND_MOVE_MS, HAND_DIP_MS,
         TSORO_FSM_STATES } from '../core/constants.js';
import { holeToGrid, gridToHole } from '../core/board.js';
import { createAnimationManager, Easing } from '../../rendering/animation.js';
import { drawTsoroBoard } from './board-renderer.js';
import { drawAllHoles } from './hole-renderer.js';
import { drawAllPebbles } from './pebble-renderer.js';
import { drawValidHoleHighlights, drawSelectedHoleHighlight, drawBankSetupHighlight } from './highlight-renderer.js';
import { drawHand } from './hand-renderer.js';

/**
 * Convert a player + hole index to pixel centre coordinates.
 */
function holeToPixel(player, holeIndex, cellSize, offsetX, offsetY) {
  const grid = holeToGrid(player, holeIndex);
  return {
    x: offsetX + grid.col * cellSize + cellSize / 2,
    y: offsetY + grid.row * cellSize + cellSize / 2,
  };
}

export function createTsoroRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let boardCacheCanvas = null;
  let boardCacheDirty = true;
  let lastCellSize = 0;
  let currentTime = 0;
  let cancelSowing = null;

  // Hand animation state (null when no hand visible)
  let handState = null;
  // Flash overlay state for chain highlights (rendered inside render())
  let flashState = null; // { player, holeIndex, alpha }
  // Last gameState for re-rendering during hand tweens
  let lastGameState = null;

  function calculateLayout() {
    const padding = TSORO_CANVAS_PADDING;
    const availableWidth = canvas.width - padding * 2;
    const availableHeight = canvas.height - padding * 2 - 50; // space for labels
    const cellSize = Math.floor(Math.min(availableWidth / GRID_COLS, availableHeight / GRID_ROWS));
    const boardWidth = cellSize * GRID_COLS;
    const boardHeight = cellSize * GRID_ROWS;
    const offsetX = Math.floor((canvas.width - boardWidth) / 2);
    const offsetY = Math.floor((canvas.height - boardHeight) / 2);

    if (cellSize !== lastCellSize) {
      boardCacheDirty = true;
      lastCellSize = cellSize;
    }

    return { cellSize, offsetX, offsetY, boardWidth, boardHeight };
  }

  function cacheBoardBackground(cellSize, offsetX, offsetY) {
    const dimensionsMismatch = boardCacheCanvas &&
      (boardCacheCanvas.width !== canvas.width || boardCacheCanvas.height !== canvas.height);
    if (!boardCacheDirty && boardCacheCanvas && !dimensionsMismatch) return;

    boardCacheCanvas = document.createElement('canvas');
    boardCacheCanvas.width = canvas.width;
    boardCacheCanvas.height = canvas.height;
    const cacheCtx = boardCacheCanvas.getContext('2d');

    drawTsoroBoard(cacheCtx, cellSize, offsetX, offsetY);
    boardCacheDirty = false;
  }

  function render(gameState) {
    lastGameState = gameState;
    const { cellSize, offsetX, offsetY } = calculateLayout();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#1a0f0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cached board surface
    cacheBoardBackground(cellSize, offsetX, offsetY);
    ctx.drawImage(boardCacheCanvas, 0, 0);

    // Draw all holes
    const bankA = gameState.setup.bankA;
    const bankB = gameState.setup.bankB;
    drawAllHoles(ctx, cellSize, offsetX, offsetY, bankA, bankB, holeToGrid);

    // Draw highlights based on FSM state
    const fsmState = gameState.fsmState;

    if (fsmState === TSORO_FSM_STATES.SETUP_BANK_A) {
      drawBankSetupHighlight(ctx, 'A', [0, 1, 2, 3, 4, 5, 6, 7], cellSize, offsetX, offsetY, currentTime);
    } else if (fsmState === TSORO_FSM_STATES.SETUP_BANK_B) {
      drawBankSetupHighlight(ctx, 'B', [0, 1, 2, 3, 4, 5, 6, 7], cellSize, offsetX, offsetY, currentTime);
    } else if (fsmState === TSORO_FSM_STATES.WAITING_FOR_PICK) {
      if (gameState.validHoles.length > 0) {
        drawValidHoleHighlights(ctx, gameState.validHoles, gameState.currentPlayer, cellSize, offsetX, offsetY);
      }
    }

    // Draw selected hole highlight
    if (gameState.selectedHole) {
      drawSelectedHoleHighlight(ctx, gameState.selectedHole.player, gameState.selectedHole.holeIndex, cellSize, offsetX, offsetY);
    }

    // Draw pebbles
    drawAllPebbles(ctx, gameState.board, cellSize, offsetX, offsetY);

    // Draw flash overlay on a hole (chain highlight)
    if (flashState && flashState.alpha > 0) {
      const fGrid = holeToGrid(flashState.player, flashState.holeIndex);
      const fcx = offsetX + fGrid.col * cellSize + cellSize / 2;
      const fcy = offsetY + fGrid.row * cellSize + cellSize / 2;
      const fRadius = cellSize * HOLE_RADIUS_RATIO;
      ctx.beginPath();
      ctx.arc(fcx, fcy, fRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashState.alpha * 0.35})`;
      ctx.fill();
    }

    // Draw hand overlay (during sowing animation)
    if (handState && handState.opacity > 0) {
      const dipOffset = handState.dip * cellSize * 0.25;
      const handY = handState.y - cellSize * 0.35 + dipOffset;
      drawHand(ctx, handState.x, handY, handState.shape, handState.pebblesInHand, handState.opacity, cellSize);
    }
  }

  function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight, 800);
    canvas.width = size;
    canvas.height = size;
    boardCacheDirty = true;
  }

  /**
   * Convert pixel coordinates to grid position { row, col }.
   */
  function pixelToBoard(pixelX, pixelY) {
    const { cellSize, offsetX, offsetY } = calculateLayout();
    const col = Math.floor((pixelX - offsetX) / cellSize);
    const row = Math.floor((pixelY - offsetY) / cellSize);

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return null;
    }

    return { row, col };
  }

  /**
   * Animate sowing steps with a moving hand.
   *
   * The hand tweens between holes, dips down to pick up / drop pebbles,
   * and shows a counter badge with the number of pebbles in hand.
   *
   * @param {Array} steps - Array of { type, hole, pebblesInHand, boardSnapshot }
   * @param {string} player - The player who is sowing
   * @param {Function} onStepRender - Callback to update board state per step
   * @returns {Promise} Resolves when animation is complete
   */
  function animateSowing(steps, player, onStepRender) {
    if (cancelSowing) {
      cancelSowing();
    }

    return new Promise(resolve => {
      let cancelled = false;
      let rafId = null;
      const pendingTimeouts = [];
      const animManager = createAnimationManager();

      function stopLoop() {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      cancelSowing = () => {
        cancelled = true;
        stopLoop();
        for (const id of pendingTimeouts) clearTimeout(id);
        pendingTimeouts.length = 0;
        animManager.clear();
        handState = null;
        flashState = null;
        resolve();
      };

      // --- tween helpers ---

      /** Tween one or more handState properties. */
      function tweenHand(props, duration, easing = Easing.easeOutQuad) {
        if (cancelled || !handState) return Promise.resolve();
        const from = {};
        const to = {};
        for (const key of Object.keys(props)) {
          from[key] = handState[key];
          to[key] = props[key];
        }
        return animManager.add({
          from,
          to,
          duration,
          easing,
          onUpdate(current) {
            if (handState !== null) {
              handState = { ...handState, ...current };
            }
          },
        });
      }

      /** Simple delay promise with cleanup on cancel. */
      function wait(ms) {
        return new Promise(r => {
          const id = setTimeout(() => {
            const idx = pendingTimeouts.indexOf(id);
            if (idx !== -1) pendingTimeouts.splice(idx, 1);
            r();
          }, ms);
          pendingTimeouts.push(id);
        });
      }

      // --- render loop that runs during the animation ---

      function startLoop() {
        function loop(time) {
          if (cancelled) return;
          animManager.update(time);
          if (lastGameState) {
            render(lastGameState);
          }
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
      }

      // --- main sequence ---

      async function run() {
        const { cellSize, offsetX, offsetY } = calculateLayout();
        startLoop();

        for (let i = 0; i < steps.length; i++) {
          if (cancelled) return;

          const step = steps[i];
          const pos = holeToPixel(player, step.hole, cellSize, offsetX, offsetY);

          if (step.type === 'pickup') {
            if (!handState || handState.opacity === 0) {
              // First appearance — place hand above hole and fade in
              handState = {
                x: pos.x,
                y: pos.y,
                dip: 0,
                pebblesInHand: 0,
                opacity: 0,
                shape: 'open',
              };
              await tweenHand({ opacity: 1 }, 150, Easing.easeOutQuad);
            } else {
              // Chain pickup — hand is already at the hole
              handState = { ...handState, shape: 'open' };
            }

            // Dip down to reach into the hole
            await tweenHand({ dip: 1 }, HAND_DIP_MS, Easing.easeInQuad);

            // Apply the pickup (board update removes pebbles from hole)
            onStepRender(step);
            handState = {
              ...handState,
              pebblesInHand: step.pebblesInHand,
              shape: 'closed',
            };

            // Rise up with pebbles
            await tweenHand({ dip: 0 }, HAND_DIP_MS, Easing.easeOutQuad);

          } else if (step.type === 'drop') {
            // Glide to the target hole
            await tweenHand({ x: pos.x, y: pos.y }, HAND_MOVE_MS, Easing.easeInOutQuad);

            // Dip down to drop a pebble
            await tweenHand({ dip: 1 }, HAND_DIP_MS, Easing.easeInQuad);

            // Apply the drop (board update adds pebble to hole)
            onStepRender(step);
            handState = { ...handState, pebblesInHand: step.pebblesInHand };

            if (step.pebblesInHand === 0) {
              handState = { ...handState, shape: 'open' };
            }

            // Rise up
            await tweenHand({ dip: 0 }, HAND_DIP_MS, Easing.easeOutQuad);

            // Brief pause so player can register the drop
            await wait(SOWING_ANIMATION_MS * 0.4);

          } else if (step.type === 'chain') {
            // Chain marker — flash the hole and pause
            onStepRender(step);
            flashState = { player, holeIndex: step.hole, alpha: 1 };
            await tweenHand({ opacity: handState.opacity }, CHAIN_PAUSE_MS * 0.5);
            flashState = { ...flashState, alpha: 0 };
            await wait(CHAIN_PAUSE_MS * 0.5);
          }
        }

        // Fade out the hand
        if (!cancelled && handState) {
          await tweenHand({ opacity: 0 }, 200, Easing.easeInQuad);
          handState = null;
        }

        stopLoop();
        cancelSowing = null;
        resolve();
      }

      run();
    });
  }

  /**
   * Update animation time for pulsing effects.
   */
  function updateTime(time) {
    currentTime = time;
  }

  return Object.freeze({
    render,
    resizeCanvas,
    pixelToBoard,
    calculateLayout,
    animateSowing,
    cancelAnimations() {
      if (cancelSowing) {
        cancelSowing();
      }
    },
    updateTime,
    invalidateCache() {
      boardCacheDirty = true;
    },
  });
}
