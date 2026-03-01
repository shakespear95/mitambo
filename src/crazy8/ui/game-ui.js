/**
 * Crazy 8 HUD - turn indicator, card counts, call display, status messages.
 */
import { HUMAN, AI, CRAZY8_FSM, SUIT_SYMBOLS } from '../core/constants.js';
import { getCurrentPlayer, getCallStatus } from '../core/state.js';

export function createCrazy8GameUI(container) {
  let hudEl = null;

  function show() {
    hide();

    hudEl = document.createElement('div');
    hudEl.id = 'crazy8-hud';
    hudEl.className = 'crazy8-hud';

    hudEl.innerHTML = `
      <div class="crazy8-hud-top">
        <div class="crazy8-hud-player crazy8-hud-ai">
          <div class="crazy8-hud-indicator" id="crazy8-ind-ai"></div>
          <span class="crazy8-hud-name">AI</span>
          <span class="crazy8-hud-cards" id="crazy8-cards-ai">4 cards</span>
        </div>
        <div class="crazy8-hud-center">
          <div class="crazy8-hud-turn" id="crazy8-turn">Your Turn</div>
          <div class="crazy8-hud-status" id="crazy8-status"></div>
        </div>
        <div class="crazy8-hud-player crazy8-hud-human">
          <div class="crazy8-hud-indicator" id="crazy8-ind-human"></div>
          <span class="crazy8-hud-name">You</span>
          <span class="crazy8-hud-cards" id="crazy8-cards-human">4 cards</span>
        </div>
      </div>
      <div class="crazy8-hud-call" id="crazy8-call"></div>
    `;

    container.appendChild(hudEl);
  }

  function update(gameState) {
    if (!hudEl) return;

    const current = getCurrentPlayer(gameState);
    const humanCards = gameState.hands[HUMAN].length;
    const aiCards = gameState.hands[AI].length;

    // Card counts
    hudEl.querySelector('#crazy8-cards-human').textContent = `${humanCards} card${humanCards !== 1 ? 's' : ''}`;
    hudEl.querySelector('#crazy8-cards-ai').textContent = `${aiCards} card${aiCards !== 1 ? 's' : ''}`;

    // Active player indicators
    const indHuman = hudEl.querySelector('#crazy8-ind-human');
    const indAi = hudEl.querySelector('#crazy8-ind-ai');
    indHuman.classList.toggle('active', current === HUMAN);
    indAi.classList.toggle('active', current === AI);

    // Turn display
    const turnEl = hudEl.querySelector('#crazy8-turn');
    const statusEl = hudEl.querySelector('#crazy8-status');

    if (gameState.fsmState === CRAZY8_FSM.GAME_OVER) {
      turnEl.textContent = gameState.winner === HUMAN ? 'You Win!' : 'AI Wins!';
      turnEl.classList.remove('thinking');
      statusEl.textContent = '';
    } else if (gameState.fsmState === CRAZY8_FSM.AI_THINKING) {
      turnEl.textContent = 'AI Thinking...';
      turnEl.classList.add('thinking');
      statusEl.textContent = '';
    } else if (current === HUMAN) {
      turnEl.classList.remove('thinking');

      if (gameState.fsmState === CRAZY8_FSM.CHOOSING_SUIT) {
        turnEl.textContent = 'Choose a suit';
        statusEl.textContent = '';
      } else if (gameState.fsmState === CRAZY8_FSM.CARRY_ON) {
        turnEl.textContent = 'Carry on!';
        const symbol = gameState.carryOnSuit ? SUIT_SYMBOLS[gameState.carryOnSuit] : '';
        statusEl.textContent = `Play a ${symbol} or draw`;
      } else if (gameState.fsmState === CRAZY8_FSM.DRAWN_PLAY_OPTION) {
        turnEl.textContent = 'Play drawn card?';
        statusEl.textContent = 'Click the card or draw pile to pass';
      } else if (gameState.pendingPickup > 0) {
        turnEl.textContent = 'Your Turn';
        statusEl.textContent = `Block or pick up ${gameState.pendingPickup}!`;
      } else {
        turnEl.textContent = 'Your Turn';
        statusEl.textContent = '';
      }
    } else {
      turnEl.textContent = 'AI Turn';
      turnEl.classList.remove('thinking');
      statusEl.textContent = '';
    }

    // Call display
    const callEl = hudEl.querySelector('#crazy8-call');
    const callStatus = gameState.lastCall;
    if (callStatus === 'halfCard') {
      callEl.textContent = 'Half Card!';
      callEl.className = 'crazy8-hud-call crazy8-call-active';
    } else if (callStatus === 'card') {
      callEl.textContent = 'Card!';
      callEl.className = 'crazy8-hud-call crazy8-call-active crazy8-call-warning';
    } else {
      callEl.textContent = '';
      callEl.className = 'crazy8-hud-call';
    }
  }

  function hide() {
    if (hudEl) {
      hudEl.remove();
      hudEl = null;
    }
  }

  return Object.freeze({ show, update, hide });
}
