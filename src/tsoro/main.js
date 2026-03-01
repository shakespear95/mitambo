/**
 * Tsoro game bootstrap & game loop.
 * Wires up renderer, input, UI screens, and game logic.
 */
import { PLAYER_A, PLAYER_B, TSORO_FSM_STATES } from './core/constants.js';
import { createTsoroState, updateTsoroState, switchTsoroPlayer } from './core/state.js';
import { createInitialBoard, gridToHole, setPebbleCount, holeToGrid } from './core/board.js';
import { executeFullTurn } from './rules/sowing.js';
import { getValidHoles } from './rules/move-validator.js';
import { checkTsoroWinner } from './rules/win-condition.js';
import { createTsoroRenderer } from './rendering/renderer.js';
import { createInputHandler } from '../input/input-handler.js';
import { setupMouseHandler } from '../input/mouse-handler.js';
import { setupTouchHandler } from '../input/touch-handler.js';
import { createTsoroSetupScreen } from './ui/setup-screen.js';
import { createTsoroGameUI } from './ui/game-ui.js';
import { createTsoroGameOverScreen } from './ui/game-over-screen.js';

const S = TSORO_FSM_STATES;

/**
 * Boot the Tsoro game.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} uiContainer
 * @param {Object} eventBus
 * @param {Object} audioManager
 * @param {Function} onBack - Called when user wants to go back to game selector
 * @returns {{ destroy: Function }}
 */
