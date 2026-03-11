import { describe, it, expect } from 'vitest';
import { createMetricCollectionRegistry } from '../metric-registry.js';
import type { MetricCollectionRegistry } from '../metric-registry.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createRegistry(): MetricCollectionRegistry {
  return createMetricCollectionRegistry();
}

// ─── Counter ────────────────────────────────────────────────────────

describe('MetricCollectionRegistry counter', () => {
  it('creates a counter with zero initial value', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('requests', 'Total requests');
    expect(counter.getValue()).toBe(0);
  });

  it('increments counter by default delta of 1', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('requests', 'Total requests');
    counter.increment();
    expect(counter.getValue()).toBe(1);
  });

  it('increments counter by specified delta', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('requests', 'Total requests');
    counter.increment(undefined, 5);
    expect(counter.getValue()).toBe(5);
  });

  it('ignores negative delta on counter', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('requests', 'Total requests');
    counter.increment(undefined, 3);
    counter.increment(undefined, -1);
    expect(counter.getValue()).toBe(3);
  });

  it('tracks counter with labels independently', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('requests', 'Total requests', ['method']);
    counter.increment({ method: 'GET' }, 2);
    counter.increment({ method: 'POST' }, 5);
    expect(counter.getValue({ method: 'GET' })).toBe(2);
    expect(counter.getValue({ method: 'POST' })).toBe(5);
  });

  it('exposes correct metric meta on counter', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('errors', 'Total errors');
    expect(counter.meta.name).toBe('errors');
    expect(counter.meta.type).toBe('counter');
  });
});

// ─── Gauge ──────────────────────────────────────────────────────────

describe('MetricCollectionRegistry gauge', () => {
  it('creates a gauge with zero initial value', () => {
    const reg = createRegistry();
    const gauge = reg.createGauge('temp', 'Temperature');
    expect(gauge.getValue()).toBe(0);
  });

  it('sets gauge to arbitrary value', () => {
    const reg = createRegistry();
    const gauge = reg.createGauge('temp', 'Temperature');
    gauge.set(42);
    expect(gauge.getValue()).toBe(42);
  });

  it('increments gauge', () => {
    const reg = createRegistry();
    const gauge = reg.createGauge('active', 'Active connections');
    gauge.set(10);
    gauge.increment();
    expect(gauge.getValue()).toBe(11);
  });

  it('decrements gauge', () => {
    const reg = createRegistry();
    const gauge = reg.createGauge('active', 'Active connections');
    gauge.set(10);
    gauge.decrement(undefined, 3);
    expect(gauge.getValue()).toBe(7);
  });

  it('gauge can go negative', () => {
    const reg = createRegistry();
    const gauge = reg.createGauge('balance', 'Balance');
    gauge.decrement();
    expect(gauge.getValue()).toBe(-1);
  });
});

// ─── Histogram ──────────────────────────────────────────────────────

describe('MetricCollectionRegistry histogram', () => {
  it('tracks observation count', () => {
    const reg = createRegistry();
    const hist = reg.createHistogram('latency', 'Request latency');
    hist.observe(100);
    hist.observe(200);
    hist.observe(300);
    expect(hist.getCount()).toBe(3);
  });

  it('computes sum of observations', () => {
    const reg = createRegistry();
    const hist = reg.createHistogram('latency', 'Request latency');
    hist.observe(100);
    hist.observe(200);
    expect(hist.getSum()).toBe(300);
  });

  it('computes p50 percentile', () => {
    const reg = createRegistry();
    const hist = reg.createHistogram('latency', 'Request latency');
    for (let i = 1; i <= 100; i++) hist.observe(i);
    expect(hist.getPercentile(50)).toBe(50);
  });

  it('computes p90 percentile', () => {
    const reg = createRegistry();
    const hist = reg.createHistogram('latency', 'Request latency');
    for (let i = 1; i <= 100; i++) hist.observe(i);
    expect(hist.getPercentile(90)).toBe(90);
  });

  it('computes p99 percentile', () => {
    const reg = createRegistry();
    const hist = reg.createHistogram('latency', 'Request latency');
    for (let i = 1; i <= 100; i++) hist.observe(i);
    expect(hist.getPercentile(99)).toBe(99);
  });

  it('returns 0 for empty histogram percentile', () => {
    const reg = createRegistry();
    const hist = reg.createHistogram('latency', 'Request latency');
    expect(hist.getPercentile(50)).toBe(0);
  });
});

