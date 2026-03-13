import { describe, it, expect } from 'vitest';
import {
  createConnectionMigration,
  type ConnectionMigrationDeps,
} from '../connection-migration.js';

// ── Helpers ───────────────────────────────────────────────────────────

function makeStaticDeps(): ConnectionMigrationDeps {
  let seq = 0;
  return {
    clock: { nowMs: () => 1_000_000 },
    id: { next: () => `tok-${String(++seq)}` },
    log: { info: () => undefined, warn: () => undefined },
    config: { tokenTtlMs: 5_000 },
  };
}

function makeDynamicDeps(): { deps: ConnectionMigrationDeps; advance: (ms: number) => void } {
  let seq = 0;
  let time = 1_000_000;
  return {
    deps: {
      clock: { nowMs: () => time },
      id: { next: () => `tok-${String(++seq)}` },
      log: { info: () => undefined, warn: () => undefined },
      config: { tokenTtlMs: 5_000 },
    },
    advance: (ms: number) => { time += ms; },
  };
}

// ── initiateMigration ─────────────────────────────────────────────────

describe('initiateMigration', () => {
  it('creates a pending migration record', () => {
    const cm = createConnectionMigration(makeStaticDeps());
    const { record } = cm.initiateMigration('player-1', 'server-A', 'server-B', []);
    expect(record.status).toBe('pending');
    expect(record.playerId).toBe('player-1');
    expect(record.fromServerId).toBe('server-A');
    expect(record.toServerId).toBe('server-B');
  });

  it('stores buffered inputs in the record', () => {
    const cm = createConnectionMigration(makeStaticDeps());
    const inputs = [{ action: 'jump' }, { action: 'move' }];
    const { record } = cm.initiateMigration('p', 'sA', 'sB', inputs);
    expect(record.bufferedInputs).toHaveLength(2);
  });
});

// ── completeMigration ─────────────────────────────────────────────────

describe('completeMigration', () => {
  it('marks migration completed and returns buffered inputs', () => {
    const cm = createConnectionMigration(makeStaticDeps());
    const { token } = cm.initiateMigration('p', 'sA', 'sB', ['input-1']);
    const result = cm.completeMigration(token);
    expect(result.record.status).toBe('completed');
    expect(result.bufferedInputs).toEqual(['input-1']);
  });

  it('throws for an unknown token', () => {
    const cm = createConnectionMigration(makeStaticDeps());
    expect(() => cm.completeMigration('no-such-token')).toThrow();
  });

  it('throws for an already completed token', () => {
    const cm = createConnectionMigration(makeStaticDeps());
    const { token } = cm.initiateMigration('p', 'sA', 'sB', []);
    cm.completeMigration(token);
    expect(() => cm.completeMigration(token)).toThrow(/completed/);
  });
});

// ── cancelMigration ───────────────────────────────────────────────────

describe('cancelMigration', () => {
  it('marks migration cancelled', () => {
    const cm = createConnectionMigration(makeStaticDeps());
    const { token } = cm.initiateMigration('p', 'sA', 'sB', []);
    const rec = cm.cancelMigration(token);
    expect(rec.status).toBe('cancelled');
  });

  it('throws for an already cancelled migration', () => {
    const cm = createConnectionMigration(makeStaticDeps());
    const { token } = cm.initiateMigration('p', 'sA', 'sB', []);
    cm.cancelMigration(token);
    expect(() => cm.cancelMigration(token)).toThrow(/cancelled/);
  });
});

// ── cleanupExpiredMigrations ──────────────────────────────────────────

describe('cleanupExpiredMigrations', () => {
  it('expires pending migrations past their TTL', () => {
    const { deps, advance } = makeDynamicDeps();
    const cm = createConnectionMigration(deps);
    cm.initiateMigration('p', 'sA', 'sB', []);
    advance(6_000);
    const expired = cm.cleanupExpiredMigrations();
    expect(expired).toBe(1);
  });

  it('does not expire completed migrations', () => {
    const { deps, advance } = makeDynamicDeps();
    const cm = createConnectionMigration(deps);
    const { token } = cm.initiateMigration('p', 'sA', 'sB', []);
    cm.completeMigration(token);
    advance(6_000);
    expect(cm.cleanupExpiredMigrations()).toBe(0);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zeros', () => {
    const s = createConnectionMigration(makeStaticDeps()).getStats();
    expect(s.initiated).toBe(0);
    expect(s.completed).toBe(0);
    expect(s.cancelled).toBe(0);
    expect(s.expired).toBe(0);
    expect(s.pending).toBe(0);
  });

  it('tracks initiated, completed, cancelled, expired', () => {
    const { deps, advance } = makeDynamicDeps();
    const cm = createConnectionMigration(deps);
    const { token: t1 } = cm.initiateMigration('p1', 'sA', 'sB', []);
    cm.completeMigration(t1);
    const { token: t2 } = cm.initiateMigration('p2', 'sA', 'sB', []);
    cm.cancelMigration(t2);
    cm.initiateMigration('p3', 'sA', 'sB', []);
    advance(6_000);
    cm.cleanupExpiredMigrations();
    const s = cm.getStats();
    expect(s.initiated).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.cancelled).toBe(1);
    expect(s.expired).toBe(1);
  });
});

