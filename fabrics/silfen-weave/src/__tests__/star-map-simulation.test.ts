import { describe, expect, it } from 'vitest';
import { createStarMapSystem } from '../star-map.js';

function makeSystem() {
  return createStarMapSystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => 'unused' },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('star-map simulation', () => {
  it('maps stars, links worlds, and supports distance/radius analysis', () => {
    const map = makeSystem();
    map.registerStar('sol', 'Sol', 'G', 1.0, { x: 0, y: 0, z: 0 });
    map.registerStar('alpha', 'Alpha', 'K', 0.5, { x: 3, y: 4, z: 0 });
    map.registerStar('far', 'Far', 'M', 0.1, { x: 0, y: 0, z: 100 });
    map.registerWorld('earth', 'sol');

    const dist = map.calculateDistance('sol', 'alpha');
    expect(typeof dist).toBe('object');
    if (typeof dist === 'string') return;
    expect(dist.distanceLY).toBeCloseTo(5);

    const nearby = map.listStarsInRadius({ x: 0, y: 0, z: 0 }, 10);
    expect(nearby.map((s) => s.starId)).toContain('alpha');
    expect(map.getWorldStar('earth')?.starId).toBe('sol');
  });
});
