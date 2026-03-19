/**
 * Tests for ubk-distribution-job.ts
 */

import { describe, it, expect } from 'vitest';
import {
  createUbkDistributionJob,
  COMMONS_ACCOUNT_ID,
  type UbkLedgerPort,
  type UbkDynastyInfo,
} from '../ubk-distribution-job.js';
import { kalonToMicro } from '../kalon-constants.js';

// ─── Mock Ledger ─────────────────────────────────────────────────────────────

interface MockLedger extends UbkLedgerPort {
  readonly balances: Map<string, bigint>;
  readonly transfers: Array<{ from: string; to: string; amount: bigint }>;
  readonly createdAccounts: string[];
}

function createMockLedger(initial: Record<string, bigint> = {}): MockLedger {
  const balances = new Map<string, bigint>(Object.entries(initial) as [string, bigint][]);
  const transfers: Array<{ from: string; to: string; amount: bigint }> = [];
  const createdAccounts: string[] = [];
  return {
    balances,
    transfers,
    createdAccounts,
    getBalance: (id) => balances.get(id) ?? 0n,
    transfer: (from, to, amount) => {
      const fromBal = balances.get(from) ?? 0n;
      const toBal = balances.get(to) ?? 0n;
      balances.set(from, fromBal - amount);
      balances.set(to, toBal + amount);
      transfers.push({ from, to, amount });
    },
    accountExists: (id) => balances.has(id),
    createAccount: (id) => {
      balances.set(id, 0n);
      createdAccounts.push(id);
    },
  };
}

/** UBK_SCALE_THRESHOLD = kalonToMicro(10_000_000n) = 10_000_000_000_000n */
const UBK_SCALE_THRESHOLD = kalonToMicro(10_000_000n);

// ─── Constants ───────────────────────────────────────────────────────────────

describe('ubk-distribution-job — constants', () => {
  it('COMMONS_ACCOUNT_ID is commons:global', () => {
    expect(COMMONS_ACCOUNT_ID).toBe('commons:global');
  });
});

// ─── calculateUbkAmount ───────────────────────────────────────────────────────

describe('calculateUbkAmount', () => {
  it('returns 100 KALON when commons balance is zero', () => {
    const job = createUbkDistributionJob();
    expect(job.calculateUbkAmount(0n)).toBe(100n);
  });

  it('returns 100 KALON when commons balance is below zero', () => {
    const job = createUbkDistributionJob();
    expect(job.calculateUbkAmount(-1n)).toBe(100n);
  });

  it('returns 500 KALON when commons balance equals the scale threshold', () => {
    const job = createUbkDistributionJob();
    expect(job.calculateUbkAmount(UBK_SCALE_THRESHOLD)).toBe(500n);
  });

  it('returns 500 KALON when commons balance exceeds the scale threshold', () => {
    const job = createUbkDistributionJob();
    expect(job.calculateUbkAmount(UBK_SCALE_THRESHOLD * 2n)).toBe(500n);
  });

  it('scales linearly between 100 and 500 for intermediate values', () => {
    const job = createUbkDistributionJob();
    const half = UBK_SCALE_THRESHOLD / 2n;
    const amount = job.calculateUbkAmount(half);
    expect(amount).toBeGreaterThan(100n);
    expect(amount).toBeLessThan(500n);
  });

  it('amount at 50% threshold is approximately 300 KALON', () => {
    const job = createUbkDistributionJob();
    const half = UBK_SCALE_THRESHOLD / 2n;
    // range = 400; scaled = (half * 400) / threshold = 200; result = 100 + 200 = 300
    const amount = job.calculateUbkAmount(half);
    expect(amount).toBe(300n);
  });

  it('amount increases as commons balance grows', () => {
    const job = createUbkDistributionJob();
    const small = job.calculateUbkAmount(UBK_SCALE_THRESHOLD / 4n);
    const large = job.calculateUbkAmount((UBK_SCALE_THRESHOLD * 3n) / 4n);
    expect(large).toBeGreaterThan(small);
  });

  it('returns exactly 100 for very small positive balance', () => {
    const job = createUbkDistributionJob();
    // Very small balance: scaled = (1n * 400n) / threshold ≈ 0n, so result = 100 + 0 = 100
    expect(job.calculateUbkAmount(1n)).toBe(100n);
  });
});

// ─── isEligible ───────────────────────────────────────────────────────────────

