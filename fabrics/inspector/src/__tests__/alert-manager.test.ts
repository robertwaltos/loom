import { describe, it, expect } from 'vitest';
import { createAlertManagerSystem } from '../alert-manager.js';
import type { AlertManagerSystem, AlertRule, Alert } from '../alert-manager.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): {
  system: AlertManagerSystem;
  advanceTime: (us: bigint) => void;
} {
  let now = 1_000_000n;
  return {
    system: createAlertManagerSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'id-' + String(++idCounter) },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
    }),
    advanceTime(us: bigint) {
      now += us;
    },
  };
}

function makeRule(system: AlertManagerSystem, overrides?: Partial<AlertRule>): AlertRule {
  const result = system.createRule(
    overrides?.name ?? 'High Latency',
    overrides?.metric ?? 'api.latency',
    overrides?.threshold ?? 500,
    overrides?.operator ?? 'GT',
    overrides?.severity ?? 'HIGH',
    overrides?.cooldownUs ?? 60_000_000n,
  );
  if (typeof result === 'string') throw new Error('createRule failed: ' + result);
  return result;
}

function firstAlert(alerts: ReadonlyArray<Alert>): Alert {
  const a = alerts[0];
  if (a === undefined) throw new Error('No alerts in result');
  return a;
}

// ─── createRule ───────────────────────────────────────────────────────────────

describe('createRule', () => {
  it('creates a rule with correct fields', () => {
    const { system } = createTestSystem();
    const rule = makeRule(system);
    expect(rule.name).toBe('High Latency');
    expect(rule.metric).toBe('api.latency');
    expect(rule.threshold).toBe(500);
    expect(rule.operator).toBe('GT');
    expect(rule.severity).toBe('HIGH');
    expect(rule.lastFiredAt).toBeNull();
  });

  it('accepts all four operators', () => {
    const { system } = createTestSystem();
    for (const op of ['GT', 'LT', 'GTE', 'LTE'] as const) {
      const result = system.createRule('r', 'metric', 0, op, 'LOW', 0n);
      expect(typeof result).not.toBe('string');
    }
  });
});

// ─── evaluateMetric — GT/LT/GTE/LTE ─────────────────────────────────────────

describe('evaluateMetric — operators', () => {
  it('fires an alert when GT condition is met', () => {
    const { system } = createTestSystem();
    makeRule(system, { operator: 'GT', threshold: 100, metric: 'cpu' });
    const alerts = system.evaluateMetric('cpu', 150);
    expect(alerts.length).toBe(1);
    expect(alerts[0]?.status).toBe('FIRING');
    expect(alerts[0]?.value).toBe(150);
  });

  it('fires when LT condition is met', () => {
    const { system } = createTestSystem();
    makeRule(system, { operator: 'LT', threshold: 50, metric: 'health' });
    expect(system.evaluateMetric('health', 30).length).toBe(1);
  });

  it('fires when GTE condition is met exactly', () => {
    const { system } = createTestSystem();
    makeRule(system, { operator: 'GTE', threshold: 100, metric: 'cpu' });
    expect(system.evaluateMetric('cpu', 100).length).toBe(1);
  });

  it('fires when LTE condition is met exactly', () => {
    const { system } = createTestSystem();
    makeRule(system, { operator: 'LTE', threshold: 10, metric: 'score' });
    expect(system.evaluateMetric('score', 10).length).toBe(1);
  });

  it('does not fire when condition is not met', () => {
    const { system } = createTestSystem();
    makeRule(system, { operator: 'GT', threshold: 100, metric: 'cpu' });
    expect(system.evaluateMetric('cpu', 50).length).toBe(0);
  });

  it('does not fire on a different metric', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    expect(system.evaluateMetric('memory', 999).length).toBe(0);
  });
});

// ─── evaluateMetric — cooldown ────────────────────────────────────────────────

