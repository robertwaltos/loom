import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPgChronicleStore,
  createPgEventStore,
  createPgPool,
  migrateSchema,
  type DomainEventRow,
} from '../pg-persistence.js';
import type { ChronicleEntry, ChronicleFilter } from '../chronicle.js';
import type { Pool } from 'pg';

let capturedPgPoolConfig: unknown;

vi.mock('pg', () => {
  class MockPool {
    constructor(config: unknown) {
      capturedPgPoolConfig = config;
    }
  }

  return {
    default: {
      Pool: MockPool,
    },
  };
});

interface QueryCall {
  readonly sql: string;
  readonly params: readonly unknown[];
}

class FakePool {
  readonly calls: QueryCall[] = [];
  readonly responses: Array<{ rows: readonly Record<string, unknown>[] }> = [];

  enqueue(rows: readonly Record<string, unknown>[]): void {
    this.responses.push({ rows });
  }

  async query(sql: string, params?: readonly unknown[]): Promise<{ rows: readonly Record<string, unknown>[] }> {
    this.calls.push({ sql, params: params ?? [] });
    return this.responses.shift() ?? { rows: [] };
  }
}

function asPool(fake: FakePool): Pool {
  return fake as unknown as Pool;
}

function makeChronicleEntry(overrides?: Partial<ChronicleEntry>): ChronicleEntry {
  return {
    entryId: overrides?.entryId ?? 'e-1',
    index: overrides?.index ?? 1,
    timestamp: overrides?.timestamp ?? 1000,
    category: overrides?.category ?? 'world_event',
    worldId: overrides?.worldId ?? 'w-1',
    subjectId: overrides?.subjectId ?? 's-1',
    content: overrides?.content ?? 'entry',
    hash: overrides?.hash ?? 'h1',
    previousHash: overrides?.previousHash ?? 'h0',
  };
}

describe('pg-persistence simulation', () => {
  beforeEach(() => {
    capturedPgPoolConfig = undefined;
  });

  it('creates pg pool with mapped config options', async () => {
    const pool = await createPgPool({
      connectionString: 'postgres://user:pw@localhost/db',
      maxConnections: 22,
      idleTimeoutMs: 1234,
      ssl: true,
    });

    expect(pool).toBeDefined();
    expect(capturedPgPoolConfig).toMatchObject({
      connectionString: 'postgres://user:pw@localhost/db',
      max: 22,
      idleTimeoutMillis: 1234,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('runs schema migration DDL statements', async () => {
    const fake = new FakePool();

    await migrateSchema(asPool(fake));

    const sql = fake.calls.map((c) => c.sql).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS chronicle_entries');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS domain_events');
    expect(sql).toContain('idx_events_aggregate');
  });

  it('chronicle store inserts and maps lookup/query/count operations', async () => {
    const fake = new FakePool();
    const store = createPgChronicleStore(asPool(fake));

    await store.insertEntry(makeChronicleEntry());
    expect(fake.calls[0]?.sql).toContain('INSERT INTO chronicle_entries');
    expect(fake.calls[0]?.params[0]).toBe('e-1');

    fake.enqueue([
      {
        entry_id: 'e-22',
        index_num: 22,
        timestamp_micros: 777,
        category: 'world_event',
        world_id: 'w-2',
        subject_id: 'sub-2',
        content: 'hello',
        hash: 'h22',
        previous_hash: 'h21',
      },
    ]);
    const byId = await store.getById('e-22');
    expect(byId?.entryId).toBe('e-22');
    expect(byId?.index).toBe(22);

    fake.enqueue([]);
    expect(await store.getByIndex(999)).toBeUndefined();

    const filter: ChronicleFilter = {
      category: 'world_event',
      worldId: 'w-2',
      subjectId: 'sub-2',
      fromIndex: 10,
      toIndex: 30,
    };
    fake.enqueue([
      {
        entry_id: 'e-10',
        index_num: 10,
        timestamp_micros: 1,
        category: 'world_event',
        world_id: 'w-2',
        subject_id: 'sub-2',
        content: 'a',
        hash: 'h10',
        previous_hash: 'h9',
      },
    ]);
    const queried = await store.query(filter);
    const queryCall = fake.calls[fake.calls.length - 1];
    expect(queryCall?.sql).toContain('WHERE category = $1 AND world_id = $2 AND subject_id = $3 AND index_num >= $4 AND index_num <= $5');
    expect(queryCall?.params).toEqual(['world_event', 'w-2', 'sub-2', 10, 30]);
    expect(queried[0]?.entryId).toBe('e-10');

    fake.enqueue([
      {
        entry_id: 'e-99',
        index_num: 99,
        timestamp_micros: 9,
        category: 'world_event',
        world_id: 'w-9',
        subject_id: 'sub-9',
        content: 'z',
        hash: 'h99',
        previous_hash: 'h98',
      },
    ]);
    const latest = await store.latest();
    expect(latest?.index).toBe(99);

    fake.enqueue([{ count: '12' }]);
    expect(await store.count()).toBe(12);
  });

  it('event store appends/maps aggregate stream and latest version defaults', async () => {
    const fake = new FakePool();
    const store = createPgEventStore(asPool(fake));
    const event: DomainEventRow = {
      eventId: 'de-1',
      aggregateId: 'agg-1',
      aggregateType: 'dynasty',
      eventType: 'dynasty.created',
      version: 1,
      payload: '{"x":1}',
      occurredAt: 2222n,
    };

    await store.appendEvent(event);
    const appendCall = fake.calls[0];
    expect(appendCall?.sql).toContain('INSERT INTO domain_events');
    expect(appendCall?.params[6]).toBe('2222');

    fake.enqueue([
      {
        event_id: 'de-1',
        aggregate_id: 'agg-1',
        aggregate_type: 'dynasty',
        event_type: 'dynasty.created',
        version: 1,
        payload: { x: 1 },
        occurred_at: '2222',
      },
    ]);
    const events = await store.getEventsByAggregate('agg-1');
    const queryCall = fake.calls[fake.calls.length - 1];
    expect(queryCall?.params).toEqual(['agg-1', 0]);
    expect(events[0]?.payload).toBe('{"x":1}');
    expect(events[0]?.occurredAt).toBe(2222n);

    fake.enqueue([{ max_version: null }]);
    expect(await store.getLatestVersion('agg-1')).toBe(0);

    fake.enqueue([{ max_version: 7 }]);
    expect(await store.getLatestVersion('agg-1')).toBe(7);
  });
});
