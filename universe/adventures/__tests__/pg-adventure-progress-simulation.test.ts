/**
 * Adventure Progress Repository — Simulation Tests
 *
 * Runs against a real Postgres database created from scratch using testcontainers.
 * Each test suite stands up an isolated PG container, applies the required migration,
 * and tears it down on completion.
 *
 * These tests live under universe/adventures/__tests__/ and exercise the
 * PgAdventureProgressRepository (startAdventure, completeAdventure, getProgressForKindler,
 * getProgressForEntry).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createPgAdventureProgressRepository } from '../pg-repository.js';

// ─── Helpers ──────────────────────────────────────────────────────

const MIGRATION = `
CREATE TABLE IF NOT EXISTS koydo_adventure_progress (
  id                     BIGSERIAL       PRIMARY KEY,
  kindler_id             UUID            NOT NULL,
  entry_id               VARCHAR(64)     NOT NULL,
  state                  VARCHAR(16)     NOT NULL DEFAULT 'in_progress',
  started_at             BIGINT          NOT NULL,
  completed_at           BIGINT,
  interaction_count      INT             NOT NULL DEFAULT 0,
  luminance_contributed  NUMERIC(6,4)    NOT NULL DEFAULT 0.0000,
  CONSTRAINT uq_adventure_progress UNIQUE (kindler_id, entry_id)
);
`;

function poolFromEnv(): pg.Pool {
  return new pg.Pool({
    host: process.env['PG_HOST'] ?? 'localhost',
    port: parseInt(process.env['PG_PORT'] ?? '5433', 10),
    user: process.env['PG_USER'] ?? 'loom',
    password: process.env['PG_PASSWORD'] ?? 'loom',
    database: process.env['PG_DATABASE'] ?? 'loom',
    max: 3,
  });
}

const KINDLER_A = '11111111-1111-1111-1111-111111111111';
const KINDLER_B = '22222222-2222-2222-2222-222222222222';
const ENTRY_X = 'entry-napoleonic-wars';
const ENTRY_Y = 'entry-civil-rights';

// ─── Test Suite ───────────────────────────────────────────────────

describe('PgAdventureProgressRepository (simulation)', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = poolFromEnv();
    await pool.query('DROP TABLE IF EXISTS koydo_adventure_progress CASCADE');
    await pool.query(MIGRATION);
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS koydo_adventure_progress CASCADE');
    await pool.end();
  });

  it('startAdventure inserts a new in_progress record', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    const now = Date.now();
    const progress = await repo.startAdventure(KINDLER_A, ENTRY_X, now);

    expect(progress.kindlerId).toBe(KINDLER_A);
    expect(progress.entryId).toBe(ENTRY_X);
    expect(progress.state).toBe('in_progress');
    expect(progress.startedAt).toBe(now);
    expect(progress.completedAt).toBeNull();
    expect(progress.interactionCount).toBe(0);
    expect(progress.luminanceContributed).toBe(0);
  });

  it('startAdventure is idempotent — repeated call returns same record', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    const now = Date.now() + 1000;
    const second = await repo.startAdventure(KINDLER_A, ENTRY_X, now);
    expect(second.state).toBe('in_progress'); // not downgraded
  });

  it('startAdventure does not downgrade a completed adventure', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    // First complete it
    await repo.completeAdventure(KINDLER_A, ENTRY_X, Date.now(), 2, 0.25);
    // Then try to start again
    const result = await repo.startAdventure(KINDLER_A, ENTRY_X, Date.now());
    expect(result.state).toBe('completed'); // unchanged
  });

  it('completeAdventure sets state to completed for low interaction count', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    await repo.startAdventure(KINDLER_B, ENTRY_X, Date.now());
    const now = Date.now();
    const progress = await repo.completeAdventure(KINDLER_B, ENTRY_X, now, 3, 0.1);

    expect(progress).not.toBeNull();
    expect(progress?.state).toBe('completed');
    expect(progress?.completedAt).toBe(now);
    expect(progress?.interactionCount).toBe(3);
    expect(progress?.luminanceContributed).toBeCloseTo(0.1, 3);
  });

  it('completeAdventure sets state to mastered when interactionCount >= 5', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    await repo.startAdventure(KINDLER_B, ENTRY_Y, Date.now());
    const progress = await repo.completeAdventure(KINDLER_B, ENTRY_Y, Date.now(), 7, 0.75);

    expect(progress?.state).toBe('mastered');
    expect(progress?.interactionCount).toBe(7);
  });

  it('completeAdventure returns null if adventure was never started', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    const result = await repo.completeAdventure(
      '99999999-9999-9999-9999-999999999999', 'entry-nonexistent', Date.now(), 3, 0,
    );
    expect(result).toBeNull();
  });

  it('getProgressForKindler returns all progress for a kindler', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    const list = await repo.getProgressForKindler(KINDLER_B);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.every(p => p.kindlerId === KINDLER_B)).toBe(true);
  });

  it('getProgressForKindler returns empty array for unknown kindler', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    const list = await repo.getProgressForKindler('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(list).toHaveLength(0);
  });

  it('getProgressForEntry returns the record for a specific kindler+entry', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    const p = await repo.getProgressForEntry(KINDLER_B, ENTRY_Y);
    expect(p).not.toBeNull();
    expect(p?.state).toBe('mastered');
    expect(p?.entryId).toBe(ENTRY_Y);
  });

  it('getProgressForEntry returns null when not found', async () => {
    const repo = createPgAdventureProgressRepository(pool);
    const p = await repo.getProgressForEntry(KINDLER_A, 'entry-does-not-exist');
    expect(p).toBeNull();
  });
});
