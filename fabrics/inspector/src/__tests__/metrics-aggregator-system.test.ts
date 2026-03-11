import { describe, it, expect } from 'vitest';
import { createMetricsAggregatorSystem } from '../metrics-aggregator-system.js';
import type {
  MetricsAggregatorSystem,
  MetricRegistry,
  MetricAggregation,
  MetricSampleRecord,
} from '../metrics-aggregator-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): {
  system: MetricsAggregatorSystem;
  advanceTime: (us: bigint) => void;
} {
  let now = 1_000_000n;
  return {
    system: createMetricsAggregatorSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'sample-' + String(++idCounter) },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
    }),
    advanceTime(us: bigint) {
      now += us;
    },
  };
}

function asRegistry(r: MetricRegistry | string): MetricRegistry {
  if (typeof r === 'string') throw new Error('Expected MetricRegistry, got: ' + r);
  return r;
}

function asAggregation(r: MetricAggregation | string): MetricAggregation {
  if (typeof r === 'string') throw new Error('Expected MetricAggregation, got: ' + r);
  return r;
}

function asSample(r: MetricSampleRecord | string): MetricSampleRecord {
  if (typeof r === 'string') throw new Error('Expected MetricSampleRecord, got: ' + r);
  return r;
}

// ─── registerMetric ───────────────────────────────────────────────────────────

describe('registerMetric', () => {
  it('registers a new metric with correct fields', () => {
    const { system } = createTestSystem();
    const reg = asRegistry(system.registerMetric('cpu.usage', 'CPU usage %', 'percent'));
    expect(reg.metricName).toBe('cpu.usage');
    expect(reg.unit).toBe('percent');
    expect(reg.description).toBe('CPU usage %');
  });

  it('is idempotent — returns original on duplicate registration', () => {
    const { system } = createTestSystem();
    const r1 = asRegistry(system.registerMetric('cpu', 'original', 'percent'));
    const r2 = asRegistry(system.registerMetric('cpu', 'different', 'percent'));
    expect(r2.registeredAt).toBe(r1.registeredAt);
    expect(r2.description).toBe('original');
  });

  it('records registeredAt timestamp', () => {
    const { system } = createTestSystem();
    const reg = asRegistry(system.registerMetric('m', 'd', 'u'));
    expect(reg.registeredAt).toBe(1_000_000n);
  });
});

// ─── recordSample ─────────────────────────────────────────────────────────────

describe('recordSample', () => {
  it('records a valid sample', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    const sample = asSample(system.recordSample('cpu', 42.5));
    expect(sample.value).toBe(42.5);
    expect(sample.metricName).toBe('cpu');
  });

  it('returns metric-not-found for unregistered metric', () => {
    const { system } = createTestSystem();
    expect(system.recordSample('unknown', 1)).toBe('metric-not-found');
  });

  it('returns invalid-value for NaN', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    expect(system.recordSample('cpu', NaN)).toBe('invalid-value');
  });

  it('returns invalid-value for Infinity', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    expect(system.recordSample('cpu', Infinity)).toBe('invalid-value');
    expect(system.recordSample('cpu', -Infinity)).toBe('invalid-value');
  });

  it('stores tags on the sample', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    const sample = asSample(system.recordSample('cpu', 10, { host: 'node-1' }));
    expect(sample.tags).toEqual({ host: 'node-1' });
  });
});

// ─── aggregate — empty window ─────────────────────────────────────────────────

describe('aggregate — no data', () => {
  it('returns metric-not-found for unregistered metric', () => {
    const { system } = createTestSystem();
    expect(system.aggregate('unknown', '1MIN')).toBe('metric-not-found');
  });

  it('returns zero aggregation when no samples in window', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    const agg = asAggregation(system.aggregate('cpu', '1MIN'));
    expect(agg.count).toBe(0);
    expect(agg.sum).toBe(0);
    expect(agg.min).toBe(0);
    expect(agg.avg).toBe(0);
    expect(agg.p50).toBe(0);
    expect(agg.p95).toBe(0);
  });
});

// ─── aggregate — statistics ───────────────────────────────────────────────────

