/**
 * Simulation tests — metric-exporter
 */

import { describe, it, expect } from 'vitest';
import {
  createMetricExporterService,
  type MetricExporterDeps,
} from '../metric-exporter.js';

let ts = 1_000_000_000;
let seq = 0;

function makeDeps(): MetricExporterDeps {
  return {
    clock: { nowMicroseconds: () => (ts += 10) },
    idGenerator: { next: () => `me-${++seq}` },
  };
}

describe('metric-exporter — source registration', () => {
  it('registers a source and returns its id', () => {
    const svc = createMetricExporterService(makeDeps());
    const source = svc.registerSource({
      name: 'cpu-collector',
      collector: () => [{ name: 'cpu.usage', value: 55, labels: {} }],
    });
    expect(source.name).toBe('cpu-collector');
    expect(typeof source.sourceId).toBe('string');
  });

  it('removeSource returns true for a registered source', () => {
    const svc = createMetricExporterService(makeDeps());
    const source = svc.registerSource({
      name: 'mem-collector',
      collector: () => [],
    });
    expect(svc.removeSource(source.sourceId)).toBe(true);
  });

  it('removeSource returns false for unknown source', () => {
    const svc = createMetricExporterService(makeDeps());
    expect(svc.removeSource('ghost-id')).toBe(false);
  });
});

describe('metric-exporter — collection', () => {
  it('collect returns an export snapshot', () => {
    const svc = createMetricExporterService(makeDeps());
    svc.registerSource({
      name: 'net-collector',
      collector: () => [{ name: 'net.in', value: 1024, labels: { iface: 'eth0' } }],
    });
    const snapshot = svc.collect();
    expect(snapshot.samples.length).toBeGreaterThan(0);
    expect(typeof snapshot.snapshotId).toBe('string');
  });

  it('format returns a string for json format', () => {
    const svc = createMetricExporterService(makeDeps());
    svc.registerSource({
      name: 'disk-collector',
      collector: () => [{ name: 'disk.read', value: 512, labels: {} }],
    });
    const snapshot = svc.collect();
    const output = svc.format(snapshot, 'json');
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('format returns a string for prometheus format', () => {
    const svc = createMetricExporterService(makeDeps());
    svc.registerSource({
      name: 'prom-collector',
      collector: () => [{ name: 'req.count', value: 100, labels: {} }],
    });
    const snapshot = svc.collect();
    const output = svc.format(snapshot, 'prometheus');
    expect(typeof output).toBe('string');
  });

  it('format returns a string for csv format', () => {
    const svc = createMetricExporterService(makeDeps());
    svc.registerSource({
      name: 'csv-collector',
      collector: () => [{ name: 'latency.p99', value: 200, labels: {} }],
    });
    const snapshot = svc.collect();
    const output = svc.format(snapshot, 'csv');
    expect(typeof output).toBe('string');
  });
});

describe('metric-exporter — stats', () => {
  it('getStats reflects registered sources and export counts', () => {
    const svc = createMetricExporterService(makeDeps());
    svc.registerSource({ name: 'src-1', collector: () => [] });
    svc.registerSource({ name: 'src-2', collector: () => [] });
    svc.collect();
    const stats = svc.getStats();
    expect(stats.totalSources).toBe(2);
    expect(stats.totalExports).toBeGreaterThanOrEqual(1);
  });
});
