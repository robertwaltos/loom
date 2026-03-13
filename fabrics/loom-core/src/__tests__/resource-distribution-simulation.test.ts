import { describe, expect, it } from 'vitest';
import { createResourceDistribution } from '../resource-distribution.js';

describe('resource-distribution simulation', () => {
  it('simulates deposit generation, discovery, extraction, and filtered querying', () => {
    const dist = createResourceDistribution({ depositsPerCell: 3 });
    const deposits = dist.generateDepositsForCell({
      seed: 42,
      biome: 'MOUNTAIN',
      x: 10,
      y: 20,
      stellarClass: 'G',
      geologicalActivity: 0.4,
    });

    const first = deposits[0];
    if (!first) throw new Error('expected deposit');
    dist.discoverDeposit(first.depositId);
    dist.extractFromDeposit(first.depositId, first.maxQuantity);
    const discovered = dist.queryDeposits({ discoveredOnly: true });

    expect(deposits).toHaveLength(3);
    expect(discovered.length).toBeGreaterThanOrEqual(1);
    expect(dist.getStats().depletedDeposits).toBeGreaterThanOrEqual(1);
  });
});
