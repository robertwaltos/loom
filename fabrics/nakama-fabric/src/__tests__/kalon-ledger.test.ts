import { describe, it, expect } from 'vitest';
import { createKalonLedger } from '../kalon-ledger.js';
import { kalonToMicro, TOTAL_SUPPLY_MICRO } from '../kalon-constants.js';

function createTestLedger() {
  return createKalonLedger({ clock: { nowMicroseconds: () => 1_000_000 } });
}

describe('KalonLedger accounts', () => {
  it('creates accounts with zero balance', () => {
    const ledger = createTestLedger();
    ledger.createAccount('dynasty-1');
    expect(ledger.getBalance('dynasty-1')).toBe(0n);
  });

  it('creates accounts with initial balance', () => {
    const ledger = createTestLedger();
    ledger.createAccount('dynasty-1', kalonToMicro(1000n));
    expect(ledger.getBalance('dynasty-1')).toBe(kalonToMicro(1000n));
  });

  it('throws on duplicate account', () => {
    const ledger = createTestLedger();
    ledger.createAccount('dynasty-1');
    expect(() => {
      ledger.createAccount('dynasty-1');
    }).toThrow('already exists');
  });

  it('throws on missing account', () => {
    const ledger = createTestLedger();
    expect(() => {
      ledger.getBalance('nope');
    }).toThrow('not found');
  });

  it('tryGetBalance returns undefined for missing', () => {
    const ledger = createTestLedger();
    expect(ledger.tryGetBalance('nope')).toBeUndefined();
  });
});

describe('KalonLedger minting', () => {
  it('mints KALON into an account', () => {
    const ledger = createTestLedger();
    ledger.createAccount('treasury');
    ledger.mint('treasury', kalonToMicro(1000n));
    expect(ledger.getBalance('treasury')).toBe(kalonToMicro(1000n));
  });

  it('rejects minting beyond supply cap', () => {
    const ledger = createTestLedger();
    ledger.createAccount('treasury');
    expect(() => {
      ledger.mint('treasury', TOTAL_SUPPLY_MICRO + 1n);
    }).toThrow('supply');
  });

  it('rejects minting zero or negative', () => {
    const ledger = createTestLedger();
    ledger.createAccount('treasury');
    expect(() => {
      ledger.mint('treasury', 0n);
    }).toThrow('Invalid');
  });
});

describe('KalonLedger transfers', () => {
  it('transfers KALON with levy deduction', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    ledger.mint('alice', kalonToMicro(10_000n));

    const result = ledger.transfer('alice', 'bob', kalonToMicro(1000n));

    expect(result.grossAmount).toBe(kalonToMicro(1000n));
    expect(result.levy).toBeGreaterThan(0n);
    expect(result.netAmount).toBe(result.grossAmount - result.levy);
    expect(result.senderBalance).toBeLessThan(kalonToMicro(10_000n));
    expect(result.recipientBalance).toBe(result.netAmount);
  });

  it('accumulates levy in commons fund', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    ledger.mint('alice', kalonToMicro(10_000n));

    const result = ledger.transfer('alice', 'bob', kalonToMicro(1000n));
    expect(ledger.commonsFundBalance()).toBe(result.levy);
  });

  it('rejects self-transfer', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.mint('alice', kalonToMicro(100n));
    expect(() => {
      ledger.transfer('alice', 'alice', kalonToMicro(10n));
    }).toThrow('self');
  });

  it('rejects insufficient balance', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    ledger.mint('alice', kalonToMicro(10n));
    expect(() => {
      ledger.transfer('alice', 'bob', kalonToMicro(100n));
    }).toThrow('Insufficient');
  });

  it('rejects zero amount', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    expect(() => {
      ledger.transfer('alice', 'bob', 0n);
    }).toThrow('Invalid');
  });
});

describe('KalonLedger queries', () => {
  it('reports total circulating supply', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    ledger.mint('alice', kalonToMicro(5000n));

    ledger.transfer('alice', 'bob', kalonToMicro(1000n));
    expect(ledger.totalCirculating()).toBe(kalonToMicro(5000n));
  });

  it('lists all accounts', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    expect(ledger.listAccounts()).toHaveLength(2);
  });

  it('checks account existence', () => {
    const ledger = createTestLedger();
    expect(ledger.accountExists('alice')).toBe(false);
    ledger.createAccount('alice');
    expect(ledger.accountExists('alice')).toBe(true);
  });
});
