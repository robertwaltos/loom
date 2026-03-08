import { describe, it, expect } from 'vitest';
import { createDynastyTreasuryService } from '../dynasty-treasury.js';
import type { DynastyTreasuryDeps } from '../dynasty-treasury.js';

function createDeps(): DynastyTreasuryDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'tx-' + String(id++) },
  };
}

describe('DynastyTreasuryService — openAccount', () => {
  it('opens a new account with zero balance', () => {
    const svc = createDynastyTreasuryService(createDeps());
    expect(svc.openAccount('d1')).toBe(true);
    expect(svc.getBalance('d1')).toBe(0n);
  });

  it('rejects duplicate account', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    expect(svc.openAccount('d1')).toBe(false);
  });

  it('returns undefined balance for unknown dynasty', () => {
    const svc = createDynastyTreasuryService(createDeps());
    expect(svc.getBalance('unknown')).toBeUndefined();
  });
});

describe('DynastyTreasuryService — deposit and withdraw', () => {
  it('deposits and increases balance', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    const result = svc.deposit({ dynastyId: 'd1', amount: 500n, memo: 'income' });
    expect(result.ok).toBe(true);
    expect(svc.getBalance('d1')).toBe(500n);
  });

  it('rejects deposit to unknown account', () => {
    const svc = createDynastyTreasuryService(createDeps());
    const result = svc.deposit({ dynastyId: 'unknown', amount: 100n, memo: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects deposit of zero or negative', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    const result = svc.deposit({ dynastyId: 'd1', amount: 0n, memo: '' });
    expect(result.ok).toBe(false);
  });

  it('withdraws and decreases balance', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    svc.deposit({ dynastyId: 'd1', amount: 1000n, memo: '' });
    const result = svc.withdraw({ dynastyId: 'd1', amount: 300n, memo: 'expense' });
    expect(result.ok).toBe(true);
    expect(svc.getBalance('d1')).toBe(700n);
  });

  it('rejects withdrawal exceeding balance', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    svc.deposit({ dynastyId: 'd1', amount: 100n, memo: '' });
    const result = svc.withdraw({ dynastyId: 'd1', amount: 200n, memo: '' });
    expect(result.ok).toBe(false);
  });
});

describe('DynastyTreasuryService — transfer', () => {
  it('transfers between two treasuries', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    svc.openAccount('d2');
    svc.deposit({ dynastyId: 'd1', amount: 1000n, memo: '' });
    const result = svc.transfer({ fromDynastyId: 'd1', toDynastyId: 'd2', amount: 400n, memo: 'gift' });
    expect(result.ok).toBe(true);
    expect(svc.getBalance('d1')).toBe(600n);
    expect(svc.getBalance('d2')).toBe(400n);
  });

  it('rejects self-transfer', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    svc.deposit({ dynastyId: 'd1', amount: 500n, memo: '' });
    const result = svc.transfer({ fromDynastyId: 'd1', toDynastyId: 'd1', amount: 100n, memo: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects transfer with insufficient balance', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    svc.openAccount('d2');
    svc.deposit({ dynastyId: 'd1', amount: 50n, memo: '' });
    const result = svc.transfer({ fromDynastyId: 'd1', toDynastyId: 'd2', amount: 100n, memo: '' });
    expect(result.ok).toBe(false);
    expect(svc.getBalance('d1')).toBe(50n);
  });
});

describe('DynastyTreasuryService — history and stats', () => {
  it('tracks transaction history per dynasty', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    svc.deposit({ dynastyId: 'd1', amount: 100n, memo: 'first' });
    svc.deposit({ dynastyId: 'd1', amount: 200n, memo: 'second' });
    const history = svc.getHistory('d1');
    expect(history).toHaveLength(2);
    expect(history[0]?.type).toBe('deposit');
  });

  it('returns empty history for unknown dynasty', () => {
    const svc = createDynastyTreasuryService(createDeps());
    expect(svc.getHistory('unknown')).toEqual([]);
  });

  it('reports stats', () => {
    const svc = createDynastyTreasuryService(createDeps());
    svc.openAccount('d1');
    svc.openAccount('d2');
    svc.deposit({ dynastyId: 'd1', amount: 500n, memo: '' });
    svc.transfer({ fromDynastyId: 'd1', toDynastyId: 'd2', amount: 200n, memo: '' });
    const stats = svc.getStats();
    expect(stats.totalAccounts).toBe(2);
    expect(stats.totalTransactions).toBe(3); // 1 deposit + 2 transfer txs
  });
});
