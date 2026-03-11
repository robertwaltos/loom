import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNpcReligionModule,
  type RelDeps,
  type Belief,
  type Ritual,
  type HolyDay,
} from '../npc-religion.js';

function createMockDeps(): RelDeps {
  let counter = 0;
  let now = 1000000000n;

  return {
    clock: {
      nowMicroseconds: () => now,
    },
    idGen: {
      generate: () => {
        counter = counter + 1;
        return 'id-' + String(counter);
      },
    },
    logger: {
      info: () => {},
      warn: () => {},
    },
  };
}

function createTestBelief(id: string, name: string): Belief {
  return {
    beliefId: id,
    name,
    description: 'A core belief',
    strength: 0.8,
    category: 'doctrine',
  };
}

function createTestRitual(id: string, name: string): Ritual {
  return {
    ritualId: id,
    name,
    description: 'A sacred ritual',
    frequencyMicros: 7n * 24n * 3600n * 1000000n,
    lastPerformedAtMicros: null,
    participantCount: 0,
    effects: { faith: 10 },
  };
}

function createTestHolyDay(id: string, name: string): HolyDay {
  return {
    holyDayId: id,
    name,
    description: 'A holy celebration',
    dateOffsetMicros: 100n * 24n * 3600n * 1000000n,
    durationMicros: 24n * 3600n * 1000000n,
    significance: 0.9,
  };
}

