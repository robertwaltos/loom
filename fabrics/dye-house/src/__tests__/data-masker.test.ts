/**
 * Data Masker Tests
 * Fabric: dye-house
 */

import { describe, it, expect } from 'vitest';
import { createDataMaskerSystem } from '../data-masker.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem() {
  return createDataMaskerSystem({
    clock: { nowMicroseconds: () => 2_000_000n },
    idGen: { next: () => 'mask-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

// ─── addRule ──────────────────────────────────────────────────────────────────

describe('addRule', () => {
  it('adds a rule and returns it', () => {
    const system = createTestSystem();
    const result = system.addRule('email', 'REDACT');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.fieldPattern).toBe('email');
      expect(result.strategy).toBe('REDACT');
      expect(result.active).toBe(true);
    }
  });

  it('returns invalid-pattern for empty string', () => {
    const system = createTestSystem();
    const result = system.addRule('', 'REDACT');
    expect(result).toBe('invalid-pattern');
  });

  it('assigns a ruleId', () => {
    const system = createTestSystem();
    const result = system.addRule('ssn', 'HASH');
    if (typeof result !== 'string') {
      expect(result.ruleId).toBeTruthy();
    }
  });

  it('stores createdAt timestamp', () => {
    const system = createTestSystem();
    const result = system.addRule('phone', 'TRUNCATE');
    if (typeof result !== 'string') {
      expect(result.createdAt).toBe(2_000_000n);
    }
  });
});

// ─── deactivateRule ───────────────────────────────────────────────────────────

describe('deactivateRule', () => {
  it('deactivates an existing rule', () => {
    const system = createTestSystem();
    const rule = system.addRule('email', 'REDACT');
    if (typeof rule === 'string') throw new Error('unexpected');
    const result = system.deactivateRule(rule.ruleId);
    expect(result).toEqual({ success: true });
    const found = system.listRules().find((r) => r.ruleId === rule.ruleId);
    expect(found?.active).toBe(false);
  });

  it('returns rule-not-found for unknown id', () => {
    const system = createTestSystem();
    expect(system.deactivateRule('nonexistent')).toEqual({
      success: false,
      error: 'rule-not-found',
    });
  });
});

// ─── maskField ────────────────────────────────────────────────────────────────

describe('maskField — REDACT', () => {
  it('returns [REDACTED] for any value', () => {
    const system = createTestSystem();
    expect(system.maskField('email', 'user@example.com', 'REDACT')).toBe('[REDACTED]');
  });
});

describe('maskField — HASH', () => {
  it('returns hash:length:charCode format', () => {
    const system = createTestSystem();
    const value = 'secret';
    const result = system.maskField('x', value, 'HASH');
    expect(result).toBe(`hash:${value.length}:${value.charCodeAt(0)}`);
  });
});

describe('maskField — TRUNCATE', () => {
  it('truncates value longer than 3 chars', () => {
    const system = createTestSystem();
    expect(system.maskField('x', 'hello', 'TRUNCATE')).toBe('hel...');
  });

  it('returns full value when <= 3 chars', () => {
    const system = createTestSystem();
    expect(system.maskField('x', 'hi', 'TRUNCATE')).toBe('hi');
    expect(system.maskField('x', 'abc', 'TRUNCATE')).toBe('abc');
  });
});

describe('maskField — PARTIAL', () => {
  it('masks middle of a long value', () => {
    const system = createTestSystem();
    const result = system.maskField('x', 'abcdefgh', 'PARTIAL');
    expect(result).toBe('ab****gh');
  });

  it('redacts values with 4 or fewer chars', () => {
    const system = createTestSystem();
    expect(system.maskField('x', 'ab', 'PARTIAL')).toBe('[REDACTED]');
    expect(system.maskField('x', 'abcd', 'PARTIAL')).toBe('[REDACTED]');
  });
});

describe('maskField — TOKENIZE', () => {
  it('returns tok_unknown_length format when no ruleId', () => {
    const system = createTestSystem();
    const result = system.maskField('x', 'myvalue', 'TOKENIZE');
    expect(result).toBe('tok_unknown_7');
  });
});

// ─── maskRecord ───────────────────────────────────────────────────────────────

describe('maskRecord', () => {
  it('applies matching rules to fields', () => {
    const system = createTestSystem();
    system.addRule('email', 'REDACT');
    const result = system.maskRecord({ email: 'user@test.com', name: 'Alice' });
    expect(result.maskedData['email']).toBe('[REDACTED]');
    expect(result.maskedData['name']).toBe('Alice');
  });

  it('passes through fields with no matching rule', () => {
    const system = createTestSystem();
    system.addRule('email', 'REDACT');
    const result = system.maskRecord({ phone: '555-1234' });
    expect(result.maskedData['phone']).toBe('555-1234');
    expect(result.appliedRules).toHaveLength(0);
  });

  it('matches field by case-insensitive pattern inclusion', () => {
    const system = createTestSystem();
    system.addRule('EMAIL', 'REDACT');
    const result = system.maskRecord({ userEmail: 'x@y.com' });
    expect(result.maskedData['userEmail']).toBe('[REDACTED]');
  });

  it('records all applied rule IDs', () => {
    const system = createTestSystem();
    const r1 = system.addRule('email', 'REDACT');
    const r2 = system.addRule('phone', 'HASH');
    if (typeof r1 === 'string' || typeof r2 === 'string') throw new Error('unexpected');
    const result = system.maskRecord({ email: 'x@y.com', phone: '555' });
    expect(result.appliedRules).toContain(r1.ruleId);
    expect(result.appliedRules).toContain(r2.ruleId);
  });

  it('skips deactivated rules', () => {
    const system = createTestSystem();
    const rule = system.addRule('email', 'REDACT');
    if (typeof rule === 'string') throw new Error('unexpected');
    system.deactivateRule(rule.ruleId);
    const result = system.maskRecord({ email: 'x@y.com' });
    expect(result.maskedData['email']).toBe('x@y.com');
  });

  it('includes originalFields in result', () => {
    const system = createTestSystem();
    const result = system.maskRecord({ a: '1', b: '2' });
    expect(result.originalFields).toContain('a');
    expect(result.originalFields).toContain('b');
  });
});

// ─── listRules ────────────────────────────────────────────────────────────────

describe('listRules', () => {
  it('lists all rules without filter', () => {
    const system = createTestSystem();
    system.addRule('email', 'REDACT');
    system.addRule('phone', 'HASH');
    expect(system.listRules()).toHaveLength(2);
  });

  it('filters active and inactive rules', () => {
    const system = createTestSystem();
    const rule = system.addRule('email', 'REDACT');
    system.addRule('phone', 'HASH');
    if (typeof rule !== 'string') system.deactivateRule(rule.ruleId);
    expect(system.listRules(true)).toHaveLength(1);
    expect(system.listRules(false)).toHaveLength(1);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks totalRules, activeMaskings, and totalFieldsMasked', () => {
    const system = createTestSystem();
    system.addRule('email', 'REDACT');
    system.maskRecord({ email: 'x@y.com', userEmail: 'a@b.com' });
    const stats = system.getStats();
    expect(stats.totalRules).toBe(1);
    expect(stats.activeMaskings).toBe(1);
    expect(stats.totalFieldsMasked).toBe(2);
  });

  it('cumulates totalFieldsMasked across calls', () => {
    const system = createTestSystem();
    system.addRule('ssn', 'REDACT');
    system.maskRecord({ ssn: '123' });
    system.maskRecord({ ssn: '456' });
    expect(system.getStats().totalFieldsMasked).toBe(2);
  });

  it('starts at zero', () => {
    const system = createTestSystem();
    const stats = system.getStats();
    expect(stats.totalRules).toBe(0);
    expect(stats.activeMaskings).toBe(0);
    expect(stats.totalFieldsMasked).toBe(0);
  });
});
