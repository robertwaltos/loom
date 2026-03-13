import { describe, expect, it } from 'vitest';
import { createDynastyTreasuryService } from '../dynasty-treasury.js';

describe('dynasty treasury simulation', () => {
  it('simulates treasury flow across taxes, spending, and grants', () => {
    let time = 1000;
    let id = 0;
    const treasury = createDynastyTreasuryService({
      clock: { nowMicroseconds: () => time++ },
      idGenerator: { next: () => 'tx-' + String(id++) },
    });

    treasury.openAccount('d1');
    treasury.openAccount('d2');

    treasury.deposit({ dynastyId: 'd1', amount: 2_000n, memo: 'tax receipts' });
    treasury.withdraw({ dynastyId: 'd1', amount: 500n, memo: 'infrastructure' });
    treasury.transfer({ fromDynastyId: 'd1', toDynastyId: 'd2', amount: 700n, memo: 'relief' });

    expect(treasury.getBalance('d1')).toBe(800n);
    expect(treasury.getBalance('d2')).toBe(700n);
    expect(treasury.getHistory('d1')).toHaveLength(3);
    expect(treasury.getHistory('d2')).toHaveLength(1);
    expect(treasury.getStats().totalTransactions).toBe(4);
  });
});
