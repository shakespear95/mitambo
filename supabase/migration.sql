-- Mitambo: Supabase schema migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE players (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url   TEXT,
  elo          INTEGER NOT NULL DEFAULT 1200,
  created_at   BIGINT NOT NULL,
  last_seen    BIGINT NOT NULL
);

CREATE TABLE player_stats (
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_type   TEXT NOT NULL,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  draws       INTEGER NOT NULL DEFAULT 0,
  streak      INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, game_type)
);

CREATE TABLE games (
  id           TEXT PRIMARY KEY,
  game_type    TEXT NOT NULL,
  player1_id   TEXT NOT NULL REFERENCES players(id),
  player2_id   TEXT NOT NULL REFERENCES players(id),
  winner_id    TEXT REFERENCES players(id),
  forfeit      INTEGER NOT NULL DEFAULT 0,
  duration_s   INTEGER,
  move_count   INTEGER,
  elo_delta_p1 INTEGER,
  elo_delta_p2 INTEGER,
  played_at    BIGINT NOT NULL
);

-- ============================================================
-- 2. Row Level Security (RLS)
-- ============================================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Players: anyone authenticated can read
CREATE POLICY "players_select" ON players
  FOR SELECT TO authenticated USING (true);

-- Players: users can insert/update their own row
CREATE POLICY "players_insert_own" ON players
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid()::text);

CREATE POLICY "players_update_own" ON players
  FOR UPDATE TO authenticated USING (id = auth.uid()::text);

-- Players: service role has full access (implicit, but explicit for clarity)
CREATE POLICY "players_service_all" ON players
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Player stats: anyone authenticated can read
CREATE POLICY "player_stats_select" ON player_stats
  FOR SELECT TO authenticated USING (true);

-- Player stats: service role has full access
CREATE POLICY "player_stats_service_all" ON player_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Games: anyone authenticated can read
CREATE POLICY "games_select" ON games
  FOR SELECT TO authenticated USING (true);

-- Games: service role has full access
CREATE POLICY "games_service_all" ON games
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Auto-create player on sign-up
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.players (id, display_name, avatar_url, elo, created_at, last_seen)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Player'),
    NEW.raw_user_meta_data->>'avatar_url',
    1200,
    EXTRACT(EPOCH FROM NOW())::bigint * 1000,
    EXTRACT(EPOCH FROM NOW())::bigint * 1000
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url   = EXCLUDED.avatar_url,
    last_seen    = EXCLUDED.last_seen;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Postgres functions (replace HTTP API + SQLite transactions)
-- ============================================================

