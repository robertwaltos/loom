import { describe, expect, it } from 'vitest';
import { createWorldAnchorSystem } from '../world-anchor.js';

function makeAnchorSystem() {
  let now = 1_000_000n;
  let id = 0;
  return createWorldAnchorSystem({
    clock: { now: () => now++ },
    idGen: { generate: () => `anchor-${++id}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('world-anchor simulation', () => {
  it('tracks anchor lifecycle and nearby lookups across a world', () => {
    const anchors = makeAnchorSystem();
    const home = anchors.placeAnchor('entity-1', 'world-a', 'HOME', { x: 0, y: 0, z: 0 }, 'home');
    const mine = anchors.placeAnchor('entity-1', 'world-a', 'RESOURCE', { x: 3, y: 4, z: 0 }, 'mine');

    if (typeof home === 'string' || typeof mine === 'string') {
      throw new Error('failed to place initial anchors');
    }

    anchors.visitAnchor(home.anchorId);
    anchors.moveAnchor(mine.anchorId, { x: 6, y: 8, z: 0 });

    expect(anchors.findNearby('world-a', { x: 0, y: 0, z: 0 }, 5)).toHaveLength(1);
    expect(anchors.getAnchorSummary('entity-1').totalAnchors).toBe(2);
  });
});