// ─── Summary ────────────────────────────────────────────────────────

describe('MetricCollectionRegistry summary', () => {
  it('computes mean of observations', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('duration', 'Duration');
    summ.observe(10);
    summ.observe(20);
    summ.observe(30);
    expect(summ.getMean()).toBe(20);
  });

  it('tracks min value', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('duration', 'Duration');
    summ.observe(50);
    summ.observe(10);
    summ.observe(30);
    expect(summ.getMin()).toBe(10);
  });

  it('tracks max value', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('duration', 'Duration');
    summ.observe(50);
    summ.observe(10);
    summ.observe(30);
    expect(summ.getMax()).toBe(50);
  });

  it('computes standard deviation', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('duration', 'Duration');
    summ.observe(10);
    summ.observe(10);
    summ.observe(10);
    expect(summ.getStddev()).toBe(0);
  });

  it('returns nonzero stddev for varying data', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('duration', 'Duration');
    summ.observe(2);
    summ.observe(4);
    summ.observe(4);
    summ.observe(4);
    summ.observe(5);
    summ.observe(5);
    summ.observe(7);
    summ.observe(9);
    expect(summ.getStddev()).toBeGreaterThan(0);
  });

  it('returns 0 for empty summary', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('duration', 'Duration');
    expect(summ.getMean()).toBe(0);
    expect(summ.getMin()).toBe(0);
    expect(summ.getMax()).toBe(0);
  });

  it('returns 0 stddev for single observation', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('duration', 'Duration');
    summ.observe(42);
    expect(summ.getStddev()).toBe(0);
  });
});

// ─── Registry Operations ────────────────────────────────────────────

describe('MetricCollectionRegistry operations', () => {
  it('counts total metrics', () => {
    const reg = createRegistry();
    reg.createCounter('a', 'A');
    reg.createGauge('b', 'B');
    reg.createHistogram('c', 'C');
    reg.createSummary('d', 'D');
    expect(reg.metricCount()).toBe(4);
  });

  it('throws on duplicate metric name', () => {
    const reg = createRegistry();
    reg.createCounter('x', 'X');
    expect(() => reg.createGauge('x', 'X')).toThrow('already registered');
  });

  it('retrieves metric meta by name', () => {
    const reg = createRegistry();
    reg.createCounter('requests', 'Total requests');
    const meta = reg.getMetric('requests');
    expect(meta?.type).toBe('counter');
  });

  it('returns undefined for unknown metric', () => {
    const reg = createRegistry();
    expect(reg.getMetric('unknown')).toBeUndefined();
  });

  it('resets all metric values', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('a', 'A');
    counter.increment(undefined, 10);
    reg.reset();
    expect(counter.getValue()).toBe(0);
  });

  it('produces snapshot with all metrics', () => {
    const reg = createRegistry();
    const counter = reg.createCounter('reqs', 'Requests');
    counter.increment(undefined, 5);
    const snap = reg.snapshot();
    expect(snap.length).toBe(1);
    expect(snap[0]?.name).toBe('reqs');
  });

  it('snapshot includes histogram percentiles', () => {
    const reg = createRegistry();
    const hist = reg.createHistogram('lat', 'Latency');
    hist.observe(100);
    hist.observe(200);
    const snap = reg.snapshot();
    const histSnap = snap.find((s) => s.name === 'lat');
    expect(histSnap?.series[0]?.p50).toBeDefined();
    expect(histSnap?.series[0]?.p90).toBeDefined();
  });

  it('snapshot includes summary stddev', () => {
    const reg = createRegistry();
    const summ = reg.createSummary('dur', 'Duration');
    summ.observe(10);
    summ.observe(20);
    const snap = reg.snapshot();
    const summSnap = snap.find((s) => s.name === 'dur');
    expect(summSnap?.series[0]?.stddev).toBeDefined();
  });
});
