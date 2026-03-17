CREATE TABLE IF NOT EXISTS loom_support_tickets (
  ticket_id        VARCHAR(32)  PRIMARY KEY,
  reporter_id      VARCHAR(128) NOT NULL,
  target_player_id VARCHAR(128),
  category         VARCHAR(64)  NOT NULL,  -- cheating, harassment, spam, inappropriate_content, bug, other
  description      TEXT         NOT NULL,
  world_id         VARCHAR(64),
  evidence_url     TEXT,
  status           VARCHAR(32)  NOT NULL DEFAULT 'open',  -- open, investigating, resolved, closed
  moderator_id     VARCHAR(128),
  resolution_note  TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loom_tickets_reporter ON loom_support_tickets(reporter_id);
CREATE INDEX IF NOT EXISTS idx_loom_tickets_target   ON loom_support_tickets(target_player_id);
CREATE INDEX IF NOT EXISTS idx_loom_tickets_status   ON loom_support_tickets(status);