describe('NpcReligionModule', () => {
  let deps: RelDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('foundReligion', () => {
    it('should found a new religion', () => {
      const module = createNpcReligionModule(deps);

      const religionId = module.foundReligion('Church of Light', 'npc-1');

      expect(religionId).toBe('id-1');
    });

    it('should reject empty name', () => {
      const module = createNpcReligionModule(deps);

      const result = module.foundReligion('', 'npc-1');

      expect(result).toEqual({ error: 'INVALID_NAME' });
    });

    it('should allow null founder', () => {
      const module = createNpcReligionModule(deps);

      const religionId = module.foundReligion('Ancient Tradition', null);

      expect(religionId).not.toHaveProperty('error');
    });

    it('should initialize follower count to zero', () => {
      const module = createNpcReligionModule(deps);

      const religionId = module.foundReligion('New Faith', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const religion = module.getReligion(religionId);

      if ('error' in religion) {
        throw new Error('Unexpected error');
      }

      expect(religion.followerCount).toBe(0);
    });
  });

  describe('addBelief', () => {
    it('should add belief to religion', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const belief = createTestBelief('belief-1', 'Divine Unity');
      const result = module.addBelief(religionId, belief);

      expect(result).toBe('belief-1');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const belief = createTestBelief('belief-1', 'Lost Doctrine');
      const result = module.addBelief('invalid-id', belief);

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should reject invalid belief strength', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const belief: Belief = {
        ...createTestBelief('belief-1', 'Weak Belief'),
        strength: 1.5,
      };

      const result = module.addBelief(religionId, belief);

      expect(result).toEqual({ error: 'INVALID_BELIEF_STRENGTH' });
    });

    it('should reject duplicate belief ID', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const belief = createTestBelief('belief-1', 'Doctrine');

      module.addBelief(religionId, belief);
      const result = module.addBelief(religionId, belief);

      expect(result).toEqual({ error: 'BELIEF_ALREADY_EXISTS' });
    });
  });

  describe('addRitual', () => {
    it('should add ritual to religion', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Prayer Service');
      const result = module.addRitual(religionId, ritual);

      expect(result).toBe('ritual-1');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const ritual = createTestRitual('ritual-1', 'Lost Rite');
      const result = module.addRitual('invalid-id', ritual);

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should reject invalid frequency', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual: Ritual = {
        ...createTestRitual('ritual-1', 'Invalid Ritual'),
        frequencyMicros: 0n,
      };

      const result = module.addRitual(religionId, ritual);

      expect(result).toEqual({ error: 'INVALID_FREQUENCY' });
    });

    it('should reject duplicate ritual ID', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Ceremony');

      module.addRitual(religionId, ritual);
      const result = module.addRitual(religionId, ritual);

      expect(result).toEqual({ error: 'RITUAL_ALREADY_EXISTS' });
    });
  });

  describe('addHolyDay', () => {
    it('should add holy day to religion', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const holyDay = createTestHolyDay('holy-1', 'Festival of Lights');
      const result = module.addHolyDay(religionId, holyDay);

      expect(result).toBe('holy-1');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const holyDay = createTestHolyDay('holy-1', 'Lost Festival');
      const result = module.addHolyDay('invalid-id', holyDay);

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should reject invalid significance', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const holyDay: HolyDay = {
        ...createTestHolyDay('holy-1', 'Invalid Day'),
        significance: 2.0,
      };

      const result = module.addHolyDay(religionId, holyDay);

      expect(result).toEqual({ error: 'INVALID_SIGNIFICANCE' });
    });

    it('should reject duplicate holy day ID', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const holyDay = createTestHolyDay('holy-1', 'Celebration');

      module.addHolyDay(religionId, holyDay);
      const result = module.addHolyDay(religionId, holyDay);

      expect(result).toEqual({ error: 'HOLY_DAY_ALREADY_EXISTS' });
    });
  });

  describe('createFaction', () => {
    it('should create faction for religion', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const factionId = module.createFaction(religionId, 'Orthodox Order', 'npc-1');

      expect(factionId).not.toHaveProperty('error');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const result = module.createFaction('invalid-id', 'Lost Faction', null);

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should reject empty faction name', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.createFaction(religionId, '', null);

      expect(result).toEqual({ error: 'INVALID_NAME' });
    });

    it('should allow null leader', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const factionId = module.createFaction(religionId, 'Leaderless Sect', null);

      expect(factionId).not.toHaveProperty('error');
    });

    it('should initialize faction with zero members', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const factionId = module.createFaction(religionId, 'New Order', null);

      if (typeof factionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const faction = module.getFaction(factionId);

      if ('error' in faction) {
        throw new Error('Unexpected error');
      }

      expect(faction.memberCount).toBe(0);
    });
  });

  describe('convertNpc', () => {
    it('should convert NPC to religion', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.convertNpc('npc-1', religionId, null, 'Enlightenment');

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.npcId).toBe('npc-1');
    });

    it('should return error for non-existent target religion', () => {
      const module = createNpcReligionModule(deps);

      const result = module.convertNpc('npc-1', 'invalid-id', null, 'Confusion');

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should return error for non-existent source religion', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.convertNpc('npc-1', religionId, 'invalid-from', 'Error');

      expect(result).toEqual({ error: 'FROM_RELIGION_NOT_FOUND' });
    });

    it('should increase target religion follower count', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      module.convertNpc('npc-1', religionId, null, 'Belief');

      const religion = module.getReligion(religionId);

      if ('error' in religion) {
        throw new Error('Unexpected error');
      }

      expect(religion.followerCount).toBe(1);
    });

    it('should decrease source religion follower count', () => {
      const module = createNpcReligionModule(deps);
      const religion1 = module.foundReligion('Old Faith', null);
      const religion2 = module.foundReligion('New Faith', null);

      if (typeof religion1 !== 'string' || typeof religion2 !== 'string') {
        throw new Error('Unexpected error');
      }

      module.convertNpc('npc-1', religion1, null, 'Initial');
      module.convertNpc('npc-1', religion2, religion1, 'Change of heart');

      const oldFaith = module.getReligion(religion1);

      if ('error' in oldFaith) {
        throw new Error('Unexpected error');
      }

      expect(oldFaith.followerCount).toBe(0);
    });
  });

  describe('scheduleRitual', () => {
    it('should schedule ritual', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Prayer');
      module.addRitual(religionId, ritual);

      const result = module.scheduleRitual(religionId, 'ritual-1');

      expect(result).toBe('ritual-1');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const result = module.scheduleRitual('invalid-id', 'ritual-1');

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should return error for non-existent ritual', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.scheduleRitual(religionId, 'invalid-ritual');

      expect(result).toEqual({ error: 'RITUAL_NOT_FOUND' });
    });
  });

  describe('performRitual', () => {
    it('should perform ritual', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Prayer');
      module.addRitual(religionId, ritual);

      const result = module.performRitual('ritual-1', 50);

      expect(result).toBe('ritual-1');
    });

    it('should return error for non-existent ritual', () => {
      const module = createNpcReligionModule(deps);

      const result = module.performRitual('invalid-ritual', 10);

      expect(result).toEqual({ error: 'RITUAL_NOT_FOUND' });
    });

    it('should reject negative participant count', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Prayer');
      module.addRitual(religionId, ritual);

      const result = module.performRitual('ritual-1', -5);

      expect(result).toEqual({ error: 'INVALID_PARTICIPANT_COUNT' });
    });

    it('should update last performed timestamp', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Prayer');
      module.addRitual(religionId, ritual);

      module.performRitual('ritual-1', 25);

      const religion = module.getReligion(religionId);

      if ('error' in religion) {
        throw new Error('Unexpected error');
      }

      const performedRitual = religion.rituals.find((r) => r.ritualId === 'ritual-1');
      expect(performedRitual?.lastPerformedAtMicros).not.toBeNull();
    });

    it('should update participant count', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Prayer');
      module.addRitual(religionId, ritual);

      module.performRitual('ritual-1', 100);

      const religion = module.getReligion(religionId);

      if ('error' in religion) {
        throw new Error('Unexpected error');
      }

      const performedRitual = religion.rituals.find((r) => r.ritualId === 'ritual-1');
      expect(performedRitual?.participantCount).toBe(100);
    });
  });

  describe('measureTension', () => {
    it('should return zero tension for religions without conflict', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);
      const r2 = module.foundReligion('Religion 2', null);

      if (typeof r1 !== 'string' || typeof r2 !== 'string') {
        throw new Error('Unexpected error');
      }

      const tension = module.measureTension(r1, r2);

      expect(tension).toBe(0.0);
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);

      if (typeof r1 !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.measureTension(r1, 'invalid-id');

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should return tension after conflict recorded', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);
      const r2 = module.foundReligion('Religion 2', null);

      if (typeof r1 !== 'string' || typeof r2 !== 'string') {
        throw new Error('Unexpected error');
      }

      module.recordConflict(r1, r2, 0.5);

      const tension = module.measureTension(r1, r2);

      expect(tension).toBe(0.5);
    });

    it('should be symmetric', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);
      const r2 = module.foundReligion('Religion 2', null);

      if (typeof r1 !== 'string' || typeof r2 !== 'string') {
        throw new Error('Unexpected error');
      }

      module.recordConflict(r1, r2, 0.3);

      const tension1 = module.measureTension(r1, r2);
      const tension2 = module.measureTension(r2, r1);

      expect(tension1).toBe(tension2);
    });
  });

  describe('recordConflict', () => {
    it('should record conflict between religions', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);
      const r2 = module.foundReligion('Religion 2', null);

      if (typeof r1 !== 'string' || typeof r2 !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.recordConflict(r1, r2, 0.4);

      expect(result).not.toHaveProperty('error');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);

      if (typeof r1 !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.recordConflict(r1, 'invalid-id', 0.5);

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should reject invalid severity', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);
      const r2 = module.foundReligion('Religion 2', null);

      if (typeof r1 !== 'string' || typeof r2 !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.recordConflict(r1, r2, 1.5);

      expect(result).toEqual({ error: 'INVALID_SEVERITY' });
    });

    it('should accumulate tension', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);
      const r2 = module.foundReligion('Religion 2', null);

      if (typeof r1 !== 'string' || typeof r2 !== 'string') {
        throw new Error('Unexpected error');
      }

      module.recordConflict(r1, r2, 0.2);
      module.recordConflict(r1, r2, 0.3);

      const tension = module.measureTension(r1, r2);

      expect(tension).toBe(0.5);
    });

    it('should cap tension at 1.0', () => {
      const module = createNpcReligionModule(deps);
      const r1 = module.foundReligion('Religion 1', null);
      const r2 = module.foundReligion('Religion 2', null);

      if (typeof r1 !== 'string' || typeof r2 !== 'string') {
        throw new Error('Unexpected error');
      }

      module.recordConflict(r1, r2, 0.8);
      module.recordConflict(r1, r2, 0.8);

      const tension = module.measureTension(r1, r2);

      expect(tension).toBe(1.0);
    });
  });

  describe('getReligionReport', () => {
    it('should return religion report', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.getReligionReport(religionId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.religionId).toBe(religionId);
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const result = module.getReligionReport('invalid-id');

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should count factions', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      module.createFaction(religionId, 'Faction 1', null);
      module.createFaction(religionId, 'Faction 2', null);

      const report = module.getReligionReport(religionId);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.factionCount).toBe(2);
    });

    it('should count active rituals', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const ritual = createTestRitual('ritual-1', 'Prayer');
      module.addRitual(religionId, ritual);
      module.performRitual('ritual-1', 10);

      const report = module.getReligionReport(religionId);

      if ('error' in report) {
        throw new Error('Unexpected error');
      }

      expect(report.activeRituals).toBe(1);
    });
  });

  describe('declareHolyDay', () => {
    it('should declare holy day', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const holyDay = createTestHolyDay('holy-1', 'Festival');
      module.addHolyDay(religionId, holyDay);

      const result = module.declareHolyDay(religionId, 'holy-1');

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.name).toBe('Festival');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const result = module.declareHolyDay('invalid-id', 'holy-1');

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should return error for non-existent holy day', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.declareHolyDay(religionId, 'invalid-holy');

      expect(result).toEqual({ error: 'HOLY_DAY_NOT_FOUND' });
    });
  });

  describe('getReligion', () => {
    it('should return religion', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.getReligion(religionId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.name).toBe('Test Religion');
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const result = module.getReligion('invalid-id');

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });
  });

  describe('getFaction', () => {
    it('should return faction', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const factionId = module.createFaction(religionId, 'Test Faction', null);

      if (typeof factionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.getFaction(factionId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.name).toBe('Test Faction');
    });

    it('should return error for non-existent faction', () => {
      const module = createNpcReligionModule(deps);

      const result = module.getFaction('invalid-id');

      expect(result).toEqual({ error: 'FACTION_NOT_FOUND' });
    });
  });

  describe('updateFollowerCount', () => {
    it('should update follower count', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.updateFollowerCount(religionId, 100);

      expect(result).toBe(100);
    });

    it('should return error for non-existent religion', () => {
      const module = createNpcReligionModule(deps);

      const result = module.updateFollowerCount('invalid-id', 50);

      expect(result).toEqual({ error: 'RELIGION_NOT_FOUND' });
    });

    it('should allow negative deltas', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      module.updateFollowerCount(religionId, 100);
      const result = module.updateFollowerCount(religionId, -30);

      expect(result).toBe(70);
    });

    it('should not allow negative follower count', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.updateFollowerCount(religionId, -50);

      expect(result).toBe(0);
    });
  });

  describe('belief categories', () => {
    it('should support doctrine category', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const belief = createTestBelief('b1', 'Core Doctrine');
      module.addBelief(religionId, belief);

      const religion = module.getReligion(religionId);

      if ('error' in religion) {
        throw new Error('Unexpected error');
      }

      expect(religion.beliefs[0]?.category).toBe('doctrine');
    });

    it('should support varying belief strengths', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const weakBelief: Belief = {
        ...createTestBelief('b1', 'Weak Belief'),
        strength: 0.2,
      };

      const strongBelief: Belief = {
        ...createTestBelief('b2', 'Strong Belief'),
        strength: 1.0,
      };

      module.addBelief(religionId, weakBelief);
      module.addBelief(religionId, strongBelief);

      const religion = module.getReligion(religionId);

      if ('error' in religion) {
        throw new Error('Unexpected error');
      }

      expect(religion.beliefs).toHaveLength(2);
    });
  });

  describe('faction orthodoxy', () => {
    it('should initialize orthodoxy at 0.5', () => {
      const module = createNpcReligionModule(deps);
      const religionId = module.foundReligion('Test Religion', null);

      if (typeof religionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const factionId = module.createFaction(religionId, 'Moderate Faction', null);

      if (typeof factionId !== 'string') {
        throw new Error('Unexpected error');
      }

      const faction = module.getFaction(factionId);

      if ('error' in faction) {
        throw new Error('Unexpected error');
      }

      expect(faction.orthodoxy).toBe(0.5);
    });
  });
});
