import { describe, it, expect } from 'vitest';
import { createConnectionPool } from '../connection-pool.js';

let idSeq = 0;
function makePool(maxSize = 5, idleTimeoutUs = 60_000_000) {
  idSeq = 0;
  let time = 1_000_000;
  return {
    pool: createConnectionPool(
      {
        clock: { nowMicroseconds: () => time },
        idGenerator: { next: () => `entry-${++idSeq}` },
      },
      { maxSize, idleTimeoutUs },
    ),
    advance: (us: number) => { time += us; },
  };
}

describe('Connection Pool Simulation', () => {
  it('adds entries and checks them out', () => {
    const { pool } = makePool();

    const e1 = pool.add({ label: 'db-primary' });
    const e2 = pool.add({ label: 'db-replica' });

    const checked = pool.checkout(e1!.entryId);
    expect(checked).toBe(true);
    expect(pool.getEntry(e1!.entryId)?.status).toBe('in_use');
    expect(pool.getEntry(e1!.entryId)?.label).toBe('db-primary');

    // e2 is still idle
    expect(pool.getEntry(e2!.entryId)?.status).toBe('idle');
  });

  it('checks in entries making them idle again', () => {
    const { pool } = makePool();

    const e = pool.add({ label: 'worker' });
    pool.checkout(e!.entryId);
    pool.checkin(e!.entryId);

    expect(pool.getEntry(e!.entryId)?.status).toBe('idle');
    const stats = pool.getStats();
    expect(stats.idleEntries).toBe(1);
    expect(stats.inUseEntries).toBe(0);
  });

  it('reflects correct stats across multiple entries', () => {
    const { pool } = makePool(10);

    const ids = Array.from({ length: 4 }, (_, i) => pool.add({ label: `worker-${i}` })!.entryId);
    pool.checkout(ids[0]!);
    pool.checkout(ids[1]!);

    const stats = pool.getStats();
    expect(stats.totalEntries).toBe(4);
    expect(stats.inUseEntries).toBe(2);
    expect(stats.idleEntries).toBe(2);
  });
});
