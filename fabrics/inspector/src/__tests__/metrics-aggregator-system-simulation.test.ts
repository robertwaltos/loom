/**
 * Simulation tests — metrics-aggregator-system
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createMetricsAggregatorSystem,
  type MetricsAggregatorSystemDeps,
} from '../metrics-aggregator-system.js';

let t = 1_000_000_000n;
let seq = 0;

function makeDeps(): MetricsAggregatorSystemDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    idGen: { next: () => `mas-${++seq}` },
    logger: { info: vi.fn(), warn: vi.fn() },
  };
}

describe('metrics-aggregator-system — metric registration', () => {
  it('registers a metric successfully', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    const result = sys.registerMetric('cpu.usage', 'CPU utilization', 'percent');
    expect(result).not.toBe('metric-not-found');
    expect(typeof result).toBe('object');
  });

  it('listMetrics returns empty array initially', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    expect(sys.listMetrics()).toEqual([]);
  });

  it('listMetrics returns registered metrics', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    sys.registerMetric('mem.used', 'Memory used', 'bytes');
    expect(sys.listMetrics().length).toBe(1);
  });
});

describe('metrics-aggregator-system — sample recording', () => {
  it('recordSample stores a sample for a registered metric', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    sys.registerMetric('req.latency', 'Request latency', 'ms');
    const result = sys.recordSample('req.latency', 45.5);
    expect(result).not.toBe('metric-not-found');
    expect(typeof result).toBe('object');
  });

  it('recordSample returns error for unregistered metric', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    const result = sys.recordSample('unknown', 10);
    expect(result).toBe('metric-not-found');
  });
});

describe('metrics-aggregator-system — aggregation', () => {
  it('aggregate returns aggregation after samples recorded', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    sys.registerMetric('cpu', 'CPU', 'pct');
    sys.recordSample('cpu', 30);
    sys.recordSample('cpu', 50);
    sys.recordSample('cpu', 70);
    const result = sys.aggregate('cpu', '1MIN');
    expect(result).not.toBe('metric-not-found');
    expect(typeof result).toBe('object');
  });

  it('aggregate returns error for unregistered metric', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    const result = sys.aggregate('ghost', '5MIN');
    expect(result).toBe('metric-not-found');
  });

  it('getRecentSamples returns empty array for new metric', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    sys.registerMetric('io', 'IO', 'mbps');
    expect(sys.getRecentSamples('io', 10)).toEqual([]);
  });
});

describe('metrics-aggregator-system — purge', () => {
  it('purgeSamples succeeds for registered metric', () => {
    const sys = createMetricsAggregatorSystem(makeDeps());
    sys.registerMetric('net', 'Network', 'mbps');
    sys.recordSample('net', 100);
    const result = sys.purgeSamples('net', 0n);
    expect(result).toMatchObject({ success: true });
  });
});
