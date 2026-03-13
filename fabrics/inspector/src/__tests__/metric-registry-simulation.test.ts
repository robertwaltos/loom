/**
 * Simulation tests — metric-registry (MetricCollectionRegistry)
 */

import { describe, it, expect } from 'vitest';
import { createMetricCollectionRegistry } from '../metric-registry.js';

describe('metric-registry — counter', () => {
  it('creates a counter with zero metric count initially', () => {
    const reg = createMetricCollectionRegistry();
    expect(reg.metricCount()).toBe(0);
  });

  it('createCounter increments metric count', () => {
    const reg = createMetricCollectionRegistry();
    reg.createCounter('http.requests', 'Total HTTP requests', ['method', 'status']);
    expect(reg.metricCount()).toBe(1);
  });

  it('getMetric returns metadata for a created counter', () => {
    const reg = createMetricCollectionRegistry();
    reg.createCounter('http.requests', 'Total HTTP requests');
    const meta = reg.getMetric('http.requests');
    expect(meta).toBeDefined();
    expect(meta?.name).toBe('http.requests');
  });

  it('getMetric returns undefined for unknown metric', () => {
    const reg = createMetricCollectionRegistry();
    expect(reg.getMetric('unknown')).toBeUndefined();
  });
});

describe('metric-registry — gauge', () => {
  it('createGauge registers a gauge metric', () => {
    const reg = createMetricCollectionRegistry();
    const gauge = reg.createGauge('memory.used', 'Memory in use (bytes)');
    expect(typeof gauge).toBe('object');
    expect(reg.metricCount()).toBe(1);
  });
});

describe('metric-registry — histogram', () => {
  it('createHistogram registers a histogram metric', () => {
    const reg = createMetricCollectionRegistry();
    const hist = reg.createHistogram('latency_ms', 'Request latency in ms');
    expect(typeof hist).toBe('object');
    expect(reg.metricCount()).toBe(1);
  });
});

describe('metric-registry — snapshot and reset', () => {
  it('snapshot returns metrics after creation', () => {
    const reg = createMetricCollectionRegistry();
    reg.createCounter('reqs', 'Request count');
    reg.createGauge('active', 'Active connections');
    const snap = reg.snapshot();
    expect(snap.length).toBe(2);
  });

  it('reset clears metric values', () => {
    const reg = createMetricCollectionRegistry();
    const ctr = reg.createCounter('reqs', 'Request count');
    ctr.increment();
    reg.reset();
    // metricCount stays the same (metrics are still registered)
    expect(reg.metricCount()).toBe(1);
    // Values are cleared — snapshot series should be empty
    const snap = reg.snapshot();
    const reqMetric = snap.find((m) => m.name === 'reqs');
    expect(reqMetric?.series.length).toBe(0);
  });
});
