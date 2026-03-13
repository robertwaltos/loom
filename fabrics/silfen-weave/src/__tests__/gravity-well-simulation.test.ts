import { describe, expect, it } from 'vitest';
import { createGravityWellSystem } from '../gravity-well.js';

function makeSystem() {
  return createGravityWellSystem({
    clock: { now: () => 1_000_000n },
    idGen: {
      generate: (() => {
        let i = 0;
        return () => `well-${++i}`;
      })(),
    },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('gravity-well simulation', () => {
  it('adjusts transit cost based on strongest endpoint gravity', () => {
    const system = makeSystem();
    system.registerWorld('earth');
    system.registerWorld('jupiter');
    system.createWell('earth', 1_000_000_000_000_000_000_000_000n, 6371);
    system.createWell('jupiter', 100_000_000_000_000_000_000_000_000n, 69911);

    const calc = system.calculateTransitCost('earth', 'jupiter', 1_000n);
    expect(calc.multiplier).toBe(2.5);
    expect(calc.adjustedCost).toBe(2_500n);

    const stats = system.getStats();
    expect(stats.totalWells).toBe(2);
    expect(stats.byStrength.EXTREME).toBe(1);
  });
});
