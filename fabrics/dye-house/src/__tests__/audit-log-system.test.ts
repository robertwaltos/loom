import { describe, it, expect } from 'vitest';
import { createAuditLogSystem } from '../audit-log-system.js';
import type {
  AuditLogSystem,
  AuditCategory,
  AuditSeverity,
  AuditEntry,
} from '../audit-log-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(startTime = 1_000_000n): {
  system: AuditLogSystem;
  advanceTime: (us: bigint) => void;
} {
  let now = startTime;
  return {
    system: createAuditLogSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'entry-' + String(++idCounter) },
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

function record(
  system: AuditLogSystem,
  overrides: Partial<{
    actorId: string;
    category: AuditCategory;
    severity: AuditSeverity;
    action: string;
    resourceId: string | null;
    outcome: 'SUCCESS' | 'FAILURE';
  }> = {},
): AuditEntry {
  return system.recordEntry(
    overrides.actorId ?? 'actor-1',
    overrides.category ?? 'AUTH',
    overrides.severity ?? 'INFO',
    overrides.action ?? 'login',
    overrides.resourceId ?? null,
    overrides.outcome ?? 'SUCCESS',
    {},
  );
}

// ─── recordEntry ─────────────────────────────────────────────────────────────

describe('recordEntry', () => {
  it('records an entry with correct fields', () => {
    const { system } = createTestSystem();
    const entry = record(system, { actorId: 'actor-42', action: 'logout', category: 'AUTH' });
    expect(entry.actorId).toBe('actor-42');
    expect(entry.action).toBe('logout');
    expect(entry.category).toBe('AUTH');
    expect(entry.outcome).toBe('SUCCESS');
  });

  it('generates a non-empty entryId', () => {
    const { system } = createTestSystem();
    const entry = record(system);
    expect(entry.entryId.length).toBeGreaterThan(0);
  });

  it('records occurredAt timestamp as bigint', () => {
    const { system } = createTestSystem(5_000_000n);
    const entry = record(system);
    expect(entry.occurredAt).toBe(5_000_000n);
  });

  it('generates a deterministic checksum', () => {
    const { system } = createTestSystem(1_000n);
    const entry = record(system, { actorId: 'alice', action: 'buy' });
    expect(entry.checksum).toBe(`${entry.entryId}:alice:buy:1000`);
  });

  it('stores resourceId when provided', () => {
    const { system } = createTestSystem();
    const entry = record(system, { resourceId: 'world-7' });
    expect(entry.resourceId).toBe('world-7');
  });

  it('stores null resourceId when omitted', () => {
    const { system } = createTestSystem();
    const entry = record(system, { resourceId: null });
    expect(entry.resourceId).toBeNull();
  });
});

// ─── getEntry ─────────────────────────────────────────────────────────────────

describe('getEntry', () => {
  it('retrieves a recorded entry by id', () => {
    const { system } = createTestSystem();
    const entry = record(system);
    expect(system.getEntry(entry.entryId)).toEqual(entry);
  });

  it('returns undefined for unknown id', () => {
    const { system } = createTestSystem();
    expect(system.getEntry('nonexistent')).toBeUndefined();
  });
});

// ─── queryEntries ─────────────────────────────────────────────────────────────

describe('queryEntries — category filter', () => {
  it('filters by category', () => {
    const { system } = createTestSystem();
    record(system, { category: 'AUTH' });
    record(system, { category: 'TRADE' });
    const results = system.queryEntries({ category: 'TRADE' }, 10);
    expect(results.length).toBe(1);
    expect(results[0]?.category).toBe('TRADE');
  });

  it('filters by severity', () => {
    const { system } = createTestSystem();
    record(system, { severity: 'INFO' });
    record(system, { severity: 'CRITICAL' });
    expect(system.queryEntries({ severity: 'CRITICAL' }, 10).length).toBe(1);
  });
});

describe('queryEntries — actor and outcome filters', () => {
  it('filters by actorId', () => {
    const { system } = createTestSystem();
    record(system, { actorId: 'alice' });
    record(system, { actorId: 'bob' });
    const results = system.queryEntries({ actorId: 'alice' }, 10);
    expect(results.length).toBe(1);
    expect(results[0]?.actorId).toBe('alice');
  });

  it('filters by outcome', () => {
    const { system } = createTestSystem();
    record(system, { outcome: 'SUCCESS' });
    record(system, { outcome: 'FAILURE' });
    expect(system.queryEntries({ outcome: 'FAILURE' }, 10).length).toBe(1);
  });
});

describe('queryEntries — time and limit filters', () => {
  it('filters by fromTime and toTime', () => {
    const { system, advanceTime } = createTestSystem(0n);
    record(system); // at 0
    advanceTime(1_000n);
    record(system); // at 1000
    advanceTime(1_000n);
    record(system); // at 2000
    const results = system.queryEntries({ fromTime: 500n, toTime: 1500n }, 10);
    expect(results.length).toBe(1);
    expect(results[0]?.occurredAt).toBe(1_000n);
  });

  it('respects limit', () => {
    const { system } = createTestSystem();
    for (let i = 0; i < 5; i++) record(system);
    expect(system.queryEntries({}, 3).length).toBe(3);
  });

  it('returns results sorted by occurredAt desc', () => {
    const { system, advanceTime } = createTestSystem(0n);
    record(system);
    advanceTime(1_000n);
    record(system);
    const results = system.queryEntries({}, 10);
    expect((results[0]?.occurredAt ?? 0n) > (results[1]?.occurredAt ?? 0n)).toBe(true);
  });
});

// ─── getActorHistory ─────────────────────────────────────────────────────────

describe('getActorHistory', () => {
  it('returns only entries for the given actor', () => {
    const { system } = createTestSystem();
    record(system, { actorId: 'alice' });
    record(system, { actorId: 'bob' });
    record(system, { actorId: 'alice' });
    const history = system.getActorHistory('alice', 10);
    expect(history.length).toBe(2);
    expect(history.every((e) => e.actorId === 'alice')).toBe(true);
  });
});

// ─── getReport ────────────────────────────────────────────────────────────────

describe('getReport', () => {
  it('counts total entries', () => {
    const { system } = createTestSystem();
    record(system);
    record(system);
    expect(system.getReport().totalEntries).toBe(2);
  });

  it('counts critical entries', () => {
    const { system } = createTestSystem();
    record(system, { severity: 'INFO' });
    record(system, { severity: 'CRITICAL' });
    expect(system.getReport().criticalCount).toBe(1);
  });

  it('counts failure entries', () => {
    const { system } = createTestSystem();
    record(system, { outcome: 'SUCCESS' });
    record(system, { outcome: 'FAILURE' });
    expect(system.getReport().failureCount).toBe(1);
  });

  it('counts entries by category', () => {
    const { system } = createTestSystem();
    record(system, { category: 'AUTH' });
    record(system, { category: 'AUTH' });
    record(system, { category: 'TRADE' });
    const report = system.getReport();
    expect(report.entriesByCategory.AUTH).toBe(2);
    expect(report.entriesByCategory.TRADE).toBe(1);
    expect(report.entriesByCategory.GOVERNANCE).toBe(0);
  });

  it('returns zero counts for empty log', () => {
    const { system } = createTestSystem();
    const report = system.getReport();
    expect(report.totalEntries).toBe(0);
    expect(report.criticalCount).toBe(0);
    expect(report.failureCount).toBe(0);
  });
});
