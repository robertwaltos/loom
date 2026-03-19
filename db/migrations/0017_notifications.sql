-- Notifications
-- Delivers async messages to kindlers and parents (achievements, world events, system alerts).
-- COPPA-safe: no personal data in body; recipient_id is a UUID; no retention past 30 days.
-- All timestamps: BIGINT unix epoch milliseconds.

CREATE TABLE IF NOT EXISTS koydo_notifications (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID         NOT NULL,
  type          VARCHAR(64)  NOT NULL,   -- 'achievement_unlock' | 'world_event' | 'quest_complete' | 'system'
  title         TEXT         NOT NULL,
  body          TEXT         NOT NULL,
  read          BOOLEAN      NOT NULL DEFAULT false,
  created_at    BIGINT       NOT NULL,
  expires_at    BIGINT                  -- NULL = never expires; COPPA auto-delete at 30 days
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON koydo_notifications (recipient_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires   ON koydo_notifications (expires_at) WHERE expires_at IS NOT NULL;
