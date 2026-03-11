/**
 * Resource Profiler Tests
 * Fabric: inspector
 */

import { describe, it, expect } from 'vitest';
import { createResourceProfilerSystem } from '../resource-profiler.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem() {
  return createResourceProfilerSystem({
    clock: { nowMicroseconds: () => 3_000_000n },
    idGen: { next: () => 'sample-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

// ─── registerService ──────────────────────────────────────────────────────────

describe('registerService', () => {
  it('registers a new service', () => {
    const system = createTestSystem();
    expect(system.registerService('payment-svc')).toEqual({ success: true });
  });

  it('returns already-registered for duplicate', () => {
    const system = createTestSystem();
    system.registerService('payment-svc');
    expect(system.registerService('payment-svc')).toEqual({
      success: false,
      error: 'already-registered',
    });
  });
});

// ─── recordSample ─────────────────────────────────────────────────────────────

describe('recordSample', () => {
  it('records a valid sample', () => {
    const system = createTestSystem();
    system.registerService('svc');
    const result = system.recordSample('svc', 'CPU', 45);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.serviceName).toBe('svc');
      expect(result.resourceType).toBe('CPU');
      expect(result.usagePercent).toBe(45);
    }
  });

  it('returns service-not-found for unregistered service', () => {
    const system = createTestSystem();
    expect(system.recordSample('unknown', 'CPU', 50)).toBe('service-not-found');
  });

  it('returns invalid-sample for usagePercent < 0', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.recordSample('svc', 'CPU', -1)).toBe('invalid-sample');
  });

  it('returns invalid-sample for usagePercent > 100', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.recordSample('svc', 'CPU', 101)).toBe('invalid-sample');
  });

  it('accepts boundary values 0 and 100', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(typeof system.recordSample('svc', 'CPU', 0)).not.toBe('string');
    expect(typeof system.recordSample('svc', 'CPU', 100)).not.toBe('string');
  });
});

// ─── getProfile ───────────────────────────────────────────────────────────────

describe('getProfile', () => {
  it('returns undefined for unregistered service', () => {
    const system = createTestSystem();
    expect(system.getProfile('unknown', 'CPU')).toBeUndefined();
  });

  it('returns undefined when no samples recorded', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.getProfile('svc', 'CPU')).toBeUndefined();
  });

  it('computes avgUsage correctly', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'CPU', 40);
    system.recordSample('svc', 'CPU', 60);
    const profile = system.getProfile('svc', 'CPU');
    expect(profile?.avgUsage).toBe(50);
  });

  it('computes peakUsage correctly', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'MEMORY', 30);
    system.recordSample('svc', 'MEMORY', 85);
    system.recordSample('svc', 'MEMORY', 50);
    expect(system.getProfile('svc', 'MEMORY')?.peakUsage).toBe(85);
  });

  it('computes minUsage correctly', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'GPU', 70);
    system.recordSample('svc', 'GPU', 20);
    system.recordSample('svc', 'GPU', 50);
    expect(system.getProfile('svc', 'GPU')?.minUsage).toBe(20);
  });

  it('computes p95Usage at floor(count * 0.95) index of sorted values', () => {
    const system = createTestSystem();
    system.registerService('svc');
    for (let i = 1; i <= 20; i++) system.recordSample('svc', 'DISK_IO', i * 5);
    const profile = system.getProfile('svc', 'DISK_IO');
    // 20 samples, floor(20 * 0.95) = 19, sorted values: 5,10,...,100, index 19 = 100
    expect(profile?.p95Usage).toBe(100);
  });

  it('returns sampleCount correctly', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'NETWORK_IO', 10);
    system.recordSample('svc', 'NETWORK_IO', 20);
    expect(system.getProfile('svc', 'NETWORK_IO')?.sampleCount).toBe(2);
  });
});

// ─── getBottleneckReport ──────────────────────────────────────────────────────

describe('getBottleneckReport', () => {
  it('returns undefined for unregistered service', () => {
    const system = createTestSystem();
    expect(system.getBottleneckReport('unknown')).toBeUndefined();
  });

  it('includes HIGH severity for avgUsage >= 90', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'CPU', 92);
    system.recordSample('svc', 'CPU', 95);
    const report = system.getBottleneckReport('svc');
    const cpu = report?.bottlenecks.find((b) => b.resourceType === 'CPU');
    expect(cpu?.severity).toBe('HIGH');
  });

  it('includes MEDIUM severity for avgUsage >= 70 and < 90', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'MEMORY', 75);
    system.recordSample('svc', 'MEMORY', 80);
    const report = system.getBottleneckReport('svc');
    const mem = report?.bottlenecks.find((b) => b.resourceType === 'MEMORY');
    expect(mem?.severity).toBe('MEDIUM');
  });

  it('includes LOW severity for avgUsage >= 50 and < 70', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'DISK_IO', 55);
    system.recordSample('svc', 'DISK_IO', 60);
    const report = system.getBottleneckReport('svc');
    const disk = report?.bottlenecks.find((b) => b.resourceType === 'DISK_IO');
    expect(disk?.severity).toBe('LOW');
  });

  it('excludes resources with avgUsage < 50', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'GPU', 10);
    system.recordSample('svc', 'GPU', 20);
    const report = system.getBottleneckReport('svc');
    const gpu = report?.bottlenecks.find((b) => b.resourceType === 'GPU');
    expect(gpu).toBeUndefined();
  });

  it('returns empty bottlenecks when no samples recorded', () => {
    const system = createTestSystem();
    system.registerService('svc');
    const report = system.getBottleneckReport('svc');
    expect(report?.bottlenecks).toHaveLength(0);
  });
});

// ─── listSamples ──────────────────────────────────────────────────────────────

describe('listSamples', () => {
  it('returns most recent samples up to limit', () => {
    const system = createTestSystem();
    system.registerService('svc');
    for (let i = 0; i < 10; i++) system.recordSample('svc', 'CPU', i * 10);
    const samples = system.listSamples('svc', 'CPU', 3);
    expect(samples).toHaveLength(3);
    expect(samples[2]?.usagePercent).toBe(90);
  });

  it('returns empty array for no samples', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.listSamples('svc', 'CPU', 10)).toHaveLength(0);
  });
});

// ─── purgeSamples ─────────────────────────────────────────────────────────────

describe('purgeSamples', () => {
  it('purges oldest samples and keeps last N', () => {
    const system = createTestSystem();
    system.registerService('svc');
    for (let i = 0; i < 10; i++) system.recordSample('svc', 'CPU', i * 10);
    const result = system.purgeSamples('svc', 'CPU', 3);
    expect(result).toEqual({ success: true, purged: 7 });
    expect(system.listSamples('svc', 'CPU', 100)).toHaveLength(3);
  });

  it('returns service-not-found for unregistered service', () => {
    const system = createTestSystem();
    expect(system.purgeSamples('unknown', 'CPU', 5)).toEqual({
      success: false,
      error: 'service-not-found',
    });
  });

  it('returns purged: 0 when fewer samples than keepLast', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.recordSample('svc', 'CPU', 50);
    const result = system.purgeSamples('svc', 'CPU', 10);
    expect(result).toEqual({ success: true, purged: 0 });
  });
});
