/**
 * Revenue Engine Tests
 *
 * UE5 royalty tracking: event recording, quarterly ledger computation,
 * $1M threshold, standard vs Epic Store rates.
 */

import { describe, it, expect } from 'vitest';
import {
  createRevenueEngine,
  LIFETIME_ROYALTY_FREE_THRESHOLD,
  STANDARD_ROYALTY_RATE,
  EPIC_STORE_ROYALTY_RATE,
  QUARTERLY_REPORTING_THRESHOLD,
  type RevenueEngine,
  type RevenueEngineDeps,
} from '../universe/revenue/engine.js';
import type { RevenuePlatform, PaymentProcessor } from '../universe/revenue/types.js';

// ─── Test Helpers ──────────────────────────────────────────────────

let _counter = 0;

function makeDeps(): RevenueEngineDeps & { setNow: (ms: number) => void } {
  let now = Date.UTC(2027, 0, 15); // Jan 15, 2027
  return {
    now: () => now,
    setNow: (ms: number) => { now = ms; },
    generateId: () => `rev-${String(++_counter)}`,
  };
}

interface EventParams {
  grossAmountUsd: number;
  platform?: RevenuePlatform;
  processor?: PaymentProcessor;
  userId?: string;
  createdAt?: number;
}

function makeEngine(): { engine: RevenueEngine; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { engine: createRevenueEngine(deps), deps };
}

function recordEvent(
  engine: RevenueEngine,
  { grossAmountUsd, platform = 'ios', processor = 'apple', userId = 'u1', createdAt }: EventParams,
): ReturnType<RevenueEngine['recordEvent']> {
  return engine.recordEvent({
    eventType: 'subscription',
    grossAmountUsd,
    netAmountUsd: grossAmountUsd * 0.7,
    platform,
    paymentProcessor: processor,
    userId,
    transactionId: `txn-${String(++_counter)}`,
    ...(createdAt !== undefined ? { createdAt } : {}),
  });
}

// Helper: record events in a specific quarter
function recordInQuarter(
  engine: RevenueEngine,
  deps: ReturnType<typeof makeDeps>,
  quarterStartMs: number,
  grossAmountUsd: number,
  platform: RevenuePlatform = 'ios',
): void {
  deps.setNow(quarterStartMs + 1000);
  recordEvent(engine, { grossAmountUsd, platform });
}

// Q1 2027 start (Jan 1, 2027 UTC)
const Q1_2027 = Date.UTC(2027, 0, 1);
// Q2 2027 start (Apr 1, 2027 UTC)
const Q2_2027 = Date.UTC(2027, 3, 1);
// Q3 2027 start (Jul 1, 2027 UTC)
const Q3_2027 = Date.UTC(2027, 6, 1);

// ─── Constants ─────────────────────────────────────────────────────

describe('constants', () => {
  it('LIFETIME_ROYALTY_FREE_THRESHOLD is $1 million', () => {
    expect(LIFETIME_ROYALTY_FREE_THRESHOLD).toBe(1_000_000);
  });

  it('STANDARD_ROYALTY_RATE is 5%', () => {
    expect(STANDARD_ROYALTY_RATE).toBe(0.05);
  });

  it('EPIC_STORE_ROYALTY_RATE is 3.5%', () => {
    expect(EPIC_STORE_ROYALTY_RATE).toBe(0.035);
  });

  it('QUARTERLY_REPORTING_THRESHOLD is $10,000', () => {
    expect(QUARTERLY_REPORTING_THRESHOLD).toBe(10_000);
  });
});

// ─── recordEvent ──────────────────────────────────────────────────

describe('recordEvent', () => {
  it('returns an event with generated ID', () => {
    const { engine } = makeEngine();
    const event = recordEvent(engine, { grossAmountUsd: 500 });
    expect(event.id).toBeTruthy();
  });

  it('records createdAt from deps.now()', () => {
    const { engine, deps } = makeEngine();
    deps.setNow(Q1_2027 + 5000);
    const event = recordEvent(engine, { grossAmountUsd: 500 });
    expect(event.createdAt).toBe(Q1_2027 + 5000);
  });

  it('stores the event so getEventsForQuarter returns it', () => {
    const { engine, deps } = makeEngine();
    deps.setNow(Q1_2027 + 1000);
    recordEvent(engine, { grossAmountUsd: 500 });
    expect(engine.getEventsForQuarter('2027-Q1')).toHaveLength(1);
  });

  it('preserves platform on the returned event', () => {
    const { engine, deps } = makeEngine();
    deps.setNow(Q1_2027 + 1000);
    const event = recordEvent(engine, { grossAmountUsd: 500, platform: 'epic' });
    expect(event.platform).toBe('epic');
  });

  it('multiple events accumulate', () => {
    const { engine, deps } = makeEngine();
    deps.setNow(Q1_2027 + 1000);
    recordEvent(engine, { grossAmountUsd: 100 });
    recordEvent(engine, { grossAmountUsd: 200 });
    recordEvent(engine, { grossAmountUsd: 300 });
    expect(engine.getEventsForQuarter('2027-Q1')).toHaveLength(3);
  });
});

