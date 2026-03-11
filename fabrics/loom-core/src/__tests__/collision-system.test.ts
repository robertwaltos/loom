/**
 * Collision System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCollisionSystem,
  type CollisionSystem,
  type AABB,
  type CollisionError,
} from '../collision-system.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

function makeAabb(
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): AABB {
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

const BOX_A: AABB = makeAabb(0, 0, 0, 2, 2, 2);
const BOX_B: AABB = makeAabb(1, 1, 1, 3, 3, 3); // overlaps with A
const BOX_C: AABB = makeAabb(5, 5, 5, 7, 7, 7); // no overlap with A

describe('CollisionSystem — registerBody', () => {
  let sys: CollisionSystem;

  beforeEach(() => {
    sys = createCollisionSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
  });

  it('registers a body successfully', () => {
    const result = sys.registerBody('b1', 'Body 1', BOX_A, 0);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.bodyId).toBe('b1');
    expect(result.active).toBe(true);
    expect(result.layer).toBe(0);
  });

  it('returns already-registered for duplicate bodyId', () => {
    sys.registerBody('b1', 'Body 1', BOX_A, 0);
    const result = sys.registerBody('b1', 'Dup', BOX_A, 0);
    expect(result).toBe('already-registered' satisfies CollisionError);
  });

  it('returns invalid-bounds when maxX <= minX', () => {
    const bad: AABB = makeAabb(5, 0, 0, 5, 2, 2);
    const result = sys.registerBody('b1', 'Bad', bad, 0);
    expect(result).toBe('invalid-bounds' satisfies CollisionError);
  });

  it('returns invalid-bounds when maxY <= minY', () => {
    const bad: AABB = makeAabb(0, 5, 0, 2, 5, 2);
    expect(sys.registerBody('b1', 'Bad', bad, 0)).toBe('invalid-bounds');
  });

  it('returns invalid-bounds when maxZ <= minZ', () => {
    const bad: AABB = makeAabb(0, 0, 5, 2, 2, 5);
    expect(sys.registerBody('b1', 'Bad', bad, 0)).toBe('invalid-bounds');
  });
});

describe('CollisionSystem — updateBounds', () => {
  let sys: CollisionSystem;

  beforeEach(() => {
    sys = createCollisionSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    sys.registerBody('b1', 'B1', BOX_A, 0);
  });

  it('updates bounds successfully', () => {
    const result = sys.updateBounds('b1', BOX_C);
    expect(result).toEqual({ success: true });
    expect(sys.getBody('b1')?.aabb).toEqual(BOX_C);
  });

  it('returns body-not-found for unknown body', () => {
    expect(sys.updateBounds('ghost', BOX_A)).toEqual({ success: false, error: 'body-not-found' });
  });

  it('returns invalid-bounds on bad AABB', () => {
    const bad: AABB = makeAabb(5, 0, 0, 5, 2, 2);
    expect(sys.updateBounds('b1', bad)).toEqual({ success: false, error: 'invalid-bounds' });
  });
});

describe('CollisionSystem — activate / deactivate', () => {
  let sys: CollisionSystem;

  beforeEach(() => {
    sys = createCollisionSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    sys.registerBody('b1', 'B1', BOX_A, 0);
  });

  it('deactivates a body', () => {
    const result = sys.deactivate('b1');
    expect(result).toEqual({ success: true });
    expect(sys.getBody('b1')?.active).toBe(false);
  });

  it('activates a body', () => {
    sys.deactivate('b1');
    const result = sys.activate('b1');
    expect(result).toEqual({ success: true });
    expect(sys.getBody('b1')?.active).toBe(true);
  });

  it('returns body-not-found for unknown body on deactivate', () => {
    expect(sys.deactivate('ghost')).toEqual({ success: false, error: 'body-not-found' });
  });

  it('returns body-not-found for unknown body on activate', () => {
    expect(sys.activate('ghost')).toEqual({ success: false, error: 'body-not-found' });
  });
});

describe('CollisionSystem — detectCollisions', () => {
  let sys: CollisionSystem;

  beforeEach(() => {
    sys = createCollisionSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    sys.registerBody('a', 'A', BOX_A, 0);
    sys.registerBody('b', 'B', BOX_B, 0);
    sys.registerBody('c', 'C', BOX_C, 0);
  });

  it('detects overlap between A and B', () => {
    const results = sys.detectCollisions({ bodyId: 'a' });
    expect(results).toHaveLength(1);
    expect(results[0]?.bodyBId).toBe('b');
  });

  it('returns no collisions for isolated body', () => {
    const results = sys.detectCollisions({ bodyId: 'c' });
    expect(results).toHaveLength(0);
  });

  it('excludes inactive bodies from detection', () => {
    sys.deactivate('b');
    const results = sys.detectCollisions({ bodyId: 'a' });
    expect(results).toHaveLength(0);
  });

  it('returns empty when query body is inactive', () => {
    sys.deactivate('a');
    expect(sys.detectCollisions({ bodyId: 'a' })).toHaveLength(0);
  });

  it('filters by layer when layer is provided', () => {
    sys.registerBody('d', 'D', BOX_B, 1); // layer 1, overlaps A
    const results = sys.detectCollisions({ bodyId: 'a', layer: 1 });
    expect(results).toHaveLength(1);
    expect(results[0]?.bodyBId).toBe('d');
  });

  it('returns empty for unknown query body', () => {
    expect(sys.detectCollisions({ bodyId: 'ghost' })).toHaveLength(0);
  });

  it('accumulates collisionsDetected in stats', () => {
    sys.detectCollisions({ bodyId: 'a' }); // finds 1
    sys.detectCollisions({ bodyId: 'b' }); // finds 1
    expect(sys.getStats().collisionsDetected).toBe(2);
  });

  it('includes correct overlap values', () => {
    const results = sys.detectCollisions({ bodyId: 'a' });
    const col = results[0];
    expect(col?.overlapX).toBe(1); // min(2,3) - max(0,1) = 2-1 = 1
    expect(col?.overlapY).toBe(1);
    expect(col?.overlapZ).toBe(1);
  });
});

describe('CollisionSystem — checkPair', () => {
  let sys: CollisionSystem;

  beforeEach(() => {
    sys = createCollisionSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    sys.registerBody('a', 'A', BOX_A, 0);
    sys.registerBody('b', 'B', BOX_B, 0);
    sys.registerBody('c', 'C', BOX_C, 0);
  });

  it('returns Collision for overlapping pair', () => {
    const result = sys.checkPair('a', 'b');
    expect(result).not.toBeNull();
    expect(typeof result).not.toBe('string');
    if (result === null || typeof result === 'string') return;
    expect(result.bodyAId).toBe('a');
    expect(result.bodyBId).toBe('b');
  });

  it('returns null for non-overlapping pair', () => {
    expect(sys.checkPair('a', 'c')).toBeNull();
  });

  it('returns body-not-found for unknown bodyA', () => {
    expect(sys.checkPair('ghost', 'a')).toBe('body-not-found');
  });

  it('returns body-not-found for unknown bodyB', () => {
    expect(sys.checkPair('a', 'ghost')).toBe('body-not-found');
  });

  it('returns null when either body is inactive', () => {
    sys.deactivate('b');
    expect(sys.checkPair('a', 'b')).toBeNull();
  });

  it('increments collisionsDetected on hit', () => {
    sys.checkPair('a', 'b');
    expect(sys.getStats().collisionsDetected).toBe(1);
  });
});

describe('CollisionSystem — getStats', () => {
  it('reports correct totalBodies and activeBodies', () => {
    const sys = createCollisionSystem({
      clock: new TestClock(),
      idGen: new TestIdGenerator(),
      logger: new TestLogger(),
    });
    sys.registerBody('a', 'A', BOX_A, 0);
    sys.registerBody('b', 'B', BOX_B, 0);
    sys.deactivate('b');
    const stats = sys.getStats();
    expect(stats.totalBodies).toBe(2);
    expect(stats.activeBodies).toBe(1);
  });
});