describe('aggregate — statistics', () => {
  it('computes correct min, max, avg, sum', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    system.recordSample('cpu', 10);
    system.recordSample('cpu', 20);
    system.recordSample('cpu', 30);
    const agg = asAggregation(system.aggregate('cpu', '1MIN'));
    expect(agg.count).toBe(3);
    expect(agg.min).toBe(10);
    expect(agg.max).toBe(30);
    expect(agg.avg).toBeCloseTo(20);
    expect(agg.sum).toBe(60);
  });

  it('computes p50 correctly for 10 values', () => {
    const { system } = createTestSystem();
    system.registerMetric('m', 'd', 'u');
    for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      system.recordSample('m', v);
    }
    const agg = asAggregation(system.aggregate('m', '1MIN'));
    // p50 = values[floor(10 * 0.5)] = values[5] of sorted [1..10] = 6
    expect(agg.p50).toBe(6);
  });

  it('computes p95 correctly for 20 values', () => {
    const { system } = createTestSystem();
    system.registerMetric('m', 'd', 'u');
    for (let v = 1; v <= 20; v++) system.recordSample('m', v);
    const agg = asAggregation(system.aggregate('m', '1MIN'));
    // p95 = values[floor(20 * 0.95)] = values[19] = 20
    expect(agg.p95).toBe(20);
  });

  it('excludes samples outside the window', () => {
    const { system, advanceTime } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    system.recordSample('cpu', 100); // old
    advanceTime(120_000_000n); // 2 min past 1MIN window
    system.recordSample('cpu', 50); // in window
    const agg = asAggregation(system.aggregate('cpu', '1MIN'));
    expect(agg.count).toBe(1);
    expect(agg.avg).toBe(50);
  });
});

// ─── aggregate — window metadata ─────────────────────────────────────────────

describe('aggregate — window sizes', () => {
  it('sets windowEndAt - windowStartAt = 1MIN size', () => {
    const { system } = createTestSystem();
    system.registerMetric('m', 'd', 'u');
    const agg = asAggregation(system.aggregate('m', '1MIN'));
    expect(agg.windowEndAt - agg.windowStartAt).toBe(60_000_000n);
  });

  it('sets windowEndAt - windowStartAt = 5MIN size', () => {
    const { system } = createTestSystem();
    system.registerMetric('m', 'd', 'u');
    const agg = asAggregation(system.aggregate('m', '5MIN'));
    expect(agg.windowEndAt - agg.windowStartAt).toBe(300_000_000n);
  });

  it('sets windowEndAt - windowStartAt = 1HOUR size', () => {
    const { system } = createTestSystem();
    system.registerMetric('m', 'd', 'u');
    const agg = asAggregation(system.aggregate('m', '1HOUR'));
    expect(agg.windowEndAt - agg.windowStartAt).toBe(3_600_000_000n);
  });
});

// ─── getRecentSamples ────────────────────────────────────────────────────────

describe('getRecentSamples', () => {
  it('returns the most recent samples up to limit', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    for (let i = 1; i <= 10; i++) system.recordSample('cpu', i);
    const recent = system.getRecentSamples('cpu', 3);
    expect(recent.length).toBe(3);
    expect(recent[2]?.value).toBe(10);
  });

  it('returns empty array for unregistered metric', () => {
    const { system } = createTestSystem();
    expect(system.getRecentSamples('nope', 10)).toEqual([]);
  });
});

// ─── listMetrics ─────────────────────────────────────────────────────────────

describe('listMetrics', () => {
  it('returns all registered metrics', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    system.registerMetric('memory', 'd', 'MB');
    expect(system.listMetrics().length).toBe(2);
  });

  it('returns empty list when no metrics registered', () => {
    const { system } = createTestSystem();
    expect(system.listMetrics()).toEqual([]);
  });
});

// ─── purgeSamples ────────────────────────────────────────────────────────────

describe('purgeSamples', () => {
  it('purges samples older than cutoff', () => {
    const { system, advanceTime } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    system.recordSample('cpu', 1); // at 1_000_000n
    advanceTime(5_000_000n);
    system.recordSample('cpu', 2); // at 6_000_000n
    const result = system.purgeSamples('cpu', 3_000_000n) as { success: true; purged: number };
    expect(result.success).toBe(true);
    expect(result.purged).toBe(1);
    expect(system.getRecentSamples('cpu', 10).length).toBe(1);
  });

  it('returns metric-not-found for unknown metric', () => {
    const { system } = createTestSystem();
    expect(system.purgeSamples('nope', 1_000n)).toEqual({
      success: false,
      error: 'metric-not-found',
    });
  });

  it('returns purged=0 when nothing to purge', () => {
    const { system } = createTestSystem();
    system.registerMetric('cpu', 'd', 'u');
    system.recordSample('cpu', 10);
    const result = system.purgeSamples('cpu', 0n) as { success: true; purged: number };
    expect(result.purged).toBe(0);
  });
});
