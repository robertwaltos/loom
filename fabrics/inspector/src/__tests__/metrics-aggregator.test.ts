import { describe, it, expect } from 'vitest';
import { createMetricsAggregator } from '../metrics-aggregator.js';
import type { AggregatorDeps } from '../metrics-aggregator.js';

function makeDeps(
  overrides?: Partial<AggregatorDeps>,
): AggregatorDeps {
  let time = 1_000_000;
  const values = new Map<string, number>();

  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    getMetricValue: (name) => values.get(name),
    config: { windowSizeUs: 60_000_000, maxSamples: 10, trendThreshold: 0.01 },
    ...overrides,
    _values: values,
  } as AggregatorDeps & { _values: Map<string, number> };
}

function getValues(deps: AggregatorDeps): Map<string, number> {
  return (deps as AggregatorDeps & { _values: Map<string, number> })._values;
}

describe('MetricsAggregator — track management', () => {
  it('tracks a metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    expect(agg.trackedCount()).toBe(1);
    expect(agg.getTrackedMetrics()).toContain('cpu.usage');
  });

  it('untracks a metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    expect(agg.untrack('cpu.usage')).toBe(true);
    expect(agg.trackedCount()).toBe(0);
  });

  it('returns false when untracking unknown metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    expect(agg.untrack('unknown')).toBe(false);
  });

  it('does not duplicate tracks', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('cpu.usage');
    agg.track('cpu.usage');
    expect(agg.trackedCount()).toBe(1);
  });
});

describe('MetricsAggregator — sampling', () => {
  it('samples tracked metrics', () => {
    const deps = makeDeps();
    getValues(deps).set('cpu.usage', 42);
    const agg = createMetricsAggregator(deps);
    agg.track('cpu.usage');

    const sampled = agg.sample();
    expect(sampled).toBe(1);
  });

  it('skips metrics with no value', () => {
    const deps = makeDeps();
    const agg = createMetricsAggregator(deps);
    agg.track('missing.metric');

    const sampled = agg.sample();
    expect(sampled).toBe(0);
  });

  it('collects multiple samples', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('cpu.usage');

    vals.set('cpu.usage', 10);
    agg.sample();
    vals.set('cpu.usage', 20);
    agg.sample();

    const result = agg.getAggregation('cpu.usage');
    expect(result?.sampleCount).toBe(2);
  });
});

describe('MetricsAggregator — aggregation stats', () => {
  it('computes mean across samples', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('latency');

    vals.set('latency', 10);
    agg.sample();
    vals.set('latency', 30);
    agg.sample();

    const result = agg.getAggregation('latency');
    expect(result?.mean).toBe(20);
  });

  it('tracks min and max', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('queue.depth');

    vals.set('queue.depth', 5);
    agg.sample();
    vals.set('queue.depth', 50);
    agg.sample();
    vals.set('queue.depth', 25);
    agg.sample();

    const result = agg.getAggregation('queue.depth');
    expect(result?.min).toBe(5);
    expect(result?.max).toBe(50);
  });

  it('returns current value from latest sample', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('temp');

    vals.set('temp', 100);
    agg.sample();
    vals.set('temp', 200);
    agg.sample();

    const result = agg.getAggregation('temp');
    expect(result?.currentValue).toBe(200);
  });

  it('returns empty aggregation for unsampled metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    agg.track('empty');

    const result = agg.getAggregation('empty');
    expect(result?.sampleCount).toBe(0);
    expect(result?.mean).toBe(0);
    expect(result?.trend).toBe('stable');
  });
});

describe('MetricsAggregator — trend detection', () => {
  it('detects rising trend', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('counter');

    vals.set('counter', 100);
    agg.sample();
    vals.set('counter', 200);
    agg.sample();

    const result = agg.getAggregation('counter');
    expect(result?.trend).toBe('rising');
  });

  it('detects falling trend', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('health');

    vals.set('health', 100);
    agg.sample();
    vals.set('health', 50);
    agg.sample();

    const result = agg.getAggregation('health');
    expect(result?.trend).toBe('falling');
  });

  it('reports stable when delta within threshold', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('steady');

    vals.set('steady', 1000);
    agg.sample();
    vals.set('steady', 1000.005);
    agg.sample();

    const result = agg.getAggregation('steady');
    expect(result?.trend).toBe('stable');
  });
});

describe('MetricsAggregator — rate calculation', () => {
  it('computes rate per second', () => {
    let time = 0;
    const deps: AggregatorDeps = {
      clock: { nowMicroseconds: () => { time += 1_000_000; return time; } },
      getMetricValue: (name) => {
        if (name === 'requests') return time / 1_000_000 * 10;
        return undefined;
      },
      config: { windowSizeUs: 60_000_000, maxSamples: 10, trendThreshold: 0.01 },
    };

    const agg = createMetricsAggregator(deps);
    agg.track('requests');

    agg.sample();
    agg.sample();
    agg.sample();

    const result = agg.getAggregation('requests');
    expect(result?.ratePerSecond).toBeCloseTo(10, 1);
  });

  it('returns null rate with single sample', () => {
    const deps = makeDeps();
    getValues(deps).set('single', 42);
    const agg = createMetricsAggregator(deps);
    agg.track('single');
    agg.sample();

    const result = agg.getAggregation('single');
    expect(result?.ratePerSecond).toBeNull();
  });
});

describe('MetricsAggregator — window and eviction', () => {
  it('evicts samples beyond maxSamples', () => {
    const deps = makeDeps({
      config: { windowSizeUs: 60_000_000, maxSamples: 3, trendThreshold: 0.01 },
    });
    const vals = getValues(deps);
    const agg = createMetricsAggregator(deps);
    agg.track('evict');

    for (let i = 1; i <= 5; i++) {
      vals.set('evict', i * 10);
      agg.sample();
    }

    const result = agg.getAggregation('evict');
    expect(result?.sampleCount).toBe(3);
    expect(result?.min).toBe(30);
  });

  it('reset clears samples for a metric', () => {
    const deps = makeDeps();
    getValues(deps).set('resettable', 99);
    const agg = createMetricsAggregator(deps);
    agg.track('resettable');
    agg.sample();

    expect(agg.reset('resettable')).toBe(true);
    const result = agg.getAggregation('resettable');
    expect(result?.sampleCount).toBe(0);
  });

  it('reset returns false for unknown metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    expect(agg.reset('unknown')).toBe(false);
  });
});

describe('MetricsAggregator — bulk queries', () => {
  it('returns all aggregations', () => {
    const deps = makeDeps();
    const vals = getValues(deps);
    vals.set('a', 1);
    vals.set('b', 2);

    const agg = createMetricsAggregator(deps);
    agg.track('a');
    agg.track('b');
    agg.sample();

    const all = agg.getAllAggregations();
    expect(all).toHaveLength(2);
  });

  it('returns undefined for untracked metric', () => {
    const agg = createMetricsAggregator(makeDeps());
    expect(agg.getAggregation('unknown')).toBeUndefined();
  });
});
