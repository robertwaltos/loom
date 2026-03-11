/**
 * Policy Enforcer Tests
 * Fabric: dye-house
 */

import { describe, it, expect } from 'vitest';
import { createPolicyEnforcerSystem } from '../policy-enforcer.js';
import type { PolicyCondition } from '../policy-enforcer.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem() {
  return createPolicyEnforcerSystem({
    clock: { nowMicroseconds: () => 1_000_000n },
    idGen: { next: () => 'rule-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

const equalsCondition = (field: string, value: string): PolicyCondition => ({
  field,
  operator: 'EQUALS',
  value,
});

// ─── createRule ───────────────────────────────────────────────────────────────

describe('createRule', () => {
  it('creates a rule and returns it', () => {
    const system = createTestSystem();
    const result = system.createRule(
      'block-bad-ip',
      10,
      [equalsCondition('ip', '1.2.3.4')],
      'DENY',
    );
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.name).toBe('block-bad-ip');
      expect(result.priority).toBe(10);
      expect(result.effect).toBe('DENY');
      expect(result.active).toBe(true);
    }
  });

  it('returns invalid-condition for empty conditions array', () => {
    const system = createTestSystem();
    const result = system.createRule('empty', 1, [], 'DENY');
    expect(result).toBe('invalid-condition');
  });

  it('assigns a ruleId', () => {
    const system = createTestSystem();
    const result = system.createRule('r', 1, [equalsCondition('x', 'y')], 'ALLOW');
    if (typeof result !== 'string') {
      expect(result.ruleId).toBeTruthy();
    }
  });

  it('stores createdAt timestamp', () => {
    const system = createTestSystem();
    const result = system.createRule('r', 1, [equalsCondition('x', 'y')], 'LOG');
    if (typeof result !== 'string') {
      expect(result.createdAt).toBe(1_000_000n);
    }
  });
});

// ─── deactivateRule ───────────────────────────────────────────────────────────

describe('deactivateRule', () => {
  it('deactivates an existing rule', () => {
    const system = createTestSystem();
    const rule = system.createRule('r', 1, [equalsCondition('x', 'y')], 'DENY');
    if (typeof rule === 'string') throw new Error('unexpected error');
    const result = system.deactivateRule(rule.ruleId);
    expect(result).toEqual({ success: true });
    expect(system.getRule(rule.ruleId)?.active).toBe(false);
  });

  it('returns rule-not-found for unknown ruleId', () => {
    const system = createTestSystem();
    const result = system.deactivateRule('nonexistent');
    expect(result).toEqual({ success: false, error: 'rule-not-found' });
  });

  it('deactivated rule is excluded from evaluations', () => {
    const system = createTestSystem();
    const rule = system.createRule('deny-all', 1, [equalsCondition('ip', '1.2.3.4')], 'DENY');
    if (typeof rule === 'string') throw new Error('unexpected error');
    system.deactivateRule(rule.ruleId);
    const result = system.evaluateRequest({ ip: '1.2.3.4' });
    expect(result.effect).toBe('ALLOW');
    expect(result.matchedRule).toBe(false);
  });
});

// ─── evaluateRequest ──────────────────────────────────────────────────────────

describe('evaluateRequest — EQUALS condition', () => {
  it('matches EQUALS condition and returns DENY', () => {
    const system = createTestSystem();
    system.createRule('block', 1, [equalsCondition('ip', '1.2.3.4')], 'DENY');
    const result = system.evaluateRequest({ ip: '1.2.3.4' });
    expect(result.effect).toBe('DENY');
    expect(result.matchedRule).toBe(true);
  });

  it('does not match EQUALS when value differs', () => {
    const system = createTestSystem();
    system.createRule('block', 1, [equalsCondition('ip', '1.2.3.4')], 'DENY');
    const result = system.evaluateRequest({ ip: '9.9.9.9' });
    expect(result.effect).toBe('ALLOW');
    expect(result.matchedRule).toBe(false);
  });

  it('defaults to ALLOW when no rules match', () => {
    const system = createTestSystem();
    const result = system.evaluateRequest({ role: 'user' });
    expect(result.effect).toBe('ALLOW');
    expect(result.ruleId).toBeNull();
  });
});

describe('evaluateRequest — other operators', () => {
  it('matches NOT_EQUALS', () => {
    const system = createTestSystem();
    system.createRule(
      'challenge-non-admin',
      1,
      [{ field: 'role', operator: 'NOT_EQUALS', value: 'admin' }],
      'CHALLENGE',
    );
    const result = system.evaluateRequest({ role: 'user' });
    expect(result.effect).toBe('CHALLENGE');
  });

  it('matches CONTAINS', () => {
    const system = createTestSystem();
    system.createRule(
      'log-path',
      1,
      [{ field: 'path', operator: 'CONTAINS', value: 'admin' }],
      'LOG',
    );
    const result = system.evaluateRequest({ path: '/api/admin/users' });
    expect(result.effect).toBe('LOG');
  });

  it('matches STARTS_WITH', () => {
    const system = createTestSystem();
    system.createRule('api', 1, [{ field: 'path', operator: 'STARTS_WITH', value: '/api' }], 'LOG');
    const result = system.evaluateRequest({ path: '/api/v2/data' });
    expect(result.effect).toBe('LOG');
  });

  it('matches GREATER_THAN', () => {
    const system = createTestSystem();
    system.createRule(
      'rate',
      1,
      [{ field: 'count', operator: 'GREATER_THAN', value: '100' }],
      'DENY',
    );
    const result = system.evaluateRequest({ count: '150' });
    expect(result.effect).toBe('DENY');
  });

  it('matches LESS_THAN', () => {
    const system = createTestSystem();
    system.createRule(
      'low',
      1,
      [{ field: 'score', operator: 'LESS_THAN', value: '10' }],
      'CHALLENGE',
    );
    const result = system.evaluateRequest({ score: '5' });
    expect(result.effect).toBe('CHALLENGE');
  });

  it('missing field causes condition not to match', () => {
    const system = createTestSystem();
    system.createRule('block', 1, [equalsCondition('ip', '1.2.3.4')], 'DENY');
    const result = system.evaluateRequest({ role: 'user' });
    expect(result.effect).toBe('ALLOW');
  });
});

describe('evaluateRequest — priority ordering', () => {
  it('applies lowest-priority-number rule first', () => {
    const system = createTestSystem();
    system.createRule('high-prio', 1, [equalsCondition('x', 'y')], 'DENY');
    system.createRule('low-prio', 100, [equalsCondition('x', 'y')], 'ALLOW');
    const result = system.evaluateRequest({ x: 'y' });
    expect(result.effect).toBe('DENY');
  });

  it('AND logic: all conditions must match', () => {
    const system = createTestSystem();
    system.createRule(
      'multi',
      1,
      [equalsCondition('role', 'admin'), equalsCondition('ip', '1.2.3.4')],
      'DENY',
    );
    const partial = system.evaluateRequest({ role: 'admin', ip: '9.9.9.9' });
    expect(partial.effect).toBe('ALLOW');
    const full = system.evaluateRequest({ role: 'admin', ip: '1.2.3.4' });
    expect(full.effect).toBe('DENY');
  });
});

// ─── listRules ────────────────────────────────────────────────────────────────

describe('listRules', () => {
  it('lists all rules without filter', () => {
    const system = createTestSystem();
    system.createRule('r1', 1, [equalsCondition('x', 'y')], 'ALLOW');
    system.createRule('r2', 2, [equalsCondition('x', 'z')], 'DENY');
    expect(system.listRules()).toHaveLength(2);
  });

  it('filters to active rules only', () => {
    const system = createTestSystem();
    const r1 = system.createRule('r1', 1, [equalsCondition('x', 'y')], 'ALLOW');
    system.createRule('r2', 2, [equalsCondition('x', 'z')], 'DENY');
    if (typeof r1 !== 'string') system.deactivateRule(r1.ruleId);
    expect(system.listRules(true)).toHaveLength(1);
    expect(system.listRules(false)).toHaveLength(1);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks evaluations, allow, and deny counts', () => {
    const system = createTestSystem();
    system.createRule('block', 1, [equalsCondition('x', 'y')], 'DENY');
    system.evaluateRequest({ x: 'y' });
    system.evaluateRequest({ x: 'other' });
    const stats = system.getStats();
    expect(stats.evaluations).toBe(2);
    expect(stats.denyCount).toBe(1);
    expect(stats.allowCount).toBe(1);
    expect(stats.totalRules).toBe(1);
  });

  it('starts with zero counts', () => {
    const system = createTestSystem();
    const stats = system.getStats();
    expect(stats.evaluations).toBe(0);
    expect(stats.denyCount).toBe(0);
    expect(stats.allowCount).toBe(0);
  });
});
