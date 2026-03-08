import { describe, it, expect } from 'vitest';
import { createMetricsDashboard } from '../metrics-dashboard.js';
import type { MetricsDashboardDeps } from '../metrics-dashboard.js';

function makeDeps(): MetricsDashboardDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'metric-' + String(++idCounter) },
  };
}

describe('MetricsDashboard — add and remove', () => {
  it('adds a metric', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const metric = dashboard.addMetric({
      name: 'fps',
      category: 'performance',
      value: 60,
      unit: 'frames/s',
    });
    expect(metric.name).toBe('fps');
    expect(metric.value).toBe(60);
    expect(metric.pinned).toBe(false);
  });

  it('retrieves a metric by id', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const added = dashboard.addMetric({
      name: 'latency',
      category: 'network',
      value: 42,
      unit: 'ms',
    });
    const retrieved = dashboard.getMetric(added.metricId);
    expect(retrieved?.name).toBe('latency');
  });

  it('returns undefined for unknown metric', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    expect(dashboard.getMetric('missing')).toBeUndefined();
  });

  it('removes a metric', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const metric = dashboard.addMetric({
      name: 'mem',
      category: 'system',
      value: 1024,
      unit: 'MB',
    });
    expect(dashboard.removeMetric(metric.metricId)).toBe(true);
    expect(dashboard.getMetric(metric.metricId)).toBeUndefined();
  });

  it('returns false for unknown removal', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    expect(dashboard.removeMetric('missing')).toBe(false);
  });
});

describe('MetricsDashboard — update value', () => {
  it('updates metric value', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const metric = dashboard.addMetric({
      name: 'fps',
      category: 'performance',
      value: 60,
      unit: 'frames/s',
    });
    expect(dashboard.updateValue(metric.metricId, 120)).toBe(true);
    expect(dashboard.getMetric(metric.metricId)?.value).toBe(120);
  });

  it('returns false for unknown metric', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    expect(dashboard.updateValue('missing', 99)).toBe(false);
  });
});

describe('MetricsDashboard — pin', () => {
  it('pins a metric', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const metric = dashboard.addMetric({
      name: 'cpu', category: 'system', value: 45, unit: '%',
    });
    expect(dashboard.pin(metric.metricId)).toBe(true);
    expect(dashboard.getMetric(metric.metricId)?.pinned).toBe(true);
  });

  it('returns false when already pinned', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const metric = dashboard.addMetric({
      name: 'cpu', category: 'system', value: 45, unit: '%',
    });
    dashboard.pin(metric.metricId);
    expect(dashboard.pin(metric.metricId)).toBe(false);
  });

  it('lists pinned metrics', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const m1 = dashboard.addMetric({
      name: 'fps', category: 'perf', value: 60, unit: 'fps',
    });
    dashboard.addMetric({
      name: 'mem', category: 'system', value: 512, unit: 'MB',
    });
    dashboard.pin(m1.metricId);
    const pinned = dashboard.listPinned();
    expect(pinned).toHaveLength(1);
    expect(pinned[0]?.name).toBe('fps');
  });
});

describe('MetricsDashboard — unpin', () => {
  it('unpins a metric', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const metric = dashboard.addMetric({
      name: 'cpu', category: 'system', value: 45, unit: '%',
    });
    dashboard.pin(metric.metricId);
    expect(dashboard.unpin(metric.metricId)).toBe(true);
    expect(dashboard.getMetric(metric.metricId)?.pinned).toBe(false);
  });

  it('returns false when already unpinned', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const metric = dashboard.addMetric({
      name: 'cpu', category: 'system', value: 45, unit: '%',
    });
    expect(dashboard.unpin(metric.metricId)).toBe(false);
  });
});

describe('MetricsDashboard — panels', () => {
  it('groups metrics by category', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    dashboard.addMetric({
      name: 'fps',
      category: 'performance',
      value: 60,
      unit: 'fps',
    });
    dashboard.addMetric({
      name: 'latency',
      category: 'performance',
      value: 15,
      unit: 'ms',
    });
    dashboard.addMetric({
      name: 'mem',
      category: 'system',
      value: 1024,
      unit: 'MB',
    });
    const panels = dashboard.getPanels();
    expect(panels).toHaveLength(2);
    const perfPanel = panels.find((p) => p.category === 'performance');
    expect(perfPanel?.metrics).toHaveLength(2);
  });

  it('returns empty panels with no metrics', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    expect(dashboard.getPanels()).toHaveLength(0);
  });
});

describe('MetricsDashboard — stats', () => {
  it('starts with zero stats', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const stats = dashboard.getStats();
    expect(stats.totalMetrics).toBe(0);
    expect(stats.totalCategories).toBe(0);
    expect(stats.pinnedMetrics).toBe(0);
    expect(stats.totalUpdates).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const dashboard = createMetricsDashboard(makeDeps());
    const m1 = dashboard.addMetric({
      name: 'fps',
      category: 'performance',
      value: 60,
      unit: 'fps',
    });
    dashboard.addMetric({
      name: 'mem',
      category: 'system',
      value: 512,
      unit: 'MB',
    });
    dashboard.pin(m1.metricId);
    dashboard.updateValue(m1.metricId, 120);
    dashboard.updateValue(m1.metricId, 90);
    const stats = dashboard.getStats();
    expect(stats.totalMetrics).toBe(2);
    expect(stats.totalCategories).toBe(2);
    expect(stats.pinnedMetrics).toBe(1);
    expect(stats.totalUpdates).toBe(2);
  });
});
