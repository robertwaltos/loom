-- World Luminance — The Fading System
-- Tracks per-world restoration state. Persisted so luminance survives server restarts.
-- All timestamps: BIGINT unix epoch milliseconds.

-- ─── Current luminance state (one row per world) ───────────────────────────────

CREATE TABLE IF NOT EXISTS world_luminance (
  world_id                    VARCHAR(128) PRIMARY KEY,
  luminance                   DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (luminance BETWEEN 0.0 AND 1.0),
  stage                       VARCHAR(16)  NOT NULL DEFAULT 'dimming'
                                CHECK (stage IN ('radiant','glowing','dimming','fading','deep_fade')),
  last_restored_at            BIGINT       NOT NULL,
  total_kindlers_contributed  INTEGER      NOT NULL DEFAULT 0,
  active_kindler_count        INTEGER      NOT NULL DEFAULT 0
);

-- ─── Luminance change audit log ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS world_luminance_log (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id    VARCHAR(128)     NOT NULL,
  luminance   DOUBLE PRECISION NOT NULL,
  stage       VARCHAR(16)      NOT NULL,
  delta       DOUBLE PRECISION NOT NULL,
  cause       VARCHAR(64)      NOT NULL
                CHECK (cause IN ('kindler_progress','natural_decay','collaborative_quest','deep_fade_event')),
  timestamp   BIGINT           NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_luminance_log_world    ON world_luminance_log (world_id);
CREATE INDEX IF NOT EXISTS idx_luminance_log_timestamp ON world_luminance_log (timestamp DESC);
