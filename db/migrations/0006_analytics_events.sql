CREATE TABLE IF NOT EXISTS loom_analytics_events (
  id          BIGSERIAL    PRIMARY KEY,
  event_type  VARCHAR(64)  NOT NULL,
  player_id   VARCHAR(128),
  world_id    VARCHAR(64),
  session_id  VARCHAR(128),
  properties  JSONB        NOT NULL DEFAULT '{}',
  server_time TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  client_time TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_loom_analytics_type   ON loom_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_loom_analytics_player ON loom_analytics_events(player_id);
CREATE INDEX IF NOT EXISTS idx_loom_analytics_time   ON loom_analytics_events(server_time DESC);
