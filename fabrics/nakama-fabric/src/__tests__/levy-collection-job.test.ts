/**
 * Tests for levy-collection-job.ts
 */

import { describe, it, expect } from 'vitest';
import {
  createLevyCollectionJob,
  LEVY_EXEMPT_THRESHOLD,
  LEVY_DISTRIBUTION,
  COMMONS_ACCOUNT,
  ARCHIVE_ACCOUNT,
  ARCHITECT_ACCOUNT,
  type LevyLedgerPort,
} from '../levy-collection-job.js';
import { kalonToMicro } from '../kalon-constants.js';

// ─── Mock Ledger ─────────────────────────────────────────────────────────────

interface MockLedger extends LevyLedgerPort {
  readonly balances: Map<string, bigint>;
  readonly transfers: Array<{ from: string; to: string; amount: bigint }>;
  readonly mints: Array<{ account: string; amount: bigint }>;
}

function createMockLedger(initial: Record<string, bigint> = {}): MockLedger {
  const balances = new Map<string, bigint>(Object.entries(initial) as [string, bigint][]);
  const transfers: Array<{ from: string; to: string; amount: bigint }> = [];
  const mints: Array<{ account: string; amount: bigint }> = [];
  return {
    balances,
    transfers,
    mints,
    getBalance: (id) => balances.get(id) ?? 0n,
    transfer: (from, to, amount) => {
      const fromBal = balances.get(from) ?? 0n;
      const toBal = balances.get(to) ?? 0n;
      balances.set(from, fromBal - amount);
      balances.set(to, toBal + amount);
      transfers.push({ from, to, amount });
    },
    mint: (account, amount) => {
      const bal = balances.get(account) ?? 0n;
      balances.set(account, bal + amount);
      mints.push({ account, amount });
    },
    accountExists: (id) => balances.has(id),
  };
}

const TOTAL_SUPPLY = kalonToMicro(1_000_000n); // 1M KALON

// ─── Constants ───────────────────────────────────────────────────────────────

describe('levy-collection-job — constants', () => {
  it('LEVY_EXEMPT_THRESHOLD equals 10 micro-KALON', () => {
    expect(LEVY_EXEMPT_THRESHOLD).toBe(kalonToMicro(10n));
  });

  it('LEVY_DISTRIBUTION commonsBps is 5000 (50%)', () => {
    expect(LEVY_DISTRIBUTION.commonsBps).toBe(5000n);
  });

  it('LEVY_DISTRIBUTION archiveBps is 2500 (25%)', () => {
    expect(LEVY_DISTRIBUTION.archiveBps).toBe(2500n);
  });

  it('LEVY_DISTRIBUTION architectBps is 2500 (25%)', () => {
    expect(LEVY_DISTRIBUTION.architectBps).toBe(2500n);
  });

  it('LEVY_DISTRIBUTION scale is 10000', () => {
    expect(LEVY_DISTRIBUTION.scale).toBe(10_000n);
  });

  it('bps sum equals scale (100%)', () => {
    const total =
      LEVY_DISTRIBUTION.commonsBps +
      LEVY_DISTRIBUTION.archiveBps +
      LEVY_DISTRIBUTION.architectBps;
    expect(total).toBe(LEVY_DISTRIBUTION.scale);
  });

  it('COMMONS_ACCOUNT is commons:global', () => {
    expect(COMMONS_ACCOUNT).toBe('commons:global');
  });

  it('ARCHIVE_ACCOUNT is archive:global', () => {
    expect(ARCHIVE_ACCOUNT).toBe('archive:global');
  });

  it('ARCHITECT_ACCOUNT is architect:reserve', () => {
    expect(ARCHITECT_ACCOUNT).toBe('architect:reserve');
  });
});

// ─── assessLevy ──────────────────────────────────────────────────────────────

