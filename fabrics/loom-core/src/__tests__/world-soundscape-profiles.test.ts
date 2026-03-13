import { describe, it, expect } from 'vitest';
import {
  createWorldSoundscapeProfiles,
  WORLD_SOUNDSCAPE_PROFILES,
  TOTAL_SOUNDSCAPE_PROFILES,
  type WorldSoundscapeProfile,
} from '../world-soundscape-profiles.js';

describe('createWorldSoundscapeProfiles', () => {
  const registry = createWorldSoundscapeProfiles();

  it('exports TOTAL_SOUNDSCAPE_PROFILES = 50', () => {
    expect(TOTAL_SOUNDSCAPE_PROFILES).toBe(50);
  });

  it('returns 50 profiles via totalProfiles', () => {
    expect(registry.totalProfiles).toBe(50);
  });

  it('all() returns 50 entries matching WORLD_SOUNDSCAPE_PROFILES', () => {
    expect(registry.all()).toHaveLength(50);
    expect(registry.all()).toBe(WORLD_SOUNDSCAPE_PROFILES);
  });

  it('every profile has a non-empty worldId', () => {
    for (const profile of registry.all()) {
      expect(profile.worldId.length, profile.worldId).toBeGreaterThan(0);
    }
  });

  it('every profile has a non-empty worldName', () => {
    for (const profile of registry.all()) {
      expect(profile.worldName.length, profile.worldId).toBeGreaterThan(0);
    }
  });

  it('every profile has a non-empty guideId', () => {
    for (const profile of registry.all()) {
      expect(profile.guideId.length, profile.worldId).toBeGreaterThan(0);
    }
  });

  it('every profile has at least one ambientLayer', () => {
    for (const profile of registry.all()) {
      expect(profile.ambientLayers.length, `${profile.worldId} ambientLayers`).toBeGreaterThan(0);
      for (const layer of profile.ambientLayers) {
        expect(layer.length, `${profile.worldId} layer`).toBeGreaterThan(0);
      }
    }
  });

  it('every musicalPalette has all required fields', () => {
    const fields: Array<keyof WorldSoundscapeProfile['musicalPalette']> = [
      'key',
      'tempo',
      'leadInstrument',
    ];
    for (const profile of registry.all()) {
      for (const field of fields) {
        const value = profile.musicalPalette[field];
        expect(value, `${profile.worldId}.musicalPalette.${field}`).toBeTruthy();
      }
      expect(
        profile.musicalPalette.supportInstruments.length,
        `${profile.worldId} supportInstruments`,
      ).toBeGreaterThan(0);
    }
  });

  it('every fadingResponse has sparse, partial, and full descriptions', () => {
    for (const profile of registry.all()) {
      const { fadingResponse } = profile;
      expect(fadingResponse.sparse, `${profile.worldId}.fadingResponse.sparse`).toBeTruthy();
      expect(fadingResponse.partial, `${profile.worldId}.fadingResponse.partial`).toBeTruthy();
      expect(fadingResponse.full, `${profile.worldId}.fadingResponse.full`).toBeTruthy();
    }
  });

  it('every restorationJingle is non-empty', () => {
    for (const profile of registry.all()) {
      expect(
        profile.restorationJingle.length,
        `${profile.worldId}.restorationJingle`,
      ).toBeGreaterThan(0);
    }
  });

  it('every threadwayCrossfade has entering, departing, and signature', () => {
    for (const profile of registry.all()) {
      const { threadwayCrossfade } = profile;
      expect(threadwayCrossfade.entering, `${profile.worldId}.threadwayCrossfade.entering`).toBeTruthy();
      expect(threadwayCrossfade.departing, `${profile.worldId}.threadwayCrossfade.departing`).toBeTruthy();
      expect(threadwayCrossfade.signature, `${profile.worldId}.threadwayCrossfade.signature`).toBeTruthy();
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

  describe('canon: musical palette accuracy', () => {
    it('number-garden lead instrument is sitar + music box (Bible v5 canon)', () => {
      const p = registry.getProfile('number-garden')!;
      expect(p.musicalPalette.leadInstrument.toLowerCase()).toContain('sitar');
      expect(p.musicalPalette.leadInstrument.toLowerCase()).toContain('music box');
    });

    it('number-garden key is C major', () => {
      const p = registry.getProfile('number-garden')!;
      expect(p.musicalPalette.key).toBe('C major');
    });

    it('market-square palette includes steel drums (Bible v5 audio spec)', () => {
      const p = registry.getProfile('market-square')!;
      const allInstruments = [
        p.musicalPalette.leadInstrument,
        ...p.musicalPalette.supportInstruments,
      ].join(' ').toLowerCase();
      expect(allInstruments).toContain('steel drum');
    });

    it('cloud-kingdom key is D major', () => {
      const p = registry.getProfile('cloud-kingdom')!;
      expect(p.musicalPalette.key).toBe('D major');
    });

    it('cloud-kingdom lead instrument is Oboe', () => {
      const p = registry.getProfile('cloud-kingdom')!;
      expect(p.musicalPalette.leadInstrument.toLowerCase()).toContain('oboe');
    });

    it('calculation-caves lead instrument is glass harmonica', () => {
      const p = registry.getProfile('calculation-caves')!;
      expect(p.musicalPalette.leadInstrument.toLowerCase()).toContain('glass harmonica');
    });

    it('debt-glacier tempo is Glacial', () => {
      const p = registry.getProfile('debt-glacier')!;
      expect(p.musicalPalette.tempo).toBe('Glacial');
    });

    it('music-meadow key includes all keys', () => {
      const p = registry.getProfile('music-meadow')!;
      expect(p.musicalPalette.key.toLowerCase()).toContain('all keys');
    });

    it('starfall-observatory lead instrument is Kora', () => {
      const p = registry.getProfile('starfall-observatory')!;
      expect(p.musicalPalette.leadInstrument.toLowerCase()).toContain('kora');
    });

    it('frost-peaks lead instrument is Cello', () => {
      const p = registry.getProfile('frost-peaks')!;
      expect(p.musicalPalette.leadInstrument.toLowerCase()).toContain('cello');
    });

    it('everywhere guide is compass', () => {
      const p = registry.getProfile('everywhere')!;
      expect(p.guideId).toBe('compass');
    });

    it("everywhere key references the child's favorite key", () => {
      const p = registry.getProfile('everywhere')!;
      expect(p.musicalPalette.key.toLowerCase()).toContain("child");
    });
  });

  describe('canon: Threadway crossfade signatures', () => {
    it('number-garden threadwayCrossfade entering references library (archive→garden transition)', () => {
      const p = registry.getProfile('number-garden')!;
      expect(p.threadwayCrossfade.entering.toLowerCase()).toContain('library');
    });

    it('number-garden threadwayCrossfade signature is mathematical', () => {
      const p = registry.getProfile('number-garden')!;
      expect(p.threadwayCrossfade.signature).toBe('mathematical');
    });

    it('great-archive threadwayCrossfade signature is infinite', () => {
      const p = registry.getProfile('great-archive')!;
      expect(p.threadwayCrossfade.signature).toBe('infinite');
    });

    it('everywhere threadwayCrossfade signature is orienting', () => {
      const p = registry.getProfile('everywhere')!;
      expect(p.threadwayCrossfade.signature).toBe('orienting');
    });

    it('music-meadow threadwayCrossfade entering references marimba (cross-world connection)', () => {
      const p = registry.getProfile('music-meadow')!;
      expect(p.threadwayCrossfade.entering.toLowerCase()).toContain('marimba');
    });

    it('tideline-bay signature is oceanic', () => {
      const p = registry.getProfile('tideline-bay')!;
      expect(p.threadwayCrossfade.signature).toBe('oceanic');
    });

    it('thinking-grove signature is geological', () => {
      const p = registry.getProfile('thinking-grove')!;
      expect(p.threadwayCrossfade.signature).toBe('geological');
    });

    it('all 50 threadwayCrossfade signatures are single words (no spaces)', () => {
      for (const profile of registry.all()) {
        expect(
          profile.threadwayCrossfade.signature,
          `${profile.worldId} signature has spaces`,
        ).not.toContain(' ');
      }
    });
  });

  describe('fading differentiation', () => {
    it('every world has distinct sparse vs full fading descriptions', () => {
      for (const profile of registry.all()) {
        expect(
          profile.fadingResponse.sparse,
          `${profile.worldId} sparse should differ from full`,
        ).not.toBe(profile.fadingResponse.full);
      }
    });

    it('sparse descriptions convey absence (shorter or emptier language)', () => {
      const p = registry.getProfile('cloud-kingdom')!;
      expect(p.fadingResponse.sparse).toBeTruthy();
      expect(p.fadingResponse.full.length).toBeGreaterThan(p.fadingResponse.sparse.length);
    });

    it('number-garden full description contains marimba (canonical audio spec)', () => {
      const p = registry.getProfile('number-garden')!;
      expect(p.fadingResponse.full.toLowerCase()).toContain('marimba');
    });

    it('tideline-bay full description contains whale song', () => {
      const p = registry.getProfile('tideline-bay')!;
      expect(p.fadingResponse.full.toLowerCase()).toContain('whale');
    });
  });

  describe('guide-world pairings (sample)', () => {
    const pairings: Array<[string, string]> = [
      ['cloud-kingdom', 'professor-nimbus'],
      ['savanna-workshop', 'zara-ngozi'],
      ['tideline-bay', 'suki-tanaka-reyes'],
      ['number-garden', 'dottie-chakravarti'],
      ['map-room', 'atlas'],
      ['story-tree', 'grandmother-anaya'],
      ['market-square', 'tia-carmen-herrera'],
      ['debt-glacier', 'elsa-lindgren'],
      ['great-archive', 'the-librarian'],
      ['music-meadow', 'luna-esperanza'],
      ['everywhere', 'compass'],
    ];

    for (const [worldId, guideId] of pairings) {
      it(`${worldId} is guided by ${guideId}`, () => {
        const p = registry.getProfile(worldId)!;
        expect(p.guideId).toBe(guideId);
      });
    }
  });
});
