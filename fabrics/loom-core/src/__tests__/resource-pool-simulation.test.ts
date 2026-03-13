import { describe, expect, it } from 'vitest';
import { createResourcePool } from '../resource-pool.js';

describe('resource-pool simulation', () => {
  it('simulates warm-acquire-release-drain loop and tracks high-water usage', () => {
    let id = 0;
    const pool = createResourcePool(
      {
        name: 'entity-pool',
        initialSize: 2,
        maxSize: 8,
      },
      () => ({ id: ++id, state: 'active' }),
      (item) => {
        item.state = 'reset';
      },
    );

    const a = pool.acquire();
    const b = pool.acquire();
    const c = pool.acquire();
    if (!a || !b || !c) throw new Error('expected pooled objects');

    pool.release(a);
    pool.release(b);
    const drained = pool.drain();
    const stats = pool.getStats();

    expect(drained).toBeGreaterThanOrEqual(2);
    expect(stats.highWaterMark).toBeGreaterThanOrEqual(3);
    expect(pool.inUse()).toBe(1);
  });
});
