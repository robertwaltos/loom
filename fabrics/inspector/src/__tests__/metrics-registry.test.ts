import { describe, it, expect } from 'vitest';
import { createMetricsRegistry } from '../metrics-registry.js';
import type { MetricsRegistry } from '../metrics-registry.js';

function createTestRegistry(): MetricsRegistry {
  return createMetricsRegistry();
}

// ─── Counter ────────────────────────────────────────────────────────

describe('Metrics registry counters', () => {
  it('starts at zero', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('requests_total', 'Total requests');
    expect(counter.getValue()).toBe(0);
  });

  it('increments by 1 by default', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('requests_total', 'Total requests');
    counter.increment();
    counter.increment();
    expect(counter.getValue()).toBe(2);
  });

  it('increments by custom delta', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('bytes_sent', 'Bytes sent');
    counter.increment(undefined, 1024);
    expect(counter.getValue()).toBe(1024);
  });

  it('ignores negative increments', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('ops', 'Operations');
    counter.increment(undefined, 5);
    counter.increment(undefined, -3);
    expect(counter.getValue()).toBe(5);
  });

  it('tracks separate label sets', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('http_requests', 'HTTP', ['method']);
    counter.increment({ method: 'GET' });
    counter.increment({ method: 'POST' });
    counter.increment({ method: 'GET' });
    expect(counter.getValue({ method: 'GET' })).toBe(2);
    expect(counter.getValue({ method: 'POST' })).toBe(1);
  });
});

// ─── Gauge ──────────────────────────────────────────────────────────

describe('Metrics registry gauges', () => {
  it('starts at zero', () => {
    const reg = createTestRegistry();
    const gauge = reg.createGauge('population', 'World population');
    expect(gauge.getValue()).toBe(0);
  });

  it('sets absolute value', () => {
    const reg = createTestRegistry();
    const gauge = reg.createGauge('health', 'Health index');
    gauge.set(0.75);
    expect(gauge.getValue()).toBe(0.75);
  });

  it('increments value', () => {
    const reg = createTestRegistry();
    const gauge = reg.createGauge('active', 'Active sessions');
    gauge.set(10);
    gauge.increment();
    expect(gauge.getValue()).toBe(11);
  });

  it('decrements value', () => {
    const reg = createTestRegistry();
    const gauge = reg.createGauge('active', 'Active sessions');
    gauge.set(10);
    gauge.decrement();
    expect(gauge.getValue()).toBe(9);
  });

  it('tracks separate label sets', () => {
    const reg = createTestRegistry();
    const gauge = reg.createGauge('population', 'Pop', ['world']);
    gauge.set(100, { world: 'earth' });
    gauge.set(50, { world: 'mars' });
    expect(gauge.getValue({ world: 'earth' })).toBe(100);
    expect(gauge.getValue({ world: 'mars' })).toBe(50);
  });
});

// ─── Histogram ──────────────────────────────────────────────────────

describe('Metrics registry histograms', () => {
  it('starts empty', () => {
    const reg = createTestRegistry();
    const hist = reg.createHistogram('latency_us', 'Request latency');
    expect(hist.getCount()).toBe(0);
    expect(hist.getSum()).toBe(0);
  });

  it('tracks observations', () => {
    const reg = createTestRegistry();
    const hist = reg.createHistogram('latency_us', 'Latency');
    hist.observe(100);
    hist.observe(200);
    hist.observe(150);
    expect(hist.getCount()).toBe(3);
    expect(hist.getSum()).toBe(450);
  });

  it('tracks min and max', () => {
    const reg = createTestRegistry();
    const hist = reg.createHistogram('duration', 'Duration');
    hist.observe(50);
    hist.observe(200);
    hist.observe(10);
    expect(hist.getMin()).toBe(10);
    expect(hist.getMax()).toBe(200);
  });

  it('computes mean', () => {
    const reg = createTestRegistry();
    const hist = reg.createHistogram('size', 'Size');
    hist.observe(10);
    hist.observe(20);
    hist.observe(30);
    expect(hist.getMean()).toBe(20);
  });

  it('returns zero mean for empty histogram', () => {
    const reg = createTestRegistry();
    const hist = reg.createHistogram('empty', 'Empty');
    expect(hist.getMean()).toBe(0);
  });

  it('tracks separate label sets', () => {
    const reg = createTestRegistry();
    const hist = reg.createHistogram('latency', 'Lat', ['endpoint']);
    hist.observe(100, { endpoint: '/api' });
    hist.observe(200, { endpoint: '/health' });
    expect(hist.getCount({ endpoint: '/api' })).toBe(1);
    expect(hist.getCount({ endpoint: '/health' })).toBe(1);
  });
});

