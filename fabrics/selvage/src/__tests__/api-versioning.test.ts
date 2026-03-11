import { describe, it, expect, beforeEach } from 'vitest';
import { createApiVersioningService } from '../api-versioning.js';
import type { ApiVersioningDeps } from '../api-versioning.js';

function createDeps(startTime = 0): { deps: ApiVersioningDeps; advance: (micro: number) => void } {
  let time = startTime;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      log: { info: () => {}, warn: () => {} },
    },
    advance: (micro: number) => {
      time += micro;
    },
  };
}

describe('ApiVersioningService — version registration', () => {
  it('registers a new version', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    const ok = svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'Initial' });
    expect(ok).toBe(true);
    expect(svc.getVersion('v1')).toBeDefined();
  });

  it('rejects duplicate version', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'Initial' });
    const ok = svc.registerVersion({ version: 'v1', releasedAt: 2000, description: 'Dup' });
    expect(ok).toBe(false);
  });

  it('newly registered version is active', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'Initial' });
    const entry = svc.getVersion('v1');
    expect(entry?.status).toBe('active');
    expect(entry?.deprecatedAt).toBeUndefined();
    expect(entry?.sunsetAt).toBeUndefined();
  });

  it('lists all versions', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    expect(svc.listVersions()).toHaveLength(2);
  });

  it('removes a version', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'Initial' });
    expect(svc.removeVersion('v1')).toBe(true);
    expect(svc.getVersion('v1')).toBeUndefined();
  });

  it('returns false removing nonexistent version', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    expect(svc.removeVersion('v99')).toBe(false);
  });
});

describe('ApiVersioningService — deprecation', () => {
  it('deprecates an active version', () => {
    const { deps } = createDeps(5000);
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'Initial' });
    const ok = svc.deprecateVersion({ version: 'v1', sunsetAt: 100_000 });
    expect(ok).toBe(true);
    const entry = svc.getVersion('v1');
    expect(entry?.status).toBe('deprecated');
    expect(entry?.deprecatedAt).toBe(5000);
    expect(entry?.sunsetAt).toBe(100_000);
  });

  it('returns false deprecating nonexistent version', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    expect(svc.deprecateVersion({ version: 'v99', sunsetAt: 1000 })).toBe(false);
  });

  it('returns false deprecating already sunset version', () => {
    const { deps, advance } = createDeps(0);
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 0, description: 'Old' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 100 });
    advance(200);
    svc.sweepSunset();
    expect(svc.deprecateVersion({ version: 'v1', sunsetAt: 500 })).toBe(false);
  });

  it('getActiveVersions excludes deprecated versions', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'Old' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'New' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 999_999 });
    const active = svc.getActiveVersions();
    expect(active).toHaveLength(1);
    expect(active[0]?.version).toBe('v2');
  });
});

describe('ApiVersioningService — migration paths', () => {
  it('registers a migration path', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    const ok = svc.registerMigration({
      fromVersion: 'v1',
      toVersion: 'v2',
      description: 'Add new fields',
    });
    expect(ok).toBe(true);
  });

  it('retrieves a migration path', () => {
    const { deps } = createDeps(5000);
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    svc.registerMigration({ fromVersion: 'v1', toVersion: 'v2', description: 'Migrate' });
    const path = svc.getMigrationPath('v1', 'v2');
    expect(path).toBeDefined();
    expect(path?.fromVersion).toBe('v1');
    expect(path?.toVersion).toBe('v2');
    expect(path?.addedAt).toBe(5000);
  });

  it('rejects duplicate migration path', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    svc.registerMigration({ fromVersion: 'v1', toVersion: 'v2', description: 'Migrate' });
    expect(
      svc.registerMigration({ fromVersion: 'v1', toVersion: 'v2', description: 'Again' }),
    ).toBe(false);
  });

  it('rejects migration with unknown source version', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    expect(svc.registerMigration({ fromVersion: 'v1', toVersion: 'v2', description: 'Bad' })).toBe(
      false,
    );
  });

  it('rejects migration with unknown target version', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    expect(svc.registerMigration({ fromVersion: 'v1', toVersion: 'v3', description: 'Bad' })).toBe(
      false,
    );
  });

  it('returns undefined for nonexistent migration', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    expect(svc.getMigrationPath('v1', 'v2')).toBeUndefined();
  });

  it('lists all migrations', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    svc.registerVersion({ version: 'v3', releasedAt: 3000, description: 'Third' });
    svc.registerMigration({ fromVersion: 'v1', toVersion: 'v2', description: 'M1' });
    svc.registerMigration({ fromVersion: 'v2', toVersion: 'v3', description: 'M2' });
    expect(svc.listMigrations()).toHaveLength(2);
  });
});

