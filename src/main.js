/**
 * Main app bootstrap - game selector gate.
 * Routes to Damii (checkers) or Tsoro (pebble sowing) based on user selection.
 * Online multiplayer auth gate added — offline path unchanged.
 */
import { createGameState, updateState, switchPlayer, recordCapture, incrementMoveCounter } from './core/state.js';
import { FSM_STATES, PLAYER_1, PLAYER_2, MODE_AI, COLORS } from './core/constants.js';
import { getPiece, removePiece } from './core/board.js';
import { isKing, promotePiece } from './core/piece.js';
import { getLegalMoves, getAllMovesForPlayer } from './rules/move-generator.js';
import { shouldPromote } from './rules/promotion.js';
import { checkWinner, checkDraw } from './rules/win-condition.js';
import { detectMissedCapture } from './hukura/hukura-detector.js';
import { createHukuraManager } from './hukura/hukura-state.js';
import { createHukuraUI } from './hukura/hukura-ui.js';
import { applyMove, createAIPlayer } from './ai/ai-player.js';
import { createRenderer } from './rendering/renderer.js';
import { createInputHandler } from './input/input-handler.js';
import { setupMouseHandler } from './input/mouse-handler.js';
import { setupTouchHandler } from './input/touch-handler.js';
import { createEventBus } from './utils/event-bus.js';
import { createMenuScreen } from './ui/menu-screen.js';
import { createGameUI } from './ui/game-ui.js';
import { createGameOverScreen } from './ui/game-over-screen.js';
import { createAudioManager } from './audio/audio-manager.js';
import { createGameSelector } from './ui/game-selector.js';
import { clone } from './utils/clone.js';
import { deepFreeze } from './utils/deep-freeze.js';
import { hasSession, getPlayer as getStoredPlayer } from './online/session.js';
import { createAuthUI } from './online/auth-ui.js';
import { createLobbyUI } from './online/lobby-ui.js';
import { createDashboardUI } from './online/dashboard-ui.js';
import { initSupabaseClient, getSupabaseClient } from './online/supabase-config.js';

// Shared infrastructure
const canvas = document.getElementById('game-canvas');
const uiContainer = document.getElementById('ui-container');
const eventBus = createEventBus();
const audioManager = createAudioManager();

let activeGame = null;
let activeOnlineGame = null;
let lobbyUI = null;
let dashboardUI = null;

const gameSelector = createGameSelector(uiContainer, handleGameSelect);

// --- Auth gate: check for existing session or show auth screen ---
initApp();

async function initApp() {
  const supabaseReady = initSupabaseClient();

  if (!supabaseReady) {
    // Supabase SDK not available — go straight to offline
    gameSelector.show();
    return;
  }

  // Listen for auth state changes (handles OAuth redirect return)
  const sb = getSupabaseClient();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      showOnlineLobby();
    }
  });

  // Check for existing session
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showOnlineLobby();
  } else {
    showAuthScreen();
  }
}

function showAuthScreen() {
  const authUI = createAuthUI(uiContainer, {
    onSignedIn: () => showOnlineLobby(),
    onPlayOffline: () => gameSelector.show(),
  });
  authUI.show();
}

function showOnlineLobby() {
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }
  if (activeOnlineGame) {
    activeOnlineGame.destroy();
    activeOnlineGame = null;
  }

  // Clear game handlers on the WS client
  if (lobbyUI && lobbyUI.getWsClient()) {
    lobbyUI.getWsClient().clearGameHandlers();
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dashboardUI = createDashboardUI(uiContainer, () => showOnlineLobby());

  lobbyUI = createLobbyUI(uiContainer, {
    onGameStart: handleOnlineGameStart,
    onPlayOffline: () => gameSelector.show(),
    onLogout: () => showAuthScreen(),
    onShowDashboard: () => dashboardUI.show(),
  });
  lobbyUI.show();
}

async function handleOnlineGameStart({ roomId, gameType, role, state, reconnected, wsClient }) {
  if (activeOnlineGame) {
    activeOnlineGame.destroy();
    activeOnlineGame = null;
  }

  const player = await getStoredPlayer();
  const yourUid = player.id;

  const params = {
    roomId, role, state, wsClient, yourUid, canvas, uiContainer,
    onBack: () => showOnlineLobby(),
  };

  let onlineGame;

  if (gameType === 'damii') {
    const { bootDamiiOnline } = await import('./online/damii-online.js');
    onlineGame = bootDamiiOnline(params);
  } else if (gameType === 'tsoro') {
    const { bootTsoroOnline } = await import('./online/tsoro-online.js');
    onlineGame = bootTsoroOnline(params);
  } else if (gameType === 'crazy8') {
    const { bootCrazy8Online } = await import('./online/crazy8-online.js');
    onlineGame = bootCrazy8Online(params);
  }

  if (onlineGame) {
    activeOnlineGame = onlineGame;

    // Route game-specific WS messages to the online game handlers
    wsClient.setGameHandlers(onlineGame.wsHandlers);
  }
}