describe('assessLevy — exemptions', () => {
  it('exempts dynasty with zero balance', () => {
    const job = createLevyCollectionJob();
    const result = job.assessLevy('d1', 0n, TOTAL_SUPPLY);
    expect(result.isExempt).toBe(true);
    expect(result.amount).toBe(0n);
  });

  it('exempts dynasty with balance one below threshold', () => {
    const job = createLevyCollectionJob();
    const result = job.assessLevy('d1', LEVY_EXEMPT_THRESHOLD - 1n, TOTAL_SUPPLY);
    expect(result.isExempt).toBe(true);
    expect(result.amount).toBe(0n);
  });

  it('does NOT exempt dynasty at exactly the threshold', () => {
    const job = createLevyCollectionJob();
    const result = job.assessLevy('d1', LEVY_EXEMPT_THRESHOLD, TOTAL_SUPPLY);
    expect(result.isExempt).toBe(false);
  });
});

describe('assessLevy — amounts', () => {
  it('returns positive amount for balance above threshold', () => {
    const job = createLevyCollectionJob();
    const balance = kalonToMicro(1_000n);
    const result = job.assessLevy('d1', balance, TOTAL_SUPPLY);
    expect(result.isExempt).toBe(false);
    expect(result.amount).toBeGreaterThan(0n);
  });

  it('levy is always less than balance', () => {
    const job = createLevyCollectionJob();
    const balance = kalonToMicro(50_000n);
    const result = job.assessLevy('d1', balance, TOTAL_SUPPLY);
    expect(result.amount).toBeLessThan(balance);
  });

  it('higher balance yields higher levy amount', () => {
    const job = createLevyCollectionJob();
    const low = kalonToMicro(100n);
    const high = kalonToMicro(100_000n);
    const lowResult = job.assessLevy('d1', low, TOTAL_SUPPLY);
    const highResult = job.assessLevy('d1', high, TOTAL_SUPPLY);
    expect(highResult.amount).toBeGreaterThan(lowResult.amount);
  });

  it('uses minimum rate when total supply is zero', () => {
    const job = createLevyCollectionJob();
    const balance = kalonToMicro(100n);
    const result = job.assessLevy('d1', balance, 0n);
    // minimum rate is 50 bps = 0.5%
    expect(result.amount).toBe((balance * 50n) / 10_000n);
  });

  it('levy rate does not exceed 2.5% of balance', () => {
    const job = createLevyCollectionJob();
    const balance = kalonToMicro(1_000_000n);
    const result = job.assessLevy('d1', balance, balance); // 100% of supply
    const maxLevy = (balance * 250n) / 10_000n;
    expect(result.amount).toBeLessThanOrEqual(maxLevy);
  });
});

// ─── runLevyCollection — run metadata ────────────────────────────────────────

describe('runLevyCollection — run metadata', () => {
  it('first run has runId levy-run-<day>-1', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    const run = job.runLevyCollection(10, [], TOTAL_SUPPLY, ledger);
    expect(run.runId).toBe('levy-run-10-1');
  });

  it('second run increments counter to 2', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    job.runLevyCollection(10, [], TOTAL_SUPPLY, ledger);
    const run2 = job.runLevyCollection(10, [], TOTAL_SUPPLY, ledger);
    expect(run2.runId).toBe('levy-run-10-2');
  });

  it('run counter persists across different in-game days', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    job.runLevyCollection(10, [], TOTAL_SUPPLY, ledger);
    const run2 = job.runLevyCollection(20, [], TOTAL_SUPPLY, ledger);
    expect(run2.runId).toBe('levy-run-20-2');
  });

  it('sets inGameDay correctly', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    const run = job.runLevyCollection(42, [], TOTAL_SUPPLY, ledger);
    expect(run.inGameDay).toBe(42);
  });

  it('startedAt and completedAt are valid ISO strings', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    const run = job.runLevyCollection(1, [], TOTAL_SUPPLY, ledger);
    expect(() => new Date(run.startedAt)).not.toThrow();
    expect(run.completedAt).toBeDefined();
    expect(() => new Date(run.completedAt!)).not.toThrow();
  });

  it('dynastiesAssessed equals dynastyIds.length', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({
      'kalon:d1': kalonToMicro(1_000n),
      'kalon:d2': kalonToMicro(1_000n),
    });
    const run = job.runLevyCollection(1, ['d1', 'd2'], TOTAL_SUPPLY, ledger);
    expect(run.dynastiesAssessed).toBe(2);
  });
});

