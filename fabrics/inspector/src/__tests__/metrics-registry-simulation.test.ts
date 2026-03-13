/**
 * Simulation tests — metrics-registry (MetricsRegistry)
 */

import { describe, it, expect } from 'vitest';
import { createMetricsRegistry } from '../metrics-registry.js';

describe('metrics-registry — counter', () => {
  it('starts with zero metric count', () => {
    const reg = createMetricsRegistry();
    expect(reg.metricCount()).toBe(0);
  });

  it('createCounter registers a counter', () => {
    const reg = createMetricsRegistry();
    const counter = reg.createCounter('requests.total', 'Total requests', ['method']);
    expect(typeof counter).toBe('object');
    expect(reg.metricCount()).toBe(1);
  });

  it('getMetric returns metadata after counter creation', () => {
    const reg = createMetricsRegistry();
    reg.createCounter('requests.total', 'Total requests');
    expect(reg.getMetric('requests.total')).toBeDefined();
  });

  it('getMetric returns undefined for unknown metric', () => {
    const reg = createMetricsRegistry();
    expect(reg.getMetric('unknown')).toBeUndefined();
  });
});

describe('metrics-registry — gauge', () => {
  it('createGauge registers a gauge metric', () => {
    const reg = createMetricsRegistry();
    const gauge = reg.createGauge('memory.rss', 'Resident set size');
    expect(typeof gauge).toBe('object');
    expect(reg.metricCount()).toBe(1);
  });
});

describe('metrics-registry — histogram', () => {
  it('createHistogram registers a histogram metric', () => {
    const reg = createMetricsRegistry();
    const hist = reg.createHistogram('http.duration', 'HTTP request duration');
    expect(typeof hist).toBe('object');
    expect(reg.metricCount()).toBe(1);
  });
});

describe('metrics-registry — snapshot and reset', () => {
  it('snapshot returns all registered metrics', () => {
    const reg = createMetricsRegistry();
    reg.createCounter('req', 'Requests');
    reg.createGauge('conn', 'Connections');
    expect(reg.snapshot().length).toBe(2);
  });

  it('reset clears metric values', () => {
    const reg = createMetricsRegistry();
    reg.createCounter('req', 'Requests');
    reg.reset();
    // metrics are still registered after reset
    expect(reg.metricCount()).toBe(1);
  });
});
