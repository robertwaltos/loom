import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSchemaRegistry,
  schemaVersion,
  type SchemaDescriptor,
  type MigrationStep,
} from '../protocol-evolution.js';

function makeDesc(version: number, minRead: number, log = `v${String(version)}`): SchemaDescriptor {
  return {
    version: schemaVersion(version),
    changelog: log,
    minimumReadableVersion: schemaVersion(minRead),
    compatibilityClass: 'full',
    publishedAt: Date.now(),
  };
}

const identity = (p: Uint8Array): Uint8Array => p;

describe('schemaVersion helper', () => {
  it('wraps a valid integer', () => {
    expect(() => { schemaVersion(1); }).not.toThrow();
  });
  it('rejects zero', () => {
    expect(() => { schemaVersion(0); }).toThrow();
  });
  it('rejects negative', () => {
    expect(() => { schemaVersion(-1); }).toThrow();
  });
  it('rejects floats', () => {
    expect(() => { schemaVersion(1.5); }).toThrow();
  });
});

describe('register', () => {
  it('registers a fresh version without error', () => {
    const reg = createSchemaRegistry();
    expect(reg.register(makeDesc(1, 1))).toBeUndefined();
  });

  it('rejects duplicate versions', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    expect(reg.register(makeDesc(1, 1))).toBe('version-already-registered');
  });

  it('rejects non-monotonic versions', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(2, 1));
    expect(reg.register(makeDesc(1, 1))).toBe('non-monotonic-version');
  });

  it('tracks currentVersion', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    reg.register(makeDesc(2, 1));
    expect(reg.currentVersion()).toBe(2);
  });
});

describe('addMigration', () => {
  let reg: ReturnType<typeof createSchemaRegistry>;
  beforeEach(() => {
    reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    reg.register(makeDesc(2, 1));
  });

  it('adds a valid migration step', () => {
    const step: MigrationStep = { fromVersion: schemaVersion(1), toVersion: schemaVersion(2), migrate: identity };
    expect(reg.addMigration(step)).toBeUndefined();
  });

  it('rejects duplicate migration for the same fromVersion', () => {
    const step: MigrationStep = { fromVersion: schemaVersion(1), toVersion: schemaVersion(2), migrate: identity };
    reg.addMigration(step);
    expect(reg.addMigration(step)).toBe('migration-already-registered');
  });

  it('rejects unregistered fromVersion', () => {
    const step: MigrationStep = { fromVersion: schemaVersion(99), toVersion: schemaVersion(2), migrate: identity };
    expect(reg.addMigration(step)).toBe('version-not-registered');
  });
});

describe('canRead', () => {
  it('returns true when incoming >= minimumReadableVersion', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    reg.register(makeDesc(2, 1));
    expect(reg.canRead(schemaVersion(1), schemaVersion(2))).toBe(true);
  });

  it('returns false when incoming < minimumReadableVersion', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    reg.register(makeDesc(2, 2));
    expect(reg.canRead(schemaVersion(1), schemaVersion(2))).toBe(false);
  });

  it('returns false for unregistered reader version', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    expect(reg.canRead(schemaVersion(1), schemaVersion(99))).toBe(false);
  });
});

describe('resolveMigrationPath', () => {
  it('resolves a single-hop migration', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    reg.register(makeDesc(2, 1));
    const step: MigrationStep = { fromVersion: schemaVersion(1), toVersion: schemaVersion(2), migrate: identity };
    reg.addMigration(step);
    const path = reg.resolveMigrationPath(schemaVersion(1));
    expect(path).not.toBe('version-not-registered');
    if (typeof path !== 'string') {
      expect(path.steps.length).toBe(1);
      expect(path.targetVersion).toBe(2);
    }
  });

  it('returns no steps when already at current version', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    const path = reg.resolveMigrationPath(schemaVersion(1));
    expect(path).not.toBe('version-not-registered');
    if (typeof path !== 'string') expect(path.steps.length).toBe(0);
  });

  it('returns error for missing migration step', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    reg.register(makeDesc(2, 1));
    // No migration added — gap
    expect(reg.resolveMigrationPath(schemaVersion(1))).toBe('breaking-change-no-migration');
  });

  it('returns error for unregistered fromVersion', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    expect(reg.resolveMigrationPath(schemaVersion(99))).toBe('version-not-registered');
  });
});

describe('listDescriptors', () => {
  it('returns descriptors in ascending version order', () => {
    const reg = createSchemaRegistry();
    reg.register(makeDesc(1, 1));
    reg.register(makeDesc(2, 1));
    reg.register(makeDesc(3, 1));
    const list = reg.listDescriptors();
    expect(list.map((d) => d.version)).toEqual([1, 2, 3]);
  });
});
