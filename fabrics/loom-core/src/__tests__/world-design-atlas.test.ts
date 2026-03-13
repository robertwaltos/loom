import { describe, expect, it } from 'vitest';
import {
  createWorldDesignAtlas,
  TOTAL_WORLD_DESIGN_PROFILES,
  WORLD_DESIGN_ATLAS,
  type WorldDesignProfile,
} from '../world-design-atlas.js';

describe('createWorldDesignAtlas', () => {
  const atlas = createWorldDesignAtlas();

  it('exports TOTAL_WORLD_DESIGN_PROFILES = 50', () => {
    expect(TOTAL_WORLD_DESIGN_PROFILES).toBe(50);
  });

  it('returns 50 profiles via totalProfiles', () => {
    expect(atlas.totalProfiles).toBe(50);
  });

  it('all() returns 50 entries matching WORLD_DESIGN_ATLAS', () => {
    expect(atlas.all()).toHaveLength(50);
    expect(atlas.all()).toBe(WORLD_DESIGN_ATLAS);
  });

  it('every profile has a non-empty worldId, worldName, guideId, and biome', () => {
    for (const profile of atlas.all()) {
      expect(profile.worldId.length, `${profile.worldName}.worldId`).toBeGreaterThan(0);
      expect(profile.worldName.length, `${profile.worldId}.worldName`).toBeGreaterThan(0);
      expect(profile.guideId.length, `${profile.worldId}.guideId`).toBeGreaterThan(0);
      expect(profile.biome.length, `${profile.worldId}.biome`).toBeGreaterThan(0);
    }
  });

  it('all worldIds are unique', () => {
    const ids = atlas.all().map((profile) => profile.worldId);
    expect(new Set(ids).size).toBe(50);
  });

  it('zones inside a world have unique ids and non-empty names', () => {
    for (const profile of atlas.all()) {
      const zoneIds = profile.zones.map((zone) => zone.zoneId);
      expect(new Set(zoneIds).size, `${profile.worldId}.zoneIds`).toBe(zoneIds.length);
      for (const zone of profile.zones) {
        expect(zone.zoneId.length, `${profile.worldId}.zoneId`).toBeGreaterThan(0);
        expect(zone.name.length, `${profile.worldId}.zoneName`).toBeGreaterThan(0);
      }
    }
  });

  describe('getProfile', () => {
    it('returns a profile for a known world', () => {
      const profile = atlas.getProfile('cloud-kingdom');
      expect(profile).toBeDefined();
      expect(profile!.guideId).toBe('professor-nimbus');
    });

    it('returns undefined for an unknown world', () => {
      expect(atlas.getProfile('unknown-world')).toBeUndefined();
    });
  });

  describe('getProfilesForRealm', () => {
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

  describe('explicit zone coverage', () => {
    it('tracks the 22 worlds with explicit zone lists in Expansion Bible v5 Part 2', () => {
      expect(atlas.getProfilesWithExplicitZones()).toHaveLength(22);
    });

    it('cloud-kingdom includes Weather Deck and Rain Room', () => {
      const profile = atlas.getProfile('cloud-kingdom')!;
      const names = profile.zones.map((zone) => zone.name);
      expect(names).toContain('Weather Deck');
      expect(names).toContain('Rain Room');
    });

    it('number-garden includes six explicit zones including Zero Pool and Infinity Bridge', () => {
      const profile = atlas.getProfile('number-garden')!;
      const names = profile.zones.map((zone) => zone.name);
      expect(profile.zones).toHaveLength(6);
      expect(names).toContain('Zero Pool');
      expect(names).toContain('Infinity Bridge');
    });

    it('story-tree includes Root Library and Gutenberg Press', () => {
      const profile = atlas.getProfile('story-tree')!;
      const names = profile.zones.map((zone) => zone.name);
      expect(names).toContain('Root Library');
      expect(names).toContain('Gutenberg Press');
    });

    it('market-square includes Price Stalls and Generational Ledger', () => {
      const profile = atlas.getProfile('market-square')!;
      const names = profile.zones.map((zone) => zone.name);
      expect(names).toContain('Price Stalls');
      expect(names).toContain('Generational Ledger');
    });

    it('music-meadow includes Harmony Pools and Rhythm Clearing', () => {
      const profile = atlas.getProfile('music-meadow')!;
      const names = profile.zones.map((zone) => zone.name);
      expect(names).toContain('Harmony Pools');
      expect(names).toContain('Rhythm Clearing');
    });

    it('reading-reef remains biome-only because the bible does not provide an explicit zone block', () => {
      expect(atlas.getProfile('reading-reef')!.zones).toHaveLength(0);
    });

    it('great-archive remains biome-only because the bible does not provide an explicit zone block', () => {
      expect(atlas.getProfile('great-archive')!.zones).toHaveLength(0);
    });
  });

  describe('biome canon checks', () => {
    it('code-canyon biome references wireframe rendering', () => {
      expect(atlas.getProfile('code-canyon')!.biome.toLowerCase()).toContain('wireframe');
    });

    it('great-archive biome references shifting architecture', () => {
      expect(atlas.getProfile('great-archive')!.biome.toLowerCase()).toContain('shifts');
    });

    it('everywhere biome references no fixed form', () => {
      expect(atlas.getProfile('everywhere')!.biome.toLowerCase()).toContain('no fixed form');
    });
  });
});