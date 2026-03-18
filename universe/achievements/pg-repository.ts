/**
 * Koydo Worlds — Achievements PG Repository
 *
 * Persists achievement unlock records to loom_achievements table.
 * Table: loom_achievements (see db/migrations/0004_achievements.sql)
 *
 * NOTE: unlocked_at in the table is TIMESTAMPTZ. We store/read it as
 * a JS Date and convert to/from epoch ms for the domain type.
 */

import type { Pool } from 'pg';
import type { Achievement } from './types.js';

// ─── Public Interface ──────────────────────────────────────────────

export interface PgAchievementsRepository {
  /** Upsert an achievement record (idempotent on achievement_id + player_id). */
  save(achievement: Achievement): Promise<void>;
  /** Load all achievements earned by a kindler. */
  getByPlayer(playerId: string): Promise<readonly Achievement[]>;
  /** Load all players who have earned a specific achievement. */
  getByAchievementId(achievementId: string): Promise<readonly Achievement[]>;
  /** Update progress for an in-progress achievement (0-100). */
  updateProgress(achievementId: string, playerId: string, progress: number): Promise<void>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgAchievementsRepository(pool: Pool): PgAchievementsRepository {
  return {
    async save(achievement) {
      await pool.query(
        `INSERT INTO loom_achievements
           (achievement_id, player_id, unlocked_at, progress, metadata)
         VALUES ($1, $2, to_timestamp($3 / 1000.0), $4, $5)
         ON CONFLICT (achievement_id, player_id) DO UPDATE SET
           progress    = EXCLUDED.progress,
           metadata    = EXCLUDED.metadata`,
        [
          achievement.achievementId,
          achievement.playerId,
          achievement.unlockedAt,
          achievement.progress,
          achievement.metadata !== null ? JSON.stringify(achievement.metadata) : null,
        ],
      );
    },

    async getByPlayer(playerId) {
      const result = await pool.query<{
        achievement_id: string;
        player_id: string;
        unlocked_at: Date;
        progress: number;
        metadata: Record<string, unknown> | null;
      }>(
        `SELECT achievement_id, player_id, unlocked_at, progress, metadata
         FROM loom_achievements
         WHERE player_id = $1
         ORDER BY unlocked_at ASC`,
        [playerId],
      );
      return result.rows.map(rowToAchievement);
    },

    async getByAchievementId(achievementId) {
      const result = await pool.query<{
        achievement_id: string;
        player_id: string;
        unlocked_at: Date;
        progress: number;
        metadata: Record<string, unknown> | null;
      }>(
        `SELECT achievement_id, player_id, unlocked_at, progress, metadata
         FROM loom_achievements
         WHERE achievement_id = $1
         ORDER BY unlocked_at ASC`,
        [achievementId],
      );
      return result.rows.map(rowToAchievement);
    },

    async updateProgress(achievementId, playerId, progress) {
      await pool.query(
        `UPDATE loom_achievements
         SET progress = $3
         WHERE achievement_id = $1 AND player_id = $2`,
        [achievementId, playerId, progress],
      );
    },
  };
}

// ─── Row Mapper ────────────────────────────────────────────────────

function rowToAchievement(row: {
  achievement_id: string;
  player_id: string;
  unlocked_at: Date;
  progress: number;
  metadata: Record<string, unknown> | null;
}): Achievement {
  return {
    achievementId: row.achievement_id,
    playerId: row.player_id,
    unlockedAt: new Date(row.unlocked_at).getTime(),
    progress: row.progress,
    metadata: row.metadata,
  };
}
