/**
 * PG Achievements Repository — Simulation Tests
 *
 * Thread: silk/universe/achievements/pg-achievements-repo-sim
 * Tier: 1
 */

import { describe, it, expect, vi } from 'vitest';
import { createPgAchievementsRepository } from '../pg-repository.js';

function makePool(rows: object[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  };
}

const UNLOCKED_AT_DATE = new Date('2024-06-01T10:00:00Z');

function makeRow() {
  return {
    achievement_id: 'first-quiz',
    player_id: 'kindler-123',
    unlocked_at: UNLOCKED_AT_DATE,
    progress: 100,
    metadata: { tier: 1 },
  };
}

describe('PgAchievementsRepository', () => {
  describe('save', () => {
    it('issues an upsert to loom_achievements', async () => {
      const pool = makePool([]);
      const repo = createPgAchievementsRepository(pool as never);
      await repo.save({
        achievementId: 'first-quiz',
        playerId: 'kindler-123',
        unlockedAt: UNLOCKED_AT_DATE.getTime(),
        progress: 100,
        metadata: null,
      });
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO loom_achievements');
      expect(sql).toContain('ON CONFLICT');
      expect(params[0]).toBe('first-quiz');
      expect(params[1]).toBe('kindler-123');
      expect(params[3]).toBe(100);
    });
  });

  describe('getByPlayer', () => {
    it('selects from loom_achievements by player_id', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgAchievementsRepository(pool as never);
      const results = await repo.getByPlayer('kindler-123');
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('loom_achievements');
      expect(params[0]).toBe('kindler-123');
      expect(results).toHaveLength(1);
    });

    it('maps row fields to domain Achievement correctly', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgAchievementsRepository(pool as never);
      const results = await repo.getByPlayer('kindler-123');
      const a = results[0]!;
      expect(a.achievementId).toBe('first-quiz');
      expect(a.playerId).toBe('kindler-123');
      expect(a.progress).toBe(100);
      expect(a.unlockedAt).toBe(UNLOCKED_AT_DATE.getTime());
      expect(a.metadata).toEqual({ tier: 1 });
    });

    it('returns empty array when no achievements exist', async () => {
      const pool = makePool([]);
      const repo = createPgAchievementsRepository(pool as never);
      const results = await repo.getByPlayer('kindler-999');
      expect(results).toHaveLength(0);
    });
  });

  describe('getByAchievementId', () => {
    it('queries by achievement_id', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgAchievementsRepository(pool as never);
      await repo.getByAchievementId('first-quiz');
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('achievement_id = $1');
      expect(params[0]).toBe('first-quiz');
    });
  });

  describe('updateProgress', () => {
    it('issues an UPDATE to loom_achievements progress', async () => {
      const pool = makePool([]);
      const repo = createPgAchievementsRepository(pool as never);
      await repo.updateProgress('first-quiz', 'kindler-123', 75);
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('UPDATE loom_achievements');
      expect(sql).toContain('progress');
      expect(params[0]).toBe('first-quiz');
      expect(params[1]).toBe('kindler-123');
      expect(params[2]).toBe(75);
    });
  });
});
