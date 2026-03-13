-- =============================================================================
-- Koydo Worlds — Initial Schema Migration
-- Target: Supabase (PostgreSQL 15+)
-- Project: loom-worlds (NEVER the Koydo EdTech project)
--
-- COPPA NOTES:
--   - No real child names stored in kindler_profiles (display_name only)
--   - ai_conversation_sessions auto-deleted 24hrs after session end
--   - No PII in any quiz or content tables
--   - parent_accounts links to Supabase auth.users (hashed password managed by Supabase Auth)
--   - AES-256 at-rest encryption is a Supabase project setting, not SQL
-- =============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "pg_cron";        -- Auto-delete expired AI sessions


-- =============================================================================
-- SECTION 1: Content Tables (static, rarely changes after publishing)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- real_world_entries
-- Core content node — one row per historical event / person / invention.
-- -----------------------------------------------------------------------------
create table if not exists public.real_world_entries (
  id                   text        primary key,            -- e.g. 'entry-fibonacci-rabbit-problem'
  type                 text        not null,               -- EntryType enum
  title                text        not null,
  year                 integer,                            -- null = approximate / unknown
  year_display         text        not null,               -- human-readable e.g. 'c. 1202 CE'
  era                  text        not null,               -- Era enum
  description_child    text        not null,               -- ages 5-6
  description_older    text        not null,               -- ages 7-10
  description_parent   text        not null,               -- parent context
  real_people          text[]      not null default '{}',
  quote                text,
  quote_attribution    text,
  geographic_location  jsonb,                              -- { lat, lng, name } or null
  continent            text,
  subject_tags         text[]      not null default '{}',
  world_id             text        not null,               -- WorldId
  guide_id             text        not null,
  adventure_type       text        not null,               -- AdventureType enum
  difficulty_tier      smallint    not null check (difficulty_tier between 1 and 3),
  prerequisites        text[]      not null default '{}',  -- entry IDs
  unlocks              text[]      not null default '{}',  -- entry IDs
  fun_fact             text        not null,
  image_prompt         text        not null,
  status               text        not null default 'draft' check (status in ('draft', 'reviewed', 'published'))
);

create index if not exists idx_real_world_entries_world_id    on public.real_world_entries (world_id);
create index if not exists idx_real_world_entries_difficulty  on public.real_world_entries (difficulty_tier);
create index if not exists idx_real_world_entries_status      on public.real_world_entries (status);
create index if not exists idx_real_world_entries_subject_tags on public.real_world_entries using gin (subject_tags);

-- Public read — content is not sensitive
alter table public.real_world_entries enable row level security;
create policy "entries_public_read"
  on public.real_world_entries for select
  using (status = 'published');

-- -----------------------------------------------------------------------------
-- entry_connections
-- Knowledge graph edges between entries (prerequisite, related, cross-world).
-- -----------------------------------------------------------------------------
create table if not exists public.entry_connections (
  id               text  primary key,
  from_entry_id    text  not null references public.real_world_entries (id) on delete cascade,
  to_entry_id      text  not null references public.real_world_entries (id) on delete cascade,
  connection_type  text  not null check (connection_type in ('related', 'prerequisite', 'unlocks', 'cross_world'))
);

create index if not exists idx_entry_connections_from on public.entry_connections (from_entry_id);
create index if not exists idx_entry_connections_to   on public.entry_connections (to_entry_id);

alter table public.entry_connections enable row level security;
create policy "connections_public_read"
  on public.entry_connections for select
  using (true);

-- -----------------------------------------------------------------------------
-- entry_curriculum_maps
-- Alignment to Common Core, NGSS, and state financial literacy standards.
-- -----------------------------------------------------------------------------
create table if not exists public.entry_curriculum_maps (
  id             text  primary key,
  entry_id       text  not null references public.real_world_entries (id) on delete cascade,
  standard       text  not null check (standard in ('common_core', 'ngss', 'state_financial_literacy')),
  standard_code  text  not null,
  description    text  not null
);

create index if not exists idx_curriculum_maps_entry_id  on public.entry_curriculum_maps (entry_id);
create index if not exists idx_curriculum_maps_standard  on public.entry_curriculum_maps (standard, standard_code);

