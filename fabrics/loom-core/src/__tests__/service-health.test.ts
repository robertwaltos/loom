import { describe, it, expect } from 'vitest';
import { createServiceHealthAggregator } from '../service-health.js';
import type { ServiceHealthDeps } from '../service-health.js';

function createDeps(): ServiceHealthDeps {
  let time = 1000;
  return { clock: { nowMicroseconds: () => time++ } };
}

describe('ServiceHealthAggregator — register', () => {
  it('registers a service starting as healthy', () => {
    const svc = createServiceHealthAggregator(createDeps());
    expect(svc.register({ serviceId: 'svc-1', name: 'API' })).toBe(true);
    const health = svc.getServiceHealth('svc-1');
    expect(health).toBeDefined();
    expect(health?.level).toBe('healthy');
  });

  it('rejects duplicate registration', () => {
    const svc = createServiceHealthAggregator(createDeps());
    svc.register({ serviceId: 'svc-1', name: 'API' });
    expect(svc.register({ serviceId: 'svc-1', name: 'API' })).toBe(false);
  });

  it('returns undefined for unknown service', () => {
    const svc = createServiceHealthAggregator(createDeps());
    expect(svc.getServiceHealth('unknown')).toBeUndefined();
  });
});

describe('ServiceHealthAggregator — report', () => {
  it('updates service health level', () => {
    const svc = createServiceHealthAggregator(createDeps());
    svc.register({ serviceId: 'svc-1', name: 'DB' });
    expect(svc.report({ serviceId: 'svc-1', level: 'degraded', message: 'slow queries' })).toBe(true);
    expect(svc.getServiceHealth('svc-1')?.level).toBe('degraded');
    expect(svc.getServiceHealth('svc-1')?.message).toBe('slow queries');
  });

  it('returns false for unknown service', () => {
    const svc = createServiceHealthAggregator(createDeps());
    expect(svc.report({ serviceId: 'unknown', level: 'unhealthy', message: '' })).toBe(false);
  });
});

describe('ServiceHealthAggregator — aggregate', () => {
  it('returns healthy when all services are healthy', () => {
    const svc = createServiceHealthAggregator(createDeps());
    svc.register({ serviceId: 'a', name: 'A' });
    svc.register({ serviceId: 'b', name: 'B' });
    const agg = svc.aggregate();
    expect(agg.overall).toBe('healthy');
    expect(agg.services).toHaveLength(2);
  });

  it('returns degraded when any service is degraded', () => {
    const svc = createServiceHealthAggregator(createDeps());
    svc.register({ serviceId: 'a', name: 'A' });
    svc.register({ serviceId: 'b', name: 'B' });
    svc.report({ serviceId: 'b', level: 'degraded', message: '' });
    expect(svc.aggregate().overall).toBe('degraded');
  });

  it('returns unhealthy when any service is unhealthy', () => {
    const svc = createServiceHealthAggregator(createDeps());
    svc.register({ serviceId: 'a', name: 'A' });
    svc.register({ serviceId: 'b', name: 'B' });
    svc.report({ serviceId: 'a', level: 'degraded', message: '' });
    svc.report({ serviceId: 'b', level: 'unhealthy', message: '' });
    expect(svc.aggregate().overall).toBe('unhealthy');
  });
});

describe('ServiceHealthAggregator — stats', () => {
  it('reports health level counts', () => {
    const svc = createServiceHealthAggregator(createDeps());
    svc.register({ serviceId: 'a', name: 'A' });
    svc.register({ serviceId: 'b', name: 'B' });
    svc.register({ serviceId: 'c', name: 'C' });
    svc.report({ serviceId: 'b', level: 'degraded', message: '' });
    svc.report({ serviceId: 'c', level: 'unhealthy', message: '' });
    const stats = svc.getStats();
    expect(stats.totalServices).toBe(3);
    expect(stats.healthyCount).toBe(1);
    expect(stats.degradedCount).toBe(1);
    expect(stats.unhealthyCount).toBe(1);
  });
});
