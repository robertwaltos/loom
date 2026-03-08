import { describe, it, expect } from 'vitest';
import { createConnectionPool } from '../connection-pool.js';
import type { ConnectionPoolDeps } from '../connection-pool.js';

function makeDeps(): ConnectionPoolDeps & { advance: (us: number) => void } {
  let id = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    idGenerator: { next: () => 'conn-' + String(++id) },
    advance: (us: number) => { time += us; },
  };
}

describe('ConnectionPool — add entries', () => {
  it('adds an entry', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'db-primary' });
    expect(entry?.entryId).toBe('conn-1');
    expect(entry?.status).toBe('idle');
  });

  it('enforces max size', () => {
    const pool = createConnectionPool(makeDeps(), { maxSize: 2, idleTimeoutUs: 1_000_000 });
    pool.add({ label: 'a' });
    pool.add({ label: 'b' });
    const third = pool.add({ label: 'c' });
    expect(third).toBeUndefined();
  });

  it('retrieves entry by ID', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'redis' });
    const retrieved = pool.getEntry(entry?.entryId ?? '');
    expect(retrieved?.label).toBe('redis');
  });

  it('returns undefined for unknown entry', () => {
    const pool = createConnectionPool(makeDeps());
    expect(pool.getEntry('unknown')).toBeUndefined();
  });
});

describe('ConnectionPool — checkout and checkin', () => {
  it('checks out an idle entry', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'db' });
    expect(pool.checkout(entry?.entryId ?? '')).toBe(true);
    expect(pool.getEntry(entry?.entryId ?? '')?.status).toBe('in_use');
  });

  it('fails checkout for non-idle entry', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'db' });
    pool.checkout(entry?.entryId ?? '');
    expect(pool.checkout(entry?.entryId ?? '')).toBe(false);
  });

  it('checks in an in-use entry', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'db' });
    pool.checkout(entry?.entryId ?? '');
    expect(pool.checkin(entry?.entryId ?? '')).toBe(true);
    expect(pool.getEntry(entry?.entryId ?? '')?.status).toBe('idle');
  });

  it('fails checkin for non-in-use entry', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'db' });
    expect(pool.checkin(entry?.entryId ?? '')).toBe(false);
  });

  it('fails checkout for unknown entry', () => {
    const pool = createConnectionPool(makeDeps());
    expect(pool.checkout('unknown')).toBe(false);
  });
});

describe('ConnectionPool — close', () => {
  it('closes an entry', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'db' });
    expect(pool.close(entry?.entryId ?? '')).toBe(true);
    expect(pool.getEntry(entry?.entryId ?? '')?.status).toBe('closed');
  });

  it('returns false for already closed', () => {
    const pool = createConnectionPool(makeDeps());
    const entry = pool.add({ label: 'db' });
    pool.close(entry?.entryId ?? '');
    expect(pool.close(entry?.entryId ?? '')).toBe(false);
  });

  it('returns false for unknown entry', () => {
    const pool = createConnectionPool(makeDeps());
    expect(pool.close('unknown')).toBe(false);
  });
});

describe('ConnectionPool — listing and sweep', () => {
  it('lists idle entries', () => {
    const pool = createConnectionPool(makeDeps());
    pool.add({ label: 'a' });
    pool.add({ label: 'b' });
    const b = pool.add({ label: 'c' });
    pool.checkout(b?.entryId ?? '');
    expect(pool.listIdle()).toHaveLength(2);
    expect(pool.listInUse()).toHaveLength(1);
  });

  it('sweeps idle entries past timeout', () => {
    const deps = makeDeps();
    const pool = createConnectionPool(deps, {
      maxSize: 100, idleTimeoutUs: 10_000_000,
    });
    pool.add({ label: 'a' });
    const b = pool.add({ label: 'b' });
    pool.checkout(b?.entryId ?? '');
    deps.advance(15_000_000);
    const swept = pool.sweepIdle();
    expect(swept).toBe(1);
    expect(pool.listIdle()).toHaveLength(0);
  });
});

describe('ConnectionPool — stats', () => {
  it('starts with zero stats', () => {
    const pool = createConnectionPool(makeDeps());
    const stats = pool.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalCheckouts).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const pool = createConnectionPool(makeDeps());
    const a = pool.add({ label: 'a' });
    pool.add({ label: 'b' });
    pool.checkout(a?.entryId ?? '');
    pool.checkin(a?.entryId ?? '');
    const stats = pool.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.idleEntries).toBe(2);
    expect(stats.totalCheckouts).toBe(1);
    expect(stats.totalCheckins).toBe(1);
  });
});