alter table public.entry_curriculum_maps enable row level security;
create policy "curriculum_maps_public_read"
  on public.entry_curriculum_maps for select
  using (true);

-- -----------------------------------------------------------------------------
-- entry_media_assets
-- Generated images, audio, and field trip renders per entry.
-- URL points to Supabase storage bucket 'world-media'.
-- -----------------------------------------------------------------------------
create table if not exists public.entry_media_assets (
  id            text    primary key,
  entry_id      text    not null references public.real_world_entries (id) on delete cascade,
  asset_type    text    not null check (asset_type in ('remembrance_art', 'field_trip_env', 'artifact_visual', 'audio', 'render')),
  url           text    not null,
  generated_at  bigint  not null,
  provider      text    not null check (provider in ('fal_ai', 'manual', 'metahuman'))
);

create index if not exists idx_media_assets_entry_id   on public.entry_media_assets (entry_id);
create index if not exists idx_media_assets_asset_type on public.entry_media_assets (asset_type);

alter table public.entry_media_assets enable row level security;
create policy "media_assets_public_read"
  on public.entry_media_assets for select
  using (true);

-- -----------------------------------------------------------------------------
-- entry_quiz_questions
-- Assessment questions per entry, 3 difficulty tiers each.
-- 3 options minimum, 4 options typical.
-- -----------------------------------------------------------------------------
create table if not exists public.entry_quiz_questions (
  id              text      primary key,
  entry_id        text      not null references public.real_world_entries (id) on delete cascade,
  difficulty_tier smallint  not null check (difficulty_tier between 1 and 3),
  question        text      not null,
  options         text[]    not null,
  correct_index   smallint  not null,
  explanation     text      not null,
  constraint options_min_length check (array_length(options, 1) >= 2),
  constraint correct_index_in_range check (correct_index >= 0)
);

create index if not exists idx_quiz_questions_entry_id on public.entry_quiz_questions (entry_id);
create index if not exists idx_quiz_questions_tier     on public.entry_quiz_questions (difficulty_tier);

alter table public.entry_quiz_questions enable row level security;
create policy "quiz_questions_public_read"
  on public.entry_quiz_questions for select
  using (true);


-- =============================================================================
-- SECTION 2: World State Tables (real-time shared luminance)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- world_luminance
-- Current Fading state for each world. Shared across all Kindlers.
-- One row per world, updated whenever a Kindler completes an entry.
-- -----------------------------------------------------------------------------
create table if not exists public.world_luminance (
  world_id                    text    primary key,          -- WorldId e.g. 'cloud-kingdom'
  luminance                   real    not null default 0.5 check (luminance between 0.0 and 1.0),
  stage                       text    not null default 'glowing' check (stage in ('radiant', 'glowing', 'dimming', 'fading', 'deep_fade')),
  last_restored_at            bigint  not null,
  total_kindlers_contributed  integer not null default 0,
  active_kindler_count        integer not null default 0
);

-- Publicly readable — world state is a shared experience
alter table public.world_luminance enable row level security;
create policy "luminance_public_read"
  on public.world_luminance for select
  using (true);

-- -----------------------------------------------------------------------------
-- world_luminance_log
-- Time-series history of luminance changes per world.
-- Used for the graph shown in the World status screen.
-- Retention: keep forever (small dataset, meaningful history).
-- -----------------------------------------------------------------------------
create table if not exists public.world_luminance_log (
  id         text    primary key,
  world_id   text    not null references public.world_luminance (world_id) on delete cascade,
  luminance  real    not null check (luminance between 0.0 and 1.0),
  stage      text    not null check (stage in ('radiant', 'glowing', 'dimming', 'fading', 'deep_fade')),
  delta      real    not null,
  cause      text    not null check (cause in ('kindler_progress', 'natural_decay', 'collaborative_quest', 'deep_fade_event')),
  timestamp  bigint  not null
);

create index if not exists idx_luminance_log_world_id  on public.world_luminance_log (world_id, timestamp desc);

alter table public.world_luminance_log enable row level security;
create policy "luminance_log_public_read"
  on public.world_luminance_log for select
  using (true);


