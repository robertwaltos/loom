import { describe, it, expect } from 'vitest';
import { createAuditLogService } from '../audit-log.js';
import type { AuditLogDeps } from '../audit-log.js';

function createDeps(): AuditLogDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'aud-' + String(id++) },
  };
}

describe('AuditLogService — record', () => {
  it('records an audit entry with sequence number', () => {
    const svc = createAuditLogService(createDeps());
    const entry = svc.record({
      actorId: 'user-1',
      action: 'login',
      resource: 'auth',
      outcome: 'success',
      detail: 'password auth',
    });
    expect(entry.entryId).toBe('aud-0');
    expect(entry.actorId).toBe('user-1');
    expect(entry.action).toBe('login');
    expect(entry.sequenceNumber).toBe(0);
    expect(entry.recordedAt).toBeGreaterThan(0);
  });

  it('increments sequence numbers', () => {
    const svc = createAuditLogService(createDeps());
    svc.record({ actorId: 'a', action: 'x', resource: 'r', outcome: 'success', detail: '' });
    const second = svc.record({ actorId: 'b', action: 'y', resource: 'r', outcome: 'failure', detail: '' });
    expect(second.sequenceNumber).toBe(1);
  });
});

describe('AuditLogService — getEntry', () => {
  it('retrieves an entry by ID', () => {
    const svc = createAuditLogService(createDeps());
    const entry = svc.record({ actorId: 'a', action: 'x', resource: 'r', outcome: 'success', detail: '' });
    expect(svc.getEntry(entry.entryId)).toBeDefined();
    expect(svc.getEntry(entry.entryId)?.actorId).toBe('a');
  });

  it('returns undefined for unknown ID', () => {
    const svc = createAuditLogService(createDeps());
    expect(svc.getEntry('nonexistent')).toBeUndefined();
  });
});

describe('AuditLogService — query', () => {
  it('filters by actorId', () => {
    const svc = createAuditLogService(createDeps());
    svc.record({ actorId: 'alice', action: 'login', resource: 'auth', outcome: 'success', detail: '' });
    svc.record({ actorId: 'bob', action: 'login', resource: 'auth', outcome: 'success', detail: '' });
    svc.record({ actorId: 'alice', action: 'logout', resource: 'auth', outcome: 'success', detail: '' });
    const results = svc.query({ actorId: 'alice' });
    expect(results).toHaveLength(2);
  });

  it('filters by outcome', () => {
    const svc = createAuditLogService(createDeps());
    svc.record({ actorId: 'a', action: 'x', resource: 'r', outcome: 'success', detail: '' });
    svc.record({ actorId: 'a', action: 'y', resource: 'r', outcome: 'denied', detail: '' });
    svc.record({ actorId: 'a', action: 'z', resource: 'r', outcome: 'denied', detail: '' });
    const results = svc.query({ outcome: 'denied' });
    expect(results).toHaveLength(2);
  });

  it('combines multiple filters', () => {
    const svc = createAuditLogService(createDeps());
    svc.record({ actorId: 'alice', action: 'login', resource: 'auth', outcome: 'success', detail: '' });
    svc.record({ actorId: 'alice', action: 'login', resource: 'auth', outcome: 'failure', detail: '' });
    svc.record({ actorId: 'bob', action: 'login', resource: 'auth', outcome: 'failure', detail: '' });
    const results = svc.query({ actorId: 'alice', outcome: 'failure' });
    expect(results).toHaveLength(1);
  });
});

describe('AuditLogService — getRecent', () => {
  it('returns the most recent entries', () => {
    const svc = createAuditLogService(createDeps());
    svc.record({ actorId: 'a', action: 'x', resource: 'r', outcome: 'success', detail: '' });
    svc.record({ actorId: 'b', action: 'y', resource: 'r', outcome: 'success', detail: '' });
    svc.record({ actorId: 'c', action: 'z', resource: 'r', outcome: 'success', detail: '' });
    const recent = svc.getRecent(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.actorId).toBe('b');
    expect(recent[1]?.actorId).toBe('c');
  });

  it('returns all entries when count exceeds total', () => {
    const svc = createAuditLogService(createDeps());
    svc.record({ actorId: 'a', action: 'x', resource: 'r', outcome: 'success', detail: '' });
    const recent = svc.getRecent(10);
    expect(recent).toHaveLength(1);
  });
});

describe('AuditLogService — getStats', () => {
  it('reports outcome counts', () => {
    const svc = createAuditLogService(createDeps());
    svc.record({ actorId: 'a', action: 'x', resource: 'r', outcome: 'success', detail: '' });
    svc.record({ actorId: 'a', action: 'y', resource: 'r', outcome: 'failure', detail: '' });
    svc.record({ actorId: 'a', action: 'z', resource: 'r', outcome: 'denied', detail: '' });
    svc.record({ actorId: 'a', action: 'w', resource: 'r', outcome: 'success', detail: '' });
    const stats = svc.getStats();
    expect(stats.totalEntries).toBe(4);
    expect(stats.successCount).toBe(2);
    expect(stats.failureCount).toBe(1);
    expect(stats.deniedCount).toBe(1);
  });
});
