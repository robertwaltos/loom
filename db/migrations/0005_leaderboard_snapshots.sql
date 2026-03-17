CREATE TABLE IF NOT EXISTS loom_leaderboard_snapshots (
  id           BIGSERIAL    PRIMARY KEY,
  board_id     VARCHAR(64)  NOT NULL,
  player_id    VARCHAR(128) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  score        NUMERIC(30, 0) NOT NULL,  -- bigint-compatible
  rank         INTEGER      NOT NULL,
  snapshot_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loom_lb_board    ON loom_leaderboard_snapshots(board_id, rank);
CREATE INDEX IF NOT EXISTS idx_loom_lb_player   ON loom_leaderboard_snapshots(player_id);
CREATE INDEX IF NOT EXISTS idx_loom_lb_snapshot ON loom_leaderboard_snapshots(snapshot_at DESC);
