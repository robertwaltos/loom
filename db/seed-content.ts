#!/usr/bin/env node
/**
 * Idempotent content seeder — safe to run multiple times.
 * Usage: npx tsx db/seed-content.ts
 * Env:   DATABASE_URL  (full connection string)
 *        — or individually —
 *        PG_HOST / PG_PORT / PG_DATABASE / PG_USER / PG_PASSWORD
 */

import { Pool } from 'pg';
import type { PoolClient, PoolConfig } from 'pg';

import { ALL_CONTENT_ENTRIES, ALL_CONTENT_QUIZZES } from '../universe/content/bootstrap.js';
import type { RealWorldEntry, EntryQuizQuestion } from '../universe/content/types.js';

// ─── Connection ───────────────────────────────────────────────────────────────

function buildPoolConfig(): PoolConfig {
  const url = process.env['DATABASE_URL'];
  if (url !== undefined && url !== '') return { connectionString: url };

  return {
    host: process.env['PG_HOST'] ?? 'localhost',
    port: Number(process.env['PG_PORT'] ?? '5432'),
    database: process.env['PG_DATABASE'],
    user: process.env['PG_USER'],
    password: process.env['PG_PASSWORD'],
  };
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

const ENTRY_UPSERT_SQL = `
  INSERT INTO real_world_entries (
    id, type, title, year, year_display, era,
    description_child, description_older, description_parent,
    real_people, quote, quote_attribution, geographic_location,
    continent, subject_tags, world_id, guide_id, adventure_type,
    difficulty_tier, prerequisites, unlocks, fun_fact, image_prompt, status
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
  )
  ON CONFLICT (id) DO UPDATE SET
    type               = EXCLUDED.type,
    title              = EXCLUDED.title,
    year               = EXCLUDED.year,
    year_display       = EXCLUDED.year_display,
    era                = EXCLUDED.era,
    description_child  = EXCLUDED.description_child,
    description_older  = EXCLUDED.description_older,
    description_parent = EXCLUDED.description_parent,
    real_people        = EXCLUDED.real_people,
    quote              = EXCLUDED.quote,
    quote_attribution  = EXCLUDED.quote_attribution,
    geographic_location = EXCLUDED.geographic_location,
    continent          = EXCLUDED.continent,
    subject_tags       = EXCLUDED.subject_tags,
    world_id           = EXCLUDED.world_id,
    guide_id           = EXCLUDED.guide_id,
    adventure_type     = EXCLUDED.adventure_type,
    difficulty_tier    = EXCLUDED.difficulty_tier,
    prerequisites      = EXCLUDED.prerequisites,
    unlocks            = EXCLUDED.unlocks,
    fun_fact           = EXCLUDED.fun_fact,
    image_prompt       = EXCLUDED.image_prompt,
    status             = EXCLUDED.status
`;

async function seedEntry(client: PoolClient, entry: RealWorldEntry): Promise<void> {
  await client.query(ENTRY_UPSERT_SQL, [
    entry.id,
    entry.type,
    entry.title,
    entry.year ?? null,
    entry.yearDisplay,
    entry.era,
    entry.descriptionChild,
    entry.descriptionOlder,
    entry.descriptionParent,
    [...entry.realPeople],
    entry.quote ?? null,
    entry.quoteAttribution ?? null,
    entry.geographicLocation !== null ? JSON.stringify(entry.geographicLocation) : null,
    entry.continent ?? null,
    [...entry.subjectTags],
    entry.worldId,
    entry.guideId,
    entry.adventureType,
    entry.difficultyTier,
    [...entry.prerequisites],
    [...entry.unlocks],
    entry.funFact,
    entry.imagePrompt,
    entry.status,
  ]);
}

const QUIZ_UPSERT_SQL = `
  INSERT INTO entry_quiz_questions (
    id, entry_id, difficulty_tier, question, options, correct_index, explanation
  ) VALUES ($1,$2,$3,$4,$5,$6,$7)
  ON CONFLICT (id) DO UPDATE SET
    entry_id        = EXCLUDED.entry_id,
    difficulty_tier = EXCLUDED.difficulty_tier,
    question        = EXCLUDED.question,
    options         = EXCLUDED.options,
    correct_index   = EXCLUDED.correct_index,
    explanation     = EXCLUDED.explanation
`;

async function seedQuiz(client: PoolClient, quiz: EntryQuizQuestion): Promise<void> {
  await client.query(QUIZ_UPSERT_SQL, [
    quiz.id,
    quiz.entryId,
    quiz.difficultyTier,
    quiz.question,
    [...quiz.options],
    quiz.correctIndex,
    quiz.explanation,
  ]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const pool = new Pool(buildPoolConfig());
  const client = await pool.connect();

  let entriesSeeded = 0;
  const worldsSeen = new Set<string>();
  let quizzesSeeded = 0;

  try {
    for (const entry of ALL_CONTENT_ENTRIES) {
      try {
        await seedEntry(client, entry);
        entriesSeeded++;
        worldsSeen.add(entry.worldId);
      } catch (err) {
        console.error(
          `[seed] Failed entry "${entry.id}":`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    for (const quiz of ALL_CONTENT_QUIZZES) {
      try {
        await seedQuiz(client, quiz);
        quizzesSeeded++;
      } catch (err) {
        console.error(
          `[seed] Failed quiz "${quiz.id}":`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    console.log(
      `Seeded ${String(entriesSeeded)} entries across ${String(worldsSeen.size)} worlds, ${String(quizzesSeeded)} quiz questions`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('[seed] Fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
