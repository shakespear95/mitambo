/**
 * Main menu screen - mode selection.
 */
import { MODE_LOCAL, MODE_AI } from '../core/constants.js';

export function createMenuScreen(container, onStart) {
  function show() {
    hide();

    const menu = document.createElement('div');
    menu.id = 'menu-screen';
    menu.className = 'menu-screen';

    menu.innerHTML = `
      <div class="menu-content">
        <h1 class="menu-title">Damii</h1>
        <h2 class="menu-subtitle">Zimbabwean Checkers</h2>

        <div class="menu-buttons">
          <button class="menu-btn" data-mode="${MODE_LOCAL}">
            <span class="menu-btn-icon">👥</span>
            <span class="menu-btn-text">2 Players (Local)</span>
          </button>

          <div class="ai-section">
            <div class="ai-label">Play vs AI</div>
            <button class="menu-btn menu-btn-ai" data-mode="${MODE_AI}" data-difficulty="EASY">
              <span class="menu-btn-icon">🤖</span>
              <span class="menu-btn-text">Easy</span>
            </button>
            <button class="menu-btn menu-btn-ai" data-mode="${MODE_AI}" data-difficulty="MEDIUM">
              <span class="menu-btn-icon">🤖</span>
              <span class="menu-btn-text">Medium</span>
            </button>
            <button class="menu-btn menu-btn-ai" data-mode="${MODE_AI}" data-difficulty="HARD">
              <span class="menu-btn-icon">🤖</span>
              <span class="menu-btn-text">Hard</span>
            </button>
          </div>
        </div>

        <div class="menu-rules">
          <details>
            <summary>Game Rules</summary>
            <ul>
              <li>Regular pieces move forward diagonally</li>
              <li>Regular pieces capture both forward AND backward</li>
              <li>Captures are mandatory - you must capture if able</li>
              <li>Multi-jump chains must be completed</li>
              <li>Kings move like chess bishops (any distance diagonally)</li>
              <li>Kings fly-capture: jump enemies at distance</li>
              <li><strong>Hukura:</strong> Call out missed captures to penalize opponent!</li>
              <li>Win by capturing all enemy pieces or blocking all moves</li>
            </ul>
          </details>
        </div>
      </div>
    `;

    // Attach event listeners
    const buttons = menu.querySelectorAll('.menu-btn');
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const difficulty = btn.dataset.difficulty || null;
        onStart(mode, difficulty);
      });
    }

    container.appendChild(menu);
  }

  function hide() {
    const existing = container.querySelector('#menu-screen');
    if (existing) existing.remove();
  }

  return { show, hide };
}
