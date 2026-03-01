/**
 * Tsoro online adapter.
 * Creates an online boot function for Tsoro with setup phase coordination.
 */
import { createDisconnectOverlay, createOnlineGameOverScreen } from './online-adapter.js';
import { PLAYER_A, PLAYER_B, TSORO_FSM_STATES, PEBBLE_OPTIONS, DIRECTION_CW, DIRECTION_CCW } from '../tsoro/core/constants.js';
import { deepFreeze } from '../utils/deep-freeze.js';

/**
 * Boot Tsoro in online mode.
 */
export function bootTsoroOnline({ roomId, role, state: initialState, wsClient, yourUid, canvas, uiContainer, onBack }) {
  const disconnectOverlay = createDisconnectOverlay(uiContainer);
  const gameOverScreen = createOnlineGameOverScreen(uiContainer);

  const myPlayer = initialState.yourPlayer;
  let currentState = initialState;
  let renderer = null;
  let inputCleanup = null;

  // Lazy-load Tsoro rendering (same as offline does)
  async function initRendering() {
    const { createTsoroRenderer } = await import('../tsoro/rendering/renderer.js');
    renderer = createTsoroRenderer(canvas);
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

  // Setup UI
  showSetupOrGame(currentState);

  function showSetupOrGame(state) {
    // Clear any existing UI
    clearUI();

    const fsm = state.fsmState;

    if (fsm === TSORO_FSM_STATES.SETUP_PEBBLES && myPlayer === PLAYER_A) {
      showPebbleChoice();
    } else if (fsm === TSORO_FSM_STATES.SETUP_BANK_A && myPlayer === PLAYER_A) {
      showBankChoice('Choose your bank hole');
    } else if (fsm === TSORO_FSM_STATES.SETUP_DIRECTION_A && myPlayer === PLAYER_A) {
      showDirectionChoice();
    } else if (fsm === TSORO_FSM_STATES.SETUP_BANK_B && myPlayer === PLAYER_B) {
      showBankChoice('Choose your bank hole');
    } else if (fsm === TSORO_FSM_STATES.SETUP_DIRECTION_B && myPlayer === PLAYER_B) {
      showDirectionChoice();
    } else if (fsm === TSORO_FSM_STATES.WAITING_FOR_PICK) {
      showGameUI(state);
    } else {
      // Waiting for opponent's setup
      showWaitingForOpponent();
    }
  }

  function showPebbleChoice() {
    const div = createOverlay();
    div.innerHTML = `
      <div class="tsoro-setup-content">
        <h2 class="tsoro-setup-title">Tsoro Online</h2>
        <p class="tsoro-setup-step">Step 1 of 3</p>
        <p class="tsoro-setup-label">Choose pebbles per hole</p>
        <div class="tsoro-setup-buttons">
          ${PEBBLE_OPTIONS.map(n =>
            `<button class="tsoro-setup-btn" data-pebbles="${n}">${n} pebbles</button>`
          ).join('')}
        </div>
      </div>
    `;

    for (const btn of div.querySelectorAll('[data-pebbles]')) {
      btn.addEventListener('click', () => {
        wsClient.send({
          type: 'setup_choice',
          roomId,
          payload: { choice: 'pebbles', value: parseInt(btn.dataset.pebbles) },
        });
      });
    }

    uiContainer.appendChild(div);
  }

  function showBankChoice(label) {
    const div = createOverlay();
    div.innerHTML = `
      <div class="tsoro-setup-content">
        <h2 class="tsoro-setup-title">Tsoro Online</h2>
        <p class="tsoro-setup-step">Choose Bank</p>
        <p class="tsoro-setup-label">${label}</p>
        <p class="tsoro-setup-hint">Tap a hole on the board to select it as your bank</p>
      </div>
    `;
    uiContainer.appendChild(div);

    // Enable board click for bank selection
    const clickHandler = (e) => {
      if (!renderer) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const holeIndex = renderer.getHoleAtPosition ? renderer.getHoleAtPosition(x, y, myPlayer) : null;

      if (holeIndex !== null && holeIndex !== undefined) {
        wsClient.send({
          type: 'setup_choice',
          roomId,
          payload: { choice: 'bank', value: holeIndex },
        });
        canvas.removeEventListener('click', clickHandler);
      }
    };
    canvas.addEventListener('click', clickHandler);
    inputCleanup = () => canvas.removeEventListener('click', clickHandler);
  }

  function showDirectionChoice() {
    const div = createOverlay();
    div.innerHTML = `
      <div class="tsoro-setup-content">
        <h2 class="tsoro-setup-title">Tsoro Online</h2>
        <p class="tsoro-setup-step">Choose Direction</p>
        <p class="tsoro-setup-label">Choose your sowing direction</p>
        <div class="tsoro-setup-buttons">
          <button class="tsoro-setup-btn" data-dir="${DIRECTION_CW}">
            <span class="tsoro-dir-arrow">&#8635;</span> Clockwise
          </button>
          <button class="tsoro-setup-btn" data-dir="${DIRECTION_CCW}">
            <span class="tsoro-dir-arrow">&#8634;</span> Counter-clockwise
          </button>
        </div>
      </div>
    `;

    for (const btn of div.querySelectorAll('[data-dir]')) {
      btn.addEventListener('click', () => {
        wsClient.send({
          type: 'setup_choice',
          roomId,
          payload: { choice: 'direction', value: btn.dataset.dir },
        });
      });
    }

    uiContainer.appendChild(div);
  }

  function showWaitingForOpponent() {
    const div = createOverlay();
    div.innerHTML = `
      <div class="tsoro-setup-content">
        <h2 class="tsoro-setup-title">Tsoro Online</h2>
        <p class="tsoro-setup-label">Waiting for opponent...</p>
        <div class="lobby-spinner"></div>
      </div>
    `;
    uiContainer.appendChild(div);
  }

  function showGameUI(state) {
    // Clear setup overlays
    clearUI();

    // Show HUD
    const hud = document.createElement('div');
    hud.className = 'tsoro-hud';
    hud.id = 'tsoro-online-hud';
    hud.innerHTML = `
      <div class="tsoro-hud-player">
        <div class="tsoro-hud-indicator ${state.currentPlayer === PLAYER_A ? 'active' : ''}"></div>
        <span class="tsoro-hud-name">Player A</span>
      </div>
      <div class="tsoro-hud-center">
        <div class="tsoro-hud-turn">${state.currentPlayer === myPlayer ? 'Your Turn' : "Opponent's Turn"}</div>
      </div>
      <div class="tsoro-hud-player">
        <div class="tsoro-hud-indicator ${state.currentPlayer === PLAYER_B ? 'active' : ''}"></div>
        <span class="tsoro-hud-name">Player B</span>
      </div>
    `;
    uiContainer.appendChild(hud);

    // Enable board clicks for hole selection
    if (state.currentPlayer === myPlayer) {
      enableHoleSelection(state);
    }
  }

  function enableHoleSelection(state) {
    const clickHandler = (e) => {
      if (!renderer) return;
      if (currentState.currentPlayer !== myPlayer) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const holeIndex = renderer.getHoleAtPosition ? renderer.getHoleAtPosition(x, y, myPlayer) : null;

      if (holeIndex !== null && holeIndex !== undefined && currentState.validHoles.includes(holeIndex)) {
        wsClient.send({
          type: 'submit_move',
          roomId,
          payload: { holeIndex },
        });
      }
    };
    canvas.addEventListener('click', clickHandler);
    inputCleanup = () => canvas.removeEventListener('click', clickHandler);
  }

  // WS handlers
  const wsHandlers = {
    state_update: (payload) => {
      currentState = payload.state;
      showSetupOrGame(currentState);
      render();
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
      renderer.render(currentState);
    }
  }

  function createOverlay() {
    const div = document.createElement('div');
    div.className = 'tsoro-setup-overlay';
    return div;
  }

  function clearUI() {
    if (inputCleanup) {
      inputCleanup();
      inputCleanup = null;
    }
    for (const el of uiContainer.querySelectorAll('.tsoro-setup-overlay, #tsoro-online-hud')) {
      el.remove();
    }
  }

  function destroy() {
    window.removeEventListener('resize', handleResize);
    clearUI();
    disconnectOverlay.hide();
    gameOverScreen.hide();
  }

  return { destroy, wsHandlers };
}
