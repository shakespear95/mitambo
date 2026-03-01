/**
 * Game history storage and ELO calculation.
 * ELO math stays in JS; atomic DB write via Supabase RPC.
 */
import { randomUUID } from 'node:crypto';
import { getSupabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const K_NORMAL = 32;
const K_FORFEIT = 16;

/**
 * Calculate expected score using ELO formula.
 */
function expectedScore(myElo, oppElo) {
  return 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
}

/**
 * Calculate new ELO after a game result.
 * actual: 1 = win, 0.5 = draw, 0 = loss
 */
function calcNewElo(currentElo, oppElo, actual, isForfeit) {
  const k = isForfeit ? K_FORFEIT : K_NORMAL;
  const expected = expectedScore(currentElo, oppElo);
  return Math.round(currentElo + k * (actual - expected));
}

/**
 * Record a completed game result and update ELO + stats.
 *
 * @param {object} params
 * @param {string} params.gameType - 'damii', 'tsoro', 'crazy8'
 * @param {string} params.player1Id
 * @param {string} params.player2Id
 * @param {string|null} params.winnerId - or null for draw
 * @param {boolean} params.forfeit
 * @param {number} params.durationS
 * @param {number} params.moveCount
 * @returns {Promise<object>} The game result with ELO deltas
 */
export async function recordGame({ gameType, player1Id, player2Id, winnerId, forfeit, durationS, moveCount }) {
  const sb = getSupabase();

  // Fetch current ELOs
  const { data: p1 } = await sb.from('players').select('elo').eq('id', player1Id).single();
  const { data: p2 } = await sb.from('players').select('elo').eq('id', player2Id).single();

  if (!p1 || !p2) throw new Error('Player not found');

  // Calculate ELO deltas
  let actual1, actual2;
  if (winnerId === null) {
    actual1 = 0.5;
    actual2 = 0.5;
  } else if (winnerId === player1Id) {
    actual1 = 1;
    actual2 = 0;
  } else {
    actual1 = 0;
    actual2 = 1;
  }

  const newElo1 = calcNewElo(p1.elo, p2.elo, actual1, forfeit && winnerId !== player1Id);
  const newElo2 = calcNewElo(p2.elo, p1.elo, actual2, forfeit && winnerId !== player2Id);
  const delta1 = newElo1 - p1.elo;
  const delta2 = newElo2 - p2.elo;

  const gameId = randomUUID();

  // Atomic write via Supabase RPC
  const { error } = await sb.rpc('record_game', {
    game_id: gameId,
    p_game_type: gameType,
    p_player1_id: player1Id,
    p_player2_id: player2Id,
    p_winner_id: winnerId,
    p_forfeit: forfeit ? 1 : 0,
    p_duration_s: durationS,
    p_move_count: moveCount,
    p_elo_delta_p1: delta1,
    p_elo_delta_p2: delta2,
    p_new_elo_p1: newElo1,
    p_new_elo_p2: newElo2,
    p_actual_p1: actual1,
    p_actual_p2: actual2,
  });

  if (error) {
    logger.error('record_game RPC failed:', error.message);
    throw error;
  }

  return {
    id: gameId,
    gameType,
    player1Id,
    player2Id,
    winnerId,
    forfeit,
    durationS,
    moveCount,
    eloDelta: { [player1Id]: delta1, [player2Id]: delta2 },
    newElo: { [player1Id]: newElo1, [player2Id]: newElo2 },
  };
}