-- Record a completed game: atomic insert + ELO update + stats upsert
CREATE OR REPLACE FUNCTION public.record_game(
  game_id         TEXT,
  p_game_type     TEXT,
  p_player1_id    TEXT,
  p_player2_id    TEXT,
  p_winner_id     TEXT,
  p_forfeit       INTEGER,
  p_duration_s    INTEGER,
  p_move_count    INTEGER,
  p_elo_delta_p1  INTEGER,
  p_elo_delta_p2  INTEGER,
  p_new_elo_p1    INTEGER,
  p_new_elo_p2    INTEGER,
  p_actual_p1     NUMERIC,
  p_actual_p2     NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert game record
  INSERT INTO games (id, game_type, player1_id, player2_id, winner_id, forfeit,
                     duration_s, move_count, elo_delta_p1, elo_delta_p2, played_at)
  VALUES (game_id, p_game_type, p_player1_id, p_player2_id, p_winner_id, p_forfeit,
          p_duration_s, p_move_count, p_elo_delta_p1, p_elo_delta_p2,
          EXTRACT(EPOCH FROM NOW())::bigint * 1000);

  -- Update ELOs
  UPDATE players SET elo = p_new_elo_p1 WHERE id = p_player1_id;
  UPDATE players SET elo = p_new_elo_p2 WHERE id = p_player2_id;

  -- Upsert stats for player 1
  INSERT INTO player_stats (player_id, game_type, wins, losses, draws, streak, best_streak)
  VALUES (p_player1_id, p_game_type, 0, 0, 0, 0, 0)
  ON CONFLICT (player_id, game_type) DO NOTHING;

  IF p_actual_p1 = 1 THEN
    UPDATE player_stats SET
      wins = wins + 1,
      streak = CASE WHEN streak >= 0 THEN streak + 1 ELSE 1 END,
      best_streak = GREATEST(best_streak, CASE WHEN streak >= 0 THEN streak + 1 ELSE 1 END)
    WHERE player_id = p_player1_id AND game_type = p_game_type;
  ELSIF p_actual_p1 = 0 THEN
    UPDATE player_stats SET
      losses = losses + 1,
      streak = CASE WHEN streak <= 0 THEN streak - 1 ELSE -1 END
    WHERE player_id = p_player1_id AND game_type = p_game_type;
  ELSE
    UPDATE player_stats SET draws = draws + 1, streak = 0
    WHERE player_id = p_player1_id AND game_type = p_game_type;
  END IF;

  -- Upsert stats for player 2
  INSERT INTO player_stats (player_id, game_type, wins, losses, draws, streak, best_streak)
  VALUES (p_player2_id, p_game_type, 0, 0, 0, 0, 0)
  ON CONFLICT (player_id, game_type) DO NOTHING;

  IF p_actual_p2 = 1 THEN
    UPDATE player_stats SET
      wins = wins + 1,
      streak = CASE WHEN streak >= 0 THEN streak + 1 ELSE 1 END,
      best_streak = GREATEST(best_streak, CASE WHEN streak >= 0 THEN streak + 1 ELSE 1 END)
    WHERE player_id = p_player2_id AND game_type = p_game_type;
  ELSIF p_actual_p2 = 0 THEN
    UPDATE player_stats SET
      losses = losses + 1,
      streak = CASE WHEN streak <= 0 THEN streak - 1 ELSE -1 END
    WHERE player_id = p_player2_id AND game_type = p_game_type;
  ELSE
    UPDATE player_stats SET draws = draws + 1, streak = 0
    WHERE player_id = p_player2_id AND game_type = p_game_type;
  END IF;
END;
$$;

-- Global leaderboard by ELO
CREATE OR REPLACE FUNCTION public.get_leaderboard(result_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id           TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  elo          INTEGER,
  total_wins   BIGINT,
  total_losses BIGINT,
  total_draws  BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.elo,
    COALESCE(SUM(s.wins), 0) AS total_wins,
    COALESCE(SUM(s.losses), 0) AS total_losses,
    COALESCE(SUM(s.draws), 0) AS total_draws
  FROM players p
  LEFT JOIN player_stats s ON p.id = s.player_id
  GROUP BY p.id
  ORDER BY p.elo DESC
  LIMIT result_limit;
$$;

-- Per-game leaderboard
CREATE OR REPLACE FUNCTION public.get_game_leaderboard(
  p_game_type TEXT,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id           TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  elo          INTEGER,
  wins         INTEGER,
  losses       INTEGER,
  draws        INTEGER,
  streak       INTEGER,
  best_streak  INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.elo,
    s.wins, s.losses, s.draws, s.streak, s.best_streak
  FROM players p
  INNER JOIN player_stats s ON p.id = s.player_id
  WHERE s.game_type = p_game_type
  ORDER BY s.wins DESC
  LIMIT result_limit;
$$;

-- Player profile with stats
CREATE OR REPLACE FUNCTION public.get_player_profile(player_id_param TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'elo', p.elo,
    'created_at', p.created_at,
    'last_seen', p.last_seen,
    'stats', COALESCE(
      (SELECT json_agg(json_build_object(
        'game_type', s.game_type,
        'wins', s.wins,
        'losses', s.losses,
        'draws', s.draws,
        'streak', s.streak,
        'best_streak', s.best_streak
      ))
      FROM player_stats s WHERE s.player_id = p.id),
      '[]'::json
    )
  ) INTO result
  FROM players p
  WHERE p.id = player_id_param;

  RETURN result;
END;
$$;