export function bootTsoro(canvas, uiContainer, eventBus, audioManager, onBack) {
  const renderer = createTsoroRenderer(canvas);
  const setupScreen = createTsoroSetupScreen(uiContainer);
  const gameUI = createTsoroGameUI(uiContainer);
  const gameOverScreen = createTsoroGameOverScreen(uiContainer);

  let gameState = createTsoroState();
  let animating = false;
  let animFrameId = null;
  let destroyed = false;

  // Input handling
  const inputHandler = createInputHandler(canvas, renderer, handleBoardClick);
  const mouseHandler = setupMouseHandler(canvas, inputHandler);
  const touchHandler = setupTouchHandler(canvas, inputHandler);

  // Start resize handling
  function handleResize() {
    renderer.resizeCanvas();
    render();
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // Start setup flow
  startSetup();

  // Game loop for pulsing effects
  function gameLoop(time) {
    renderer.updateTime(time);

    // Re-render during setup for pulsing effects
    if (gameState.fsmState === S.SETUP_BANK_A || gameState.fsmState === S.SETUP_BANK_B) {
      render();
    }

    animFrameId = requestAnimationFrame(gameLoop);
  }
  animFrameId = requestAnimationFrame(gameLoop);

  // ----- Setup Flow -----

  function startSetup() {
    gameState = createTsoroState();
    gameState = updateTsoroState(gameState, { fsmState: S.SETUP_PEBBLES });
    setupScreen.showPebbleSelection(handlePebblesChosen);
    render();
  }

  function handlePebblesChosen(count) {
    const board = createInitialBoard(count);
    gameState = updateTsoroState(gameState, {
      board,
      pebblesPerHole: count,
      fsmState: S.SETUP_BANK_A,
    });
    setupScreen.showBankSelection('A', 2);
    render();
  }

  function handleBankSelection(player, holeIndex) {
    if (player === PLAYER_A) {
      // Clear the bank hole (bank starts empty)
      const newBoard = setPebbleCount(gameState.board, PLAYER_A, holeIndex, 0);
      const newSetup = { ...gameState.setup, bankA: holeIndex };
      gameState = updateTsoroState(gameState, {
        board: newBoard,
        setup: newSetup,
        fsmState: S.SETUP_DIRECTION_A,
      });
      setupScreen.showDirectionSelection('A', 3, (dir) => handleDirectionChosen(PLAYER_A, dir));
    } else {
      const newBoard = setPebbleCount(gameState.board, PLAYER_B, holeIndex, 0);
      const newSetup = { ...gameState.setup, bankB: holeIndex };
      gameState = updateTsoroState(gameState, {
        board: newBoard,
        setup: newSetup,
        fsmState: S.SETUP_DIRECTION_B,
      });
      setupScreen.showDirectionSelection('B', 5, (dir) => handleDirectionChosen(PLAYER_B, dir));
    }
    render();
  }

  function handleDirectionChosen(player, direction) {
    if (player === PLAYER_A) {
      const newSetup = { ...gameState.setup, directionA: direction };
      gameState = updateTsoroState(gameState, {
        setup: newSetup,
        fsmState: S.SETUP_BANK_B,
      });
      setupScreen.showBankSelection('B', 4);
    } else {
      const newSetup = { ...gameState.setup, directionB: direction };
      gameState = updateTsoroState(gameState, {
        setup: newSetup,
        fsmState: S.WAITING_FOR_PICK,
      });
      setupScreen.hide();

      // Calculate valid holes for first turn
      const validHoles = getValidHoles(gameState.board, PLAYER_A, gameState.setup.bankA);
      gameState = updateTsoroState(gameState, { validHoles });

      gameUI.show();
      gameUI.update(gameState);
    }
    render();
  }

  // ----- Game Logic -----

  function handleBoardClick(row, col) {
    if (animating) return;

    const { fsmState } = gameState;

    // During bank selection, route clicks to setup
    if (fsmState === S.SETUP_BANK_A) {
      const holeInfo = gridToHole(row, col);
      if (holeInfo && holeInfo.player === PLAYER_A) {
        audioManager.play('select');
        handleBankSelection(PLAYER_A, holeInfo.holeIndex);
      }
      return;
    }

    if (fsmState === S.SETUP_BANK_B) {
      const holeInfo = gridToHole(row, col);
      if (holeInfo && holeInfo.player === PLAYER_B) {
        audioManager.play('select');
        handleBankSelection(PLAYER_B, holeInfo.holeIndex);
      }
      return;
    }

    if (fsmState === S.WAITING_FOR_PICK) {
      handleHolePick(row, col);
      return;
    }
  }

  function handleHolePick(row, col) {
    const holeInfo = gridToHole(row, col);
    if (!holeInfo) return;

    const { player, holeIndex } = holeInfo;
    const currentPlayer = gameState.currentPlayer;

    // Must click own holes
    if (player !== currentPlayer) return;

    // Must be a valid hole
    if (!gameState.validHoles.includes(holeIndex)) return;

    audioManager.play('select');
    executeTurn(holeIndex);
  }

  async function executeTurn(holeIndex) {
    animating = true;

    try {
      const { currentPlayer, setup } = gameState;
      const bankIndex = currentPlayer === PLAYER_A ? setup.bankA : setup.bankB;
      const direction = currentPlayer === PLAYER_A ? setup.directionA : setup.directionB;

      // Show selected hole
      gameState = updateTsoroState(gameState, {
        selectedHole: { player: currentPlayer, holeIndex },
        fsmState: S.SOWING,
      });
      render();

      // Pre-compute the full turn
      const result = executeFullTurn(gameState.board, currentPlayer, holeIndex, bankIndex, direction);

      // Animate the sowing steps
      // Note: renderer drives its own rAF loop during animation, so no render() call needed here
      await renderer.animateSowing(result.allSteps, currentPlayer, (step) => {
        if (destroyed) return;
        gameState = updateTsoroState(gameState, {
          board: step.boardSnapshot,
          selectedHole: step.type === 'chain'
            ? { player: currentPlayer, holeIndex: step.hole }
            : gameState.selectedHole,
        });
      });

      if (destroyed) return;

      audioManager.play('move');

      // Apply final board state
      gameState = updateTsoroState(gameState, {
        board: result.finalBoard,
        selectedHole: null,
        lastSowingResult: result,
        fsmState: S.TURN_COMPLETE,
      });

      // Check win condition
      if (checkTsoroWinner(result.finalBoard, currentPlayer, bankIndex)) {
        gameState = updateTsoroState(gameState, {
          fsmState: S.GAME_OVER,
          winner: currentPlayer,
        });
        audioManager.play('gameOver');
        gameUI.update(gameState);
        render();
        gameOverScreen.show(currentPlayer, () => startSetup(), onBack);
        return;
      }

      // Switch turns
      const nextPlayer = currentPlayer === PLAYER_A ? PLAYER_B : PLAYER_A;
      const nextBankIndex = nextPlayer === PLAYER_A ? setup.bankA : setup.bankB;
      const nextValidHoles = getValidHoles(result.finalBoard, nextPlayer, nextBankIndex);

      // If next player has no valid moves, current player wins
      if (nextValidHoles.length === 0) {
        gameState = updateTsoroState(gameState, {
          fsmState: S.GAME_OVER,
          winner: currentPlayer,
        });
        audioManager.play('gameOver');
        gameUI.update(gameState);
        render();
        gameOverScreen.show(currentPlayer, () => startSetup(), onBack);
        return;
      }

      gameState = switchTsoroPlayer(gameState);
      gameState = updateTsoroState(gameState, {
        fsmState: S.WAITING_FOR_PICK,
        validHoles: nextValidHoles,
        turnCount: gameState.turnCount + 1,
      });

      gameUI.update(gameState);
      render();
    } finally {
      animating = false;
    }
  }

  // ----- Render -----

  function render() {
    renderer.render(gameState);
  }

  // ----- Cleanup -----

  function destroy() {
    destroyed = true;
    renderer.cancelAnimations();
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
    }
    window.removeEventListener('resize', handleResize);
    mouseHandler.destroy();
    touchHandler.destroy();
    setupScreen.hide();
    gameUI.hide();
    gameOverScreen.hide();
  }

  return { destroy };
}
