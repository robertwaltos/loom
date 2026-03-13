/**
 * Simulation tests — alerting-engine
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createAlertingEngine,
  type AlertingDeps,
  type AlertRule,
} from '../alerting-engine.js';

function makeDeps(getValue: (metric: string) => number | undefined = () => undefined): AlertingDeps {
  let t = 1_000_000;
  return {
    clock: { nowMicroseconds: () => t++ },
    getMetricValue: getValue,
    onAlert: vi.fn(),
  };
}

function rule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    name: 'cpu-high',
    metricName: 'cpu',
    threshold: 80,
    direction: 'above',
    severity: 'warning',
    cooldownMicroseconds: 0,
    ...overrides,
  };
}

describe('alerting-engine — rule management', () => {
  it('starts with zero rules', () => {
    const eng = createAlertingEngine(makeDeps());
    expect(eng.ruleCount()).toBe(0);
  });

  it('registers and removes rules', () => {
    const eng = createAlertingEngine(makeDeps());
    eng.registerRule(rule());
    expect(eng.ruleCount()).toBe(1);
    expect(eng.removeRule('cpu-high')).toBe(true);
    expect(eng.ruleCount()).toBe(0);
  });

  it('returns false removing unknown rule', () => {
    const eng = createAlertingEngine(makeDeps());
    expect(eng.removeRule('nope')).toBe(false);
  });
});

describe('alerting-engine — evaluate', () => {
  it('fires when metric exceeds threshold', () => {
    const eng = createAlertingEngine(makeDeps(() => 95));
    eng.registerRule(rule());
    const notifications = eng.evaluate();
    expect(notifications.length).toBe(1);
    expect(notifications[0].severity).toBe('warning');
  });

  it('does not fire when metric is within bounds', () => {
    const eng = createAlertingEngine(makeDeps(() => 50));
    eng.registerRule(rule());
    const notifications = eng.evaluate();
    expect(notifications.length).toBe(0);
  });

  it('fires for below-direction rule', () => {
    const eng = createAlertingEngine(makeDeps(() => 5));
    eng.registerRule(rule({ name: 'mem-low', metricName: 'mem', threshold: 10, direction: 'below', severity: 'critical' }));
    const notifications = eng.evaluate();
    expect(notifications.length).toBe(1);
    expect(notifications[0].severity).toBe('critical');
  });
});

describe('alerting-engine — status', () => {
  it('returns undefined status for unregistered metric', () => {
    const eng = createAlertingEngine(makeDeps());
    expect(eng.getStatus('cpu')).toBeUndefined();
  });

  it('getAllStatuses returns all registered rule statuses after evaluate', () => {
    const eng = createAlertingEngine(makeDeps(() => 90));
    eng.registerRule(rule());
    eng.evaluate();
    const statuses = eng.getAllStatuses();
    expect(statuses.length).toBe(1);
  });

  it('getFiringAlerts returns only firing rules', () => {
    const eng = createAlertingEngine(makeDeps(() => 95));
    eng.registerRule(rule());
    eng.registerRule(rule({ name: 'disk', metricName: 'disk', threshold: 90, direction: 'above', severity: 'critical', cooldownMicroseconds: 0 }));
    eng.evaluate();
    const firing = eng.getFiringAlerts();
    expect(firing.length).toBeGreaterThanOrEqual(1);
  });
});
