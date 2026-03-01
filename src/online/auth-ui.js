/**
 * Google Sign-In overlay using Supabase Auth.
 */
import { getSupabaseClient } from './supabase-config.js';

/**
 * Create the auth UI overlay.
 *
 * @param {HTMLElement} container - UI container
 * @param {object} callbacks
 * @param {function} callbacks.onSignedIn - Called after sign-in
 * @param {function} callbacks.onPlayOffline - Called when user chooses offline
 */
export function createAuthUI(container, callbacks) {
  let overlay = null;

  function show() {
    hide();

    overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.innerHTML = `
      <div class="auth-content">
        <h1 class="auth-title">Mitambo</h1>
        <h2 class="auth-subtitle">Zimbabwean Board Games</h2>

        <div class="auth-buttons">
          <button class="auth-btn auth-btn-google" id="auth-google-btn">
            <svg class="auth-google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div class="auth-divider">
            <span>or</span>
          </div>

          <button class="auth-btn auth-btn-offline" id="auth-offline-btn">
            Play Offline
          </button>
        </div>

        <p class="auth-note">Sign in to play online against other players</p>
      </div>
    `;

    overlay.querySelector('#auth-google-btn').addEventListener('click', handleGoogleSignIn);
    overlay.querySelector('#auth-offline-btn').addEventListener('click', () => {
      hide();
      callbacks.onPlayOffline();
    });

    container.appendChild(overlay);
  }

  async function handleGoogleSignIn() {
    const btn = overlay.querySelector('#auth-google-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const sb = getSupabaseClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      // Supabase will redirect to Google and back — the onAuthStateChange
      // listener in main.js will pick up the session on return.
    } catch (err) {
      console.error('Sign-in failed:', err);
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="auth-google-icon" viewBox="0 0 24 24" width="20" height="20">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      `;

      const note = overlay.querySelector('.auth-note');
      note.textContent = 'Sign-in failed. Please try again.';
      note.style.color = '#e74c3c';
      setTimeout(() => {
        note.textContent = 'Sign in to play online against other players';
        note.style.color = '';
      }, 3000);
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
