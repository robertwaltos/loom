import { describe, it, expect } from 'vitest';
import {
  createForgettingWell,
  WELL_LEVELS,
  WELL_CHARACTERS,
  WELL_RECOVERY_QUESTS,
} from '../forgetting-well.js';

// ── createForgettingWell ───────────────────────────────────────

describe('createForgettingWell', () => {
  it('instantiates without throwing', () => {
    expect(() => createForgettingWell()).not.toThrow();
  });

  it('totalLevels is 5', () => {
    const well = createForgettingWell();
    expect(well.totalLevels).toBe(5);
  });

  it('totalRecoveryQuests matches the static array length', () => {
    const well = createForgettingWell();
    expect(well.totalRecoveryQuests).toBe(WELL_RECOVERY_QUESTS.length);
  });

  it('allLevels returns all 5 levels', () => {
    const well = createForgettingWell();
    expect(well.allLevels()).toHaveLength(5);
  });

  it('allCharacters returns all 3 Well characters', () => {
    const well = createForgettingWell();
    expect(well.allCharacters()).toHaveLength(3);
  });
});

// ── getLevel ───────────────────────────────────────────────────

describe('getLevel', () => {
  it('returns level 0 (entrance)', () => {
    const well = createForgettingWell();
    const level = well.getLevel(0);
    expect(level).toBeDefined();
    expect(level?.level).toBe(0);
    expect(level?.theme).toBe('entrance');
  });

  it('returns level 4 (deep luminous)', () => {
    const well = createForgettingWell();
    const level = well.getLevel(4);
    expect(level).toBeDefined();
    expect(level?.theme).toBe('deep_luminous');
  });

  it('every level has a non-empty lesson', () => {
    const well = createForgettingWell();
    const levels = [0, 1, 2, 3, 4] as const;
    for (const i of levels) {
      const level = well.getLevel(i);
      expect(level?.lesson.length).toBeGreaterThan(0);
    }
  });

  it('returns a level with the entropy lesson at level 4', () => {
    const well = createForgettingWell();
    const deepLevel = well.getLevel(4);
    expect(deepLevel?.lesson).toContain('entropy');
  });

  it('returns a level with the love/remember lesson at level 4', () => {
    const well = createForgettingWell();
    const deepLevel = well.getLevel(4);
    expect(deepLevel?.lesson.toLowerCase()).toContain('love');
  });
});

// ── getCharacter ───────────────────────────────────────────────

describe('getCharacter', () => {
  it('returns The Keeper', () => {
    const well = createForgettingWell();
    const keeper = well.getCharacter('the-keeper');
    expect(keeper).toBeDefined();
    expect(keeper?.name).toBe('The Keeper');
  });

  it('returns Compass', () => {
    const well = createForgettingWell();
    const compass = well.getCharacter('compass');
    expect(compass).toBeDefined();
  });

  it('returns The Echoes', () => {
    const well = createForgettingWell();
    const echoes = well.getCharacter('the-echoes');
    expect(echoes).toBeDefined();
  });

  it('returns undefined for unknown character', () => {
    const well = createForgettingWell();
    expect(well.getCharacter('nobody-xyz')).toBeUndefined();
  });

  it('The Keeper appears at level 0', () => {
    const well = createForgettingWell();
    const keeper = well.getCharacter('the-keeper');
    expect(keeper?.firstAppearanceLevel).toBe(0);
  });
});

// ── getRecoveryQuestsByLevel ────────────────────────────────────

describe('getRecoveryQuestsByLevel', () => {
  it('returns quests for level 1', () => {
    const well = createForgettingWell();
    const quests = well.getRecoveryQuestsByLevel(1);
    expect(quests.length).toBeGreaterThan(0);
  });

  it('returns quests for level 4', () => {
    const well = createForgettingWell();
    const quests = well.getRecoveryQuestsByLevel(4);
    expect(quests.length).toBeGreaterThan(0);
  });

  it('returns empty array for level 0 (no recovery quests at entrance)', () => {
    const well = createForgettingWell();
    const quests = well.getRecoveryQuestsByLevel(0);
    expect(quests).toHaveLength(0);
  });
});

// ── getRecoveryQuest ───────────────────────────────────────────

describe('getRecoveryQuest', () => {
  it('returns a quest for a known questId', () => {
    const well = createForgettingWell();
    const first = WELL_RECOVERY_QUESTS[0];
    const quest = well.getRecoveryQuest(first.questId);
    expect(quest).toBeDefined();
    expect(quest?.questId).toBe(first.questId);
  });

  it('returns undefined for unknown questId', () => {
    const well = createForgettingWell();
    expect(well.getRecoveryQuest('quest-does-not-exist-xyz')).toBeUndefined();
  });
});

// ── getEchoesForWorld ──────────────────────────────────────────

describe('getEchoesForWorld', () => {
  it('returns echoes for a world that has them', () => {
    const well = createForgettingWell();
    const results = well.getEchoesForWorld('translation-garden');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for a world with no echoes', () => {
    const well = createForgettingWell();
    expect(well.getEchoesForWorld('world-has-no-echoes-xyz')).toHaveLength(0);
  });
});

// ── data integrity ─────────────────────────────────────────────

describe('WELL_LEVELS data integrity', () => {
  it('levels are numbered 0 through 4', () => {
    const levelNumbers = WELL_LEVELS.map((l) => l.level).sort();
    expect(levelNumbers).toEqual([0, 1, 2, 3, 4]);
  });

  it('every level has a non-empty name', () => {
    expect(WELL_LEVELS.every((l) => l.name.length > 0)).toBe(true);
  });

  it('every level has a non-empty unlockCondition', () => {
    expect(WELL_LEVELS.every((l) => l.unlockCondition.length > 0)).toBe(true);
  });
});

describe('WELL_CHARACTERS data integrity', () => {
  it('every character has a non-empty characterId', () => {
    expect(WELL_CHARACTERS.every((c) => c.characterId.length > 0)).toBe(true);
  });

  it('character IDs are unique', () => {
    const ids = new Set(WELL_CHARACTERS.map((c) => c.characterId));
    expect(ids.size).toBe(WELL_CHARACTERS.length);
  });
});

describe('WELL_RECOVERY_QUESTS data integrity', () => {
  it('every quest has a non-empty questId', () => {
    expect(WELL_RECOVERY_QUESTS.every((q) => q.questId.length > 0)).toBe(true);
  });

  it('quest IDs are unique', () => {
    const ids = new Set(WELL_RECOVERY_QUESTS.map((q) => q.questId));
    expect(ids.size).toBe(WELL_RECOVERY_QUESTS.length);
  });

  it('every quest has a completionText', () => {
    expect(WELL_RECOVERY_QUESTS.every((q) => q.completionText.length > 0)).toBe(true);
  });
});
