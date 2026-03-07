import { describe, it, expect } from 'vitest';
import { createGenesisVault, GENESIS_VAULT_RULES } from '../genesis-vault.js';

describe('Genesis Vault allocation', () => {
  it('allocates 500 KALON to new dynasty', () => {
    const vault = createGenesisVault(100_000n);
    const amount = vault.allocateNewDynasty();
    expect(amount).toBe(GENESIS_VAULT_RULES.newDynastyAllocation);
    expect(vault.balance()).toBe(100_000n - 500n);
  });

  it('throws when vault is depleted', () => {
    const vault = createGenesisVault(100n);
    expect(() => {
      vault.allocateNewDynasty();
    }).toThrow('insufficient');
  });

  it('supports multiple allocations', () => {
    const vault = createGenesisVault(2000n);
    vault.allocateNewDynasty();
    vault.allocateNewDynasty();
    vault.allocateNewDynasty();
    expect(vault.balance()).toBe(500n);
  });
});

describe('Genesis Vault replenishment', () => {
  it('replenishes by 1% of annual issuance', () => {
    const vault = createGenesisVault(0n);
    const replenished = vault.replenish(100_000_000n);
    expect(replenished).toBe(1_000_000n);
    expect(vault.balance()).toBe(1_000_000n);
  });

  it('accumulates replenishments', () => {
    const vault = createGenesisVault(500_000n);
    vault.replenish(100_000_000n);
    vault.replenish(100_000_000n);
    expect(vault.balance()).toBe(500_000n + 2_000_000n);
  });
});

describe('Genesis Vault alerts', () => {
  it('reports depletion at zero balance', () => {
    const vault = createGenesisVault(0n);
    expect(vault.isDepleted()).toBe(true);
  });

  it('reports not depleted when balance exists', () => {
    const vault = createGenesisVault(1n);
    expect(vault.isDepleted()).toBe(false);
  });

  it('reports below alert at 10M threshold', () => {
    const vault = createGenesisVault(9_999_999n);
    expect(vault.isBelowAlert()).toBe(true);
  });

  it('reports above alert when sufficient', () => {
    const vault = createGenesisVault(10_000_001n);
    expect(vault.isBelowAlert()).toBe(false);
  });
});
