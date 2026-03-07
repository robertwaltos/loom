import { describe, it, expect } from 'vitest';
import { createPermissionGate } from '../permission-gate.js';
import type {
  PermissionGate,
  PermissionRule,
  PermissionSubject,
  CustomPredicate,
  PermissionGateDeps,
} from '../permission-gate.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createTestGate(
  predicates: ReadonlyArray<CustomPredicate> = [],
): PermissionGate {
  const deps: PermissionGateDeps = { customPredicates: predicates };
  return createPermissionGate(deps);
}

function subject(overrides?: Partial<PermissionSubject>): PermissionSubject {
  return {
    dynastyId: 'dyn-1',
    tier: 'accord',
    status: 'active',
    ...overrides,
  };
}

function rule(overrides?: Partial<PermissionRule>): PermissionRule {
  return {
    action: 'found_dynasty',
    minimumTier: 'accord',
    requiredStatus: ['active'],
    description: 'Found a new dynasty',
    ...overrides,
  };
}

// ─── Rule Registration ─────────────────────────────────────────────

describe('Permission gate rule registration', () => {
  it('starts with zero rules', () => {
    const gate = createTestGate();
    expect(gate.ruleCount()).toBe(0);
    expect(gate.listActions()).toHaveLength(0);
  });

  it('registers a rule', () => {
    const gate = createTestGate();
    gate.registerRule(rule());
    expect(gate.ruleCount()).toBe(1);
    expect(gate.listActions()).toContain('found_dynasty');
  });

  it('retrieves a registered rule', () => {
    const gate = createTestGate();
    gate.registerRule(rule());
    const found = gate.getRule('found_dynasty');
    expect(found).toBeDefined();
    expect(found?.action).toBe('found_dynasty');
  });

  it('returns undefined for unknown rule', () => {
    const gate = createTestGate();
    expect(gate.getRule('unknown')).toBeUndefined();
  });

  it('overwrites rule with same action', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ minimumTier: 'accord' }));
    gate.registerRule(rule({ minimumTier: 'patron' }));
    expect(gate.ruleCount()).toBe(1);
    expect(gate.getRule('found_dynasty')?.minimumTier).toBe('patron');
  });

  it('removes a rule', () => {
    const gate = createTestGate();
    gate.registerRule(rule());
    const removed = gate.removeRule('found_dynasty');
    expect(removed).toBe(true);
    expect(gate.ruleCount()).toBe(0);
  });

  it('returns false when removing nonexistent rule', () => {
    const gate = createTestGate();
    expect(gate.removeRule('nope')).toBe(false);
  });
});

// ─── Tier Checks ────────────────────────────────────────────────────

describe('Permission gate tier evaluation', () => {
  it('allows when tier meets minimum', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ minimumTier: 'accord' }));
    const result = gate.check(subject({ tier: 'accord' }), 'found_dynasty');
    expect(result.allowed).toBe(true);
    expect(result.denialReasons).toHaveLength(0);
  });

  it('allows when tier exceeds minimum', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ minimumTier: 'accord' }));
    const result = gate.check(subject({ tier: 'herald' }), 'found_dynasty');
    expect(result.allowed).toBe(true);
  });

  it('denies when tier is below minimum', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ minimumTier: 'patron' }));
    const result = gate.check(subject({ tier: 'accord' }), 'found_dynasty');
    expect(result.allowed).toBe(false);
    expect(result.denialReasons).toHaveLength(1);
    expect(result.denialReasons[0]).toContain('patron');
  });

  it('denies free tier for accord action', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ minimumTier: 'accord' }));
    const result = gate.check(subject({ tier: 'free' }), 'found_dynasty');
    expect(result.allowed).toBe(false);
  });

  it('allows free tier for free action', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ minimumTier: 'free' }));
    const result = gate.check(subject({ tier: 'free' }), 'found_dynasty');
    expect(result.allowed).toBe(true);
  });
});

// ─── Status Checks ─────────────────────────────────────────────────

describe('Permission gate status evaluation', () => {
  it('allows when status matches required', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ requiredStatus: ['active'] }));
    const result = gate.check(subject({ status: 'active' }), 'found_dynasty');
    expect(result.allowed).toBe(true);
  });

  it('denies when status does not match', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ requiredStatus: ['active'] }));
    const result = gate.check(subject({ status: 'dormant' }), 'found_dynasty');
    expect(result.allowed).toBe(false);
    expect(result.denialReasons[0]).toContain('active');
    expect(result.denialReasons[0]).toContain('dormant');
  });

  it('allows any of multiple required statuses', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ requiredStatus: ['active', 'dormant'] }));
    const result = gate.check(subject({ status: 'dormant' }), 'found_dynasty');
    expect(result.allowed).toBe(true);
  });

  it('allows any status when required list is empty', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ requiredStatus: [] }));
    const result = gate.check(subject({ status: 'completed' }), 'found_dynasty');
    expect(result.allowed).toBe(true);
  });
});

