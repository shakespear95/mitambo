/**
 * Difficulty & sound settings panel.
 */

export function createSettingsPanel(container, onSettingsChange) {
  let panelEl = null;
  let settings = {
    soundEnabled: true,
    showHints: true,
  };

  function show() {
    hide();

    panelEl = document.createElement('div');
    panelEl.id = 'settings-panel';
    panelEl.className = 'settings-panel';

    panelEl.innerHTML = `
      <div class="settings-row">
        <label>
          <input type="checkbox" id="setting-sound" ${settings.soundEnabled ? 'checked' : ''}>
          Sound Effects
        </label>
      </div>
      <div class="settings-row">
        <label>
          <input type="checkbox" id="setting-hints" ${settings.showHints ? 'checked' : ''}>
          Show Move Hints
        </label>
      </div>
    `;

    panelEl.querySelector('#setting-sound').addEventListener('change', (e) => {
      settings = { ...settings, soundEnabled: e.target.checked };
      onSettingsChange(settings);
    });

    panelEl.querySelector('#setting-hints').addEventListener('change', (e) => {
      settings = { ...settings, showHints: e.target.checked };
      onSettingsChange(settings);
    });

    container.appendChild(panelEl);
  }

  function hide() {
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
    }
  }

  function getSettings() {
    return { ...settings };
  }

  return { show, hide, getSettings };
}
