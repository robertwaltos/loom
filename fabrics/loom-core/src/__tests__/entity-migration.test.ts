/**
 * entity-migration.test.ts — Tests for EntityMigrationSystem
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEntityMigrationSystem,
  type EntityMigrationSystem,
  type EntityMigrationDeps,
} from '../entity-migration.js';

function makeDeps(): EntityMigrationDeps {
  let time = 1_000_000n;
  let id = 0;
  const logs: string[] = [];
  return {
    clock: { nowUs: () => (time += 1_000n) },
    idGen: { generate: () => 'mig-' + String(id++) },
    logger: {
      debug: (m) => logs.push('D:' + m),
      info: (m) => logs.push('I:' + m),
      warn: (m) => logs.push('W:' + m),
      error: (m) => logs.push('E:' + m),
    },
  };
}

let sys: EntityMigrationSystem;

beforeEach(() => {
  sys = createEntityMigrationSystem(makeDeps());
});

describe('EntityMigration — startMigration', () => {
  it('creates a PENDING migration', () => {
    const result = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    expect(typeof result).toBe('object');
    const m = result as ReturnType<typeof sys.getMigration>;
    expect(m).toBeDefined();
    if (typeof result === 'object') {
      expect(result.status).toBe('PENDING');
      expect(result.entityId).toBe('e-1');
      expect(result.fromWorld).toBe('world-a');
      expect(result.toWorld).toBe('world-b');
      expect(result.completedAt).toBeNull();
      expect(result.failureReason).toBeNull();
    }
  });

  it('returns same-world when fromWorld === toWorld', () => {
    const result = sys.startMigration('e-1', 'NPC', 'world-a', 'world-a');
    expect(result).toBe('same-world');
  });

  it('returns migration-in-progress when entity has active PENDING migration', () => {
    sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    const result = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-c');
    expect(result).toBe('migration-in-progress');
  });

  it('returns migration-in-progress when entity has active IN_FLIGHT migration', () => {
    const first = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    if (typeof first !== 'object') throw new Error('expected migration');
    sys.completeMigration(first.migrationId);
    const result = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-c');
    expect(result).toBe('migration-in-progress');
  });

  it('allows new migration after rollback', () => {
    const first = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    if (typeof first !== 'object') throw new Error('expected migration');
    sys.rollbackMigration(first.migrationId, 'cancelled');
    const second = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    expect(typeof second).toBe('object');
    if (typeof second === 'object') expect(second.status).toBe('PENDING');
  });
});

describe('EntityMigration — completeMigration', () => {
  it('transitions PENDING to IN_FLIGHT', () => {
    const m = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    if (typeof m !== 'object') throw new Error('expected migration');
    const result = sys.completeMigration(m.migrationId);
    expect(result.success).toBe(true);
    if (result.success) expect(result.migration.status).toBe('IN_FLIGHT');
  });

  it('returns migration-not-found for unknown migrationId', () => {
    const result = sys.completeMigration('unknown-id');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('migration-not-found');
  });

  it('returns invalid-status-transition when already IN_FLIGHT', () => {
    const m = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    if (typeof m !== 'object') throw new Error('expected migration');
    sys.completeMigration(m.migrationId);
    const result = sys.completeMigration(m.migrationId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-status-transition');
  });
});

describe('EntityMigration — rollbackMigration', () => {
  it('rolls back a PENDING migration', () => {
    const m = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    if (typeof m !== 'object') throw new Error('expected migration');
    const result = sys.rollbackMigration(m.migrationId, 'user cancelled');
    expect(result.success).toBe(true);
    const fetched = sys.getMigration(m.migrationId);
    expect(fetched?.status).toBe('ROLLED_BACK');
    expect(fetched?.failureReason).toBe('user cancelled');
  });

  it('rolls back an IN_FLIGHT migration', () => {
    const m = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    if (typeof m !== 'object') throw new Error('expected migration');
    sys.completeMigration(m.migrationId);
    const result = sys.rollbackMigration(m.migrationId, 'destination unavailable');
    expect(result.success).toBe(true);
  });

  it('returns invalid-status-transition for a FAILED migration', () => {
    const m = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    if (typeof m !== 'object') throw new Error('expected migration');
    sys.failMigration(m.migrationId, 'connection lost');
    const result = sys.rollbackMigration(m.migrationId, 'too late');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-status-transition');
  });
});

describe('EntityMigration — failMigration', () => {
  it('fails a PENDING migration with reason', () => {
    const m = sys.startMigration('e-1', 'NPC', 'world-a', 'world-b');
    if (typeof m !== 'object') throw new Error('expected migration');
    const result = sys.failMigration(m.migrationId, 'network error');
    expect(result.success).toBe(true);
    const fetched = sys.getMigration(m.migrationId);
    expect(fetched?.status).toBe('FAILED');
    expect(fetched?.failureReason).toBe('network error');
  });

  it('returns migration-not-found for unknown id', () => {
    const result = sys.failMigration('ghost-id', 'reason');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('migration-not-found');
  });
});

describe('EntityMigration — listMigrations & getActiveMigrations', () => {
  it('lists all migrations without filter', () => {
    sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    sys.startMigration('e-2', 'NPC', 'world-c', 'world-d');
    expect(sys.listMigrations()).toHaveLength(2);
  });

  it('filters migrations by worldId', () => {
    sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    sys.startMigration('e-2', 'NPC', 'world-c', 'world-d');
    expect(sys.listMigrations('world-a')).toHaveLength(1);
    expect(sys.listMigrations('world-d')).toHaveLength(1);
  });

  it('returns active migrations only', () => {
    const m1 = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    const m2 = sys.startMigration('e-2', 'NPC', 'world-c', 'world-d');
    if (typeof m2 !== 'object') throw new Error('expected migration');
    sys.failMigration(m2.migrationId, 'error');
    const active = sys.getActiveMigrations();
    expect(active).toHaveLength(1);
    if (typeof m1 === 'object') expect(active[0]?.entityId).toBe('e-1');
  });
});

describe('EntityMigration — getMigrationStats', () => {
  it('starts with zero stats', () => {
    const stats = sys.getMigrationStats();
    expect(stats.total).toBe(0);
    expect(stats.pending).toBe(0);
  });

  it('tracks all statuses correctly', () => {
    const m1 = sys.startMigration('e-1', 'PLAYER', 'world-a', 'world-b');
    const m2 = sys.startMigration('e-2', 'NPC', 'world-c', 'world-d');
    const m3 = sys.startMigration('e-3', 'ITEM', 'world-e', 'world-f');
    if (typeof m2 !== 'object' || typeof m3 !== 'object') throw new Error();
    sys.rollbackMigration(m2.migrationId, 'r');
    sys.failMigration(m3.migrationId, 'f');
    const stats = sys.getMigrationStats();
    expect(stats.total).toBe(3);
    expect(stats.pending).toBe(1);
    expect(stats.rolledBack).toBe(1);
    expect(stats.failed).toBe(1);
    void m1;
  });
});