// ─── getEventsForQuarter ──────────────────────────────────────────

describe('getEventsForQuarter', () => {
  it('returns empty array for unknown quarter', () => {
    const { engine } = makeEngine();
    expect(engine.getEventsForQuarter('2030-Q1')).toHaveLength(0);
  });

  it('only returns events in the specified quarter', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 1000);
    recordInQuarter(engine, deps, Q2_2027, 2000);
    expect(engine.getEventsForQuarter('2027-Q1')).toHaveLength(1);
    expect(engine.getEventsForQuarter('2027-Q2')).toHaveLength(1);
  });

  it('separates Q1 (Jan–Mar) from Q2 (Apr–Jun)', () => {
    const { engine, deps } = makeEngine();
    // Jan — Q1
    deps.setNow(Date.UTC(2027, 0, 31));
    recordEvent(engine, { grossAmountUsd: 100 });
    // Apr — Q2
    deps.setNow(Date.UTC(2027, 3, 1));
    recordEvent(engine, { grossAmountUsd: 200 });
    expect(engine.getEventsForQuarter('2027-Q1')[0]?.grossAmountUsd).toBe(100);
    expect(engine.getEventsForQuarter('2027-Q2')[0]?.grossAmountUsd).toBe(200);
  });
});

// ─── getTotalLifetimeGross ────────────────────────────────────────

describe('getTotalLifetimeGross', () => {
  it('returns 0 with no events', () => {
    const { engine } = makeEngine();
    expect(engine.getTotalLifetimeGross()).toBe(0);
  });

  it('sums all events across all quarters', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 300_000);
    recordInQuarter(engine, deps, Q2_2027, 400_000);
    expect(engine.getTotalLifetimeGross()).toBe(700_000);
  });

  it('includes Epic Store events in total', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 200_000, 'epic');
    recordInQuarter(engine, deps, Q1_2027, 100_000, 'ios');
    expect(engine.getTotalLifetimeGross()).toBe(300_000);
  });
});

// ─── computeQuarterlyLedger — under threshold ─────────────────────

describe('computeQuarterlyLedger — under $1M threshold', () => {
  it('owes zero royalty when under $1M lifetime eligible', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 500_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q1');
    expect(ledger.royaltyOwed).toBe(0);
  });

  it('thresholdNote indicates under $1M', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 500_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q1');
    expect(ledger.thresholdNote).toContain('$1M');
  });

  it('paymentStatus is not_due when no royalty owed', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 200_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q1');
    expect(ledger.paymentStatus).toBe('not_due');
  });

  it('totalGrossRevenue matches sum of quarter events', () => {
    const { engine, deps } = makeEngine();
    deps.setNow(Q1_2027 + 1000);
    recordEvent(engine, { grossAmountUsd: 100_000 });
    recordEvent(engine, { grossAmountUsd: 50_000 });
    const ledger = engine.computeQuarterlyLedger('2027-Q1');
    expect(ledger.totalGrossRevenue).toBe(150_000);
  });
});

// ─── computeQuarterlyLedger — crossing $1M ────────────────────────

describe('computeQuarterlyLedger — crossing $1M threshold', () => {
  it('charges royalty only on revenue above $1M cumulative eligible', () => {
    const { engine, deps } = makeEngine();
    // Q1: $900K non-Epic (cumulative: $900K — still under)
    recordInQuarter(engine, deps, Q1_2027, 900_000);
    // Q2: $200K non-Epic (cumulative crosses $1M by $100K)
    recordInQuarter(engine, deps, Q2_2027, 200_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q2');
    // $100K taxable at 5% = $5,000
    expect(ledger.royaltyOwed).toBeCloseTo(5_000, 1);
  });

  it('charges royalty at standard 5% when no Epic revenue that quarter', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 1_000_000);
    recordInQuarter(engine, deps, Q2_2027, 200_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q2');
    expect(ledger.royaltyRate).toBe(STANDARD_ROYALTY_RATE);
  });

  it('paymentStatus is pending when royalty is owed', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 1_000_000);
    recordInQuarter(engine, deps, Q2_2027, 100_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q2');
    expect(ledger.paymentStatus).toBe('pending');
  });

  it('entire quarter eligible when cumulative was already above $1M', () => {
    const { engine, deps } = makeEngine();
    // Q1: $1.2M (cumulative eligible passes $1M)
    recordInQuarter(engine, deps, Q1_2027, 1_200_000);
    // Q2: $300K — all taxable
    recordInQuarter(engine, deps, Q2_2027, 300_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q2');
    // Full $300K taxable at 5%
    expect(ledger.royaltyOwed).toBeCloseTo(15_000, 1);
  });
});

