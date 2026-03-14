import { describe, expect, it } from 'vitest';
import {
  createWorldIdDriftReport,
  TOTAL_WORLD_ID_DRIFT_REGISTRIES,
  WORLD_ID_DRIFT_REPORT,
} from '../world-id-drift-report.js';

describe('createWorldIdDriftReport', () => {
  const report = createWorldIdDriftReport();

  it('tracks 13 world-linked registries', () => {
    expect(TOTAL_WORLD_ID_DRIFT_REGISTRIES).toBe(13);
    expect(report.totalRegistries).toBe(13);
    expect(report.getRegistryProfiles()).toHaveLength(13);
  });

  it('reuses the shared singleton report export', () => {
    expect(WORLD_ID_DRIFT_REPORT.getRegistryProfiles()).toBe(
      report.getRegistryProfiles(),
    );
  });

  it('encyclopedia entries no longer carry unresolved legacy world ids after science-lab cleanup', () => {
    const profile = report.getRegistryProfile('encyclopedia-entries');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(3);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('character dossiers now only carry supported special references after canon guide cleanup', () => {
    const profile = report.getRegistryProfile('character-dossiers');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(2);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual(['threadway-network']);
  });

  it('curriculum map carries exactly one rename-style alias reference', () => {
    const profile = report.getRegistryProfile('curriculum-map');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('mini-games registry is fully canonical after the entrepreneur workshop cleanup', () => {
    const profile = report.getRegistryProfile('mini-games-registry');
    expect(profile).toBeDefined();
    expect(profile!.totalReferences).toBe(50);
    expect(profile!.canonicalReferences).toBe(50);
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual([]);
  });

  it('npc relationship drift now only contains supported special references after guide realignment', () => {
    const profile = report.getRegistryProfile('npc-relationship-registry');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(2);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('quest chains now carry only supported special references across definitions and steps', () => {
    const profile = report.getRegistryProfile('quest-chains');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(4);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('seasonal content only drifts on supported event-scope selectors', () => {
    const profile = report.getRegistryProfile('seasonal-content');
    expect(profile).toBeDefined();
    expect(profile!.totalReferences).toBe(26);
    expect(profile!.canonicalReferences).toBe(22);
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(4);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual([
      'all',
      'all-female-guides',
    ]);
  });

  it('threadway network currently only drifts on the entrepreneur workshop rename', () => {
    const profile = report.getRegistryProfile('threadway-network');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('visitor characters only drift on supported forgetting-well appearances', () => {
    const profile = report.getRegistryProfile('visitor-characters');
    expect(profile).toBeDefined();
    expect(profile!.totalReferences).toBe(34);
    expect(profile!.canonicalReferences).toBe(32);
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(2);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual(['forgetting-well']);
  });

  it('world soundscape profiles are fully canonical across all 50 worlds', () => {
    const profile = report.getRegistryProfile('world-soundscape-profiles');
    expect(profile).toBeDefined();
    expect(profile!.totalReferences).toBe(50);
    expect(profile!.canonicalReferences).toBe(50);
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual([]);
  });

  it('world fading profiles are fully canonical across all 50 worlds', () => {
    const profile = report.getRegistryProfile('world-fading-profiles');
    expect(profile).toBeDefined();
    expect(profile!.totalReferences).toBe(50);
    expect(profile!.canonicalReferences).toBe(50);
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual([]);
  });

  it('world ambient atlas is fully canonical across all 50 worlds', () => {
    const profile = report.getRegistryProfile('world-ambient-atlas');
    expect(profile).toBeDefined();
    expect(profile!.totalReferences).toBe(50);
    expect(profile!.canonicalReferences).toBe(50);
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual([]);
  });

  it('hidden zones expose any-threadway as a supported scope selector', () => {
    const profile = report.getRegistryProfile('hidden-zones');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.specialReferenceReferences).toBe(1);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual(['any-threadway']);
  });

  it('science-lab no longer appears in active drift references after the bucket is fully redistributed', () => {
    const references = report.getReferencesForWorldId('science-lab');
    expect(references).toHaveLength(0);
  });

  it('shows no remaining untracked noncanonical IDs after the greenhouse relationship cleanup', () => {
    expect(report.getUntrackedWorldIds()).toEqual([]);
  });

  it('lists every registry that still has at least one noncanonical reference', () => {
    expect(
      report
        .getRegistriesWithNoncanonicalReferences()
        .map((profile) => profile.registryId),
    ).toEqual([
      'character-dossiers',
      'encyclopedia-entries',
      'npc-relationship-registry',
      'quest-chains',
      'seasonal-content',
      'visitor-characters',
      'hidden-zones',
    ]);
  });
});