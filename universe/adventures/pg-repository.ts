/**
 * Adventures — PG Repository
 *
 * Persists per-kindler adventure progress to koydo_adventure_progress.
 * Table: koydo_adventure_progress (see db/migrations/0014_adventure_progress.sql)
 *
 * Adventures are in_progress → completed → mastered.
 * UNIQUE (kindler_id, entry_id) — one record per kindler per entry.
 */

import type { Pool } from 'pg';
import type { AdventureProgress, AdventureState } from './types.js';

// ─── Public Interface ──────────────────────────────────────────────

export interface PgAdventureProgressRepository {
  /** Upsert an in_progress record (idempotent — won't downgrade completed → in_progress). */
  startAdventure(kindlerId: string, entryId: string, startedAt: number): Promise<AdventureProgress>;
  /** Mark adventure completed (or mastered if interactionCount is high). */
  completeAdventure(
    kindlerId: string,
    entryId: string,
    completedAt: number,
    interactionCount: number,
    luminanceContributed: number,
  ): Promise<AdventureProgress | null>;
  /** All adventure progress records for a kindler. */
  getProgressForKindler(kindlerId: string): Promise<readonly AdventureProgress[]>;
  /** Progress for one specific entry/kindler pair. */
  getProgressForEntry(kindlerId: string, entryId: string): Promise<AdventureProgress | null>;
}

// ─── Factory ──────────────────────────────────────────────────────

const MASTERY_THRESHOLD = 5; // interactions needed to qualify for 'mastered'

export function createPgAdventureProgressRepository(pool: Pool): PgAdventureProgressRepository {
  return {
    async startAdventure(kindlerId, entryId, startedAt) {
      const result = await pool.query<ProgressRow>(
        `INSERT INTO koydo_adventure_progress
           (kindler_id, entry_id, state, started_at)
         VALUES ($1, $2, 'in_progress', $3)
         ON CONFLICT (kindler_id, entry_id) DO UPDATE
           SET state = CASE
             WHEN koydo_adventure_progress.state IN ('completed', 'mastered') THEN koydo_adventure_progress.state
             ELSE 'in_progress'
           END
         RETURNING *`,
        [kindlerId, entryId, startedAt],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error(`startAdventure failed for ${kindlerId}/${entryId}`);
      return rowToProgress(row);
    },

    async completeAdventure(kindlerId, entryId, completedAt, interactionCount, luminanceContributed) {
      const state: AdventureState = interactionCount >= MASTERY_THRESHOLD ? 'mastered' : 'completed';
      const result = await pool.query<ProgressRow>(
        `UPDATE koydo_adventure_progress
         SET state = $3,
             completed_at = $4,
             interaction_count = $5,
             luminance_contributed = $6
         WHERE kindler_id = $1 AND entry_id = $2
         RETURNING *`,
        [kindlerId, entryId, state, completedAt, interactionCount, luminanceContributed],
      );
      return result.rows[0] !== undefined ? rowToProgress(result.rows[0]) : null;
    },

    async getProgressForKindler(kindlerId) {
      const result = await pool.query<ProgressRow>(
        `SELECT * FROM koydo_adventure_progress
         WHERE kindler_id = $1
         ORDER BY started_at DESC`,
        [kindlerId],
      );
      return result.rows.map(rowToProgress);
    },

    async getProgressForEntry(kindlerId, entryId) {
      const result = await pool.query<ProgressRow>(
        `SELECT * FROM koydo_adventure_progress
         WHERE kindler_id = $1 AND entry_id = $2`,
        [kindlerId, entryId],
      );
      return result.rows[0] !== undefined ? rowToProgress(result.rows[0]) : null;
    },
  };
}

// ─── Row Type + Mapper ─────────────────────────────────────────────

type ProgressRow = {
  id: string;
  kindler_id: string;
  entry_id: string;
  state: string;
  started_at: string;
  completed_at: string | null;
  interaction_count: number;
  luminance_contributed: string;
};

function rowToProgress(r: ProgressRow): AdventureProgress {
  return {
    kindlerId: r.kindler_id,
    entryId: r.entry_id,
    state: r.state as AdventureState,
    startedAt: parseInt(r.started_at, 10),
    completedAt: r.completed_at !== null ? parseInt(r.completed_at, 10) : null,
    interactionCount: r.interaction_count,
    luminanceContributed: parseFloat(r.luminance_contributed),
  };
}
