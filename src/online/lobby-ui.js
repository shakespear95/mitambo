/**
 * Online lobby UI — game picker, matchmaking, room codes.
 */
import { createWSClient } from './ws-client.js';
import { getPlayer, clearSession } from './session.js';

/**
 * Create the online lobby.
 *
 * @param {HTMLElement} container - UI container
 * @param {object} callbacks
 * @param {function} callbacks.onGameStart - Called when match starts
 * @param {function} callbacks.onPlayOffline - Go back to offline selector
 * @param {function} callbacks.onLogout - User logs out
 * @param {function} callbacks.onShowDashboard - Show stats dashboard
 */
export function createLobbyUI(container, callbacks) {
  let overlay = null;
  let wsClient = null;
  let currentRoomId = null;

  async function show() {
    hide();
    const player = await getPlayer();

    overlay = document.createElement('div');
    overlay.className = 'lobby-overlay';
    overlay.innerHTML = `
      <div class="lobby-content">
        <div class="lobby-header">
          <div class="lobby-user">
            ${player.avatar_url ? '<img class="lobby-avatar" id="lobby-player-avatar" alt="">' : ''}
            <span class="lobby-username" id="lobby-player-name"></span>
            <span class="lobby-elo">ELO: ${Number(player.elo) || 1200}</span>
          </div>
          <div class="lobby-actions">
            <button class="lobby-btn-small" id="lobby-stats-btn">Stats</button>
            <button class="lobby-btn-small" id="lobby-offline-btn">Offline</button>
            <button class="lobby-btn-small lobby-btn-logout" id="lobby-logout-btn">Logout</button>
          </div>
        </div>

        <h2 class="lobby-title">Play Online</h2>

        <div class="lobby-games" id="lobby-games">
          <button class="lobby-game-card" data-game="damii">
            <span class="lobby-game-icon">&#9898;</span>
            <span class="lobby-game-name">Damii</span>
          </button>
          <button class="lobby-game-card" data-game="tsoro">
            <span class="lobby-game-icon">&#9679;</span>
            <span class="lobby-game-name">Tsoro</span>
          </button>
          <button class="lobby-game-card" data-game="crazy8">
            <span class="lobby-game-icon">&#9830;</span>
            <span class="lobby-game-name">Crazy 8</span>
          </button>
        </div>

        <div class="lobby-match-options" id="lobby-match-options" style="display:none">
          <h3 class="lobby-section-title" id="lobby-game-label"></h3>
          <button class="lobby-btn" id="lobby-auto-match">Find Opponent</button>
          <div class="lobby-private-section">
            <button class="lobby-btn lobby-btn-secondary" id="lobby-create-room">Create Private Room</button>
            <div class="lobby-join-row">
              <input class="lobby-input" id="lobby-join-code" placeholder="Enter room code" maxlength="6">
              <button class="lobby-btn lobby-btn-secondary" id="lobby-join-room">Join</button>
            </div>
          </div>
          <button class="lobby-btn-back" id="lobby-back-games">Back</button>
        </div>

        <div class="lobby-waiting" id="lobby-waiting" style="display:none">
          <div class="lobby-spinner"></div>
          <p class="lobby-waiting-text">Finding opponent...</p>
          <p class="lobby-room-code" id="lobby-display-code" style="display:none"></p>
          <button class="lobby-btn-back" id="lobby-cancel-match">Cancel</button>
        </div>
      </div>
    `;

    // Game selection
    for (const card of overlay.querySelectorAll('.lobby-game-card')) {
      card.addEventListener('click', () => selectGame(card.dataset.game));
    }

    // Match options
    overlay.querySelector('#lobby-auto-match').addEventListener('click', handleAutoMatch);
    overlay.querySelector('#lobby-create-room').addEventListener('click', handleCreateRoom);
    overlay.querySelector('#lobby-join-room').addEventListener('click', handleJoinRoom);
    overlay.querySelector('#lobby-back-games').addEventListener('click', showGameSelect);
    overlay.querySelector('#lobby-cancel-match').addEventListener('click', cancelMatch);

    // Header actions
    overlay.querySelector('#lobby-stats-btn').addEventListener('click', () => {
      callbacks.onShowDashboard();
    });
    overlay.querySelector('#lobby-offline-btn').addEventListener('click', () => {
      hide();
      callbacks.onPlayOffline();
    });
    overlay.querySelector('#lobby-logout-btn').addEventListener('click', async () => {
      await clearSession();
      hide();
      callbacks.onLogout();
    });

    // Set user-supplied values safely via DOM properties
    const nameEl = overlay.querySelector('#lobby-player-name');
    if (nameEl) nameEl.textContent = player.display_name;
    const avatarEl = overlay.querySelector('#lobby-player-avatar');
    if (avatarEl && player.avatar_url) avatarEl.src = player.avatar_url;

    container.appendChild(overlay);

    // Connect WebSocket
    connectWS();
  }

  let selectedGameType = null;

  function selectGame(gameType) {
    selectedGameType = gameType;
    const names = { damii: 'Damii', tsoro: 'Tsoro', crazy8: 'Crazy 8' };
    overlay.querySelector('#lobby-game-label').textContent = names[gameType];
    overlay.querySelector('#lobby-games').style.display = 'none';
    overlay.querySelector('#lobby-match-options').style.display = '';
  }

  function showGameSelect() {
    overlay.querySelector('#lobby-games').style.display = '';
    overlay.querySelector('#lobby-match-options').style.display = 'none';
    overlay.querySelector('#lobby-waiting').style.display = 'none';
  }

  function showWaiting(text, roomCode) {
    overlay.querySelector('#lobby-games').style.display = 'none';
    overlay.querySelector('#lobby-match-options').style.display = 'none';
    overlay.querySelector('#lobby-waiting').style.display = '';
    overlay.querySelector('.lobby-waiting-text').textContent = text;

    const codeEl = overlay.querySelector('#lobby-display-code');
    if (roomCode) {
      codeEl.textContent = `Room code: ${roomCode}`;
      codeEl.style.display = '';
    } else {
      codeEl.style.display = 'none';
    }
  }

  async function handleAutoMatch() {
    if (!wsClient || !wsClient.isConnected()) return;
    await wsClient.send({ type: 'find_match', payload: { gameType: selectedGameType } });
    showWaiting('Finding opponent...', null);
  }

  async function handleCreateRoom() {
    if (!wsClient || !wsClient.isConnected()) return;
    await wsClient.send({ type: 'create_room', payload: { gameType: selectedGameType } });
    showWaiting('Waiting for opponent...', null);
  }

  async function handleJoinRoom() {
    const code = overlay.querySelector('#lobby-join-code').value.trim().toUpperCase();
    if (code.length !== 6) return;
    if (!wsClient || !wsClient.isConnected()) return;
    await wsClient.send({ type: 'join_room', payload: { roomCode: code } });
    showWaiting('Joining room...', null);
  }

  async function cancelMatch() {
    if (currentRoomId && wsClient && wsClient.isConnected()) {
      await wsClient.send({ type: 'cancel_match', payload: { roomId: currentRoomId } });
    }
    currentRoomId = null;
    showGameSelect();
  }

  function connectWS() {
    wsClient = createWSClient({
      onConnect: () => {},

      auth_ok: (payload) => {
        // Authenticated successfully via WS
      },

      waiting: (payload) => {
        currentRoomId = payload.roomId;
      },

      room_created: (payload) => {
        currentRoomId = payload.roomId;
        showWaiting('Waiting for opponent...', payload.roomCode);
      },

      room_joined: (payload) => {
        currentRoomId = payload.roomId;
        showWaiting('Matched! Starting game...', null);
      },

      game_start: (payload) => {
        hide();
        callbacks.onGameStart({
          roomId: payload.roomId,
          gameType: payload.gameType,
          role: payload.role,
          state: payload.state,
          reconnected: payload.reconnected || false,
          wsClient,
        });
      },

      error: (payload) => {
        console.error('Server error:', payload.message);
        if (overlay) {
          const waiting = overlay.querySelector('#lobby-waiting');
          if (waiting.style.display !== 'none') {
            showGameSelect();
          }
        }
      },

      onDisconnect: () => {},
      onReconnectFailed: () => {},
    });
  }

  function hide() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function getWsClient() {
    return wsClient;
  }

  return Object.freeze({ show, hide, getWsClient });
}
