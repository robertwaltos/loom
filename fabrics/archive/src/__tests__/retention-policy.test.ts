import { describe, it, expect } from 'vitest';
import { createRetentionPolicyService } from '../retention-policy.js';
import type { RetentionPolicyDeps } from '../retention-policy.js';

function makeDeps(): RetentionPolicyDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'rule-' + String(++idCounter) },
  };
}

describe('RetentionPolicyService — rule management', () => {
  it('creates a rule', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const rule = svc.createRule({ name: '30-day', maxAgeMicroseconds: 30_000_000 });
    expect(rule.name).toBe('30-day');
    expect(rule.ruleId).toBe('rule-1');
  });

  it('retrieves a rule by id', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const rule = svc.createRule({ name: '7-day', maxAgeMicroseconds: 7_000_000 });
    expect(svc.getRule(rule.ruleId)?.name).toBe('7-day');
  });

  it('returns undefined for unknown rule', () => {
    const svc = createRetentionPolicyService(makeDeps());
    expect(svc.getRule('missing')).toBeUndefined();
  });

  it('removes a rule', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const rule = svc.createRule({ name: 'temp', maxAgeMicroseconds: 1_000_000 });
    expect(svc.removeRule(rule.ruleId)).toBe(true);
    expect(svc.getRule(rule.ruleId)).toBeUndefined();
  });

  it('lists all rules', () => {
    const svc = createRetentionPolicyService(makeDeps());
    svc.createRule({ name: 'a', maxAgeMicroseconds: 1_000_000 });
    svc.createRule({ name: 'b', maxAgeMicroseconds: 2_000_000 });
    expect(svc.listRules()).toHaveLength(2);
  });
});

describe('RetentionPolicyService — record tracking', () => {
  it('tracks a record', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const rule = svc.createRule({ name: 'short', maxAgeMicroseconds: 5_000_000 });
    const tracked = svc.trackRecord({ recordId: 'rec-1', ruleId: rule.ruleId });
    expect(tracked.recordId).toBe('rec-1');
    expect(tracked.ruleId).toBe(rule.ruleId);
  });

  it('untracks a record', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const rule = svc.createRule({ name: 'short', maxAgeMicroseconds: 5_000_000 });
    svc.trackRecord({ recordId: 'rec-1', ruleId: rule.ruleId });
    expect(svc.untrack('rec-1')).toBe(true);
  });

  it('untrack returns false for unknown record', () => {
    const svc = createRetentionPolicyService(makeDeps());
    expect(svc.untrack('missing')).toBe(false);
  });
});

describe('RetentionPolicyService — sweep', () => {
  it('sweeps expired records', () => {
    let time = 1_000_000;
    const deps: RetentionPolicyDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'rule-1' },
    };
    const svc = createRetentionPolicyService(deps);
    const rule = svc.createRule({ name: 'short', maxAgeMicroseconds: 5_000_000 });
    svc.trackRecord({ recordId: 'old', ruleId: rule.ruleId });
    time += 10_000_000;
    const result = svc.sweep();
    expect(result.expiredRecordIds).toContain('old');
    expect(result.checkedCount).toBe(1);
  });

  it('does not sweep fresh records', () => {
    let time = 1_000_000;
    const deps: RetentionPolicyDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'rule-1' },
    };
    const svc = createRetentionPolicyService(deps);
    const rule = svc.createRule({ name: 'long', maxAgeMicroseconds: 100_000_000 });
    svc.trackRecord({ recordId: 'fresh', ruleId: rule.ruleId });
    time += 1_000_000;
    const result = svc.sweep();
    expect(result.expiredRecordIds).toHaveLength(0);
  });

  it('skips records with deleted rules', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const rule = svc.createRule({ name: 'gone', maxAgeMicroseconds: 1 });
    svc.trackRecord({ recordId: 'orphan', ruleId: rule.ruleId });
    svc.removeRule(rule.ruleId);
    const result = svc.sweep();
    expect(result.expiredRecordIds).toHaveLength(0);
  });
});

describe('RetentionPolicyService — stats', () => {
  it('starts with zero stats', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const stats = svc.getStats();
    expect(stats.totalRules).toBe(0);
    expect(stats.totalTrackedRecords).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const svc = createRetentionPolicyService(makeDeps());
    const rule = svc.createRule({ name: 'a', maxAgeMicroseconds: 1_000_000 });
    svc.trackRecord({ recordId: 'r1', ruleId: rule.ruleId });
    svc.trackRecord({ recordId: 'r2', ruleId: rule.ruleId });
    const stats = svc.getStats();
    expect(stats.totalRules).toBe(1);
    expect(stats.totalTrackedRecords).toBe(2);
  });
});
