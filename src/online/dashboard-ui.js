/**
 * Stats dashboard and leaderboard panel.
 */
import { getSupabaseClient } from './supabase-config.js';

/**
 * Create the dashboard overlay.
 *
 * @param {HTMLElement} container
 * @param {function} onBack - Return to lobby
 */
export function createDashboardUI(container, onBack) {
  let overlay = null;

  async function show() {
    hide();

    overlay = document.createElement('div');
    overlay.className = 'dashboard-overlay';
    overlay.innerHTML = `
      <div class="dashboard-content">
        <div class="dashboard-header">
          <h2 class="dashboard-title">Stats & Rankings</h2>
          <button class="dashboard-close-btn" id="dashboard-close">Back</button>
        </div>

        <div class="dashboard-tabs">
          <button class="dashboard-tab active" data-tab="profile">Profile</button>
          <button class="dashboard-tab" data-tab="leaderboard">Leaderboard</button>
        </div>

        <div class="dashboard-panel" id="dashboard-profile">
          <div class="dashboard-loading">Loading...</div>
        </div>

        <div class="dashboard-panel" id="dashboard-leaderboard" style="display:none">
          <div class="dashboard-loading">Loading...</div>
        </div>
      </div>
    `;

    overlay.querySelector('#dashboard-close').addEventListener('click', () => {
      hide();
      onBack();
    });

    // Tab switching
    for (const tab of overlay.querySelectorAll('.dashboard-tab')) {
      tab.addEventListener('click', () => {
        for (const t of overlay.querySelectorAll('.dashboard-tab')) t.classList.remove('active');
        tab.classList.add('active');

        overlay.querySelector('#dashboard-profile').style.display =
          tab.dataset.tab === 'profile' ? '' : 'none';
        overlay.querySelector('#dashboard-leaderboard').style.display =
          tab.dataset.tab === 'leaderboard' ? '' : 'none';
      });
    }

    container.appendChild(overlay);

    // Load data
    await Promise.all([loadProfile(), loadLeaderboard()]);
  }

  async function loadProfile() {
    const panel = overlay?.querySelector('#dashboard-profile');
    if (!panel) return;

    try {
      const sb = getSupabaseClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const { data: profile, error } = await sb.rpc('get_player_profile', {
        player_id_param: session.user.id,
      });

      if (error) throw error;
      if (!profile) throw new Error('Profile not found');

      const statsHtml = (profile.stats || []).map(s => `
        <div class="dashboard-stat-row">
          <span class="dashboard-stat-game">${formatGameType(s.game_type)}</span>
          <span class="dashboard-stat-record">${s.wins}W / ${s.losses}L / ${s.draws}D</span>
          <span class="dashboard-stat-streak">Streak: ${s.streak} (Best: ${s.best_streak})</span>
        </div>
      `).join('') || '<p>No games played yet.</p>';

      panel.innerHTML = `
        <div class="dashboard-profile-header">
          ${profile.avatar_url ? `<img class="dashboard-avatar" src="${profile.avatar_url}" alt="">` : ''}
          <div>
            <h3 class="dashboard-name">${profile.display_name}</h3>
            <span class="dashboard-elo">ELO: ${profile.elo}</span>
          </div>
        </div>
        <h4 class="dashboard-section-title">Game Stats</h4>
        ${statsHtml}
      `;
    } catch (err) {
      panel.innerHTML = '<p class="dashboard-error">Failed to load profile.</p>';
    }
  }

  async function loadLeaderboard() {
    const panel = overlay?.querySelector('#dashboard-leaderboard');
    if (!panel) return;

    try {
      const sb = getSupabaseClient();
      const { data: leaderboard, error } = await sb.rpc('get_leaderboard', {
        result_limit: 20,
      });

      if (error) throw error;

      if (!leaderboard || leaderboard.length === 0) {
        panel.innerHTML = '<p>No players yet.</p>';
        return;
      }

      const rows = leaderboard.map((p, i) => `
        <tr>
          <td class="lb-rank">${i + 1}</td>
          <td class="lb-name">${p.display_name}</td>
          <td class="lb-elo">${p.elo}</td>
          <td class="lb-record">${p.total_wins}W / ${p.total_losses}L</td>
        </tr>
      `).join('');

      panel.innerHTML = `
        <table class="dashboard-leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>ELO</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    } catch (err) {
      panel.innerHTML = '<p class="dashboard-error">Failed to load leaderboard.</p>';
    }
  }

  function hide() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  return Object.freeze({ show, hide });
}

function formatGameType(type) {
  const names = { damii: 'Damii', tsoro: 'Tsoro', crazy8: 'Crazy 8' };
  return names[type] || type;
}
