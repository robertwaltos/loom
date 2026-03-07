import { describe, it, expect } from 'vitest';
import { createKalonLedger } from '../kalon-ledger.js';
import { kalonToMicro } from '../kalon-constants.js';

function createTestLedger() {
  return createKalonLedger({ clock: { nowMicroseconds: () => 1_000_000 } });
}

/**
 * Structural cap = 0.050% of totalMinted = 500 ppm.
 * Mint large supply so small transfers stay within cap.
 * 10M KALON minted → cap = 5000 KALON per account.
 */
const LARGE_SUPPLY = kalonToMicro(10_000_000n);

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

  it('tracks total minted across multiple mints', () => {
    const ledger = createTestLedger();
    ledger.createAccount('treasury');
    ledger.mint('treasury', kalonToMicro(1000n));
    ledger.mint('treasury', kalonToMicro(2000n));
    expect(ledger.totalMinted()).toBe(kalonToMicro(3000n));
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
    ledger.mint('alice', LARGE_SUPPLY);

    const result = ledger.transfer('alice', 'bob', kalonToMicro(1000n));

    expect(result.grossAmount).toBe(kalonToMicro(1000n));
    expect(result.levy).toBeGreaterThan(0n);
    expect(result.netAmount).toBe(result.grossAmount - result.levy);
    expect(result.senderBalance).toBeLessThan(LARGE_SUPPLY);
    expect(result.recipientBalance).toBe(result.netAmount);
  });

  it('accumulates levy in commons fund', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    ledger.mint('alice', LARGE_SUPPLY);

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

describe('KalonLedger wealth cap enforcement', () => {
  it('enforces structural cap on transfers', () => {
    const ledger = createTestLedger();
    ledger.createAccount('whale');
    ledger.createAccount('receiver');

    ledger.mint('whale', LARGE_SUPPLY);
    ledger.mint('receiver', kalonToMicro(4999n));

    expect(() => {
      ledger.transfer('whale', 'receiver', kalonToMicro(100n));
    }).toThrow('wealth cap');
  });

  it('allows transfers within the structural cap', () => {
    const ledger = createTestLedger();
    ledger.createAccount('sender');
    ledger.createAccount('receiver');
    ledger.mint('sender', LARGE_SUPPLY);

    const result = ledger.transfer('sender', 'receiver', kalonToMicro(1n));
    expect(result.recipientBalance).toBeGreaterThan(0n);
  });
});

describe('KalonLedger queries', () => {
  it('reports total circulating supply', () => {
    const ledger = createTestLedger();
    ledger.createAccount('alice');
    ledger.createAccount('bob');
    ledger.mint('alice', LARGE_SUPPLY);

    ledger.transfer('alice', 'bob', kalonToMicro(1000n));
    expect(ledger.totalCirculating()).toBe(LARGE_SUPPLY);
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
