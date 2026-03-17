CREATE TABLE IF NOT EXISTS loom_feature_flags (
  flag_name       VARCHAR(128) PRIMARY KEY,
  enabled         BOOLEAN      NOT NULL DEFAULT FALSE,
  rollout_pct     SMALLINT     NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  allowed_players TEXT[],      -- specific player IDs in allow-list
  description     TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
