-- AI Conversation Sessions — COPPA Safety Tracking
-- Tracks active AI guide conversations. No transcript content is ever stored.
-- Sessions auto-delete after 24 hours (enforced by application logic).
-- All timestamps: BIGINT unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS ai_conversation_sessions (
  id              UUID         PRIMARY KEY,
  kindler_id      UUID         NOT NULL,          -- soft ref — profiles may be deleted
  character_id    VARCHAR(64)  NOT NULL,
  world_id        VARCHAR(128) NOT NULL,
  started_at      BIGINT       NOT NULL,
  ended_at        BIGINT,                          -- null while session is open
  turn_count      INTEGER      NOT NULL DEFAULT 0,
  auto_delete_at  BIGINT       NOT NULL            -- server enforces deletion after this epoch ms
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_kindler        ON ai_conversation_sessions (kindler_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_auto_delete    ON ai_conversation_sessions (auto_delete_at);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_started        ON ai_conversation_sessions (started_at DESC);

-- Partial index for fast pending-deletion queries
CREATE INDEX IF NOT EXISTS idx_ai_sessions_pending_delete
  ON ai_conversation_sessions (auto_delete_at)
  WHERE ended_at IS NULL;