// ─── computeQuarterlyLedger — Epic Store rate ─────────────────────

describe('computeQuarterlyLedger — Epic Store rate', () => {
  it('uses 3.5% rate when Epic Store revenue exists in that quarter', () => {
    const { engine, deps } = makeEngine();
    // Surpass $1M via Q1 non-Epic
    recordInQuarter(engine, deps, Q1_2027, 1_100_000);
    // Q2: $200K non-Epic + Epic Store revenue
    deps.setNow(Q2_2027 + 1000);
    recordEvent(engine, { grossAmountUsd: 200_000, platform: 'ios' });
    recordEvent(engine, { grossAmountUsd: 50_000, platform: 'epic' });
    const ledger = engine.computeQuarterlyLedger('2027-Q2');
    expect(ledger.royaltyRate).toBe(EPIC_STORE_ROYALTY_RATE);
  });

  it('excludes Epic Store revenue from royaltyEligibleRevenue', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 1_100_000);
    deps.setNow(Q2_2027 + 1000);
    recordEvent(engine, { grossAmountUsd: 100_000, platform: 'ios' });
    recordEvent(engine, { grossAmountUsd: 80_000, platform: 'epic' });
    const ledger = engine.computeQuarterlyLedger('2027-Q2');
    expect(ledger.epicStoreRevenue).toBe(80_000);
    expect(ledger.royaltyEligibleRevenue).toBe(100_000);
  });

  it('Epic Store revenue is included in totalGrossRevenue', () => {
    const { engine, deps } = makeEngine();
    deps.setNow(Q1_2027 + 1000);
    recordEvent(engine, { grossAmountUsd: 60_000, platform: 'ios' });
    recordEvent(engine, { grossAmountUsd: 40_000, platform: 'epic' });
    const ledger = engine.computeQuarterlyLedger('2027-Q1');
    expect(ledger.totalGrossRevenue).toBe(100_000);
  });
});

// ─── computeQuarterlyLedger — multi-quarter cumulative ────────────

describe('computeQuarterlyLedger — multi-quarter cumulative', () => {
  it('cumulativeLifetimeGross includes all prior quarters', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 300_000);
    recordInQuarter(engine, deps, Q2_2027, 400_000);
    recordInQuarter(engine, deps, Q3_2027, 200_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q3');
    expect(ledger.cumulativeLifetimeGross).toBe(900_000);
  });

  it('produces consistent results when called multiple times for same quarter', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 1_200_000);
    recordInQuarter(engine, deps, Q2_2027, 100_000);
    const first = engine.computeQuarterlyLedger('2027-Q2');
    const second = engine.computeQuarterlyLedger('2027-Q2');
    expect(first.royaltyOwed).toBe(second.royaltyOwed);
  });

  it('empty quarter produces zero royaltyOwed', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 1_200_000);
    const ledger = engine.computeQuarterlyLedger('2027-Q3'); // no events
    expect(ledger.royaltyOwed).toBe(0);
    expect(ledger.totalGrossRevenue).toBe(0);
  });
});

// ─── getStats ─────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zero', () => {
    const { engine } = makeEngine();
    const stats = engine.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.lifetimeGrossUsd).toBe(0);
    expect(stats.lifetimeRoyaltyEligibleUsd).toBe(0);
  });

  it('counts all recorded events', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 100);
    recordInQuarter(engine, deps, Q2_2027, 200);
    expect(engine.getStats().totalEvents).toBe(2);
  });

  it('lifetimeGrossUsd includes Epic events', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 300_000, 'epic');
    recordInQuarter(engine, deps, Q1_2027, 200_000, 'ios');
    expect(engine.getStats().lifetimeGrossUsd).toBe(500_000);
  });

  it('lifetimeRoyaltyEligibleUsd excludes Epic events', () => {
    const { engine, deps } = makeEngine();
    recordInQuarter(engine, deps, Q1_2027, 300_000, 'epic');
    recordInQuarter(engine, deps, Q1_2027, 200_000, 'ios');
    expect(engine.getStats().lifetimeRoyaltyEligibleUsd).toBe(200_000);
  });
});
