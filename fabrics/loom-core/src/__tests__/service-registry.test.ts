import { describe, it, expect } from 'vitest';
import { createServiceRegistry } from '../service-registry.js';
import type { ServiceRegistryDeps } from '../service-registry.js';

function makeDeps(): ServiceRegistryDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'svc-' + String(++idCounter) },
  };
}

describe('ServiceRegistry — register and retrieve', () => {
  it('registers a service', () => {
    const reg = createServiceRegistry(makeDeps());
    const svc = reg.register({ name: 'auth', version: '1.0.0' });
    expect(svc.serviceId).toBe('svc-1');
    expect(svc.status).toBe('active');
  });

  it('retrieves by id', () => {
    const reg = createServiceRegistry(makeDeps());
    const svc = reg.register({ name: 'auth', version: '1.0.0' });
    expect(reg.getService(svc.serviceId)?.name).toBe('auth');
  });

  it('returns undefined for unknown id', () => {
    const reg = createServiceRegistry(makeDeps());
    expect(reg.getService('missing')).toBeUndefined();
  });

  it('finds by name', () => {
    const reg = createServiceRegistry(makeDeps());
    reg.register({ name: 'auth', version: '1.0.0' });
    reg.register({ name: 'auth', version: '2.0.0' });
    reg.register({ name: 'gateway', version: '1.0.0' });
    expect(reg.findByName('auth')).toHaveLength(2);
  });

  it('deregisters a service', () => {
    const reg = createServiceRegistry(makeDeps());
    const svc = reg.register({ name: 'temp', version: '0.1.0' });
    expect(reg.deregister(svc.serviceId)).toBe(true);
    expect(reg.getService(svc.serviceId)).toBeUndefined();
  });
});

describe('ServiceRegistry — status management', () => {
  it('suspends a service', () => {
    const reg = createServiceRegistry(makeDeps());
    const svc = reg.register({ name: 'auth', version: '1.0.0' });
    expect(reg.suspend(svc.serviceId)).toBe(true);
    expect(reg.getService(svc.serviceId)?.status).toBe('suspended');
  });

  it('reactivates a suspended service', () => {
    const reg = createServiceRegistry(makeDeps());
    const svc = reg.register({ name: 'auth', version: '1.0.0' });
    reg.suspend(svc.serviceId);
    expect(reg.activate(svc.serviceId)).toBe(true);
    expect(reg.getService(svc.serviceId)?.status).toBe('active');
  });

  it('marks degraded', () => {
    const reg = createServiceRegistry(makeDeps());
    const svc = reg.register({ name: 'auth', version: '1.0.0' });
    expect(reg.markDegraded(svc.serviceId)).toBe(true);
    expect(reg.getService(svc.serviceId)?.status).toBe('degraded');
  });

  it('lists by status', () => {
    const reg = createServiceRegistry(makeDeps());
    reg.register({ name: 'a', version: '1.0.0' });
    const b = reg.register({ name: 'b', version: '1.0.0' });
    reg.suspend(b.serviceId);
    expect(reg.listByStatus('active')).toHaveLength(1);
    expect(reg.listByStatus('suspended')).toHaveLength(1);
  });
});

describe('ServiceRegistry — heartbeat', () => {
  it('updates heartbeat timestamp', () => {
    const reg = createServiceRegistry(makeDeps());
    const svc = reg.register({ name: 'auth', version: '1.0.0' });
    const before = reg.getService(svc.serviceId)?.lastHeartbeat ?? 0;
    expect(reg.heartbeat(svc.serviceId)).toBe(true);
    const after = reg.getService(svc.serviceId)?.lastHeartbeat ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it('returns false for unknown service', () => {
    const reg = createServiceRegistry(makeDeps());
    expect(reg.heartbeat('missing')).toBe(false);
  });
});

describe('ServiceRegistry — stats', () => {
  it('starts with zero stats', () => {
    const reg = createServiceRegistry(makeDeps());
    const stats = reg.getStats();
    expect(stats.totalServices).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const reg = createServiceRegistry(makeDeps());
    reg.register({ name: 'a', version: '1.0.0' });
    const b = reg.register({ name: 'b', version: '1.0.0' });
    reg.suspend(b.serviceId);
    const stats = reg.getStats();
    expect(stats.totalServices).toBe(2);
    expect(stats.activeServices).toBe(1);
    expect(stats.suspendedServices).toBe(1);
  });
});
