/**
 * Suit declaration modal for Crazy 8 (shown when an 8 is played).
 */
import { SUITS, SUIT_SYMBOLS, SUIT_COLORS } from '../core/constants.js';

export function createSuitPicker(container) {
  let pickerEl = null;

  function show(onSuitChosen) {
    hide();

    pickerEl = document.createElement('div');
    pickerEl.id = 'crazy8-suit-picker';
    pickerEl.className = 'crazy8-suit-picker';

    const buttons = SUITS.map(suit => {
      const symbol = SUIT_SYMBOLS[suit];
      const color = SUIT_COLORS[suit] === 'red' ? '#D32F2F' : '#212121';
      return `<button class="crazy8-suit-btn" data-suit="${suit}" style="color: ${color}">${symbol}</button>`;
    }).join('');

    pickerEl.innerHTML = `
      <div class="crazy8-suit-picker-content">
        <h3 class="crazy8-suit-picker-title">Choose a suit</h3>
        <div class="crazy8-suit-picker-buttons">
          ${buttons}
        </div>
      </div>
    `;

    for (const btn of pickerEl.querySelectorAll('.crazy8-suit-btn')) {
      btn.addEventListener('click', () => {
        const suit = btn.dataset.suit;
        hide();
        onSuitChosen(suit);
      });
    }

    container.appendChild(pickerEl);
  }

  function hide() {
    if (pickerEl) {
      pickerEl.remove();
      pickerEl = null;
    }
  }

  return Object.freeze({ show, hide });
}
