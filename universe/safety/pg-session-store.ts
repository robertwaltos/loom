/**
 * Koydo Worlds — Safety PG Session Store
 *
 * COPPA-compliant audit persistence for AI conversation sessions.
 * The safety engine holds sessions in-memory for live tracking;
 * this store mirrors every create/end operation to PostgreSQL for
 * the 24-hour audit trail and cross-restart recovery.
 *
 * Table: ai_conversation_sessions (see db/migrations/0011)
 */

import type { Pool } from 'pg';
import type { AiConversationSession } from './types.js';

// ─── Public Interface ──────────────────────────────────────────────

export interface PgSafetySessionStore {
  /** Upsert a session row (create or update). */
  save(session: AiConversationSession): Promise<void>;
  /** Hard-delete a single session by ID. */
  delete(sessionId: string): Promise<void>;
  /** Delete all sessions where auto_delete_at <= now. Returns count removed. */
  deleteExpired(nowMs: number): Promise<number>;
  /** Load all sessions with auto_delete_at > nowMs (unexpired). */
  loadActive(nowMs: number): Promise<readonly AiConversationSession[]>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgSafetySessionStore(pool: Pool): PgSafetySessionStore {
  return {
    async save(session) {
      await pool.query(
        `INSERT INTO ai_conversation_sessions
           (id, kindler_id, character_id, world_id, started_at, ended_at, turn_count, auto_delete_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           ended_at       = EXCLUDED.ended_at,
           turn_count     = EXCLUDED.turn_count,
           auto_delete_at = EXCLUDED.auto_delete_at`,
        [
          session.id,
          session.kindlerId,
          session.characterId,
          session.worldId,
          session.startedAt,
          session.endedAt ?? null,
          session.turnCount,
          session.autoDeleteAt,
        ],
      );
    },

    async delete(sessionId) {
      await pool.query(
        'DELETE FROM ai_conversation_sessions WHERE id = $1',
        [sessionId],
      );
    },

    async deleteExpired(nowMs) {
      const result = await pool.query<{ count: string }>(
        `WITH deleted AS (
           DELETE FROM ai_conversation_sessions
           WHERE auto_delete_at <= $1
           RETURNING id
         )
         SELECT COUNT(*) AS count FROM deleted`,
        [nowMs],
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async loadActive(nowMs) {
      const result = await pool.query<{
        id: string;
        kindler_id: string;
        character_id: string;
        world_id: string;
        started_at: string;
        ended_at: string | null;
        turn_count: number;
        auto_delete_at: string;
      }>(
        `SELECT id, kindler_id, character_id, world_id,
                started_at, ended_at, turn_count, auto_delete_at
         FROM ai_conversation_sessions
         WHERE auto_delete_at > $1
         ORDER BY started_at DESC`,
        [nowMs],
      );

      return result.rows.map(row => ({
        id: row.id,
        kindlerId: row.kindler_id,
        characterId: row.character_id,
        worldId: row.world_id,
        startedAt: Number(row.started_at),
        endedAt: row.ended_at !== null ? Number(row.ended_at) : null,
        turnCount: row.turn_count,
        autoDeleteAt: Number(row.auto_delete_at),
      }));
    },
  };
}
