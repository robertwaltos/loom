import { describe, it, expect } from 'vitest';
import { createConnectionMigration } from '../connection-migration.js';

let idSeq = 0;
function makeMigration(tokenTtlMs = 10_000) {
  idSeq = 0;
  let time = 1_000;
  return {
    migration: createConnectionMigration({
      clock: { nowMs: () => time },
      id: { next: () => `mig-${++idSeq}` },
      log: { info: () => {}, warn: () => {} },
      config: { tokenTtlMs },
    }),
    advance: (ms: number) => { time += ms; },
  };
}

describe('Connection Migration Simulation', () => {
  it('initiates and completes a migration with buffered inputs', () => {
    const { migration } = makeMigration();

    const inputs = [{ seq: 1, action: 'move-forward' }, { seq: 2, action: 'jump' }];
    const result = migration.initiateMigration('player-1', 'server-A', 'server-B', inputs);
    expect(result).not.toBe('player-not-found');
    expect(typeof result).toBe('object');

    const token = (result as { token: string }).token;
    const completed = migration.completeMigration(token);
    expect(completed.record).toBeDefined();
    expect(completed.bufferedInputs).toHaveLength(2);
  });

  it('cancels a migration', () => {
    const { migration } = makeMigration();

    const result = migration.initiateMigration('player-2', 'server-A', 'server-C', []);
    const token = (result as { token: string }).token;

    const cancelled = migration.cancelMigration(token);
    expect(cancelled).toBeDefined();
    expect(cancelled.status).toBe('cancelled');

    // Completing a cancelled migration should throw
    expect(() => migration.completeMigration(token)).toThrow();
  });

  it('expires migrations past TTL', () => {
    const { migration, advance } = makeMigration(500);

    const result = migration.initiateMigration('player-3', 'server-X', 'server-Y', []);
    const token = (result as { token: string }).token;

    advance(1_000);
    migration.cleanupExpiredMigrations();

    // Completing an expired migration should throw
    expect(() => migration.completeMigration(token)).toThrow();
  });
});
