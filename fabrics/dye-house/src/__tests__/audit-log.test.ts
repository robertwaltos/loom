import { describe, it, expect } from 'vitest';
import { createAuditLog } from '../audit-log.js';
import type { AuditLogDeps, RecordAuditParams } from '../audit-log.js';

function makeDeps(overrides?: Partial<AuditLogDeps>): AuditLogDeps {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'audit-' + String(++idCounter) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    maxEntries: 1000,
    ...overrides,
  };
}

function makeParams(overrides?: Partial<RecordAuditParams>): RecordAuditParams {
  return {
    category: 'authentication',
    severity: 'info',
    action: 'token.issued',
    actorId: 'dynasty-1',
    targetId: 'session-1',
    outcome: 'success',
    reason: 'Token issued successfully',
    ...overrides,
  };
}

describe('AuditLog — recording', () => {
  it('records an audit entry', () => {
    const log = createAuditLog(makeDeps());
    const entry = log.record(makeParams());

    expect(entry.entryId).toBe('audit-1');
    expect(entry.category).toBe('authentication');
    expect(entry.action).toBe('token.issued');
    expect(entry.actorId).toBe('dynasty-1');
    expect(entry.outcome).toBe('success');
  });

  it('assigns unique IDs and timestamps', () => {
    const log = createAuditLog(makeDeps());
    const e1 = log.record(makeParams());
    const e2 = log.record(makeParams());

    expect(e1.entryId).not.toBe(e2.entryId);
    expect(e2.timestamp).toBeGreaterThan(e1.timestamp);
  });

  it('includes metadata when provided', () => {
    const log = createAuditLog(makeDeps());
    const entry = log.record(makeParams({
      metadata: { ip: '10.0.0.1', userAgent: 'loom-client' },
    }));

    expect(entry.metadata).toEqual({ ip: '10.0.0.1', userAgent: 'loom-client' });
  });

  it('defaults metadata to empty object', () => {
    const log = createAuditLog(makeDeps());
    const entry = log.record(makeParams());
    expect(entry.metadata).toEqual({});
  });

  it('increments count on each record', () => {
    const log = createAuditLog(makeDeps());
    expect(log.count()).toBe(0);
    log.record(makeParams());
    log.record(makeParams());
    expect(log.count()).toBe(2);
  });
});

describe('AuditLog — capacity enforcement', () => {
  it('evicts oldest entries when capacity exceeded', () => {
    const log = createAuditLog(makeDeps({ maxEntries: 3 }));

    log.record(makeParams({ action: 'first' }));
    log.record(makeParams({ action: 'second' }));
    log.record(makeParams({ action: 'third' }));
    log.record(makeParams({ action: 'fourth' }));

    expect(log.count()).toBe(3);
    const all = log.query({});
    const actions = all.map((e) => e.action);
    expect(actions).not.toContain('first');
    expect(actions).toContain('fourth');
  });

  it('evicted entries no longer appear in getEntry', () => {
    const log = createAuditLog(makeDeps({ maxEntries: 2 }));

    const first = log.record(makeParams());
    log.record(makeParams());
    log.record(makeParams());

    expect(log.getEntry(first.entryId)).toBeUndefined();
  });
});

describe('AuditLog — queries', () => {
  it('queries by category', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ category: 'authentication' }));
    log.record(makeParams({ category: 'authorization' }));
    log.record(makeParams({ category: 'authentication' }));

    const results = log.query({ category: 'authentication' });
    expect(results).toHaveLength(2);
  });

  it('queries by severity', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ severity: 'info' }));
    log.record(makeParams({ severity: 'warning' }));
    log.record(makeParams({ severity: 'critical' }));

    const results = log.query({ severity: 'critical' });
    expect(results).toHaveLength(1);
    expect(results[0]?.severity).toBe('critical');
  });

  it('queries by actorId', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ actorId: 'dynasty-1' }));
    log.record(makeParams({ actorId: 'dynasty-2' }));
    log.record(makeParams({ actorId: 'dynasty-1' }));

    const results = log.query({ actorId: 'dynasty-1' });
    expect(results).toHaveLength(2);
  });

  it('queries with time filter', () => {
    let time = 100_000_000;
    const log = createAuditLog(makeDeps({
      clock: { nowMicroseconds: () => (time += 10_000_000) },
    }));

    log.record(makeParams({ action: 'early' }));
    log.record(makeParams({ action: 'late' }));

    const results = log.query({ since: 115_000_000 });
    expect(results).toHaveLength(1);
    expect(results[0]?.action).toBe('late');
  });

  it('limits query results', () => {
    const log = createAuditLog(makeDeps());
    for (let i = 0; i < 10; i++) {
      log.record(makeParams());
    }

    const results = log.query({ limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('returns results in reverse chronological order', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ action: 'first' }));
    log.record(makeParams({ action: 'second' }));
    log.record(makeParams({ action: 'third' }));

    const results = log.query({});
    expect(results[0]?.action).toBe('third');
    expect(results[2]?.action).toBe('first');
  });
});

describe('AuditLog — getEntry', () => {
  it('retrieves an entry by ID', () => {
    const log = createAuditLog(makeDeps());
    const entry = log.record(makeParams());

    const found = log.getEntry(entry.entryId);
    expect(found?.entryId).toBe(entry.entryId);
  });

  it('returns undefined for unknown ID', () => {
    const log = createAuditLog(makeDeps());
    expect(log.getEntry('nonexistent')).toBeUndefined();
  });
});

describe('AuditLog — alerts', () => {
  it('retrieves recent alert and critical entries', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ severity: 'info' }));
    log.record(makeParams({ severity: 'alert', action: 'suspicious.login' }));
    log.record(makeParams({ severity: 'warning' }));
    log.record(makeParams({ severity: 'critical', action: 'brute.force' }));

    const alerts = log.getRecentAlerts(10);
    expect(alerts).toHaveLength(2);
    expect(alerts[0]?.severity).toBe('critical');
    expect(alerts[1]?.severity).toBe('alert');
  });

  it('limits alert results', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ severity: 'alert' }));
    log.record(makeParams({ severity: 'alert' }));
    log.record(makeParams({ severity: 'critical' }));

    const alerts = log.getRecentAlerts(2);
    expect(alerts).toHaveLength(2);
  });
});

describe('AuditLog — stats', () => {
  it('starts with zero counts', () => {
    const log = createAuditLog(makeDeps());
    const stats = log.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.byCategory.authentication).toBe(0);
    expect(stats.bySeverity.info).toBe(0);
  });

  it('tracks counts by category', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ category: 'authentication' }));
    log.record(makeParams({ category: 'authorization' }));
    log.record(makeParams({ category: 'authentication' }));

    const stats = log.getStats();
    expect(stats.byCategory.authentication).toBe(2);
    expect(stats.byCategory.authorization).toBe(1);
  });

  it('tracks counts by severity', () => {
    const log = createAuditLog(makeDeps());
    log.record(makeParams({ severity: 'info' }));
    log.record(makeParams({ severity: 'warning' }));
    log.record(makeParams({ severity: 'info' }));

    const stats = log.getStats();
    expect(stats.bySeverity.info).toBe(2);
    expect(stats.bySeverity.warning).toBe(1);
  });
});
