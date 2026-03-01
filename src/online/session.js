/**
 * Session management via Supabase Auth.
 * Supabase manages tokens automatically in localStorage.
 */
import { getSupabaseClient } from './supabase-config.js';

/**
 * Get the current access token (JWT) from Supabase session.
 * @returns {Promise<string|null>}
 */
export async function getAccessToken() {
  const sb = getSupabaseClient();
  if (!sb) return null;

  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Get the current player profile from the players table.
 * @returns {Promise<object|null>}
 */
export async function getPlayer() {
  const sb = getSupabaseClient();
  if (!sb) return null;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;

  const { data, error } = await sb.from('players').select('*').eq('id', session.user.id).single();
  if (error || !data) return null;

  return data;
}

/**
 * Check if a Supabase auth session exists.
 * Checks localStorage for Supabase auth token (synchronous heuristic).
 * @returns {boolean}
 */
export function hasSession() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
      return true;
    }
  }
  return false;
}

/**
 * Sign out and clear session.
 * @returns {Promise<void>}
 */
export async function clearSession() {
  const sb = getSupabaseClient();
  if (sb) {
    await sb.auth.signOut();
  }
}