describe('evaluateMetric — cooldown', () => {
  it('does not re-fire within cooldown period', () => {
    const { system, advanceTime } = createTestSystem();
    makeRule(system, { metric: 'cpu', cooldownUs: 5_000_000n });
    system.evaluateMetric('cpu', 999);
    advanceTime(1_000_000n); // 1s < 5s cooldown
    expect(system.evaluateMetric('cpu', 999).length).toBe(0);
  });

  it('re-fires after cooldown expires', () => {
    const { system, advanceTime } = createTestSystem();
    makeRule(system, { metric: 'cpu', cooldownUs: 5_000_000n });
    system.evaluateMetric('cpu', 999);
    advanceTime(6_000_000n); // 6s > 5s cooldown
    expect(system.evaluateMetric('cpu', 999).length).toBe(1);
  });

  it('evaluates all matching rules for the same metric', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu', operator: 'GT', threshold: 50 });
    makeRule(system, { metric: 'cpu', operator: 'GT', threshold: 80 });
    expect(system.evaluateMetric('cpu', 90).length).toBe(2);
  });
});

// ─── resolveAlert ────────────────────────────────────────────────────────────

describe('resolveAlert', () => {
  it('resolves a firing alert', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    expect(system.resolveAlert(alertId)).toEqual({ success: true });
    expect(system.getAlert(alertId)?.status).toBe('RESOLVED');
  });

  it('returns alert-not-found for unknown id', () => {
    const { system } = createTestSystem();
    expect(system.resolveAlert('bad-id')).toEqual({ success: false, error: 'alert-not-found' });
  });

  it('sets resolvedAt on successful resolve', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    system.resolveAlert(alertId);
    expect(system.getAlert(alertId)?.resolvedAt).not.toBeNull();
  });
});

// ─── suppressAlert ───────────────────────────────────────────────────────────

describe('suppressAlert', () => {
  it('suppresses a firing alert', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    expect(system.suppressAlert(alertId, 60_000_000n)).toEqual({ success: true });
    expect(system.getAlert(alertId)?.status).toBe('SUPPRESSED');
  });

  it('returns already-suppressed if already suppressed', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    system.suppressAlert(alertId, 60_000_000n);
    expect(system.suppressAlert(alertId, 60_000_000n)).toEqual({
      success: false,
      error: 'already-suppressed',
    });
  });

  it('sets suppressedUntil correctly', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    system.suppressAlert(alertId, 1_000_000n);
    expect((system.getAlert(alertId)?.suppressedUntil ?? 0n) > 0n).toBe(true);
  });

  it('returns alert-not-found for unknown id', () => {
    const { system } = createTestSystem();
    expect(system.suppressAlert('nope', 1_000n)).toEqual({
      success: false,
      error: 'alert-not-found',
    });
  });
});

// ─── listAlerts ──────────────────────────────────────────────────────────────

describe('listAlerts', () => {
  it('lists all alerts when no filter given', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    system.evaluateMetric('cpu', 999);
    expect(system.listAlerts().length).toBeGreaterThan(0);
  });

  it('filters by FIRING status', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    system.resolveAlert(alertId);
    expect(system.listAlerts('FIRING').length).toBe(0);
    expect(system.listAlerts('RESOLVED').length).toBe(1);
  });
});

// ─── getSummary ──────────────────────────────────────────────────────────────

describe('getSummary', () => {
  it('returns correct counts after resolving', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    system.resolveAlert(alertId);
    const summary = system.getSummary();
    expect(summary.totalRules).toBe(1);
    expect(summary.resolvedAlerts).toBe(1);
    expect(summary.firingAlerts).toBe(0);
  });

  it('counts suppressed alerts correctly', () => {
    const { system } = createTestSystem();
    makeRule(system, { metric: 'cpu' });
    const alertId = firstAlert(system.evaluateMetric('cpu', 999)).alertId;
    system.suppressAlert(alertId, 60_000_000n);
    expect(system.getSummary().suppressedAlerts).toBe(1);
  });
});

// ─── getRule ─────────────────────────────────────────────────────────────────

describe('getRule', () => {
  it('retrieves a rule by id', () => {
    const { system } = createTestSystem();
    const rule = makeRule(system);
    expect(system.getRule(rule.ruleId)).toEqual(rule);
  });

  it('returns undefined for unknown id', () => {
    const { system } = createTestSystem();
    expect(system.getRule('nope')).toBeUndefined();
  });
});
