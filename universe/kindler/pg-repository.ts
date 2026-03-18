/**
 * Koydo Worlds — PostgreSQL-backed KindlerRepository
 *
 * Replaces the in-memory mock with real persistence against the
 * loom-worlds PostgreSQL database.
 *
 * Tables: kindler_profiles, kindler_progress, kindler_spark_log,
 *         kindler_sessions, session_reports
 *
 * All queries use parameterised statements — no string interpolation.
 * COPPA: never store real names, never log conversation content.
 *
 * Thread: silk/infra/wire-kindler-repo
 * Tier: 1
 */

import type { Pool } from 'pg';

import type { KindlerRepository } from './repository.js';
import type {
  KindlerProfileRow,
  KindlerProgressRow,
  KindlerSparkLogRow,
  KindlerSessionRow,
  SessionReportRow,
} from '../db/row-types.js';

import {
  kindlerProfileFromRow,
  kindlerProfileToRow,
  kindlerProgressFromRow,
  kindlerProgressToRow,
  sparkLogFromRow,
  sparkLogToRow,
  kindlerSessionFromRow,
  kindlerSessionToRow,
  sessionReportFromRow,
  sessionReportToRow,
} from '../db/mappers.js';

// ─── Logger Interface ──────────────────────────────────────────────

export interface PgKindlerLogger {
  readonly error: (meta: Record<string, unknown>, msg: string) => void;
  readonly warn: (meta: Record<string, unknown>, msg: string) => void;
}

// ─── Factory ───────────────────────────────────────────────────────

export function createPgKindlerRepository(
  pool: Pool,
  logger?: PgKindlerLogger,
): KindlerRepository {
  function logError(context: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    logger?.error({ context, error: msg }, 'pg_kindler_repository_error');
  }

  return {
    // ─── Profile ───────────────────────────────────────────────

    async findById(kindlerId) {
      const result = await pool.query<KindlerProfileRow>(
        'SELECT * FROM kindler_profiles WHERE id = $1',
        [kindlerId],
      );
      const row = result.rows[0];
      return row !== undefined ? kindlerProfileFromRow(row) : null;
    },

    async findByParentId(parentAccountId) {
      const result = await pool.query<KindlerProfileRow>(
        'SELECT * FROM kindler_profiles WHERE parent_account_id = $1 ORDER BY created_at ASC',
        [parentAccountId],
      );
      return result.rows.map(kindlerProfileFromRow);
    },

    async save(profile) {
      const row = kindlerProfileToRow(profile);
      await pool.query(
        `INSERT INTO kindler_profiles
           (id, parent_account_id, display_name, age_tier, avatar_id,
            spark_level, current_chapter, worlds_visited, worlds_restored,
            guides_met_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           display_name     = EXCLUDED.display_name,
           age_tier         = EXCLUDED.age_tier,
           avatar_id        = EXCLUDED.avatar_id,
           spark_level      = EXCLUDED.spark_level,
           current_chapter  = EXCLUDED.current_chapter,
           worlds_visited   = EXCLUDED.worlds_visited,
           worlds_restored  = EXCLUDED.worlds_restored,
           guides_met_count = EXCLUDED.guides_met_count`,
        [
          row.id,
          row.parent_account_id,
          row.display_name,
          row.age_tier,
          row.avatar_id,
          row.spark_level,
          row.current_chapter,
          row.worlds_visited,
          row.worlds_restored,
          row.guides_met_count,
          row.created_at,
        ],
      );
    },

    // ─── Progress ──────────────────────────────────────────────

    async loadProgress(kindlerId) {
      const result = await pool.query<KindlerProgressRow>(
        'SELECT * FROM kindler_progress WHERE kindler_id = $1 ORDER BY completed_at DESC',
        [kindlerId],
      );
      return result.rows.map(kindlerProgressFromRow);
    },

    async saveProgress(progress) {
      const row = kindlerProgressToRow(progress);
      await pool.query(
        `INSERT INTO kindler_progress
           (id, kindler_id, entry_id, completed_at, adventure_type, score)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           completed_at   = EXCLUDED.completed_at,
           adventure_type = EXCLUDED.adventure_type,
           score          = EXCLUDED.score`,
        [
          row.id,
          row.kindler_id,
          row.entry_id,
          row.completed_at,
          row.adventure_type,
          row.score,
        ],
      );
    },

    // ─── Spark Log ─────────────────────────────────────────────

    async loadSparkLog(kindlerId, limit = 100) {
      const result = await pool.query<KindlerSparkLogRow>(
        `SELECT * FROM kindler_spark_log
         WHERE kindler_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [kindlerId, limit],
      );
      return result.rows.map(sparkLogFromRow);
    },

    async appendSparkEntry(entry) {
      const row = sparkLogToRow(entry);
      await pool.query(
        `INSERT INTO kindler_spark_log
           (id, kindler_id, spark_level, delta, cause, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          row.id,
          row.kindler_id,
          row.spark_level,
          row.delta,
          row.cause,
          row.timestamp,
        ],
      );
    },

    // ─── Sessions ──────────────────────────────────────────────

    async saveSession(session) {
      const row = kindlerSessionToRow(session);
      await pool.query(
        `INSERT INTO kindler_sessions
           (id, kindler_id, started_at, ended_at, worlds_visited,
            guides_interacted, entries_completed, spark_delta)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           ended_at          = EXCLUDED.ended_at,
           worlds_visited    = EXCLUDED.worlds_visited,
           guides_interacted = EXCLUDED.guides_interacted,
           entries_completed = EXCLUDED.entries_completed,
           spark_delta       = EXCLUDED.spark_delta`,
        [
          row.id,
          row.kindler_id,
          row.started_at,
          row.ended_at,
          row.worlds_visited,
          row.guides_interacted,
          row.entries_completed,
          row.spark_delta,
        ],
      );
    },

    async loadSession(sessionId) {
      const result = await pool.query<KindlerSessionRow>(
        'SELECT * FROM kindler_sessions WHERE id = $1',
        [sessionId],
      );
      const row = result.rows[0];
      return row !== undefined ? kindlerSessionFromRow(row) : null;
    },

    // ─── Session Reports ───────────────────────────────────────

    async saveSessionReport(report) {
      const row = sessionReportToRow(report);
      await pool.query(
        `INSERT INTO session_reports
           (id, session_id, kindler_id, summary, worlds_explored,
            subjects_addressed, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           summary            = EXCLUDED.summary,
           worlds_explored    = EXCLUDED.worlds_explored,
           subjects_addressed = EXCLUDED.subjects_addressed`,
        [
          row.id,
          row.session_id,
          row.kindler_id,
          row.summary,
          row.worlds_explored,
          row.subjects_addressed,
          row.generated_at,
        ],
      );
    },
  };
}
