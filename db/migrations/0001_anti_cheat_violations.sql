-- Track player violations server-side for audit and banning
CREATE TABLE IF NOT EXISTS loom_violations (
  id             BIGSERIAL PRIMARY KEY,
  player_id      VARCHAR(128) NOT NULL,
  violation_type VARCHAR(64)  NOT NULL,  -- speed_hack, teleport, rapid_fire, sequence_replay
  severity       INTEGER      NOT NULL DEFAULT 1,
  details        TEXT,
  detected_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  penalty_tier   VARCHAR(16),            -- warn, kick, ban
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loom_violations_player   ON loom_violations(player_id);
CREATE INDEX IF NOT EXISTS idx_loom_violations_detected ON loom_violations(detected_at DESC);
