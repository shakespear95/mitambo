/**
 * Tsoro setup wizard - multi-step configuration screen.
 * Steps: Pebble count -> Bank A -> Direction A -> Bank B -> Direction B
 */
import { PEBBLE_OPTIONS, DIRECTION_CW, DIRECTION_CCW, TSORO_FSM_STATES } from '../core/constants.js';

export function createTsoroSetupScreen(container) {
  let overlayEl = null;

  /**
   * Show the pebble count selection step.
   */
  function showPebbleSelection(onSelect) {
    hide();

    overlayEl = document.createElement('div');
    overlayEl.id = 'tsoro-setup';
    overlayEl.className = 'tsoro-setup-overlay';

    overlayEl.innerHTML = `
      <div class="tsoro-setup-content">
        <h2 class="tsoro-setup-title">Tsoro Setup</h2>
        <p class="tsoro-setup-step">Step 1 of 5</p>
        <p class="tsoro-setup-label">How many pebbles per hole?</p>
        <div class="tsoro-setup-buttons">
          ${PEBBLE_OPTIONS.map(n => `
            <button class="tsoro-setup-btn" data-pebbles="${n}">
              ${n} Pebbles
            </button>
          `).join('')}
        </div>
      </div>
    `;

    for (const btn of overlayEl.querySelectorAll('.tsoro-setup-btn')) {
      btn.addEventListener('click', () => {
        onSelect(parseInt(btn.dataset.pebbles, 10));
      });
    }

    container.appendChild(overlayEl);
  }

  /**
   * Show the bank selection step (click on canvas).
   */
  function showBankSelection(player, stepNumber) {
    hide();

    overlayEl = document.createElement('div');
    overlayEl.id = 'tsoro-setup';
    overlayEl.className = 'tsoro-setup-overlay tsoro-setup-transparent';

    overlayEl.innerHTML = `
      <div class="tsoro-setup-banner">
        <p class="tsoro-setup-step">Step ${stepNumber} of 5</p>
        <p class="tsoro-setup-label">Player ${player}: Click a hole to set as your bank</p>
        <p class="tsoro-setup-hint">The bank starts empty - collect all pebbles here to win!</p>
      </div>
    `;

    container.appendChild(overlayEl);
  }

  /**
   * Show the direction selection step.
   */
  function showDirectionSelection(player, stepNumber, onSelect) {
    hide();

    overlayEl = document.createElement('div');
    overlayEl.id = 'tsoro-setup';
    overlayEl.className = 'tsoro-setup-overlay';

    overlayEl.innerHTML = `
      <div class="tsoro-setup-content">
        <p class="tsoro-setup-step">Step ${stepNumber} of 5</p>
        <p class="tsoro-setup-label">Player ${player}: Choose sowing direction</p>
        <div class="tsoro-setup-buttons">
          <button class="tsoro-setup-btn tsoro-dir-btn" data-dir="${DIRECTION_CW}">
            <span class="tsoro-dir-arrow">&#8635;</span>
            Clockwise
          </button>
          <button class="tsoro-setup-btn tsoro-dir-btn" data-dir="${DIRECTION_CCW}">
            <span class="tsoro-dir-arrow">&#8634;</span>
            Counter-Clockwise
          </button>
        </div>
      </div>
    `;

    for (const btn of overlayEl.querySelectorAll('.tsoro-setup-btn')) {
      btn.addEventListener('click', () => {
        onSelect(btn.dataset.dir);
      });
    }

    container.appendChild(overlayEl);
  }

  function hide() {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
    const existing = container.querySelector('#tsoro-setup');
    if (existing) existing.remove();
  }

  return Object.freeze({ showPebbleSelection, showBankSelection, showDirectionSelection, hide });
}
