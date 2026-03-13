import { describe, expect, it } from 'vitest';
import {
  createTimescaleEventStore,
  migrateTimescale,
  type GameEvent,
  type HourlyCount,
  type TimescaleConfig,
} from '../timescale-store.js';
import type { Pool } from 'pg';

interface QueryCall {
  readonly sql: string;
  readonly params: readonly unknown[];
}

class FakeClient {
  readonly calls: QueryCall[] = [];
  private readonly throwIncludes: readonly string[];

  constructor(throwIncludes: readonly string[] = []) {
    this.throwIncludes = throwIncludes;
  }

  async query(sql: string, params?: readonly unknown[]): Promise<{ rows: readonly Record<string, unknown>[] }> {
    this.calls.push({ sql, params: params ?? [] });
    if (this.throwIncludes.some((token) => sql.includes(token))) {
      throw new Error(`forced failure: ${this.throwIncludes.find((t) => sql.includes(t))}`);
    }
    return { rows: [] };
  }

  release(): void {
    // no-op fake
  }
}

class FakePoolWithClient {
  readonly directCalls: QueryCall[] = [];
  readonly client: FakeClient;

  constructor(client: FakeClient) {
    this.client = client;
  }

  async connect(): Promise<FakeClient> {
    return this.client;
  }

  async query(sql: string, params?: readonly unknown[]): Promise<{ rows: readonly Record<string, unknown>[] }> {
    this.directCalls.push({ sql, params: params ?? [] });

    if (sql.includes('FROM game_events')) {
      return {
        rows: [
          {
            event_id: 'e-1',
            event_type: 'combat.attack',
            entity_id: 'ent-7',
            world_id: 'w-1',
            dynasty_id: null,
            payload: { damage: 7 },
            server_id: 'sv-a',
            sequence: '91',
          },
        ],
      };
    }

    if (sql.includes('FROM hourly_event_counts')) {
      return {
        rows: [
          {
            bucket: '2026-03-10T00:00:00.000Z',
            world_id: 'w-1',
            event_type: 'combat.attack',
            count: '5',
          },
        ],
      };
    }

    return { rows: [] };
  }
}

function asPool(fake: FakePoolWithClient): Pool {
  return fake as unknown as Pool;
}

describe('TimescaleStore simulation', () => {
  it('migrates timescale schema with BEGIN/COMMIT and expected structures', async () => {
    const client = new FakeClient();
    const pool = new FakePoolWithClient(client);

    await migrateTimescale(asPool(pool));

    const sql = client.calls.map((c) => c.sql).join('\n');
    expect(client.calls[0]?.sql).toContain('BEGIN');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS timescaledb');
    expect(sql).toContain("create_hypertable('game_events'");
    expect(sql).toContain('CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_event_counts');
    expect(client.calls[client.calls.length - 1]?.sql).toContain('COMMIT');
  });

  it('rolls back migration transaction when a query fails', async () => {
    const client = new FakeClient(['CREATE TABLE IF NOT EXISTS game_events']);
    const pool = new FakePoolWithClient(client);

    await expect(migrateTimescale(asPool(pool))).rejects.toThrow('forced failure');

    const sql = client.calls.map((c) => c.sql).join('\n');
    expect(sql).toContain('BEGIN');
    expect(sql).toContain('ROLLBACK');
  });

  it('skips compression/retention/continuous policies based on config flags', async () => {
    const client = new FakeClient();
    const pool = new FakePoolWithClient(client);
    const cfg: TimescaleConfig = {
      chunkIntervalHours: 4,
      compressionAfterDays: 0,
      retentionDays: 0,
      enableContinuousAggregates: false,
    };

    await migrateTimescale(asPool(pool), cfg);

    const sql = client.calls.map((c) => c.sql).join('\n');
    expect(sql.includes('add_compression_policy')).toBe(false);
    expect(sql.includes('add_retention_policy')).toBe(false);
    expect(sql.includes('CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_event_counts')).toBe(false);
  });

  it('inserts single event and serializes payload', async () => {
    const pool = new FakePoolWithClient(new FakeClient());
    const store = createTimescaleEventStore(asPool(pool));

    const event: GameEvent = {
      eventId: 'e-77',
      eventType: 'economy.tax',
      worldId: 'w-9',
      entityId: undefined,
      dynastyId: 'd-1',
      payload: { amount: 42 },
      serverId: 'sv-2',
      sequence: 3n,
    };

    await store.insertEvent(event);

    const call = pool.directCalls[0];
    expect(call?.sql).toContain('INSERT INTO game_events');
    expect(call?.params[5]).toBe(JSON.stringify({ amount: 42 }));
    expect(call?.params[2]).toBeNull();
  });

  it('batch insert uses one statement with correctly expanded placeholders', async () => {
    const pool = new FakePoolWithClient(new FakeClient());
    const store = createTimescaleEventStore(asPool(pool));

    await store.insertBatch([
      {
        eventId: 'e1',
        eventType: 'a',
        worldId: 'w',
        payload: { x: 1 },
        serverId: 's',
        sequence: 1n,
      },
      {
        eventId: 'e2',
        eventType: 'b',
        worldId: 'w',
        payload: { y: 2 },
        serverId: 's',
        sequence: 2n,
      },
    ]);

    const call = pool.directCalls[0];
    expect(call?.sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)');
    expect(call?.params).toHaveLength(16);
  });

  it('insertBatch short-circuits for empty arrays', async () => {
    const pool = new FakePoolWithClient(new FakeClient());
    const store = createTimescaleEventStore(asPool(pool));

    await store.insertBatch([]);

    expect(pool.directCalls).toHaveLength(0);
  });

  it('maps event and aggregate query results to runtime types', async () => {
    const pool = new FakePoolWithClient(new FakeClient());
    const store = createTimescaleEventStore(asPool(pool));

    const events = await store.queryEventsByType('w-1', 'combat.attack', 6);
    const counts: readonly HourlyCount[] = await store.getHourlyEventCounts('w-1', 24);

    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toEqual({ damage: 7 });
    expect(events[0]?.sequence).toBe(91n);
    expect(counts[0]?.bucket).toBeInstanceOf(Date);
    expect(counts[0]?.count).toBe(5);
  });
});
