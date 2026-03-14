import { describe, expect, it } from 'vitest';
import { ENCYCLOPEDIA_ENTRIES, TOTAL_ENCYCLOPEDIA_ENTRIES } from '../encyclopedia-entries.js';
import {
  ACTUAL_ENCYCLOPEDIA_ENTRY_TOTAL,
  createWorldEncyclopediaCoverage,
  LEGACY_ENCYCLOPEDIA_WORLD_COVERAGE,
  TOTAL_LEGACY_ENCYCLOPEDIA_WORLD_IDS,
  TOTAL_WORLD_ENCYCLOPEDIA_COVERAGE_PROFILES,
  WORLD_ENCYCLOPEDIA_COVERAGE,
} from '../world-encyclopedia-coverage.js';

describe('createWorldEncyclopediaCoverage', () => {
  const coverage = createWorldEncyclopediaCoverage();

  it('exports TOTAL_WORLD_ENCYCLOPEDIA_COVERAGE_PROFILES = 50', () => {
    expect(TOTAL_WORLD_ENCYCLOPEDIA_COVERAGE_PROFILES).toBe(50);
  });

  it('exports TOTAL_LEGACY_ENCYCLOPEDIA_WORLD_IDS = 2', () => {
    expect(TOTAL_LEGACY_ENCYCLOPEDIA_WORLD_IDS).toBe(2);
  });

  it('returns 50 profiles via totalProfiles', () => {
    expect(coverage.totalProfiles).toBe(50);
  });

  it('all() returns 50 entries matching WORLD_ENCYCLOPEDIA_COVERAGE', () => {
    expect(coverage.all()).toHaveLength(50);
    expect(coverage.all()).toBe(WORLD_ENCYCLOPEDIA_COVERAGE);
  });

  it('tracks 2 legacy encyclopedia world IDs', () => {
    expect(coverage.totalLegacyWorldIds).toBe(2);
    expect(coverage.getLegacyWorldCoverage()).toBe(LEGACY_ENCYCLOPEDIA_WORLD_COVERAGE);
    expect(coverage.getLegacyWorldCoverage()).toHaveLength(2);
  });

  it('exposes the declared-vs-actual encyclopedia total drift', () => {
    expect(coverage.declaredEncyclopediaEntryTotal).toBe(TOTAL_ENCYCLOPEDIA_ENTRIES);
    expect(coverage.actualEncyclopediaEntryTotal).toBe(ACTUAL_ENCYCLOPEDIA_ENTRY_TOTAL);
    expect(ACTUAL_ENCYCLOPEDIA_ENTRY_TOTAL).toBe(ENCYCLOPEDIA_ENTRIES.length);
    expect(coverage.actualEncyclopediaEntryTotal).toBe(69);
    expect(coverage.declaredEncyclopediaEntryTotal).toBeGreaterThan(coverage.actualEncyclopediaEntryTotal);
  });

  it('every profile has non-empty world identity fields', () => {
    for (const profile of coverage.all()) {
      expect(profile.worldId.length, `${profile.worldName}.worldId`).toBeGreaterThan(0);
      expect(profile.worldName.length, `${profile.worldId}.worldName`).toBeGreaterThan(0);
      expect(profile.guideId.length, `${profile.worldId}.guideId`).toBeGreaterThan(0);
    }
  });

  it('all worldIds are unique', () => {
    const ids = coverage.all().map((profile) => profile.worldId);
    expect(new Set(ids).size).toBe(50);
  });

  describe('direct coverage split', () => {
    it('finds 30 current worlds with direct encyclopedia entries', () => {
      expect(coverage.getProfilesWithDirectEntries()).toHaveLength(30);
    });

    it('finds 20 current worlds without direct encyclopedia entries', () => {
      expect(coverage.getProfilesWithoutDirectEntries()).toHaveLength(20);
    });

    it('accounts for all encyclopedia entries across direct and legacy coverage', () => {
      const directTotal = coverage.all().reduce((sum, profile) => sum + profile.directEntryCount, 0);
      const legacyTotal = coverage.getLegacyWorldCoverage().reduce((sum, legacy) => sum + legacy.totalEntries, 0);
      expect(directTotal + legacyTotal).toBe(ACTUAL_ENCYCLOPEDIA_ENTRY_TOTAL);
    });
  });

  describe('canon spot checks', () => {
    it('number-garden has 5 direct entries and includes historical figures', () => {
      const profile = coverage.getProfile('number-garden')!;
      expect(profile.directEntryCount).toBe(5);
      expect(profile.coverageStatus).toBe('direct-entries');
      expect(profile.historicalFigures).toContain('Euclid');
    });

    it('savings-vault has 3 direct entries in the current encyclopedia registry', () => {
      const profile = coverage.getProfile('savings-vault')!;
      expect(profile.directEntryCount).toBe(3);
      expect(profile.directEntryIds).toHaveLength(3);
    });

    it('cloud-kingdom currently has no direct encyclopedia entries', () => {
      const profile = coverage.getProfile('cloud-kingdom')!;
      expect(profile.directEntryCount).toBe(0);
      expect(profile.coverageStatus).toBe('no-direct-entries');
    });

    it('market-square currently has no direct encyclopedia entries', () => {
      const profile = coverage.getProfile('market-square')!;
      expect(profile.directEntryCount).toBe(0);
      expect(profile.coverageStatus).toBe('no-direct-entries');
    });

    it('greenhouse-spiral, body-atlas, and magnet-hills now absorb the former science-lab entries directly', () => {
      expect(coverage.getProfile('greenhouse-spiral')?.directEntryIds).toEqual(
        expect.arrayContaining(['sl-periodic-table', 'sl-photosynthesis']),
      );
      expect(coverage.getProfile('body-atlas')?.directEntryIds).toEqual(
        expect.arrayContaining(['sl-dna', 'sl-germ-theory']),
      );
      expect(coverage.getProfile('magnet-hills')?.directEntryIds).toContain('sl-gravity');
    });
  });

  describe('legacy coverage', () => {
    it('tracks forgetting-well as a legacy encyclopedia world with 1 entry', () => {
      const legacy = coverage.getLegacyWorldCoverage().find((profile) => profile.legacyWorldId === 'forgetting-well');
      expect(legacy).toBeDefined();
      expect(legacy!.totalEntries).toBe(1);
    });

    it('tracks threadway-network as a legacy encyclopedia world with 2 entries', () => {
      const legacy = coverage.getLegacyWorldCoverage().find((profile) => profile.legacyWorldId === 'threadway-network');
      expect(legacy).toBeDefined();
      expect(legacy!.totalEntries).toBe(2);
    });
  });
});