/**
 * Koydo Worlds — Database Row Types
 *
 * TypeScript interfaces that mirror the Supabase table columns exactly.
 * Column names are snake_case, matching what Supabase returns in query results.
 *
 * Rule: these types are ONLY used at the database adapter boundary.
 * Domain code imports from product-type modules, never directly from here.
 */

// ─── Content Tables ────────────────────────────────────────────────

export interface RealWorldEntryRow {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly year: number | null;
  readonly year_display: string;
  readonly era: string;
  readonly description_child: string;
  readonly description_older: string;
  readonly description_parent: string;
  readonly real_people: readonly string[];
  readonly quote: string | null;
  readonly quote_attribution: string | null;
  /** JSON blob: { lat: number, lng: number, name: string } | null */
  readonly geographic_location: { lat: number; lng: number; name: string } | null;
  readonly continent: string | null;
  readonly subject_tags: readonly string[];
  readonly world_id: string;
  readonly guide_id: string;
  readonly adventure_type: string;
  readonly difficulty_tier: 1 | 2 | 3;
  readonly prerequisites: readonly string[];
  readonly unlocks: readonly string[];
  readonly fun_fact: string;
  readonly image_prompt: string;
  readonly status: string;
}

export interface EntryConnectionRow {
  readonly id: string;
  readonly from_entry_id: string;
  readonly to_entry_id: string;
  readonly connection_type: 'related' | 'prerequisite' | 'unlocks' | 'cross_world';
}

export interface EntryCurriculumMapRow {
  readonly id: string;
  readonly entry_id: string;
  readonly standard: 'common_core' | 'ngss' | 'state_financial_literacy';
  readonly standard_code: string;
  readonly description: string;
}

export interface EntryMediaAssetRow {
  readonly id: string;
  readonly entry_id: string;
  readonly asset_type: 'remembrance_art' | 'field_trip_env' | 'artifact_visual' | 'audio' | 'render';
  readonly url: string;
  readonly generated_at: number;
  readonly provider: 'fal_ai' | 'manual' | 'metahuman';
}

export interface EntryQuizQuestionRow {
  readonly id: string;
  readonly entry_id: string;
  readonly difficulty_tier: 1 | 2 | 3;
  readonly question: string;
  readonly options: readonly string[];
  readonly correct_index: number;
  readonly explanation: string;
}

// ─── World State Tables ────────────────────────────────────────────

export interface WorldLuminanceRow {
  readonly world_id: string;
  readonly luminance: number;
  readonly stage: 'radiant' | 'glowing' | 'dimming' | 'fading' | 'deep_fade';
  readonly last_restored_at: number;
  readonly total_kindlers_contributed: number;
  readonly active_kindler_count: number;
}

export interface WorldLuminanceLogRow {
  readonly id: string;
  readonly world_id: string;
  readonly luminance: number;
  readonly stage: 'radiant' | 'glowing' | 'dimming' | 'fading' | 'deep_fade';
  readonly delta: number;
  readonly cause: 'kindler_progress' | 'natural_decay' | 'collaborative_quest' | 'deep_fade_event';
  readonly timestamp: number;
}

// ─── Player Tables ─────────────────────────────────────────────────

/**
 * parent_accounts row.
 * NOTE: email and password are managed by Supabase Auth (auth.users) — not here.
 * NOTE: child profiles are derived via JOIN on kindler_profiles — not stored here.
 */
export interface ParentAccountRow {
  readonly id: string;                   // matches auth.users.id (UUID)
  readonly consent_verified: boolean;
  readonly consent_verified_at: number | null;
  readonly consent_method: string | null;
  readonly subscription_status: string;
  /**
   * JSON blob: { maxDailyMinutes: number | null, bedtimeCutoff: string | null,
   *              notificationsEnabled: boolean }
   */
  readonly time_controls: {
    readonly maxDailyMinutes: number | null;
    readonly bedtimeCutoff: string | null;
    readonly notificationsEnabled: boolean;
  };
  readonly created_at: number;
}

