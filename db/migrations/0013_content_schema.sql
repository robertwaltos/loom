-- Content Schema
-- Tables for Koydo educational content. Seeded from universe/content/ via db/seed-content.ts.
-- The application serves content from in-memory engine; the DB is the canonical persistent store
-- and is used for curriculum standards lookups in progress reports.

-- ─── World Entries ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS real_world_entries (
  id                  VARCHAR(128) PRIMARY KEY,
  type                VARCHAR(64)  NOT NULL,
  title               VARCHAR(256) NOT NULL,
  year                INTEGER,
  year_display        VARCHAR(64)  NOT NULL,
  era                 VARCHAR(64)  NOT NULL,
  description_child   TEXT         NOT NULL,
  description_older   TEXT         NOT NULL,
  description_parent  TEXT         NOT NULL,
  real_people         TEXT[]       NOT NULL DEFAULT '{}',
  quote               TEXT,
  quote_attribution   VARCHAR(256),
  geographic_location JSONB,                   -- { lat, lng, name } | null
  continent           VARCHAR(64),
  subject_tags        TEXT[]       NOT NULL DEFAULT '{}',
  world_id            VARCHAR(128) NOT NULL,
  guide_id            VARCHAR(128) NOT NULL,
  adventure_type      VARCHAR(64)  NOT NULL,
  difficulty_tier     SMALLINT     NOT NULL CHECK (difficulty_tier IN (1, 2, 3)),
  prerequisites       TEXT[]       NOT NULL DEFAULT '{}',
  unlocks             TEXT[]       NOT NULL DEFAULT '{}',
  fun_fact            TEXT         NOT NULL DEFAULT '',
  image_prompt        TEXT         NOT NULL DEFAULT '',
  status              VARCHAR(32)  NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_entries_world_id     ON real_world_entries (world_id);
CREATE INDEX IF NOT EXISTS idx_entries_difficulty   ON real_world_entries (difficulty_tier);
CREATE INDEX IF NOT EXISTS idx_entries_subject_tags ON real_world_entries USING GIN (subject_tags);

-- ─── Entry Connections (prerequisite / unlock graph) ──────────────────────────

CREATE TABLE IF NOT EXISTS entry_connections (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entry_id   VARCHAR(128) NOT NULL REFERENCES real_world_entries (id) ON DELETE CASCADE,
  to_entry_id     VARCHAR(128) NOT NULL REFERENCES real_world_entries (id) ON DELETE CASCADE,
  connection_type VARCHAR(16)  NOT NULL
                    CHECK (connection_type IN ('related','prerequisite','unlocks','cross_world')),
  UNIQUE (from_entry_id, to_entry_id, connection_type)
);

CREATE INDEX IF NOT EXISTS idx_connections_from ON entry_connections (from_entry_id);
CREATE INDEX IF NOT EXISTS idx_connections_to   ON entry_connections (to_entry_id);

-- ─── Curriculum Standards Map ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entry_curriculum_map (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      VARCHAR(128) NOT NULL REFERENCES real_world_entries (id) ON DELETE CASCADE,
  standard      VARCHAR(32)  NOT NULL
                  CHECK (standard IN ('common_core','ngss','state_financial_literacy')),
  standard_code VARCHAR(64)  NOT NULL,
  description   TEXT         NOT NULL,
  UNIQUE (entry_id, standard_code)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_entry   ON entry_curriculum_map (entry_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_standard ON entry_curriculum_map (standard_code);

-- ─── Quiz Questions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entry_quiz_questions (
  id              VARCHAR(128) PRIMARY KEY,
  entry_id        VARCHAR(128) NOT NULL REFERENCES real_world_entries (id) ON DELETE CASCADE,
  difficulty_tier SMALLINT     NOT NULL CHECK (difficulty_tier IN (1, 2, 3)),
  question        TEXT         NOT NULL,
  options         TEXT[]       NOT NULL,
  correct_index   SMALLINT     NOT NULL,
  explanation     TEXT         NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_entry ON entry_quiz_questions (entry_id);

-- ─── Media Assets ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entry_media_assets (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     VARCHAR(128) NOT NULL REFERENCES real_world_entries (id) ON DELETE CASCADE,
  asset_type   VARCHAR(32)  NOT NULL
                 CHECK (asset_type IN ('remembrance_art','field_trip_env','artifact_visual','audio','render')),
  url          TEXT         NOT NULL,
  generated_at BIGINT       NOT NULL,
  provider     VARCHAR(32)  NOT NULL CHECK (provider IN ('fal_ai','manual','metahuman'))
);

CREATE INDEX IF NOT EXISTS idx_assets_entry ON entry_media_assets (entry_id);
