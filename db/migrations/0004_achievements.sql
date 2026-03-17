CREATE TABLE IF NOT EXISTS loom_achievements (
  achievement_id VARCHAR(64)  NOT NULL,
  player_id      VARCHAR(128) NOT NULL,
  unlocked_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  progress       INTEGER      NOT NULL DEFAULT 100,  -- 0-100
  metadata       JSONB,
  PRIMARY KEY (achievement_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_loom_achievements_player ON loom_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_loom_achievements_id     ON loom_achievements(achievement_id);
