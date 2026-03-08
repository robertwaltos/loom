import { describe, it, expect } from 'vitest';
import { createPermissionPolicyEngine } from '../permission-policy.js';
import type { PermissionPolicyDeps } from '../permission-policy.js';

function makeDeps(): PermissionPolicyDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'pol-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('PermissionPolicyEngine — policy management', () => {
  it('adds a policy', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    const policy = engine.addPolicy({
      name: 'allow-read', effect: 'allow', resourcePattern: '*', action: 'read',
    });
    expect(policy.policyId).toBe('pol-1');
    expect(policy.effect).toBe('allow');
  });

  it('removes a policy', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    const policy = engine.addPolicy({
      name: 'temp', effect: 'allow', resourcePattern: '*', action: 'read',
    });
    expect(engine.removePolicy(policy.policyId)).toBe(true);
    expect(engine.getPolicy(policy.policyId)).toBeUndefined();
  });

  it('lists all policies', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({ name: 'a', effect: 'allow', resourcePattern: '*', action: 'read' });
    engine.addPolicy({ name: 'b', effect: 'deny', resourcePattern: '*', action: 'delete' });
    expect(engine.listPolicies()).toHaveLength(2);
  });
});

describe('PermissionPolicyEngine — basic evaluation', () => {
  it('allows when matching allow policy exists', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({ name: 'allow-all', effect: 'allow', resourcePattern: '*', action: '*' });
    const result = engine.evaluate({
      subjectAttributes: { role: 'admin' },
      resource: 'entity/123',
      action: 'read',
    });
    expect(result.decision).toBe('allowed');
  });

  it('denies by default when no policies match', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    const result = engine.evaluate({
      subjectAttributes: { role: 'guest' },
      resource: 'entity/123',
      action: 'read',
    });
    expect(result.decision).toBe('denied');
  });

  it('deny takes precedence over allow', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({ name: 'allow', effect: 'allow', resourcePattern: '*', action: 'read' });
    engine.addPolicy({ name: 'deny', effect: 'deny', resourcePattern: '*', action: 'read' });
    const result = engine.evaluate({
      subjectAttributes: {}, resource: 'x', action: 'read',
    });
    expect(result.decision).toBe('denied');
  });
});

describe('PermissionPolicyEngine — resource matching', () => {
  it('matches exact resource', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'exact', effect: 'allow', resourcePattern: 'world/earth', action: 'read',
    });
    const result = engine.evaluate({
      subjectAttributes: {}, resource: 'world/earth', action: 'read',
    });
    expect(result.decision).toBe('allowed');
  });

  it('matches wildcard prefix', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'prefix', effect: 'allow', resourcePattern: 'world/*', action: 'read',
    });
    const result = engine.evaluate({
      subjectAttributes: {}, resource: 'world/mars', action: 'read',
    });
    expect(result.decision).toBe('allowed');
  });

  it('rejects non-matching resource', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'exact', effect: 'allow', resourcePattern: 'world/earth', action: 'read',
    });
    const result = engine.evaluate({
      subjectAttributes: {}, resource: 'world/mars', action: 'read',
    });
    expect(result.decision).toBe('denied');
  });
});

describe('PermissionPolicyEngine — condition evaluation', () => {
  it('allows when condition is met', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'admin-only', effect: 'allow', resourcePattern: '*', action: 'delete',
      conditions: [{ attribute: 'role', operator: 'eq', value: 'admin' }],
    });
    const result = engine.evaluate({
      subjectAttributes: { role: 'admin' }, resource: 'x', action: 'delete',
    });
    expect(result.decision).toBe('allowed');
  });

  it('denies when condition is not met', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'admin-only', effect: 'allow', resourcePattern: '*', action: 'delete',
      conditions: [{ attribute: 'role', operator: 'eq', value: 'admin' }],
    });
    const result = engine.evaluate({
      subjectAttributes: { role: 'guest' }, resource: 'x', action: 'delete',
    });
    expect(result.decision).toBe('denied');
  });

  it('evaluates numeric gt condition', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'high-level', effect: 'allow', resourcePattern: '*', action: 'craft',
      conditions: [{ attribute: 'level', operator: 'gt', value: 10 }],
    });
    const allowed = engine.evaluate({
      subjectAttributes: { level: 15 }, resource: 'x', action: 'craft',
    });
    expect(allowed.decision).toBe('allowed');
    const denied = engine.evaluate({
      subjectAttributes: { level: 5 }, resource: 'x', action: 'craft',
    });
    expect(denied.decision).toBe('denied');
  });
});

describe('PermissionPolicyEngine — in operator', () => {
  it('matches when value is in list', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'tier-check', effect: 'allow', resourcePattern: '*', action: 'trade',
      conditions: [{ attribute: 'tier', operator: 'in', value: ['gold', 'platinum'] }],
    });
    const result = engine.evaluate({
      subjectAttributes: { tier: 'gold' }, resource: 'x', action: 'trade',
    });
    expect(result.decision).toBe('allowed');
  });

  it('rejects when value is not in list', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({
      name: 'tier-check', effect: 'allow', resourcePattern: '*', action: 'trade',
      conditions: [{ attribute: 'tier', operator: 'in', value: ['gold', 'platinum'] }],
    });
    const result = engine.evaluate({
      subjectAttributes: { tier: 'bronze' }, resource: 'x', action: 'trade',
    });
    expect(result.decision).toBe('denied');
  });
});

describe('PermissionPolicyEngine — matched policies', () => {
  it('returns matched policy ids in result', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({ name: 'a', effect: 'allow', resourcePattern: '*', action: 'read' });
    engine.addPolicy({ name: 'b', effect: 'allow', resourcePattern: '*', action: 'write' });
    const result = engine.evaluate({
      subjectAttributes: {}, resource: 'x', action: 'read',
    });
    expect(result.matchedPolicies).toHaveLength(1);
    expect(result.matchedPolicies[0]).toBe('pol-1');
  });
});

describe('PermissionPolicyEngine — stats', () => {
  it('tracks evaluation statistics', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    engine.addPolicy({ name: 'a', effect: 'allow', resourcePattern: '*', action: '*' });
    engine.evaluate({ subjectAttributes: {}, resource: 'x', action: 'read' });
    engine.evaluate({ subjectAttributes: {}, resource: 'x', action: 'write' });

    const stats = engine.getStats();
    expect(stats.totalPolicies).toBe(1);
    expect(stats.totalEvaluations).toBe(2);
    expect(stats.allowCount).toBe(2);
    expect(stats.denyCount).toBe(0);
  });

  it('starts with zero stats', () => {
    const engine = createPermissionPolicyEngine(makeDeps());
    const stats = engine.getStats();
    expect(stats.totalPolicies).toBe(0);
    expect(stats.totalEvaluations).toBe(0);
  });
});
