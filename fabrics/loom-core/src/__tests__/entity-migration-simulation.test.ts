import { describe, expect, it } from 'vitest';
import { createEntityMigrationSystem } from '../entity-migration.js';

describe('entity-migration simulation', () => {
  it('simulates migration lifecycle across success, failure, and rollback paths', () => {
    let now = 1_000_000n;
    let id = 0;
    const sys = createEntityMigrationSystem({
      clock: { nowUs: () => (now += 1_000n) },
      idGen: { generate: () => `mig-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    const first = sys.startMigration('entity-1', 'PLAYER', 'world-a', 'world-b');
    const second = sys.startMigration('entity-2', 'NPC', 'world-a', 'world-c');
    if (typeof first === 'string' || typeof second === 'string') {
      throw new Error('expected migrations');
    }

    const complete = sys.completeMigration(first.migrationId);
    const rollback = sys.rollbackMigration(first.migrationId, 'operator cancel');
    const fail = sys.failMigration(second.migrationId, 'network partition');

    expect(complete.success).toBe(true);
    expect(rollback.success).toBe(true);
    expect(fail.success).toBe(true);
    expect(sys.getActiveMigrations()).toHaveLength(0);

    const stats = sys.getMigrationStats();
    expect(stats.total).toBe(2);
    expect(stats.rolledBack).toBe(1);
    expect(stats.failed).toBe(1);
  });
});
