/**
 * PgMiniGameRepository — PostgreSQL simulation tests.
 *
 * Requires a live PostgreSQL instance:
 *   PG_HOST=localhost PG_PORT=5433 PG_USER=loom PG_PASSWORD=loom PG_DATABASE=loom
 *
 * Table created/dropped around each test run.
 * SKIP automatically if no DB connection available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createPgMiniGameRepository } from '../pg-repository.js';

const DB_CONFIG = {
  host: process.env['PG_HOST'] ?? 'localhost',
  port: parseInt(process.env['PG_PORT'] ?? '5433', 10),
  user: process.env['PG_USER'] ?? 'loom',
  password: process.env['PG_PASSWORD'] ?? 'loom',
  database: process.env['PG_DATABASE'] ?? 'loom',
  connectionTimeoutMillis: 2000,
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS koydo_mini_game_attempts (
    id            BIGSERIAL    PRIMARY KEY,
    game_id       VARCHAR(64)  NOT NULL,
    kindler_id    UUID         NOT NULL,
    score         INT          NOT NULL DEFAULT 0,
    max_score     INT          NOT NULL DEFAULT 100,
    difficulty    INT          NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 10),
    completed     BOOLEAN      NOT NULL DEFAULT true,
    time_taken_ms INT,
    completed_at  BIGINT       NOT NULL
  )
`;

const GAME_ID = 'storm-chaser';
const KINDLER_A = '11111111-0000-0000-0000-000000000001';
const KINDLER_B = '22222222-0000-0000-0000-000000000002';

let pool: pg.Pool;

beforeAll(async () => {
  pool = new pg.Pool(DB_CONFIG);
  try {
    await pool.query('SELECT 1');
  } catch {
    await pool.end();
    pool = undefined as unknown as pg.Pool;
    return;
  }
  await pool.query('DROP TABLE IF EXISTS koydo_mini_game_attempts');
  await pool.query(SCHEMA);
});

afterAll(async () => {
  if (pool) {
    await pool.query('DROP TABLE IF EXISTS koydo_mini_game_attempts');
    await pool.end();
  }
});

function skipIfNoDb() {
  if (pool === undefined) return true;
  return false;
}

describe('PgMiniGameRepository — simulation', () => {
  it('recordAttempt: persists a mini-game attempt', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    const now = Date.now();
    const attempt = await repo.recordAttempt(GAME_ID, KINDLER_A, 85, 100, 2, now, 12000);
    expect(attempt.id).toBeGreaterThan(0);
    expect(attempt.gameId).toBe(GAME_ID);
    expect(attempt.kindlerId).toBe(KINDLER_A);
    expect(attempt.score).toBe(85);
    expect(attempt.maxScore).toBe(100);
    expect(attempt.difficulty).toBe(2);
    expect(attempt.timeTakenMs).toBe(12000);
    expect(attempt.completedAt).toBe(now);
    expect(attempt.completed).toBe(true);
  });

  it('recordAttempt: null timeTakenMs when not provided', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    const attempt = await repo.recordAttempt(GAME_ID, KINDLER_A, 60, 100, 1, Date.now());
    expect(attempt.timeTakenMs).toBeNull();
  });

  it('getStats: returns aggregated stats for a kindler', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    // Record a third attempt to make stats deterministic
    await repo.recordAttempt(GAME_ID, KINDLER_A, 90, 100, 3, Date.now());
    const stats = await repo.getStats(GAME_ID, KINDLER_A);
    expect(stats).not.toBeNull();
    expect(stats!.gameId).toBe(GAME_ID);
    expect(stats!.kindlerId).toBe(KINDLER_A);
    expect(stats!.totalAttempts).toBeGreaterThanOrEqual(3);
    expect(stats!.bestScore).toBe(90);
    expect(stats!.averageScore).toBeGreaterThan(0);
    expect(stats!.lastPlayedAt).toBeGreaterThan(0);
  });

  it('getStats: returns null when kindler has no attempts', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    const stats = await repo.getStats(GAME_ID, KINDLER_B);
    expect(stats).toBeNull();
  });

  it('getRecentAttempts: returns attempts for a kindler', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    const attempts = await repo.getRecentAttempts(KINDLER_A);
    expect(attempts.length).toBeGreaterThanOrEqual(3);
    // Should be ordered newest first
    for (let i = 1; i < attempts.length; i++) {
      expect(attempts[i - 1]!.completedAt).toBeGreaterThanOrEqual(attempts[i]!.completedAt);
    }
  });

  it('getRecentAttempts: filtered by gameId', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    // Record an attempt for a different game
    await repo.recordAttempt('word-puzzle', KINDLER_A, 50, 100, 1, Date.now());
    const stormAttempts = await repo.getRecentAttempts(KINDLER_A, GAME_ID);
    expect(stormAttempts.every(a => a.gameId === GAME_ID)).toBe(true);
  });

  it('getRecentAttempts: returns empty array for unknown kindler', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    const attempts = await repo.getRecentAttempts('99999999-9999-9999-9999-999999999999');
    expect(attempts).toHaveLength(0);
  });

  it('getRecentAttempts: respects limit parameter', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    // Add more attempts
    for (let i = 0; i < 5; i++) {
      await repo.recordAttempt(GAME_ID, KINDLER_A, i * 10, 100, 1, Date.now() + i);
    }
    const limited = await repo.getRecentAttempts(KINDLER_A, GAME_ID, 3);
    expect(limited.length).toBeLessThanOrEqual(3);
  });

  it('recordAttempt: score=0 is valid', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    const attempt = await repo.recordAttempt('fair-trade', KINDLER_B, 0, 100, 1, Date.now());
    expect(attempt.score).toBe(0);
    expect(attempt.kindlerId).toBe(KINDLER_B);
  });

  it('recordAttempt: max difficulty=10 is stored correctly', async () => {
    if (skipIfNoDb()) return;
    const repo = createPgMiniGameRepository(pool);
    const attempt = await repo.recordAttempt(GAME_ID, KINDLER_B, 99, 100, 10, Date.now());
    expect(attempt.difficulty).toBe(10);
  });
});
