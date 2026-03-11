import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBiographyState,
  createBiography,
  recordLifeEvent,
  recordDeath,
  addRelationship,
  endRelationship,
  computeLegacy,
  getReputationArc,
  getLifeTimeline,
  queryRelationships,
  getBiography,
  getAllBiographies,
  getLivingCharacters,
  getDeceasedCharacters,
  getEvent,
  getAllEvents,
  getEventsByType,
  getRelationship,
  getAllRelationships,
  getActiveRelationships,
  getEndedRelationships,
  getBiographyCount,
  getEventCount,
  getRelationshipCount,
  getCharactersByReputation,
  getTopLegacies,
  getRecentEvents,
  getEventsInRange,
  getRelatedCharacters,
  getEventsAtLocation,
  getMutualRelationships,
  type CharacterBiographyState,
  type Clock,
  type IdGenerator,
  type Logger,
} from '../character-biography.js';

// Test Doubles
class TestClock implements Clock {
  private time = 1000000n;

  now(): bigint {
    return this.time;
  }

  advance(delta: bigint): void {
    this.time = this.time + delta;
  }

  set(time: bigint): void {
    this.time = time;
  }
}

class TestIdGenerator implements IdGenerator {
  private counter = 0;

  generate(): string {
    this.counter = this.counter + 1;
    return 'id-' + String(this.counter);
  }

  reset(): void {
    this.counter = 0;
  }
}

class TestLogger implements Logger {
  logs: string[] = [];
  warnings: string[] = [];
  errors: string[] = [];

