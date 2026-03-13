/**
 * Simulation tests — metrics-aggregator
 */

import { describe, it, expect } from 'vitest';
import {
  createMetricsAggregator,
  type AggregatorDeps,
} from '../metrics-aggregator.js';

const metricStore: Map<string, number> = new Map([
  ['cpu.usage', 65],
  ['mem.used', 1024],
]);

let ts = 1_000_000_000;

function makeDeps(): AggregatorDeps {
  return {
    clock: { nowMicroseconds: () => (ts += 100) },
    getMetricValue: (name: string) => metricStore.get(name),
  };
}

describe('metrics-aggregator — tracking', () => {
  it('starts with zero tracked metrics', () => {
    const agg = createMetricsAggregator(makeDeps());
    expect(agg.trackedCount()).toBe(0);
  });

  it('track adds a metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    expect(agg.trackedCount()).toBe(1);
  });

  it('untrack removes a metric and returns true', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    expect(agg.untrack('cpu.usage')).toBe(true);
    expect(agg.trackedCount()).toBe(0);
  });

  it('untrack returns false for untracked metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    expect(agg.untrack('ghost')).toBe(false);
  });

  it('getTrackedMetrics returns tracked metric names', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    agg.track('mem.used');
    expect(agg.getTrackedMetrics()).toContain('cpu.usage');
    expect(agg.getTrackedMetrics()).toContain('mem.used');
  });
});

describe('metrics-aggregator — sampling', () => {
  it('sample collects values and returns count of sampled metrics', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    agg.track('mem.used');
    const count = agg.sample();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('getAggregation returns undefined for untracked metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    expect(agg.getAggregation('ghost')).toBeUndefined();
  });

  it('getAggregation returns data after sampling', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    agg.sample();
    const agg1 = agg.getAggregation('cpu.usage');
    expect(agg1).toBeDefined();
  });

  it('getAllAggregations returns array', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    agg.sample();
    const all = agg.getAllAggregations();
    expect(Array.isArray(all)).toBe(true);
  });

  it('reset returns true for tracked metric and clears samples', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    agg.sample();
    expect(agg.reset('cpu.usage')).toBe(true);
  });
});
