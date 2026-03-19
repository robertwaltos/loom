# The Concord — Database Reference

> **Database:** PostgreSQL (+ TimescaleDB extension for analytics hypertables)
> **Cache:** Redis (ioredis)
> **Migration runner:** `db/migrate.ts` — runs all SQL files in `db/migrations/` in order
> **Seeder:** `db/seed-content.ts` — seeds `real_world_entries` from universe/content/
> **Last verified:** 2026-03-19 from db/migrations/ source files

---

## Running Migrations

```bash
# Apply all pending migrations
npx tsx db/migrate.ts

# Seed content entries
npm run db:seed:content
```

---

## Migration Index

19 migrations applied in sequence:

| Migration | File | Creates |
|---|---|---|
| 0001 | `0001_anti_cheat_violations.sql` | `loom_violations` |
| 0002 | `0002_support_tickets.sql` | Support ticket tables |
| 0003 | `0003_bans.sql` | Ban management tables |
| 0004 | `0004_achievements.sql` | `loom_achievements` |
| 0005 | `0005_leaderboard_snapshots.sql` | Leaderboard snapshot tables |
| 0006 | `0006_analytics_events.sql` | Analytics event tables |
| 0007 | `0007_feature_flags.sql` | Feature flag tables |
| 0008 | `0008_parent_accounts.sql` | `parent_accounts` |
| 0009 | `0009_kindler_core.sql` | `kindler_profiles`, `kindler_progress`, `kindler_sessions`, `kindler_spark_log`, `session_reports` |
| 0010 | `0010_world_luminance.sql` | World luminance tracking tables |
| 0011 | `0011_ai_conversation_sessions.sql` | AI conversation session tables |
| 0012 | `0012_revenue.sql` | `revenue_events`, `royalty_ledger` |
| 0013 | `0013_content_schema.sql` | `real_world_entries`, `entry_connections`, `entry_curriculum_map`, `entry_quiz_questions`, `entry_media_assets` |
| 0014 | `0014_adventure_progress.sql` | Adventure progress tables |
| 0015 | `0015_mini_game_attempts.sql` | Mini-game attempt tables |
| 0016 | `0016_quest_chains.sql` | Quest chain state tables |
| 0017 | `0017_notifications.sql` | Notification tables |
| 0018 | `0018_hidden_zone_discoveries.sql` | `hidden_zone_discoveries` |
| 0019 | `0019_accessibility_profiles.sql` | Accessibility profile tables |

---

## Key Table Schemas

### `loom_violations` (0001)

Server-side anti-cheat audit log.

