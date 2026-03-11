import { describe, it, expect } from 'vitest';
import { createResourceDistribution } from '../resource-distribution.js';
import type { DepositPlacementInput, ResourceType, RarityTier } from '../resource-distribution.js';

function makeInput(overrides?: Partial<DepositPlacementInput>): DepositPlacementInput {
  return {
    seed: 42,
    biome: 'GRASSLAND',
    x: 5,
    y: 10,
    stellarClass: 'G',
    geologicalActivity: 0.3,
    ...overrides,
  };
}

describe('ResourceDistribution — adding deposits', () => {
  it('creates a deposit with an ID', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    expect(deposit.depositId).toBe('dep-1');
    expect(deposit.x).toBe(5);
    expect(deposit.y).toBe(10);
    expect(deposit.biome).toBe('GRASSLAND');
  });

  it('deposits start undiscovered', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    expect(deposit.discovered).toBe(false);
  });

  it('deposit quality is between 0 and 1', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    expect(deposit.quality).toBeGreaterThanOrEqual(0);
    expect(deposit.quality).toBeLessThanOrEqual(1);
  });

  it('deposit has positive max quantity', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    expect(deposit.maxQuantity).toBeGreaterThan(0);
    expect(deposit.currentQuantity).toBe(deposit.maxQuantity);
  });

  it('sequential deposit IDs', () => {
    const dist = createResourceDistribution();
    const d1 = dist.addDeposit(makeInput({ seed: 1 }));
    const d2 = dist.addDeposit(makeInput({ seed: 2 }));
    expect(d1.depositId).toBe('dep-1');
    expect(d2.depositId).toBe('dep-2');
  });
});

describe('ResourceDistribution — biome affinity', () => {
  it('mountain biome favors MINERALS or CRYSTAL', () => {
    const dist = createResourceDistribution();
    const mineralTypes: ResourceType[] = [];
    for (let i = 0; i < 20; i++) {
      const d = dist.addDeposit(makeInput({ seed: i * 100, biome: 'MOUNTAIN' }));
      mineralTypes.push(d.resourceType);
    }
    const hasMinerals = mineralTypes.includes('MINERALS');
    const hasCrystal = mineralTypes.includes('CRYSTAL');
    expect(hasMinerals || hasCrystal).toBe(true);
  });

  it('O-class stars have chance of exotic matter', () => {
    const dist = createResourceDistribution();
    const types: ResourceType[] = [];
    for (let i = 0; i < 50; i++) {
      const d = dist.addDeposit(
        makeInput({
          seed: i * 77,
          stellarClass: 'O',
          biome: 'MOUNTAIN',
        }),
      );
      types.push(d.resourceType);
    }
    expect(types.includes('EXOTIC_MATTER')).toBe(true);
  });
});

describe('ResourceDistribution — discovery', () => {
  it('discovers an undiscovered deposit', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    const result = dist.discoverDeposit(deposit.depositId);
    expect(result).toBe(true);
    expect(dist.getDeposit(deposit.depositId)?.discovered).toBe(true);
  });

  it('returns false for already discovered deposit', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    dist.discoverDeposit(deposit.depositId);
    expect(dist.discoverDeposit(deposit.depositId)).toBe(false);
  });

  it('returns false for non-existent deposit', () => {
    const dist = createResourceDistribution();
    expect(dist.discoverDeposit('dep-999')).toBe(false);
  });
});

describe('ResourceDistribution — extraction', () => {
  it('extracts resources from a deposit', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    const result = dist.extractFromDeposit(deposit.depositId, 100);
    expect(result).toBeDefined();
    expect(result?.extracted).toBe(100);
    expect(result?.remaining).toBe(deposit.maxQuantity - 100);
    expect(result?.depleted).toBe(false);
  });

  it('cannot extract more than available', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    const result = dist.extractFromDeposit(deposit.depositId, deposit.maxQuantity + 500);
    expect(result?.extracted).toBe(deposit.maxQuantity);
    expect(result?.remaining).toBe(0);
    expect(result?.depleted).toBe(true);
  });

  it('depleted deposit returns zero extraction', () => {
    const dist = createResourceDistribution();
    const deposit = dist.addDeposit(makeInput());
    dist.extractFromDeposit(deposit.depositId, deposit.maxQuantity);
    const result = dist.extractFromDeposit(deposit.depositId, 10);
    expect(result?.extracted).toBe(0);
    expect(result?.depleted).toBe(true);
  });

  it('returns undefined for non-existent deposit', () => {
    const dist = createResourceDistribution();
    expect(dist.extractFromDeposit('nope', 10)).toBeUndefined();
  });
});

describe('ResourceDistribution — query', () => {
  it('queries by resource type', () => {
    const dist = createResourceDistribution();
    for (let i = 0; i < 10; i++) {
      dist.addDeposit(makeInput({ seed: i * 50 }));
    }
    const all = dist.queryDeposits({});
    expect(all.length).toBe(10);
  });

  it('filters by discovery status', () => {
    const dist = createResourceDistribution();
    const d1 = dist.addDeposit(makeInput({ seed: 1 }));
    dist.addDeposit(makeInput({ seed: 2 }));
    dist.discoverDeposit(d1.depositId);
    const discovered = dist.queryDeposits({ discoveredOnly: true });
    expect(discovered.length).toBe(1);
  });

  it('filters by minimum quality', () => {
    const dist = createResourceDistribution();
    for (let i = 0; i < 20; i++) {
      dist.addDeposit(makeInput({ seed: i * 31 }));
    }
    const highQuality = dist.queryDeposits({ minQuality: 0.8 });
    for (const d of highQuality) {
      expect(d.quality).toBeGreaterThanOrEqual(0.8);
    }
  });
});

describe('ResourceDistribution — batch generation', () => {
  it('generates multiple deposits per cell', () => {
    const dist = createResourceDistribution({ depositsPerCell: 5 });
    const deposits = dist.generateDepositsForCell(makeInput());
    expect(deposits.length).toBe(5);
  });

  it('each generated deposit has a unique ID', () => {
    const dist = createResourceDistribution({ depositsPerCell: 4 });
    const deposits = dist.generateDepositsForCell(makeInput());
    const ids = deposits.map((d) => d.depositId);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(4);
  });
});

describe('ResourceDistribution — stats', () => {
  it('tracks total deposits', () => {
    const dist = createResourceDistribution();
    dist.addDeposit(makeInput({ seed: 1 }));
    dist.addDeposit(makeInput({ seed: 2 }));
    dist.addDeposit(makeInput({ seed: 3 }));
    const stats = dist.getStats();
    expect(stats.totalDeposits).toBe(3);
  });

  it('tracks discovered deposits', () => {
    const dist = createResourceDistribution();
    const d1 = dist.addDeposit(makeInput({ seed: 1 }));
    dist.addDeposit(makeInput({ seed: 2 }));
    dist.discoverDeposit(d1.depositId);
    expect(dist.getStats().discoveredDeposits).toBe(1);
  });

  it('tracks depleted deposits', () => {
    const dist = createResourceDistribution();
    const d1 = dist.addDeposit(makeInput({ seed: 1 }));
    dist.extractFromDeposit(d1.depositId, d1.maxQuantity);
    expect(dist.getStats().depletedDeposits).toBe(1);
  });

  it('reports by type and rarity', () => {
    const dist = createResourceDistribution();
    dist.addDeposit(makeInput({ seed: 1 }));
    const stats = dist.getStats();
    expect(stats.byType.length).toBe(8);
    expect(stats.byRarity.length).toBe(5);
  });
});
