import { describe, expect, it } from 'vitest';
import { createCollisionSystem } from '../collision-system.js';

describe('collision-system simulation', () => {
  it('simulates body registration and overlap detection in one tick window', () => {
    let now = 1_000_000n;
    let id = 0;
    const sys = createCollisionSystem({
      clock: { nowUs: () => (now += 1_000n) },
      idGen: { generate: () => `col-${++id}` },
      logger: { debug: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined },
    });

    sys.registerBody('a', 'A', { minX: 0, minY: 0, minZ: 0, maxX: 2, maxY: 2, maxZ: 2 }, 0);
    sys.registerBody('b', 'B', { minX: 1, minY: 1, minZ: 1, maxX: 3, maxY: 3, maxZ: 3 }, 0);

    const collisions = sys.detectCollisions({ bodyId: 'a' });
    expect(collisions.length).toBe(1);
    expect(collisions[0]?.bodyBId).toBe('b');
  });
});