describe('isEligible', () => {
  it('WANDERER tier is eligible', () => {
    const job = createUbkDistributionJob();
    expect(job.isEligible('d1', 'WANDERER')).toBe(true);
  });

  it('SETTLER tier is eligible', () => {
    const job = createUbkDistributionJob();
    expect(job.isEligible('d1', 'SETTLER')).toBe(true);
  });

  it('MERCHANT tier is eligible', () => {
    const job = createUbkDistributionJob();
    expect(job.isEligible('d1', 'MERCHANT')).toBe(true);
  });

  it('CONSORTIUM tier is NOT eligible', () => {
    const job = createUbkDistributionJob();
    expect(job.isEligible('d1', 'CONSORTIUM')).toBe(false);
  });
});

// ─── runUbkDistribution — run metadata ───────────────────────────────────────

describe('runUbkDistribution — metadata', () => {
  it('first run has runId ubk-run-<day>-1', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    const run = job.runUbkDistribution(30, [], 0n, ledger);
    expect(run.runId).toBe('ubk-run-30-1');
  });

  it('second run increments counter', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    job.runUbkDistribution(30, [], 0n, ledger);
    const run2 = job.runUbkDistribution(60, [], 0n, ledger);
    expect(run2.runId).toBe('ubk-run-60-2');
  });

  it('sets inGameDay correctly', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    const run = job.runUbkDistribution(90, [], 0n, ledger);
    expect(run.inGameDay).toBe(90);
  });

  it('fundedFrom is always COMMONS_FUND', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    const run = job.runUbkDistribution(30, [], 0n, ledger);
    expect(run.fundedFrom).toBe('COMMONS_FUND');
  });

  it('prosperityMultiplier is 1.0', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    const run = job.runUbkDistribution(30, [], 0n, ledger);
    expect(run.prosperityMultiplier).toBe(1.0);
  });

  it('startedAt and completedAt are valid ISO strings', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    const run = job.runUbkDistribution(30, [], 0n, ledger);
    expect(() => new Date(run.startedAt)).not.toThrow();
    expect(run.completedAt).toBeDefined();
    expect(() => new Date(run.completedAt!)).not.toThrow();
  });

  it('empty dynasty list produces zero distribution', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    const run = job.runUbkDistribution(30, [], kalonToMicro(1_000_000n), ledger);
    expect(run.dynastiesDistributed).toBe(0);
    expect(run.totalDistributed).toBe(0n);
    expect(run.dynastiesEligible).toBe(0);
    expect(run.dynastiesSkipped).toBe(0);
  });
});

// ─── runUbkDistribution — eligibility ────────────────────────────────────────

describe('runUbkDistribution — eligibility and skipping', () => {
  it('skips CONSORTIUM dynasties', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: kalonToMicro(10_000_000n) });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'big', traderTier: 'CONSORTIUM', activityStatus: 'ACTIVE' },
    ];
    const run = job.runUbkDistribution(30, dynasties, kalonToMicro(10_000_000n), ledger);
    expect(run.dynastiesSkipped).toBe(1);
    expect(run.dynastiesDistributed).toBe(0);
    expect(run.dynastiesEligible).toBe(0);
  });

  it('distributes to WANDERER dynasty', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'ACTIVE' },
    ];
    const run = job.runUbkDistribution(30, dynasties, commons, ledger);
    expect(run.dynastiesDistributed).toBe(1);
    expect(run.totalDistributed).toBeGreaterThan(0n);
  });

  it('distributes to SETTLER dynasty', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'SETTLER', activityStatus: 'ACTIVE' },
    ];
    const run = job.runUbkDistribution(30, dynasties, commons, ledger);
    expect(run.dynastiesDistributed).toBe(1);
  });

  it('counts eligible vs skipped correctly for mixed tiers', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'ACTIVE' },
      { dynastyId: 'd2', traderTier: 'CONSORTIUM', activityStatus: 'ACTIVE' },
      { dynastyId: 'd3', traderTier: 'MERCHANT', activityStatus: 'ACTIVE' },
    ];
    const run = job.runUbkDistribution(30, dynasties, commons, ledger);
    expect(run.dynastiesEligible).toBe(2);
    expect(run.dynastiesSkipped).toBe(1);
  });

  it('does not distribute when commons insufficient for all eligible', () => {
    const job = createUbkDistributionJob();
    // commons = 1n; baseMicro = kalonToMicro(100n) = 100_000_000n; totalNeeded >> 1n
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: 1n });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'ACTIVE' },
      { dynastyId: 'd2', traderTier: 'SETTLER', activityStatus: 'ACTIVE' },
    ];
    const run = job.runUbkDistribution(30, dynasties, 1n, ledger);
    expect(run.dynastiesDistributed).toBe(0);
    expect(run.totalDistributed).toBe(0n);
  });
});

// ─── runUbkDistribution — account handling ────────────────────────────────────

