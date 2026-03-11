import { describe, it, expect } from 'vitest';
import { createAlertingEngine } from '../alerting-engine.js';
import type {
  AlertingEngine,
  AlertingDeps,
  AlertRule,
  AlertNotification,
} from '../alerting-engine.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createTestEngine(metrics: Record<string, number> = {}): {
  engine: AlertingEngine;
  advanceTime: (us: number) => void;
  notifications: AlertNotification[];
  setMetric: (name: string, val: number) => void;
} {
  let time = 1_000_000;
  const notifications: AlertNotification[] = [];
  const deps: AlertingDeps = {
    clock: { nowMicroseconds: () => time },
    getMetricValue: (name) => metrics[name],
    onAlert: (n) => {
      notifications.push(n);
    },
  };
  return {
    engine: createAlertingEngine(deps),
    advanceTime: (us: number) => {
      time += us;
    },
    notifications,
    setMetric: (name: string, val: number) => {
      metrics[name] = val;
    },
  };
}

function rule(overrides?: Partial<AlertRule>): AlertRule {
  return {
    name: 'high_latency',
    metricName: 'api.latency_ms',
    severity: 'warning',
    direction: 'above',
    threshold: 500,
    cooldownMicroseconds: 60_000_000,
    description: 'API latency exceeds 500ms',
    ...overrides,
  };
}

// ─── Registration ───────────────────────────────────────────────────

describe('Alerting engine registration', () => {
  it('starts with zero rules', () => {
    const { engine } = createTestEngine();
    expect(engine.ruleCount()).toBe(0);
  });

  it('registers a rule', () => {
    const { engine } = createTestEngine();
    engine.registerRule(rule());
    expect(engine.ruleCount()).toBe(1);
  });

  it('initializes status as pending', () => {
    const { engine } = createTestEngine();
    engine.registerRule(rule());
    const status = engine.getStatus('high_latency');
    expect(status?.state).toBe('pending');
    expect(status?.fireCount).toBe(0);
  });

  it('removes a rule', () => {
    const { engine } = createTestEngine();
    engine.registerRule(rule());
    expect(engine.removeRule('high_latency')).toBe(true);
    expect(engine.ruleCount()).toBe(0);
    expect(engine.getStatus('high_latency')).toBeUndefined();
  });

  it('returns false removing nonexistent rule', () => {
    const { engine } = createTestEngine();
    expect(engine.removeRule('nope')).toBe(false);
  });
});

// ─── Threshold Evaluation ───────────────────────────────────────────

describe('Alerting engine threshold above', () => {
  it('fires when value exceeds threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.registerRule(rule({ direction: 'above', threshold: 500 }));
    setMetric('api.latency_ms', 600);
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.state).toBe('firing');
  });

  it('does not fire when value is at threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.registerRule(rule({ direction: 'above', threshold: 500 }));
    setMetric('api.latency_ms', 500);
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(0);
  });

  it('does not fire when value is below threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.registerRule(rule({ direction: 'above', threshold: 500 }));
    setMetric('api.latency_ms', 200);
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(0);
  });
});

describe('Alerting engine threshold below', () => {
  it('fires when value drops below threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.registerRule(
      rule({
        name: 'low_pop',
        metricName: 'population',
        direction: 'below',
        threshold: 100,
      }),
    );
    setMetric('population', 50);
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(1);
  });

  it('does not fire when value is at threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.registerRule(
      rule({
        name: 'low_pop',
        metricName: 'population',
        direction: 'below',
        threshold: 100,
      }),
    );
    setMetric('population', 100);
    expect(engine.evaluate()).toHaveLength(0);
  });
});

// ─── State Transitions ──────────────────────────────────────────────

describe('Alerting engine state transitions', () => {
  it('transitions from pending to firing', () => {
    const { engine, setMetric } = createTestEngine();
    engine.registerRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    expect(engine.getStatus('high_latency')?.state).toBe('firing');
  });

  it('transitions from firing to resolved', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.registerRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    setMetric('api.latency_ms', 200);
    advanceTime(1000);
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.state).toBe('resolved');
    expect(engine.getStatus('high_latency')?.state).toBe('resolved');
  });

  it('tracks fire count', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.registerRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    setMetric('api.latency_ms', 200);
    advanceTime(1000);
    engine.evaluate();
    setMetric('api.latency_ms', 700);
    advanceTime(1000);
    engine.evaluate();
    expect(engine.getStatus('high_latency')?.fireCount).toBe(2);
  });
});

// ─── Cooldown ───────────────────────────────────────────────────────

describe('Alerting engine cooldown', () => {
  it('suppresses re-notification during cooldown', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.registerRule(rule({ cooldownMicroseconds: 60_000_000 }));
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    advanceTime(30_000_000);
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(0);
  });

  it('re-notifies after cooldown expires', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.registerRule(rule({ cooldownMicroseconds: 60_000_000 }));
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    advanceTime(61_000_000);
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.state).toBe('firing');
  });
});

// ─── Callback ───────────────────────────────────────────────────────

describe('Alerting engine callback', () => {
  it('invokes onAlert callback for each notification', () => {
    const { engine, setMetric, notifications } = createTestEngine();
    engine.registerRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.ruleName).toBe('high_latency');
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('Alerting engine queries', () => {
  it('returns all statuses', () => {
    const { engine } = createTestEngine();
    engine.registerRule(rule({ name: 'a', metricName: 'x' }));
    engine.registerRule(rule({ name: 'b', metricName: 'y' }));
    expect(engine.getAllStatuses()).toHaveLength(2);
  });

  it('returns only firing alerts', () => {
    const { engine, setMetric } = createTestEngine();
    engine.registerRule(rule({ name: 'a', metricName: 'x', threshold: 100 }));
    engine.registerRule(rule({ name: 'b', metricName: 'y', threshold: 100 }));
    setMetric('x', 200);
    setMetric('y', 50);
    engine.evaluate();
    const firing = engine.getFiringAlerts();
    expect(firing).toHaveLength(1);
    expect(firing[0]?.name).toBe('a');
  });

  it('skips metric when value is undefined', () => {
    const { engine } = createTestEngine();
    engine.registerRule(rule({ metricName: 'nonexistent' }));
    const alerts = engine.evaluate();
    expect(alerts).toHaveLength(0);
  });
});
