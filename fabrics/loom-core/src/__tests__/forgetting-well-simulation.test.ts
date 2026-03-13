import { describe, it, expect } from 'vitest';
import {
  createForgettingWell,
  WELL_CHARACTERS,
  WELL_LEVELS,
  WELL_RECOVERY_QUESTS,
} from '../forgetting-well.js';

describe('ForgettingWell — simulation', () => {
  const well = createForgettingWell();

  describe('totalLevels', () => {
    it('reports 5 levels', () => {
      expect(well.totalLevels).toBe(5);
    });
  });

  describe('totalRecoveryQuests', () => {
    it('is a positive integer', () => {
      expect(well.totalRecoveryQuests).toBeGreaterThan(0);
    });
  });

  describe('getLevel', () => {
    it('level 0 has the entrance theme', () => {
      const level = well.getLevel(0);
      expect(level).toBeDefined();
      expect(level!.level).toBe(0);
      expect(level!.theme).toBe('entrance');
    });

    it('level 4 has the deep_luminous theme', () => {
      const level = well.getLevel(4);
      expect(level).toBeDefined();
      expect(level!.level).toBe(4);
      expect(level!.theme).toBe('deep_luminous');
    });

    it('every level has the required structural fields', () => {
      for (let i = 0 as 0 | 1 | 2 | 3 | 4; i <= 4; i = (i + 1) as 0 | 1 | 2 | 3 | 4) {
        const level = well.getLevel(i);
        expect(level).toBeDefined();
        expect(typeof level!.name).toBe('string');
        expect(typeof level!.theme).toBe('string');
        expect(typeof level!.unlockCondition).toBe('string');
        expect(typeof level!.description).toBe('string');
        expect(typeof level!.ambience).toBe('string');
        expect(typeof level!.lesson).toBe('string');
      }
    });

    it('levels contain echoes arrays', () => {
      for (let i = 0 as 0 | 1 | 2 | 3 | 4; i <= 4; i = (i + 1) as 0 | 1 | 2 | 3 | 4) {
        const level = well.getLevel(i);
        expect(Array.isArray(level!.echoes)).toBe(true);
      }
    });
  });

  describe('getCharacter', () => {
    it('returns The Keeper character', () => {
      const keeper = well.getCharacter('the-keeper');
      expect(keeper).toBeDefined();
      expect(keeper!.name).toBe('The Keeper');
      expect(keeper!.role).toBe('Custodian of the Well');
    });

    it('returns Compass character', () => {
      const compass = well.getCharacter('compass');
      expect(compass).toBeDefined();
      expect(compass!.name).toBe('Compass');
      expect(compass!.role).toBe('Guide through the Well');
    });

    it('returns undefined for an unknown character id', () => {
      expect(well.getCharacter('ghost')).toBeUndefined();
    });
  });

  describe('getRecoveryQuest', () => {
    it('returns a known quest by id', () => {
      const allQuests = well.allRecoveryQuests();
      expect(allQuests.length).toBeGreaterThan(0);
      const first = allQuests[0]!;
      const fetched = well.getRecoveryQuest(first.questId);
      expect(fetched).toBeDefined();
      expect(fetched!.questId).toBe(first.questId);
    });

    it('returns undefined for a nonexistent quest id', () => {
      expect(well.getRecoveryQuest('no-such-quest')).toBeUndefined();
    });
  });

  describe('getRecoveryQuestsByLevel', () => {
    it('returns an array for each valid level', () => {
      for (let i = 0 as 0 | 1 | 2 | 3 | 4; i <= 4; i = (i + 1) as 0 | 1 | 2 | 3 | 4) {
        const quests = well.getRecoveryQuestsByLevel(i);
        expect(Array.isArray(quests)).toBe(true);
      }
    });

    it('quests returned are scoped to the requested level', () => {
      for (let lvl = 0 as 0 | 1 | 2 | 3 | 4; lvl <= 4; lvl = (lvl + 1) as 0 | 1 | 2 | 3 | 4) {
        const quests = well.getRecoveryQuestsByLevel(lvl);
        for (const q of quests) {
          expect(q.wellLevel).toBe(lvl);
        }
      }
    });
  });

  describe('getEchoesForWorld', () => {
    it('returns an array (possibly empty) for any worldId', () => {
      const echoes = well.getEchoesForWorld('number-garden');
      expect(Array.isArray(echoes)).toBe(true);
    });

    it('echoes are scoped to the requested world', () => {
      const allLevels = well.allLevels();
      // Collect all echoes across all levels to find a known worldId
      const allEchoes = allLevels.flatMap(l => l.echoes);
      if (allEchoes.length > 0) {
        const sampleWorld = allEchoes[0]!.originWorldId;
        const echoes = well.getEchoesForWorld(sampleWorld);
        expect(echoes.length).toBeGreaterThanOrEqual(1);
        for (const echo of echoes) {
          expect(echo.originWorldId).toBe(sampleWorld);
        }
      }
    });
  });

  describe('allLevels()', () => {
    it('returns exactly 5 levels', () => {
      expect(well.allLevels()).toHaveLength(5);
    });

    it('levels are ordered 0 through 4', () => {
      const levels = well.allLevels();
      for (let i = 0; i < levels.length; i++) {
        expect(levels[i]!.level).toBe(i);
      }
    });
  });

  describe('allCharacters()', () => {
    it('returns at least the two named characters', () => {
      const chars = well.allCharacters();
      expect(chars.length).toBeGreaterThanOrEqual(2);
    });

    it('includes The Keeper and Compass', () => {
      const names = well.allCharacters().map(c => c.name);
      expect(names).toContain('The Keeper');
      expect(names).toContain('Compass');
    });
  });

  describe('allRecoveryQuests()', () => {
    it('returns the same count as totalRecoveryQuests', () => {
      expect(well.allRecoveryQuests()).toHaveLength(well.totalRecoveryQuests);
    });

    it('every quest has required fields', () => {
      for (const q of well.allRecoveryQuests()) {
        expect(typeof q.questId).toBe('string');
        expect(typeof q.title).toBe('string');
        expect(typeof q.description).toBe('string');
        expect(typeof q.wellLevel).toBe('number');
      }
    });
  });

  describe('exported constants', () => {
    it('WELL_LEVELS has 5 entries', () => {
      expect(WELL_LEVELS).toHaveLength(5);
    });

    it('WELL_CHARACTERS contains The Keeper', () => {
      const found = WELL_CHARACTERS.find(c => c.name === 'The Keeper');
      expect(found).toBeDefined();
    });

    it('WELL_RECOVERY_QUESTS count matches totalRecoveryQuests', () => {
      expect(WELL_RECOVERY_QUESTS).toHaveLength(well.totalRecoveryQuests);
    });
  });
});
