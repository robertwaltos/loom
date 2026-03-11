/**
 * SLA Monitor System Tests
 * Fabric: inspector
 */

import { describe, it, expect } from 'vitest';
import { createSLAMonitorSystem } from '../sla-monitor-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem() {
  return createSLAMonitorSystem({
    clock: { nowMicroseconds: () => 1_000_000n },
    idGen: { next: () => 'id-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

// ─── registerService ──────────────────────────────────────────────────────────

describe('registerService', () => {
  it('registers a new service', () => {
    const system = createTestSystem();
    expect(system.registerService('api-gateway')).toEqual({ success: true });
  });

  it('returns already-registered for duplicate service', () => {
    const system = createTestSystem();
    system.registerService('api-gateway');
    expect(system.registerService('api-gateway')).toEqual({
      success: false,
      error: 'already-registered',
    });
  });
});

// ─── createSLA ────────────────────────────────────────────────────────────────

describe('createSLA', () => {
  it('creates an SLA for a registered service', () => {
    const system = createTestSystem();
    system.registerService('auth');
    const result = system.createSLA('auth', 'LATENCY_P99', 200, 'HOURLY');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.metric).toBe('LATENCY_P99');
      expect(result.target).toBe(200);
      expect(result.status).toBe('COMPLIANT');
    }
  });

  it('returns service-not-found for unregistered service', () => {
    const system = createTestSystem();
    expect(system.createSLA('unknown', 'UPTIME', 99, 'DAILY')).toBe('service-not-found');
  });

  it('returns invalid-window for unknown window', () => {
    const system = createTestSystem();
    system.registerService('svc');
    // @ts-expect-error - intentionally invalid window for test
    expect(system.createSLA('svc', 'UPTIME', 99, 'YEARLY')).toBe('invalid-window');
  });

  it('returns invalid-target for UPTIME > 100', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.createSLA('svc', 'UPTIME', 150, 'DAILY')).toBe('invalid-target');
  });

  it('returns invalid-target for UPTIME < 0', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.createSLA('svc', 'UPTIME', -1, 'DAILY')).toBe('invalid-target');
  });

  it('returns invalid-target for LATENCY_P99 <= 0', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.createSLA('svc', 'LATENCY_P99', 0, 'DAILY')).toBe('invalid-target');
  });

  it('returns invalid-target for THROUGHPUT <= 0', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.createSLA('svc', 'THROUGHPUT', -5, 'DAILY')).toBe('invalid-target');
  });

  it('accepts all valid windows', () => {
    const system = createTestSystem();
    system.registerService('svc');
    for (const window of ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'] as const) {
      const result = system.createSLA('svc', 'LATENCY_P99', 100, window);
      expect(typeof result).not.toBe('string');
    }
  });
});

// ─── reportMetric ─────────────────────────────────────────────────────────────

describe('reportMetric', () => {
  it('returns service-not-found for unregistered service', () => {
    const system = createTestSystem();
    const result = system.reportMetric('unknown', 'UPTIME', 99);
    expect(result).toEqual({ success: false, error: 'service-not-found' });
  });

  it('updates SLA status to COMPLIANT for good LATENCY_P99', () => {
    const system = createTestSystem();
    system.registerService('svc');
    const sla = system.createSLA('svc', 'LATENCY_P99', 200, 'HOURLY');
    if (typeof sla === 'string') throw new Error('unexpected');
    system.reportMetric('svc', 'LATENCY_P99', 150);
    expect(system.getSLA(sla.slaId)?.status).toBe('COMPLIANT');
  });

  it('updates SLA status to AT_RISK for near-threshold LATENCY_P99', () => {
    const system = createTestSystem();
    system.registerService('svc');
    const sla = system.createSLA('svc', 'LATENCY_P99', 200, 'HOURLY');
    if (typeof sla === 'string') throw new Error('unexpected');
    system.reportMetric('svc', 'LATENCY_P99', 205);
    expect(system.getSLA(sla.slaId)?.status).toBe('AT_RISK');
  });

  it('updates SLA status to VIOLATED for LATENCY_P99 > 105% of target', () => {
    const system = createTestSystem();
    system.registerService('svc');
    const sla = system.createSLA('svc', 'LATENCY_P99', 200, 'HOURLY');
    if (typeof sla === 'string') throw new Error('unexpected');
    system.reportMetric('svc', 'LATENCY_P99', 300);
    expect(system.getSLA(sla.slaId)?.status).toBe('VIOLATED');
  });

  it('emits a violation on first VIOLATED transition', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.createSLA('svc', 'LATENCY_P99', 100, 'HOURLY');
    const result = system.reportMetric('svc', 'LATENCY_P99', 500);
    if (!result.success) throw new Error('unexpected failure');
    expect(result.violations).toHaveLength(1);
  });

  it('does not emit duplicate violation if already VIOLATED', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.createSLA('svc', 'LATENCY_P99', 100, 'HOURLY');
    system.reportMetric('svc', 'LATENCY_P99', 500);
    const second = system.reportMetric('svc', 'LATENCY_P99', 600);
    if (!second.success) throw new Error('unexpected failure');
    expect(second.violations).toHaveLength(0);
  });

  it('handles UPTIME (higher-is-better) correctly', () => {
    const system = createTestSystem();
    system.registerService('svc');
    const sla = system.createSLA('svc', 'UPTIME', 99, 'DAILY');
    if (typeof sla === 'string') throw new Error('unexpected');
    system.reportMetric('svc', 'UPTIME', 95);
    expect(system.getSLA(sla.slaId)?.status).toBe('COMPLIANT');
    system.reportMetric('svc', 'UPTIME', 50);
    expect(system.getSLA(sla.slaId)?.status).toBe('VIOLATED');
  });
});

// ─── getSLAReport ─────────────────────────────────────────────────────────────

describe('getSLAReport', () => {
  it('returns undefined for unregistered service', () => {
    const system = createTestSystem();
    expect(system.getSLAReport('unknown')).toBeUndefined();
  });

  it('returns accurate counts', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.createSLA('svc', 'LATENCY_P99', 100, 'HOURLY');
    system.createSLA('svc', 'UPTIME', 99, 'DAILY');
    system.reportMetric('svc', 'LATENCY_P99', 500);
    const report = system.getSLAReport('svc');
    expect(report?.totalSLAs).toBe(2);
    expect(report?.violated).toBe(1);
    expect(report?.compliant).toBe(1);
  });
});

// ─── listViolations ───────────────────────────────────────────────────────────

describe('listViolations', () => {
  it('returns most recent violations up to limit', () => {
    const system = createTestSystem();
    system.registerService('svc');
    system.createSLA('svc', 'LATENCY_P99', 100, 'HOURLY');
    system.reportMetric('svc', 'LATENCY_P99', 500);
    const violations = system.listViolations('svc', 10);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.metric).toBe('LATENCY_P99');
  });

  it('returns empty for service with no violations', () => {
    const system = createTestSystem();
    system.registerService('svc');
    expect(system.listViolations('svc', 10)).toHaveLength(0);
  });
});
