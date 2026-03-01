/**
 * Game selector screen - pick between Damii, Tsoro, and Crazy 8.
 */

export function createGameSelector(container, onSelect) {
  function show() {
    hide();

    const selector = document.createElement('div');
    selector.id = 'game-selector';
    selector.className = 'game-selector';

    selector.innerHTML = `
      <div class="game-selector-content">
        <h1 class="game-selector-title">Mitambo</h1>
        <h2 class="game-selector-subtitle">Zimbabwean Board Games</h2>

        <div class="game-selector-cards">
          <button class="game-card" data-game="damii">
            <div class="game-card-icon">
              <svg viewBox="0 0 60 60" width="60" height="60">
                <circle cx="30" cy="30" r="22" fill="#1a1a1a" stroke="#333" stroke-width="2"/>
                <circle cx="30" cy="30" r="18" fill="none" stroke="#555" stroke-width="1"/>
                <circle cx="28" cy="26" r="4" fill="rgba(255,255,255,0.1)"/>
              </svg>
            </div>
            <h3 class="game-card-title">Damii</h3>
            <p class="game-card-desc">Zimbabwean Checkers with the Hukura rule</p>
          </button>

          <button class="game-card" data-game="tsoro">
            <div class="game-card-icon">
              <svg viewBox="0 0 60 60" width="60" height="60">
                <circle cx="15" cy="20" r="6" fill="#8a8a8a" stroke="#666" stroke-width="1"/>
                <circle cx="35" cy="18" r="5" fill="#7a7a7a" stroke="#666" stroke-width="1"/>
                <circle cx="25" cy="35" r="7" fill="#9a9a9a" stroke="#666" stroke-width="1"/>
                <circle cx="45" cy="38" r="5" fill="#8a8a8a" stroke="#666" stroke-width="1"/>
              </svg>
            </div>
            <h3 class="game-card-title">Tsoro</h3>
            <p class="game-card-desc">Pebble sowing race - collect all stones in your bank!</p>
          </button>

          <button class="game-card" data-game="crazy8">
            <div class="game-card-icon">
              <svg viewBox="0 0 60 60" width="60" height="60">
                <rect x="10" y="8" width="30" height="44" rx="3" fill="#fff" stroke="#999" stroke-width="1.5"/>
                <text x="17" y="24" font-size="14" font-weight="bold" fill="#D32F2F">8</text>
                <text x="17" y="40" font-size="16" fill="#D32F2F">&#x2665;</text>
                <rect x="24" y="12" width="30" height="44" rx="3" fill="#1565C0" stroke="#0D47A1" stroke-width="1"/>
                <line x1="31" y1="20" x2="47" y2="48" stroke="#0D47A1" stroke-width="1"/>
                <line x1="47" y1="20" x2="31" y2="48" stroke="#0D47A1" stroke-width="1"/>
              </svg>
            </div>
            <h3 class="game-card-title">Crazy 8</h3>
            <p class="game-card-desc">Classic card game - match suits and ranks, play your 8s wild!</p>
          </button>
        </div>
      </div>
    `;

    for (const card of selector.querySelectorAll('.game-card')) {
      card.addEventListener('click', () => {
        onSelect(card.dataset.game);
      });
    }

    container.appendChild(selector);
  }

  function hide() {
    const existing = container.querySelector('#game-selector');
    if (existing) existing.remove();
  }

  return Object.freeze({ show, hide });
}