export interface KindlerProfileRow {
  readonly id: string;                   // UUID
  readonly parent_account_id: string;    // UUID
  readonly display_name: string;
  readonly age_tier: 1 | 2 | 3;
  readonly avatar_id: string;
  readonly spark_level: number;
  readonly current_chapter: string;
  readonly worlds_visited: readonly string[];
  readonly worlds_restored: readonly string[];
  readonly guides_met_count: number;
  readonly created_at: number;
}

export interface KindlerProgressRow {
  readonly id: string;
  readonly kindler_id: string;           // UUID
  readonly entry_id: string;
  readonly completed_at: number;
  readonly adventure_type: string;
  readonly score: number | null;
}

export interface KindlerSparkLogRow {
  readonly id: string;
  readonly kindler_id: string;           // UUID
  readonly spark_level: number;
  readonly delta: number;
  readonly cause: string;
  readonly timestamp: number;
}

export interface KindlerSessionRow {
  readonly id: string;
  readonly kindler_id: string;           // UUID
  readonly started_at: number;
  readonly ended_at: number | null;
  readonly worlds_visited: readonly string[];
  readonly guides_interacted: readonly string[];
  readonly entries_completed: readonly string[];
  readonly spark_delta: number;
}

export interface SessionReportRow {
  readonly id: string;
  readonly session_id: string;
  readonly kindler_id: string;           // UUID
  readonly summary: string;
  readonly worlds_explored: readonly string[];
  readonly subjects_addressed: readonly string[];
  readonly generated_at: number;
}

// ─── Safety Table ──────────────────────────────────────────────────

export interface AiConversationSessionRow {
  readonly id: string;
  readonly kindler_id: string;           // UUID
  readonly character_id: string;
  readonly world_id: string;
  readonly started_at: number;
  readonly ended_at: number | null;
  readonly turn_count: number;
  readonly auto_delete_at: number;
}

// ─── Revenue Tables ────────────────────────────────────────────────

export interface RevenueEventRow {
  readonly id: string;
  readonly event_type: 'subscription' | 'iap' | 'other';
  readonly gross_amount_usd: number;
  readonly net_amount_usd: number;
  readonly platform: 'ios' | 'android' | 'epic' | 'console' | 'web';
  readonly payment_processor: 'apple' | 'google' | 'stripe' | 'epic' | 'other';
  readonly user_id: string;
  readonly transaction_id: string;
  readonly created_at: number;
}

export interface RoyaltyLedgerRow {
  readonly id: string;
  readonly quarter: string;
  readonly total_gross_revenue: number;
  readonly epic_store_revenue: number;
  readonly royalty_eligible_revenue: number;
  readonly cumulative_lifetime_gross: number;
  readonly royalty_rate: number;
  readonly royalty_owed: number;
  readonly threshold_note: string;
  readonly report_submitted: boolean;
  readonly report_submitted_at: number | null;
  readonly payment_status: 'not_due' | 'pending' | 'paid';
  readonly created_at: number;
}

// ─── Loom Engine Tables (shared infrastructure) ────────────────────

/**
 * loom_achievements row.
 * NOTE: unlocked_at is TIMESTAMPTZ — the pg driver returns it as a Date object.
 */
export interface LoomAchievementRow {
  readonly achievement_id: string;
  readonly player_id: string;
  readonly unlocked_at: Date;
  readonly progress: number;        // 0-100
  readonly metadata: Record<string, unknown> | null;
}

/**
 * loom_leaderboard_snapshots row.
 * NOTE: snapshot_at is TIMESTAMPTZ — returned as Date.
 * NOTE: id (BIGSERIAL) and score (NUMERIC) are returned as strings by the pg driver.
 */
export interface LoomLeaderboardSnapshotRow {
  readonly id: string;              // BIGSERIAL → string from pg
  readonly board_id: string;
  readonly player_id: string;
  readonly display_name: string;
  readonly score: string;           // NUMERIC(30,0) → string from pg
  readonly rank: number;
  readonly snapshot_at: Date;
}
