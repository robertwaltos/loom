import { describe, it, expect, beforeEach } from 'vitest';
import { createAuditTrail } from '../audit-trail.js';
import type { AuditTrail, AuditTrailDeps } from '../audit-trail.js';

// ── Test Helpers ─────────────────────────────────────────────────

function createDeps(): AuditTrailDeps {
  let idCounter = 0;
  let time = 1_000_000;
  let hashCounter = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: {
      generate() {
        idCounter += 1;
        return 'aud-' + String(idCounter);
      },
    },
    hasher: {
      hash(input: string) {
        hashCounter++;
        return 'hash-' + String(hashCounter) + '-' + String(input.length);
      },
    },
  };
}

let trail: AuditTrail;

beforeEach(() => {
  trail = createAuditTrail(createDeps());
});

function appendTestEntry(
  overrides?: Partial<{
    actorId: string;
    action: string;
    targetId: string;
    targetType: string;
    category: 'governance' | 'economy' | 'identity' | 'security' | 'system';
    severity: 'info' | 'warning' | 'critical';
    detail: string;
  }>,
) {
  return trail.append({
    actorId: overrides?.actorId ?? 'actor-1',
    action: overrides?.action ?? 'test.action',
    targetId: overrides?.targetId ?? 'target-1',
    targetType: overrides?.targetType ?? 'resource',
    category: overrides?.category ?? 'governance',
    severity: overrides?.severity ?? 'info',
    detail: overrides?.detail ?? 'test detail',
  });
}

// ── Append ───────────────────────────────────────────────────────

describe('AuditTrail append', () => {
  it('appends an entry with correct metadata', () => {
    const entry = appendTestEntry({ actorId: 'admin-1', action: 'vote.cast' });
    expect(entry.entryId).toBe('aud-1');
    expect(entry.actorId).toBe('admin-1');
    expect(entry.action).toBe('vote.cast');
    expect(entry.sequenceNumber).toBe(0);
  });

  it('increments sequence numbers', () => {
    appendTestEntry();
    const second = appendTestEntry();
    expect(second.sequenceNumber).toBe(1);
  });

  it('chains hashes from previous entry', () => {
    const first = appendTestEntry();
    const second = appendTestEntry();
    expect(second.previousHash).toBe(first.entryHash);
  });

  it('first entry references genesis hash', () => {
    const first = appendTestEntry();
    expect(first.previousHash).toBe(
      '0000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  it('records timestamp', () => {
    const entry = appendTestEntry();
    expect(entry.recordedAt).toBeGreaterThan(0);
  });

  it('stores severity and category', () => {
    const entry = appendTestEntry({ severity: 'critical', category: 'security' });
    expect(entry.severity).toBe('critical');
    expect(entry.category).toBe('security');
  });
});

// ── Get Entry ────────────────────────────────────────────────────

describe('AuditTrail getEntry', () => {
  it('retrieves an entry by ID', () => {
    appendTestEntry({ actorId: 'alice' });
    const entry = trail.getEntry('aud-1');
    expect(entry).toBeDefined();
    expect(entry?.actorId).toBe('alice');
  });

  it('returns undefined for unknown ID', () => {
    expect(trail.getEntry('nonexistent')).toBeUndefined();
  });
});

describe('AuditTrail getBySequence', () => {
  it('retrieves an entry by sequence number', () => {
    appendTestEntry({ action: 'first' });
    appendTestEntry({ action: 'second' });
    const entry = trail.getBySequence(1);
    expect(entry?.action).toBe('second');
  });

  it('returns undefined for out-of-range sequence', () => {
    expect(trail.getBySequence(99)).toBeUndefined();
  });

  it('returns undefined for negative sequence', () => {
    expect(trail.getBySequence(-1)).toBeUndefined();
  });
});

// ── Query ────────────────────────────────────────────────────────

describe('AuditTrail query', () => {
  it('queries by actorId', () => {
    appendTestEntry({ actorId: 'alice' });
    appendTestEntry({ actorId: 'bob' });
    appendTestEntry({ actorId: 'alice' });
    const results = trail.query({ actorId: 'alice' });
    expect(results).toHaveLength(2);
  });

  it('queries by action', () => {
    appendTestEntry({ action: 'vote.cast' });
    appendTestEntry({ action: 'policy.change' });
    const results = trail.query({ action: 'vote.cast' });
    expect(results).toHaveLength(1);
  });

  it('queries by targetId', () => {
    appendTestEntry({ targetId: 'world-1' });
    appendTestEntry({ targetId: 'world-2' });
    const results = trail.query({ targetId: 'world-1' });
    expect(results).toHaveLength(1);
  });

  it('queries by category', () => {
    appendTestEntry({ category: 'governance' });
    appendTestEntry({ category: 'economy' });
    appendTestEntry({ category: 'governance' });
    const results = trail.query({ category: 'governance' });
    expect(results).toHaveLength(2);
  });

  it('queries by severity', () => {
    appendTestEntry({ severity: 'info' });
    appendTestEntry({ severity: 'critical' });
    const results = trail.query({ severity: 'critical' });
    expect(results).toHaveLength(1);
  });

  it('combines multiple filters', () => {
    appendTestEntry({ actorId: 'alice', category: 'governance' });
    appendTestEntry({ actorId: 'alice', category: 'economy' });
    appendTestEntry({ actorId: 'bob', category: 'governance' });
    const results = trail.query({ actorId: 'alice', category: 'governance' });
    expect(results).toHaveLength(1);
  });

  it('queries by time range', () => {
    appendTestEntry();
    appendTestEntry();
    appendTestEntry();
    const results = trail.query({ startTime: 1_000_001, endTime: 1_000_001 });
    expect(results).toHaveLength(1);
  });

  it('returns all entries with empty query', () => {
    appendTestEntry();
    appendTestEntry();
    expect(trail.query({}).length).toBe(2);
  });
});

// ── Recent ───────────────────────────────────────────────────────

describe('AuditTrail getRecent', () => {
  it('returns most recent entries', () => {
    appendTestEntry({ action: 'a' });
    appendTestEntry({ action: 'b' });
    appendTestEntry({ action: 'c' });
    const recent = trail.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.action).toBe('b');
    expect(recent[1]?.action).toBe('c');
  });

  it('returns all entries when count exceeds total', () => {
    appendTestEntry();
    expect(trail.getRecent(10)).toHaveLength(1);
  });
});

