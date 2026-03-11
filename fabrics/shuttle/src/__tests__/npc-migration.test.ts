import { describe, it, expect } from 'vitest';
import {
  createNpcMigrationSystem,
  WAVE_THRESHOLD,
  MIGRATION_CONFIDENCE_THRESHOLD,
} from '../npc-migration.js';
import type { NpcMigrationDeps } from '../npc-migration.js';

function createDeps(): NpcMigrationDeps {
  let time = 1000n;
  let id = 0;
  const logs: string[] = [];
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'mig-' + String(id++) },
    logger: {
      info: (msg: string, ctx: Record<string, unknown>) => {
        logs.push(msg + ':' + JSON.stringify(ctx));
      },
    },
  };
}

describe('NpcMigrationSystem — recordMigration', () => {
  it('records a new migration', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec = sys.recordMigration('npc-1', 'world-A', 'world-B', 'ECONOMIC');
    expect(typeof rec).toBe('object');
    if (typeof rec === 'object') {
      expect(rec.migrationId).toBe('mig-0');
      expect(rec.npcId).toBe('npc-1');
      expect(rec.fromWorldId).toBe('world-A');
      expect(rec.toWorldId).toBe('world-B');
      expect(rec.reason).toBe('ECONOMIC');
      expect(rec.status).toBe('PENDING');
    }
  });

  it('rejects duplicate migration for same npc', () => {
    const sys = createNpcMigrationSystem(createDeps());
    sys.recordMigration('npc-1', 'world-A', 'world-B', 'SAFETY');
    const dup = sys.recordMigration('npc-1', 'world-A', 'world-C', 'FACTION');
    expect(dup).toBe('duplicate_migration');
  });

  it('rejects same from and to world', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const err = sys.recordMigration('npc-1', 'world-A', 'world-A', 'FORCED');
    expect(err).toBe('invalid_world');
  });
});

describe('NpcMigrationSystem — startTransit', () => {
  it('transitions PENDING to IN_TRANSIT', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec = sys.recordMigration('npc-1', 'world-A', 'world-B', 'OPPORTUNITY');
    if (typeof rec === 'object') {
      const transit = sys.startTransit(rec.migrationId);
      expect(typeof transit).toBe('object');
      if (typeof transit === 'object') {
        expect(transit.status).toBe('IN_TRANSIT');
      }
    }
  });

  it('returns error for unknown migration', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const res = sys.startTransit('fake-id');
    expect(res).toBe('migration_not_found');
  });
});

describe('NpcMigrationSystem — completeMigration', () => {
  it('marks migration as COMPLETED', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec = sys.recordMigration('npc-1', 'world-A', 'world-B', 'ECONOMIC');
    if (typeof rec === 'object') {
      sys.startTransit(rec.migrationId);
      const done = sys.completeMigration(rec.migrationId);
      expect(typeof done).toBe('object');
      if (typeof done === 'object') {
        expect(done.status).toBe('COMPLETED');
        expect(done.completedAt).toBeDefined();
      }
    }
  });

  it('rejects completing already completed migration', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec = sys.recordMigration('npc-1', 'world-A', 'world-B', 'SAFETY');
    if (typeof rec === 'object') {
      sys.startTransit(rec.migrationId);
      sys.completeMigration(rec.migrationId);
      const err = sys.completeMigration(rec.migrationId);
      expect(err).toBe('already_completed');
    }
  });

  it('returns error for unknown migration', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const err = sys.completeMigration('fake-id');
    expect(err).toBe('migration_not_found');
  });
});

describe('NpcMigrationSystem — cancelMigration', () => {
  it('cancels PENDING migration', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec = sys.recordMigration('npc-1', 'world-A', 'world-B', 'FACTION');
    if (typeof rec === 'object') {
      const cancelled = sys.cancelMigration(rec.migrationId);
      expect(typeof cancelled).toBe('object');
      if (typeof cancelled === 'object') {
        expect(cancelled.status).toBe('CANCELLED');
      }
    }
  });

  it('cancels IN_TRANSIT migration', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec = sys.recordMigration('npc-1', 'world-A', 'world-B', 'FORCED');
    if (typeof rec === 'object') {
      sys.startTransit(rec.migrationId);
      const cancelled = sys.cancelMigration(rec.migrationId);
      expect(typeof cancelled).toBe('object');
      if (typeof cancelled === 'object') {
        expect(cancelled.status).toBe('CANCELLED');
      }
    }
  });
});

