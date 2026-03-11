import { describe, it, expect } from 'vitest';
import { createMetricExporterService } from '../metric-exporter.js';
import type { MetricExporterDeps, MetricSample } from '../metric-exporter.js';

function createDeps(): MetricExporterDeps {
  let time = 5000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'exp-' + String(id++) },
  };
}

function fakeSamples(): readonly MetricSample[] {
  return [
    { name: 'cpu_usage', value: 42.5, labels: { host: 'node-1' } },
    { name: 'memory_mb', value: 1024, labels: { host: 'node-1' } },
  ];
}

describe('MetricExporterService — registerSource / removeSource', () => {
  it('registers a metric source', () => {
    const svc = createMetricExporterService(createDeps());
    const src = svc.registerSource({ name: 'system', collector: fakeSamples });
    expect(src.sourceId).toBe('exp-0');
    expect(src.name).toBe('system');
  });

  it('removes a metric source', () => {
    const svc = createMetricExporterService(createDeps());
    const src = svc.registerSource({ name: 'system', collector: fakeSamples });
    expect(svc.removeSource(src.sourceId)).toBe(true);
    expect(svc.getStats().totalSources).toBe(0);
  });
});

describe('MetricExporterService — collect', () => {
  it('collects samples from all registered sources', () => {
    const svc = createMetricExporterService(createDeps());
    svc.registerSource({ name: 'system', collector: fakeSamples });
    svc.registerSource({
      name: 'app',
      collector: () => [{ name: 'requests', value: 100, labels: {} }],
    });
    const snap = svc.collect();
    expect(snap.samples).toHaveLength(3);
    expect(snap.sourceCount).toBe(2);
  });

  it('returns empty snapshot with no sources', () => {
    const svc = createMetricExporterService(createDeps());
    const snap = svc.collect();
    expect(snap.samples).toHaveLength(0);
    expect(snap.sourceCount).toBe(0);
  });
});

describe('MetricExporterService — format', () => {
  it('formats as JSON', () => {
    const svc = createMetricExporterService(createDeps());
    svc.registerSource({ name: 'sys', collector: fakeSamples });
    const snap = svc.collect();
    const json = svc.format(snap, 'json');
    const parsed = JSON.parse(json) as { samples: MetricSample[] };
    expect(parsed.samples).toHaveLength(2);
  });

  it('formats as Prometheus', () => {
    const svc = createMetricExporterService(createDeps());
    svc.registerSource({ name: 'sys', collector: fakeSamples });
    const snap = svc.collect();
    const prom = svc.format(snap, 'prometheus');
    expect(prom).toContain('cpu_usage{host="node-1"} 42.5');
    expect(prom).toContain('memory_mb{host="node-1"} 1024');
  });

  it('formats as CSV', () => {
    const svc = createMetricExporterService(createDeps());
    svc.registerSource({ name: 'sys', collector: fakeSamples });
    const snap = svc.collect();
    const csv = svc.format(snap, 'csv');
    expect(csv).toContain('name,value,labels');
    expect(csv).toContain('cpu_usage,42.5,host=node-1');
  });
});

describe('MetricExporterService — getStats', () => {
  it('tracks export statistics', () => {
    const svc = createMetricExporterService(createDeps());
    svc.registerSource({ name: 'sys', collector: fakeSamples });
    svc.collect();
    svc.collect();
    const stats = svc.getStats();
    expect(stats.totalSources).toBe(1);
    expect(stats.totalExports).toBe(2);
    expect(stats.totalSamples).toBe(4);
  });
});
