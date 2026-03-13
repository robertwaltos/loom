/**
 * Simulation tests — alert-manager
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createAlertManagerSystem,
  type AlertManagerSystemDeps,
} from '../alert-manager.js';

let t = BigInt(1_000_000_000);
let seq = 0;

function makeDeps(): AlertManagerSystemDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    idGen: { next: () => `am-${++seq}` },
    logger: { info: vi.fn(), warn: vi.fn() },
  };
}

describe('alert-manager — rule management', () => {
  it('creates and retrieves a rule', () => {
    const sys = createAlertManagerSystem(makeDeps());
    const result = sys.createRule('cpu-high', 'cpu', 80, 'GT', 'HIGH', 0n);
    expect(typeof result).toBe('object');
    if (typeof result === 'string') throw new Error('unexpected error');
    expect(result.metric).toBe('cpu');
    const fetched = sys.getRule(result.ruleId);
    expect(fetched?.name).toBe('cpu-high');
  });

  it('creates a rule with any numeric threshold (no NaN validation in source)', () => {
    const sys = createAlertManagerSystem(makeDeps());
    const result = sys.createRule('bad', 'cpu', -999, 'GT', 'LOW', 0n);
    expect(typeof result).toBe('object');
  });
});

describe('alert-manager — evaluate and alert', () => {
  it('fires an alert when GT threshold is breached', () => {
    const sys = createAlertManagerSystem(makeDeps());
    sys.createRule('cpu-high', 'cpu', 80, 'GT', 'HIGH', 0n);
    const alerts = sys.evaluateMetric('cpu', 90);
    expect(alerts.length).toBe(1);
    expect(alerts[0].status).toBe('FIRING');
  });

  it('does not fire when value is below threshold', () => {
    const sys = createAlertManagerSystem(makeDeps());
    sys.createRule('cpu-high', 'cpu', 80, 'GT', 'HIGH', 0n);
    const alerts = sys.evaluateMetric('cpu', 70);
    expect(alerts.length).toBe(0);
  });

  it('fires correctly for LT operator', () => {
    const sys = createAlertManagerSystem(makeDeps());
    sys.createRule('low-memory', 'mem', 20, 'LT', 'CRITICAL', 0n);
    const alerts = sys.evaluateMetric('mem', 10);
    expect(alerts.length).toBe(1);
  });
});

describe('alert-manager — alert state transitions', () => {
  it('resolves a firing alert', () => {
    const sys = createAlertManagerSystem(makeDeps());
    sys.createRule('r1', 'cpu', 80, 'GT', 'HIGH', 0n);
    const [alert] = sys.evaluateMetric('cpu', 90);
    const res = sys.resolveAlert(alert.alertId);
    expect(res.success).toBe(true);
    expect(sys.getAlert(alert.alertId)?.status).toBe('RESOLVED');
  });

  it('suppresses an alert', () => {
    const sys = createAlertManagerSystem(makeDeps());
    sys.createRule('r1', 'cpu', 80, 'GT', 'HIGH', 0n);
    const [alert] = sys.evaluateMetric('cpu', 90);
    const res = sys.suppressAlert(alert.alertId, 60_000_000n);
    expect(res.success).toBe(true);
    expect(sys.getAlert(alert.alertId)?.status).toBe('SUPPRESSED');
  });

  it('returns error when resolving unknown alert', () => {
    const sys = createAlertManagerSystem(makeDeps());
    const res = sys.resolveAlert('unknown');
    expect(res.success).toBe(false);
  });
});

describe('alert-manager — summary', () => {
  it('reports correct totals', () => {
    const sys = createAlertManagerSystem(makeDeps());
    sys.createRule('r1', 'cpu', 80, 'GT', 'HIGH', 0n);
    sys.evaluateMetric('cpu', 90);
    const s = sys.getSummary();
    expect(s.totalRules).toBe(1);
    expect(s.firingAlerts).toBe(1);
  });
});
