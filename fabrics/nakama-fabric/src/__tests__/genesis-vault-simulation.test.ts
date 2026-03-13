import { describe, expect, it } from 'vitest';
import { GENESIS_VAULT_RULES, createGenesisVault } from '../genesis-vault.js';

describe('genesis-vault simulation', () => {
  it('simulates dynasty founding waves until alert threshold is crossed', () => {
    const initial = 10_001_500n;
    const vault = createGenesisVault(initial);

    let allocations = 0;
    while (!vault.isBelowAlert()) {
      vault.allocateNewDynasty();
      allocations += 1;
      if (allocations > 100_000) break;
    }

    expect(vault.balance() < GENESIS_VAULT_RULES.depletionAlertThreshold).toBe(true);
    expect(allocations).toBeGreaterThan(0);
  });

  it('simulates annual replenishment and post-replenish allocation continuity', () => {
    const vault = createGenesisVault(500n);
    vault.allocateNewDynasty();
    expect(vault.isDepleted()).toBe(true);

    const replenished = vault.replenish(75_000_000n);
    expect(replenished).toBe(750_000n);
    expect(vault.isDepleted()).toBe(false);

    expect(vault.allocateNewDynasty()).toBe(500n);
    expect(vault.balance()).toBe(749_500n);
  });

  it('simulates hard depletion failure when allocation exceeds available balance', () => {
    const vault = createGenesisVault(499n);
    expect(() => vault.allocateNewDynasty()).toThrow('insufficient');
  });
});
