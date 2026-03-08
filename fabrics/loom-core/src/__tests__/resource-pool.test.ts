import { describe, it, expect } from 'vitest';
import { createResourcePool } from '../resource-pool.js';
import type { PoolConfig } from '../resource-pool.js';

interface TestObj {
  id: number;
  data: string;
}

let nextId = 0;
function makeObj(): TestObj {
  nextId += 1;
  return { id: nextId, data: 'active' };
}

function resetObj(obj: TestObj): void {
  obj.data = 'reset';
}

function makeConfig(overrides?: Partial<PoolConfig>): PoolConfig {
  return {
    name: 'test-pool',
    initialSize: 0,
    maxSize: 100,
    ...overrides,
  };
}

describe('ResourcePool — pre-warming', () => {
  it('pre-warms to initial size', () => {
    const pool = createResourcePool(makeConfig({ initialSize: 5 }), makeObj, resetObj);
    expect(pool.available()).toBe(5);
    expect(pool.inUse()).toBe(0);
  });

  it('respects max size during pre-warm', () => {
    const pool = createResourcePool(
      makeConfig({ initialSize: 10, maxSize: 3 }),
      makeObj,
      resetObj,
    );
    expect(pool.available()).toBe(3);
  });

  it('manual warm adds objects', () => {
    const pool = createResourcePool(makeConfig(), makeObj, resetObj);
    const warmed = pool.warm(4);
    expect(warmed).toBe(4);
    expect(pool.available()).toBe(4);
  });
});

describe('ResourcePool — acquire', () => {
  it('acquires an object from pool', () => {
    const pool = createResourcePool(makeConfig({ initialSize: 1 }), makeObj, resetObj);
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    expect(pool.available()).toBe(0);
    expect(pool.inUse()).toBe(1);
  });

  it('creates new object when pool empty', () => {
    const pool = createResourcePool(makeConfig(), makeObj, resetObj);
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    expect(pool.inUse()).toBe(1);
  });

  it('returns undefined when at max capacity', () => {
    const pool = createResourcePool(makeConfig({ maxSize: 1 }), makeObj, resetObj);
    pool.acquire();
    const second = pool.acquire();
    expect(second).toBeUndefined();
  });

  it('tracks misses when at capacity', () => {
    const pool = createResourcePool(makeConfig({ maxSize: 1 }), makeObj, resetObj);
    pool.acquire();
    pool.acquire();
    expect(pool.getStats().misses).toBe(1);
  });
});

describe('ResourcePool — release', () => {
  it('releases an object back to pool', () => {
    const pool = createResourcePool(makeConfig(), makeObj, resetObj);
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    if (obj === undefined) return;

    const released = pool.release(obj);
    expect(released).toBe(true);
    expect(pool.available()).toBe(1);
    expect(pool.inUse()).toBe(0);
  });

  it('resets object on release', () => {
    const pool = createResourcePool(makeConfig(), makeObj, resetObj);
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    if (obj === undefined) return;

    expect(obj.data).toBe('active');
    pool.release(obj);
    expect(obj.data).toBe('reset');
  });

  it('returns false for unknown object', () => {
    const pool = createResourcePool(makeConfig(), makeObj, resetObj);
    const foreign: TestObj = { id: 999, data: 'foreign' };
    expect(pool.release(foreign)).toBe(false);
  });

  it('allows reacquire after release', () => {
    const pool = createResourcePool(makeConfig({ maxSize: 1 }), makeObj, resetObj);
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    if (obj === undefined) return;

    pool.release(obj);
    const reacquired = pool.acquire();
    expect(reacquired).toBeDefined();
  });
});

describe('ResourcePool — drain', () => {
  it('drains all free objects', () => {
    const pool = createResourcePool(makeConfig({ initialSize: 5 }), makeObj, resetObj);
    const drained = pool.drain();
    expect(drained).toBe(5);
    expect(pool.available()).toBe(0);
  });

  it('does not affect in-use objects', () => {
    const pool = createResourcePool(makeConfig({ initialSize: 3 }), makeObj, resetObj);
    pool.acquire();
    const drained = pool.drain();
    expect(drained).toBe(2);
    expect(pool.inUse()).toBe(1);
  });
});

describe('ResourcePool — stats', () => {
  it('tracks acquire and release counts', () => {
    const pool = createResourcePool(makeConfig(), makeObj, resetObj);
    const a = pool.acquire();
    pool.acquire();
    if (a !== undefined) pool.release(a);

    const stats = pool.getStats();
    expect(stats.totalAcquires).toBe(2);
    expect(stats.totalReleases).toBe(1);
  });

  it('tracks high water mark', () => {
    const pool = createResourcePool(makeConfig(), makeObj, resetObj);
    const a = pool.acquire();
    const b = pool.acquire();
    pool.acquire();
    if (a !== undefined) pool.release(a);
    if (b !== undefined) pool.release(b);

    expect(pool.getStats().highWaterMark).toBe(3);
    expect(pool.inUse()).toBe(1);
  });

  it('tracks total created', () => {
    const pool = createResourcePool(makeConfig({ initialSize: 2 }), makeObj, resetObj);
    pool.acquire();
    pool.acquire();
    pool.acquire();

    expect(pool.getStats().totalCreated).toBe(3);
  });

  it('reports pool name', () => {
    const pool = createResourcePool(
      makeConfig({ name: 'entity-pool' }),
      makeObj,
      resetObj,
    );
    expect(pool.getStats().name).toBe('entity-pool');
  });
});
