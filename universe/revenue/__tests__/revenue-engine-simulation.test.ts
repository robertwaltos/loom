/**
 * Revenue Engine — Simulation Tests
 *
 * Validates UE5 royalty calculation, event recording, quarterly ledger
 * computation, platform exclusions, and lifetime threshold logic.
 *
 * Thread: silk/universe/revenue-engine-sim
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createRevenueEngine,
  LIFETIME_ROYALTY_FREE_THRESHOLD,
  STANDARD_ROYALTY_RATE,
  EPIC_STORE_ROYALTY_RATE,
  QUARTERLY_REPORTING_THRESHOLD,
} from '../engine.js';
import type { RevenueEngineDeps, RevenueEngineConfig } from '../engine.js';
import type { RevenuePlatform, RevenueEventType, PaymentProcessor } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────

let idCounter = 0;

function makeEngine(
  clockMs: () => number = () => Date.UTC(2027, 0, 15), // 2027-Q1
  config?: RevenueEngineConfig,
) {
  idCounter = 0;
  const deps: RevenueEngineDeps = {
    generateId: () => `ev-${++idCounter}`,
    now: clockMs,
  };
  return createRevenueEngine(deps, config);
}

/** Build a minimal RevenueEvent payload (without id / createdAt). */
function makeEventInput(overrides?: {
  grossAmountUsd?: number;
  platform?: RevenuePlatform;
  eventType?: RevenueEventType;
  processor?: PaymentProcessor;
}) {
  return {
    eventType: (overrides?.eventType ?? 'subscription') as RevenueEventType,
    grossAmountUsd: overrides?.grossAmountUsd ?? 9.99,
    netAmountUsd: (overrides?.grossAmountUsd ?? 9.99) * 0.7,
    platform: (overrides?.platform ?? 'ios') as RevenuePlatform,
    paymentProcessor: (overrides?.processor ?? 'apple') as PaymentProcessor,
    userId: 'user-1',
    transactionId: 'txn-1',
  };
}

/** Quarter string for the given Date-UTC month. */
function q(year: number, quarter: 1 | 2 | 3 | 4) {
  return `${year}-Q${quarter}`;
}

// ─── Event Recording ──────────────────────────────────────────────

describe('recordEvent', () => {
  it('assigns an id and createdAt', () => {
    const engine = makeEngine();
    const event = engine.recordEvent(makeEventInput());
    expect(event.id).toBeTruthy();
    expect(event.createdAt).toBeGreaterThan(0);
  });

  it('stores the gross amount unchanged', () => {
    const engine = makeEngine();
    const event = engine.recordEvent(makeEventInput({ grossAmountUsd: 4.99 }));
    expect(event.grossAmountUsd).toBeCloseTo(4.99);
  });

  it('increments totalEvents stat', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput());
    engine.recordEvent(makeEventInput());
    expect(engine.getStats().totalEvents).toBe(2);
  });

  it('updates lifetimeGrossUsd stat', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput({ grossAmountUsd: 100 }));
    engine.recordEvent(makeEventInput({ grossAmountUsd: 200 }));
    expect(engine.getStats().lifetimeGrossUsd).toBeCloseTo(300);
  });

  it('excludes epic platform from lifetimeRoyaltyEligibleUsd', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput({ grossAmountUsd: 200, platform: 'ios' }));
    engine.recordEvent(makeEventInput({ grossAmountUsd: 100, platform: 'epic' }));
    const stats = engine.getStats();
    expect(stats.lifetimeGrossUsd).toBeCloseTo(300);
    expect(stats.lifetimeRoyaltyEligibleUsd).toBeCloseTo(200);
  });
});

// ─── Quarter Filter ────────────────────────────────────────────────

