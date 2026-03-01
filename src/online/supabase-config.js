/**
 * Supabase client-side configuration.
 * Public credentials only — identifies the Supabase project.
 *
 * Replace these values with your actual Supabase project config.
 * Get them from Supabase Dashboard → Settings → API.
 */

const SUPABASE_URL = 'https://nnfeeudozvihdmmuyvzh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kCQ_qc553MKlkECYOwc2BQ_kVm-9dIm';

let client = null;

/**
 * Initialize the Supabase client singleton.
 * @returns {boolean} true if Supabase SDK is available
 */
export function initSupabaseClient() {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('Supabase SDK not loaded — online features disabled');
    return false;
  }

  if (!client) {
    client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return true;
}

/**
 * Get the Supabase client singleton.
 * @returns {object|null}
 */
export function getSupabaseClient() {
  return client;
}
