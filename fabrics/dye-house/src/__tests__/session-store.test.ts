import { describe, it, expect } from 'vitest';
import { createSessionStore } from '../session-store.js';
import type { SessionStoreDeps } from '../session-store.js';

function makeDeps(): SessionStoreDeps & { advance: (us: number) => void } {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'sess-' + String(++id) },
    clock: { nowMicroseconds: () => time },
    advance: (us: number) => {
      time += us;
    },
  };
}

describe('SessionStore — create and get', () => {
  it('creates a session', () => {
    const store = createSessionStore(makeDeps());
    const session = store.create({
      dynastyId: 'd1',
      ttlUs: 60_000_000,
    });
    expect(session.sessionId).toBe('sess-1');
    expect(session.dynastyId).toBe('d1');
  });

  it('retrieves a valid session', () => {
    const store = createSessionStore(makeDeps());
    const session = store.create({ dynastyId: 'd1', ttlUs: 60_000_000 });
    const retrieved = store.get(session.sessionId);
    expect(retrieved?.sessionId).toBe(session.sessionId);
  });

  it('returns undefined for expired session', () => {
    const deps = makeDeps();
    const store = createSessionStore(deps);
    const session = store.create({ dynastyId: 'd1', ttlUs: 10_000_000 });
    deps.advance(20_000_000);
    expect(store.get(session.sessionId)).toBeUndefined();
  });

  it('returns undefined for unknown session', () => {
    const store = createSessionStore(makeDeps());
    expect(store.get('unknown')).toBeUndefined();
  });

  it('creates with initial data', () => {
    const store = createSessionStore(makeDeps());
    const session = store.create({
      dynastyId: 'd1',
      ttlUs: 60_000_000,
      data: { role: 'admin' },
    });
    expect(session.data).toEqual({ role: 'admin' });
  });
});

describe('SessionStore — session data', () => {
  it('sets and gets data', () => {
    const store = createSessionStore(makeDeps());
    const session = store.create({ dynastyId: 'd1', ttlUs: 60_000_000 });
    expect(store.setData(session.sessionId, 'theme', 'dark')).toBe(true);
    expect(store.getData(session.sessionId, 'theme')).toBe('dark');
  });

  it('returns undefined for missing key', () => {
    const store = createSessionStore(makeDeps());
    const session = store.create({ dynastyId: 'd1', ttlUs: 60_000_000 });
    expect(store.getData(session.sessionId, 'missing')).toBeUndefined();
  });

  it('returns false for unknown session', () => {
    const store = createSessionStore(makeDeps());
    expect(store.setData('unknown', 'k', 'v')).toBe(false);
  });
});

describe('SessionStore — validity and destroy', () => {
  it('validates a live session', () => {
    const store = createSessionStore(makeDeps());
    const session = store.create({ dynastyId: 'd1', ttlUs: 60_000_000 });
    expect(store.isValid(session.sessionId)).toBe(true);
  });

  it('invalidates an expired session', () => {
    const deps = makeDeps();
    const store = createSessionStore(deps);
    const session = store.create({ dynastyId: 'd1', ttlUs: 5_000_000 });
    deps.advance(10_000_000);
    expect(store.isValid(session.sessionId)).toBe(false);
  });

  it('destroys a session', () => {
    const store = createSessionStore(makeDeps());
    const session = store.create({ dynastyId: 'd1', ttlUs: 60_000_000 });
    expect(store.destroy(session.sessionId)).toBe(true);
    expect(store.get(session.sessionId)).toBeUndefined();
  });

  it('returns false for unknown destroy', () => {
    const store = createSessionStore(makeDeps());
    expect(store.destroy('unknown')).toBe(false);
  });
});

describe('SessionStore — dynasty lookup', () => {
  it('gets session by dynasty id', () => {
    const store = createSessionStore(makeDeps());
    store.create({ dynastyId: 'd1', ttlUs: 60_000_000 });
    const found = store.getByDynasty('d1');
    expect(found?.dynastyId).toBe('d1');
  });

  it('returns undefined for unknown dynasty', () => {
    const store = createSessionStore(makeDeps());
    expect(store.getByDynasty('unknown')).toBeUndefined();
  });
});

describe('SessionStore — expiration sweep', () => {
  it('sweeps expired sessions', () => {
    const deps = makeDeps();
    const store = createSessionStore(deps);
    store.create({ dynastyId: 'd1', ttlUs: 5_000_000 });
    store.create({ dynastyId: 'd2', ttlUs: 50_000_000 });
    deps.advance(10_000_000);
    const swept = store.sweepExpired();
    expect(swept).toBe(1);
    expect(store.getStats().activeSessions).toBe(1);
  });

  it('returns 0 when nothing expired', () => {
    const store = createSessionStore(makeDeps());
    store.create({ dynastyId: 'd1', ttlUs: 60_000_000 });
    expect(store.sweepExpired()).toBe(0);
  });
});

describe('SessionStore — stats', () => {
  it('tracks aggregate statistics', () => {
    const deps = makeDeps();
    const store = createSessionStore(deps);
    store.create({ dynastyId: 'd1', ttlUs: 5_000_000 });
    const s2 = store.create({ dynastyId: 'd2', ttlUs: 60_000_000 });
    deps.advance(10_000_000);
    store.sweepExpired();
    store.destroy(s2.sessionId);

    const stats = store.getStats();
    expect(stats.totalCreated).toBe(2);
    expect(stats.totalExpired).toBe(1);
    expect(stats.totalDestroyed).toBe(1);
    expect(stats.activeSessions).toBe(0);
  });

  it('starts with zero stats', () => {
    const store = createSessionStore(makeDeps());
    const stats = store.getStats();
    expect(stats.totalCreated).toBe(0);
    expect(stats.activeSessions).toBe(0);
  });
});
