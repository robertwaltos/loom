import { describe, expect, it } from 'vitest';
import {
  createWorldAmbientAtlas,
  TOTAL_WORLD_AMBIENT_PROFILES,
  WORLD_AMBIENT_ATLAS,
} from '../world-ambient-atlas.js';

describe('createWorldAmbientAtlas', () => {
  const atlas = createWorldAmbientAtlas();

  it('exports TOTAL_WORLD_AMBIENT_PROFILES = 50', () => {
    expect(TOTAL_WORLD_AMBIENT_PROFILES).toBe(50);
  });

  it('returns 50 profiles via totalProfiles', () => {
    expect(atlas.totalProfiles).toBe(50);
  });

  it('all() returns 50 entries matching WORLD_AMBIENT_ATLAS', () => {
    expect(atlas.all()).toHaveLength(50);
    expect(atlas.all()).toBe(WORLD_AMBIENT_ATLAS);
  });

  it('every profile has non-empty world identity and restored ambient life text', () => {
    for (const profile of atlas.all()) {
      expect(profile.worldId.length, `${profile.worldName}.worldId`).toBeGreaterThan(0);
      expect(profile.worldName.length, `${profile.worldId}.worldName`).toBeGreaterThan(0);
      expect(profile.guideId.length, `${profile.worldId}.guideId`).toBeGreaterThan(0);
      expect(profile.restoredAmbientLife.length, `${profile.worldId}.restoredAmbientLife`).toBeGreaterThan(0);
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

  describe('explicit ambient life coverage', () => {
    it('tracks the 10 worlds with explicit Ambient Life blocks in Expansion Bible v5 Part 2', () => {
      expect(atlas.getProfilesWithExplicitAmbientLife()).toHaveLength(10);
    });

    it('cloud-kingdom keeps cloud foxes and wind sprites from the bible', () => {
      const profile = atlas.getProfile('cloud-kingdom')!;
      const names = profile.explicitAmbientElements.map((element) => element.name);
      expect(names).toContain('Cloud foxes');
      expect(names).toContain('Wind sprites');
      expect(profile.source).toBe('hybrid');
    });

    it('tideline-bay keeps whale song and bioluminescent jellyfish', () => {
      const profile = atlas.getProfile('tideline-bay')!;
      const names = profile.explicitAmbientElements.map((element) => element.name);
      expect(names).toContain('Whale song');
      expect(names).toContain('Bioluminescent jellyfish');
    });

    it('code-canyon keeps pixel sprites and cursor birds', () => {
      const profile = atlas.getProfile('code-canyon')!;
      const names = profile.explicitAmbientElements.map((element) => element.name);
      expect(names).toContain('Pixel sprites');
      expect(names).toContain('Cursor birds');
    });

    it('body-atlas has no explicit ambient block and therefore remains fading-profile sourced', () => {
      const profile = atlas.getProfile('body-atlas')!;
      expect(profile.explicitAmbientElements).toHaveLength(0);
      expect(profile.source).toBe('fading-profile');
    });
  });

  describe('restored ambient canon', () => {
    it('map-room restored ambient life mentions the GPS constellation', () => {
      expect(atlas.getProfile('map-room')!.restoredAmbientLife.toLowerCase()).toContain('gps constellation');
    });

    it('great-archive restored ambient life mentions the Compass Rose mosaic', () => {
      expect(atlas.getProfile('great-archive')!.restoredAmbientLife.toLowerCase()).toContain('compass rose mosaic');
    });

    it('music-meadow restored ambient life mentions the blues section', () => {
      expect(atlas.getProfile('music-meadow')!.restoredAmbientLife.toLowerCase()).toContain('blues section');
    });

    it('everywhere restored ambient life mentions the overview effect', () => {
      expect(atlas.getProfile('everywhere')!.restoredAmbientLife.toLowerCase()).toContain('overview effect');
    });
  });
});