// ─── Registry Operations ───────────────────────────────────────────

describe('Metrics registry operations', () => {
  it('rejects duplicate metric names', () => {
    const reg = createTestRegistry();
    reg.createCounter('ops', 'Operations');
    expect(() => reg.createGauge('ops', 'Operations')).toThrow('already registered');
  });

  it('getMetric returns meta for registered metric', () => {
    const reg = createTestRegistry();
    reg.createCounter('requests', 'Total requests');
    const meta = reg.getMetric('requests');
    expect(meta).not.toBeUndefined();
    expect(meta?.type).toBe('counter');
    expect(meta?.name).toBe('requests');
  });

  it('getMetric returns undefined for unknown metric', () => {
    const reg = createTestRegistry();
    expect(reg.getMetric('unknown')).toBeUndefined();
  });

  it('metricCount tracks registered metrics', () => {
    const reg = createTestRegistry();
    expect(reg.metricCount()).toBe(0);
    reg.createCounter('a', 'A');
    reg.createGauge('b', 'B');
    reg.createHistogram('c', 'C');
    expect(reg.metricCount()).toBe(3);
  });

  it('reset clears all values but preserves registrations', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('ops', 'Ops');
    const gauge = reg.createGauge('health', 'Health');
    const hist = reg.createHistogram('lat', 'Latency');
    counter.increment();
    gauge.set(42);
    hist.observe(100);
    reg.reset();
    expect(counter.getValue()).toBe(0);
    expect(gauge.getValue()).toBe(0);
    expect(hist.getCount()).toBe(0);
    expect(reg.metricCount()).toBe(3); // registrations preserved
  });
});

// ─── Snapshot ──────────────────────────────────────────────────────

describe('Metrics registry snapshot', () => {
  it('produces snapshot of all metrics', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('requests', 'Reqs');
    counter.increment();
    const gauge = reg.createGauge('health', 'Health');
    gauge.set(0.9);
    const hist = reg.createHistogram('latency', 'Lat');
    hist.observe(100);
    hist.observe(200);

    const snap = reg.snapshot();
    expect(snap).toHaveLength(3);
  });

  it('counter snapshot includes value', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('ops', 'Ops');
    counter.increment(undefined, 5);
    const snap = reg.snapshot();
    const ops = snap.find((s) => s.name === 'ops');
    expect(ops?.type).toBe('counter');
    expect(ops?.series[0]?.value).toBe(5);
  });

  it('histogram snapshot includes statistics', () => {
    const reg = createTestRegistry();
    const hist = reg.createHistogram('lat', 'Latency');
    hist.observe(10);
    hist.observe(20);
    const snap = reg.snapshot();
    const lat = snap.find((s) => s.name === 'lat');
    expect(lat?.series[0]?.count).toBe(2);
    expect(lat?.series[0]?.sum).toBe(30);
    expect(lat?.series[0]?.min).toBe(10);
    expect(lat?.series[0]?.max).toBe(20);
  });

  it('snapshot preserves label information', () => {
    const reg = createTestRegistry();
    const counter = reg.createCounter('http', 'HTTP', ['method']);
    counter.increment({ method: 'GET' }, 3);
    counter.increment({ method: 'POST' }, 1);
    const snap = reg.snapshot();
    const http = snap.find((s) => s.name === 'http');
    expect(http?.series).toHaveLength(2);
  });
});
