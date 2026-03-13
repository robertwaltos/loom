import { describe, expect, it } from 'vitest';
import {
  createPgEventArchive,
  migrateEventArchiveSchema,
  type ArchiveEventParams,
  type ArchivedEventRow,
  type TimeRangeQueryParams,
} from '../pg-event-archive.js';
import type { Pool } from 'pg';

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

function makeRow(overrides?: Partial<ArchivedEventRow>): ArchivedEventRow {
  return {
    event_id: overrides?.event_id ?? 'ev-1',
    event_type: overrides?.event_type ?? 'world.tick',
    world_id: overrides?.world_id ?? 'w-1',
    entity_id: overrides?.entity_id ?? null,
    payload: overrides?.payload ?? '{"k":1}',
    occurred_at: overrides?.occurred_at ?? '100',
    archived_at: overrides?.archived_at ?? '2026-03-12T00:00:00.000Z',
    sequence_number: overrides?.sequence_number ?? '1',
  };
}

describe('PgEventArchive simulation', () => {
  it('runs event archive migration DDL statements', async () => {
    const fake = new FakePool();

    await migrateEventArchiveSchema(asPool(fake));

    const sql = fake.calls.map((c) => c.sql).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS event_archive');
    expect(sql).toContain('idx_event_archive_world_seq');
  });

  it('appends event and returns sequence number', async () => {
    const fake = new FakePool();
    const archive = createPgEventArchive(asPool(fake));
    fake.enqueue([{ sequence_number: '42' }]);

    const params: ArchiveEventParams = {
      eventId: 'ev-1',
      eventType: 'dynasty.founded',
      worldId: 'w-1',
      payload: '{"founder":"d1"}',
      occurredAt: 123,
    };

    const seq = await archive.append(params);

    expect(seq).toBe(42);
    expect(fake.calls[0]?.sql).toContain('RETURNING sequence_number');
    expect(fake.calls[0]?.params[3]).toBeNull();
  });

  it('throws when append insert returns no row', async () => {
    const fake = new FakePool();
    const archive = createPgEventArchive(asPool(fake));
    fake.enqueue([]);

    await expect(
      archive.append({
        eventId: 'ev-x',
        eventType: 'x',
        worldId: 'w',
        payload: '{}',
        occurredAt: 1,
      }),
    ).rejects.toThrow('Insert returned no sequence number');
  });

  it('queries with combined filters and maps replay events', async () => {
    const fake = new FakePool();
    const archive = createPgEventArchive(asPool(fake));
    const row = makeRow({
      event_id: 'ev-22',
      event_type: 'combat.attack',
      world_id: 'w-22',
      entity_id: 'ent-2',
      payload: '{"damage":9}',
      occurred_at: '777',
      sequence_number: '9',
    });
    fake.enqueue([row]);

    const query: TimeRangeQueryParams = {
      eventType: 'combat.attack',
      worldId: 'w-22',
      entityId: 'ent-2',
      startTime: 700,
      endTime: 800,
      limit: 10,
    };

    const events = await archive.query(query);
    const call = fake.calls[0];

    expect(call?.sql).toContain('WHERE event_type = $1 AND world_id = $2 AND entity_id = $3 AND occurred_at >= $4 AND occurred_at <= $5');
    expect(call?.sql).toContain('LIMIT $6');
    expect(call?.params).toEqual(['combat.attack', 'w-22', 'ent-2', 700, 800, 10]);
    expect(events[0]?.eventId).toBe('ev-22');
    expect(events[0]?.payload).toEqual({ damage: 9 });
    expect(events[0]?.sequenceNumber).toBe(9);
  });

  it('replays world events from optional sequence and returns eventCount', async () => {
    const fake = new FakePool();
    const archive = createPgEventArchive(asPool(fake));
    fake.enqueue([
      makeRow({ event_id: 'a', world_id: 'w-r', sequence_number: '100' }),
      makeRow({ event_id: 'b', world_id: 'w-r', sequence_number: '101' }),
    ]);

    const replay = await archive.replay('w-r', 100);
    const call = fake.calls[0];

    expect(call?.sql).toContain('world_id = $1 AND sequence_number >= $2');
    expect(call?.params).toEqual(['w-r', 100]);
    expect(replay.eventCount).toBe(2);
    expect(replay.events[0]?.sequenceNumber).toBe(100);
  });

  it('returns latest sequence and total count with numeric coercion defaults', async () => {
    const fake = new FakePool();
    const archive = createPgEventArchive(asPool(fake));

    fake.enqueue([{ max: null }]);
    expect(await archive.getLatestSequence()).toBe(0);

    fake.enqueue([{ max: '88' }]);
    expect(await archive.getLatestSequence()).toBe(88);

    fake.enqueue([{ count: '5' }]);
    expect(await archive.count()).toBe(5);
  });
});
