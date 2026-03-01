/**
 * Hukura button rendering and interaction.
 */
import { PLAYER_1, PLAYER_2 } from '../core/constants.js';

export function createHukuraUI(container) {
  let buttonEl = null;
  let timerEl = null;
  let animationId = null;

  function show(callingPlayer, hukuraManager, onCall) {
    hide();

    const wrapper = document.createElement('div');
    wrapper.id = 'hukura-container';
    wrapper.className = 'hukura-container';

    const playerName = callingPlayer === PLAYER_1 ? 'Player 1 (Dark)' : 'Player 2 (Light)';

    buttonEl = document.createElement('button');
    buttonEl.className = 'hukura-button';
    buttonEl.textContent = 'HUKURA!';
    buttonEl.title = `${playerName}: Call out missed capture!`;
    buttonEl.addEventListener('click', () => {
      onCall();
      hide();
    });

    timerEl = document.createElement('div');
    timerEl.className = 'hukura-timer';

    const label = document.createElement('div');
    label.className = 'hukura-label';
    label.textContent = `${playerName} - Missed capture detected!`;

    wrapper.appendChild(label);
    wrapper.appendChild(buttonEl);
    wrapper.appendChild(timerEl);
    container.appendChild(wrapper);

    // Animate timer bar
    function updateTimer() {
      const remaining = hukuraManager.getTimeRemaining();
      const fraction = remaining / 5000;
      if (timerEl) {
        timerEl.style.width = `${fraction * 100}%`;
      }
      if (remaining > 0 && hukuraManager.isActive()) {
        animationId = requestAnimationFrame(updateTimer);
      }
    }
    updateTimer();
  }

  function hide() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    const existing = container.querySelector('#hukura-container');
    if (existing) {
      existing.remove();
    }
    buttonEl = null;
    timerEl = null;
  }

  return { show, hide };
}
