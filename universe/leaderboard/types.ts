/**
 * Koydo Worlds — Leaderboard Domain Types
 */

// ─── Domain Types ──────────────────────────────────────────────────

export interface LeaderboardSnapshot {
  readonly id: number;              // BIGSERIAL PK (0 for unsaved)
  readonly boardId: string;         // e.g. 'spark_global', 'world_cloud-kingdom'
  readonly playerId: string;        // kindler UUID
  readonly displayName: string;     // COPPA-safe: avatar name, not real name
  readonly score: number;           // integer score (sparkLevel * 10_000)
  readonly rank: number;            // position on this board
  readonly snapshotAt: number;      // epoch ms
}

/** Well-known board IDs used by the Koydo scoring system. */
export const BOARD_SPARK_GLOBAL = 'spark_global' as const;

/** Compute a board-friendly score from a spark level (0.0–1.0). */
export function sparkLevelToScore(sparkLevel: number): number {
  return Math.round(sparkLevel * 10_000);
}
