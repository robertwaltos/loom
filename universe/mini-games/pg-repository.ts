/**
 * Mini-Games — PG Repository
 *
 * Persists per-kindler mini-game attempts + scores to koydo_mini_game_attempts.
 * Table: koydo_mini_game_attempts (see db/migrations/0015_mini_game_attempts.sql)
 */

import type { Pool } from 'pg';

// ─── Domain Types ──────────────────────────────────────────────────

export interface MiniGameAttempt {
  readonly id: number;
  readonly gameId: string;
  readonly kindlerId: string;
  readonly score: number;
  readonly maxScore: number;
  readonly difficulty: number;
  readonly completed: boolean;
  readonly timeTakenMs: number | null;
  readonly completedAt: number;
}

export interface MiniGameStats {
  readonly gameId: string;
  readonly kindlerId: string;
  readonly totalAttempts: number;
  readonly bestScore: number;
  readonly averageScore: number;
  readonly lastPlayedAt: number | null;
}

// ─── Public Interface ──────────────────────────────────────────────

export interface PgMiniGameRepository {
  /** Record a new mini-game attempt. */
  recordAttempt(
    gameId: string,
    kindlerId: string,
    score: number,
    maxScore: number,
    difficulty: number,
    completedAt: number,
    timeTakenMs?: number,
  ): Promise<MiniGameAttempt>;
  /** Get aggregate stats for a kindler on a specific game. */
  getStats(gameId: string, kindlerId: string): Promise<MiniGameStats | null>;
  /** Recent attempts for a kindler (all games or filtered by gameId). */
  getRecentAttempts(kindlerId: string, gameId?: string, limit?: number): Promise<readonly MiniGameAttempt[]>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgMiniGameRepository(pool: Pool): PgMiniGameRepository {
  return {
    async recordAttempt(gameId, kindlerId, score, maxScore, difficulty, completedAt, timeTakenMs) {
      const result = await pool.query<AttemptRow>(
        `INSERT INTO koydo_mini_game_attempts
           (game_id, kindler_id, score, max_score, difficulty, completed, time_taken_ms, completed_at)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7)
         RETURNING *`,
        [gameId, kindlerId, score, maxScore, difficulty, timeTakenMs ?? null, completedAt],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error(`recordAttempt failed for ${gameId}/${kindlerId}`);
      return rowToAttempt(row);
    },

    async getStats(gameId, kindlerId) {
      const result = await pool.query<{
        total_attempts: string;
        best_score: string;
        avg_score: string;
        last_played: string | null;
      }>(
        `SELECT
           COUNT(*)         AS total_attempts,
           MAX(score)       AS best_score,
           AVG(score)       AS avg_score,
           MAX(completed_at) AS last_played
         FROM koydo_mini_game_attempts
         WHERE game_id = $1 AND kindler_id = $2`,
        [gameId, kindlerId],
      );
      const row = result.rows[0];
      if (row === undefined || parseInt(row.total_attempts, 10) === 0) return null;
      return {
        gameId,
        kindlerId,
        totalAttempts: parseInt(row.total_attempts, 10),
        bestScore: parseInt(row.best_score ?? '0', 10),
        averageScore: Math.round(parseFloat(row.avg_score ?? '0')),
        lastPlayedAt: row.last_played !== null ? parseInt(row.last_played, 10) : null,
      };
    },

    async getRecentAttempts(kindlerId, gameId, limit = 20) {
      const result = await pool.query<AttemptRow>(
        gameId !== undefined
          ? `SELECT * FROM koydo_mini_game_attempts
             WHERE kindler_id = $1 AND game_id = $2
             ORDER BY completed_at DESC LIMIT $3`
          : `SELECT * FROM koydo_mini_game_attempts
             WHERE kindler_id = $1
             ORDER BY completed_at DESC LIMIT $2`,
        gameId !== undefined ? [kindlerId, gameId, limit] : [kindlerId, limit],
      );
      return result.rows.map(rowToAttempt);
    },
  };
}

// ─── Row Type + Mapper ─────────────────────────────────────────────

type AttemptRow = {
  id: string;
  game_id: string;
  kindler_id: string;
  score: number;
  max_score: number;
  difficulty: number;
  completed: boolean;
  time_taken_ms: number | null;
  completed_at: string;
};

function rowToAttempt(r: AttemptRow): MiniGameAttempt {
  return {
    id: parseInt(r.id, 10),
    gameId: r.game_id,
    kindlerId: r.kindler_id,
    score: r.score,
    maxScore: r.max_score,
    difficulty: r.difficulty,
    completed: r.completed,
    timeTakenMs: r.time_taken_ms,
    completedAt: parseInt(r.completed_at, 10),
  };
}
