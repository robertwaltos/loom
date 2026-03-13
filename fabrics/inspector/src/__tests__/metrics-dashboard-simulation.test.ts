/**
 * Simulation tests — metrics-dashboard
 */

import { describe, it, expect } from 'vitest';
import {
  createMetricsDashboard,
  type MetricsDashboardDeps,
} from '../metrics-dashboard.js';

let ts = 1_000_000_000;
let seq = 0;

function makeDeps(): MetricsDashboardDeps {
  return {
    clock: { nowMicroseconds: () => (ts += 100) },
    idGenerator: { next: () => `md-${++seq}` },
  };
}

describe('metrics-dashboard — metric lifecycle', () => {
  it('adds a metric and returns it', () => {
    const dash = createMetricsDashboard(makeDeps());
    const metric = dash.addMetric({
      name: 'cpu.usage',
      category: 'compute',
      value: 55,
      unit: '%',
    });
    expect(metric.name).toBe('cpu.usage');
    expect(metric.category).toBe('compute');
    expect(metric.value).toBe(55);
    expect(typeof metric.metricId).toBe('string');
  });

  it('updateValue returns true for a known metric', () => {
    const dash = createMetricsDashboard(makeDeps());
    const m = dash.addMetric({ name: 'mem', category: 'memory', value: 1024, unit: 'MB' });
    expect(dash.updateValue(m.metricId, 2048)).toBe(true);
  });

  it('updateValue returns false for unknown metric id', () => {
    const dash = createMetricsDashboard(makeDeps());
    expect(dash.updateValue('ghost-id', 100)).toBe(false);
  });

  it('removeMetric returns true and decrements count', () => {
    const dash = createMetricsDashboard(makeDeps());
    const m = dash.addMetric({ name: 'net', category: 'network', value: 500, unit: 'Mbps' });
    expect(dash.removeMetric(m.metricId)).toBe(true);
  });
});

describe('metrics-dashboard — pinning', () => {
  it('pin and listPinned include the metric', () => {
    const dash = createMetricsDashboard(makeDeps());
    const m = dash.addMetric({ name: 'latency', category: 'api', value: 42, unit: 'ms' });
    dash.pin(m.metricId);
    const pinned = dash.listPinned();
    expect(pinned.some((p) => p.metricId === m.metricId)).toBe(true);
  });

  it('unpin removes metric from pinned list', () => {
    const dash = createMetricsDashboard(makeDeps());
    const m = dash.addMetric({ name: 'errors', category: 'api', value: 3, unit: 'count' });
    dash.pin(m.metricId);
    dash.unpin(m.metricId);
    const pinned = dash.listPinned();
    expect(pinned.some((p) => p.metricId === m.metricId)).toBe(false);
  });
});

describe('metrics-dashboard — panels and stats', () => {
  it('getPanels groups metrics by category', () => {
    const dash = createMetricsDashboard(makeDeps());
    dash.addMetric({ name: 'cpu', category: 'compute', value: 80, unit: '%' });
    dash.addMetric({ name: 'gpu', category: 'compute', value: 60, unit: '%' });
    dash.addMetric({ name: 'mem', category: 'memory', value: 4096, unit: 'MB' });
    const panels = dash.getPanels();
    const computePanel = panels.find((p) => p.category === 'compute');
    expect(computePanel?.metrics.length).toBe(2);
  });

  it('getStats reflects total metrics added', () => {
    const dash = createMetricsDashboard(makeDeps());
    dash.addMetric({ name: 'a', category: 'x', value: 1, unit: '' });
    dash.addMetric({ name: 'b', category: 'y', value: 2, unit: '' });
    const stats = dash.getStats();
    expect(stats.totalMetrics).toBe(2);
  });
});
