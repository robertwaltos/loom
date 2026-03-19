/**
 * PgQuestChainsRepository — PostgreSQL simulation tests.
 *
 * Requires a live PostgreSQL instance:
 *   PG_HOST=localhost PG_PORT=5433 PG_USER=loom PG_PASSWORD=loom PG_DATABASE=loom
 *
 * Tables created/dropped around each test run.
 * SKIP automatically if no DB connection available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createPgQuestChainsRepository } from '../pg-quest-chains-repository.js';

const DB_CONFIG = {
  host: process.env['PG_HOST'] ?? 'localhost',
  port: parseInt(process.env['PG_PORT'] ?? '5433', 10),
  user: process.env['PG_USER'] ?? 'loom',
  password: process.env['PG_PASSWORD'] ?? 'loom',
  database: process.env['PG_DATABASE'] ?? 'loom',
  connectionTimeoutMillis: 2000,
};

const SCHEMA_PROGRESS = `
  CREATE TABLE IF NOT EXISTS koydo_quest_progress (
    id            BIGSERIAL    PRIMARY KEY,
    kindler_id    UUID         NOT NULL,
    quest_id      VARCHAR(64)  NOT NULL,
    step_index    INT          NOT NULL,
    completed_at  BIGINT       NOT NULL,
    UNIQUE (kindler_id, quest_id, step_index)
  )
`;

const SCHEMA_STARTS = `
  CREATE TABLE IF NOT EXISTS koydo_quest_starts (
    kindler_id    UUID         NOT NULL,
    quest_id      VARCHAR(64)  NOT NULL,
    started_at    BIGINT       NOT NULL,
    PRIMARY KEY (kindler_id, quest_id)
  )
`;

const KINDLER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const KINDLER_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const QUEST_WATER = 'water-weavers';
const QUEST_WIND = 'wind-spinners';
const NOW = Date.now();

let pool: pg.Pool;
let skip = false;

beforeAll(async () => {
  try {
    pool = new pg.Pool(DB_CONFIG);
    await pool.query('SELECT 1');
    await pool.query(SCHEMA_PROGRESS);
    await pool.query(SCHEMA_STARTS);
    await pool.query(`DELETE FROM koydo_quest_starts WHERE kindler_id IN ($1, $2)`, [KINDLER_A, KINDLER_B]);
    await pool.query(`DELETE FROM koydo_quest_progress WHERE kindler_id IN ($1, $2)`, [KINDLER_A, KINDLER_B]);
  } catch {
    skip = true;
  }
});

afterAll(async () => {
  if (!skip && pool) {
    await pool.query(`DELETE FROM koydo_quest_starts WHERE kindler_id IN ($1, $2)`, [KINDLER_A, KINDLER_B]);
    await pool.query(`DELETE FROM koydo_quest_progress WHERE kindler_id IN ($1, $2)`, [KINDLER_A, KINDLER_B]);
    await pool.end();
  }
});

describe('PgQuestChainsRepository', () => {
  it('startQuest — creates a start record', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const record = await repo.startQuest(KINDLER_A, QUEST_WATER, NOW);
    expect(record.kindlerId).toBe(KINDLER_A);
    expect(record.questId).toBe(QUEST_WATER);
    expect(record.startedAt).toBe(NOW);
  });

  it('startQuest — idempotent: re-calling returns same record', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const first = await repo.startQuest(KINDLER_A, QUEST_WATER, NOW);
    const second = await repo.startQuest(KINDLER_A, QUEST_WATER, NOW + 5000);
    expect(first.startedAt).toBe(second.startedAt);
  });

  it('completeStep — records a step completion', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const rec = await repo.completeStep(KINDLER_A, QUEST_WATER, 0, NOW + 1000);
    expect(rec).not.toBeNull();
    expect(rec?.stepIndex).toBe(0);
    expect(rec?.questId).toBe(QUEST_WATER);
  });

  it('completeStep — idempotent: re-calling same step returns null', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const rec = await repo.completeStep(KINDLER_A, QUEST_WATER, 0, NOW + 2000);
    expect(rec).toBeNull();
  });

  it('completeStep — different steps recorded separately', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const step1 = await repo.completeStep(KINDLER_A, QUEST_WATER, 1, NOW + 3000);
    const step2 = await repo.completeStep(KINDLER_A, QUEST_WATER, 2, NOW + 4000);
    expect(step1?.stepIndex).toBe(1);
    expect(step2?.stepIndex).toBe(2);
  });

  it('getQuestProgress — returns progress for a single quest', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const progress = await repo.getQuestProgress(KINDLER_A, QUEST_WATER);
    expect(progress).not.toBeNull();
    expect(progress?.questId).toBe(QUEST_WATER);
    expect(progress?.startedAt).toBe(NOW);
    expect(progress?.completedStepIndices).toContain(0);
    expect(progress?.completedStepIndices).toContain(1);
    expect(progress?.completedStepIndices).toContain(2);
  });

  it('getQuestProgress — returns null for unknown quest', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const progress = await repo.getQuestProgress(KINDLER_A, 'no-such-quest');
    expect(progress).toBeNull();
  });

  it('getProgressForKindler — returns all quests for a kindler', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    await repo.startQuest(KINDLER_A, QUEST_WIND, NOW + 10000);
    await repo.completeStep(KINDLER_A, QUEST_WIND, 0, NOW + 11000);
    const all = await repo.getProgressForKindler(KINDLER_A);
    const questIds = all.map((p) => p.questId);
    expect(questIds).toContain(QUEST_WATER);
    expect(questIds).toContain(QUEST_WIND);
  });

  it('getStartedQuestIds — lists all started quests for a kindler', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const ids = await repo.getStartedQuestIds(KINDLER_A);
    expect(ids).toContain(QUEST_WATER);
    expect(ids).toContain(QUEST_WIND);
  });

  it('getProgressForKindler — returns empty array for unknown kindler', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const all = await repo.getProgressForKindler(KINDLER_B);
    expect(all).toHaveLength(0);
  });

  it('getStartedQuestIds — returns empty array for unknown kindler', async () => {
    if (skip) return;
    const repo = createPgQuestChainsRepository(pool);
    const ids = await repo.getStartedQuestIds(KINDLER_B);
    expect(ids).toHaveLength(0);
  });
});
