import { describe, it, expect } from 'vitest';
import {
  createQuarterlyTitheEngine,
  TITHE_RATES,
  TITHE_INTERVAL_DAYS,
} from '../quarterly-tithe.js';
import type { QuarterlyTitheDeps } from '../quarterly-tithe.js';
import { kalonToMicro } from '../kalon-constants.js';
import { WEALTH_ZONE_PPM } from '../wealth-zones.js';

const TOTAL_SUPPLY = kalonToMicro(1_000_000_000n);
const PROSPERITY_THRESHOLD =
  (TOTAL_SUPPLY * WEALTH_ZONE_PPM.prosperityMax) / WEALTH_ZONE_PPM.scale;

interface TestHarness {
  readonly deps: QuarterlyTitheDeps;
  readonly balances: Map<string, bigint>;
}

function createTestHarness(overrides?: Partial<QuarterlyTitheDeps>): TestHarness {
  const balances = new Map<string, bigint>();
  let idCounter = 0;

  const deps: QuarterlyTitheDeps = {
    ledger: {
      getBalance: (id) => balances.get(id) ?? 0n,
      transfer: (from, to, amount) => {
        const fromBal = balances.get(from) ?? 0n;
        balances.set(from, fromBal - amount);
        balances.set(to, (balances.get(to) ?? 0n) + amount);
      },
    },
    dynastyPort: {
      getActiveDynastyAccounts: () => [...balances.keys()].filter((k) => k !== 'commons:global'),
    },
    supplyPort: {
      getTotalSupply: () => TOTAL_SUPPLY,
    },
    clock: { nowMicroseconds: () => 1_000_000 },
    idGen: { generate: () => `cycle-${++idCounter}` },
    ...overrides,
  };

  return { deps, balances };
}

function seedBalance(harness: TestHarness, id: string, amount: bigint): void {
  harness.balances.set(id, amount);
}

// ─── Assessment ─────────────────────────────────────────────────────

describe('Quarterly tithe assessment', () => {
  it('returns zero tithe for holdings below prosperity threshold', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    const result = engine.assess('dynasty-1', PROSPERITY_THRESHOLD - 1n, TOTAL_SUPPLY);
    expect(result.titheOwed).toBe(0n);
    expect(result.titheableAmount).toBe(0n);
  });

  it('returns zero tithe for holdings at threshold', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    const result = engine.assess('dynasty-1', PROSPERITY_THRESHOLD, TOTAL_SUPPLY);
    expect(result.titheOwed).toBe(0n);
  });

  it('tithes holdings above prosperity threshold', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    const holdings = PROSPERITY_THRESHOLD + kalonToMicro(10_000n);
    const result = engine.assess('dynasty-1', holdings, TOTAL_SUPPLY);

    const expectedTitheable = kalonToMicro(10_000n);
    const expectedTithe = (expectedTitheable * TITHE_RATES.base) / TITHE_RATES.scale;

    expect(result.titheableAmount).toBe(expectedTitheable);
    expect(result.titheOwed).toBe(expectedTithe);
    expect(result.rateApplied).toBe(TITHE_RATES.base);
  });

  it('includes correct metadata in assessment', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    const holdings = PROSPERITY_THRESHOLD + kalonToMicro(5_000n);
    const result = engine.assess('dynasty-42', holdings, TOTAL_SUPPLY);

    expect(result.dynastyId).toBe('dynasty-42');
    expect(result.holdings).toBe(holdings);
    expect(result.totalSupply).toBe(TOTAL_SUPPLY);
    expect(result.prosperityThreshold).toBe(PROSPERITY_THRESHOLD);
  });

  it('handles zero total supply gracefully', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    const result = engine.assess('dynasty-1', kalonToMicro(1000n), 0n);
    expect(result.titheOwed).toBe(0n);
  });
});

// ─── Architect Rate Control ─────────────────────────────────────────

