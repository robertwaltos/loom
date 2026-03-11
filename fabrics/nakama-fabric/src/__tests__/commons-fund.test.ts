import { describe, it, expect } from 'vitest';
import { createCommonsFund, COMMONS_ACCOUNT_ID } from '../commons-fund.js';
import type {
  CommonsFund,
  CommonsFundDeps,
  CommonsLedgerPort,
  CommonsDynastyPort,
  CommonsWorldPort,
} from '../commons-fund.js';
import { kalonToMicro } from '../kalon-constants.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createMockLedger(): CommonsLedgerPort & {
  accounts: Map<string, bigint>;
} {
  const accounts = new Map<string, bigint>();
  return {
    accounts,
    createAccount(accountId: string) {
      accounts.set(accountId, 0n);
    },
    accountExists(accountId: string) {
      return accounts.has(accountId);
    },
    mint(accountId: string, amount: bigint) {
      const current = accounts.get(accountId) ?? 0n;
      accounts.set(accountId, current + amount);
    },
    transfer(fromId: string, toId: string, amount: bigint) {
      const fromBal = accounts.get(fromId) ?? 0n;
      const toBal = accounts.get(toId) ?? 0n;
      accounts.set(fromId, fromBal - amount);
      accounts.set(toId, toBal + amount);
    },
    getBalance(accountId: string) {
      return accounts.get(accountId) ?? 0n;
    },
  };
}

function createTestDeps(
  worldIssuance = 63_000_000n,
  dynastyAccounts: ReadonlyArray<string> = ['kalon:dyn-1', 'kalon:dyn-2'],
): CommonsFundDeps & { ledger: ReturnType<typeof createMockLedger> } {
  const ledger = createMockLedger();
  // Create dynasty accounts
  for (const id of dynastyAccounts) {
    ledger.createAccount(id);
  }

  const dynastyPort: CommonsDynastyPort = {
    getActiveDynastyAccounts(_worldId: string) {
      return dynastyAccounts;
    },
  };

  const worldPort: CommonsWorldPort = {
    getAnnualIssuance(_worldId: string) {
      return worldIssuance;
    },
  };

  return {
    ledger,
    dynastyPort,
    worldPort,
    clock: { nowMicroseconds: () => 1_000_000 },
  };
}

function createTestFund(
  worldIssuance = 63_000_000n,
  dynastyAccounts: ReadonlyArray<string> = ['kalon:dyn-1', 'kalon:dyn-2'],
): {
  fund: CommonsFund;
  deps: ReturnType<typeof createTestDeps>;
} {
  const deps = createTestDeps(worldIssuance, dynastyAccounts);
  const fund = createCommonsFund(deps);
  return { fund, deps };
}

// ─── Account Setup ──────────────────────────────────────────────────

describe('Commons fund account setup', () => {
  it('creates global commons account on creation', () => {
    const { deps } = createTestFund();
    expect(deps.ledger.accountExists(COMMONS_ACCOUNT_ID)).toBe(true);
  });

  it('starts with zero balance', () => {
    const { fund } = createTestFund();
    expect(fund.getBalance()).toBe(0n);
  });
});

// ─── Deposits ───────────────────────────────────────────────────────

describe('Commons fund deposits', () => {
  it('accepts deposits and increases balance', () => {
    const { fund } = createTestFund();
    fund.deposit(kalonToMicro(1000n));
    expect(fund.getBalance()).toBe(kalonToMicro(1000n));
  });

  it('accumulates multiple deposits', () => {
    const { fund } = createTestFund();
    fund.deposit(kalonToMicro(500n));
    fund.deposit(kalonToMicro(300n));
    expect(fund.getBalance()).toBe(kalonToMicro(800n));
  });

  it('ignores zero deposits', () => {
    const { fund } = createTestFund();
    fund.deposit(0n);
    expect(fund.getBalance()).toBe(0n);
  });

  it('ignores negative deposits', () => {
    const { fund } = createTestFund();
    fund.deposit(-100n);
    expect(fund.getBalance()).toBe(0n);
  });
});

