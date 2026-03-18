-- Mini-Game Attempts
-- Tracks per-kindler attempts and scores for each mini-game.
-- All timestamps: BIGINT unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS koydo_mini_game_attempts (
  id               BIGSERIAL    PRIMARY KEY,
  game_id          VARCHAR(64)  NOT NULL,
  kindler_id       UUID         NOT NULL,
  score            INT          NOT NULL DEFAULT 0,
  max_score        INT          NOT NULL DEFAULT 100,
  difficulty       INT          NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 10),
  completed        BOOLEAN      NOT NULL DEFAULT true,
  time_taken_ms    INT,                      -- NULL if not tracked
  completed_at     BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mini_game_attempts_game    ON koydo_mini_game_attempts (game_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_attempts_kindler ON koydo_mini_game_attempts (kindler_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_attempts_when    ON koydo_mini_game_attempts (completed_at DESC);
