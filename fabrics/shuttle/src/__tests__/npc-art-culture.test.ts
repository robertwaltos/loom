/**
 * npc-art-culture.test.ts — Tests for NPC art creation and cultural diffusion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCultureSystem } from '../npc-art-culture.js';
import type { CultureSystem } from '../npc-art-culture.js';

describe('npc-art-culture', () => {
  let system: CultureSystem;
  let currentTime: bigint;
  let idCounter: number;
  const logs: Array<{ msg: string; ctx: Record<string, unknown> }> = [];

  beforeEach(() => {
    currentTime = 1000000n;
    idCounter = 1;
    logs.length = 0;
    system = createCultureSystem({
      clock: { nowMicroseconds: () => currentTime },
      idGenerator: {
        next: () => {
          const id = 'art_' + String(idCounter);
          idCounter = idCounter + 1;
          return id;
        },
      },
      logger: {
        info: (msg, ctx) => {
          logs.push({ msg, ctx });
        },
      },
    });
  });

  describe('createArtwork', () => {
    it('creates MUSIC artwork', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Symphony No. 1', 'world1', 70, 80);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('invalid_quality');
      expect(result).not.toBe('invalid_inspiration');
    });

    it('creates PAINTING artwork', () => {
      const result = system.createArtwork('npc1', 'PAINTING', 'Starry Night', 'world1', 85, 90);
      expect(typeof result).toBe('string');
    });

    it('creates STORY artwork', () => {
      const result = system.createArtwork('npc1', 'STORY', 'Epic Tale', 'world1', 60, 75);
      expect(typeof result).toBe('string');
    });

    it('creates SCULPTURE artwork', () => {
      const result = system.createArtwork('npc1', 'SCULPTURE', 'The Thinker', 'world1', 80, 85);
      expect(typeof result).toBe('string');
    });

    it('creates DANCE artwork', () => {
      const result = system.createArtwork('npc1', 'DANCE', 'Ballet Concerto', 'world1', 75, 80);
      expect(typeof result).toBe('string');
    });

    it('logs artwork creation', () => {
      logs.length = 0;
      system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 70, 80);
      const artLog = logs.find((l) => l.msg === 'artwork_created');
      expect(artLog).toBeDefined();
      if (artLog === undefined) {
        throw new Error('log missing');
      }
      expect(artLog.ctx.creatorId).toBe('npc1');
      expect(artLog.ctx.artForm).toBe('MUSIC');
    });

    it('rejects skill level below min', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', -1, 80);
      expect(result).toBe('invalid_quality');
    });

    it('rejects skill level above max', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 101, 80);
      expect(result).toBe('invalid_quality');
    });

    it('rejects inspiration below min', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 70, -1);
      expect(result).toBe('invalid_inspiration');
    });

    it('rejects inspiration above max', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 70, 101);
      expect(result).toBe('invalid_inspiration');
    });

    it('allows skill at min boundary', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 0, 80);
      expect(typeof result).toBe('string');
    });

    it('allows skill at max boundary', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 100, 80);
      expect(typeof result).toBe('string');
    });

    it('allows inspiration at min boundary', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 70, 0);
      expect(typeof result).toBe('string');
    });

    it('allows inspiration at max boundary', () => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 70, 100);
      expect(typeof result).toBe('string');
    });

    it('creates unique artwork IDs', () => {
      const id1 = system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      const id2 = system.createArtwork('npc1', 'MUSIC', 'Song2', 'world1', 70, 80);
      expect(id1).not.toBe(id2);
    });

    it('creates artworks for different NPCs', () => {
      const art1 = system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      const art2 = system.createArtwork('npc2', 'PAINTING', 'Art1', 'world1', 75, 85);
      expect(art1).not.toBe(art2);
    });

    it('creates artworks in different worlds', () => {
      const art1 = system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      const art2 = system.createArtwork('npc1', 'MUSIC', 'Song2', 'world2', 70, 80);
      expect(art1).not.toBe(art2);
    });

    it('boosts world prestige on artwork creation', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 90, 90);
      const prestige = system.computePrestige('world1');
      expect(prestige).toBeGreaterThan(0);
    });

    it('rates high-skill artwork highly', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 95, 95);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      const rating = system.rateArtwork(artId);
      if (typeof rating !== 'number') {
        throw new Error('rating failed');
      }
      expect(rating).toBeGreaterThan(50);
    });

    it('rates low-skill artwork lower', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 10, 10);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      const rating = system.rateArtwork(artId);
      if (typeof rating !== 'number') {
        throw new Error('rating failed');
      }
      expect(rating).toBeLessThan(50);
    });

    it('handles multiple artworks from same creator', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      system.createArtwork('npc1', 'MUSIC', 'Song2', 'world1', 70, 80);
      system.createArtwork('npc1', 'MUSIC', 'Song3', 'world1', 70, 80);
      const report = system.getCulturalReport();
      expect(report.totalArtworks).toBe(3);
    });
  });

  describe('spreadCulture', () => {
    let artId: string;

    beforeEach(() => {
      const result = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof result !== 'string') {
        throw new Error('artwork creation failed');
      }
      artId = result;
    });

    it('spreads culture via TRADE', () => {
      const result = system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      expect(result).toBe('ok');
    });

    it('spreads culture via MIGRATION', () => {
      const result = system.spreadCulture(artId, 'world1', 'world2', 'MIGRATION');
      expect(result).toBe('ok');
    });

    it('spreads culture via DIPLOMACY', () => {
      const result = system.spreadCulture(artId, 'world1', 'world2', 'DIPLOMACY');
      expect(result).toBe('ok');
    });

    it('logs culture spread', () => {
      logs.length = 0;
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      const spreadLog = logs.find((l) => l.msg === 'culture_spread');
      expect(spreadLog).toBeDefined();
      if (spreadLog === undefined) {
        throw new Error('log missing');
      }
      expect(spreadLog.ctx.fromWorldId).toBe('world1');
      expect(spreadLog.ctx.toWorldId).toBe('world2');
    });

    it('rejects spread for nonexistent artwork', () => {
      const result = system.spreadCulture('unknown', 'world1', 'world2', 'TRADE');
      expect(result).toBe('artwork_not_found');
    });

    it('rejects spread to same world', () => {
      const result = system.spreadCulture(artId, 'world1', 'world1', 'TRADE');
      expect(result).toBe('invalid_world');
    });

    it('increments artwork view count on spread', () => {
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      system.spreadCulture(artId, 'world1', 'world3', 'MIGRATION');
      const report = system.getCulturalReport();
      expect(report.totalDiffusions).toBe(2);
    });

    it('boosts destination world prestige', () => {
      const prestigeBefore = system.computePrestige('world2');
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      const prestigeAfter = system.computePrestige('world2');
      expect(prestigeAfter).toBeGreaterThan(prestigeBefore);
    });

    it('allows multiple spreads of same artwork', () => {
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      system.spreadCulture(artId, 'world1', 'world3', 'TRADE');
      system.spreadCulture(artId, 'world1', 'world4', 'TRADE');
      const report = system.getCulturalReport();
      expect(report.totalDiffusions).toBe(3);
    });

    it('spreads different artworks independently', () => {
      const art2Id = system.createArtwork('npc2', 'PAINTING', 'Art', 'world1', 80, 85);
      if (typeof art2Id !== 'string') {
        throw new Error('artwork creation failed');
      }
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      system.spreadCulture(art2Id, 'world1', 'world3', 'MIGRATION');
      const report = system.getCulturalReport();
      expect(report.totalDiffusions).toBe(2);
    });
  });

  describe('rateArtwork', () => {
    it('returns quality score for valid artwork', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      const rating = system.rateArtwork(artId);
      expect(typeof rating).toBe('number');
    });

    it('returns error for nonexistent artwork', () => {
      const rating = system.rateArtwork('unknown');
      expect(rating).toBe('artwork_not_found');
    });

    it('returns consistent rating for same artwork', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      const rating1 = system.rateArtwork(artId);
      const rating2 = system.rateArtwork(artId);
      expect(rating1).toBe(rating2);
    });

    it('returns different ratings for different artworks', () => {
      const art1 = system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 90, 90);
      const art2 = system.createArtwork('npc1', 'MUSIC', 'Song2', 'world1', 30, 30);
      if (typeof art1 !== 'string' || typeof art2 !== 'string') {
        throw new Error('artwork creation failed');
      }
      const rating1 = system.rateArtwork(art1);
      const rating2 = system.rateArtwork(art2);
      if (typeof rating1 !== 'number' || typeof rating2 !== 'number') {
        throw new Error('rating failed');
      }
      expect(rating1).toBeGreaterThan(rating2);
    });

    it('returns rating within valid range', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      const rating = system.rateArtwork(artId);
      if (typeof rating !== 'number') {
        throw new Error('rating failed');
      }
      expect(rating).toBeGreaterThanOrEqual(0);
      expect(rating).toBeLessThanOrEqual(100);
    });
  });

  describe('startMovement', () => {
    it('starts MUSIC movement', () => {
      const result = system.startMovement('npc1', 'Romanticism', 'MUSIC', 'world1');
      expect(typeof result).toBe('string');
      expect(result).not.toBe('movement_exists');
    });

    it('starts PAINTING movement', () => {
      const result = system.startMovement('npc1', 'Impressionism', 'PAINTING', 'world1');
      expect(typeof result).toBe('string');
    });

    it('starts STORY movement', () => {
      const result = system.startMovement('npc1', 'Modernism', 'STORY', 'world1');
      expect(typeof result).toBe('string');
    });

    it('starts SCULPTURE movement', () => {
      const result = system.startMovement('npc1', 'Minimalism', 'SCULPTURE', 'world1');
      expect(typeof result).toBe('string');
    });

    it('starts DANCE movement', () => {
      const result = system.startMovement('npc1', 'Contemporary', 'DANCE', 'world1');
      expect(typeof result).toBe('string');
    });

    it('logs movement creation', () => {
      logs.length = 0;
      system.startMovement('npc1', 'Romanticism', 'MUSIC', 'world1');
      const movementLog = logs.find((l) => l.msg === 'movement_started');
      expect(movementLog).toBeDefined();
      if (movementLog === undefined) {
        throw new Error('log missing');
      }
      expect(movementLog.ctx.founderId).toBe('npc1');
      expect(movementLog.ctx.name).toBe('Romanticism');
    });

    it('creates unique movement IDs', () => {
      const id1 = system.startMovement('npc1', 'Movement1', 'MUSIC', 'world1');
      const id2 = system.startMovement('npc2', 'Movement2', 'PAINTING', 'world1');
      expect(id1).not.toBe(id2);
    });

    it('rejects duplicate movement by same founder', () => {
      system.startMovement('npc1', 'Romanticism', 'MUSIC', 'world1');
      const result = system.startMovement('npc1', 'Romanticism', 'MUSIC', 'world1');
      expect(result).toBe('movement_exists');
    });

    it('allows same movement name by different founders', () => {
      const id1 = system.startMovement('npc1', 'Romanticism', 'MUSIC', 'world1');
      const id2 = system.startMovement('npc2', 'Romanticism', 'MUSIC', 'world1');
      expect(id1).not.toBe(id2);
    });

    it('allows different movements by same founder', () => {
      const id1 = system.startMovement('npc1', 'Romanticism', 'MUSIC', 'world1');
      const id2 = system.startMovement('npc1', 'Classicism', 'MUSIC', 'world1');
      expect(id1).not.toBe(id2);
    });

    it('increments total movements count', () => {
      system.startMovement('npc1', 'Movement1', 'MUSIC', 'world1');
      system.startMovement('npc2', 'Movement2', 'PAINTING', 'world1');
      const report = system.getCulturalReport();
      expect(report.totalMovements).toBe(2);
    });
  });

  describe('getCulturalReport', () => {
    it('returns empty report when no artworks', () => {
      const report = system.getCulturalReport();
      expect(report.totalArtworks).toBe(0);
      expect(report.totalMovements).toBe(0);
      expect(report.totalDiffusions).toBe(0);
      expect(report.mostPopularArtForm).toBeUndefined();
      expect(report.averageQuality).toBe(0);
    });

    it('returns correct total artworks', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      system.createArtwork('npc2', 'PAINTING', 'Art1', 'world1', 75, 85);
      const report = system.getCulturalReport();
      expect(report.totalArtworks).toBe(2);
    });

    it('returns correct total movements', () => {
      system.startMovement('npc1', 'Movement1', 'MUSIC', 'world1');
      system.startMovement('npc2', 'Movement2', 'PAINTING', 'world1');
      const report = system.getCulturalReport();
      expect(report.totalMovements).toBe(2);
    });

    it('returns correct total diffusions', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      system.spreadCulture(artId, 'world1', 'world3', 'MIGRATION');
      const report = system.getCulturalReport();
      expect(report.totalDiffusions).toBe(2);
    });

    it('identifies most popular art form', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      system.createArtwork('npc2', 'MUSIC', 'Song2', 'world1', 75, 85);
      system.createArtwork('npc3', 'PAINTING', 'Art1', 'world1', 80, 90);
      const report = system.getCulturalReport();
      expect(report.mostPopularArtForm).toBe('MUSIC');
    });

    it('calculates average quality', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 80, 80);
      system.createArtwork('npc2', 'MUSIC', 'Song2', 'world1', 60, 60);
      const report = system.getCulturalReport();
      expect(report.averageQuality).toBeGreaterThan(0);
      expect(report.averageQuality).toBeLessThan(100);
    });

    it('identifies highest prestige world', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 90, 90);
      system.createArtwork('npc2', 'MUSIC', 'Song2', 'world2', 50, 50);
      const report = system.getCulturalReport();
      expect(report.highestPrestigeWorld).toBe('world1');
    });

    it('handles tie in art form popularity', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      system.createArtwork('npc2', 'PAINTING', 'Art1', 'world1', 75, 85);
      const report = system.getCulturalReport();
      expect(report.mostPopularArtForm).toBeDefined();
    });

    it('updates report after new artwork', () => {
      const report1 = system.getCulturalReport();
      system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 70, 80);
      const report2 = system.getCulturalReport();
      expect(report2.totalArtworks).toBe(report1.totalArtworks + 1);
    });

    it('updates report after movement creation', () => {
      const report1 = system.getCulturalReport();
      system.startMovement('npc1', 'Movement', 'MUSIC', 'world1');
      const report2 = system.getCulturalReport();
      expect(report2.totalMovements).toBe(report1.totalMovements + 1);
    });

    it('updates report after culture spread', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      const report1 = system.getCulturalReport();
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      const report2 = system.getCulturalReport();
      expect(report2.totalDiffusions).toBe(report1.totalDiffusions + 1);
    });
  });

  describe('getMostInfluentialWorks', () => {
    it('returns empty array when no artworks', () => {
      const works = system.getMostInfluentialWorks(10);
      expect(works.length).toBe(0);
    });

    it('returns single artwork', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      const works = system.getMostInfluentialWorks(10);
      expect(works.length).toBe(1);
    });

    it('returns artworks sorted by influence', () => {
      const art1 = system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 90, 90);
      const art2 = system.createArtwork('npc2', 'MUSIC', 'Song2', 'world1', 50, 50);
      if (typeof art1 !== 'string' || typeof art2 !== 'string') {
        throw new Error('artwork creation failed');
      }
      system.spreadCulture(art1, 'world1', 'world2', 'TRADE');
      system.spreadCulture(art1, 'world1', 'world3', 'TRADE');
      const works = system.getMostInfluentialWorks(10);
      expect(works.length).toBe(2);
      const first = works[0];
      if (first === undefined) {
        throw new Error('work missing');
      }
      expect(first.artId).toBe(art1);
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 10; i = i + 1) {
        system.createArtwork('npc_' + String(i), 'MUSIC', 'Song_' + String(i), 'world1', 70, 80);
      }
      const works = system.getMostInfluentialWorks(5);
      expect(works.length).toBe(5);
    });

    it('returns all works when limit exceeds total', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      system.createArtwork('npc2', 'MUSIC', 'Song2', 'world1', 75, 85);
      const works = system.getMostInfluentialWorks(10);
      expect(works.length).toBe(2);
    });

    it('prioritizes quality in influence calculation', () => {
      const artHigh = system.createArtwork('npc1', 'MUSIC', 'HighQuality', 'world1', 95, 95);
      const artLow = system.createArtwork('npc2', 'MUSIC', 'LowQuality', 'world1', 30, 30);
      if (typeof artHigh !== 'string' || typeof artLow !== 'string') {
        throw new Error('artwork creation failed');
      }
      const works = system.getMostInfluentialWorks(10);
      const first = works[0];
      if (first === undefined) {
        throw new Error('work missing');
      }
      expect(first.artId).toBe(artHigh);
    });

    it('considers view count in influence', () => {
      const art1 = system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 70);
      const art2 = system.createArtwork('npc1', 'MUSIC', 'Song2', 'world1', 70, 70);
      if (typeof art1 !== 'string' || typeof art2 !== 'string') {
        throw new Error('artwork creation failed');
      }
      system.spreadCulture(art1, 'world1', 'world2', 'TRADE');
      system.spreadCulture(art1, 'world1', 'world3', 'TRADE');
      system.spreadCulture(art1, 'world1', 'world4', 'TRADE');
      const works = system.getMostInfluentialWorks(10);
      const first = works[0];
      if (first === undefined) {
        throw new Error('work missing');
      }
      expect(first.artId).toBe(art1);
    });
  });

  describe('computePrestige', () => {
    it('returns zero prestige for world with no artworks', () => {
      const prestige = system.computePrestige('world1');
      expect(prestige).toBe(0);
    });

    it('returns prestige based on artwork quality', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 90, 90);
      const prestige = system.computePrestige('world1');
      expect(prestige).toBeGreaterThan(0);
    });

    it('accumulates prestige from multiple artworks', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 80, 80);
      const prestige1 = system.computePrestige('world1');
      system.createArtwork('npc2', 'MUSIC', 'Song2', 'world1', 80, 80);
      const prestige2 = system.computePrestige('world1');
      expect(prestige2).toBeGreaterThan(prestige1);
    });

    it('boosts prestige from cultural movements', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 80);
      const prestigeBase = system.computePrestige('world1');
      system.startMovement('npc1', 'Movement', 'MUSIC', 'world1');
      const prestigeWithMovement = system.computePrestige('world1');
      expect(prestigeWithMovement).toBeGreaterThan(prestigeBase);
    });

    it('isolates prestige by world', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 90, 90);
      system.createArtwork('npc2', 'MUSIC', 'Song2', 'world2', 50, 50);
      const prestige1 = system.computePrestige('world1');
      const prestige2 = system.computePrestige('world2');
      expect(prestige1).toBeGreaterThan(prestige2);
    });

    it('increases with culture spread', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 90, 90);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      const prestigeBefore = system.computePrestige('world2');
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      const prestigeAfter = system.computePrestige('world2');
      expect(prestigeAfter).toBeGreaterThan(prestigeBefore);
    });

    it('scales with artwork quality', () => {
      system.createArtwork('npc1', 'MUSIC', 'LowQuality', 'world1', 30, 30);
      const prestigeLow = system.computePrestige('world1');
      system.createArtwork('npc2', 'MUSIC', 'HighQuality', 'world2', 95, 95);
      const prestigeHigh = system.computePrestige('world2');
      expect(prestigeHigh).toBeGreaterThan(prestigeLow);
    });
  });

  describe('edge cases', () => {
    it('handles large number of artworks', () => {
      for (let i = 0; i < 100; i = i + 1) {
        const artForms = ['MUSIC', 'PAINTING', 'STORY', 'SCULPTURE', 'DANCE'] as const;
        const artForm = artForms[i % 5];
        if (artForm === undefined) {
          continue;
        }
        system.createArtwork(
          'npc_' + String(i),
          artForm,
          'Work_' + String(i),
          'world1',
          70,
          80,
        );
      }
      const report = system.getCulturalReport();
      expect(report.totalArtworks).toBe(100);
    });

    it('handles rapid culture spread', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      for (let i = 0; i < 50; i = i + 1) {
        const toWorld = 'world_' + String(i);
        system.spreadCulture(artId, 'world1', toWorld, 'TRADE');
      }
      const report = system.getCulturalReport();
      expect(report.totalDiffusions).toBe(50);
    });

    it('handles multiple movements in same world', () => {
      for (let i = 0; i < 20; i = i + 1) {
        system.startMovement('npc_' + String(i), 'Movement_' + String(i), 'MUSIC', 'world1');
      }
      const report = system.getCulturalReport();
      expect(report.totalMovements).toBe(20);
    });

    it('maintains artwork data after multiple spreads', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      if (typeof artId !== 'string') {
        throw new Error('artwork creation failed');
      }
      system.spreadCulture(artId, 'world1', 'world2', 'TRADE');
      system.spreadCulture(artId, 'world1', 'world3', 'MIGRATION');
      const rating = system.rateArtwork(artId);
      expect(typeof rating).toBe('number');
    });

    it('handles concurrent artwork creation and spread', () => {
      const art1 = system.createArtwork('npc1', 'MUSIC', 'Song1', 'world1', 70, 80);
      const art2 = system.createArtwork('npc2', 'PAINTING', 'Art1', 'world1', 75, 85);
      if (typeof art1 !== 'string' || typeof art2 !== 'string') {
        throw new Error('artwork creation failed');
      }
      system.spreadCulture(art1, 'world1', 'world2', 'TRADE');
      system.spreadCulture(art2, 'world1', 'world3', 'MIGRATION');
      const report = system.getCulturalReport();
      expect(report.totalArtworks).toBe(2);
      expect(report.totalDiffusions).toBe(2);
    });

    it('preserves prestige after failed operations', () => {
      system.createArtwork('npc1', 'MUSIC', 'Song', 'world1', 80, 85);
      const prestigeBefore = system.computePrestige('world1');
      system.spreadCulture('unknown', 'world1', 'world2', 'TRADE');
      const prestigeAfter = system.computePrestige('world1');
      expect(prestigeAfter).toBe(prestigeBefore);
    });

    it('handles artwork with zero skill and inspiration', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'MinimalWork', 'world1', 0, 0);
      expect(typeof artId).toBe('string');
    });

    it('handles artwork with max skill and inspiration', () => {
      const artId = system.createArtwork('npc1', 'MUSIC', 'MaximalWork', 'world1', 100, 100);
      expect(typeof artId).toBe('string');
    });
  });
});
