import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFactionHistoryState,
  recordFounding,
  recordEvent,
  recordAlliance,
  breakAlliance,
  recordDissolution,
  getInfluenceTimeline,
  queryByEra,
  defineEra,
  computeLegacyScore,
  getFactionHistory,
  getAllFactions,
  getActiveFactions,
  getDissolvedFactions,
  getEvent,
  getAllEvents,
  getEventsByType,
  getAlliance,
  getAllAlliances,
  getActiveAlliances,
  getBrokenAlliances,
  getAllEras,
  getEra,
  getFactionCount,
  getEventCount,
  getAllianceCount,
  getEraCount,
  getFactionsByInfluence,
  getTopFactions,
  getRecentEvents,
  getEventsInRange,
  getRelatedFactions,
  type FactionHistoryState,
  type Clock,
  type IdGenerator,
  type Logger,
} from '../faction-history.js';

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

describe('Faction History', () => {
  let state: FactionHistoryState;
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    state = createFactionHistoryState();
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('createFactionHistoryState', () => {
    it('creates empty state', () => {
      expect(state.factions.size).toBe(0);
      expect(state.events.size).toBe(0);
      expect(state.alliances.size).toBe(0);
      expect(state.eras.length).toBe(0);
      expect(state.influenceTimelines.size).toBe(0);
    });
  });

  describe('recordFounding', () => {
    it('records faction founding', () => {
      const result = recordFounding(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'The Iron Guild',
        50n,
        ['founder-1', 'founder-2'],
      );

      expect(result).toBe('success');
      expect(state.factions.size).toBe(1);
    });

    it('creates faction with correct properties', () => {
      recordFounding(state, clock, idGen, logger, 'faction-alpha', 'The Void Collective', 60n, [
        'founder-1',
      ]);

      const faction = state.factions.get('faction-alpha');
      expect(faction).toBeDefined();
      if (faction === undefined) return;

      expect(faction.factionId).toBe('faction-alpha');
      expect(faction.name).toBe('The Void Collective');
      expect(faction.foundedAt).toBe(1000000n);
      expect(faction.currentInfluence).toBe(60n);
      expect(faction.totalEvents).toBe(1);
      expect(faction.dissolvedAt).toBeUndefined();
    });

    it('creates founding event', () => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'The Ascendancy', 40n, [
        'founder-1',
      ]);

      expect(state.events.size).toBe(1);

      const events = Array.from(state.events.values());
      const event = events[0];
      expect(event?.eventType).toBe('FOUNDING');
      expect(event?.influenceChange).toBe(40n);
    });

    it('creates influence timeline', () => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'The Ascendancy', 40n, [
        'founder-1',
      ]);

      const timeline = state.influenceTimelines.get('faction-1');
      expect(timeline).toBeDefined();
      expect(timeline?.length).toBe(1);
      expect(timeline?.[0]?.influence).toBe(40n);
    });

    it('rejects duplicate faction ID', () => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'First', 50n, []);

      const result = recordFounding(state, clock, idGen, logger, 'faction-1', 'Second', 50n, []);

      expect(result).toBe('faction-exists');
      expect(state.factions.size).toBe(1);
    });

    it('rejects invalid influence below zero', () => {
      const result = recordFounding(state, clock, idGen, logger, 'faction-1', 'Invalid', -10n, []);

      expect(result).toBe('invalid-influence');
    });

    it('rejects invalid influence above 100', () => {
      const result = recordFounding(state, clock, idGen, logger, 'faction-1', 'Invalid', 150n, []);

      expect(result).toBe('invalid-influence');
    });

    it('logs founding', () => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'The Nexus', 50n, []);

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('The Nexus');
    });
  });

  describe('recordEvent', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'The Iron Guild', 50n, []);
    });

    it('records event for faction', () => {
      const result = recordEvent(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'WAR_DECLARED',
        'War declared on neighboring faction',
        -5n,
        ['faction-2'],
      );

      expect(result).toBe('id-2');
      expect(state.events.size).toBe(2);
    });

    it('creates event with correct properties', () => {
      const eventId = recordEvent(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'TERRITORY_GAINED',
        'Captured strategic outpost',
        10n,
        ['world-7'],
      ) as string;

      const event = state.events.get(eventId);
      expect(event).toBeDefined();
      if (event === undefined) return;

      expect(event.factionId).toBe('faction-1');
      expect(event.eventType).toBe('TERRITORY_GAINED');
      expect(event.description).toBe('Captured strategic outpost');
      expect(event.influenceChange).toBe(10n);
      expect(event.participants.length).toBe(1);
    });

    it('updates faction influence', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'TERRITORY_GAINED', 'Test', 15n, []);

      const faction = state.factions.get('faction-1');
      expect(faction?.currentInfluence).toBe(65n);
    });

    it('caps influence at 100', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'MEMBER_PEAK', 'Test', 60n, []);

      const faction = state.factions.get('faction-1');
      expect(faction?.currentInfluence).toBe(100n);
    });

    it('floors influence at 0', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_LOST', 'Test', -60n, []);

      const faction = state.factions.get('faction-1');
      expect(faction?.currentInfluence).toBe(0n);
    });

    it('increments total events', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'TREATY_SIGNED', 'Test', 5n, []);

      const faction = state.factions.get('faction-1');
      expect(faction?.totalEvents).toBe(2);
    });

    it('adds to influence timeline', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'TERRITORY_GAINED', 'Test', 10n, []);

      const timeline = state.influenceTimelines.get('faction-1');
      expect(timeline?.length).toBe(2);
      expect(timeline?.[1]?.influence).toBe(60n);
    });

    it('returns error for nonexistent faction', () => {
      const result = recordEvent(
        state,
        clock,
        idGen,
        logger,
        'fake-faction',
        'WAR_DECLARED',
        'Test',
        0n,
        [],
      );

      expect(result).toBe('faction-not-found');
    });

    it('returns error for dissolved faction', () => {
      recordDissolution(state, clock, idGen, logger, 'faction-1', 'Test');

      const result = recordEvent(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'WAR_DECLARED',
        'Test',
        0n,
        [],
      );

      expect(result).toBe('already-dissolved');
    });

    it('logs event recording', () => {
      logger.clear();

      recordEvent(state, clock, idGen, logger, 'faction-1', 'LEADER_CHANGE', 'Test', 0n, []);

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('LEADER_CHANGE');
    });
  });

  describe('recordAlliance', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'The Iron Guild', 50n, []);

      recordFounding(state, clock, idGen, logger, 'faction-2', 'The Star Collective', 45n, []);
    });

    it('records alliance between factions', () => {
      const result = recordAlliance(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'faction-2',
        'Mutual defense pact',
      );

      expect(result).toBe('id-3');
      expect(state.alliances.size).toBe(1);
    });

    it('creates alliance with correct properties', () => {
      const allianceId = recordAlliance(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'faction-2',
        'Trade agreement',
      ) as string;

      const alliance = state.alliances.get(allianceId);
      expect(alliance).toBeDefined();
      if (alliance === undefined) return;

      expect(alliance.faction1Id).toBe('faction-1');
      expect(alliance.faction2Id).toBe('faction-2');
      expect(alliance.reason).toBe('Trade agreement');
      expect(alliance.formedAt).toBe(clock.now());
      expect(alliance.brokenAt).toBeUndefined();
    });

    it('creates events for both factions', () => {
      const eventsBefore = state.events.size;

      recordAlliance(state, clock, idGen, logger, 'faction-1', 'faction-2', 'Test');

      expect(state.events.size).toBe(eventsBefore + 2);
    });

    it('increases influence for both factions', () => {
      recordAlliance(state, clock, idGen, logger, 'faction-1', 'faction-2', 'Test');

      const faction1 = state.factions.get('faction-1');
      const faction2 = state.factions.get('faction-2');

      expect(faction1?.currentInfluence).toBe(55n);
      expect(faction2?.currentInfluence).toBe(50n);
    });

    it('returns error for nonexistent faction1', () => {
      const result = recordAlliance(
        state,
        clock,
        idGen,
        logger,
        'fake-faction',
        'faction-2',
        'Test',
      );

      expect(result).toBe('faction-not-found');
    });

    it('returns error for nonexistent faction2', () => {
      const result = recordAlliance(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'fake-faction',
        'Test',
      );

      expect(result).toBe('faction-not-found');
    });

    it('logs alliance formation', () => {
      logger.clear();

      recordAlliance(state, clock, idGen, logger, 'faction-1', 'faction-2', 'Test');

      expect(logger.logs.length).toBeGreaterThan(0);
    });
  });

  describe('breakAlliance', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'The Iron Guild', 50n, []);

      recordFounding(state, clock, idGen, logger, 'faction-2', 'The Star Collective', 45n, []);

      recordAlliance(state, clock, idGen, logger, 'faction-1', 'faction-2', 'Test');
    });

    it('breaks active alliance', () => {
      const allianceId = Array.from(state.alliances.keys())[0];
      if (allianceId === undefined) return;

      const result = breakAlliance(
        state,
        clock,
        idGen,
        logger,
        allianceId,
        'Disagreement over territory',
      );

      expect(result).toBe('success');
    });

    it('marks alliance as broken', () => {
      const allianceId = Array.from(state.alliances.keys())[0];
      if (allianceId === undefined) return;

      breakAlliance(state, clock, idGen, logger, allianceId, 'Test');

      const alliance = state.alliances.get(allianceId);
      expect(alliance?.brokenAt).toBeDefined();
    });

    it('creates events for both factions', () => {
      const allianceId = Array.from(state.alliances.keys())[0];
      if (allianceId === undefined) return;

      const eventsBefore = state.events.size;

      breakAlliance(state, clock, idGen, logger, allianceId, 'Test');

      expect(state.events.size).toBe(eventsBefore + 2);
    });

    it('decreases influence for both factions', () => {
      const allianceId = Array.from(state.alliances.keys())[0];
      if (allianceId === undefined) return;

      const faction1Before = state.factions.get('faction-1')?.currentInfluence;
      const faction2Before = state.factions.get('faction-2')?.currentInfluence;

      breakAlliance(state, clock, idGen, logger, allianceId, 'Test');

      const faction1After = state.factions.get('faction-1')?.currentInfluence;
      const faction2After = state.factions.get('faction-2')?.currentInfluence;

      expect(faction1After).toBeLessThan(faction1Before ?? 0n);
      expect(faction2After).toBeLessThan(faction2Before ?? 0n);
    });

    it('returns error for nonexistent alliance', () => {
      const result = breakAlliance(state, clock, idGen, logger, 'fake-alliance', 'Test');

      expect(result).toBe('alliance-not-found');
    });

    it('returns error for already broken alliance', () => {
      const allianceId = Array.from(state.alliances.keys())[0];
      if (allianceId === undefined) return;

      breakAlliance(state, clock, idGen, logger, allianceId, 'First');

      const result = breakAlliance(state, clock, idGen, logger, allianceId, 'Second');

      expect(result).toBe('alliance-not-found');
    });

    it('logs alliance break', () => {
      const allianceId = Array.from(state.alliances.keys())[0];
      if (allianceId === undefined) return;

      logger.clear();

      breakAlliance(state, clock, idGen, logger, allianceId, 'Test');

      expect(logger.logs.length).toBeGreaterThan(0);
    });
  });

  describe('recordDissolution', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'The Fallen Empire', 30n, []);
    });

    it('records faction dissolution', () => {
      const result = recordDissolution(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'Internal collapse',
      );

      expect(result).toBe('success');
    });

    it('marks faction as dissolved', () => {
      recordDissolution(state, clock, idGen, logger, 'faction-1', 'Test');

      const faction = state.factions.get('faction-1');
      expect(faction?.dissolvedAt).toBeDefined();
    });

    it('sets influence to zero', () => {
      recordDissolution(state, clock, idGen, logger, 'faction-1', 'Test');

      const faction = state.factions.get('faction-1');
      expect(faction?.currentInfluence).toBe(0n);
    });

    it('creates dissolution event', () => {
      const eventsBefore = state.events.size;

      recordDissolution(state, clock, idGen, logger, 'faction-1', 'Test');

      expect(state.events.size).toBe(eventsBefore + 1);

      const events = Array.from(state.events.values());
      const dissolutionEvent = events.find((e) => e.eventType === 'DISSOLUTION');

      expect(dissolutionEvent).toBeDefined();
    });

    it('returns error for nonexistent faction', () => {
      const result = recordDissolution(state, clock, idGen, logger, 'fake-faction', 'Test');

      expect(result).toBe('faction-not-found');
    });

    it('returns error for already dissolved faction', () => {
      recordDissolution(state, clock, idGen, logger, 'faction-1', 'First');

      const result = recordDissolution(state, clock, idGen, logger, 'faction-1', 'Second');

      expect(result).toBe('already-dissolved');
    });

    it('logs dissolution warning', () => {
      recordDissolution(state, clock, idGen, logger, 'faction-1', 'Test');

      expect(logger.warnings.length).toBe(1);
    });
  });

  describe('getInfluenceTimeline', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'Test Faction', 50n, []);
    });

    it('returns influence timeline for faction', () => {
      const result = getInfluenceTimeline(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.factionId).toBe('faction-1');
      expect(result.dataPoints.length).toBe(1);
    });

    it('includes all influence data points', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'TERRITORY_GAINED', 'Test', 10n, []);

      recordEvent(state, clock, idGen, logger, 'faction-1', 'TERRITORY_GAINED', 'Test', 5n, []);

      const result = getInfluenceTimeline(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.dataPoints.length).toBe(3);
    });

    it('returns error for nonexistent faction', () => {
      const result = getInfluenceTimeline(state, 'fake-faction');

      expect(result).toBe('faction-not-found');
    });
  });

  describe('defineEra and queryByEra', () => {
    it('defines new era', () => {
      const result = defineEra(
        state,
        logger,
        'The Golden Age',
        1000000n,
        2000000n,
        'Era of prosperity',
      );

      expect(result).toBe('success');
      expect(state.eras.length).toBe(1);
    });

    it('returns events within era', () => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'Test', 50n, []);

      clock.advance(500000n);

      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_DECLARED', 'Test', -5n, []);

      defineEra(state, logger, 'The War Era', 1000000n, 2000000n, 'Era of conflict');

      const events = queryByEra(state, 'The War Era');

      expect(events.length).toBe(2);
    });

    it('filters events outside era', () => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'Test', 50n, []);

      clock.advance(5000000n);

      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_DECLARED', 'Test', -5n, []);

      defineEra(state, logger, 'Early Era', 1000000n, 2000000n, 'Test');

      const events = queryByEra(state, 'Early Era');

      expect(events.length).toBe(1);
    });

    it('returns empty array for nonexistent era', () => {
      const events = queryByEra(state, 'Fake Era');

      expect(events.length).toBe(0);
    });

    it('rejects invalid time range', () => {
      const result = defineEra(state, logger, 'Invalid', 2000000n, 1000000n, 'Test');

      expect(result).toBe('invalid-era');
    });

    it('rejects duplicate era name', () => {
      defineEra(state, logger, 'The Era', 1000000n, 2000000n, 'Test');

      const result = defineEra(state, logger, 'The Era', 3000000n, 4000000n, 'Test');

      expect(result).toBe('invalid-era');
    });
  });

  describe('computeLegacyScore', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'Legacy Faction', 50n, []);
    });

    it('computes legacy score for faction', () => {
      const result = computeLegacyScore(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.factionId).toBe('faction-1');
      expect(result.legacyScore).toBeGreaterThan(0n);
    });

    it('includes major events in score', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_WON', 'Test', 10n, []);

      recordEvent(state, clock, idGen, logger, 'faction-1', 'TREATY_SIGNED', 'Test', 5n, []);

      const result = computeLegacyScore(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.majorEvents).toBe(2);
    });

    it('counts wars correctly', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_DECLARED', 'Test', 0n, []);

      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_WON', 'Test', 10n, []);

      const result = computeLegacyScore(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.wars).toBe(2);
    });

    it('tracks peak influence', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'TERRITORY_GAINED', 'Test', 30n, []);

      recordEvent(state, clock, idGen, logger, 'faction-1', 'TERRITORY_LOST', 'Test', -20n, []);

      const result = computeLegacyScore(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.peakInfluence).toBe(80n);
    });

    it('includes alliance count', () => {
      recordFounding(state, clock, idGen, logger, 'faction-2', 'Ally', 40n, []);

      recordAlliance(state, clock, idGen, logger, 'faction-1', 'faction-2', 'Test');

      const result = computeLegacyScore(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.alliances).toBe(1);
    });

    it('returns error for nonexistent faction', () => {
      const result = computeLegacyScore(state, 'fake-faction');

      expect(result).toBe('faction-not-found');
    });
  });

  describe('query functions', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'faction-1', 'Active One', 50n, []);

      recordFounding(state, clock, idGen, logger, 'faction-2', 'Active Two', 60n, []);
    });

    it('getFactionHistory returns faction by ID', () => {
      const result = getFactionHistory(state, 'faction-1');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.factionId).toBe('faction-1');
    });

    it('getAllFactions returns all factions', () => {
      const factions = getAllFactions(state);

      expect(factions.length).toBe(2);
    });

    it('getActiveFactions filters dissolved factions', () => {
      recordDissolution(state, clock, idGen, logger, 'faction-2', 'Test');

      const active = getActiveFactions(state);

      expect(active.length).toBe(1);
      expect(active[0]?.factionId).toBe('faction-1');
    });

    it('getDissolvedFactions returns only dissolved', () => {
      recordDissolution(state, clock, idGen, logger, 'faction-2', 'Test');

      const dissolved = getDissolvedFactions(state);

      expect(dissolved.length).toBe(1);
      expect(dissolved[0]?.factionId).toBe('faction-2');
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
      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_DECLARED', 'Test', 0n, []);

      const events = getAllEvents(state);

      expect(events.length).toBe(3);
    });

    it('getEventsByType filters by type', () => {
      recordEvent(state, clock, idGen, logger, 'faction-1', 'WAR_DECLARED', 'Test', 0n, []);

      recordEvent(state, clock, idGen, logger, 'faction-1', 'TREATY_SIGNED', 'Test', 0n, []);

      const wars = getEventsByType(state, 'WAR_DECLARED');

      expect(wars.length).toBe(1);
    });

    it('getAllAlliances returns all alliances', () => {
      recordAlliance(state, clock, idGen, logger, 'faction-1', 'faction-2', 'Test');

      const alliances = getAllAlliances(state);

      expect(alliances.length).toBe(1);
    });

    it('getActiveAlliances filters broken alliances', () => {
      const allianceId = recordAlliance(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'faction-2',
        'Test',
      ) as string;

      breakAlliance(state, clock, idGen, logger, allianceId, 'Test');

      const active = getActiveAlliances(state);

      expect(active.length).toBe(0);
    });

    it('getBrokenAlliances returns only broken', () => {
      const allianceId = recordAlliance(
        state,
        clock,
        idGen,
        logger,
        'faction-1',
        'faction-2',
        'Test',
      ) as string;

      breakAlliance(state, clock, idGen, logger, allianceId, 'Test');

      const broken = getBrokenAlliances(state);

      expect(broken.length).toBe(1);
    });

    it('getAllEras returns all eras', () => {
      defineEra(state, logger, 'Era One', 1000000n, 2000000n, 'Test');
      defineEra(state, logger, 'Era Two', 2000000n, 3000000n, 'Test');

      const eras = getAllEras(state);

      expect(eras.length).toBe(2);
    });

    it('getEra returns era by name', () => {
      defineEra(state, logger, 'The Age', 1000000n, 2000000n, 'Test');

      const result = getEra(state, 'The Age');

      expect(result).not.toBe('faction-not-found');
      if (typeof result === 'string') return;

      expect(result.eraName).toBe('The Age');
    });
  });

  describe('counters', () => {
    it('getFactionCount returns faction count', () => {
      recordFounding(state, clock, idGen, logger, 'f1', 'One', 50n, []);
      recordFounding(state, clock, idGen, logger, 'f2', 'Two', 50n, []);

      expect(getFactionCount(state)).toBe(2);
    });

    it('getEventCount returns event count', () => {
      recordFounding(state, clock, idGen, logger, 'f1', 'One', 50n, []);

      expect(getEventCount(state)).toBe(1);
    });

    it('getAllianceCount returns alliance count', () => {
      recordFounding(state, clock, idGen, logger, 'f1', 'One', 50n, []);
      recordFounding(state, clock, idGen, logger, 'f2', 'Two', 50n, []);

      recordAlliance(state, clock, idGen, logger, 'f1', 'f2', 'Test');

      expect(getAllianceCount(state)).toBe(1);
    });

    it('getEraCount returns era count', () => {
      defineEra(state, logger, 'Era', 1000000n, 2000000n, 'Test');

      expect(getEraCount(state)).toBe(1);
    });
  });

  describe('getFactionsByInfluence', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'f1', 'Low', 30n, []);
      recordFounding(state, clock, idGen, logger, 'f2', 'Medium', 50n, []);
      recordFounding(state, clock, idGen, logger, 'f3', 'High', 80n, []);
    });

    it('returns factions above threshold', () => {
      const factions = getFactionsByInfluence(state, 50n);

      expect(factions.length).toBe(2);
    });

    it('includes factions at exact threshold', () => {
      const factions = getFactionsByInfluence(state, 50n);

      const ids = factions.map((f) => f.factionId);
      expect(ids).toContain('f2');
    });

    it('excludes factions below threshold', () => {
      const factions = getFactionsByInfluence(state, 50n);

      const ids = factions.map((f) => f.factionId);
      expect(ids).not.toContain('f1');
    });
  });

  describe('getTopFactions', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'f1', 'Low', 30n, []);
      recordFounding(state, clock, idGen, logger, 'f2', 'Medium', 50n, []);
      recordFounding(state, clock, idGen, logger, 'f3', 'High', 80n, []);
    });

    it('returns top factions by influence', () => {
      const top = getTopFactions(state, 2);

      expect(top.length).toBe(2);
      expect(top[0]?.factionId).toBe('f3');
      expect(top[1]?.factionId).toBe('f2');
    });

    it('limits results to specified count', () => {
      const top = getTopFactions(state, 1);

      expect(top.length).toBe(1);
    });
  });

  describe('getRecentEvents', () => {
    it('returns events since timestamp', () => {
      recordFounding(state, clock, idGen, logger, 'f1', 'Test', 50n, []);

      clock.advance(1000000n);

      recordEvent(state, clock, idGen, logger, 'f1', 'WAR_DECLARED', 'Test', 0n, []);

      const recent = getRecentEvents(state, 1500000n);

      expect(recent.length).toBe(1);
    });
  });

  describe('getEventsInRange', () => {
    it('returns events within time range', () => {
      recordFounding(state, clock, idGen, logger, 'f1', 'Test', 50n, []);

      clock.advance(500000n);

      recordEvent(state, clock, idGen, logger, 'f1', 'WAR_DECLARED', 'Test', 0n, []);

      clock.advance(500000n);

      recordEvent(state, clock, idGen, logger, 'f1', 'TREATY_SIGNED', 'Test', 0n, []);

      const events = getEventsInRange(state, 1000000n, 1500000n);

      expect(events.length).toBe(2);
    });
  });

  describe('getRelatedFactions', () => {
    beforeEach(() => {
      recordFounding(state, clock, idGen, logger, 'f1', 'One', 50n, []);
      recordFounding(state, clock, idGen, logger, 'f2', 'Two', 50n, []);
      recordFounding(state, clock, idGen, logger, 'f3', 'Three', 50n, []);
    });

    it('returns factions with alliances', () => {
      recordAlliance(state, clock, idGen, logger, 'f1', 'f2', 'Test');
      recordAlliance(state, clock, idGen, logger, 'f1', 'f3', 'Test');

      const related = getRelatedFactions(state, 'f1');

      expect(related.length).toBe(2);
      expect(related).toContain('f2');
      expect(related).toContain('f3');
    });

    it('returns empty array for faction with no alliances', () => {
      const related = getRelatedFactions(state, 'f1');

      expect(related.length).toBe(0);
    });

    it('works for either side of alliance', () => {
      recordAlliance(state, clock, idGen, logger, 'f1', 'f2', 'Test');

      const related = getRelatedFactions(state, 'f2');

      expect(related).toContain('f1');
    });
  });

  describe('getAlliance', () => {
    it('returns alliance by ID', () => {
      recordFounding(state, clock, idGen, logger, 'f1', 'One', 50n, []);
      recordFounding(state, clock, idGen, logger, 'f2', 'Two', 50n, []);

      const allianceId = recordAlliance(state, clock, idGen, logger, 'f1', 'f2', 'Test') as string;

      const result = getAlliance(state, allianceId);

      expect(result).not.toBe('alliance-not-found');
      if (typeof result === 'string') return;

      expect(result.id).toBe(allianceId);
    });

    it('returns error for nonexistent alliance', () => {
      const result = getAlliance(state, 'fake-id');

      expect(result).toBe('alliance-not-found');
    });
  });
});
