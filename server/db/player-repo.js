/**
 * Player CRUD operations via Supabase.
 */
import { getSupabase } from '../config/supabase.js';

/**
 * Insert or update a player. Returns the player row.
 */
export async function upsertPlayer({ id, displayName, avatarUrl }) {
  const sb = getSupabase();
  const now = Date.now();

  const { error } = await sb.from('players').upsert({
    id,
    display_name: displayName,
    avatar_url: avatarUrl,
    elo: 1200,
    created_at: now,
    last_seen: now,
  }, {
    onConflict: 'id',
    ignoreDuplicates: false,
  });

  if (error) throw error;

  return getPlayer(id);
}

/**
 * Get a player by ID.
 */
export async function getPlayer(id) {
  const sb = getSupabase();
  const { data, error } = await sb.from('players').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data;
}

/**
 * Update player ELO.
 */
export async function updatePlayerElo(id, newElo) {
  const sb = getSupabase();
  await sb.from('players').update({ elo: newElo }).eq('id', id);
}

/**
 * Update last_seen timestamp.
 */
export async function touchPlayer(id) {
  const sb = getSupabase();
  await sb.from('players').update({ last_seen: Date.now() }).eq('id', id);
}

/**
 * Get all stats for a player (all game types).
 */
export async function getAllPlayerStats(playerId) {
  const sb = getSupabase();
  const { data } = await sb.from('player_stats').select('*').eq('player_id', playerId);
  return data || [];
}

/**
 * Get player profile with all stats.
 */
export async function getPlayerProfile(playerId) {
  const player = await getPlayer(playerId);
  if (!player) return null;

  const stats = await getAllPlayerStats(playerId);
  return { ...player, stats };
}
