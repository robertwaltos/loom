/**
 * PG Analytics Repository — Simulation Tests
 *
 * Verifies emit(), getRecent(), and getByPlayer() using a mock pg Pool.
 *
 * Thread: silk/universe/analytics/pg-analytics-repo-sim
 * Tier: 1
 */

import { describe, it, expect, vi } from 'vitest';
import { createPgAnalyticsRepository } from '../pg-repository.js';

function makePool(rows: object[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  };
}

const FIXED_SERVER_TIME = new Date('2024-01-15T12:00:00Z');
const FIXED_CLIENT_TIME = new Date('2024-01-15T11:59:58Z');

function makeRow(overrides: Partial<{
  id: string; event_type: string; player_id: string | null; world_id: string | null;
  session_id: string | null; properties: object; server_time: Date; client_time: Date | null;
}> = {}) {
  return {
    id: '42',
    event_type: 'entry_completed',
    player_id: 'kindler-abc',
    world_id: 'cloud-kingdom',
    session_id: 'sess-xyz',
    properties: { tier: 2 },
    server_time: FIXED_SERVER_TIME,
    client_time: FIXED_CLIENT_TIME,
    ...overrides,
  };
}

describe('PgAnalyticsRepository', () => {
  describe('emit', () => {
    it('inserts a row into loom_analytics_events', async () => {
      const pool = makePool([]);
      const repo = createPgAnalyticsRepository(pool as never);
      await repo.emit({
        eventType: 'entry_completed',
        playerId: 'kindler-abc',
        worldId: 'cloud-kingdom',
        sessionId: 'sess-xyz',
        properties: { tier: 2 },
      });
      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO loom_analytics_events');
      expect(params[0]).toBe('entry_completed');
      expect(params[1]).toBe('kindler-abc');
      expect(params[2]).toBe('cloud-kingdom');
      expect(params[3]).toBe('sess-xyz');
    });

    it('serializes properties as JSON string', async () => {
      const pool = makePool([]);
      const repo = createPgAnalyticsRepository(pool as never);
      await repo.emit({ eventType: 'world_restore', properties: { luminance: 0.8 } });
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(params[4]).toBe('{"luminance":0.8}');
    });

    it('defaults null values for optional fields', async () => {
      const pool = makePool([]);
      const repo = createPgAnalyticsRepository(pool as never);
      await repo.emit({ eventType: 'server_start' });
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(params[1]).toBeNull();
      expect(params[2]).toBeNull();
      expect(params[3]).toBeNull();
      expect(params[5]).toBeNull();
    });

    it('converts clientTimeMs to ISO string', async () => {
      const pool = makePool([]);
      const repo = createPgAnalyticsRepository(pool as never);
      const ms = 1_700_000_000_000;
      await repo.emit({ eventType: 'e', clientTimeMs: ms });
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(typeof params[5]).toBe('string');
      expect(params[5]).toContain('2023');
    });
  });

  describe('getRecent', () => {
    it('queries loom_analytics_events with limit', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgAnalyticsRepository(pool as never);
      await repo.getRecent(10);
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('loom_analytics_events');
      expect(params[0]).toBe(10);
    });

    it('maps row to AnalyticsEvent correctly', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgAnalyticsRepository(pool as never);
      const events = await repo.getRecent();
      expect(events).toHaveLength(1);
      const e = events[0]!;
      expect(e.id).toBe(42);
      expect(e.eventType).toBe('entry_completed');
      expect(e.playerId).toBe('kindler-abc');
      expect(e.worldId).toBe('cloud-kingdom');
      expect(e.sessionId).toBe('sess-xyz');
      expect(e.properties).toEqual({ tier: 2 });
      expect(e.serverTimeMs).toBe(FIXED_SERVER_TIME.getTime());
      expect(e.clientTimeMs).toBe(FIXED_CLIENT_TIME.getTime());
    });

    it('maps null client_time to null clientTimeMs', async () => {
      const pool = makePool([makeRow({ client_time: null })]);
      const repo = createPgAnalyticsRepository(pool as never);
      const events = await repo.getRecent();
      expect(events[0]?.clientTimeMs).toBeNull();
    });

    it('defaults to limit 100', async () => {
      const pool = makePool([]);
      const repo = createPgAnalyticsRepository(pool as never);
      await repo.getRecent();
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(params[0]).toBe(100);
    });
  });

  describe('getByPlayer', () => {
    it('queries by player_id with limit', async () => {
      const pool = makePool([makeRow()]);
      const repo = createPgAnalyticsRepository(pool as never);
      await repo.getByPlayer('kindler-abc', 25);
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('WHERE player_id = $1');
      expect(params[0]).toBe('kindler-abc');
      expect(params[1]).toBe(25);
    });

    it('defaults to limit 200', async () => {
      const pool = makePool([]);
      const repo = createPgAnalyticsRepository(pool as never);
      await repo.getByPlayer('p');
      const [, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(params[1]).toBe(200);
    });
  });
});
