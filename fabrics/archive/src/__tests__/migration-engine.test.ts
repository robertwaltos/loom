import { describe, it, expect } from 'vitest';
import { createMigrationEngine } from '../migration-engine.js';
import type { MigrationEngineDeps } from '../migration-engine.js';

function makeDeps(): MigrationEngineDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'mig-' + String(++idCounter) },
  };
}

describe('MigrationEngine — register', () => {
  it('registers a migration', () => {
    const engine = createMigrationEngine(makeDeps());
    const ok = engine.register({
      version: 1,
      name: 'create-users',
      up: () => true,
      down: () => true,
    });
    expect(ok).toBe(true);
  });

  it('rejects duplicate version', () => {
    const engine = createMigrationEngine(makeDeps());
    engine.register({ version: 1, name: 'a', up: () => true, down: () => true });
    const dup = engine.register({ version: 1, name: 'b', up: () => true, down: () => true });
    expect(dup).toBe(false);
  });

  it('lists pending migrations', () => {
    const engine = createMigrationEngine(makeDeps());
    engine.register({ version: 1, name: 'a', up: () => true, down: () => true });
    engine.register({ version: 2, name: 'b', up: () => true, down: () => true });
    expect(engine.getPending()).toHaveLength(2);
  });
});

describe('MigrationEngine — migrate up', () => {
  it('applies pending migrations in order', () => {
    const engine = createMigrationEngine(makeDeps());
    const order: number[] = [];
    engine.register({
      version: 2,
      name: 'second',
      up: () => {
        order.push(2);
        return true;
      },
      down: () => true,
    });
    engine.register({
      version: 1,
      name: 'first',
      up: () => {
        order.push(1);
        return true;
      },
      down: () => true,
    });
    const result = engine.migrateUp();
    expect(result.applied).toHaveLength(2);
    expect(order).toEqual([1, 2]);
    expect(result.currentVersion).toBe(2);
  });

  it('stops on failure', () => {
    const engine = createMigrationEngine(makeDeps());
    engine.register({ version: 1, name: 'ok', up: () => true, down: () => true });
    engine.register({ version: 2, name: 'fail', up: () => false, down: () => true });
    engine.register({ version: 3, name: 'skip', up: () => true, down: () => true });
    const result = engine.migrateUp();
    expect(result.currentVersion).toBe(1);
    expect(result.applied).toHaveLength(2);
  });

  it('does nothing when all applied', () => {
    const engine = createMigrationEngine(makeDeps());
    engine.register({ version: 1, name: 'a', up: () => true, down: () => true });
    engine.migrateUp();
    const result = engine.migrateUp();
    expect(result.applied).toHaveLength(0);
  });

  it('reports current version', () => {
    const engine = createMigrationEngine(makeDeps());
    expect(engine.getCurrentVersion()).toBe(0);
    engine.register({ version: 5, name: 'v5', up: () => true, down: () => true });
    engine.migrateUp();
    expect(engine.getCurrentVersion()).toBe(5);
  });
});

describe('MigrationEngine — migrate down', () => {
  it('rolls back current version', () => {
    const engine = createMigrationEngine(makeDeps());
    engine.register({ version: 1, name: 'a', up: () => true, down: () => true });
    engine.register({ version: 2, name: 'b', up: () => true, down: () => true });
    engine.migrateUp();
    const record = engine.migrateDown();
    expect(record?.version).toBe(2);
    expect(engine.getCurrentVersion()).toBe(1);
  });

  it('returns undefined at version 0', () => {
    const engine = createMigrationEngine(makeDeps());
    expect(engine.migrateDown()).toBeUndefined();
  });

  it('tracks rollback in history', () => {
    const engine = createMigrationEngine(makeDeps());
    engine.register({ version: 1, name: 'a', up: () => true, down: () => true });
    engine.migrateUp();
    engine.migrateDown();
    const history = engine.getHistory();
    expect(history).toHaveLength(2);
    expect(history[1]?.direction).toBe('down');
  });
});

describe('MigrationEngine — stats', () => {
  it('starts with zero stats', () => {
    const engine = createMigrationEngine(makeDeps());
    const stats = engine.getStats();
    expect(stats.registeredMigrations).toBe(0);
    expect(stats.appliedCount).toBe(0);
    expect(stats.currentVersion).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const engine = createMigrationEngine(makeDeps());
    engine.register({ version: 1, name: 'a', up: () => true, down: () => true });
    engine.register({ version: 2, name: 'b', up: () => true, down: () => true });
    engine.migrateUp();
    const stats = engine.getStats();
    expect(stats.registeredMigrations).toBe(2);
    expect(stats.appliedCount).toBe(2);
    expect(stats.currentVersion).toBe(2);
  });
});
