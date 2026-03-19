-- Quest Chain Progress
-- Tracks per-kindler progress through cross-world quest chains.
-- A row represents a completed step; completion is inferred from step count vs definition.
-- All timestamps: BIGINT unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS koydo_quest_progress (
  id            BIGSERIAL    PRIMARY KEY,
  kindler_id    UUID         NOT NULL,
  quest_id      VARCHAR(64)  NOT NULL,
  step_index    INT          NOT NULL CHECK (step_index >= 0),
  completed_at  BIGINT       NOT NULL,
  UNIQUE (kindler_id, quest_id, step_index)
);

-- Track quest start time separately to avoid counting non-started quests
CREATE TABLE IF NOT EXISTS koydo_quest_starts (
  kindler_id   UUID         NOT NULL,
  quest_id     VARCHAR(64)  NOT NULL,
  started_at   BIGINT       NOT NULL,
  PRIMARY KEY (kindler_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_kindler ON koydo_quest_progress (kindler_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest   ON koydo_quest_progress (quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_starts_kindler   ON koydo_quest_starts (kindler_id);