describe('getEventsForQuarter', () => {
  it('returns only events whose createdAt falls in the specified quarter', () => {
    let clock = Date.UTC(2027, 0, 15); // Jan 2027 → Q1
    const engine = makeEngine(() => clock);
    engine.recordEvent(makeEventInput()); // Q1
    clock = Date.UTC(2027, 3, 20); // Apr 2027 → Q2
    engine.recordEvent(makeEventInput());
    const q1Events = engine.getEventsForQuarter(q(2027, 1));
    expect(q1Events.length).toBe(1);
    expect(q1Events[0]!.createdAt).toBe(Date.UTC(2027, 0, 15));
  });
});

// ─── Royalty-Free Threshold ───────────────────────────────────────

describe('computeQuarterlyLedger — under lifetime threshold', () => {
  it('owes zero royalty when well under $1M lifetime', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput({ grossAmountUsd: 50_000 }));
    const ledger = engine.computeQuarterlyLedger(q(2027, 1));
    expect(ledger.royaltyOwed).toBe(0);
    expect(ledger.paymentStatus).toBe('not_due');
  });

  it('thresholdNote mentions under $1M when below threshold', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput({ grossAmountUsd: 100 }));
    const ledger = engine.computeQuarterlyLedger(q(2027, 1));
    expect(ledger.thresholdNote.toLowerCase()).toContain('1m');
  });

  it('correctly accumulates prior-quarter revenue toward lifetime threshold', () => {
    // Prior quarter: $900k. This quarter: $200k → $100k royalty-eligible after threshold.
    let clock = Date.UTC(2026, 0, 15); // Q1 2026
    const engine = makeEngine(() => clock);
    engine.recordEvent(makeEventInput({ grossAmountUsd: 900_000 }));
    clock = Date.UTC(2026, 3, 20); // Q2 2026
    engine.recordEvent(makeEventInput({ grossAmountUsd: 200_000 }));
    const ledger = engine.computeQuarterlyLedger(q(2026, 2));
    // taxable = 200k - 100k remaining threshold = 100k
    // royaltyOwed = 100k * 0.05 = 5000
    expect(ledger.royaltyOwed).toBeCloseTo(5_000, 1);
    expect(ledger.paymentStatus).toBe('pending');
  });
});

// ─── Standard Rate ────────────────────────────────────────────────

describe('computeQuarterlyLedger — standard rate (5%)', () => {
  it('applies 5% rate when no epic store revenue in quarter', () => {
    // Pre-fill past lifetime threshold with prior quarter events
    let clock = Date.UTC(2026, 0, 1); // Q1 2026
    const engine = makeEngine(() => clock, {
      lifetimeThreshold: 100_000,
      reportingThreshold: 1,
    });
    engine.recordEvent(makeEventInput({ grossAmountUsd: 100_000 })); // Q1 — fills threshold
    clock = Date.UTC(2026, 3, 1); // Q2 2026
    engine.recordEvent(makeEventInput({ grossAmountUsd: 50_000, platform: 'ios' }));
    const ledger = engine.computeQuarterlyLedger(q(2026, 2));
    expect(ledger.royaltyRate).toBe(STANDARD_ROYALTY_RATE);
    expect(ledger.royaltyOwed).toBeCloseTo(50_000 * STANDARD_ROYALTY_RATE, 1);
  });
});

// ─── Reduced Epic Rate ────────────────────────────────────────────

