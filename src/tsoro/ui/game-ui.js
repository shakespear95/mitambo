/**
 * Tsoro HUD - player indicators, bank counts, progress bars, turn info.
 */
import { PLAYER_A, PLAYER_B, TSORO_COLORS } from '../core/constants.js';
import { getBankCount, getTotalPebbles } from '../core/board.js';

export function createTsoroGameUI(container) {
  let hudEl = null;

  function show() {
    hide();

    hudEl = document.createElement('div');
    hudEl.id = 'tsoro-hud';
    hudEl.className = 'tsoro-hud';

    hudEl.innerHTML = `
      <div class="tsoro-hud-player tsoro-hud-player-a">
        <div class="tsoro-hud-indicator" id="tsoro-ind-a"></div>
        <span class="tsoro-hud-name">Player A</span>
        <span class="tsoro-hud-bank" id="tsoro-bank-a">Bank: 0</span>
        <div class="tsoro-hud-progress-wrap">
          <div class="tsoro-hud-progress" id="tsoro-progress-a"></div>
        </div>
      </div>
      <div class="tsoro-hud-center">
        <div class="tsoro-hud-turn" id="tsoro-turn">Player A's Turn</div>
        <div class="tsoro-hud-turn-count" id="tsoro-turn-count">Turn 1</div>
      </div>
      <div class="tsoro-hud-player tsoro-hud-player-b">
        <div class="tsoro-hud-indicator" id="tsoro-ind-b"></div>
        <span class="tsoro-hud-name">Player B</span>
        <span class="tsoro-hud-bank" id="tsoro-bank-b">Bank: 0</span>
        <div class="tsoro-hud-progress-wrap">
          <div class="tsoro-hud-progress" id="tsoro-progress-b"></div>
        </div>
      </div>
    `;

    container.appendChild(hudEl);
  }

  function update(gameState) {
    if (!hudEl) return;

    const { board, setup, currentPlayer, turnCount } = gameState;
    const bankA = setup.bankA;
    const bankB = setup.bankB;

    // Turn display
    const turnEl = hudEl.querySelector('#tsoro-turn');
    const turnCountEl = hudEl.querySelector('#tsoro-turn-count');
    const playerName = currentPlayer === PLAYER_A ? 'Player A' : 'Player B';
    turnEl.textContent = `${playerName}'s Turn`;
    turnEl.style.color = currentPlayer === PLAYER_A ? TSORO_COLORS.PLAYER_A : '#fff';
    turnCountEl.textContent = `Turn ${turnCount + 1}`;

    // Bank counts
    const bankCountA = bankA !== null ? getBankCount(board, PLAYER_A, bankA) : 0;
    const bankCountB = bankB !== null ? getBankCount(board, PLAYER_B, bankB) : 0;
    hudEl.querySelector('#tsoro-bank-a').textContent = `Bank: ${bankCountA}`;
    hudEl.querySelector('#tsoro-bank-b').textContent = `Bank: ${bankCountB}`;

    // Progress bars
    const totalA = getTotalPebbles(board, PLAYER_A) || 1;
    const totalB = getTotalPebbles(board, PLAYER_B) || 1;

    const progressA = bankA !== null ? (bankCountA / totalA) * 100 : 0;
    const progressB = bankB !== null ? (bankCountB / totalB) * 100 : 0;
    hudEl.querySelector('#tsoro-progress-a').style.width = `${Math.min(progressA, 100)}%`;
    hudEl.querySelector('#tsoro-progress-b').style.width = `${Math.min(progressB, 100)}%`;

    // Active player indicators
    const indA = hudEl.querySelector('#tsoro-ind-a');
    const indB = hudEl.querySelector('#tsoro-ind-b');
    indA.classList.toggle('active', currentPlayer === PLAYER_A);
    indB.classList.toggle('active', currentPlayer === PLAYER_B);
  }

  function hide() {
    if (hudEl) {
      hudEl.remove();
      hudEl = null;
    }
  }

  return Object.freeze({ show, update, hide });
}