describe('ApiVersioningService — negotiation', () => {
  it('matches an active version exactly', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    const result = svc.negotiate('v1');
    expect(result.outcome).toBe('matched');
    expect(result.resolvedVersion).toBe('v1');
    expect(result.isDeprecated).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it('matches deprecated version with warnings', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 999_999 });
    const result = svc.negotiate('v1');
    expect(result.outcome).toBe('matched');
    expect(result.isDeprecated).toBe(true);
    expect(result.sunsetAt).toBe(999_999);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('falls back to latest active when requested version unknown', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    const result = svc.negotiate('v99');
    expect(result.outcome).toBe('fallback');
    expect(result.resolvedVersion).toBe('v2');
  });

  it('falls back to latest active when no version requested', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    const result = svc.negotiate(undefined);
    expect(result.outcome).toBe('fallback');
    expect(result.resolvedVersion).toBe('v1');
  });

  it('returns unavailable when no versions exist', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    const result = svc.negotiate('v1');
    expect(result.outcome).toBe('unavailable');
    expect(result.resolvedVersion).toBeUndefined();
  });

  it('falls back when sunset version requested', () => {
    const { deps, advance } = createDeps(0);
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 0, description: 'Old' });
    svc.registerVersion({ version: 'v2', releasedAt: 1000, description: 'New' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 500 });
    advance(600);
    svc.sweepSunset();
    const result = svc.negotiate('v1');
    expect(result.outcome).toBe('fallback');
    expect(result.resolvedVersion).toBe('v2');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns unavailable when sunset version and no active available', () => {
    const { deps, advance } = createDeps(0);
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 0, description: 'Only' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 100 });
    advance(200);
    svc.sweepSunset();
    const result = svc.negotiate('v1');
    expect(result.outcome).toBe('unavailable');
  });
});

describe('ApiVersioningService — sweep and stats', () => {
  it('sweeps deprecated versions past sunset date', () => {
    const { deps, advance } = createDeps(0);
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 0, description: 'Old' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 1000 });
    advance(1500);
    const swept = svc.sweepSunset();
    expect(swept).toBe(1);
    expect(svc.getVersion('v1')?.status).toBe('sunset');
  });

  it('does not sweep versions before sunset date', () => {
    const { deps } = createDeps(0);
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 0, description: 'Old' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 999_999 });
    const swept = svc.sweepSunset();
    expect(swept).toBe(0);
  });

  it('tracks negotiation count in stats', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.negotiate('v1');
    svc.negotiate('v1');
    svc.negotiate(undefined);
    expect(svc.getStats().totalNegotiations).toBe(3);
  });

  it('reports version counts by status', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 1000, description: 'First' });
    svc.registerVersion({ version: 'v2', releasedAt: 2000, description: 'Second' });
    svc.registerVersion({ version: 'v3', releasedAt: 3000, description: 'Third' });
    svc.deprecateVersion({ version: 'v1', sunsetAt: 999_999 });
    const stats = svc.getStats();
    expect(stats.totalVersions).toBe(3);
    expect(stats.activeVersions).toBe(2);
    expect(stats.deprecatedVersions).toBe(1);
    expect(stats.sunsetVersions).toBe(0);
  });

  it('reports zero stats initially', () => {
    const { deps } = createDeps();
    const svc = createApiVersioningService(deps);
    const stats = svc.getStats();
    expect(stats.totalVersions).toBe(0);
    expect(stats.totalMigrations).toBe(0);
    expect(stats.totalNegotiations).toBe(0);
  });
});
