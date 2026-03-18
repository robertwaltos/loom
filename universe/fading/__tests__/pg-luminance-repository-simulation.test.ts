/**
 * PG Luminance Repository — Simulation Tests
 *
 * Verifies loadAll() and save() behavior using a mock pg Pool.
 * Ensures correct SQL, correct UPSERT, and graceful empty-table handling.
 *
 * Thread: silk/universe/fading/pg-luminance-repo-sim
 * Tier: 1
 */

import { describe, it, expect, vi } from 'vitest';
import { createPgLuminanceRepository } from '../pg-luminance-repository.js';
import type { WorldLuminance } from '../../worlds/types.js';

// ─── Mock Pool ────────────────────────────────────────────────────

function makePool(rows: object[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────

const FIXED_NOW = 1_700_000_000_000;

function makeRow(worldId = 'cloud-kingdom') {
  return {
    world_id: worldId,
    luminance: 0.75,
    stage: 'glowing',
    last_restored_at: FIXED_NOW,
    total_kindlers_contributed: 12,
    active_kindler_count: 3,
  };
}

function makeWl(worldId = 'cloud-kingdom'): WorldLuminance {
  return {
    worldId,
    luminance: 0.75,
    stage: 'glowing',
    lastRestoredAt: FIXED_NOW,
    totalKindlersContributed: 12,
    activeKindlerCount: 3,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('PgLuminanceRepository', () => {
  describe('loadAll', () => {
    it('returns an empty Map when no rows exist', async () => {
      const pool = makePool([]);
      const repo = createPgLuminanceRepository(pool as never);
      const result = await repo.loadAll();
      expect(result.size).toBe(0);
    });

    it('returns a Map keyed by worldId for returned rows', async () => {
      const pool = makePool([makeRow('cloud-kingdom'), makeRow('river-delta')]);
      const repo = createPgLuminanceRepository(pool as never);
      const result = await repo.loadAll();
      expect(result.size).toBe(2);
      expect(result.has('cloud-kingdom')).toBe(true);
      expect(result.has('river-delta')).toBe(true);
    });

    it('maps row fields to domain WorldLuminance correctly', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgLuminanceRepository(pool as never);
      const result = await repo.loadAll();
      const wl = result.get('cloud-kingdom');
      expect(wl?.worldId).toBe('cloud-kingdom');
      expect(wl?.luminance).toBe(0.75);
      expect(wl?.stage).toBe('glowing');
      expect(wl?.lastRestoredAt).toBe(FIXED_NOW);
      expect(wl?.totalKindlersContributed).toBe(12);
      expect(wl?.activeKindlerCount).toBe(3);
    });

    it('issues a SELECT * FROM world_luminance query', async () => {
      const pool = makePool([]);
      const repo = createPgLuminanceRepository(pool as never);
      await repo.loadAll();
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
      expect(sql).toContain('SELECT');
      expect(sql.toLowerCase()).toContain('world_luminance');
    });
  });

  describe('save', () => {
    it('issues an UPSERT to world_luminance', async () => {
      const pool = makePool([]);
      const repo = createPgLuminanceRepository(pool as never);
      await repo.save(makeWl());
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO world_luminance');
      expect(sql).toContain('ON CONFLICT');
      expect(params[0]).toBe('cloud-kingdom');
      expect(params[1]).toBe(0.75);
      expect(params[2]).toBe('glowing');
    });

    it('passes all six columns in correct order', async () => {
      const pool = makePool([]);
      const repo = createPgLuminanceRepository(pool as never);
      await repo.save(makeWl('river-delta'));
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      // $1=world_id, $2=luminance, $3=stage, $4=last_restored_at, $5=total_kindlers_contributed, $6=active_kindler_count
      expect(params).toHaveLength(6);
      expect(params[0]).toBe('river-delta');
      expect(params[3]).toBe(FIXED_NOW);
      expect(params[4]).toBe(12);
      expect(params[5]).toBe(3);
    });

    it('can save deep_fade stage', async () => {
      const pool = makePool([]);
      const repo = createPgLuminanceRepository(pool as never);
      await repo.save({ ...makeWl(), luminance: 0.05, stage: 'deep_fade' });
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(params[1]).toBe(0.05);
      expect(params[2]).toBe('deep_fade');
    });
  });
});