describe('Quarterly tithe Architect rate adjustment', () => {
  it('starts at base rate', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    expect(engine.getCurrentRate()).toBe(TITHE_RATES.base);
  });

  it('allows Architect to raise rate', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    engine.setArchitectRate(15n);
    expect(engine.getCurrentRate()).toBe(15n);

    const holdings = PROSPERITY_THRESHOLD + kalonToMicro(10_000n);
    const result = engine.assess('dynasty-1', holdings, TOTAL_SUPPLY);
    expect(result.rateApplied).toBe(15n);
  });

  it('clamps rate to minimum', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    engine.setArchitectRate(1n);
    expect(engine.getCurrentRate()).toBe(TITHE_RATES.minimum);
  });

  it('clamps rate to maximum', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    engine.setArchitectRate(100n);
    expect(engine.getCurrentRate()).toBe(TITHE_RATES.maximum);
  });

  it('raised rate produces higher tithe', () => {
    const { deps } = createTestHarness();
    const engine = createQuarterlyTitheEngine(deps);
    const holdings = PROSPERITY_THRESHOLD + kalonToMicro(10_000n);

    const baseTithe = engine.assess('d-1', holdings, TOTAL_SUPPLY).titheOwed;
    engine.setArchitectRate(TITHE_RATES.maximum);
    const maxTithe = engine.assess('d-1', holdings, TOTAL_SUPPLY).titheOwed;

    expect(maxTithe).toBeGreaterThan(baseTithe);
  });
});

// ─── World Collection ───────────────────────────────────────────────

describe('Quarterly tithe world collection', () => {
  it('collects tithe from wealthy dynasties on a world', () => {
    const harness = createTestHarness();
    const wealthy = PROSPERITY_THRESHOLD + kalonToMicro(50_000n);
    seedBalance(harness, 'dynasty-rich', wealthy);
    seedBalance(harness, 'dynasty-poor', kalonToMicro(100n));
    seedBalance(harness, 'commons:global', 0n);

    const engine = createQuarterlyTitheEngine(harness.deps);
    const result = engine.collectForWorld('world-1', 'commons:global');

    expect(result.dynastiesAssessed).toBe(1);
    expect(result.dynastiesExempt).toBe(1);
    expect(result.totalCollected).toBeGreaterThan(0n);
    expect(result.worldId).toBe('world-1');
    expect(result.cycleId).toBe('cycle-1');
  });

  it('transfers tithe into commons account', () => {
    const harness = createTestHarness();
    const wealthy = PROSPERITY_THRESHOLD + kalonToMicro(20_000n);
    seedBalance(harness, 'dynasty-1', wealthy);
    seedBalance(harness, 'commons:global', 0n);

    const engine = createQuarterlyTitheEngine(harness.deps);
    engine.collectForWorld('world-1', 'commons:global');

    expect(harness.balances.get('commons:global')!).toBeGreaterThan(0n);
    expect(harness.balances.get('dynasty-1')!).toBeLessThan(wealthy);
  });

  it('returns empty result when no dynasties are wealthy', () => {
    const harness = createTestHarness();
    seedBalance(harness, 'dynasty-1', kalonToMicro(100n));
    seedBalance(harness, 'dynasty-2', kalonToMicro(200n));
    seedBalance(harness, 'commons:global', 0n);

    const engine = createQuarterlyTitheEngine(harness.deps);
    const result = engine.collectForWorld('world-1', 'commons:global');

    expect(result.totalCollected).toBe(0n);
    expect(result.dynastiesAssessed).toBe(0);
    expect(result.dynastiesExempt).toBe(2);
  });

  it('handles world with no dynasties', () => {
    const { deps } = createTestHarness({
      dynastyPort: { getActiveDynastyAccounts: () => [] },
    });

    const engine = createQuarterlyTitheEngine(deps);
    const result = engine.collectForWorld('world-empty', 'commons:global');

    expect(result.totalCollected).toBe(0n);
    expect(result.dynastiesAssessed).toBe(0);
    expect(result.dynastiesExempt).toBe(0);
  });

  it('collects correct total from multiple wealthy dynasties', () => {
    const harness = createTestHarness();
    const extra = kalonToMicro(10_000n);
    seedBalance(harness, 'dynasty-a', PROSPERITY_THRESHOLD + extra);
    seedBalance(harness, 'dynasty-b', PROSPERITY_THRESHOLD + extra);
    seedBalance(harness, 'commons:global', 0n);

    const engine = createQuarterlyTitheEngine(harness.deps);
    const result = engine.collectForWorld('world-1', 'commons:global');

    const expectedPerDynasty = (extra * TITHE_RATES.base) / TITHE_RATES.scale;
    expect(result.totalCollected).toBe(expectedPerDynasty * 2n);
    expect(result.dynastiesAssessed).toBe(2);
  });
});

// ─── Constants ──────────────────────────────────────────────────────

describe('Quarterly tithe constants', () => {
  it('has 90-day interval', () => {
    expect(TITHE_INTERVAL_DAYS).toBe(90);
  });

  it('base rate is 0.5%', () => {
    expect(TITHE_RATES.base).toBe(5n);
    expect(TITHE_RATES.scale).toBe(1_000n);
  });

  it('maximum rate is 2.0%', () => {
    expect(TITHE_RATES.maximum).toBe(20n);
  });
});
