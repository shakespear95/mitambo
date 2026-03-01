/**
 * HUD - turn indicator, scores, move counter.
 */
import { PLAYER_1, PLAYER_2, COLORS, DRAW_MOVE_LIMIT } from '../core/constants.js';
import { countPieces } from '../core/board.js';

export function createGameUI(container) {
  let hudEl = null;

  function show() {
    hide();

    hudEl = document.createElement('div');
    hudEl.id = 'game-hud';
    hudEl.className = 'game-hud';

    hudEl.innerHTML = `
      <div class="hud-player hud-player-1">
        <div class="hud-player-indicator" id="indicator-p1"></div>
        <span class="hud-player-name">Player 1 (Dark)</span>
        <span class="hud-piece-count" id="count-p1">12</span>
      </div>
      <div class="hud-center">
        <div class="hud-turn" id="turn-display">Player 1's Turn</div>
        <div class="hud-move-counter" id="move-counter">Moves without capture: 0 / ${DRAW_MOVE_LIMIT}</div>
      </div>
      <div class="hud-player hud-player-2">
        <div class="hud-player-indicator" id="indicator-p2"></div>
        <span class="hud-player-name">Player 2 (Light)</span>
        <span class="hud-piece-count" id="count-p2">12</span>
      </div>
    `;

    container.appendChild(hudEl);
  }

  function update(gameState) {
    if (!hudEl) return;

    const turnDisplay = hudEl.querySelector('#turn-display');
    const moveCounter = hudEl.querySelector('#move-counter');
    const countP1 = hudEl.querySelector('#count-p1');
    const countP2 = hudEl.querySelector('#count-p2');
    const indP1 = hudEl.querySelector('#indicator-p1');
    const indP2 = hudEl.querySelector('#indicator-p2');

    const playerName = gameState.currentPlayer === PLAYER_1 ? 'Player 1 (Dark)' : 'Player 2 (Light)';
    turnDisplay.textContent = `${playerName}'s Turn`;
    turnDisplay.style.color = gameState.currentPlayer === PLAYER_1 ? '#fff' : COLORS.PIECE_LIGHT;

    moveCounter.textContent = `Moves without capture: ${gameState.movesSinceCapture} / ${DRAW_MOVE_LIMIT}`;

    const p1Count = countPieces(gameState.board, PLAYER_1);
    const p2Count = countPieces(gameState.board, PLAYER_2);
    countP1.textContent = p1Count;
    countP2.textContent = p2Count;

    // Active player indicator
    indP1.classList.toggle('active', gameState.currentPlayer === PLAYER_1);
    indP2.classList.toggle('active', gameState.currentPlayer === PLAYER_2);
  }

  function showAIThinking() {
    if (!hudEl) return;
    const turnDisplay = hudEl.querySelector('#turn-display');
    turnDisplay.textContent = 'AI is thinking...';
    turnDisplay.classList.add('thinking');
  }

  function hideAIThinking() {
    if (!hudEl) return;
    const turnDisplay = hudEl.querySelector('#turn-display');
    turnDisplay.classList.remove('thinking');
  }

  function hide() {
    if (hudEl) {
      hudEl.remove();
      hudEl = null;
    }
  }

  return { show, update, showAIThinking, hideAIThinking, hide };
}