// ─── runLevyCollection — empty run ───────────────────────────────────────────

describe('runLevyCollection — empty dynasty list', () => {
  it('zero collected', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    const run = job.runLevyCollection(1, [], TOTAL_SUPPLY, ledger);
    expect(run.totalCollected).toBe(0n);
    expect(run.dynastiesCollected).toBe(0);
    expect(run.dynastiesExempted).toBe(0);
    expect(run.dynastiesDelinquent).toBe(0);
    expect(run.errors).toHaveLength(0);
  });

  it('no transfers occur', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    job.runLevyCollection(1, [], TOTAL_SUPPLY, ledger);
    expect(ledger.transfers).toHaveLength(0);
  });

  it('commonsShare, archiveShare, architectShare all zero', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    const run = job.runLevyCollection(1, [], TOTAL_SUPPLY, ledger);
    expect(run.commonsShare).toBe(0n);
    expect(run.archiveShare).toBe(0n);
    expect(run.architectShare).toBe(0n);
  });
});

// ─── runLevyCollection — exemptions ──────────────────────────────────────────

describe('runLevyCollection — dynasty exemptions', () => {
  it('exempts dynasty below threshold', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({ 'kalon:poor': LEVY_EXEMPT_THRESHOLD - 1n });
    const run = job.runLevyCollection(1, ['poor'], TOTAL_SUPPLY, ledger);
    expect(run.dynastiesExempted).toBe(1);
    expect(run.dynastiesCollected).toBe(0);
  });

  it('records DYNASTY_NOT_FOUND error for missing account', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    const run = job.runLevyCollection(1, ['ghost'], TOTAL_SUPPLY, ledger);
    expect(run.errors).toHaveLength(1);
    expect(run.errors[0]!.errorType).toBe('DYNASTY_NOT_FOUND');
    expect(run.errors[0]!.dynastyId).toBe('ghost');
    expect(run.errors[0]!.amount).toBe(0n);
    expect(run.dynastiesDelinquent).toBe(1);
  });
});

// ─── runLevyCollection — collections ─────────────────────────────────────────

