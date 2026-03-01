/**
 * Crazy 8 game over / winner screen.
 */
import { HUMAN } from '../core/constants.js';

export function createCrazy8GameOverScreen(container) {
  function show(winner, onPlayAgain, onBackToMenu) {
    hide();

    const overlay = document.createElement('div');
    overlay.id = 'crazy8-game-over';
    overlay.className = 'game-over-screen';

    const isHumanWin = winner === HUMAN;
    const title = isHumanWin ? 'You Win!' : 'AI Wins!';
    const message = isHumanWin ? 'In Air! All cards played.' : 'The AI went out first.';

    overlay.innerHTML = `
      <div class="game-over-content">
        <h2 class="game-over-title">${title}</h2>
        <p class="game-over-message">${message}</p>
        <div class="crazy8-game-over-buttons">
          <button class="game-over-btn" id="crazy8-play-again">Play Again</button>
          <button class="game-over-btn crazy8-back-btn" id="crazy8-back-menu">Back to Games</button>
        </div>
      </div>
    `;

    overlay.querySelector('#crazy8-play-again').addEventListener('click', () => {
      hide();
      onPlayAgain();
    });

    overlay.querySelector('#crazy8-back-menu').addEventListener('click', () => {
      hide();
      onBackToMenu();
    });

    container.appendChild(overlay);
  }

  function hide() {
    const existing = container.querySelector('#crazy8-game-over');
    if (existing) existing.remove();
  }

  return Object.freeze({ show, hide });
}
