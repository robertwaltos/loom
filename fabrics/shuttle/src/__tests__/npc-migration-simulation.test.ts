import { describe, expect, it } from 'vitest';
import { createNpcMigrationSystem } from '../npc-migration.js';

describe('npc-migration simulation', () => {
  it('simulates migration evaluation and completion into a destination world', () => {
    let now = 1_000_000n;
    let id = 0;
    const sys = createNpcMigrationSystem({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `mig-${id++}` },
      logger: { info: () => undefined },
    });

    const decision = sys.evaluateMigration('npc-1', 'world-a', 'world-b', 0.1, 0.9, 0.7, 0.8);
    expect(decision.shouldMigrate).toBe(true);

    const migration = sys.recordMigration('npc-1', 'world-a', 'world-b', 'SAFETY');
    if (typeof migration === 'string') throw new Error('migration create failed');
    sys.startTransit(migration.migrationId);
    const completed = sys.completeMigration(migration.migrationId);

    expect(typeof completed).toBe('object');
    if (typeof completed === 'object') {
      expect(completed.status).toBe('COMPLETED');
    }
  });
});
