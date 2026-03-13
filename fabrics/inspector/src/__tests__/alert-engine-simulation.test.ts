/**
 * Simulation tests — alert-engine
 *
 * Tests the AlertEngine lifecycle: add rules, evaluate metrics,
 * acknowledge/silence/resolve alerts, and inspect history.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createAlertEngine,
  type AlertEngineDeps,
  type AlertEngineRule,
} from '../alert-engine.js';

function makeDeps(): AlertEngineDeps {
  let t = 1_000_000;
  let idSeq = 0;
  const dispatches: unknown[] = [];
  return {
    clock: { nowMilliseconds: () => t++ },
    idGenerator: { next: () => `ae-${++idSeq}` },
    getMetricValue: vi.fn().mockReturnValue(undefined),
    onDispatch: vi.fn((d) => dispatches.push(d)),
  };
}

function rule(overrides: Partial<AlertEngineRule> = {}): AlertEngineRule {
  return {
    ruleId: 'r1',
    metricName: 'cpu',
    kind: 'threshold',
    severity: 'warning',
    direction: 'above',
    threshold: 80,
    cooldownMs: 0,
    groupKey: 'infra',
    description: 'CPU high',
    ...overrides,
  };
}

describe('alert-engine — rule lifecycle', () => {
  it('starts with zero rules', () => {
    const eng = createAlertEngine(makeDeps());
    expect(eng.ruleCount()).toBe(0);
    expect(eng.alertCount()).toBe(0);
  });

  it('adds and removes a rule', () => {
    const eng = createAlertEngine(makeDeps());
    eng.addRule(rule());
    expect(eng.ruleCount()).toBe(1);
    expect(eng.removeRule('r1')).toBe(true);
    expect(eng.ruleCount()).toBe(0);
  });

  it('returns false when removing an unknown rule', () => {
    const eng = createAlertEngine(makeDeps());
    expect(eng.removeRule('nope')).toBe(false);
  });
});

describe('alert-engine — evaluate', () => {
  it('fires an alert when the metric exceeds threshold', () => {
    const deps = makeDeps();
    (deps.getMetricValue as ReturnType<typeof vi.fn>).mockReturnValue(95);
    const eng = createAlertEngine(deps);
    eng.addRule(rule());
    const dispatches = eng.evaluate();
    expect(dispatches.length).toBeGreaterThanOrEqual(1);
    expect(eng.alertCount()).toBeGreaterThanOrEqual(1);
  });

  it('does not fire when metric is below threshold (above-direction rule)', () => {
    const deps = makeDeps();
    (deps.getMetricValue as ReturnType<typeof vi.fn>).mockReturnValue(50);
    const eng = createAlertEngine(deps);
    eng.addRule(rule());
    const dispatches = eng.evaluate();
    expect(dispatches.length).toBe(0);
    expect(eng.alertCount()).toBe(0);
  });

  it('does not fire when metric is not available', () => {
    const deps = makeDeps();
    (deps.getMetricValue as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const eng = createAlertEngine(deps);
    eng.addRule(rule());
    const dispatches = eng.evaluate();
    expect(dispatches.length).toBe(0);
  });
});

describe('alert-engine — alert state management', () => {
  it('acknowledges an active alert', () => {
    const deps = makeDeps();
    (deps.getMetricValue as ReturnType<typeof vi.fn>).mockReturnValue(95);
    const eng = createAlertEngine(deps);
    eng.addRule(rule());
    eng.evaluate();
    const activeAlerts = eng.getActiveAlerts();
    expect(activeAlerts.length).toBeGreaterThanOrEqual(1);
    const alertId = activeAlerts[0].alertId;
    expect(eng.acknowledge(alertId)).toBe(true);
    const updated = eng.getAlert(alertId);
    expect(updated?.state).toBe('acknowledged');
  });

  it('resolves an active alert', () => {
    const deps = makeDeps();
    (deps.getMetricValue as ReturnType<typeof vi.fn>).mockReturnValue(95);
    const eng = createAlertEngine(deps);
    eng.addRule(rule());
    eng.evaluate();
    const alertId = eng.getActiveAlerts()[0].alertId;
    expect(eng.resolve(alertId)).toBe(true);
    const updated = eng.getAlert(alertId);
    expect(updated?.state).toBe('resolved');
  });

  it('groups alerts by groupKey', () => {
    const deps = makeDeps();
    (deps.getMetricValue as ReturnType<typeof vi.fn>).mockReturnValue(95);
    const eng = createAlertEngine(deps);
    eng.addRule(rule());
    eng.evaluate();
    const grouped = eng.getAlertsByGroup('infra');
    expect(grouped.length).toBeGreaterThanOrEqual(1);
  });

  it('returns history entries', () => {
    const deps = makeDeps();
    (deps.getMetricValue as ReturnType<typeof vi.fn>).mockReturnValue(95);
    const eng = createAlertEngine(deps);
    eng.addRule(rule());
    eng.evaluate();
    const history = eng.getHistory(10);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });
});