describe('NpcMigrationSystem — evaluateMigration', () => {
  it('decides to migrate when net score is high', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const decision = sys.evaluateMigration('npc-1', 'world-A', 'world-B', 0.2, 0.9, 0.8, 0.7);
    expect(decision.shouldMigrate).toBe(true);
    expect(decision.targetWorldId).toBe('world-B');
    expect(decision.confidence).toBeGreaterThan(MIGRATION_CONFIDENCE_THRESHOLD);
  });

  it('decides not to migrate when net score is low', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const decision = sys.evaluateMigration('npc-1', 'world-A', 'world-B', 0.9, 0.1, 0.1, 0.1);
    expect(decision.shouldMigrate).toBe(false);
    expect(decision.targetWorldId).toBeUndefined();
  });

  it('selects primary reason based on highest factor', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const decision = sys.evaluateMigration('npc-1', 'world-A', 'world-B', 0.1, 0.95, 0.3, 0.2);
    expect(decision.primaryReason).toBe('SAFETY');
  });
});

describe('NpcMigrationSystem — getMigrationWaves', () => {
  it('detects migration wave when threshold reached', () => {
    const sys = createNpcMigrationSystem(createDeps());
    for (let i = 0; i < WAVE_THRESHOLD; i++) {
      sys.recordMigration('npc-' + String(i), 'world-A', 'world-B', 'ECONOMIC');
    }
    const waves = sys.getMigrationWaves(undefined);
    expect(waves.length).toBeGreaterThan(0);
    const wave = waves[0];
    expect(wave?.fromWorldId).toBe('world-A');
    expect(wave?.toWorldId).toBe('world-B');
    expect(wave?.npcCount).toBeGreaterThanOrEqual(WAVE_THRESHOLD);
  });

  it('filters waves by world id', () => {
    const sys = createNpcMigrationSystem(createDeps());
    for (let i = 0; i < WAVE_THRESHOLD; i++) {
      sys.recordMigration('npc-' + String(i), 'world-A', 'world-B', 'SAFETY');
    }
    const waves = sys.getMigrationWaves('world-A');
    expect(waves.length).toBeGreaterThan(0);
    const filtered = sys.getMigrationWaves('world-C');
    expect(filtered.length).toBe(0);
  });

  it('determines dominant reason in wave', () => {
    const sys = createNpcMigrationSystem(createDeps());
    sys.recordMigration('npc-1', 'world-A', 'world-B', 'FACTION');
    sys.recordMigration('npc-2', 'world-A', 'world-B', 'FACTION');
    sys.recordMigration('npc-3', 'world-A', 'world-B', 'FACTION');
    sys.recordMigration('npc-4', 'world-A', 'world-B', 'ECONOMIC');
    sys.recordMigration('npc-5', 'world-A', 'world-B', 'FACTION');
    sys.recordMigration('npc-6', 'world-A', 'world-B', 'FACTION');
    const waves = sys.getMigrationWaves(undefined);
    expect(waves.length).toBeGreaterThan(0);
    const wave = waves[0];
    expect(wave?.dominantReason).toBe('FACTION');
  });
});

