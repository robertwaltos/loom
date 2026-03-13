import { describe, expect, it } from 'vitest';
import {
  createWorldRestorationAtlas,
  TOTAL_WORLD_RESTORATION_PROFILES,
  WORLD_RESTORATION_ATLAS,
} from '../world-restoration-atlas.js';

describe('createWorldRestorationAtlas', () => {
  const atlas = createWorldRestorationAtlas();

  it('exports TOTAL_WORLD_RESTORATION_PROFILES = 50', () => {
    expect(TOTAL_WORLD_RESTORATION_PROFILES).toBe(50);
  });

  it('returns 50 profiles via totalProfiles', () => {
    expect(atlas.totalProfiles).toBe(50);
  });

  it('all() returns 50 entries matching WORLD_RESTORATION_ATLAS', () => {
    expect(atlas.all()).toHaveLength(50);
    expect(atlas.all()).toBe(WORLD_RESTORATION_ATLAS);
  });

  it('every profile has non-empty world identity and restoration text', () => {
    for (const profile of atlas.all()) {
      expect(profile.worldId.length, `${profile.worldName}.worldId`).toBeGreaterThan(0);
      expect(profile.worldName.length, `${profile.worldId}.worldName`).toBeGreaterThan(0);
      expect(profile.guideId.length, `${profile.worldId}.guideId`).toBeGreaterThan(0);
      expect(profile.event.length, `${profile.worldId}.event`).toBeGreaterThan(0);
      expect(profile.guideReaction.length, `${profile.worldId}.guideReaction`).toBeGreaterThan(0);
      expect(profile.thematicCore.length, `${profile.worldId}.thematicCore`).toBeGreaterThan(0);
      expect(profile.source, `${profile.worldId}.source`).toBe('world-fading-profile');
    }
  });

  it('all worldIds are unique', () => {
    const ids = atlas.all().map((profile) => profile.worldId);
    expect(new Set(ids).size).toBe(50);
  });

  describe('realm grouping', () => {
    it('returns 15 discovery profiles', () => {
      expect(atlas.getProfilesForRealm('discovery')).toHaveLength(15);
    });

    it('returns 15 expression profiles', () => {
      expect(atlas.getProfilesForRealm('expression')).toHaveLength(15);
    });

    it('returns 12 exchange profiles', () => {
      expect(atlas.getProfilesForRealm('exchange')).toHaveLength(12);
    });

    it('returns 8 crossroads profiles', () => {
      expect(atlas.getProfilesForRealm('crossroads')).toHaveLength(8);
    });
  });

  describe('canon spot checks', () => {
    it('cloud-kingdom restoration event keeps the thunderstorm spectacle', () => {
      expect(atlas.getProfile('cloud-kingdom')!.event.toLowerCase()).toContain('thunderstorm');
    });

    it('rhyme-docks restoration event reunites poetry traditions into a single poem', () => {
      const profile = atlas.getProfile('rhyme-docks')!;
      expect(profile.event.toLowerCase()).toContain('every poetry tradition');
      expect(profile.thematicCore.toLowerCase()).toContain('poetry');
    });

    it('savings-vault restoration event centers the first saved coin', () => {
      const profile = atlas.getProfile('savings-vault')!;
      expect(profile.event.toLowerCase()).toContain('first coin');
      expect(profile.guideReaction).toContain('The system failed me.');
    });

    it('workshop-crossroads restoration event solves three worlds at once', () => {
      const profile = atlas.getProfile('workshop-crossroads')!;
      expect(profile.event.toLowerCase()).toContain('three different worlds simultaneously');
      expect(profile.thematicCore).toContain('Disciplines are not walls.');
    });
  });

  describe('searchByText', () => {
    it('returns no matches for an empty query', () => {
      expect(atlas.searchByText('')).toEqual([]);
    });

    it('finds savings-vault by coin text', () => {
      const results = atlas.searchByText('coin');
      expect(results.some((profile) => profile.worldId === 'savings-vault')).toBe(true);
    });

    it('finds workshop-crossroads by cross-disciplinary language', () => {
      const results = atlas.searchByText('cross-disciplinary');
      expect(results.some((profile) => profile.worldId === 'workshop-crossroads')).toBe(true);
    });
  });
});