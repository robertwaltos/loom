import { describe, it, expect } from 'vitest';
import { createWorldFadingProfiles, WORLD_FADING_PROFILES } from '../world-fading-profiles.js';

describe('WorldFadingProfiles — simulation', () => {
  const registry = createWorldFadingProfiles();

  describe('totalProfiles', () => {
    it('reports 50 profiles', () => {
      expect(registry.totalProfiles).toBe(50);
    });
  });

  describe('getProfile', () => {
    it('returns the cloud-kingdom profile with correct identifiers', () => {
      const profile = registry.getProfile('cloud-kingdom');
      expect(profile).toBeDefined();
      expect(profile!.worldId).toBe('cloud-kingdom');
      expect(profile!.worldName).toBeTruthy();
      expect(profile!.guideId).toBe('professor-nimbus');
    });

    it('returns a profile with all required fading stages and restorationMoment', () => {
      const profile = registry.getProfile('cloud-kingdom');
      expect(profile).toBeDefined();
      for (const stage of ['low', 'mid', 'high'] as const) {
        expect(profile![stage]).toBeDefined();
        expect(typeof profile![stage].visual).toBe('string');
        expect(typeof profile![stage].audio).toBe('string');
        expect(typeof profile![stage].guideState).toBe('string');
        expect(typeof profile![stage].ambientLife).toBe('string');
      }
      expect(typeof profile!.restorationMoment.event).toBe('string');
      expect(typeof profile!.restorationMoment.guideReaction).toBe('string');
      expect(typeof profile!.restorationMoment.thematicCore).toBe('string');
    });

    it('returns undefined for an unknown worldId', () => {
      expect(registry.getProfile('no-such-world')).toBeUndefined();
    });
  });

  describe('all()', () => {
    it('returns an array of exactly 50 profiles', () => {
      expect(registry.all()).toHaveLength(50);
    });

    it('every profile has worldId, worldName, guideId', () => {
      for (const p of registry.all()) {
        expect(typeof p.worldId).toBe('string');
        expect(typeof p.worldName).toBe('string');
        expect(typeof p.guideId).toBe('string');
      }
    });
  });

  describe('getProfilesForRealm', () => {
    it('discovery realm contains cloud-kingdom', () => {
      const ids = registry.getProfilesForRealm('discovery').map(p => p.worldId);
      expect(ids).toContain('cloud-kingdom');
    });

    it('discovery realm does not contain story-tree', () => {
      const ids = registry.getProfilesForRealm('discovery').map(p => p.worldId);
      expect(ids).not.toContain('story-tree');
    });

    it('expression realm contains story-tree', () => {
      const ids = registry.getProfilesForRealm('expression').map(p => p.worldId);
      expect(ids).toContain('story-tree');
    });

    it('exchange realm contains market-square', () => {
      const ids = registry.getProfilesForRealm('exchange').map(p => p.worldId);
      expect(ids).toContain('market-square');
    });

    it('profiles across all four realms sum to 50', () => {
      const total =
        registry.getProfilesForRealm('discovery').length +
        registry.getProfilesForRealm('expression').length +
        registry.getProfilesForRealm('exchange').length +
        registry.getProfilesForRealm('crossroads').length;
      expect(total).toBe(50);
    });

    it('discovery realm has exactly 15 profiles', () => {
      expect(registry.getProfilesForRealm('discovery')).toHaveLength(15);
    });

    it('expression realm has exactly 15 profiles', () => {
      expect(registry.getProfilesForRealm('expression')).toHaveLength(15);
    });

    it('exchange realm has exactly 12 profiles', () => {
      expect(registry.getProfilesForRealm('exchange')).toHaveLength(12);
    });

    it('crossroads realm has exactly 8 profiles', () => {
      expect(registry.getProfilesForRealm('crossroads')).toHaveLength(8);
    });
  });

  describe('WORLD_FADING_PROFILES export', () => {
    it('exported constant has the same length as all()', () => {
      expect(WORLD_FADING_PROFILES).toHaveLength(registry.all().length);
    });

    it('exported constant includes cloud-kingdom', () => {
      const ids = WORLD_FADING_PROFILES.map(p => p.worldId);
      expect(ids).toContain('cloud-kingdom');
    });
  });
});
