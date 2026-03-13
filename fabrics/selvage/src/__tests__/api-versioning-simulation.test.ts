import { describe, it, expect } from 'vitest';
import { createApiVersioningService } from '../api-versioning.js';
import type { ApiVersioningDeps } from '../api-versioning.js';

function makeDeps(start = 0): { deps: ApiVersioningDeps; advance: (us: number) => void } {
  let time = start;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      log: { info: () => {}, warn: () => {} },
    },
    advance: (us: number) => { time += us; },
  };
}

describe('API Versioning Simulation', () => {
  it('registers multiple versions, deprecates old one, client negotiates new', () => {
    const { deps, advance } = makeDeps(1_000_000);
    const svc = createApiVersioningService(deps);

    svc.registerVersion({ version: 'v1', releasedAt: 1_000_000, description: 'Initial release' });
    svc.registerVersion({ version: 'v2', releasedAt: 2_000_000, description: 'Improved release' });

    expect(svc.listVersions()).toHaveLength(2);
    expect(svc.getVersion('v1')?.status).toBe('active');
    expect(svc.getVersion('v2')?.status).toBe('active');

    advance(500_000);
    svc.deprecateVersion({ version: 'v1', sunsetAt: 10_000_000 });

    expect(svc.getVersion('v1')?.status).toBe('deprecated');
    expect(svc.getVersion('v1')?.sunsetAt).toBe(10_000_000);

    // Client that accepts v2 should get it matched
    const result = svc.negotiate('v2');
    expect(result.outcome).toBe('matched');
    expect(result.resolvedVersion).toBe('v2');
    expect(result.isDeprecated).toBe(false);

    // Client that only accepts v1 should get deprecated warning
    const oldResult = svc.negotiate('v1');
    expect(oldResult.resolvedVersion).toBe('v1');
    expect(oldResult.isDeprecated).toBe(true);

    const stats = svc.getStats();
    expect(stats.totalVersions).toBe(2);
    expect(stats.deprecatedVersions).toBe(1);
    expect(stats.activeVersions).toBe(1);
  });

  it('migration paths guide clients from v1 to v2', () => {
    const { deps } = makeDeps();
    const svc = createApiVersioningService(deps);
    svc.registerVersion({ version: 'v1', releasedAt: 0, description: 'Old' });
    svc.registerVersion({ version: 'v2', releasedAt: 0, description: 'New' });

    const added = svc.registerMigration({ fromVersion: 'v1', toVersion: 'v2', description: 'Auto-upgrade' });
    expect(added).toBe(true);

    const paths = svc.listMigrations().filter(m => m.fromVersion === 'v1');
    expect(paths).toHaveLength(1);
    expect(paths[0]?.toVersion).toBe('v2');
  });

  it('returns unavailable when no client versions match', () => {
    const { deps } = makeDeps();
    const svc = createApiVersioningService(deps);
    // No versions registered → negotiate returns unavailable
    const result = svc.negotiate(undefined);
    expect(result.outcome).toBe('unavailable');
    expect(result.resolvedVersion).toBeUndefined();
  });
});
