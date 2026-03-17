CREATE TABLE IF NOT EXISTS loom_bans (
  id           BIGSERIAL    PRIMARY KEY,
  player_id    VARCHAR(128) NOT NULL,
  ban_type     VARCHAR(16)  NOT NULL DEFAULT 'temp',  -- temp, permanent
  reason       TEXT         NOT NULL,
  moderator_id VARCHAR(128),
  banned_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ,           -- NULL = permanent
  lifted_at    TIMESTAMPTZ,
  lifted_by    VARCHAR(128),
  ticket_id    VARCHAR(32)  REFERENCES loom_support_tickets(ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_loom_bans_player ON loom_bans(player_id);
-- Only one active (non-lifted) ban per player at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_loom_bans_active ON loom_bans(player_id) WHERE lifted_at IS NULL;
