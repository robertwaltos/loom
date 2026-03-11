import { describe, it, expect } from 'vitest';
import { createAlertEngine } from '../alert-engine.js';
import type {
  AlertEngine,
  AlertEngineDeps,
  AlertEngineRule,
  AlertDispatch,
} from '../alert-engine.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createTestEngine(metrics: Record<string, number> = {}): {
  engine: AlertEngine;
  advanceTime: (ms: number) => void;
  dispatches: AlertDispatch[];
  setMetric: (name: string, val: number) => void;
} {
  let time = 1000;
  let idCounter = 0;
  const dispatches: AlertDispatch[] = [];
  const deps: AlertEngineDeps = {
    clock: { nowMilliseconds: () => time },
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'alert-' + String(idCounter);
      },
    },
    getMetricValue: (name) => metrics[name],
    onDispatch: (d) => {
      dispatches.push(d);
    },
  };
  return {
    engine: createAlertEngine(deps),
    advanceTime: (ms: number) => {
      time += ms;
    },
    dispatches,
    setMetric: (name: string, val: number) => {
      metrics[name] = val;
    },
  };
}

function rule(overrides?: Partial<AlertEngineRule>): AlertEngineRule {
  return {
    ruleId: 'high_latency',
    metricName: 'api.latency_ms',
    kind: 'threshold',
    severity: 'warning',
    direction: 'above',
    threshold: 500,
    cooldownMs: 60000,
    groupKey: 'performance',
    description: 'API latency exceeds 500ms',
    ...overrides,
  };
}

// ─── Rule Management ────────────────────────────────────────────────

describe('Alert engine rule management', () => {
  it('starts with zero rules', () => {
    const { engine } = createTestEngine();
    expect(engine.ruleCount()).toBe(0);
  });

  it('adds a rule', () => {
    const { engine } = createTestEngine();
    engine.addRule(rule());
    expect(engine.ruleCount()).toBe(1);
  });

  it('removes a rule', () => {
    const { engine } = createTestEngine();
    engine.addRule(rule());
    expect(engine.removeRule('high_latency')).toBe(true);
    expect(engine.ruleCount()).toBe(0);
  });

  it('returns false removing nonexistent rule', () => {
    const { engine } = createTestEngine();
    expect(engine.removeRule('nope')).toBe(false);
  });
});

// ─── Threshold Evaluation ───────────────────────────────────────────

describe('Alert engine threshold evaluation', () => {
  it('fires when value exceeds threshold (above)', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    const dispatches = engine.evaluate();
    expect(dispatches).toHaveLength(1);
    expect(dispatches[0]?.state).toBe('active');
  });

  it('does not fire when value is at threshold', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 500);
    expect(engine.evaluate()).toHaveLength(0);
  });

  it('fires when value drops below threshold (below direction)', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(
      rule({
        ruleId: 'low_pop',
        metricName: 'population',
        direction: 'below',
        threshold: 100,
      }),
    );
    setMetric('population', 50);
    expect(engine.evaluate()).toHaveLength(1);
  });

  it('does not fire for missing metric', () => {
    const { engine } = createTestEngine();
    engine.addRule(rule({ metricName: 'nonexistent' }));
    expect(engine.evaluate()).toHaveLength(0);
  });
});

// ─── Alert State Lifecycle ──────────────────────────────────────────

describe('Alert engine state lifecycle', () => {
  it('creates active alert on breach', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alerts = engine.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.state).toBe('active');
  });

  it('auto-resolves when value returns to normal', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    setMetric('api.latency_ms', 200);
    advanceTime(1);
    const dispatches = engine.evaluate();
    expect(dispatches).toHaveLength(1);
    expect(dispatches[0]?.state).toBe('resolved');
  });

  it('acknowledges an active alert', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alerts = engine.getActiveAlerts();
    const alertId = alerts[0]?.alertId ?? '';
    expect(engine.acknowledge(alertId)).toBe(true);
    const ack = engine.getAlert(alertId);
    expect(ack?.state).toBe('acknowledged');
  });

  it('cannot acknowledge non-active alert', () => {
    const { engine } = createTestEngine();
    expect(engine.acknowledge('nonexistent')).toBe(false);
  });

  it('manually resolves an alert', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alertId = engine.getActiveAlerts()[0]?.alertId ?? '';
    expect(engine.resolve(alertId)).toBe(true);
    expect(engine.getAlert(alertId)?.state).toBe('resolved');
  });
});