  info(message: string): void {
    this.logs.push(message);
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  error(message: string): void {
    this.errors.push(message);
  }

  clear(): void {
    this.logs = [];
    this.warnings = [];
    this.errors = [];
  }
}

describe('Character Biography', () => {
  let state: CharacterBiographyState;
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    state = createBiographyState();
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('createBiographyState', () => {
    it('creates empty state', () => {
      expect(state.biographies.size).toBe(0);
      expect(state.events.size).toBe(0);
      expect(state.relationships.size).toBe(0);
      expect(state.reputationArcs.size).toBe(0);
    });
  });

  describe('createBiography', () => {
    it('creates biography with valid parameters', () => {
      const result = createBiography(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'Aria Stellan',
        20n,
        'Earth',
      );

      expect(result).toBe('success');
      expect(state.biographies.size).toBe(1);
    });

    it('creates biography with correct properties', () => {
      createBiography(state, clock, idGen, logger, 'char-alpha', 'Commander Vale', 30n, 'Mars');

      const bio = state.biographies.get('char-alpha');
      expect(bio).toBeDefined();
      if (bio === undefined) return;

      expect(bio.characterId).toBe('char-alpha');
      expect(bio.name).toBe('Commander Vale');
      expect(bio.bornAt).toBe(1000000n);
      expect(bio.currentReputation).toBe(30n);
      expect(bio.totalEvents).toBe(1);
      expect(bio.diedAt).toBeUndefined();
      expect(bio.legacyScore).toBeUndefined();
    });

    it('creates birth event', () => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Test Character', 0n);

      expect(state.events.size).toBe(1);

      const events = Array.from(state.events.values());
      const event = events[0];
      expect(event?.eventType).toBe('BIRTH');
      expect(event?.reputationChange).toBe(0n);
    });

    it('creates reputation arc', () => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Test', 25n);

      const arc = state.reputationArcs.get('char-1');
      expect(arc).toBeDefined();
      expect(arc?.length).toBe(1);
      expect(arc?.[0]?.reputation).toBe(25n);
    });

    it('rejects duplicate character ID', () => {
      createBiography(state, clock, idGen, logger, 'char-1', 'First', 0n);

      const result = createBiography(state, clock, idGen, logger, 'char-1', 'Second', 0n);

      expect(result).toBe('character-exists');
      expect(state.biographies.size).toBe(1);
    });

    it('rejects invalid reputation below -100', () => {
      const result = createBiography(state, clock, idGen, logger, 'char-1', 'Invalid', -150n);

      expect(result).toBe('invalid-reputation');
    });

    it('rejects invalid reputation above 100', () => {
      const result = createBiography(state, clock, idGen, logger, 'char-1', 'Invalid', 150n);

      expect(result).toBe('invalid-reputation');
    });

    it('logs biography creation', () => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Hero Name', 0n);

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('Hero Name');
    });

    it('accepts negative reputation within range', () => {
      const result = createBiography(state, clock, idGen, logger, 'char-1', 'Villain', -50n);

      expect(result).toBe('success');

      const bio = state.biographies.get('char-1');
      expect(bio?.currentReputation).toBe(-50n);
    });
  });

  describe('recordLifeEvent', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Test Character', 0n);
    });

    it('records event for character', () => {
      const result = recordLifeEvent(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'ACHIEVEMENT',
        'Won a major battle',
        15n,
        'Battlefield Seven',
      );

      expect(result).toBe('id-2');
      expect(state.events.size).toBe(2);
    });

    it('creates event with correct properties', () => {
      const eventId = recordLifeEvent(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'MARRIAGE',
        'Married to noble family',
        10n,
        'Capital City',
      ) as string;

      const event = state.events.get(eventId);
      expect(event).toBeDefined();
      if (event === undefined) return;

      expect(event.characterId).toBe('char-1');
      expect(event.eventType).toBe('MARRIAGE');
      expect(event.description).toBe('Married to noble family');
      expect(event.reputationChange).toBe(10n);
      expect(event.location).toBe('Capital City');
    });

    it('updates character reputation', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 20n);

      const bio = state.biographies.get('char-1');
      expect(bio?.currentReputation).toBe(20n);
    });

    it('caps reputation at 100', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 150n);

      const bio = state.biographies.get('char-1');
      expect(bio?.currentReputation).toBe(100n);
    });

    it('floors reputation at -100', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'BETRAYAL', 'Test', -150n);

      const bio = state.biographies.get('char-1');
      expect(bio?.currentReputation).toBe(-100n);
    });

    it('increments total events', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 5n);

      const bio = state.biographies.get('char-1');
      expect(bio?.totalEvents).toBe(2);
    });

    it('adds to reputation arc', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 15n);

      const arc = state.reputationArcs.get('char-1');
      expect(arc?.length).toBe(2);
      expect(arc?.[1]?.reputation).toBe(15n);
    });

    it('returns error for nonexistent character', () => {
      const result = recordLifeEvent(
        state,
        clock,
        idGen,
        logger,
        'fake-char',
        'ACHIEVEMENT',
        'Test',
        0n,
      );

      expect(result).toBe('character-not-found');
    });

    it('returns error for deceased character', () => {
      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      const result = recordLifeEvent(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'ACHIEVEMENT',
        'Test',
        0n,
      );

      expect(result).toBe('already-deceased');
    });

    it('logs event recording', () => {
      logger.clear();

      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'CORONATION', 'Test', 0n);

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('CORONATION');
    });
  });

  describe('recordDeath', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Mortal Character', 50n);
    });

    it('records character death', () => {
      const result = recordDeath(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'Died in battle',
        'Frontier',
      );

      expect(result).toBe('success');
    });

    it('marks character as deceased', () => {
      recordDeath(state, clock, idGen, logger, 'char-1', 'Natural causes');

      const bio = state.biographies.get('char-1');
      expect(bio?.diedAt).toBeDefined();
    });

    it('creates death event', () => {
      const eventsBefore = state.events.size;

      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      expect(state.events.size).toBeGreaterThan(eventsBefore);

      const events = Array.from(state.events.values());
      const deathEvent = events.find((e) => e.eventType === 'DEATH');

      expect(deathEvent).toBeDefined();
    });

    it('calculates legacy score', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 10n);

      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      const bio = state.biographies.get('char-1');
      expect(bio?.legacyScore).toBeDefined();
      expect(bio?.legacyScore).toBeGreaterThan(0n);
    });

    it('ends all relationships', () => {
      createBiography(state, clock, idGen, logger, 'char-2', 'Other', 0n);

      addRelationship(state, clock, idGen, logger, 'char-1', 'char-2', 'ALLY', 'Test');

      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      const relationships = Array.from(state.relationships.values());
      const rel = relationships.find((r) => r.characterId === 'char-1');

      expect(rel?.endedAt).toBeDefined();
    });

    it('returns error for nonexistent character', () => {
      const result = recordDeath(state, clock, idGen, logger, 'fake-char', 'Test');

      expect(result).toBe('character-not-found');
    });

    it('returns error for already deceased character', () => {
      recordDeath(state, clock, idGen, logger, 'char-1', 'First');

      const result = recordDeath(state, clock, idGen, logger, 'char-1', 'Second');

      expect(result).toBe('already-deceased');
    });

    it('logs death warning', () => {
      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      expect(logger.warnings.length).toBe(1);
    });
  });

  describe('addRelationship', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Character One', 0n);

      createBiography(state, clock, idGen, logger, 'char-2', 'Character Two', 0n);
    });

    it('adds relationship between characters', () => {
      const result = addRelationship(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'char-2',
        'ALLY',
        'Political alliance',
      );

      expect(result).toBe('id-3');
      expect(state.relationships.size).toBe(1);
    });

    it('creates relationship with correct properties', () => {
      const relId = addRelationship(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'char-2',
        'MENTOR',
        'Trained under tutelage',
      ) as string;

      const rel = state.relationships.get(relId);
      expect(rel).toBeDefined();
      if (rel === undefined) return;

      expect(rel.characterId).toBe('char-1');
      expect(rel.relatedCharacterId).toBe('char-2');
      expect(rel.relationshipType).toBe('MENTOR');
      expect(rel.notes).toBe('Trained under tutelage');
      expect(rel.establishedAt).toBe(clock.now());
      expect(rel.endedAt).toBeUndefined();
    });

    it('returns error for nonexistent primary character', () => {
      const result = addRelationship(
        state,
        clock,
        idGen,
        logger,
        'fake-char',
        'char-2',
        'ALLY',
        'Test',
      );

      expect(result).toBe('character-not-found');
    });

    it('returns error for nonexistent related character', () => {
      const result = addRelationship(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'fake-char',
        'ALLY',
        'Test',
      );

      expect(result).toBe('character-not-found');
    });

    it('logs relationship addition', () => {
      logger.clear();

      addRelationship(state, clock, idGen, logger, 'char-1', 'char-2', 'ALLY', 'Test');

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('char-1');
      expect(logger.logs[0]).toContain('char-2');
    });
  });

  describe('endRelationship', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'One', 0n);

      createBiography(state, clock, idGen, logger, 'char-2', 'Two', 0n);

      addRelationship(state, clock, idGen, logger, 'char-1', 'char-2', 'ALLY', 'Test');
    });

    it('ends active relationship', () => {
      const relId = Array.from(state.relationships.keys())[0];
      if (relId === undefined) return;

      const result = endRelationship(state, clock, logger, relId);

      expect(result).toBe('success');
    });

    it('marks relationship as ended', () => {
      const relId = Array.from(state.relationships.keys())[0];
      if (relId === undefined) return;

      endRelationship(state, clock, logger, relId);

      const rel = state.relationships.get(relId);
      expect(rel?.endedAt).toBeDefined();
    });

    it('returns error for nonexistent relationship', () => {
      const result = endRelationship(state, clock, logger, 'fake-rel');

      expect(result).toBe('relationship-not-found');
    });

    it('returns error for already ended relationship', () => {
      const relId = Array.from(state.relationships.keys())[0];
      if (relId === undefined) return;

      endRelationship(state, clock, logger, relId);

      const result = endRelationship(state, clock, logger, relId);

      expect(result).toBe('relationship-not-found');
    });

    it('logs relationship end', () => {
      const relId = Array.from(state.relationships.keys())[0];
      if (relId === undefined) return;

      logger.clear();

      endRelationship(state, clock, logger, relId);

      expect(logger.logs.length).toBe(1);
    });
  });

  describe('computeLegacy', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Legacy Hero', 50n);
    });

    it('computes legacy score for deceased character', () => {
      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      const result = computeLegacy(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      expect(result).not.toBe('not-deceased');
      if (typeof result === 'string') return;

      expect(result.characterId).toBe('char-1');
      expect(result.totalScore).toBeGreaterThan(0n);
    });

    it('includes achievements in score', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 10n);

      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'CORONATION', 'Test', 15n);

      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      const result = computeLegacy(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      expect(result).not.toBe('not-deceased');
      if (typeof result === 'string') return;

      expect(result.achievements).toBe(2);
    });

    it('tracks peak reputation', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 40n);

      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'BETRAYAL', 'Test', -30n);

      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      const result = computeLegacy(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      expect(result).not.toBe('not-deceased');
      if (typeof result === 'string') return;

      expect(result.peakReputation).toBe(90n);
    });

    it('includes relationship count', () => {
      createBiography(state, clock, idGen, logger, 'char-2', 'Other', 0n);

      addRelationship(state, clock, idGen, logger, 'char-1', 'char-2', 'ALLY', 'Test');

      recordDeath(state, clock, idGen, logger, 'char-1', 'Test');

      const result = computeLegacy(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      expect(result).not.toBe('not-deceased');
      if (typeof result === 'string') return;

      expect(result.relationships).toBe(1);
    });

    it('returns error for nonexistent character', () => {
      const result = computeLegacy(state, 'fake-char');

      expect(result).toBe('character-not-found');
    });

    it('returns error for living character', () => {
      const result = computeLegacy(state, 'char-1');

      expect(result).toBe('not-deceased');
    });
  });

  describe('getReputationArc', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Test', 0n);
    });

    it('returns reputation arc for character', () => {
      const result = getReputationArc(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      if (typeof result === 'string') return;

      expect(result.characterId).toBe('char-1');
      expect(result.dataPoints.length).toBe(1);
    });

    it('includes all reputation data points', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 20n);

      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'BETRAYAL', 'Test', -10n);

      const result = getReputationArc(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      if (typeof result === 'string') return;

      expect(result.dataPoints.length).toBe(3);
    });

    it('returns error for nonexistent character', () => {
      const result = getReputationArc(state, 'fake-char');

      expect(result).toBe('character-not-found');
    });
  });

  describe('getLifeTimeline', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Test', 0n);
    });

    it('returns chronological life events', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'First', 5n);

      clock.advance(100000n);

      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'MARRIAGE', 'Second', 10n);

      const result = getLifeTimeline(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      if (typeof result === 'string') return;

      expect(result.length).toBe(3);
      expect(result[0]?.eventType).toBe('BIRTH');
      expect(result[1]?.eventType).toBe('ACHIEVEMENT');
      expect(result[2]?.eventType).toBe('MARRIAGE');
    });

    it('returns error for nonexistent character', () => {
      const result = getLifeTimeline(state, 'fake-char');

      expect(result).toBe('character-not-found');
    });
  });

  describe('queryRelationships', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'One', 0n);

      createBiography(state, clock, idGen, logger, 'char-2', 'Two', 0n);

      createBiography(state, clock, idGen, logger, 'char-3', 'Three', 0n);
    });

    it('returns all relationships for character', () => {
      addRelationship(state, clock, idGen, logger, 'char-1', 'char-2', 'ALLY', 'Test');

      addRelationship(state, clock, idGen, logger, 'char-1', 'char-3', 'ENEMY', 'Test');

      const rels = queryRelationships(state, 'char-1');

      expect(rels.length).toBe(2);
    });

    it('filters by relationship type', () => {
      addRelationship(state, clock, idGen, logger, 'char-1', 'char-2', 'ALLY', 'Test');

      addRelationship(state, clock, idGen, logger, 'char-1', 'char-3', 'ENEMY', 'Test');

      const allies = queryRelationships(state, 'char-1', 'ALLY');

      expect(allies.length).toBe(1);
      expect(allies[0]?.relationshipType).toBe('ALLY');
    });

    it('returns empty array for character with no relationships', () => {
      const rels = queryRelationships(state, 'char-1');

      expect(rels.length).toBe(0);
    });
  });

  describe('query functions', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'char-1', 'Living One', 30n);

      createBiography(state, clock, idGen, logger, 'char-2', 'Living Two', 50n);
    });

    it('getBiography returns biography by ID', () => {
      const result = getBiography(state, 'char-1');

      expect(result).not.toBe('character-not-found');
      if (typeof result === 'string') return;

      expect(result.characterId).toBe('char-1');
    });

    it('getAllBiographies returns all biographies', () => {
      const bios = getAllBiographies(state);

      expect(bios.length).toBe(2);
    });

    it('getLivingCharacters filters deceased characters', () => {
      recordDeath(state, clock, idGen, logger, 'char-2', 'Test');

      const living = getLivingCharacters(state);

      expect(living.length).toBe(1);
      expect(living[0]?.characterId).toBe('char-1');
    });

    it('getDeceasedCharacters returns only deceased', () => {
      recordDeath(state, clock, idGen, logger, 'char-2', 'Test');

      const deceased = getDeceasedCharacters(state);

      expect(deceased.length).toBe(1);
      expect(deceased[0]?.characterId).toBe('char-2');
    });

    it('getEvent returns event by ID', () => {
      const events = Array.from(state.events.keys());
      const eventId = events[0];
      if (eventId === undefined) return;

      const result = getEvent(state, eventId);

      expect(result).not.toBe('event-not-found');
      if (typeof result === 'string') return;

      expect(result.id).toBe(eventId);
    });

    it('getAllEvents returns all events', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 0n);

      const events = getAllEvents(state);

      expect(events.length).toBe(3);
    });

    it('getEventsByType filters by type', () => {
      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'ACHIEVEMENT', 'Test', 0n);

      recordLifeEvent(state, clock, idGen, logger, 'char-1', 'MARRIAGE', 'Test', 0n);

      const achievements = getEventsByType(state, 'ACHIEVEMENT');

      expect(achievements.length).toBe(1);
    });

    it('getAllRelationships returns all relationships', () => {
      addRelationship(state, clock, idGen, logger, 'char-1', 'char-2', 'ALLY', 'Test');

      const rels = getAllRelationships(state);

      expect(rels.length).toBe(1);
    });

    it('getActiveRelationships filters ended relationships', () => {
      const relId = addRelationship(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'char-2',
        'ALLY',
        'Test',
      ) as string;

      endRelationship(state, clock, logger, relId);

      const active = getActiveRelationships(state);

      expect(active.length).toBe(0);
    });

    it('getEndedRelationships returns only ended', () => {
      const relId = addRelationship(
        state,
        clock,
        idGen,
        logger,
        'char-1',
        'char-2',
        'ALLY',
        'Test',
      ) as string;

      endRelationship(state, clock, logger, relId);

      const ended = getEndedRelationships(state);

      expect(ended.length).toBe(1);
    });
  });

  describe('counters', () => {
    it('getBiographyCount returns biography count', () => {
      createBiography(state, clock, idGen, logger, 'c1', 'One', 0n);
      createBiography(state, clock, idGen, logger, 'c2', 'Two', 0n);

      expect(getBiographyCount(state)).toBe(2);
    });

    it('getEventCount returns event count', () => {
      createBiography(state, clock, idGen, logger, 'c1', 'One', 0n);

      expect(getEventCount(state)).toBe(1);
    });

    it('getRelationshipCount returns relationship count', () => {
      createBiography(state, clock, idGen, logger, 'c1', 'One', 0n);
      createBiography(state, clock, idGen, logger, 'c2', 'Two', 0n);

      addRelationship(state, clock, idGen, logger, 'c1', 'c2', 'ALLY', 'Test');

      expect(getRelationshipCount(state)).toBe(1);
    });
  });

  describe('getCharactersByReputation', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'c1', 'Low', -20n);
      createBiography(state, clock, idGen, logger, 'c2', 'Medium', 30n);
      createBiography(state, clock, idGen, logger, 'c3', 'High', 70n);
    });

    it('returns characters above threshold', () => {
      const chars = getCharactersByReputation(state, 30n);

      expect(chars.length).toBe(2);
    });

    it('includes characters at exact threshold', () => {
      const chars = getCharactersByReputation(state, 30n);

      const ids = chars.map((c) => c.characterId);
      expect(ids).toContain('c2');
    });

    it('excludes characters below threshold', () => {
      const chars = getCharactersByReputation(state, 30n);

      const ids = chars.map((c) => c.characterId);
      expect(ids).not.toContain('c1');
    });
  });

  describe('getTopLegacies', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'c1', 'Low', 10n);
      createBiography(state, clock, idGen, logger, 'c2', 'Medium', 30n);
      createBiography(state, clock, idGen, logger, 'c3', 'High', 60n);

      recordLifeEvent(state, clock, idGen, logger, 'c2', 'ACHIEVEMENT', 'Test', 10n);
      recordLifeEvent(state, clock, idGen, logger, 'c3', 'ACHIEVEMENT', 'Test', 10n);
      recordLifeEvent(state, clock, idGen, logger, 'c3', 'CORONATION', 'Test', 10n);

      recordDeath(state, clock, idGen, logger, 'c1', 'Test');
      recordDeath(state, clock, idGen, logger, 'c2', 'Test');
      recordDeath(state, clock, idGen, logger, 'c3', 'Test');
    });

    it('returns top characters by legacy score', () => {
      const top = getTopLegacies(state, 2);

      expect(top.length).toBe(2);
      expect(top[0]?.characterId).toBe('c3');
    });

    it('limits results to specified count', () => {
      const top = getTopLegacies(state, 1);

      expect(top.length).toBe(1);
    });

    it('excludes living characters', () => {
      createBiography(state, clock, idGen, logger, 'c4', 'Living', 80n);

      const top = getTopLegacies(state, 10);

      const ids = top.map((c) => c.characterId);
      expect(ids).not.toContain('c4');
    });
  });

  describe('getRecentEvents', () => {
    it('returns events since timestamp', () => {
      createBiography(state, clock, idGen, logger, 'c1', 'Test', 0n);

      clock.advance(1000000n);

      recordLifeEvent(state, clock, idGen, logger, 'c1', 'ACHIEVEMENT', 'Test', 0n);

      const recent = getRecentEvents(state, 1500000n);

      expect(recent.length).toBe(1);
    });
  });

  describe('getEventsInRange', () => {
    it('returns events within time range', () => {
      createBiography(state, clock, idGen, logger, 'c1', 'Test', 0n);

      clock.advance(500000n);

      recordLifeEvent(state, clock, idGen, logger, 'c1', 'ACHIEVEMENT', 'Test', 0n);

      clock.advance(500000n);

      recordLifeEvent(state, clock, idGen, logger, 'c1', 'MARRIAGE', 'Test', 0n);

      const events = getEventsInRange(state, 1000000n, 1500000n);

      expect(events.length).toBe(2);
    });
  });

  describe('getRelatedCharacters', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'c1', 'One', 0n);
      createBiography(state, clock, idGen, logger, 'c2', 'Two', 0n);
      createBiography(state, clock, idGen, logger, 'c3', 'Three', 0n);
    });

    it('returns characters with relationships', () => {
      addRelationship(state, clock, idGen, logger, 'c1', 'c2', 'ALLY', 'Test');
      addRelationship(state, clock, idGen, logger, 'c1', 'c3', 'ENEMY', 'Test');

      const related = getRelatedCharacters(state, 'c1');

      expect(related.length).toBe(2);
      expect(related).toContain('c2');
      expect(related).toContain('c3');
    });

    it('returns empty array for character with no relationships', () => {
      const related = getRelatedCharacters(state, 'c1');

      expect(related.length).toBe(0);
    });

    it('works for either side of relationship', () => {
      addRelationship(state, clock, idGen, logger, 'c1', 'c2', 'ALLY', 'Test');

      const related = getRelatedCharacters(state, 'c2');

      expect(related).toContain('c1');
    });
  });

  describe('getEventsAtLocation', () => {
    it('returns events at specific location', () => {
      createBiography(state, clock, idGen, logger, 'c1', 'Test', 0n, 'Earth');

      recordLifeEvent(state, clock, idGen, logger, 'c1', 'ACHIEVEMENT', 'Test', 0n, 'Mars');

      recordLifeEvent(state, clock, idGen, logger, 'c1', 'MARRIAGE', 'Test', 0n, 'Earth');

      const events = getEventsAtLocation(state, 'Earth');

      expect(events.length).toBe(2);
    });

    it('returns empty array for location with no events', () => {
      const events = getEventsAtLocation(state, 'Unknown');

      expect(events.length).toBe(0);
    });
  });

  describe('getMutualRelationships', () => {
    beforeEach(() => {
      createBiography(state, clock, idGen, logger, 'c1', 'One', 0n);
      createBiography(state, clock, idGen, logger, 'c2', 'Two', 0n);
      createBiography(state, clock, idGen, logger, 'c3', 'Three', 0n);
    });

    it('returns relationships between two characters', () => {
      addRelationship(state, clock, idGen, logger, 'c1', 'c2', 'ALLY', 'Test');
      addRelationship(state, clock, idGen, logger, 'c2', 'c1', 'ALLY', 'Test');

      const mutual = getMutualRelationships(state, 'c1', 'c2');

      expect(mutual.length).toBe(2);
    });

    it('works in either direction', () => {
      addRelationship(state, clock, idGen, logger, 'c1', 'c2', 'ALLY', 'Test');

      const mutual1 = getMutualRelationships(state, 'c1', 'c2');
      const mutual2 = getMutualRelationships(state, 'c2', 'c1');

      expect(mutual1.length).toBe(1);
      expect(mutual2.length).toBe(1);
    });

    it('excludes relationships with other characters', () => {
      addRelationship(state, clock, idGen, logger, 'c1', 'c2', 'ALLY', 'Test');
      addRelationship(state, clock, idGen, logger, 'c1', 'c3', 'ENEMY', 'Test');

      const mutual = getMutualRelationships(state, 'c1', 'c2');

      expect(mutual.length).toBe(1);
    });
  });

  describe('getRelationship', () => {
    it('returns relationship by ID', () => {
      createBiography(state, clock, idGen, logger, 'c1', 'One', 0n);
      createBiography(state, clock, idGen, logger, 'c2', 'Two', 0n);

      const relId = addRelationship(
        state,
        clock,
        idGen,
        logger,
        'c1',
        'c2',
        'ALLY',
        'Test',
      ) as string;

      const result = getRelationship(state, relId);

      expect(result).not.toBe('relationship-not-found');
      if (typeof result === 'string') return;

      expect(result.id).toBe(relId);
    });

    it('returns error for nonexistent relationship', () => {
      const result = getRelationship(state, 'fake-id');

      expect(result).toBe('relationship-not-found');
    });
  });
});
