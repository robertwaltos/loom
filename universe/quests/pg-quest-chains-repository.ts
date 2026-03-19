/**
 * Quests — PG Quest Chains Repository
 *
 * Persists per-kindler quest progress to koydo_quest_progress + koydo_quest_starts.
 * Quest chain definitions live in fabrics/loom-core/src/quest-chains.ts (read-only, in-memory).
 */

import type { Pool } from 'pg';

// ─── Domain Types ──────────────────────────────────────────────────

export interface QuestStepRecord {
  readonly id: number;
  readonly kindlerId: string;
  readonly questId: string;
  readonly stepIndex: number;
  readonly completedAt: number;
}

export interface QuestStartRecord {
  readonly kindlerId: string;
  readonly questId: string;
  readonly startedAt: number;
}

export interface KindlerQuestProgress {
  readonly questId: string;
  readonly startedAt: number | null;
  readonly completedStepIndices: readonly number[];
  readonly isComplete: boolean;  // caller computes based on total steps in definition
}

// ─── Public Interface ──────────────────────────────────────────────

export interface PgQuestChainsRepository {
  /** Start a quest for a kindler (idempotent). */
  startQuest(kindlerId: string, questId: string, startedAt: number): Promise<QuestStartRecord>;
  /** Record a completed step (idempotent via UNIQUE). */
  completeStep(kindlerId: string, questId: string, stepIndex: number, completedAt: number): Promise<QuestStepRecord | null>;
  /** Get all quest progress for a kindler. */
  getProgressForKindler(kindlerId: string): Promise<readonly KindlerQuestProgress[]>;
  /** Get progress for a specific quest + kindler. */
  getQuestProgress(kindlerId: string, questId: string): Promise<KindlerQuestProgress | null>;
  /** List started (but not necessarily complete) quest IDs for a kindler. */
  getStartedQuestIds(kindlerId: string): Promise<readonly string[]>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgQuestChainsRepository(pool: Pool): PgQuestChainsRepository {
  return {
    async startQuest(kindlerId, questId, startedAt) {
      const result = await pool.query<{ kindler_id: string; quest_id: string; started_at: string }>(
        `INSERT INTO koydo_quest_starts (kindler_id, quest_id, started_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (kindler_id, quest_id) DO UPDATE SET started_at = koydo_quest_starts.started_at
         RETURNING *`,
        [kindlerId, questId, startedAt],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error(`startQuest failed for ${kindlerId}/${questId}`);
      return { kindlerId: row.kindler_id, questId: row.quest_id, startedAt: parseInt(row.started_at, 10) };
    },

    async completeStep(kindlerId, questId, stepIndex, completedAt) {
      const result = await pool.query<StepRow>(
        `INSERT INTO koydo_quest_progress (kindler_id, quest_id, step_index, completed_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (kindler_id, quest_id, step_index) DO NOTHING
         RETURNING *`,
        [kindlerId, questId, stepIndex, completedAt],
      );
      const row = result.rows[0];
      return row !== undefined ? rowToStep(row) : null;
    },

    async getProgressForKindler(kindlerId) {
      const [startsResult, stepsResult] = await Promise.all([
        pool.query<{ quest_id: string; started_at: string }>(
          'SELECT quest_id, started_at FROM koydo_quest_starts WHERE kindler_id = $1',
          [kindlerId],
        ),
        pool.query<StepRow>(
          'SELECT * FROM koydo_quest_progress WHERE kindler_id = $1 ORDER BY quest_id, step_index',
          [kindlerId],
        ),
      ]);

      // Group steps by questId
      const stepsByQuest = new Map<string, number[]>();
      for (const row of stepsResult.rows) {
        const existing = stepsByQuest.get(row.quest_id) ?? [];
        existing.push(row.step_index);
        stepsByQuest.set(row.quest_id, existing);
      }

      // All started quests
      const allQuestIds = new Set<string>(startsResult.rows.map(r => r.quest_id));
      for (const row of stepsResult.rows) allQuestIds.add(row.quest_id);

      return Array.from(allQuestIds).map(questId => {
        const startRow = startsResult.rows.find(r => r.quest_id === questId);
        return {
          questId,
          startedAt: startRow !== undefined ? parseInt(startRow.started_at, 10) : null,
          completedStepIndices: stepsByQuest.get(questId) ?? [],
          isComplete: false, // caller sets based on definition step count
        };
      });
    },

    async getQuestProgress(kindlerId, questId) {
      const [startResult, stepsResult] = await Promise.all([
        pool.query<{ started_at: string }>(
          'SELECT started_at FROM koydo_quest_starts WHERE kindler_id = $1 AND quest_id = $2',
          [kindlerId, questId],
        ),
        pool.query<StepRow>(
          'SELECT * FROM koydo_quest_progress WHERE kindler_id = $1 AND quest_id = $2 ORDER BY step_index',
          [kindlerId, questId],
        ),
      ]);
      if (startResult.rows.length === 0 && stepsResult.rows.length === 0) return null;
      const startRow = startResult.rows[0];
      return {
        questId,
        startedAt: startRow !== undefined ? parseInt(startRow.started_at, 10) : null,
        completedStepIndices: stepsResult.rows.map(r => r.step_index),
        isComplete: false,
      };
    },

    async getStartedQuestIds(kindlerId) {
      const result = await pool.query<{ quest_id: string }>(
        'SELECT quest_id FROM koydo_quest_starts WHERE kindler_id = $1',
        [kindlerId],
      );
      return result.rows.map(r => r.quest_id);
    },
  };
}

// ─── Row Types ─────────────────────────────────────────────────────

type StepRow = {
  id: string;
  kindler_id: string;
  quest_id: string;
  step_index: number;
  completed_at: string;
};

function rowToStep(r: StepRow): QuestStepRecord {
  return {
    id: parseInt(r.id, 10),
    kindlerId: r.kindler_id,
    questId: r.quest_id,
    stepIndex: r.step_index,
    completedAt: parseInt(r.completed_at, 10),
  };
}
