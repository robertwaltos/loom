-- Kindler Core Tables
-- All child progression data. COPPA: no real names, no location, no email.
-- All timestamps: BIGINT unix epoch milliseconds.

-- ─── Kindler Profiles ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kindler_profiles (
  id                  UUID         PRIMARY KEY,
  parent_account_id   UUID         NOT NULL REFERENCES parent_accounts (id) ON DELETE CASCADE,
  display_name        VARCHAR(20)  NOT NULL,     -- nickname only, never real name (COPPA)
  age_tier            SMALLINT     NOT NULL CHECK (age_tier IN (1, 2, 3)),  -- 1=5-6, 2=7-8, 3=9-10
  avatar_id           VARCHAR(64)  NOT NULL,
  spark_level         DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (spark_level BETWEEN 0.0 AND 1.0),
  current_chapter     VARCHAR(32)  NOT NULL DEFAULT 'first_light',
  worlds_visited      TEXT[]       NOT NULL DEFAULT '{}',
  worlds_restored     TEXT[]       NOT NULL DEFAULT '{}',
  guides_met_count    INTEGER      NOT NULL DEFAULT 0,
  created_at          BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kindler_profiles_parent ON kindler_profiles (parent_account_id);
CREATE INDEX IF NOT EXISTS idx_kindler_profiles_created ON kindler_profiles (created_at);

-- ─── Kindler Progress (completed entries) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS kindler_progress (
  id              UUID         PRIMARY KEY,
  kindler_id      UUID         NOT NULL REFERENCES kindler_profiles (id) ON DELETE CASCADE,
  entry_id        VARCHAR(128) NOT NULL,
  completed_at    BIGINT       NOT NULL,
  adventure_type  VARCHAR(64)  NOT NULL,
  score           SMALLINT,    -- 0-100, nullable (not all entries are scored)
  UNIQUE (kindler_id, entry_id)  -- each entry completed at most once per kindler
);

CREATE INDEX IF NOT EXISTS idx_kindler_progress_kindler ON kindler_progress (kindler_id);
CREATE INDEX IF NOT EXISTS idx_kindler_progress_completed ON kindler_progress (completed_at);

-- ─── Kindler Sessions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kindler_sessions (
  id                  UUID         PRIMARY KEY,
  kindler_id          UUID         NOT NULL REFERENCES kindler_profiles (id) ON DELETE CASCADE,
  started_at          BIGINT       NOT NULL,
  ended_at            BIGINT,      -- null while session is open
  worlds_visited      TEXT[]       NOT NULL DEFAULT '{}',
  guides_interacted   TEXT[]       NOT NULL DEFAULT '{}',
  entries_completed   TEXT[]       NOT NULL DEFAULT '{}',
  spark_delta         DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_kindler_sessions_kindler ON kindler_sessions (kindler_id);
CREATE INDEX IF NOT EXISTS idx_kindler_sessions_started ON kindler_sessions (started_at DESC);

-- ─── Kindler Spark Log ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kindler_spark_log (
  id          UUID             PRIMARY KEY,
  kindler_id  UUID             NOT NULL REFERENCES kindler_profiles (id) ON DELETE CASCADE,
  spark_level DOUBLE PRECISION NOT NULL,
  delta       DOUBLE PRECISION NOT NULL,
  cause       VARCHAR(64)      NOT NULL,
  timestamp   BIGINT           NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spark_log_kindler ON kindler_spark_log (kindler_id);
CREATE INDEX IF NOT EXISTS idx_spark_log_timestamp ON kindler_spark_log (timestamp DESC);

-- ─── Session Reports (AI-generated summaries — no transcript) ─────────────────

CREATE TABLE IF NOT EXISTS session_reports (
  id                  UUID         PRIMARY KEY,
  session_id          UUID         NOT NULL REFERENCES kindler_sessions (id) ON DELETE CASCADE,
  kindler_id          UUID         NOT NULL REFERENCES kindler_profiles (id) ON DELETE CASCADE,
  summary             TEXT         NOT NULL,
  worlds_explored     TEXT[]       NOT NULL DEFAULT '{}',
  subjects_addressed  TEXT[]       NOT NULL DEFAULT '{}',
  generated_at        BIGINT       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_reports_kindler ON session_reports (kindler_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_session ON session_reports (session_id);
