-- Adventure Progress
-- Tracks per-kindler state for each adventure (started / completed / mastered).
-- COPPA note: kindler_id is an opaque UUID — no real child PII.
-- All timestamps: BIGINT unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS koydo_adventure_progress (
  id                     BIGSERIAL       PRIMARY KEY,
  kindler_id             UUID            NOT NULL,
  entry_id               VARCHAR(64)     NOT NULL,
  state                  VARCHAR(16)     NOT NULL DEFAULT 'in_progress',
  -- 'in_progress' | 'completed' | 'mastered'
  started_at             BIGINT          NOT NULL,
  completed_at           BIGINT,
  interaction_count      INT             NOT NULL DEFAULT 0,
  luminance_contributed  NUMERIC(6,4)    NOT NULL DEFAULT 0.0000,

  CONSTRAINT uq_adventure_progress UNIQUE (kindler_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_adventure_progress_kindler ON koydo_adventure_progress (kindler_id);
CREATE INDEX IF NOT EXISTS idx_adventure_progress_entry   ON koydo_adventure_progress (entry_id);
