/**
 * Server-side Supabase admin client (service role).
 */
import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let client = null;

/**
 * Initialize the Supabase admin client with service role key.
 */
export function initSupabase() {
  if (client) return client;

  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info('Supabase admin client initialized');
  return client;
}

/**
 * Get the Supabase admin client singleton.
 * @returns {object}
 */
export function getSupabase() {
  if (!client) throw new Error('Supabase not initialized');
  return client;
}

/**
 * Verify a Supabase access token (JWT).
 * Returns the user object or null if invalid.
 *
 * @param {string} token - Supabase access token
 * @returns {Promise<object|null>} user or null
 */
export async function verifyAccessToken(token) {
  if (!token) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
