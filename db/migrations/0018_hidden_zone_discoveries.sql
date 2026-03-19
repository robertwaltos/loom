-- 0018_hidden_zone_discoveries.sql
-- Tracks which hidden zones each kindler has discovered.
-- COPPA: no personal data; kindler_id is a UUID foreign key.

CREATE TABLE IF NOT EXISTS koydo_hidden_zone_discoveries (
  id           BIGSERIAL     PRIMARY KEY,
  kindler_id   UUID          NOT NULL,
  zone_id      VARCHAR(64)   NOT NULL,
  discovered_at BIGINT       NOT NULL,

  -- A kindler can only discover each zone once
  UNIQUE (kindler_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_hidden_zone_discoveries_kindler
  ON koydo_hidden_zone_discoveries (kindler_id);
