/**
 * Koydo Worlds — Leaderboard PG Repository
 *
 * Persists leaderboard snapshot records to loom_leaderboard_snapshots.
 * Table: loom_leaderboard_snapshots (see db/migrations/0005_leaderboard_snapshots.sql)
 *
 * NOTE: snapshot_at is TIMESTAMPTZ; score is NUMERIC(30,0) — both handled below.
 */

import type { Pool } from 'pg';
import type { LeaderboardSnapshot } from './types.js';

// ─── Public Interface ──────────────────────────────────────────────

export interface PgLeaderboardRepository {
  /** Insert a new snapshot row. */
  saveSnapshot(snapshot: Omit<LeaderboardSnapshot, 'id'>): Promise<LeaderboardSnapshot>;
  /** Get the top N ranked entries for a board (latest snapshot per player). */
  getTopScores(boardId: string, limit?: number): Promise<readonly LeaderboardSnapshot[]>;
  /** Get the most recent snapshot for a specific player on a board. */
  getPlayerRank(boardId: string, playerId: string): Promise<LeaderboardSnapshot | null>;
  /** Count distinct players with snapshots on a board. */
  getPlayerCount(boardId: string): Promise<number>;
  /** Delete all snapshot rows for a player on a board. Returns rows deleted. */
  deletePlayerScores(boardId: string, playerId: string): Promise<number>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgLeaderboardRepository(pool: Pool): PgLeaderboardRepository {
  return {
    async saveSnapshot(snapshot) {
      const result = await pool.query<{ id: string }>(
        `INSERT INTO loom_leaderboard_snapshots
           (board_id, player_id, display_name, score, rank, snapshot_at)
         VALUES ($1, $2, $3, $4, $5, to_timestamp($6 / 1000.0))
         RETURNING id`,
        [
          snapshot.boardId,
          snapshot.playerId,
          snapshot.displayName,
          snapshot.score,
          snapshot.rank,
          snapshot.snapshotAt,
        ],
      );
      const id = parseInt(result.rows[0]?.id ?? '0', 10);
      return { ...snapshot, id };
    },

    async getTopScores(boardId, limit = 100) {
      // Latest snapshot per player, re-ranked by score DESC
      const result = await pool.query<{
        id: string;
        board_id: string;
        player_id: string;
        display_name: string;
        score: string;
        rank: number;
        snapshot_at: Date;
      }>(
        `SELECT DISTINCT ON (player_id)
                id, board_id, player_id, display_name, score, rank, snapshot_at
         FROM loom_leaderboard_snapshots
         WHERE board_id = $1
         ORDER BY player_id, snapshot_at DESC`,
        [boardId],
      );

      return result.rows
        .slice()
        .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
        .slice(0, limit)
        .map((row, i) => rowToSnapshot(row, i + 1));
    },

    async getPlayerRank(boardId, playerId) {
      const result = await pool.query<{
        id: string;
        board_id: string;
        player_id: string;
        display_name: string;
        score: string;
        rank: number;
        snapshot_at: Date;
      }>(
        `SELECT id, board_id, player_id, display_name, score, rank, snapshot_at
         FROM loom_leaderboard_snapshots
         WHERE board_id = $1 AND player_id = $2
         ORDER BY snapshot_at DESC
         LIMIT 1`,
        [boardId, playerId],
      );

      const row = result.rows[0];
      if (row === undefined) return null;
      return rowToSnapshot(row);
    },

    async getPlayerCount(boardId) {
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT player_id) AS count
         FROM loom_leaderboard_snapshots
         WHERE board_id = $1`,
        [boardId],
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async deletePlayerScores(boardId, playerId) {
      const result = await pool.query(
        `DELETE FROM loom_leaderboard_snapshots
         WHERE board_id = $1 AND player_id = $2`,
        [boardId, playerId],
      );
      return result.rowCount ?? 0;
    },
  };
}

// ─── Row Mapper ────────────────────────────────────────────────────

function rowToSnapshot(
  row: {
    id: string;
    board_id: string;
    player_id: string;
    display_name: string;
    score: string;
    rank: number;
    snapshot_at: Date;
  },
  rankOverride?: number,
): LeaderboardSnapshot {
  return {
    id: parseInt(row.id, 10),
    boardId: row.board_id,
    playerId: row.player_id,
    displayName: row.display_name,
    score: parseInt(row.score, 10),
    rank: rankOverride ?? row.rank,
    snapshotAt: new Date(row.snapshot_at).getTime(),
  };
}