// ── Chain Verification ───────────────────────────────────────────

describe('AuditTrail verifyChain', () => {
  it('verifies empty chain as valid', () => {
    const result = trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(0);
  });

  it('verifies a valid chain', () => {
    appendTestEntry();
    appendTestEntry();
    appendTestEntry();
    const result = trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(3);
    expect(result.brokenAtSequence).toBeNull();
  });

  it('includes verification timestamp', () => {
    const result = trail.verifyChain();
    expect(result.verifiedAt).toBeGreaterThan(0);
  });
});

// ── Retention ────────────────────────────────────────────────────

describe('AuditTrail retention', () => {
  it('adds a retention config', () => {
    const config = trail.addRetentionConfig({
      category: 'system',
      retainForMs: 86_400_000,
    });
    expect(config.category).toBe('system');
    expect(config.retainForMs).toBe(86_400_000);
    expect(trail.getRetentionConfigs()).toHaveLength(1);
  });

  it('applies retention and removes expired entries', () => {
    let time = 100;
    let idCtr = 0;
    let hashCtr = 0;
    const jumpTrail = createAuditTrail({
      clock: { nowMicroseconds: () => time },
      idGenerator: { generate: () => 'r-' + String(++idCtr) },
      hasher: { hash: (s: string) => 'h-' + String(++hashCtr) + '-' + String(s.length) },
    });
    jumpTrail.append({
      actorId: 'a',
      action: 'x',
      targetId: 't',
      targetType: 'r',
      category: 'system',
      severity: 'info',
      detail: '',
    });
    jumpTrail.append({
      actorId: 'a',
      action: 'y',
      targetId: 't',
      targetType: 'r',
      category: 'governance',
      severity: 'info',
      detail: '',
    });
    time = 5000;
    jumpTrail.addRetentionConfig({ category: 'system', retainForMs: 1000 });
    const removed = jumpTrail.applyRetention();
    expect(removed).toBe(1);
    expect(jumpTrail.getStats().totalEntries).toBe(1);
  });

  it('does not remove entries within retention window', () => {
    appendTestEntry({ category: 'system' });
    trail.addRetentionConfig({ category: 'system', retainForMs: 2_000_000 });
    const removed = trail.applyRetention();
    expect(removed).toBe(0);
  });

  it('only removes entries matching the retention category', () => {
    let time = 100;
    let idCtr = 0;
    let hashCtr = 0;
    const jumpTrail = createAuditTrail({
      clock: { nowMicroseconds: () => time },
      idGenerator: { generate: () => 'r-' + String(++idCtr) },
      hasher: { hash: (s: string) => 'h-' + String(++hashCtr) + '-' + String(s.length) },
    });
    jumpTrail.append({
      actorId: 'a',
      action: 'x',
      targetId: 't',
      targetType: 'r',
      category: 'system',
      severity: 'info',
      detail: '',
    });
    jumpTrail.append({
      actorId: 'a',
      action: 'y',
      targetId: 't',
      targetType: 'r',
      category: 'governance',
      severity: 'info',
      detail: '',
    });
    time = 5000;
    jumpTrail.addRetentionConfig({ category: 'system', retainForMs: 1000 });
    jumpTrail.applyRetention();
    const remaining = jumpTrail.query({});
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.category).toBe('governance');
  });
});

