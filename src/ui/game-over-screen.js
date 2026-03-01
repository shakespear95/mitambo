/**
 * Win/draw overlay screen.
 */
import { PLAYER_1 } from '../core/constants.js';

export function createGameOverScreen(container, onRestart) {
  function show(winner, drawReason) {
    hide();

    const overlay = document.createElement('div');
    overlay.id = 'game-over-screen';
    overlay.className = 'game-over-screen';

    let message;
    if (drawReason) {
      message = drawReason;
    } else if (winner) {
      const playerName = winner === PLAYER_1 ? 'Player 1 (Dark)' : 'Player 2 (Light)';
      message = `${playerName} Wins!`;
    }

    overlay.innerHTML = `
      <div class="game-over-content">
        <h2 class="game-over-title">${drawReason ? 'Draw!' : 'Victory!'}</h2>
        <p class="game-over-message">${message}</p>
        <button class="game-over-btn" id="restart-btn">Play Again</button>
      </div>
    `;

    overlay.querySelector('#restart-btn').addEventListener('click', () => {
      onRestart();
    });

    container.appendChild(overlay);
  }

  function hide() {
    const existing = container.querySelector('#game-over-screen');
    if (existing) existing.remove();
  }

  return { show, hide };
}
