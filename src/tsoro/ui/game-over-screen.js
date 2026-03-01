/**
 * Tsoro game over / victory screen.
 */
import { PLAYER_A } from '../core/constants.js';

export function createTsoroGameOverScreen(container) {
  function show(winner, onPlayAgain, onBackToMenu) {
    hide();

    const overlay = document.createElement('div');
    overlay.id = 'tsoro-game-over';
    overlay.className = 'game-over-screen';

    const playerName = winner === PLAYER_A ? 'Player A' : 'Player B';

    overlay.innerHTML = `
      <div class="game-over-content">
        <h2 class="game-over-title">Victory!</h2>
        <p class="game-over-message">${playerName} collected all pebbles!</p>
        <div class="tsoro-game-over-buttons">
          <button class="game-over-btn" id="tsoro-play-again">Play Again</button>
          <button class="game-over-btn tsoro-back-btn" id="tsoro-back-menu">Back to Games</button>
        </div>
      </div>
    `;

    overlay.querySelector('#tsoro-play-again').addEventListener('click', () => {
      hide();
      onPlayAgain();
    });

    overlay.querySelector('#tsoro-back-menu').addEventListener('click', () => {
      hide();
      onBackToMenu();
    });

    container.appendChild(overlay);
  }

  function hide() {
    const existing = container.querySelector('#tsoro-game-over');
    if (existing) existing.remove();
  }

  return Object.freeze({ show, hide });
}