// ── Compliance Report ────────────────────────────────────────────

describe('AuditTrail compliance report', () => {
  it('generates report with correct counts', () => {
    appendTestEntry({ severity: 'info', category: 'governance' });
    appendTestEntry({ severity: 'warning', category: 'economy' });
    appendTestEntry({ severity: 'critical', category: 'security' });
    const report = trail.generateComplianceReport();
    expect(report.totalEntries).toBe(3);
    expect(report.entriesBySeverity.info).toBe(1);
    expect(report.entriesBySeverity.warning).toBe(1);
    expect(report.entriesBySeverity.critical).toBe(1);
    expect(report.entriesByCategory.governance).toBe(1);
    expect(report.entriesByCategory.economy).toBe(1);
    expect(report.entriesByCategory.security).toBe(1);
    expect(report.chainIntegrity).toBe(true);
  });

  it('reports time range of entries', () => {
    appendTestEntry();
    appendTestEntry();
    const report = trail.generateComplianceReport();
    expect(report.oldestEntryAt).not.toBeNull();
    expect(report.newestEntryAt).not.toBeNull();
    expect(report.newestEntryAt!).toBeGreaterThanOrEqual(report.oldestEntryAt!);
  });

  it('reports null time range for empty trail', () => {
    const report = trail.generateComplianceReport();
    expect(report.oldestEntryAt).toBeNull();
    expect(report.newestEntryAt).toBeNull();
  });

  it('includes retention config count', () => {
    trail.addRetentionConfig({ category: 'system', retainForMs: 1000 });
    const report = trail.generateComplianceReport();
    expect(report.retentionConfigCount).toBe(1);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('AuditTrail stats', () => {
  it('reports empty stats initially', () => {
    const stats = trail.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.chainLength).toBe(0);
    expect(stats.retentionConfigCount).toBe(0);
    expect(stats.categoryCount).toBe(0);
  });

  it('tracks aggregate statistics', () => {
    appendTestEntry({ category: 'governance' });
    appendTestEntry({ category: 'economy' });
    appendTestEntry({ category: 'governance' });
    trail.addRetentionConfig({ category: 'system', retainForMs: 1000 });
    const stats = trail.getStats();
    expect(stats.totalEntries).toBe(3);
    expect(stats.chainLength).toBe(3);
    expect(stats.retentionConfigCount).toBe(1);
    expect(stats.categoryCount).toBe(2);
  });
});