-- =============================================================================
-- SECTION 3: Player Tables (COPPA-sensitive — strict RLS enforced)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- parent_accounts
-- One row per verified parent. id matches auth.users.id.
-- Passwords are managed entirely by Supabase Auth (bcrypt) — never stored here.
-- email is stored only for payment/contact — encrypted via Supabase Vault in prod.
-- -----------------------------------------------------------------------------
create table if not exists public.parent_accounts (
  id                    uuid        primary key references auth.users (id) on delete cascade,
  consent_verified      boolean     not null default false,
  consent_verified_at   bigint,
  consent_method        text        check (consent_method in ('credit_card_verification', 'government_id', 'signed_form', 'knowledge_based')),
  subscription_status   text        not null default 'trial' check (subscription_status in ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  time_controls         jsonb       not null default '{"maxDailyMinutes": 30, "bedtimeCutoff": null, "notificationsEnabled": true}'::jsonb,
  created_at            bigint      not null
);

-- Only the account owner can read/update their own row
alter table public.parent_accounts enable row level security;
create policy "parent_accounts_self_read"
  on public.parent_accounts for select
  using (auth.uid() = id);
create policy "parent_accounts_self_update"
  on public.parent_accounts for update
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- kindler_profiles
-- Child sub-profiles. Display name only — no real name, no DOB, no school.
-- COPPA: collection minimized. No PII beyond display_name (not real name).
-- -----------------------------------------------------------------------------
create table if not exists public.kindler_profiles (
  id                  uuid    primary key default gen_random_uuid(),
  parent_account_id   uuid    not null references public.parent_accounts (id) on delete cascade,
  display_name        text    not null,         -- chosen name like 'DragonRider7' — NOT real name
  age_tier            smallint not null check (age_tier between 1 and 3),
  avatar_id           text    not null,
  spark_level         real    not null default 0.1 check (spark_level between 0.0 and 1.0),
  current_chapter     text    not null default 'first_light' check (current_chapter in ('first_light', 'threadways_open', 'deep_fade', 'the_source', 'kindlers_legacy')),
  worlds_visited      text[]  not null default '{}',
  worlds_restored     text[]  not null default '{}',
  guides_met_count    integer not null default 0,
  created_at          bigint  not null
);

create index if not exists idx_kindler_profiles_parent on public.kindler_profiles (parent_account_id);

-- Only the parent can see/modify their children's profiles
alter table public.kindler_profiles enable row level security;
create policy "kindler_profiles_parent_read"
  on public.kindler_profiles for select
  using (auth.uid() = parent_account_id);
create policy "kindler_profiles_parent_all"
  on public.kindler_profiles for all
  using (auth.uid() = parent_account_id);

-- -----------------------------------------------------------------------------
-- kindler_progress
-- Tracks which entries each Kindler has completed.
-- score is optional — mastery is a continuum, not a pass/fail gate.
-- -----------------------------------------------------------------------------
create table if not exists public.kindler_progress (
  id              text    primary key,
  kindler_id      uuid    not null references public.kindler_profiles (id) on delete cascade,
  entry_id        text    not null references public.real_world_entries (id) on delete cascade,
  completed_at    bigint  not null,
  adventure_type  text    not null,
  score           real    check (score is null or (score between 0.0 and 1.0)),
  unique (kindler_id, entry_id)  -- only one completion record per Kindler per entry
);

create index if not exists idx_kindler_progress_kindler_id on public.kindler_progress (kindler_id);
create index if not exists idx_kindler_progress_entry_id   on public.kindler_progress (entry_id);

alter table public.kindler_progress enable row level security;
create policy "kindler_progress_parent_read"
  on public.kindler_progress for select
  using (
    exists (
      select 1 from public.kindler_profiles kp
      where kp.id = kindler_progress.kindler_id
        and kp.parent_account_id = auth.uid()
    )
  );
create policy "kindler_progress_parent_insert"
  on public.kindler_progress for insert
  with check (
    exists (
      select 1 from public.kindler_profiles kp
      where kp.id = kindler_progress.kindler_id
        and kp.parent_account_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- kindler_spark_log
-- Time-series of Spark level changes. Never punitive decreases.
-- Used for the progress graph shown to parents.
-- -----------------------------------------------------------------------------
create table if not exists public.kindler_spark_log (
  id           text    primary key,
  kindler_id   uuid    not null references public.kindler_profiles (id) on delete cascade,
  spark_level  real    not null check (spark_level between 0.0 and 1.0),
  delta        real    not null,
  cause        text    not null check (cause in ('lesson_completed', 'quiz_passed', 'world_restored', 'cross_world_quest', 'collaborative_quest', 'natural_decay', 'return_bonus')),
  timestamp    bigint  not null
);

create index if not exists idx_spark_log_kindler_id on public.kindler_spark_log (kindler_id, timestamp desc);

alter table public.kindler_spark_log enable row level security;
create policy "spark_log_parent_read"
  on public.kindler_spark_log for select
  using (
    exists (
      select 1 from public.kindler_profiles kp
      where kp.id = kindler_spark_log.kindler_id
        and kp.parent_account_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- kindler_sessions
-- One row per play session. Aggregated — no per-conversation content stored.
-- -----------------------------------------------------------------------------
create table if not exists public.kindler_sessions (
  id                  text    primary key,
  kindler_id          uuid    not null references public.kindler_profiles (id) on delete cascade,
  started_at          bigint  not null,
  ended_at            bigint,
  worlds_visited      text[]  not null default '{}',
  guides_interacted   text[]  not null default '{}',
  entries_completed   text[]  not null default '{}',
  spark_delta         real    not null default 0.0
);

create index if not exists idx_sessions_kindler_id on public.kindler_sessions (kindler_id, started_at desc);

alter table public.kindler_sessions enable row level security;
create policy "sessions_parent_read"
  on public.kindler_sessions for select
  using (
    exists (
      select 1 from public.kindler_profiles kp
      where kp.id = kindler_sessions.kindler_id
        and kp.parent_account_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- session_reports
-- AI-generated 2-3 sentence summaries for parents.
-- Contains only world names and subjects — no conversation content.
-- -----------------------------------------------------------------------------
create table if not exists public.session_reports (
  id                  text    primary key,
  session_id          text    not null references public.kindler_sessions (id) on delete cascade,
  kindler_id          uuid    not null references public.kindler_profiles (id) on delete cascade,
  summary             text    not null,
  worlds_explored     text[]  not null default '{}',
  subjects_addressed  text[]  not null default '{}',
  generated_at        bigint  not null
);

create index if not exists idx_session_reports_kindler_id on public.session_reports (kindler_id, generated_at desc);

alter table public.session_reports enable row level security;
create policy "session_reports_parent_read"
  on public.session_reports for select
  using (
    exists (
      select 1 from public.kindler_profiles kp
      where kp.id = session_reports.kindler_id
        and kp.parent_account_id = auth.uid()
    )
  );


-- =============================================================================
-- SECTION 4: Safety Table — AI Conversation Sessions
-- COPPA: ephemeral, no conversation content, auto-deleted after 24hrs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ai_conversation_sessions
-- Tracks only session metadata — never the conversation content.
-- auto_delete_at is calculated as ended_at + 86400000 ms (24 hours).
-- A pg_cron job deletes rows where auto_delete_at < now().
-- -----------------------------------------------------------------------------
create table if not exists public.ai_conversation_sessions (
  id              text    primary key,
  kindler_id      uuid    not null references public.kindler_profiles (id) on delete cascade,
  character_id    text    not null,
  world_id        text    not null,
  started_at      bigint  not null,
  ended_at        bigint,
  turn_count      integer not null default 0,
  auto_delete_at  bigint  not null    -- must be set; enforces 24hr ephemeral rule
);

create index if not exists idx_ai_sessions_kindler_id    on public.ai_conversation_sessions (kindler_id);
create index if not exists idx_ai_sessions_auto_delete   on public.ai_conversation_sessions (auto_delete_at);

alter table public.ai_conversation_sessions enable row level security;
create policy "ai_sessions_parent_read"
  on public.ai_conversation_sessions for select
  using (
    exists (
      select 1 from public.kindler_profiles kp
      where kp.id = ai_conversation_sessions.kindler_id
        and kp.parent_account_id = auth.uid()
    )
  );

-- Cron job: delete expired AI conversation sessions every hour
-- COPPA compliance: 24-hour ephemeral session rule
-- Note: pg_cron must be enabled in Supabase dashboard under Extensions
select cron.schedule(
  'delete-expired-ai-sessions',
  '0 * * * *',  -- every hour
  $$
    delete from public.ai_conversation_sessions
    where auto_delete_at < extract(epoch from now()) * 1000;
  $$
);


-- =============================================================================
-- SECTION 5: Revenue Tables (admin access only — backend service role)
-- No RLS policies grant public or parent access to these tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- revenue_events
-- Transaction log for subscription and IAP events.
-- Used as the source of truth for Epic royalty calculation.
-- -----------------------------------------------------------------------------
create table if not exists public.revenue_events (
  id                  text    primary key,
  event_type          text    not null check (event_type in ('subscription', 'iap', 'other')),
  gross_amount_usd    real    not null check (gross_amount_usd >= 0),
  net_amount_usd      real    not null check (net_amount_usd >= 0),
  platform            text    not null check (platform in ('ios', 'android', 'epic', 'console', 'web')),
  payment_processor   text    not null check (payment_processor in ('apple', 'google', 'stripe', 'epic', 'other')),
  user_id             text    not null,   -- parent account ID (text — cross-platform)
  transaction_id      text    not null unique,
  created_at          bigint  not null
);

create index if not exists idx_revenue_events_created_at on public.revenue_events (created_at desc);
create index if not exists idx_revenue_events_platform   on public.revenue_events (platform);

-- No public access — only backend service role
alter table public.revenue_events enable row level security;
-- (Intentionally no public policies — service role bypasses RLS)

-- -----------------------------------------------------------------------------
-- royalty_ledger
-- Quarterly aggregated totals for Epic UE5 royalty reporting.
-- One row per quarter after the $1M lifetime threshold is crossed.
-- -----------------------------------------------------------------------------
create table if not exists public.royalty_ledger (
  id                        text      primary key,
  quarter                   text      not null unique,   -- '2027-Q1'
  total_gross_revenue       real      not null default 0,
  epic_store_revenue        real      not null default 0,
  royalty_eligible_revenue  real      not null default 0,
  cumulative_lifetime_gross real      not null default 0,
  royalty_rate              real      not null default 0.05 check (royalty_rate in (0.05, 0.035)),
  royalty_owed              real      not null default 0,
  threshold_note            text      not null,
  report_submitted          boolean   not null default false,
  report_submitted_at       bigint,
  payment_status            text      not null default 'not_due' check (payment_status in ('not_due', 'pending', 'paid')),
  created_at                bigint    not null
);

-- No public access — only backend service role
alter table public.royalty_ledger enable row level security;
-- (Intentionally no public policies — service role bypasses RLS)


-- =============================================================================
-- SECTION 6: Seed Data — Initial World Luminance
-- All 9 active worlds start at 'glowing' (0.65 luminance).
-- The Fading begins once players start interacting.
-- =============================================================================

insert into public.world_luminance (world_id, luminance, stage, last_restored_at, total_kindlers_contributed, active_kindler_count)
values
  ('number-garden',        0.65, 'glowing', 0, 0, 0),
  ('story-tree',           0.65, 'glowing', 0, 0, 0),
  ('market-square',        0.65, 'glowing', 0, 0, 0),
  ('great-archive',        0.65, 'glowing', 0, 0, 0),
  ('cloud-kingdom',        0.65, 'glowing', 0, 0, 0),
  ('savanna-workshop',     0.65, 'glowing', 0, 0, 0),
  ('starfall-observatory', 0.65, 'glowing', 0, 0, 0),
  ('rhyme-docks',          0.65, 'glowing', 0, 0, 0),
  ('letter-forge',         0.65, 'glowing', 0, 0, 0)
on conflict (world_id) do nothing;

-- =============================================================================
-- End of Migration 001
-- =============================================================================
