/**
 * Crazy 8 online adapter.
 * Creates an online boot function with private hand management.
 */
import { createDisconnectOverlay, createOnlineGameOverScreen } from './online-adapter.js';
import { CRAZY8_FSM, SUITS, SUIT_SYMBOLS } from '../crazy8/core/constants.js';
import { deepFreeze } from '../utils/deep-freeze.js';

/**
 * Boot Crazy 8 in online mode.
 */
export function bootCrazy8Online({ roomId, role, state: initialState, wsClient, yourUid, canvas, uiContainer, onBack }) {
  const disconnectOverlay = createDisconnectOverlay(uiContainer);
  const gameOverScreen = createOnlineGameOverScreen(uiContainer);

  let currentState = initialState;
  let renderer = null;
  let awaitingServer = false;

  // Lazy-load rendering
  async function initRendering() {
    const { createCrazy8Renderer } = await import('../crazy8/rendering/renderer.js');
    renderer = createCrazy8Renderer(canvas);
    renderer.resizeCanvas();
    render();
  }

  function handleResize() {
    if (renderer) {
      renderer.resizeCanvas();
      render();
    }
  }
  window.addEventListener('resize', handleResize);

  initRendering();
  showGameUI();

  function showGameUI() {
    // HUD
    updateHUD();

    // Card click handling
    canvas.addEventListener('click', handleCanvasClick);
  }

  function updateHUD() {
    let hud = uiContainer.querySelector('#crazy8-online-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'crazy8-hud';
      hud.id = 'crazy8-online-hud';
      uiContainer.appendChild(hud);
    }

    const isMyTurn = isPlayerTurn();
    const state = currentState;

    hud.innerHTML = `
      <div class="crazy8-hud-top">
        <div class="crazy8-hud-player">
          <div class="crazy8-hud-indicator ${!isMyTurn ? 'active' : ''}"></div>
          <span class="crazy8-hud-name">Opponent</span>
          <span class="crazy8-hud-cards">${state.opponentCardCount} cards</span>
        </div>
        <div class="crazy8-hud-center">
          <div class="crazy8-hud-turn ${!isMyTurn ? 'thinking' : ''}">${isMyTurn ? 'Your Turn' : "Opponent's Turn"}</div>
          ${state.declaredSuit ? `<div class="crazy8-hud-status">Declared: ${SUIT_SYMBOLS[state.declaredSuit] || state.declaredSuit}</div>` : ''}
          ${state.pendingPickup > 0 ? `<div class="crazy8-hud-status" style="color:#FF5722">Pick up ${state.pendingPickup}!</div>` : ''}
        </div>
        <div class="crazy8-hud-player">
          <div class="crazy8-hud-indicator ${isMyTurn ? 'active' : ''}"></div>
          <span class="crazy8-hud-name">You</span>
          <span class="crazy8-hud-cards">${state.myHand.length} cards</span>
        </div>
      </div>
    `;

    // Show suit picker if needed
    if (state.fsmState === CRAZY8_FSM.CHOOSING_SUIT && isMyTurn) {
      showSuitPicker();
    }

    // Show draw/pickup buttons if needed
    if (isMyTurn && !awaitingServer) {
      if (state.pendingPickup > 0 && state.fsmState === CRAZY8_FSM.PLAYER_TURN) {
        showPickupButton();
      } else if (state.fsmState === CRAZY8_FSM.CARRY_ON) {
        showCarryOnOptions();
      } else if (state.fsmState === CRAZY8_FSM.PLAYER_TURN) {
        showDrawButton();
      }
    }
  }

  function isPlayerTurn() {
    if (!currentState) return false;
    // In the sanitized state, currentPlayerIndex tells us whose turn it is
    // Our player ID is based on our role
    const myIndex = currentState.players.indexOf(
      role === 'player1' ? 'player1' : 'player2'
    );
    return currentState.currentPlayerIndex === myIndex;
  }

  function handleCanvasClick(e) {
    if (!isPlayerTurn() || awaitingServer || !renderer) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Hit test against cards in hand
    const cardIndex = renderer.getCardAtPosition ? renderer.getCardAtPosition(x, y) : -1;

    if (cardIndex >= 0 && cardIndex < currentState.myHand.length) {
      const card = currentState.myHand[cardIndex];
      awaitingServer = true;
      wsClient.send({
        type: 'submit_move',
        roomId,
        payload: { cardId: card.id },
      });
    }
  }

  function showSuitPicker() {
    let picker = uiContainer.querySelector('#crazy8-online-suit-picker');
    if (picker) return;

    picker = document.createElement('div');
    picker.className = 'crazy8-suit-picker';
    picker.id = 'crazy8-online-suit-picker';
    picker.innerHTML = `
      <div class="crazy8-suit-picker-content">
        <h3 class="crazy8-suit-picker-title">Choose a Suit</h3>
        <div class="crazy8-suit-picker-buttons">
          ${SUITS.map(suit =>
            `<button class="crazy8-suit-btn" data-suit="${suit}">${SUIT_SYMBOLS[suit]}</button>`
          ).join('')}
        </div>
      </div>
    `;

    for (const btn of picker.querySelectorAll('[data-suit]')) {
      btn.addEventListener('click', () => {
        wsClient.send({
          type: 'suit_declaration',
          roomId,
          payload: { suit: btn.dataset.suit },
        });
        picker.remove();
      });
    }

    uiContainer.appendChild(picker);
  }

  function showDrawButton() {
    let btn = uiContainer.querySelector('#crazy8-online-draw-btn');
    if (btn) return;

    btn = document.createElement('button');
    btn.id = 'crazy8-online-draw-btn';
    btn.className = 'crazy8-action-btn';
    btn.textContent = 'Draw Card';
    btn.addEventListener('click', () => {
      awaitingServer = true;
      wsClient.send({ type: 'draw_card', roomId });
      btn.remove();
    });
    uiContainer.appendChild(btn);
  }

  function showPickupButton() {
    let btn = uiContainer.querySelector('#crazy8-online-pickup-btn');
    if (btn) return;

    btn = document.createElement('button');
    btn.id = 'crazy8-online-pickup-btn';
    btn.className = 'crazy8-action-btn crazy8-action-btn-warning';
    btn.textContent = `Pick Up ${currentState.pendingPickup}`;
    btn.addEventListener('click', () => {
      awaitingServer = true;
      wsClient.send({ type: 'pickup_penalty', roomId });
      btn.remove();
    });
    uiContainer.appendChild(btn);
  }

  function showCarryOnOptions() {
    let div = uiContainer.querySelector('#crazy8-online-carry-on');
    if (div) return;

    div = document.createElement('div');
    div.id = 'crazy8-online-carry-on';
    div.className = 'crazy8-carry-on-options';
    div.innerHTML = `
      <p>Play a matching card or draw</p>
      <button class="crazy8-action-btn" id="crazy8-carry-on-draw">Draw</button>
    `;
    div.querySelector('#crazy8-carry-on-draw').addEventListener('click', () => {
      awaitingServer = true;
      wsClient.send({ type: 'carry_on_draw', roomId });
      div.remove();
    });
    uiContainer.appendChild(div);
  }

  function clearActionButtons() {
    for (const sel of ['#crazy8-online-draw-btn', '#crazy8-online-pickup-btn',
                        '#crazy8-online-carry-on', '#crazy8-online-suit-picker']) {
      const el = uiContainer.querySelector(sel);
      if (el) el.remove();
    }
  }

  // WS handlers
  const wsHandlers = {
    state_update: (payload) => {
      awaitingServer = false;
      currentState = payload.state;
      clearActionButtons();
      updateHUD();
      render();
    },

    move_rejected: (payload) => {
      awaitingServer = false;
      console.warn('Move rejected:', payload.reason);
    },

    game_over: (payload) => {
      clearUI();
      gameOverScreen.show({
        winnerId: payload.winnerId,
        yourUid,
        reason: payload.reason,
        eloDelta: payload.eloDelta,
        newElo: payload.newElo,
        onLobby: onBack,
      });
    },

    opponent_disconnected: (payload) => {
      disconnectOverlay.show(payload.gracePeriodMs);
    },

    opponent_reconnected: () => {
      disconnectOverlay.hide();
    },
  };

  function render() {
    if (renderer && currentState) {
      // Build a render-compatible state from sanitized state
      const renderState = {
        hands: {
          human: currentState.myHand,
          ai: Array(currentState.opponentCardCount).fill(null),
        },
        drawPile: Array(currentState.drawPileCount).fill(null),
        discardPile: currentState.discardPile,
        currentPlayerIndex: currentState.currentPlayerIndex,
        players: currentState.players,
        fsmState: currentState.fsmState,
        declaredSuit: currentState.declaredSuit,
        pendingPickup: currentState.pendingPickup,
        winner: currentState.winner,
        lastCall: currentState.lastCall,
      };
      renderer.render(renderState);
    }
  }

  function clearUI() {
    clearActionButtons();
    const hud = uiContainer.querySelector('#crazy8-online-hud');
    if (hud) hud.remove();
    canvas.removeEventListener('click', handleCanvasClick);
  }

  function destroy() {
    window.removeEventListener('resize', handleResize);
    clearUI();
    disconnectOverlay.hide();
    gameOverScreen.hide();
  }

  return { destroy, wsHandlers };
}
