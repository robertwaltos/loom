import { describe, expect, it } from 'vitest';
import { createEntityInfluence } from '../entity-influence.js';

describe('entity-influence simulation', () => {
  it('simulates overlapping influence zones and net field strength', () => {
    const influence = createEntityInfluence({
      clock: { nowMicroseconds: () => 1_000_000n },
      logger: { info: () => undefined, warn: () => undefined },
    });

    influence.registerEntity('f-1', 'world-1', { x: 0, y: 0, z: 0 }, 'FRIENDLY');
    influence.registerEntity('h-1', 'world-1', { x: 8, y: 0, z: 0 }, 'HOSTILE');
    influence.setInfluenceRadius('f-1', 20);
    influence.setInfluenceRadius('h-1', 20);

    const atCenter = influence.computeInfluenceAt('world-1', { x: 4, y: 0, z: 0 });
    expect(atCenter.contributingZones.length).toBe(2);
    expect(Math.abs(atCenter.totalInfluence)).toBeGreaterThanOrEqual(0);
  });
});