describe('runLevyCollection — collection and distribution', () => {
  it('collects from dynasty above threshold', () => {
    const job = createLevyCollectionJob();
    const balance = kalonToMicro(10_000n);
    const ledger = createMockLedger({ 'kalon:d1': balance });
    const run = job.runLevyCollection(1, ['d1'], TOTAL_SUPPLY, ledger);
    expect(run.dynastiesCollected).toBe(1);
    expect(run.totalCollected).toBeGreaterThan(0n);
    expect(run.errors).toHaveLength(0);
  });

  it('transfers initial levy into COMMONS_ACCOUNT', () => {
    const job = createLevyCollectionJob();
    const balance = kalonToMicro(10_000n);
    const ledger = createMockLedger({ 'kalon:d1': balance });
    job.runLevyCollection(1, ['d1'], TOTAL_SUPPLY, ledger);
    const toCommons = ledger.transfers.filter((t) => t.to === COMMONS_ACCOUNT);
    expect(toCommons.length).toBeGreaterThan(0);
  });

  it('distributes archiveShare from commons to ARCHIVE_ACCOUNT', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({ 'kalon:d1': kalonToMicro(10_000n) });
    job.runLevyCollection(1, ['d1'], TOTAL_SUPPLY, ledger);
    const archiveTransfer = ledger.transfers.find((t) => t.to === ARCHIVE_ACCOUNT);
    expect(archiveTransfer).toBeDefined();
  });

  it('distributes architectShare from commons to ARCHITECT_ACCOUNT', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({ 'kalon:d1': kalonToMicro(10_000n) });
    job.runLevyCollection(1, ['d1'], TOTAL_SUPPLY, ledger);
    const architectTransfer = ledger.transfers.find((t) => t.to === ARCHITECT_ACCOUNT);
    expect(architectTransfer).toBeDefined();
  });

  it('commonsShare + archiveShare + architectShare equals totalCollected', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({ 'kalon:d1': kalonToMicro(50_000n) });
    const run = job.runLevyCollection(1, ['d1'], TOTAL_SUPPLY, ledger);
    expect(run.commonsShare + run.archiveShare + run.architectShare).toBe(run.totalCollected);
  });

  it('archiveShare equals architectShare', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({ 'kalon:d1': kalonToMicro(50_000n) });
    const run = job.runLevyCollection(1, ['d1'], TOTAL_SUPPLY, ledger);
    expect(run.archiveShare).toBe(run.architectShare);
  });

  it('commonsShare is approximately 50% of totalCollected', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({ 'kalon:d1': kalonToMicro(100_000n) });
    const run = job.runLevyCollection(1, ['d1'], TOTAL_SUPPLY, ledger);
    const half = run.totalCollected / 2n;
    // allow off-by-one from BigInt integer division
    expect(run.commonsShare).toBeGreaterThanOrEqual(half - 1n);
    expect(run.commonsShare).toBeLessThanOrEqual(half + 1n);
  });

  it('handles mix of collected, exempted, and delinquent dynasties', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({
      'kalon:rich': kalonToMicro(10_000n),
      'kalon:poor': LEVY_EXEMPT_THRESHOLD - 1n,
    });
    const run = job.runLevyCollection(
      1,
      ['rich', 'poor', 'ghost'],
      TOTAL_SUPPLY,
      ledger,
    );
    expect(run.dynastiesAssessed).toBe(3);
    expect(run.dynastiesCollected).toBe(1);
    expect(run.dynastiesExempted).toBe(1);
    expect(run.dynastiesDelinquent).toBe(1);
    expect(run.totalCollected).toBeGreaterThan(0n);
  });

  it('errors do not block collection from other valid dynasties', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger({ 'kalon:valid': kalonToMicro(10_000n) });
    const run = job.runLevyCollection(1, ['ghost', 'valid'], TOTAL_SUPPLY, ledger);
    expect(run.dynastiesCollected).toBe(1);
    expect(run.totalCollected).toBeGreaterThan(0n);
    expect(run.errors).toHaveLength(1);
  });

  it('multiple missing dynasties produce multiple errors', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    const run = job.runLevyCollection(1, ['g1', 'g2', 'g3'], TOTAL_SUPPLY, ledger);
    expect(run.errors).toHaveLength(3);
    expect(run.dynastiesDelinquent).toBe(3);
  });
});

// ─── getLevyHistory ───────────────────────────────────────────────────────────

describe('getLevyHistory', () => {
  it('returns empty array on fresh job', () => {
    const job = createLevyCollectionJob();
    expect(job.getLevyHistory(10)).toHaveLength(0);
  });

  it('records a run in history', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    job.runLevyCollection(1, [], TOTAL_SUPPLY, ledger);
    expect(job.getLevyHistory(10)).toHaveLength(1);
  });

  it('respects limit parameter', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    for (let i = 0; i < 6; i++) {
      job.runLevyCollection(i, [], TOTAL_SUPPLY, ledger);
    }
    expect(job.getLevyHistory(3)).toHaveLength(3);
  });

  it('returns the most recent runs when limit is exceeded', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    for (let day = 1; day <= 5; day++) {
      job.runLevyCollection(day * 10, [], TOTAL_SUPPLY, ledger);
    }
    const history = job.getLevyHistory(2);
    expect(history[0]!.inGameDay).toBe(40);
    expect(history[1]!.inGameDay).toBe(50);
  });

  it('returns all when limit exceeds stored count', () => {
    const job = createLevyCollectionJob();
    const ledger = createMockLedger();
    job.runLevyCollection(1, [], TOTAL_SUPPLY, ledger);
    job.runLevyCollection(2, [], TOTAL_SUPPLY, ledger);
    expect(job.getLevyHistory(100)).toHaveLength(2);
  });

  it('each factory instance has independent history', () => {
    const job1 = createLevyCollectionJob();
    const job2 = createLevyCollectionJob();
    const ledger = createMockLedger();
    job1.runLevyCollection(1, [], TOTAL_SUPPLY, ledger);
    job1.runLevyCollection(2, [], TOTAL_SUPPLY, ledger);
    expect(job1.getLevyHistory(10)).toHaveLength(2);
    expect(job2.getLevyHistory(10)).toHaveLength(0);
  });
});
