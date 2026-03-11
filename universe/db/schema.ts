/**
 * Koydo Universe — Supabase Database Schema
 *
 * All tables live in the loom-universe Supabase project.
 * NEVER in the Koydo EdTech project. NEVER in The Concord's project.
 *
 * This file defines the TypeScript types matching the Supabase tables.
 * The actual migration SQL lives in universe/db/migrations/.
 */

// Re-export all product types that map to database tables
export type {
  RealWorldEntry,
  EntryConnection,
  EntryCurriculumMap,
  EntryMediaAsset,
  EntryQuizQuestion,
} from '../content/types.js';

export type {
  WorldLuminance,
  WorldLuminanceLogEntry,
} from '../worlds/types.js';

export type {
  KindlerProfile,
  KindlerProgress,
  KindlerSession,
  SessionReport,
  SparkLogEntry,
} from '../kindler/types.js';

export type {
  ParentAccount,
  AiConversationSession,
} from '../safety/types.js';

export type {
  RevenueEvent,
  RoyaltyLedgerEntry,
} from '../revenue/types.js';

// ─── Database Table Registry ───────────────────────────────────────

/**
 * Complete table list for the loom-universe Supabase project:
 *
 * Content:
 *   real_world_entries         — Core content (RealWorldEntry schema)
 *   entry_connections          — M2M: links entries to each other
 *   entry_curriculum_maps      — Maps to Common Core / NGSS standards
 *   entry_media_assets         — Generated images, audio, renders
 *   entry_quiz_questions       — Assessment questions per entry per tier
 *
 * Player:
 *   kindler_profiles           — Child profiles (age tier, preferences)
 *   kindler_progress           — Per-entry completion tracking
 *   kindler_spark_log          — Spark level time-series
 *   kindler_sessions           — Session tracking
 *   session_reports            — AI-generated post-session summaries
 *
 * World State:
 *   world_luminance            — Real-time Fading state per world
 *   world_luminance_log        — Time-series history
 *
 * Safety:
 *   parent_accounts            — Parent auth, subscription status
 *   ai_conversation_sessions   — Ephemeral, no PII, auto-deleted after 24hrs
 *
 * Revenue:
 *   revenue_events             — Transaction log for royalty tracking
 *   royalty_ledger             — Quarterly aggregation
 */
