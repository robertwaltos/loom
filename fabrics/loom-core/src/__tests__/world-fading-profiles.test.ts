import { describe, it, expect } from 'vitest';
import {
  createWorldFadingProfiles,
  WORLD_FADING_PROFILES,
  type WorldFadingProfile,
} from '../world-fading-profiles.js';

describe('createWorldFadingProfiles', () => {
  const registry = createWorldFadingProfiles();

  it('returns 50 profiles', () => {
    expect(registry.totalProfiles).toBe(50);
  });

  it('all() returns 50 entries matching WORLD_FADING_PROFILES', () => {
    expect(registry.all()).toHaveLength(50);
    expect(registry.all()).toBe(WORLD_FADING_PROFILES);
  });

  it('every profile has a non-empty worldId', () => {
    for (const profile of registry.all()) {
      expect(profile.worldId.length).toBeGreaterThan(0);
    }
  });

  it('every profile has a non-empty worldName', () => {
    for (const profile of registry.all()) {
      expect(profile.worldName.length).toBeGreaterThan(0);
    }
  });

  it('every profile has a guideId', () => {
    for (const profile of registry.all()) {
      expect(profile.guideId.length).toBeGreaterThan(0);
    }
  });

  it('every luminance state has all required fields', () => {
    const requiredFields: Array<keyof WorldFadingProfile['low']> = [
      'visual',
      'audio',
      'guideState',
      'ambientLife',
    ];
    for (const profile of registry.all()) {
      for (const level of ['low', 'mid', 'high'] as const) {
        for (const field of requiredFields) {
          const value = profile[level][field];
          expect(value, `${profile.worldId}.${level}.${field}`).toBeTruthy();
          expect(value.length, `${profile.worldId}.${level}.${field} length`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every restorationMoment has all required fields', () => {
    for (const profile of registry.all()) {
      const { restorationMoment } = profile;
      expect(restorationMoment.event, `${profile.worldId}.restorationMoment.event`).toBeTruthy();
      expect(restorationMoment.guideReaction, `${profile.worldId}.restorationMoment.guideReaction`).toBeTruthy();
      expect(restorationMoment.thematicCore, `${profile.worldId}.restorationMoment.thematicCore`).toBeTruthy();
    }
  });

  it('all worldIds are unique', () => {
    const ids = registry.all().map((p) => p.worldId);
    const unique = new Set(ids);
    expect(unique.size).toBe(50);
  });

  describe('getProfile', () => {
    it('returns profile for known world', () => {
      const profile = registry.getProfile('cloud-kingdom');
      expect(profile).toBeDefined();
      expect(profile!.worldId).toBe('cloud-kingdom');
      expect(profile!.guideId).toBe('professor-nimbus');
    });

    it('returns undefined for unknown world', () => {
      expect(registry.getProfile('nonexistent-world')).toBeUndefined();
    });

    it('returns all 50 known world IDs', () => {
      const knownIds = [
        // Discovery
        'cloud-kingdom', 'savanna-workshop', 'tideline-bay', 'meadow-lab',
        'starfall-observatory', 'number-garden', 'calculation-caves', 'magnet-hills',
        'circuit-marsh', 'code-canyon', 'body-atlas', 'frost-peaks',
        'greenhouse-spiral', 'data-stream', 'map-room',
        // Expression
        'story-tree', 'rhyme-docks', 'letter-forge', 'reading-reef',
        'grammar-bridge', 'vocabulary-jungle', 'punctuation-station', 'debate-arena',
        'diary-lighthouse', 'spelling-mines', 'translation-garden', 'nonfiction-fleet',
        'illustration-cove', 'folklore-bazaar', 'editing-tower',
        // Exchange
        'market-square', 'savings-vault', 'budget-kitchen', 'entrepreneur-workshop',
        'sharing-meadow', 'investment-greenhouse', 'needs-wants-bridge', 'barter-docks',
        'debt-glacier', 'job-fair', 'charity-harbor', 'tax-office',
        // Crossroads
        'great-archive', 'workshop-crossroads', 'discovery-trail', 'thinking-grove',
        'wellness-garden', 'time-gallery', 'music-meadow', 'everywhere',
      ];
      for (const id of knownIds) {
        expect(registry.getProfile(id), `getProfile('${id}')`).toBeDefined();
      }
    });
  });

  describe('getProfilesForRealm', () => {
    it('discovery realm has 15 profiles', () => {
      expect(registry.getProfilesForRealm('discovery')).toHaveLength(15);
    });

    it('expression realm has 15 profiles', () => {
      expect(registry.getProfilesForRealm('expression')).toHaveLength(15);
    });

    it('exchange realm has 12 profiles', () => {
      expect(registry.getProfilesForRealm('exchange')).toHaveLength(12);
    });

    it('crossroads realm has 8 profiles', () => {
      expect(registry.getProfilesForRealm('crossroads')).toHaveLength(8);
    });

    it('all realms total 50', () => {
      const total = (['discovery', 'expression', 'exchange', 'crossroads'] as const)
        .reduce((sum, r) => sum + registry.getProfilesForRealm(r).length, 0);
      expect(total).toBe(50);
    });
  });

  describe('specific known profiles', () => {
    it('cloud-kingdom low state describes grey and frozen', () => {
      const p = registry.getProfile('cloud-kingdom')!;
      expect(p.low.visual).toContain('gray');
      expect(p.low.guideState).toContain('Nimbus');
    });

    it('cloud-kingdom high state describes permanent rainbow', () => {
      const p = registry.getProfile('cloud-kingdom')!;
      expect(p.high.visual).toContain('rainbow');
    });

    it('cloud-kingdom restoration moment involves lightning', () => {
      const p = registry.getProfile('cloud-kingdom')!;
      expect(p.restorationMoment.event).toContain('Lightning');
    });

    it('tideline-bay restoration moment involves whale', () => {
      const p = registry.getProfile('tideline-bay')!;
      expect(p.restorationMoment.event).toContain('whale');
    });

    it('number-garden restoration moment reveals Fibonacci spiral', () => {
      const p = registry.getProfile('number-garden')!;
      expect(p.restorationMoment.event).toContain('Fibonacci');
    });

    it('everywhere guide is compass', () => {
      const p = registry.getProfile('everywhere')!;
      expect(p.guideId).toBe('compass');
    });

    it('great-archive restoration moment adds a new door', () => {
      const p = registry.getProfile('great-archive')!;
      expect(p.restorationMoment.event).toContain('portal');
    });

    it('calculation-caves high state describes crystal music', () => {
      const p = registry.getProfile('calculation-caves')!;
      expect(p.high.audio).toContain('harmonic');
    });

    it('savanna-workshop low state describes broken wind tunnel', () => {
      const p = registry.getProfile('savanna-workshop')!;
      expect(p.low.visual).toContain('Wind Tunnel');
    });
  });

  describe('luminance differentiation', () => {
    it('every world has distinct low vs high visuals', () => {
      for (const profile of registry.all()) {
        expect(
          profile.low.visual,
          `${profile.worldId} low visual should differ from high visual`,
        ).not.toBe(profile.high.visual);
      }
    });

    it('every world has distinct low vs high guideState', () => {
      for (const profile of registry.all()) {
        expect(
          profile.low.guideState,
          `${profile.worldId} low guideState should differ from high guideState`,
        ).not.toBe(profile.high.guideState);
      }
    });
  });
});
