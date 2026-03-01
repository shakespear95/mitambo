/**
 * Common online adapter utilities.
 * Shared between all game-specific online adapters.
 */

/**
 * Create a disconnect/reconnect overlay.
 */
export function createDisconnectOverlay(container) {
  let overlay = null;

  function show(gracePeriodMs) {
    hide();
    overlay = document.createElement('div');
    overlay.className = 'disconnect-overlay';
    overlay.innerHTML = `
      <div class="disconnect-content">
        <h3>Opponent Disconnected</h3>
        <p>Waiting for reconnection...</p>
        <div class="disconnect-timer-bar">
          <div class="disconnect-timer-fill" id="disconnect-timer-fill"></div>
        </div>
        <p class="disconnect-timer-text" id="disconnect-timer-text"></p>
      </div>
    `;

    container.appendChild(overlay);

    // Animate timer
    const startTime = Date.now();
    const fill = overlay.querySelector('#disconnect-timer-fill');
    const text = overlay.querySelector('#disconnect-timer-text');

    const updateTimer = () => {
      if (!overlay) return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, gracePeriodMs - elapsed);
      const pct = (elapsed / gracePeriodMs) * 100;
      fill.style.width = `${Math.min(100, pct)}%`;
      text.textContent = `${Math.ceil(remaining / 1000)}s remaining`;

      if (remaining > 0) {
        requestAnimationFrame(updateTimer);
      }
    };
    requestAnimationFrame(updateTimer);
  }

  function hide() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  return Object.freeze({ show, hide });
}

/**
 * Create a game-over overlay for online matches.
 */
export function createOnlineGameOverScreen(container) {
  let overlay = null;

  function show({ winnerId, yourUid, reason, eloDelta, newElo, onRematch, onLobby }) {
    hide();

    const isWinner = winnerId === yourUid;
    const isDraw = winnerId === null;

    let title, message;
    if (isDraw) {
      title = 'Draw!';
      message = 'The game ended in a draw.';
    } else if (isWinner) {
      title = 'Victory!';
      message = reason === 'forfeit' ? 'Opponent forfeited.' : 'You won the game!';
    } else {
      title = 'Defeat';
      message = reason === 'forfeit' ? 'You forfeited by disconnecting.' : 'You lost the game.';
    }

    const eloChange = eloDelta && eloDelta[yourUid] ? eloDelta[yourUid] : 0;
    const eloText = eloChange >= 0 ? `+${eloChange}` : `${eloChange}`;
    const currentElo = newElo && newElo[yourUid] ? newElo[yourUid] : '?';

    overlay = document.createElement('div');
    overlay.className = 'game-over-screen';
    overlay.innerHTML = `
      <div class="game-over-content">
        <h2 class="game-over-title">${title}</h2>
        <p class="game-over-message">${message}</p>
        <p class="game-over-elo">ELO: ${currentElo} (${eloText})</p>
        <div class="online-game-over-buttons">
          <button class="game-over-btn" id="online-lobby-btn">Back to Lobby</button>
        </div>
      </div>
    `;

    overlay.querySelector('#online-lobby-btn').addEventListener('click', () => {
      hide();
      onLobby();
    });

    container.appendChild(overlay);
  }

  function hide() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  return Object.freeze({ show, hide });
}
