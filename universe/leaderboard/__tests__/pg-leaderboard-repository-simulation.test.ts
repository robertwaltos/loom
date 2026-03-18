/**
 * PG Leaderboard Repository — Simulation Tests
 *
 * Thread: silk/universe/leaderboard/pg-leaderboard-repo-sim
 * Tier: 1
 */

import { describe, it, expect, vi } from 'vitest';
import { createPgLeaderboardRepository } from '../pg-repository.js';

function makePool(rows: object[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  };
}

const SNAP_DATE = new Date('2024-09-01T08:00:00Z');
const BOARD_ID = 'spark_global';

function makeRow(overrides: Partial<{
  id: string; board_id: string; player_id: string; display_name: string;
  score: string; rank: number; snapshot_at: Date;
}> = {}) {
  return {
    id: '1',
    board_id: BOARD_ID,
    player_id: 'kindler-a',
    display_name: 'Starfire',
    score: '750000',
    rank: 1,
    snapshot_at: SNAP_DATE,
    ...overrides,
  };
}

describe('PgLeaderboardRepository', () => {
  describe('saveSnapshot', () => {
    it('inserts into loom_leaderboard_snapshots and returns snapshot with id', async () => {
      const pool = makePool([{ id: '7' }]);
      const repo = createPgLeaderboardRepository(pool as never);
      const result = await repo.saveSnapshot({
        boardId: BOARD_ID,
        playerId: 'kindler-a',
        displayName: 'Starfire',
        score: 750_000,
        rank: 1,
        snapshotAt: SNAP_DATE.getTime(),
      });
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO loom_leaderboard_snapshots');
      expect(params[0]).toBe(BOARD_ID);
      expect(params[1]).toBe('kindler-a');
      expect(params[2]).toBe('Starfire');
      expect(params[3]).toBe(750_000);
      expect(result.id).toBe(7);
    });
  });

  describe('getTopScores', () => {
    it('queries loom_leaderboard_snapshots with board_id', async () => {
      const pool = makePool([makeRow(), makeRow({ id: '2', player_id: 'kindler-b', score: '600000', rank: 2 })]);
      const repo = createPgLeaderboardRepository(pool as never);
      const top = await repo.getTopScores(BOARD_ID, 10);
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql.toLowerCase()).toContain('board_id');
      expect(params[0]).toBe(BOARD_ID);
      expect(top).toHaveLength(2);
    });

    it('maps score string to number via parseInt', async () => {
      const pool = makePool([makeRow({ score: '750000' })]);
      const repo = createPgLeaderboardRepository(pool as never);
      const top = await repo.getTopScores(BOARD_ID, 5);
      expect(typeof top[0]?.score).toBe('number');
      expect(top[0]?.score).toBe(750_000);
    });

    it('maps snapshotAt to ms via Date constructor', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgLeaderboardRepository(pool as never);
      const top = await repo.getTopScores(BOARD_ID, 5);
      expect(top[0]?.snapshotAt).toBe(SNAP_DATE.getTime());
    });

    it('returns empty array for empty board', async () => {
      const pool = makePool([]);
      const repo = createPgLeaderboardRepository(pool as never);
      const top = await repo.getTopScores(BOARD_ID);
      expect(top).toHaveLength(0);
    });
  });

  describe('getPlayerRank', () => {
    it('queries by board_id and player_id', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgLeaderboardRepository(pool as never);
      const snap = await repo.getPlayerRank(BOARD_ID, 'kindler-a');
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(params[0]).toBe(BOARD_ID);
      expect(params[1]).toBe('kindler-a');
      expect(snap?.playerId).toBe('kindler-a');
      expect(snap?.score).toBe(750_000);
    });

    it('returns null when player has no snapshot', async () => {
      const pool = makePool([]);
      const repo = createPgLeaderboardRepository(pool as never);
      const snap = await repo.getPlayerRank(BOARD_ID, 'ghost-player');
      expect(snap).toBeNull();
    });
  });

  describe('getPlayerCount', () => {
    it('queries by board_id and returns count as a number', async () => {
      const pool = makePool([{ count: '42' }]);
      const repo = createPgLeaderboardRepository(pool as never);
      const count = await repo.getPlayerCount(BOARD_ID);
      expect(count).toBe(42);
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(params[0]).toBe(BOARD_ID);
    });
  });
});

