/**
 * Koydo Worlds — Kindler (Player) Progression System
 *
 * Every child is a Kindler — their Spark grows with learning,
 * dims gently with absence (never punitively).
 */

// ─── Age Tiers ─────────────────────────────────────────────────────

export type AgeTier = 1 | 2 | 3; // 1=ages 5-6, 2=ages 7-8, 3=ages 9-10

// ─── Kindler Profile ───────────────────────────────────────────────

export interface KindlerProfile {
  readonly id: string;
  readonly parentAccountId: string;
  readonly displayName: string;        // No real name — COPPA
  readonly ageTier: AgeTier;
  readonly avatarId: string;
  readonly sparkLevel: number;         // 0.0 to 1.0
  readonly currentChapter: Chapter;
  readonly worldsVisited: readonly string[];
  readonly worldsRestored: readonly string[];
  readonly guidesMetCount: number;
  readonly createdAt: number;
}

// ─── The Five Chapters ─────────────────────────────────────────────

export type Chapter =
  | 'first_light'         // Onboarding — arrive, meet Compass, first world
  | 'threadways_open'     // Cross-disciplinary connections emerge
  | 'deep_fade'           // Harder content, collaborative quests
  | 'the_source'          // The Forgetting Well revealed
  | 'kindlers_legacy';    // Mentoring, ongoing

// ─── Spark System ──────────────────────────────────────────────────

export interface SparkState {
  readonly kindlerId: string;
  readonly level: number;              // 0.0 to 1.0
  readonly trend: 'growing' | 'stable' | 'dimming';
  readonly lastActivityAt: number;
  readonly streakDays: number;
}

export interface SparkLogEntry {
  readonly id: string;
  readonly kindlerId: string;
  readonly sparkLevel: number;
  readonly delta: number;
  readonly cause: SparkCause;
  readonly timestamp: number;
}

export type SparkCause =
  | 'lesson_completed'
  | 'quiz_passed'
  | 'world_restored'
  | 'cross_world_quest'
  | 'collaborative_quest'
  | 'natural_decay'        // Gentle — never punitive
  | 'return_bonus'         // Returning after absence is rewarding
  | 'item_redeemed';       // Kindler spends spark on a cosmetic/reward

// ─── Progress Tracking ─────────────────────────────────────────────

export interface KindlerProgress {
  readonly id: string;
  readonly kindlerId: string;
  readonly entryId: string;
  readonly completedAt: number;
  readonly adventureType: string;
  readonly score: number | null;       // Optional — mastery is a continuum
}

// ─── Session ───────────────────────────────────────────────────────

export interface KindlerSession {
  readonly id: string;
  readonly kindlerId: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly worldsVisited: readonly string[];
  readonly guidesInteracted: readonly string[];
  readonly entriesCompleted: readonly string[];
  readonly sparkDelta: number;
}

export interface SessionReport {
  readonly id: string;
  readonly sessionId: string;
  readonly kindlerId: string;
  readonly summary: string;            // AI-generated 2-3 sentence summary
  readonly worldsExplored: readonly string[];
  readonly subjectsAddressed: readonly string[];
  readonly generatedAt: number;
}
