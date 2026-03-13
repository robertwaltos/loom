import { describe, expect, it } from 'vitest';
import {
  createWorldIdDriftReport,
  TOTAL_WORLD_ID_DRIFT_REGISTRIES,
  WORLD_ID_DRIFT_REPORT,
} from '../world-id-drift-report.js';

describe('createWorldIdDriftReport', () => {
  const report = createWorldIdDriftReport();

  it('tracks 7 world-linked registries', () => {
    expect(TOTAL_WORLD_ID_DRIFT_REGISTRIES).toBe(7);
    expect(report.totalRegistries).toBe(7);
    expect(report.getRegistryProfiles()).toHaveLength(7);
  });

  it('reuses the shared singleton report export', () => {
    expect(WORLD_ID_DRIFT_REPORT.getRegistryProfiles()).toBe(
      report.getRegistryProfiles(),
    );
  });

  it('encyclopedia entries remain the biggest legacy hotspot in the current report', () => {
    const profile = report.getRegistryProfile('encyclopedia-entries');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(5);
    expect(profile!.unresolvedLegacyReferences).toBe(8);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('character dossiers show zero resolved aliases, four unresolved legacy IDs (science-lab + threadway-network special-space), and zero untracked IDs after cast cleanup', () => {
    const profile = report.getRegistryProfile('character-dossiers');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(4);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual([
      'science-lab',
      'threadway-network',
    ]);
  });

  it('curriculum map carries exactly one rename-style alias reference', () => {
    const profile = report.getRegistryProfile('curriculum-map');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(1);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('npc relationship drift includes alias, unresolved legacy, and untracked references', () => {
    const profile = report.getRegistryProfile('npc-relationship-registry');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(1);
    expect(profile!.unresolvedLegacyReferences).toBe(2);
    expect(profile!.untrackedNoncanonicalReferences).toBe(2);
  });

  it('quest chains currently carry one alias world and one unresolved special-space world across definitions and steps', () => {
    const profile = report.getRegistryProfile('quest-chains');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(2);
    expect(profile!.unresolvedLegacyReferences).toBe(4);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('threadway network currently only drifts on the entrepreneur workshop rename', () => {
    const profile = report.getRegistryProfile('threadway-network');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(2);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(0);
  });

  it('hidden zones expose any-threadway as an untracked special reference', () => {
    const profile = report.getRegistryProfile('hidden-zones');
    expect(profile).toBeDefined();
    expect(profile!.resolvedAliasReferences).toBe(0);
    expect(profile!.unresolvedLegacyReferences).toBe(0);
    expect(profile!.untrackedNoncanonicalReferences).toBe(1);
    expect(profile!.uniqueNoncanonicalWorldIds).toEqual(['any-threadway']);
  });

  it('science-lab appears only as unresolved legacy drift across current registries', () => {
    const references = report.getReferencesForWorldId('science-lab');
    expect(references).toHaveLength(8);
    expect(new Set(references.map((reference) => reference.status))).toEqual(
      new Set(['unresolved-legacy']),
    );
  });

  it('surfaces the current set of untracked noncanonical IDs for future resolution work', () => {
    expect(report.getUntrackedWorldIds()).toEqual([
      'all-worlds',
      'any-threadway',
      'garden-of-growth',
    ]);
  });

  it('lists every registry that still has at least one noncanonical reference', () => {
    expect(
      report
        .getRegistriesWithNoncanonicalReferences()
        .map((profile) => profile.registryId),
    ).toEqual([
      'character-dossiers',
      'curriculum-map',
      'encyclopedia-entries',
      'npc-relationship-registry',
      'quest-chains',
      'threadway-network',
      'hidden-zones',
    ]);
  });
});