```sql
CREATE TABLE loom_violations (
  id             BIGSERIAL PRIMARY KEY,
  player_id      VARCHAR(128) NOT NULL,
  violation_type VARCHAR(64)  NOT NULL,  -- speed_hack, teleport, rapid_fire, sequence_replay
  severity       INTEGER      NOT NULL DEFAULT 1,
  details        TEXT,
  detected_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  penalty_tier   VARCHAR(16),            -- warn, kick, ban
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

Indexes: `player_id`, `detected_at DESC`

### `loom_achievements` (0004)

Achievement unlock records.

```sql
CREATE TABLE loom_achievements (
  achievement_id VARCHAR(64)  NOT NULL,
  player_id      VARCHAR(128) NOT NULL,
  unlocked_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  progress       INTEGER      NOT NULL DEFAULT 100,  -- 0-100
  metadata       JSONB,
  PRIMARY KEY (achievement_id, player_id)
);
```

### `parent_accounts` (0008)

Parent user accounts. Kindler profiles reference this table. All COPPA compliance flows through this relationship.

### `kindler_profiles` (0009)

Child player profiles. COPPA-compliant: no real names, no location, no email stored here.

```sql
CREATE TABLE kindler_profiles (
  id                  UUID         PRIMARY KEY,
  parent_account_id   UUID         NOT NULL REFERENCES parent_accounts(id) ON DELETE CASCADE,
  display_name        VARCHAR(20)  NOT NULL,  -- nickname only, never real name
  age_tier            SMALLINT     NOT NULL CHECK (age_tier IN (1, 2, 3)),  -- 1=5-6, 2=7-8, 3=9-10
  avatar_id           VARCHAR(64)  NOT NULL,
  spark_level         DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (spark_level BETWEEN 0.0 AND 1.0),
  current_chapter     VARCHAR(32)  NOT NULL DEFAULT 'first_light',
  worlds_visited      TEXT[]       NOT NULL DEFAULT '{}',
  worlds_restored     TEXT[]       NOT NULL DEFAULT '{}',
  guides_met_count    INTEGER      NOT NULL DEFAULT 0,
  created_at          BIGINT       NOT NULL  -- unix epoch ms
);
```

### `kindler_progress` (0009)

Per-entry completion records. Each entry is completed at most once per kindler (UNIQUE constraint).

```sql
CREATE TABLE kindler_progress (
  id              UUID         PRIMARY KEY,
  kindler_id      UUID         NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  entry_id        VARCHAR(128) NOT NULL,
  completed_at    BIGINT       NOT NULL,
  adventure_type  VARCHAR(64)  NOT NULL,
  score           SMALLINT,    -- 0-100, nullable (not all entries are scored)
  UNIQUE (kindler_id, entry_id)
);
```

### `kindler_sessions` (0009)

Game session records.

```sql
CREATE TABLE kindler_sessions (
  id                  UUID         PRIMARY KEY,
  kindler_id          UUID         NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  started_at          BIGINT       NOT NULL,
  ended_at            BIGINT,      -- null while session is open
  worlds_visited      TEXT[]       NOT NULL DEFAULT '{}',
  guides_interacted   TEXT[]       NOT NULL DEFAULT '{}',
  entries_completed   TEXT[]       NOT NULL DEFAULT '{}',
  spark_delta         DOUBLE PRECISION NOT NULL DEFAULT 0.0
);
```

### `kindler_spark_log` (0009)

Audit log for all Spark level changes.

```sql
CREATE TABLE kindler_spark_log (
  id          UUID             PRIMARY KEY,
  kindler_id  UUID             NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  spark_level DOUBLE PRECISION NOT NULL,
  delta       DOUBLE PRECISION NOT NULL,
  cause       VARCHAR(64)      NOT NULL,  -- e.g. 'lesson_completed', 'world_restored'
  timestamp   BIGINT           NOT NULL
);
```

### `session_reports` (0009)

AI-generated session summaries. No transcript stored — only structured summary fields.

```sql
CREATE TABLE session_reports (
  id                  UUID         PRIMARY KEY,
  session_id          UUID         NOT NULL REFERENCES kindler_sessions(id) ON DELETE CASCADE,
  kindler_id          UUID         NOT NULL REFERENCES kindler_profiles(id) ON DELETE CASCADE,
  summary             TEXT         NOT NULL,
  worlds_explored     TEXT[]       NOT NULL DEFAULT '{}',
  subjects_addressed  TEXT[]       NOT NULL DEFAULT '{}',
  generated_at        BIGINT       NOT NULL
);
```

### `revenue_events` (0012)

IAP and subscription revenue events for Epic royalty calculation.

```sql
CREATE TABLE revenue_events (
  id                  UUID         PRIMARY KEY,
  event_type          VARCHAR(16)  NOT NULL CHECK (event_type IN ('subscription','iap','other')),
  gross_amount_usd    NUMERIC(12,4) NOT NULL,
  net_amount_usd      NUMERIC(12,4) NOT NULL,
  platform            VARCHAR(16)  NOT NULL CHECK (platform IN ('ios','android','epic','console','web')),
  payment_processor   VARCHAR(16)  NOT NULL CHECK (payment_processor IN ('apple','google','stripe','epic','other')),
  user_id             VARCHAR(128) NOT NULL,
  transaction_id      VARCHAR(256) NOT NULL UNIQUE,
  created_at          BIGINT       NOT NULL
);
```

### `royalty_ledger` (0012)

Quarterly Epic royalty report records.

```sql
CREATE TABLE royalty_ledger (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter                   VARCHAR(7)    NOT NULL UNIQUE,  -- e.g. '2025-Q1'
  total_gross_revenue       NUMERIC(16,4) NOT NULL,
  epic_store_revenue        NUMERIC(16,4) NOT NULL,
  royalty_eligible_revenue  NUMERIC(16,4) NOT NULL,
  cumulative_lifetime_gross NUMERIC(16,4) NOT NULL,
  royalty_rate              NUMERIC(5,4)  NOT NULL,         -- 0.05 = 5%
  royalty_owed              NUMERIC(16,4) NOT NULL,
  threshold_note            TEXT          NOT NULL DEFAULT '',
  report_submitted          BOOLEAN       NOT NULL DEFAULT FALSE,
  report_submitted_at       BIGINT,
  payment_status            VARCHAR(16)   NOT NULL DEFAULT 'not_due'
                              CHECK (payment_status IN ('not_due','pending','paid')),
  created_at                BIGINT        NOT NULL
);
```

### `real_world_entries` (0013)

The canonical content table. Seeded from universe/content/ via `db/seed-content.ts`. Application serves content from in-memory ContentEngine; this table is the persistent backing store.

```sql
CREATE TABLE real_world_entries (
  id                  VARCHAR(128) PRIMARY KEY,
  type                VARCHAR(64)  NOT NULL,
  title               VARCHAR(256) NOT NULL,
  year                INTEGER,
  year_display        VARCHAR(64)  NOT NULL,
  era                 VARCHAR(64)  NOT NULL,
  description_child   TEXT         NOT NULL,  -- age-appropriate description
  description_older   TEXT         NOT NULL,
  description_parent  TEXT         NOT NULL,  -- for parent reports
  real_people         TEXT[]       NOT NULL DEFAULT '{}',
  quote               TEXT,
  quote_attribution   VARCHAR(256),
  geographic_location JSONB,                  -- { lat, lng, name } | null
  continent           VARCHAR(64),
  subject_tags        TEXT[]       NOT NULL DEFAULT '{}',  -- GIN indexed
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
```

Notable: `subject_tags` uses a GIN index for array containment queries.

### `entry_connections` (0013)

Prerequisite/unlock graph between entries.

```sql
CREATE TABLE entry_connections (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entry_id   VARCHAR(128) NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  to_entry_id     VARCHAR(128) NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  connection_type VARCHAR(16)  NOT NULL
                    CHECK (connection_type IN ('related','prerequisite','unlocks','cross_world')),
  UNIQUE (from_entry_id, to_entry_id, connection_type)
);
```

### `entry_curriculum_map` (0013)

Maps entries to curriculum standards.

```sql
CREATE TABLE entry_curriculum_map (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      VARCHAR(128) NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  standard      VARCHAR(32)  NOT NULL
                  CHECK (standard IN ('common_core','ngss','state_financial_literacy')),
  standard_code VARCHAR(64)  NOT NULL,
  description   TEXT         NOT NULL,
  UNIQUE (entry_id, standard_code)
);
```

### `entry_quiz_questions` (0013)

Multiple-choice quiz questions linked to entries.

```sql
CREATE TABLE entry_quiz_questions (
  id              VARCHAR(128) PRIMARY KEY,
  entry_id        VARCHAR(128) NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  difficulty_tier SMALLINT     NOT NULL CHECK (difficulty_tier IN (1, 2, 3)),
  question        TEXT         NOT NULL,
  options         TEXT[]       NOT NULL,  -- array of answer choices
  correct_index   SMALLINT     NOT NULL,
  explanation     TEXT         NOT NULL
);
```

### `entry_media_assets` (0013)

Generated media assets linked to entries.

```sql
CREATE TABLE entry_media_assets (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     VARCHAR(128) NOT NULL REFERENCES real_world_entries(id) ON DELETE CASCADE,
  asset_type   VARCHAR(32)  NOT NULL
                 CHECK (asset_type IN ('remembrance_art','field_trip_env','artifact_visual','audio','render')),
  url          TEXT         NOT NULL,
  generated_at BIGINT       NOT NULL,
  provider     VARCHAR(32)  NOT NULL CHECK (provider IN ('fal_ai','manual','metahuman'))
);
```

---

## Key Table Relationships

```
parent_accounts
  └── kindler_profiles (parent_account_id FK)
       ├── kindler_progress (kindler_id FK)
       ├── kindler_sessions (kindler_id FK)
       │    └── session_reports (session_id + kindler_id FK)
       └── kindler_spark_log (kindler_id FK)

real_world_entries
  ├── entry_connections (from_entry_id + to_entry_id FK)
  ├── entry_curriculum_map (entry_id FK)
  ├── entry_quiz_questions (entry_id FK)
  └── entry_media_assets (entry_id FK)

revenue_events  (standalone — no FK to player tables)
royalty_ledger  (standalone — aggregate, no FK)
loom_violations (player_id is VARCHAR — references Nakama ID, not a FK)
loom_achievements (player_id is VARCHAR — references Nakama ID, not a FK)
```

---

## PostgreSQL Design Conventions

- **All timestamps:** `BIGINT` unix epoch milliseconds (not `TIMESTAMPTZ`) for consistency with the TypeScript number type. Exceptions: `loom_violations.detected_at` and `loom_violations.created_at` use `TIMESTAMPTZ` (legacy migration 0001).
- **UUIDs:** Primary keys use `UUID` for application-generated IDs. `gen_random_uuid()` default where the application does not generate the ID.
- **Cascading deletes:** All child tables cascade-delete when the parent (parent_account, kindler_profile) is deleted. This is correct for COPPA data deletion compliance.
- **GIN indexes:** `subject_tags` on `real_world_entries` uses GIN for array containment (@>) queries.
- **UNIQUE constraints:** Critical deduplication is enforced at the database level (`kindler_progress (kindler_id, entry_id)`, `entry_connections (from, to, type)`, `royalty_ledger (quarter)`).

---

## Redis Usage Patterns

Redis (ioredis) is used for:

| Use case | Pattern | TTL |
|---|---|---|
| Session cache | `session:{sessionId}` → JSON | Session duration |
| Rate limiter state | `ratelimit:{playerId}:{window}` → counter | Window duration (TTL cleanup is a known tech debt item) |
| World state cache | `world:{worldId}:state` → JSON | Short (seconds to minutes) |
| Pub/sub | Channels for cross-service events | n/a |
| Real-time leaderboard | Sorted sets | — |

Rate limiter TTL cleanup is listed as a known tech debt item in ROADMAP.md Phase 7.

---

## TimescaleDB

The `archive` fabric's `timescale-store.ts` uses TimescaleDB hypertables for analytics time-series data. These are partitioned on time for efficient range queries. TimescaleDB must be installed as a PostgreSQL extension before applying migrations that use `create_hypertable()`.
