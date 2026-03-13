/**
 * Commons Fund - Simulation Tests
 *
 * Exercises multi-world UBK cycles and fund-level invariants.
 */

import { describe, expect, it } from 'vitest';
import {
  COMMONS_ACCOUNT_ID,
  createCommonsFund,
  type CommonsDynastyPort,
  type CommonsFund,
  type CommonsFundDeps,
  type CommonsLedgerPort,
  type CommonsWorldPort,
} from '../commons-fund.js';
import { kalonToMicro } from '../kalon-constants.js';

function createMockLedger(): CommonsLedgerPort & { accounts: Map<string, bigint> } {
  const accounts = new Map<string, bigint>();

  return {
    accounts,
    createAccount(accountId: string) {
      if (!accounts.has(accountId)) {
        accounts.set(accountId, 0n);
      }
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

function createHarness(): {
  fund: CommonsFund;
  deps: CommonsFundDeps & {
    ledger: ReturnType<typeof createMockLedger>;
    worldIssuance: Map<string, bigint>;
    worldDynasties: Map<string, string[]>;
  };
} {
  const ledger = createMockLedger();
  const worldIssuance = new Map<string, bigint>();
  const worldDynasties = new Map<string, string[]>();
  let now = 1_000_000;

  const dynastyPort: CommonsDynastyPort = {
    getActiveDynastyAccounts(worldId: string) {
      return worldDynasties.get(worldId) ?? [];
    },
  };

  const worldPort: CommonsWorldPort = {
    getAnnualIssuance(worldId: string) {
      return worldIssuance.get(worldId) ?? 0n;
    },
  };

  const deps: CommonsFundDeps & {
    ledger: ReturnType<typeof createMockLedger>;
    worldIssuance: Map<string, bigint>;
    worldDynasties: Map<string, string[]>;
  } = {
    ledger,
    dynastyPort,
    worldPort,
    worldIssuance,
    worldDynasties,
    clock: {
      nowMicroseconds: () => {
        now += 100;
        return now;
      },
    },
  };

  const fund = createCommonsFund(deps);
  return { fund, deps };
}

function seedWorld(
  deps: ReturnType<typeof createHarness>['deps'],
  worldId: string,
  issuance: bigint,
  dynasties: string[],
): void {
  deps.worldIssuance.set(worldId, issuance);
  deps.worldDynasties.set(worldId, dynasties);
  for (const account of dynasties) {
    if (!deps.ledger.accountExists(account)) {
      deps.ledger.createAccount(account);
    }
  }
}

describe('commons fund simulation', () => {
  it('bootstraps commons account exactly once', () => {
    const { fund, deps } = createHarness();
    expect(deps.ledger.accountExists(COMMONS_ACCOUNT_ID)).toBe(true);

    // Recreate from same deps to confirm idempotent account creation behavior.
    const fund2 = createCommonsFund(deps);
    expect(fund.getBalance()).toBe(0n);
    expect(fund2.getBalance()).toBe(0n);
    expect([...deps.ledger.accounts.keys()].filter((k) => k === COMMONS_ACCOUNT_ID)).toHaveLength(1);
  });

  it('distributes major-world UBK to all active dynasties', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'major-1', 75_000_000n, ['d:a', 'd:b', 'd:c']);

    fund.deposit(kalonToMicro(2_000n));
    const result = fund.distributeUbk('major-1');

    expect(result).not.toBeNull();
    expect(result?.perDynastyKalon).toBe(500n);
    expect(result?.dynastyCount).toBe(3);
    expect(result?.totalDistributed).toBe(kalonToMicro(1_500n));
    expect(deps.ledger.getBalance('d:a')).toBe(kalonToMicro(500n));
    expect(deps.ledger.getBalance('d:b')).toBe(kalonToMicro(500n));
    expect(deps.ledger.getBalance('d:c')).toBe(kalonToMicro(500n));
  });

  it('processes multi-world distribution tiers in sequence', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'frontier', 1_000_000n, ['f:1', 'f:2']);
    seedWorld(deps, 'minor', 10_000_000n, ['m:1', 'm:2']);
    seedWorld(deps, 'standard', 30_000_000n, ['s:1', 's:2']);

    fund.deposit(kalonToMicro(2_000n));

    const frontier = fund.distributeUbk('frontier');
    const minor = fund.distributeUbk('minor');
    const standard = fund.distributeUbk('standard');

    expect(frontier?.perDynastyKalon).toBe(100n);
    expect(minor?.perDynastyKalon).toBe(200n);
    expect(standard?.perDynastyKalon).toBe(300n);

    // Gross distributed = (100*2) + (200*2) + (300*2) = 1200 KALON.
    expect(fund.getBalance()).toBe(kalonToMicro(800n));
  });

  it('returns null and preserves state when no active dynasties exist', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'ghost-world', 50_000_000n, []);

    fund.deposit(kalonToMicro(500n));
    const before = fund.getSummary();

    const result = fund.distributeUbk('ghost-world');
    const after = fund.getSummary();

    expect(result).toBeNull();
    expect(after).toEqual(before);
  });

  it('returns null and preserves balances when fund is insufficient', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'major-2', 50_000_000n, ['x:1', 'x:2']);

    fund.deposit(kalonToMicro(300n));
    const beforeCommons = fund.getBalance();

    const result = fund.distributeUbk('major-2');

    expect(result).toBeNull();
    expect(fund.getBalance()).toBe(beforeCommons);
    expect(deps.ledger.getBalance('x:1')).toBe(0n);
    expect(deps.ledger.getBalance('x:2')).toBe(0n);
  });

  it('accumulates UBK on dynasty accounts across repeated cycles', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'minor-2', 5_000_000n, ['dyn:1', 'dyn:2']);

    fund.deposit(kalonToMicro(1_000n));

    const first = fund.distributeUbk('minor-2');
    const second = fund.distributeUbk('minor-2');

    expect(first?.perDynastyKalon).toBe(200n);
    expect(second?.perDynastyKalon).toBe(200n);
    expect(deps.ledger.getBalance('dyn:1')).toBe(kalonToMicro(400n));
    expect(deps.ledger.getBalance('dyn:2')).toBe(kalonToMicro(400n));
  });

  it('supports dynamic dynasty rosters between cycles', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'standard-2', 20_000_000n, ['p:1', 'p:2']);

    fund.deposit(kalonToMicro(2_000n));
    const first = fund.distributeUbk('standard-2');
    expect(first?.dynastyCount).toBe(2);

    if (!deps.ledger.accountExists('p:3')) {
      deps.ledger.createAccount('p:3');
    }
    deps.worldDynasties.set('standard-2', ['p:1', 'p:2', 'p:3']);

    const second = fund.distributeUbk('standard-2');
    expect(second?.dynastyCount).toBe(3);
    expect(second?.totalDistributed).toBe(kalonToMicro(900n));
  });

  it('keeps summary invariants across mixed outcomes', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'ok', 50_000_000n, ['k:1', 'k:2']);
    seedWorld(deps, 'empty', 50_000_000n, []);

    fund.deposit(kalonToMicro(1_500n));
    fund.deposit(kalonToMicro(500n));

    const dist1 = fund.distributeUbk('ok');
    const dist2 = fund.distributeUbk('empty');
    const dist3 = fund.distributeUbk('ok');

    expect(dist1).not.toBeNull();
    expect(dist2).toBeNull();
    expect(dist3).not.toBeNull();

    const summary = fund.getSummary();
    expect(summary.balance).toBe(summary.totalDeposited - summary.totalDistributed);
    expect(summary.distributionCount).toBe(2);
    expect(summary.totalDeposited).toBe(kalonToMicro(2_000n));
    expect(summary.totalDistributed).toBe(kalonToMicro(2_000n));
  });

  it('handles unknown world issuance as frontier tier by default', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'unknown-issuance', 0n, ['u:1']);

    fund.deposit(kalonToMicro(200n));
    const result = fund.distributeUbk('unknown-issuance');

    expect(result).not.toBeNull();
    expect(result?.perDynastyKalon).toBe(100n);
    expect(result?.totalDistributed).toBe(kalonToMicro(100n));
  });

  it('keeps commons balance monotonically non-increasing during distribution-only phase', () => {
    const { fund, deps } = createHarness();
    seedWorld(deps, 'major-3', 50_000_000n, ['a1', 'a2']);

    fund.deposit(kalonToMicro(2_000n));
    const checkpoints: bigint[] = [fund.getBalance()];

    fund.distributeUbk('major-3');
    checkpoints.push(fund.getBalance());

    fund.distributeUbk('major-3');
    checkpoints.push(fund.getBalance());

    expect(checkpoints[1]).toBeLessThanOrEqual(checkpoints[0] ?? 0n);
    expect(checkpoints[2]).toBeLessThanOrEqual(checkpoints[1] ?? 0n);
  });
});
