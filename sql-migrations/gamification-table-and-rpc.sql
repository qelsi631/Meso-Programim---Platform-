-- ============================================================
-- Gamification table + server-side streak RPC
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the user_gamification table
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp         INTEGER   NOT NULL DEFAULT 0,
  level            INTEGER   NOT NULL DEFAULT 1,
  streak           INTEGER   NOT NULL DEFAULT 0,
  longest_streak   INTEGER   NOT NULL DEFAULT 0,
  last_active_date DATE,
  lessons_completed INTEGER  NOT NULL DEFAULT 0,
  quizzes_completed INTEGER  NOT NULL DEFAULT 0,
  perfect_quizzes   INTEGER  NOT NULL DEFAULT 0,
  achievements      JSONB    NOT NULL DEFAULT '[]'::JSONB,
  daily_quest       JSONB,
  daily_quest_date  DATE,
  daily_quest_progress JSONB NOT NULL DEFAULT '{}'::JSONB,
  xp_history        JSONB    NOT NULL DEFAULT '[]'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies — users can only read/write their own row
CREATE POLICY "Users can view own gamification"
  ON user_gamification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification"
  ON user_gamification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
  ON user_gamification FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Server-side streak RPC
--    Uses CURRENT_DATE (server UTC) so users cannot manipulate their clock.
--    Atomically handles: already-touched-today, continue streak, reset streak.
CREATE OR REPLACE FUNCTION touch_streak()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID    := auth.uid();
  v_today    DATE    := CURRENT_DATE;
  v_yesterday DATE   := CURRENT_DATE - INTERVAL '1 day';
  v_row      user_gamification%ROWTYPE;
  v_new_streak INTEGER;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure row exists (first-time user)
  INSERT INTO user_gamification (user_id, streak, last_active_date)
  VALUES (v_user_id, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row for atomic update
  SELECT * INTO v_row
  FROM user_gamification
  WHERE user_id = v_user_id
  FOR UPDATE;

  -- Already active today → no change
  IF v_row.last_active_date = v_today THEN
    RETURN jsonb_build_object(
      'streak',           v_row.streak,
      'longest_streak',   v_row.longest_streak,
      'last_active_date', v_today::TEXT,
      'already_touched',  true,
      'server_date',      v_today::TEXT
    );
  END IF;

  -- Was active yesterday → continue streak
  IF v_row.last_active_date = v_yesterday THEN
    v_new_streak := v_row.streak + 1;
  ELSE
    -- Gap of 2+ days (or first ever) → reset to 1
    v_new_streak := 1;
  END IF;

  UPDATE user_gamification
  SET streak           = v_new_streak,
      longest_streak   = GREATEST(v_row.longest_streak, v_new_streak),
      last_active_date = v_today,
      updated_at       = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'streak',           v_new_streak,
    'longest_streak',   GREATEST(v_row.longest_streak, v_new_streak),
    'last_active_date', v_today::TEXT,
    'already_touched',  false,
    'server_date',      v_today::TEXT
  );
END;
$$;

-- 5. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION touch_streak() TO authenticated;