describe('runUbkDistribution — account creation', () => {
  it('creates kalon:<id> account for ACTIVE dynasty', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'ACTIVE' },
    ];
    job.runUbkDistribution(30, dynasties, commons, ledger);
    expect(ledger.createdAccounts).toContain('kalon:d1');
  });

  it('creates vigil:<id> account for VIGIL dynasty', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'VIGIL' },
    ];
    job.runUbkDistribution(30, dynasties, commons, ledger);
    expect(ledger.createdAccounts).toContain('vigil:d1');
  });

  it('does not recreate an already existing account', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({
      [COMMONS_ACCOUNT_ID]: commons,
      'kalon:d1': 0n,
    });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'ACTIVE' },
    ];
    job.runUbkDistribution(30, dynasties, commons, ledger);
    expect(ledger.createdAccounts).not.toContain('kalon:d1');
  });

  it('transfers UBK from COMMONS to dynasty kalon account', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'ACTIVE' },
    ];
    job.runUbkDistribution(30, dynasties, commons, ledger);
    const transfer = ledger.transfers.find(
      (t) => t.from === COMMONS_ACCOUNT_ID && t.to === 'kalon:d1',
    );
    expect(transfer).toBeDefined();
  });

  it('DISSOLVED dynasty uses kalon account (not vigil)', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd2', traderTier: 'MERCHANT', activityStatus: 'DISSOLVED' },
    ];
    job.runUbkDistribution(30, dynasties, commons, ledger);
    expect(ledger.createdAccounts).toContain('kalon:d2');
    expect(ledger.createdAccounts).not.toContain('vigil:d2');
  });
});

// ─── runUbkDistribution — totals ─────────────────────────────────────────────

describe('runUbkDistribution — totalDistributed', () => {
  it('totalDistributed equals baseAmountMicro × dynastiesDistributed', () => {
    const job = createUbkDistributionJob();
    const commons = kalonToMicro(10_000_000n);
    const ledger = createMockLedger({ [COMMONS_ACCOUNT_ID]: commons });
    const dynasties: UbkDynastyInfo[] = [
      { dynastyId: 'd1', traderTier: 'WANDERER', activityStatus: 'ACTIVE' },
      { dynastyId: 'd2', traderTier: 'SETTLER', activityStatus: 'ACTIVE' },
    ];
    const run = job.runUbkDistribution(30, dynasties, commons, ledger);
    const expectedTotal = kalonToMicro(run.baseAmount) * BigInt(run.dynastiesDistributed);
    expect(run.totalDistributed).toBe(expectedTotal);
  });

  it('baseAmount reflects commons balance scaling', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    // Small commons → baseAmount = 100 KALON
    const run = job.runUbkDistribution(30, [], 0n, ledger);
    expect(run.baseAmount).toBe(100n);
  });

  it('baseAmount is 500 for large commons', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    const run = job.runUbkDistribution(30, [], UBK_SCALE_THRESHOLD, ledger);
    expect(run.baseAmount).toBe(500n);
  });
});

// ─── getDistributionHistory ───────────────────────────────────────────────────

describe('getDistributionHistory', () => {
  it('returns empty array on fresh job', () => {
    const job = createUbkDistributionJob();
    expect(job.getDistributionHistory(10)).toHaveLength(0);
  });

  it('records runs in history', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    job.runUbkDistribution(30, [], 0n, ledger);
    expect(job.getDistributionHistory(10)).toHaveLength(1);
  });

  it('respects limit parameter', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    for (let i = 0; i < 5; i++) {
      job.runUbkDistribution(i * 30, [], 0n, ledger);
    }
    expect(job.getDistributionHistory(3)).toHaveLength(3);
  });

  it('returns most recent N runs', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    for (let i = 1; i <= 4; i++) {
      job.runUbkDistribution(i * 30, [], 0n, ledger);
    }
    const history = job.getDistributionHistory(2);
    expect(history[0]!.inGameDay).toBe(90);
    expect(history[1]!.inGameDay).toBe(120);
  });

  it('returns all when limit exceeds count', () => {
    const job = createUbkDistributionJob();
    const ledger = createMockLedger();
    job.runUbkDistribution(30, [], 0n, ledger);
    job.runUbkDistribution(60, [], 0n, ledger);
    expect(job.getDistributionHistory(100)).toHaveLength(2);
  });

  it('instances have independent history', () => {
    const job1 = createUbkDistributionJob();
    const job2 = createUbkDistributionJob();
    const ledger = createMockLedger();
    job1.runUbkDistribution(30, [], 0n, ledger);
    expect(job1.getDistributionHistory(10)).toHaveLength(1);
    expect(job2.getDistributionHistory(10)).toHaveLength(0);
  });
});