describe('NpcMigrationSystem — getPopulationFlow', () => {
  it('computes inflow and outflow', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec1 = sys.recordMigration('npc-1', 'world-A', 'world-B', 'ECONOMIC');
    const rec2 = sys.recordMigration('npc-2', 'world-A', 'world-B', 'SAFETY');
    const rec3 = sys.recordMigration('npc-3', 'world-B', 'world-C', 'OPPORTUNITY');
    if (typeof rec1 === 'object') sys.completeMigration(rec1.migrationId);
    if (typeof rec2 === 'object') sys.completeMigration(rec2.migrationId);
    if (typeof rec3 === 'object') sys.completeMigration(rec3.migrationId);
    const flowB = sys.getPopulationFlow('world-B');
    expect(flowB.inflow).toBe(2);
    expect(flowB.outflow).toBe(1);
    expect(flowB.netChange).toBe(1);
  });

  it('returns zero flow for world with no migrations', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const flow = sys.getPopulationFlow('world-X');
    expect(flow.inflow).toBe(0);
    expect(flow.outflow).toBe(0);
    expect(flow.netChange).toBe(0);
  });
});

describe('NpcMigrationSystem — computePushPullFactors', () => {
  it('computes push and pull scores', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const factors = sys.computePushPullFactors('world-A', 0.3, 0.8, 0.6);
    expect(factors.pushScore).toBeCloseTo(0.7, 2);
    expect(factors.pullScore).toBeCloseTo(1.4, 2);
    expect(factors.netScore).toBeCloseTo(0.7, 2);
  });

  it('computes negative net score for high push', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const factors = sys.computePushPullFactors('world-A', 0.1, 0.2, 0.1);
    expect(factors.pushScore).toBeCloseTo(0.9, 2);
    expect(factors.pullScore).toBeCloseTo(0.3, 2);
    expect(factors.netScore).toBeLessThan(0);
  });
});

describe('NpcMigrationSystem — getMigrationRecord', () => {
  it('retrieves migration by id', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec = sys.recordMigration('npc-1', 'world-A', 'world-B', 'FORCED');
    if (typeof rec === 'object') {
      const retrieved = sys.getMigrationRecord(rec.migrationId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.npcId).toBe('npc-1');
    }
  });

  it('returns undefined for unknown id', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const retrieved = sys.getMigrationRecord('unknown');
    expect(retrieved).toBeUndefined();
  });
});

describe('NpcMigrationSystem — getMigrationsByNpc', () => {
  it('lists migrations for an npc', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec1 = sys.recordMigration('npc-1', 'world-A', 'world-B', 'ECONOMIC');
    if (typeof rec1 === 'object') {
      sys.completeMigration(rec1.migrationId);
    }
    const migrations = sys.getMigrationsByNpc('npc-1');
    expect(migrations.length).toBe(1);
    expect(migrations[0]?.npcId).toBe('npc-1');
  });

  it('returns empty for npc with no migrations', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const migrations = sys.getMigrationsByNpc('ghost');
    expect(migrations.length).toBe(0);
  });
});

describe('NpcMigrationSystem — getStats', () => {
  it('reports migration statistics', () => {
    const sys = createNpcMigrationSystem(createDeps());
    const rec1 = sys.recordMigration('npc-1', 'world-A', 'world-B', 'ECONOMIC');
    const rec2 = sys.recordMigration('npc-2', 'world-A', 'world-B', 'SAFETY');
    const rec3 = sys.recordMigration('npc-3', 'world-C', 'world-D', 'FACTION');
    if (typeof rec1 === 'object') sys.startTransit(rec1.migrationId);
    if (typeof rec2 === 'object') {
      sys.startTransit(rec2.migrationId);
      sys.completeMigration(rec2.migrationId);
    }
    const stats = sys.getStats();
    expect(stats.totalMigrations).toBe(3);
    expect(stats.pending).toBe(1);
    expect(stats.inTransit).toBe(1);
    expect(stats.completed).toBe(1);
  });

  it('identifies most active world', () => {
    const sys = createNpcMigrationSystem(createDeps());
    sys.recordMigration('npc-1', 'world-A', 'world-B', 'ECONOMIC');
    sys.recordMigration('npc-2', 'world-A', 'world-C', 'SAFETY');
    sys.recordMigration('npc-3', 'world-A', 'world-D', 'FORCED');
    const stats = sys.getStats();
    expect(stats.mostActiveWorld).toBe('world-A');
  });
});
