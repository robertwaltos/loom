/**
 * Koydo Worlds — Content PG Repository
 *
 * Persists in-memory curriculum content to real_world_entries +
 * entry_quiz_questions tables, and reads it back.
 *
 * Use case:
 *   • seedEntries/seedQuizzes — called once at boot from ContentEngine to populate DB
 *   • loadEntries / loadQuizzesForEntry — read from DB (enables runtime content patches)
 *   • countEntries — check if seeding is needed (skip if already seeded)
 *
 * Tables: real_world_entries, entry_quiz_questions
 * (see db/migrations/0013_content_schema.sql)
 */

import type { Pool } from 'pg';
import type { RealWorldEntry, EntryQuizQuestion } from './types.js';

// ─── Public Interface ──────────────────────────────────────────────

export interface PgContentRepository {
  /** Upsert all entries from the in-memory engine into the DB. */
  seedEntries(entries: readonly RealWorldEntry[]): Promise<{ inserted: number; skipped: number }>;
  /** Upsert all quiz questions from the in-memory engine into the DB. */
  seedQuizzes(questions: readonly EntryQuizQuestion[]): Promise<{ inserted: number }>;
  /** Count rows in real_world_entries — use to skip redundant re-seeding. */
  countEntries(): Promise<number>;
  /** Load all entries (optionally filtered by worldId). */
  loadEntries(worldId?: string): Promise<readonly RealWorldEntry[]>;
  /** Load quiz questions for one entry. */
  loadQuizzesForEntry(entryId: string): Promise<readonly EntryQuizQuestion[]>;
  /** Load all quiz questions. */
  loadAllQuizzes(): Promise<readonly EntryQuizQuestion[]>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgContentRepository(pool: Pool): PgContentRepository {
  return {
    async countEntries() {
      const result = await pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM real_world_entries',
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async seedEntries(entries) {
      let inserted = 0;
      let skipped = 0;
      for (const e of entries) {
        const result = await pool.query<{ id: string }>(
          `INSERT INTO real_world_entries
             (id, type, title, year, year_display, era,
              description_child, description_older, description_parent,
              real_people, quote, quote_attribution, geographic_location,
              continent, subject_tags, world_id, guide_id, adventure_type,
              difficulty_tier, prerequisites, unlocks, fun_fact, image_prompt, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [
            e.id, e.type, e.title, e.year ?? null, e.yearDisplay, e.era,
            e.descriptionChild, e.descriptionOlder, e.descriptionParent,
            e.realPeople, e.quote ?? null, e.quoteAttribution ?? null,
            e.geographicLocation !== null ? JSON.stringify(e.geographicLocation) : null,
            e.continent ?? null, e.subjectTags, e.worldId, e.guideId, e.adventureType,
            e.difficultyTier, e.prerequisites, e.unlocks, e.funFact, e.imagePrompt, e.status,
          ],
        );
        if (result.rows.length > 0) inserted++;
        else skipped++;
      }
      return { inserted, skipped };
    },

    async seedQuizzes(questions) {
      let inserted = 0;
      for (const q of questions) {
        await pool.query(
          `INSERT INTO entry_quiz_questions
             (id, entry_id, difficulty_tier, question, options, correct_index, explanation)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [q.id, q.entryId, q.difficultyTier, q.question, q.options, q.correctIndex, q.explanation],
        );
        inserted++;
      }
      return { inserted };
    },

    async loadEntries(worldId) {
      const result = await pool.query<EntryRow>(
        worldId !== undefined
          ? `SELECT * FROM real_world_entries WHERE world_id = $1 ORDER BY id`
          : `SELECT * FROM real_world_entries ORDER BY id`,
        worldId !== undefined ? [worldId] : [],
      );
      return result.rows.map(rowToEntry);
    },

    async loadQuizzesForEntry(entryId) {
      const result = await pool.query<QuizRow>(
        `SELECT * FROM entry_quiz_questions WHERE entry_id = $1 ORDER BY id`,
        [entryId],
      );
      return result.rows.map(rowToQuiz);
    },

    async loadAllQuizzes() {
      const result = await pool.query<QuizRow>(
        `SELECT * FROM entry_quiz_questions ORDER BY entry_id, id`,
      );
      return result.rows.map(rowToQuiz);
    },
  };
}

// ─── Row Types + Mappers ───────────────────────────────────────────

type EntryRow = {
  id: string; type: string; title: string; year: number | null;
  year_display: string; era: string; description_child: string;
  description_older: string; description_parent: string;
  real_people: string[]; quote: string | null; quote_attribution: string | null;
  geographic_location: { lat: number; lng: number; name: string } | null;
  continent: string | null; subject_tags: string[]; world_id: string;
  guide_id: string; adventure_type: string; difficulty_tier: number;
  prerequisites: string[]; unlocks: string[]; fun_fact: string;
  image_prompt: string; status: string;
};

type QuizRow = {
  id: string; entry_id: string; difficulty_tier: number;
  question: string; options: string[]; correct_index: number; explanation: string;
};

function rowToEntry(r: EntryRow): RealWorldEntry {
  return {
    id: r.id,
    type: r.type as RealWorldEntry['type'],
    title: r.title,
    year: r.year,
    yearDisplay: r.year_display,
    era: r.era as RealWorldEntry['era'],
    descriptionChild: r.description_child,
    descriptionOlder: r.description_older,
    descriptionParent: r.description_parent,
    realPeople: r.real_people,
    quote: r.quote,
    quoteAttribution: r.quote_attribution,
    geographicLocation: r.geographic_location,
    continent: r.continent,
    subjectTags: r.subject_tags,
    worldId: r.world_id,
    guideId: r.guide_id,
    adventureType: r.adventure_type as RealWorldEntry['adventureType'],
    difficultyTier: r.difficulty_tier as 1 | 2 | 3,
    prerequisites: r.prerequisites,
    unlocks: r.unlocks,
    funFact: r.fun_fact,
    imagePrompt: r.image_prompt,
    status: r.status as RealWorldEntry['status'],
  };
}

function rowToQuiz(r: QuizRow): EntryQuizQuestion {
  return {
    id: r.id,
    entryId: r.entry_id,
    difficultyTier: r.difficulty_tier as 1 | 2 | 3,
    question: r.question,
    options: r.options,
    correctIndex: r.correct_index,
    explanation: r.explanation,
  };
}
