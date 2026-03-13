import { describe, expect, it } from 'vitest';
import {
  createWorldIdResolution,
  RESOLVED_WORLD_ID_ALIASES,
  TOTAL_CANONICAL_WORLD_IDS,
  TOTAL_RESOLVED_WORLD_ID_ALIASES,
  TOTAL_UNRESOLVED_LEGACY_WORLD_IDS,
  UNRESOLVED_LEGACY_WORLD_IDS,
  WORLD_ID_RESOLUTION,
} from '../world-id-resolution.js';

describe('createWorldIdResolution', () => {
  const resolution = createWorldIdResolution();

  it('exports canonical and legacy totals', () => {
    expect(TOTAL_CANONICAL_WORLD_IDS).toBe(50);
    expect(TOTAL_RESOLVED_WORLD_ID_ALIASES).toBe(3);
    expect(TOTAL_UNRESOLVED_LEGACY_WORLD_IDS).toBe(3);
  });

  it('exposes the expected registry totals', () => {
    expect(resolution.totalCanonicalWorldIds).toBe(50);
    expect(resolution.totalResolvedAliases).toBe(3);
    expect(resolution.totalUnresolvedLegacyIds).toBe(3);
  });

  it('returns exported alias datasets from the shared singleton', () => {
    expect(resolution.getResolvedAliases()).toBe(RESOLVED_WORLD_ID_ALIASES);
    expect(resolution.getUnresolvedLegacyWorldIds()).toBe(UNRESOLVED_LEGACY_WORLD_IDS);
  });

  it('reuses the shared singleton registry export', () => {
    expect(WORLD_ID_RESOLUTION.getResolvedAliases()).toBe(RESOLVED_WORLD_ID_ALIASES);
    expect(WORLD_ID_RESOLUTION.getUnresolvedLegacyWorldIds()).toBe(UNRESOLVED_LEGACY_WORLD_IDS);
  });

  it('passes through canonical world IDs unchanged', () => {
    const profile = resolution.resolve('meadow-lab');
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('canonical');
    expect(profile!.canonicalWorldId).toBe('meadow-lab');
    expect(profile!.canonicalWorldName).toBe('Meadow Lab');
    expect(profile!.guideId).toBe('baxter');
    expect(resolution.isCanonicalWorldId('meadow-lab')).toBe(true);
  });

  it('resolves meadow-laboratory to the canonical meadow-lab world', () => {
    const profile = resolution.resolve('meadow-laboratory');
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('resolved-alias');
    expect(profile!.canonicalWorldId).toBe('meadow-lab');
    expect(profile!.canonicalWorldName).toBe('Meadow Lab');
    expect(profile!.disposition).toBe('canonical-rename');
  });

  it('resolves entrepreneurs-workshop to entrepreneur-workshop', () => {
    const profile = resolution.resolve('entrepreneurs-workshop');
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('resolved-alias');
    expect(profile!.canonicalWorldId).toBe('entrepreneur-workshop');
    expect(profile!.canonicalWorldName).toBe("Entrepreneur's Workshop");
  });

  it('resolves tax-office-tower to tax-office', () => {
    const profile = resolution.resolve('tax-office-tower');
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('resolved-alias');
    expect(profile!.canonicalWorldId).toBe('tax-office');
    expect(profile!.canonicalWorldName).toBe('Tax Office');
    expect(resolution.getCanonicalWorldId('tax-office-tower')).toBe('tax-office');
  });

  it('keeps the Forgetting Well unresolved because it is a special space, not a numbered world', () => {
    const profile = resolution.resolve('forgetting-well');
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('unresolved-legacy');
    expect(profile!.disposition).toBe('special-space');
    expect(profile!.canonicalWorldId).toBeUndefined();
  });

  it('keeps the Threadway Network unresolved because it is traversal fabric, not a world', () => {
    const profile = resolution.resolve('threadway-network');
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('unresolved-legacy');
    expect(profile!.disposition).toBe('special-space');
    expect(profile!.canonicalWorldId).toBeUndefined();
  });

  it('keeps science-lab unresolved because no current numbered world uses that ID', () => {
    const profile = resolution.resolve('science-lab');
    expect(profile).toBeDefined();
    expect(profile!.status).toBe('unresolved-legacy');
    expect(profile!.disposition).toBe('unmapped-legacy');
    expect(profile!.canonicalWorldId).toBeUndefined();
  });

  it('can list aliases for a canonical world', () => {
    const aliases = resolution.getAliasesForCanonicalWorld('tax-office');
    expect(aliases).toHaveLength(1);
    expect(aliases[0]!.legacyWorldId).toBe('tax-office-tower');
  });

  it('returns an empty alias list for canonical worlds with no legacy rename', () => {
    expect(resolution.getAliasesForCanonicalWorld('cloud-kingdom')).toEqual([]);
  });

  it('returns undefined for unknown IDs outside both the atlas and legacy sets', () => {
    expect(resolution.resolve('not-a-real-world')).toBeUndefined();
    expect(resolution.getCanonicalWorldId('not-a-real-world')).toBeUndefined();
  });
});