// ─── UBK Distribution ──────────────────────────────────────────────

describe('Commons fund UBK distribution', () => {
  it('distributes UBK to all active dynasties', () => {
    const { fund } = createTestFund(63_000_000n);
    // Major world: 63M issuance → 500 KALON per dynasty
    fund.deposit(kalonToMicro(2000n));
    const result = fund.distributeUbk('earth');
    expect(result).not.toBeNull();
    expect(result?.dynastyCount).toBe(2);
    expect(result?.perDynastyKalon).toBe(500n);
  });

  it('deducts from commons balance', () => {
    const { fund } = createTestFund(63_000_000n);
    fund.deposit(kalonToMicro(2000n));
    fund.distributeUbk('earth');
    // 500 KALON × 2 dynasties = 1000 KALON distributed
    expect(fund.getBalance()).toBe(kalonToMicro(1000n));
  });

  it('credits dynasty accounts', () => {
    const { fund, deps } = createTestFund(63_000_000n);
    fund.deposit(kalonToMicro(2000n));
    fund.distributeUbk('earth');
    expect(deps.ledger.getBalance('kalon:dyn-1')).toBe(kalonToMicro(500n));
    expect(deps.ledger.getBalance('kalon:dyn-2')).toBe(kalonToMicro(500n));
  });

  it('returns null when no dynasties on world', () => {
    const { fund } = createTestFund(63_000_000n, []);
    fund.deposit(kalonToMicro(1000n));
    expect(fund.distributeUbk('empty-world')).toBeNull();
  });

  it('returns null when insufficient balance', () => {
    const { fund } = createTestFund(63_000_000n);
    fund.deposit(kalonToMicro(100n));
    // Needs 1000 KALON (500 × 2) but only has 100
    expect(fund.distributeUbk('earth')).toBeNull();
  });

  it('uses world prosperity for allocation tier', () => {
    // Frontier world: <5M issuance → 100 KALON per dynasty
    const { fund } = createTestFund(1_000_000n);
    fund.deposit(kalonToMicro(500n));
    const result = fund.distributeUbk('frontier');
    expect(result?.perDynastyKalon).toBe(100n);
  });

  it('scales with minor world prosperity', () => {
    // Minor world: 5M-20M → 200 KALON per dynasty
    const { fund } = createTestFund(10_000_000n);
    fund.deposit(kalonToMicro(1000n));
    const result = fund.distributeUbk('minor-world');
    expect(result?.perDynastyKalon).toBe(200n);
  });

  it('scales with standard world prosperity', () => {
    // Standard world: 20M-50M → 300 KALON per dynasty
    const { fund } = createTestFund(30_000_000n);
    fund.deposit(kalonToMicro(1000n));
    const result = fund.distributeUbk('standard-world');
    expect(result?.perDynastyKalon).toBe(300n);
  });
});

// ─── Summary ────────────────────────────────────────────────────────

describe('Commons fund summary', () => {
  it('tracks total deposited', () => {
    const { fund } = createTestFund();
    fund.deposit(kalonToMicro(1000n));
    fund.deposit(kalonToMicro(500n));
    const summary = fund.getSummary();
    expect(summary.totalDeposited).toBe(kalonToMicro(1500n));
  });

  it('tracks total distributed', () => {
    const { fund } = createTestFund(63_000_000n);
    fund.deposit(kalonToMicro(2000n));
    fund.distributeUbk('earth');
    const summary = fund.getSummary();
    expect(summary.totalDistributed).toBe(kalonToMicro(1000n));
  });

  it('tracks distribution count', () => {
    const { fund } = createTestFund(1_000_000n);
    fund.deposit(kalonToMicro(1000n));
    fund.distributeUbk('world-1');
    fund.distributeUbk('world-2');
    const summary = fund.getSummary();
    expect(summary.distributionCount).toBe(2);
  });

  it('reports current balance', () => {
    const { fund } = createTestFund(63_000_000n);
    fund.deposit(kalonToMicro(2000n));
    fund.distributeUbk('earth');
    expect(fund.getSummary().balance).toBe(kalonToMicro(1000n));
  });
});