describe('computeQuarterlyLedger — epic reduced rate (3.5%)', () => {
  it('applies 3.5% rate when epic store revenue exists in quarter', () => {
    let clock = Date.UTC(2026, 0, 1);
    const engine = makeEngine(() => clock, {
      lifetimeThreshold: 100_000,
      reportingThreshold: 1,
    });
    engine.recordEvent(makeEventInput({ grossAmountUsd: 100_000 })); // fill threshold Q1
    clock = Date.UTC(2026, 3, 1);
    engine.recordEvent(makeEventInput({ grossAmountUsd: 50_000, platform: 'ios' }));
    engine.recordEvent(makeEventInput({ grossAmountUsd: 10_000, platform: 'epic' }));
    const ledger = engine.computeQuarterlyLedger(q(2026, 2));
    expect(ledger.royaltyRate).toBe(EPIC_STORE_ROYALTY_RATE);
    expect(ledger.epicStoreRevenue).toBeCloseTo(10_000);
  });

  it('epic revenue is excluded from royalty-eligible revenue', () => {
    let clock = Date.UTC(2026, 0, 1);
    const engine = makeEngine(() => clock, {
      lifetimeThreshold: 50_000,
      reportingThreshold: 1,
    });
    engine.recordEvent(makeEventInput({ grossAmountUsd: 50_000 })); // fill threshold
    clock = Date.UTC(2026, 3, 1);
    engine.recordEvent(makeEventInput({ grossAmountUsd: 20_000, platform: 'epic' }));
    const ledger = engine.computeQuarterlyLedger(q(2026, 2));
    // All revenue is epic — no royalty-eligible revenue this quarter
    expect(ledger.royaltyEligibleRevenue).toBe(0);
    expect(ledger.royaltyOwed).toBe(0);
  });
});

// ─── Quarterly Reporting Threshold ────────────────────────────────

describe('computeQuarterlyLedger — reporting threshold', () => {
  it('notes reporting not required when eligible revenue < $10k', () => {
    let clock = Date.UTC(2026, 0, 1);
    const engine = makeEngine(() => clock, { lifetimeThreshold: 0, reportingThreshold: QUARTERLY_REPORTING_THRESHOLD });
    clock = Date.UTC(2026, 3, 1);
    engine.recordEvent(makeEventInput({ grossAmountUsd: 5_000 }));
    const ledger = engine.computeQuarterlyLedger(q(2026, 2));
    expect(ledger.thresholdNote.toLowerCase()).toContain('not required');
  });

  it('notes report due when revenue exceeds $10k after threshold crossed', () => {
    let clock = Date.UTC(2026, 0, 1);
    const engine = makeEngine(() => clock, {
      lifetimeThreshold: 0,
      reportingThreshold: QUARTERLY_REPORTING_THRESHOLD,
    });
    clock = Date.UTC(2026, 3, 1);
    engine.recordEvent(makeEventInput({ grossAmountUsd: 50_000 }));
    const ledger = engine.computeQuarterlyLedger(q(2026, 2));
    expect(ledger.thresholdNote.toLowerCase()).toContain('due');
  });
});

// ─── Ledger Metadata ──────────────────────────────────────────────

describe('computeQuarterlyLedger — metadata', () => {
  it('reports correct quarter string', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput());
    const ledger = engine.computeQuarterlyLedger(q(2027, 1));
    expect(ledger.quarter).toBe('2027-Q1');
  });

  it('paymentStatus is not_due when royaltyOwed is 0', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput({ grossAmountUsd: 100 }));
    const ledger = engine.computeQuarterlyLedger(q(2027, 1));
    expect(ledger.paymentStatus).toBe('not_due');
  });

  it('reportSubmitted defaults to false', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput());
    const ledger = engine.computeQuarterlyLedger(q(2027, 1));
    expect(ledger.reportSubmitted).toBe(false);
    expect(ledger.reportSubmittedAt).toBeNull();
  });
});

// ─── Stats ────────────────────────────────────────────────────────

describe('getStats / getTotalLifetimeGross', () => {
  it('totalEvents is zero on a fresh engine', () => {
    const engine = makeEngine();
    expect(engine.getStats().totalEvents).toBe(0);
  });

  it('getTotalLifetimeGross aggregates all platform revenue', () => {
    const engine = makeEngine();
    engine.recordEvent(makeEventInput({ grossAmountUsd: 1_000, platform: 'ios' }));
    engine.recordEvent(makeEventInput({ grossAmountUsd: 500, platform: 'epic' }));
    expect(engine.getTotalLifetimeGross()).toBeCloseTo(1_500);
  });
});