// ─── Silencing ──────────────────────────────────────────────────────

describe('Alert engine silencing', () => {
  it('silences an active alert', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alertId = engine.getActiveAlerts()[0]?.alertId ?? '';
    expect(engine.silence(alertId, 60000)).toBe(true);
    expect(engine.getAlert(alertId)?.state).toBe('silenced');
  });

  it('silenced alert suppresses dispatches', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.addRule(rule({ cooldownMs: 1000 }));
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alertId = engine.getActiveAlerts()[0]?.alertId ?? '';
    engine.silence(alertId, 60000);
    advanceTime(2000);
    const dispatches = engine.evaluate();
    expect(dispatches).toHaveLength(0);
  });

  it('reactivates after silence expires', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.addRule(rule({ cooldownMs: 1000 }));
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alertId = engine.getActiveAlerts()[0]?.alertId ?? '';
    engine.silence(alertId, 5000);
    advanceTime(6000);
    const dispatches = engine.evaluate();
    expect(dispatches).toHaveLength(1);
    expect(engine.getAlert(alertId)?.state).toBe('active');
  });

  it('cannot silence already resolved alert', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alertId = engine.getActiveAlerts()[0]?.alertId ?? '';
    engine.resolve(alertId);
    expect(engine.silence(alertId, 5000)).toBe(false);
  });
});

// ─── Cooldown ───────────────────────────────────────────────────────

describe('Alert engine cooldown', () => {
  it('suppresses re-notification during cooldown', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.addRule(rule({ cooldownMs: 60000 }));
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    advanceTime(30000);
    expect(engine.evaluate()).toHaveLength(0);
  });

  it('re-notifies after cooldown expires', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.addRule(rule({ cooldownMs: 60000 }));
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    advanceTime(61000);
    expect(engine.evaluate()).toHaveLength(1);
  });
});

// ─── Grouping ───────────────────────────────────────────────────────

describe('Alert engine grouping', () => {
  it('groups alerts by group key', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule({ ruleId: 'a', metricName: 'x', groupKey: 'perf' }));
    engine.addRule(rule({ ruleId: 'b', metricName: 'y', groupKey: 'perf' }));
    engine.addRule(rule({ ruleId: 'c', metricName: 'z', groupKey: 'other' }));
    setMetric('x', 600);
    setMetric('y', 600);
    setMetric('z', 600);
    engine.evaluate();
    const perfGroup = engine.getAlertsByGroup('perf');
    expect(perfGroup).toHaveLength(2);
    const otherGroup = engine.getAlertsByGroup('other');
    expect(otherGroup).toHaveLength(1);
  });
});

// ─── History ────────────────────────────────────────────────────────

describe('Alert engine history', () => {
  it('records history entries on state transitions', () => {
    const { engine, setMetric, advanceTime } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    setMetric('api.latency_ms', 200);
    advanceTime(1);
    engine.evaluate();
    const history = engine.getHistory(10);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0]?.toState).toBe('active');
    expect(history[1]?.toState).toBe('resolved');
  });

  it('records acknowledge in history', () => {
    const { engine, setMetric } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    const alertId = engine.getActiveAlerts()[0]?.alertId ?? '';
    engine.acknowledge(alertId);
    const history = engine.getHistory(10);
    const ackEntry = history.find((h) => h.toState === 'acknowledged');
    expect(ackEntry).toBeDefined();
  });
});

// ─── Dispatch Callback ──────────────────────────────────────────────

describe('Alert engine dispatch callback', () => {
  it('invokes onDispatch for each notification', () => {
    const { engine, setMetric, dispatches } = createTestEngine();
    engine.addRule(rule());
    setMetric('api.latency_ms', 600);
    engine.evaluate();
    expect(dispatches).toHaveLength(1);
  });
});
