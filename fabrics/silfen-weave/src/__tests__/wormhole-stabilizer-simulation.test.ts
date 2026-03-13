import { describe, expect, it } from 'vitest';
import {
  batchDegrade,
  createWormhole,
  createWormholeState,
  emergencyStabilization,
  getAverageStability,
  getCriticalWormholes,
  getWormhole,
  injectEnergy,
  setDecayRate,
} from '../wormhole-stabilizer.js';

function makeDeps() {
  let now = 1_000_000n;
  let id = 0;
  return {
    clock: { now: () => now++ },
    idGen: { generate: () => `wh-${++id}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  };
}

describe('wormhole-stabilizer simulation', () => {
  it('simulates degradation pressure and emergency recovery', () => {
    const state = createWormholeState();
    const { clock, idGen, logger } = makeDeps();

    const id = createWormhole(state, clock, idGen, logger, 'w-a', 'w-b', 20_000n, 2_000n);
    if (typeof id !== 'string') {
      throw new Error('failed to create wormhole');
    }

    setDecayRate(state, logger, 200n);
    batchDegrade(state, clock, logger);
    batchDegrade(state, clock, logger);
    emergencyStabilization(state, clock, logger, id);
    injectEnergy(state, clock, logger, id, 10_000n);

    const wormhole = getWormhole(state, id);
    if (typeof wormhole === 'string') {
      throw new Error('wormhole unexpectedly missing');
    }

    expect(wormhole.stability).toBeGreaterThan(0n);
    expect(getCriticalWormholes(state).length).toBeGreaterThanOrEqual(0);
    expect(getAverageStability(state)).toBeGreaterThan(0n);
  });
});
