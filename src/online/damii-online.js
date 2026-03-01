/**
 * Damii online adapter.
 * Creates an online boot function that intercepts the input→move→apply pipeline.
 * Does NOT modify the original bootDamii().
 */
import { createRenderer } from '../rendering/renderer.js';
import { createInputHandler } from '../input/input-handler.js';
import { setupMouseHandler } from '../input/mouse-handler.js';
import { setupTouchHandler } from '../input/touch-handler.js';
import { createGameUI } from '../ui/game-ui.js';
import { createEventBus } from '../utils/event-bus.js';
import { createAudioManager } from '../audio/audio-manager.js';
import { createHukuraUI } from '../hukura/hukura-ui.js';
import { getLegalMoves } from '../rules/move-generator.js';
import { getPiece } from '../core/board.js';
import { FSM_STATES, PLAYER_1, PLAYER_2 } from '../core/constants.js';
import { deepFreeze } from '../utils/deep-freeze.js';
import { createDisconnectOverlay, createOnlineGameOverScreen } from './online-adapter.js';

/**
 * Boot Damii in online mode.
 *
 * @param {object} params
 * @param {string} params.roomId
 * @param {string} params.role - 'player1' or 'player2'
 * @param {object} params.state - Initial server state
 * @param {object} params.wsClient - WebSocket client
 * @param {string} params.yourUid
 * @param {HTMLCanvasElement} params.canvas
 * @param {HTMLElement} params.uiContainer
 * @param {function} params.onBack - Return to lobby
 */
export function bootDamiiOnline({ roomId, role, state: initialState, wsClient, yourUid, canvas, uiContainer, onBack }) {
  const renderer = createRenderer(canvas);
  const eventBus = createEventBus();
  const audioManager = createAudioManager();
  const gameUI = createGameUI(uiContainer);
  const hukuraUI = createHukuraUI(uiContainer);
  const disconnectOverlay = createDisconnectOverlay(uiContainer);
  const gameOverScreen = createOnlineGameOverScreen(uiContainer);

  const myColor = role === 'player1' ? PLAYER_1 : PLAYER_2;

  // Build local state from server state
  let gameState = deepFreeze({
    ...initialState,
    selectedPiece: null,
    legalMoves: [],
    mode: 'online',
    fsmState: FSM_STATES.WAITING_FOR_MOVE,
    scores: { [PLAYER_1]: 0, [PLAYER_2]: 0 },
    hukura: { active: false },
    isAnimating: false,
    pendingCaptures: [],
    captureSequencePosition: null,
  });

  let awaitingServer = false;

  const inputHandler = createInputHandler(canvas, renderer, handleBoardClick);
  const mouseHandler = setupMouseHandler(canvas, inputHandler);
  const touchHandler = setupTouchHandler(canvas, inputHandler);

  function handleResize() {
    renderer.resizeCanvas();
    render();
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  gameUI.show();
  gameUI.update(gameState);
  render();

  function handleBoardClick(row, col) {
    // Only allow clicks on your turn
    if (gameState.currentPlayer !== myColor) return;
    if (awaitingServer) return;

    if (!gameState.selectedPiece) {
      handlePieceSelection(row, col);
    } else {
      handleMoveOrReselect(row, col);
    }
  }

  function handlePieceSelection(row, col) {
    const piece = getPiece(gameState.board, row, col);
    if (!piece || piece.player !== myColor) return;

    const moves = getLegalMoves(gameState.board, row, col);
    if (moves.length === 0) return;

    audioManager.play('select');

    gameState = deepFreeze({
      ...gameState,
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
      // Submit move to server
      awaitingServer = true;
      wsClient.send({
        type: 'submit_move',
        roomId,
        payload: {
          from: targetMove.from,
          to: targetMove.to,
        },
      });

      // Optimistic: animate locally
      audioManager.play(targetMove.isCapture ? 'capture' : 'move');

      // Clear selection while waiting
      gameState = deepFreeze({
        ...gameState,
        selectedPiece: null,
        legalMoves: [],
        fsmState: FSM_STATES.WAITING_FOR_MOVE,
      });
      render();
      return;
    }

    // Try reselecting
    const piece = getPiece(gameState.board, row, col);
    if (piece && piece.player === myColor) {
      handlePieceSelection(row, col);
      return;
    }

    // Deselect
    gameState = deepFreeze({
      ...gameState,
      selectedPiece: null,
      legalMoves: [],
      fsmState: FSM_STATES.WAITING_FOR_MOVE,
    });
    render();
  }

  // --- WebSocket message handlers ---

  function handleStateUpdate(payload) {
    awaitingServer = false;

    const serverState = payload.state;
    gameState = deepFreeze({
      ...gameState,
      board: serverState.board,
      currentPlayer: serverState.currentPlayer,
      lastMove: serverState.lastMove,
      movesSinceCapture: serverState.movesSinceCapture,
      capturedPieces: serverState.capturedPieces,
      totalMoves: serverState.totalMoves,
      fsmState: serverState.fsmState || FSM_STATES.WAITING_FOR_MOVE,
      selectedPiece: null,
      legalMoves: [],
    });

    // Handle hukura notification
    if (payload.hukura && payload.hukura.active) {
      const offendingColor = payload.hukura.offendingPlayer;
      // Only opponent can call hukura
      if (offendingColor !== myColor) {
        // I can call hukura
        hukuraUI.show(myColor, {
          isActive: () => true,
          call: () => {},
        }, () => {
          wsClient.send({
            type: 'submit_move',
            roomId,
            payload: { action: 'hukura_call' },
          });
          hukuraUI.hide();
        });

        // Auto-hide after window expires
        setTimeout(() => hukuraUI.hide(), payload.hukura.timeMs);
      }
    }

    if (payload.hukura && payload.hukura.called) {
      audioManager.play('hukura');
      hukuraUI.hide();
    }

    gameUI.update(gameState);
    render();
  }

  function handleMoveRejected(payload) {
    awaitingServer = false;
    console.warn('Move rejected:', payload.reason);
    // State is already correct since we didn't optimistically apply
    render();
  }

  function handleGameOver(payload) {
    gameUI.hide();
    hukuraUI.hide();
    gameOverScreen.show({
      winnerId: payload.winnerId,
      yourUid,
      reason: payload.reason,
      eloDelta: payload.eloDelta,
      newElo: payload.newElo,
      onLobby: onBack,
    });
  }

  function handleOpponentDisconnected(payload) {
    disconnectOverlay.show(payload.gracePeriodMs);
  }

  function handleOpponentReconnected() {
    disconnectOverlay.hide();
  }

  // WS handlers — wired up by main.js via wsClient.setGameHandlers()
  const wsHandlers = {
    state_update: handleStateUpdate,
    move_rejected: handleMoveRejected,
    game_over: handleGameOver,
    opponent_disconnected: handleOpponentDisconnected,
    opponent_reconnected: handleOpponentReconnected,
  };

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

  function destroy() {
    cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', handleResize);
    mouseHandler.destroy();
    touchHandler.destroy();
    gameUI.hide();
    hukuraUI.hide();
    disconnectOverlay.hide();
    gameOverScreen.hide();
  }

  return { destroy, wsHandlers };
}