async function handleGameSelect(gameId) {
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }

  gameSelector.hide();

  try {
    if (gameId === 'damii') {
      activeGame = bootDamii();
    } else if (gameId === 'tsoro') {
      const { bootTsoro } = await import('./tsoro/main.js');
      activeGame = bootTsoro(canvas, uiContainer, eventBus, audioManager, handleBackToSelector);
    } else if (gameId === 'crazy8') {
      const { bootCrazy8 } = await import('./crazy8/main.js');
      activeGame = bootCrazy8(canvas, uiContainer, eventBus, audioManager, handleBackToSelector);
    }
  } catch (err) {
    console.error('Failed to load game:', err);
    gameSelector.show();
  }
}

function handleBackToSelector() {
  if (activeGame) {
    activeGame.destroy();
    activeGame = null;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameSelector.show();
}

// ----- Damii (Zimbabwean Checkers) -----

function bootDamii() {
  const renderer = createRenderer(canvas);
  const hukuraManager = createHukuraManager(eventBus);
  const hukuraUI = createHukuraUI(uiContainer);
  const menuScreen = createMenuScreen(uiContainer, handleGameStart);
  const gameUI = createGameUI(uiContainer);
  const gameOverScreen = createGameOverScreen(uiContainer, handleRestart);

  let gameState = createGameState();
  let aiPlayer = null;
  let animating = false;

  const inputHandler = createInputHandler(canvas, renderer, handleBoardClick);
  const mouseHandler = setupMouseHandler(canvas, inputHandler);
  const touchHandler = setupTouchHandler(canvas, inputHandler);

  function handleResize() {
    renderer.resizeCanvas();
    render();
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  menuScreen.show();
  render();

  function handleGameStart(mode, difficulty) {
    menuScreen.hide();
    gameOverScreen.hide();

    gameState = createGameState(mode, difficulty);
    gameState = updateState(gameState, { fsmState: FSM_STATES.WAITING_FOR_MOVE });

    if (mode === MODE_AI) {
      aiPlayer = createAIPlayer(PLAYER_2, difficulty);
    } else {
      aiPlayer = null;
    }

    hukuraManager.reset();
    hukuraUI.hide();
    gameUI.show();
    gameUI.update(gameState);
    render();
  }

  function handleRestart() {
    gameOverScreen.hide();
    gameUI.hide();
    hukuraUI.hide();
    hukuraManager.reset();
    gameState = createGameState();
    menuScreen.show();
    render();
  }

  function handleBoardClick(row, col) {
    if (animating) return;

    const { fsmState } = gameState;

    if (gameState.mode === MODE_AI && gameState.currentPlayer === PLAYER_2 && fsmState !== FSM_STATES.HUKURA_WINDOW) {
      return;
    }

    if (fsmState === FSM_STATES.WAITING_FOR_MOVE) {
      handlePieceSelection(row, col);
    } else if (fsmState === FSM_STATES.PIECE_SELECTED) {
      handleMoveOrReselect(row, col);
    } else if (fsmState === FSM_STATES.CAPTURE_SEQUENCE) {
      handleCaptureSequenceClick(row, col);
    }
  }

  function handlePieceSelection(row, col) {
    const piece = getPiece(gameState.board, row, col);
    if (piece === null || piece.player !== gameState.currentPlayer) return;

    const moves = getLegalMoves(gameState.board, row, col);
    if (moves.length === 0) return;

    audioManager.play('select');

    gameState = updateState(gameState, {
      selectedPiece: { row, col },
      legalMoves: moves,
      fsmState: FSM_STATES.PIECE_SELECTED,
    });

    render();
  }

  function handleMoveOrReselect(row, col) {
    const targetMove = gameState.legalMoves.find(
      m => m.to.row === row && m.to.col === col
    );

    if (targetMove) {
      executeMove(targetMove);
      return;
    }

    const piece = getPiece(gameState.board, row, col);
    if (piece !== null && piece.player === gameState.currentPlayer) {
      handlePieceSelection(row, col);
      return;
    }

    gameState = updateState(gameState, {
      selectedPiece: null,
      legalMoves: [],
      fsmState: FSM_STATES.WAITING_FOR_MOVE,
    });
    render();
  }

  async function executeMove(move) {
    animating = true;
    const boardBeforeMove = gameState.board;
    const currentPlayer = gameState.currentPlayer;
    const opponent = currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;

    const missedCapture = detectMissedCapture(boardBeforeMove, currentPlayer, move);

    if (move.isCapture) {
      await executeCaptureMove(move);
    } else {
      const piece = getPiece(gameState.board, move.from.row, move.from.col);
      await renderer.animateMove(move.from.row, move.from.col, move.to.row, move.to.col, piece);
      audioManager.play('move');

      let newBoard = applyMove(gameState.board, move);
      gameState = updateState(gameState, {
        board: newBoard,
        selectedPiece: null,
        legalMoves: [],
        lastMove: move,
      });
      gameState = incrementMoveCounter(gameState);
    }

    if (move.isPromotion) {
      audioManager.play('promote');
      renderer.spawnPromotionEffect(move.to.row, move.to.col);
    }

    animating = false;

    if (missedCapture) {
      gameState = updateState(gameState, { fsmState: FSM_STATES.HUKURA_WINDOW });
      hukuraManager.startWindow(currentPlayer, move.from);

      const callingPlayer = opponent;
      hukuraUI.show(callingPlayer, hukuraManager, () => {
        handleHukuraCalled(currentPlayer, move);
      });

      if (gameState.mode === MODE_AI && callingPlayer === PLAYER_2 && aiPlayer) {
        if (aiPlayer.shouldCallHukura()) {
          setTimeout(() => {
            if (hukuraManager.isActive()) {
              handleHukuraCalled(currentPlayer, move);
            }
          }, 500 + Math.random() * 1500);
        }
      }

      const unsub = eventBus.on('hukuraExpired', () => {
        unsub();
        hukuraUI.hide();
        completeTurn();
      });
    } else {
      completeTurn();
    }
  }

  async function executeCaptureMove(move) {
    const piece = getPiece(gameState.board, move.from.row, move.from.col);
    const currentPlayer = gameState.currentPlayer;
    const opponent = currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;

    if (move.steps.length <= 1) {
      await renderer.animateMove(move.from.row, move.from.col, move.to.row, move.to.col, piece);
      audioManager.play('capture');

      for (const cap of move.captures) {
        const capturedPiece = getPiece(gameState.board, cap.row, cap.col);
        const color = capturedPiece?.player === PLAYER_1 ? COLORS.PIECE_DARK : COLORS.PIECE_LIGHT;
        renderer.spawnCaptureEffect(cap.row, cap.col, color);
      }

      let newBoard = applyMove(gameState.board, move);
      gameState = updateState(gameState, { board: newBoard });
      gameState = recordCapture(gameState, opponent);
    } else {
      let currentBoard = clone(gameState.board);
      let currentRow = move.from.row;
      let currentCol = move.from.col;
      let currentPiece = piece;

      for (let i = 0; i < move.steps.length; i++) {
        const step = move.steps[i];
        const capture = move.captures[i];

        await renderer.animateMove(currentRow, currentCol, step.row, step.col, currentPiece);
        audioManager.play('capture');

        if (capture) {
          const capturedPiece = getPiece(currentBoard, capture.row, capture.col);
          const color = capturedPiece?.player === PLAYER_1 ? COLORS.PIECE_DARK : COLORS.PIECE_LIGHT;
          renderer.spawnCaptureEffect(capture.row, capture.col, color);
          currentBoard = clone(currentBoard);
          currentBoard[capture.row][capture.col] = null;
        }

        currentBoard = clone(currentBoard);
        currentBoard[currentRow][currentCol] = null;

        if (shouldPromote({ to: step }, currentPiece.player) && !isKing(currentPiece)) {
          currentPiece = promotePiece(currentPiece);
        }

        currentBoard[step.row][step.col] = currentPiece;
        currentRow = step.row;
        currentCol = step.col;

        gameState = updateState(gameState, {
          board: deepFreeze(clone(currentBoard)),
        });
        render();

        if (i < move.steps.length - 1) {
          await delay(150);
        }
      }

      gameState = recordCapture(gameState, opponent);
    }

    gameState = updateState(gameState, {
      selectedPiece: null,
      legalMoves: [],
      lastMove: move,
    });
  }

  function handleHukuraCalled(offendingPlayer, move) {
    hukuraUI.hide();
    audioManager.play('hukura');

    const piece = getPiece(gameState.board, move.to.row, move.to.col);

    if (piece && piece.player === offendingPlayer) {
      let newBoard = removePiece(gameState.board, move.to.row, move.to.col);
      const color = offendingPlayer === PLAYER_1 ? COLORS.PIECE_DARK : COLORS.PIECE_LIGHT;
      renderer.spawnCaptureEffect(move.to.row, move.to.col, color);

      gameState = updateState(gameState, {
        board: newBoard,
        fsmState: FSM_STATES.HUKURA_RESOLVE,
      });
      gameState = recordCapture(gameState, offendingPlayer);
    }

    completeTurn();
  }

  function completeTurn() {
    hukuraUI.hide();

    const currentPlayer = gameState.currentPlayer;
    const winner = checkWinner(gameState.board, currentPlayer);
    const drawReason = checkDraw(gameState.movesSinceCapture);

    if (winner) {
      gameState = updateState(gameState, {
        fsmState: FSM_STATES.GAME_OVER,
        winner,
      });
      audioManager.play('gameOver');
      gameOverScreen.show(winner, null);
      gameUI.update(gameState);
      render();
      return;
    }

    if (drawReason) {
      gameState = updateState(gameState, {
        fsmState: FSM_STATES.GAME_OVER,
        drawReason,
      });
      gameOverScreen.show(null, drawReason);
      gameUI.update(gameState);
      render();
      return;
    }

    gameState = switchPlayer(gameState);
    gameState = updateState(gameState, {
      fsmState: FSM_STATES.WAITING_FOR_MOVE,
    });

    gameUI.update(gameState);
    render();

    // Safety: if the new player has no legal moves, they lose
    const newPlayerMoves = getAllMovesForPlayer(gameState.board, gameState.currentPlayer);
    if (newPlayerMoves.length === 0) {
      const noMoveWinner = gameState.currentPlayer === PLAYER_1 ? PLAYER_2 : PLAYER_1;
      gameState = updateState(gameState, {
        fsmState: FSM_STATES.GAME_OVER,
        winner: noMoveWinner,
      });
      audioManager.play('gameOver');
      gameOverScreen.show(noMoveWinner, null);
      gameUI.update(gameState);
      render();
      return;
    }

    if (gameState.mode === MODE_AI && gameState.currentPlayer === PLAYER_2 && aiPlayer) {
      scheduleAIMove();
    }
  }

  function scheduleAIMove() {
    gameUI.showAIThinking();

    setTimeout(() => {
      const move = aiPlayer.chooseMove(gameState.board);
      gameUI.hideAIThinking();

      if (move) {
        gameState = updateState(gameState, {
          selectedPiece: move.from,
          legalMoves: [move],
          fsmState: FSM_STATES.PIECE_SELECTED,
        });
        executeMove(move);
      } else {
        // AI has no legal moves — current player (human) wins
        const winner = gameState.currentPlayer === PLAYER_2 ? PLAYER_1 : PLAYER_2;
        gameState = updateState(gameState, {
          fsmState: FSM_STATES.GAME_OVER,
          winner,
        });
        audioManager.play('gameOver');
        gameOverScreen.show(winner, null);
        gameUI.update(gameState);
        render();
      }
    }, 300 + Math.random() * 400);
  }

  function render() {
    renderer.render(gameState);
  }

  let animFrameId = requestAnimationFrame(gameLoop);

  function gameLoop(time) {
    const hasAnimations = renderer.updateAnimations(time);
    const hasEffects = renderer.hasEffects();

    if (hasAnimations || hasEffects) {
      render();
    }

    animFrameId = requestAnimationFrame(gameLoop);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function handleCaptureSequenceClick(row, col) {
    const pos = gameState.captureSequencePosition;
    if (!pos) return;

    const targetMove = gameState.legalMoves.find(
      m => m.to.row === row && m.to.col === col
    );

    if (targetMove) {
      executeMove(targetMove);
    }
  }

  function destroy() {
    cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', handleResize);
    mouseHandler.destroy();
    touchHandler.destroy();
    menuScreen.hide();
    gameUI.hide();
    gameOverScreen.hide();
    hukuraUI.hide();
    hukuraManager.reset();
  }

  return { destroy };
}