// ─── Unknown Action ─────────────────────────────────────────────────

describe('Permission gate unknown actions', () => {
  it('denies unknown action with reason', () => {
    const gate = createTestGate();
    const result = gate.check(subject(), 'unknown_action');
    expect(result.allowed).toBe(false);
    expect(result.denialReasons[0]).toContain('Unknown action');
  });

  it('includes action name in verdict', () => {
    const gate = createTestGate();
    const result = gate.check(subject(), 'trade_kalon');
    expect(result.action).toBe('trade_kalon');
  });
});

// ─── Custom Predicates ──────────────────────────────────────────────

describe('Permission gate custom predicates', () => {
  it('evaluates custom predicate that allows', () => {
    const pred: CustomPredicate = {
      name: 'cooldown_check',
      actions: ['found_dynasty'],
      evaluate: () => ({ allowed: true, reason: '' }),
    };
    const gate = createTestGate([pred]);
    gate.registerRule(rule());
    const result = gate.check(subject(), 'found_dynasty');
    expect(result.allowed).toBe(true);
  });

  it('denies when custom predicate denies', () => {
    const pred: CustomPredicate = {
      name: 'cooldown_check',
      actions: ['found_dynasty'],
      evaluate: () => ({ allowed: false, reason: 'On cooldown for 12h' }),
    };
    const gate = createTestGate([pred]);
    gate.registerRule(rule());
    const result = gate.check(subject(), 'found_dynasty');
    expect(result.allowed).toBe(false);
    expect(result.denialReasons[0]).toContain('cooldown_check');
    expect(result.denialReasons[0]).toContain('On cooldown');
  });

  it('skips predicate for non-matching action', () => {
    const pred: CustomPredicate = {
      name: 'trade_limit',
      actions: ['trade_kalon'],
      evaluate: () => ({ allowed: false, reason: 'Limit reached' }),
    };
    const gate = createTestGate([pred]);
    gate.registerRule(rule());
    const result = gate.check(subject(), 'found_dynasty');
    expect(result.allowed).toBe(true);
  });

  it('applies predicate with empty action list to all', () => {
    const pred: CustomPredicate = {
      name: 'global_lock',
      actions: [],
      evaluate: () => ({ allowed: false, reason: 'System locked' }),
    };
    const gate = createTestGate([pred]);
    gate.registerRule(rule());
    const result = gate.check(subject(), 'found_dynasty');
    expect(result.allowed).toBe(false);
    expect(result.denialReasons[0]).toContain('global_lock');
  });
});

// ─── Multiple Denials ───────────────────────────────────────────────

describe('Permission gate multiple denials', () => {
  it('collects tier and status denials', () => {
    const gate = createTestGate();
    gate.registerRule(rule({
      minimumTier: 'herald',
      requiredStatus: ['active'],
    }));
    const result = gate.check(
      subject({ tier: 'free', status: 'dormant' }),
      'found_dynasty',
    );
    expect(result.allowed).toBe(false);
    expect(result.denialReasons).toHaveLength(2);
  });

  it('collects tier, status, and predicate denials', () => {
    const pred: CustomPredicate = {
      name: 'ban_check',
      actions: ['found_dynasty'],
      evaluate: () => ({ allowed: false, reason: 'Banned' }),
    };
    const gate = createTestGate([pred]);
    gate.registerRule(rule({
      minimumTier: 'patron',
      requiredStatus: ['active'],
    }));
    const result = gate.check(
      subject({ tier: 'free', status: 'dormant' }),
      'found_dynasty',
    );
    expect(result.allowed).toBe(false);
    expect(result.denialReasons).toHaveLength(3);
  });
});

// ─── Batch Check ────────────────────────────────────────────────────

describe('Permission gate batch check', () => {
  it('checks multiple actions at once', () => {
    const gate = createTestGate();
    gate.registerRule(rule({ action: 'found_dynasty', minimumTier: 'accord' }));
    gate.registerRule(rule({ action: 'initiate_survey', minimumTier: 'patron' }));
    const results = gate.checkMany(subject({ tier: 'accord' }), [
      'found_dynasty',
      'initiate_survey',
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]?.allowed).toBe(true);
    expect(results[1]?.allowed).toBe(false);
  });

  it('returns empty array for empty actions', () => {
    const gate = createTestGate();
    const results = gate.checkMany(subject(), []);
    expect(results).toHaveLength(0);
  });
});
