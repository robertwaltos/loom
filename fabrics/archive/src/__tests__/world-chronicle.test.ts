import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ChronicleState,
  Clock,
  IdGenerator,
  Logger,
  ChronicleEntry,
  WorldEra,
  TurningPoint,
  EraSummary,
  ChronicleQuery,
  ChronicleReport,
  EventCategory,
} from '../world-chronicle.js';
import {
  createChronicleState,
  addChronicleEntry,
  getEntry,
  createEra,
  detectEraTransition,
  getLatestEra,
  endEra,
  identifyTurningPoints,
  getTurningPoint,
  generateEraSummary,
  queryChronicle,
  queryByCategory,
  queryBySignificance,
  queryByParticipant,
  queryByTimeRange,
  getChronicleReport,
  getAllEras,
} from '../world-chronicle.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockClock(): Clock {
  let time = 1000000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function createMockIdGen(): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter = counter + 1;
      return 'id-' + String(counter);
    },
  };
}

function createMockLogger(): Logger {
  const messages: string[] = [];
  const errors: string[] = [];
  return {
    info: (msg: string) => {
      messages.push(msg);
    },
    error: (msg: string) => {
      errors.push(msg);
    },
  };
}

// ============================================================================
// TESTS: CHRONICLE ENTRIES
// ============================================================================

describe('World Chronicle - Chronicle Entries', () => {
  let state: ChronicleState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createChronicleState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should add a chronicle entry', () => {
    const metadata = new Map<string, string>();
    metadata.set('location', 'Capital City');
    const entry = addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'New dynasty founded',
      75,
      1000000n,
      ['dyn1', 'dyn2'],
      metadata,
      idGen,
      clock,
      logger,
    );
    expect(typeof entry).toBe('object');
    if (typeof entry === 'object') {
      expect(entry.worldId).toBe('world1');
      expect(entry.category).toBe('POLITICAL');
      expect(entry.significance).toBe(75);
    }
  });

  it('should return invalid-world for empty worldId', () => {
    const metadata = new Map<string, string>();
    const entry = addChronicleEntry(
      state,
      '',
      'POLITICAL',
      'Test',
      50,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    expect(entry).toBe('invalid-world');
  });

  it('should return invalid-category for bad category', () => {
    const metadata = new Map<string, string>();
    const entry = addChronicleEntry(
      state,
      'world1',
      'BAD' as EventCategory,
      'Test',
      50,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    expect(entry).toBe('invalid-category');
  });

  it('should return invalid-significance for significance < 0', () => {
    const metadata = new Map<string, string>();
    const entry = addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Test',
      -10,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    expect(entry).toBe('invalid-significance');
  });

  it('should return invalid-significance for significance > 100', () => {
    const metadata = new Map<string, string>();
    const entry = addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Test',
      110,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    expect(entry).toBe('invalid-significance');
  });

  it('should return invalid-timestamp for negative timestamp', () => {
    const metadata = new Map<string, string>();
    const entry = addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Test',
      50,
      -1000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    expect(entry).toBe('invalid-timestamp');
  });

  it('should store entry in state', () => {
    const metadata = new Map<string, string>();
    const entry = addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Battle won',
      60,
      1000000n,
      ['dyn1'],
      metadata,
      idGen,
      clock,
      logger,
    );
    if (typeof entry === 'object') {
      expect(state.entries.has(entry.id)).toBe(true);
    }
  });

  it('should get entry by id', () => {
    const metadata = new Map<string, string>();
    const created = addChronicleEntry(
      state,
      'world1',
      'ECONOMIC',
      'Trade route opened',
      45,
      1000000n,
      ['dyn1', 'dyn2'],
      metadata,
      idGen,
      clock,
      logger,
    );
    if (typeof created === 'object') {
      const retrieved = getEntry(state, created.id);
      expect(typeof retrieved).toBe('object');
      if (typeof retrieved === 'object') {
        expect(retrieved.id).toBe(created.id);
      }
    }
  });

  it('should return entry-not-found for missing entry', () => {
    const entry = getEntry(state, 'missing-id');
    expect(entry).toBe('entry-not-found');
  });

  it('should return invalid-entry for empty entryId', () => {
    const entry = getEntry(state, '');
    expect(entry).toBe('invalid-entry');
  });

  it('should record turning point for high significance', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era of Peace', 1000000n, idGen, clock, logger);
    const entry = addChronicleEntry(
      state,
      'world1',
      'TECHNOLOGICAL',
      'FTL discovered',
      90,
      1000000n,
      ['dyn1'],
      metadata,
      idGen,
      clock,
      logger,
    );
    const tps = identifyTurningPoints(state, 'world1', 80);
    expect(tps.length).toBeGreaterThan(0);
  });

  it('should not record turning point for low significance', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era of Peace', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'CULTURAL',
      'Festival held',
      40,
      1000000n,
      ['dyn1'],
      metadata,
      idGen,
      clock,
      logger,
    );
    const tps = identifyTurningPoints(state, 'world1', 80);
    expect(tps.length).toBe(0);
  });

  it('should support all event categories', () => {
    const metadata = new Map<string, string>();
    const categories: EventCategory[] = [
      'POLITICAL',
      'MILITARY',
      'ECONOMIC',
      'CULTURAL',
      'TECHNOLOGICAL',
      'ENVIRONMENTAL',
      'DIPLOMATIC',
    ];
    for (const cat of categories) {
      const entry = addChronicleEntry(
        state,
        'world1',
        cat,
        'Test event',
        50,
        1000000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      expect(typeof entry).toBe('object');
    }
  });
});

// ============================================================================
// TESTS: ERA MANAGEMENT
// ============================================================================

describe('World Chronicle - Era Management', () => {
  let state: ChronicleState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createChronicleState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should create an era', () => {
    const era = createEra(state, 'world1', 'The Golden Age', 1000000n, idGen, clock, logger);
    expect(typeof era).toBe('object');
    if (typeof era === 'object') {
      expect(era.worldId).toBe('world1');
      expect(era.name).toBe('The Golden Age');
      expect(era.endTimestamp).toBe(null);
    }
  });

  it('should return invalid-world for empty worldId', () => {
    const era = createEra(state, '', 'Era', 1000000n, idGen, clock, logger);
    expect(era).toBe('invalid-world');
  });

  it('should return invalid-timestamp for negative timestamp', () => {
    const era = createEra(state, 'world1', 'Era', -1000n, idGen, clock, logger);
    expect(era).toBe('invalid-timestamp');
  });

  it('should set era as current for world', () => {
    const era = createEra(state, 'world1', 'Era of Discovery', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      const current = state.currentEraByWorld.get('world1');
      expect(current).toBe(era.id);
    }
  });

  it('should end previous era when creating new one', () => {
    const era1 = createEra(state, 'world1', 'First Era', 1000000n, idGen, clock, logger);
    const era2 = createEra(state, 'world1', 'Second Era', 2000000n, idGen, clock, logger);
    if (typeof era1 === 'object' && typeof era2 === 'object') {
      const retrieved = state.eras.get(era1.id);
      if (retrieved) {
        expect(retrieved.endTimestamp).not.toBe(null);
      }
    }
  });

  it('should get latest era', () => {
    createEra(state, 'world1', 'First Era', 1000000n, idGen, clock, logger);
    const latest = getLatestEra(state, 'world1');
    expect(typeof latest).toBe('object');
  });

  it('should return no-current-era for world without era', () => {
    const latest = getLatestEra(state, 'world1');
    expect(latest).toBe('no-current-era');
  });

  it('should end an era', () => {
    const era = createEra(state, 'world1', 'Era of Peace', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      const ended = endEra(state, era.id, 2000000n, clock);
      if (typeof ended === 'object') {
        expect(ended.endTimestamp).toBe(2000000n);
      }
    }
  });

  it('should return era-not-found for missing era', () => {
    const ended = endEra(state, 'missing-id', 2000000n, clock);
    expect(ended).toBe('era-not-found');
  });

  it('should return invalid-era for empty eraId', () => {
    const ended = endEra(state, '', 2000000n, clock);
    expect(ended).toBe('invalid-era');
  });

  it('should update era statistics when ending', () => {
    const metadata = new Map<string, string>();
    const era = createEra(state, 'world1', 'Era of War', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Battle 1',
        70,
        1100000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Battle 2',
        80,
        1200000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      const ended = endEra(state, era.id, 1300000n, clock);
      if (typeof ended === 'object') {
        expect(ended.averageSignificance).toBe(75);
        expect(ended.dominantCategory).toBe('MILITARY');
      }
    }
  });

  it('should get all eras for a world', () => {
    createEra(state, 'world1', 'First', 1000000n, idGen, clock, logger);
    createEra(state, 'world1', 'Second', 2000000n, idGen, clock, logger);
    createEra(state, 'world1', 'Third', 3000000n, idGen, clock, logger);
    const eras = getAllEras(state, 'world1');
    expect(eras.length).toBe(3);
  });

  it('should sort eras by start time', () => {
    createEra(state, 'world1', 'First', 1000000n, idGen, clock, logger);
    createEra(state, 'world1', 'Second', 2000000n, idGen, clock, logger);
    const eras = getAllEras(state, 'world1');
    expect(eras[0]?.name).toBe('First');
    expect(eras[1]?.name).toBe('Second');
  });
});

// ============================================================================
// TESTS: ERA TRANSITION DETECTION
// ============================================================================

describe('World Chronicle - Era Transition', () => {
  let state: ChronicleState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createChronicleState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should detect era transition with many high-significance events', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Old Era', 1000000n, idGen, clock, logger);

    for (let i = 0; i < 10; i = i + 1) {
      const sig = i < 6 ? 85 : 40;
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Event ' + String(i),
        sig,
        BigInt(1000000 + i * 10000),
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
    }

    const newEra = detectEraTransition(state, 'world1', 10, 80, idGen, clock, logger);
    expect(typeof newEra).toBe('object');
  });

  it('should not detect era transition with few high-significance events', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);

    for (let i = 0; i < 10; i = i + 1) {
      const sig = i < 3 ? 85 : 40;
      addChronicleEntry(
        state,
        'world1',
        'CULTURAL',
        'Event ' + String(i),
        sig,
        BigInt(1000000 + i * 10000),
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
    }

    const newEra = detectEraTransition(state, 'world1', 10, 80, idGen, clock, logger);
    expect(newEra).toBe(null);
  });

  it('should return null if no current era', () => {
    const newEra = detectEraTransition(state, 'world1', 10, 80, idGen, clock, logger);
    expect(newEra).toBe(null);
  });

  it('should return invalid-world for empty worldId', () => {
    const newEra = detectEraTransition(state, '', 10, 80, idGen, clock, logger);
    expect(newEra).toBe('invalid-world');
  });

  it('should name new era after dominant category', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Old Era', 1000000n, idGen, clock, logger);

    for (let i = 0; i < 10; i = i + 1) {
      addChronicleEntry(
        state,
        'world1',
        'TECHNOLOGICAL',
        'Innovation ' + String(i),
        85,
        BigInt(1000000 + i * 10000),
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
    }

    const newEra = detectEraTransition(state, 'world1', 10, 80, idGen, clock, logger);
    if (newEra !== null && typeof newEra === 'object') {
      expect(newEra.name).toContain('TECHNOLOGICAL');
    }
  });
});

// ============================================================================
// TESTS: TURNING POINTS
// ============================================================================

describe('World Chronicle - Turning Points', () => {
  let state: ChronicleState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createChronicleState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should identify turning points', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Great War',
      95,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Revolution',
      88,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const tps = identifyTurningPoints(state, 'world1', 85);
    expect(tps.length).toBe(2);
  });

  it('should filter turning points by minimum significance', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      82,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Revolution',
      95,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const tps = identifyTurningPoints(state, 'world1', 90);
    expect(tps.length).toBe(1);
  });

  it('should sort turning points by significance descending', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      85,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Revolution',
      95,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'TECHNOLOGICAL',
      'Discovery',
      90,
      1200000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const tps = identifyTurningPoints(state, 'world1', 80);
    expect(tps[0]?.significance).toBe(95);
    expect(tps[1]?.significance).toBe(90);
    expect(tps[2]?.significance).toBe(85);
  });

  it('should get turning point by id', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'ENVIRONMENTAL',
      'Disaster',
      92,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const tps = identifyTurningPoints(state, 'world1', 90);
    if (tps.length > 0) {
      const first = tps[0];
      if (first) {
        const tp = getTurningPoint(state, first.id);
        expect(typeof tp).toBe('object');
      }
    }
  });

  it('should return turning-point-not-found for missing id', () => {
    const tp = getTurningPoint(state, 'missing-id');
    expect(tp).toBe('turning-point-not-found');
  });

  it('should derive impact from category', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'TECHNOLOGICAL',
      'FTL',
      95,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const tps = identifyTurningPoints(state, 'world1', 90);
    if (tps.length > 0) {
      const tp = tps[0];
      if (tp) {
        expect(tp.impact).toContain('Technological');
      }
    }
  });
});

// ============================================================================
// TESTS: ERA SUMMARIES
// ============================================================================

describe('World Chronicle - Era Summaries', () => {
  let state: ChronicleState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createChronicleState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should generate era summary', () => {
    const metadata = new Map<string, string>();
    const era = createEra(state, 'world1', 'Era of War', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Battle',
        70,
        1100000n,
        ['dyn1'],
        metadata,
        idGen,
        clock,
        logger,
      );
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Siege',
        80,
        1200000n,
        ['dyn2'],
        metadata,
        idGen,
        clock,
        logger,
      );
      endEra(state, era.id, 1300000n, clock);
      const summary = generateEraSummary(state, era.id, clock);
      expect(typeof summary).toBe('object');
      if (typeof summary === 'object') {
        expect(summary.eraId).toBe(era.id);
        expect(summary.totalEvents).toBe(2);
      }
    }
  });

  it('should return era-not-found for missing era', () => {
    const summary = generateEraSummary(state, 'missing-id', clock);
    expect(summary).toBe('era-not-found');
  });

  it('should count turning points in summary', () => {
    const metadata = new Map<string, string>();
    const era = createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'War',
        85,
        1100000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      addChronicleEntry(
        state,
        'world1',
        'POLITICAL',
        'Revolution',
        95,
        1200000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      const summary = generateEraSummary(state, era.id, clock);
      if (typeof summary === 'object') {
        expect(summary.turningPoints).toBe(2);
      }
    }
  });

  it('should count events by category', () => {
    const metadata = new Map<string, string>();
    const era = createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'War',
        70,
        1100000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Battle',
        60,
        1200000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      addChronicleEntry(
        state,
        'world1',
        'ECONOMIC',
        'Trade',
        50,
        1300000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      const summary = generateEraSummary(state, era.id, clock);
      if (typeof summary === 'object') {
        const militaryCount = summary.categoryCounts.get('MILITARY');
        expect(militaryCount).toBe(2);
      }
    }
  });

  it('should identify top participants', () => {
    const metadata = new Map<string, string>();
    const era = createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Event1',
        70,
        1100000n,
        ['dyn1', 'dyn2'],
        metadata,
        idGen,
        clock,
        logger,
      );
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Event2',
        60,
        1200000n,
        ['dyn1'],
        metadata,
        idGen,
        clock,
        logger,
      );
      addChronicleEntry(
        state,
        'world1',
        'ECONOMIC',
        'Event3',
        50,
        1300000n,
        ['dyn3'],
        metadata,
        idGen,
        clock,
        logger,
      );
      const summary = generateEraSummary(state, era.id, clock);
      if (typeof summary === 'object') {
        expect(summary.topParticipants[0]).toBe('dyn1');
      }
    }
  });

  it('should build narrative summary', () => {
    const metadata = new Map<string, string>();
    const era = createEra(state, 'world1', 'Era of Peace', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      addChronicleEntry(
        state,
        'world1',
        'CULTURAL',
        'Festival',
        60,
        1100000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      const summary = generateEraSummary(state, era.id, clock);
      if (typeof summary === 'object') {
        expect(summary.narrativeSummary.length).toBeGreaterThan(0);
      }
    }
  });

  it('should compute era duration', () => {
    const metadata = new Map<string, string>();
    const era = createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    if (typeof era === 'object') {
      addChronicleEntry(
        state,
        'world1',
        'CULTURAL',
        'Event',
        50,
        1100000n,
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
      endEra(state, era.id, 2000000n, clock);
      const summary = generateEraSummary(state, era.id, clock);
      if (typeof summary === 'object') {
        expect(summary.duration).toBe(1000000n);
      }
    }
  });
});

// ============================================================================
// TESTS: CHRONICLE QUERIES
// ============================================================================

describe('World Chronicle - Queries', () => {
  let state: ChronicleState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createChronicleState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should query by world', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Event1',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world2',
      'MILITARY',
      'Event2',
      60,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const results = queryChronicle(state, { worldId: 'world1' });
    expect(results.length).toBe(1);
    expect(results[0]?.worldId).toBe('world1');
  });

  it('should query by category', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'ECONOMIC',
      'Trade',
      60,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const results = queryByCategory(state, 'world1', 'MILITARY', 10);
    expect(results.length).toBe(1);
    expect(results[0]?.category).toBe('MILITARY');
  });

  it('should query by minimum significance', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Major',
      80,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Minor',
      40,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const results = queryBySignificance(state, 'world1', 70, 10);
    expect(results.length).toBe(1);
    expect(results[0]?.significance).toBeGreaterThanOrEqual(70);
  });

  it('should query by participant', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Event1',
      70,
      1000000n,
      ['dyn1', 'dyn2'],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Event2',
      60,
      1100000n,
      ['dyn3'],
      metadata,
      idGen,
      clock,
      logger,
    );
    const results = queryByParticipant(state, 'world1', 'dyn1', 10);
    expect(results.length).toBe(1);
    expect(results[0]?.participants).toContain('dyn1');
  });

  it('should query by time range', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Old',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'New',
      60,
      3000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const results = queryByTimeRange(state, 'world1', 2000000n, 4000000n, 10);
    expect(results.length).toBe(1);
    expect(results[0]?.description).toBe('New');
  });

  it('should limit query results', () => {
    const metadata = new Map<string, string>();
    for (let i = 0; i < 20; i = i + 1) {
      addChronicleEntry(
        state,
        'world1',
        'MILITARY',
        'Event ' + String(i),
        70,
        BigInt(1000000 + i * 1000),
        [],
        metadata,
        idGen,
        clock,
        logger,
      );
    }
    const results = queryChronicle(state, { worldId: 'world1', limit: 5 });
    expect(results.length).toBe(5);
  });

  it('should sort results by timestamp descending', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Old',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'New',
      60,
      2000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const results = queryChronicle(state, { worldId: 'world1' });
    expect(results[0]?.description).toBe('New');
    expect(results[1]?.description).toBe('Old');
  });

  it('should combine multiple query filters', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      85,
      1000000n,
      ['dyn1'],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'ECONOMIC',
      'Trade',
      40,
      1100000n,
      ['dyn1'],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Skirmish',
      30,
      1200000n,
      ['dyn1'],
      metadata,
      idGen,
      clock,
      logger,
    );
    const results = queryChronicle(state, {
      worldId: 'world1',
      category: 'MILITARY',
      minSignificance: 50,
      participantId: 'dyn1',
    });
    expect(results.length).toBe(1);
    expect(results[0]?.description).toBe('War');
  });
});

// ============================================================================
// TESTS: REPORTING
// ============================================================================

describe('World Chronicle - Reporting', () => {
  let state: ChronicleState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createChronicleState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should generate chronicle report', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const report = getChronicleReport(state, 'world1', clock);
    expect(typeof report).toBe('object');
    if (typeof report === 'object') {
      expect(report.worldId).toBe('world1');
      expect(report.totalEntries).toBe(1);
    }
  });

  it('should return invalid-world for empty worldId', () => {
    const report = getChronicleReport(state, '', clock);
    expect(report).toBe('invalid-world');
  });

  it('should count total entries', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Event1',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'ECONOMIC',
      'Event2',
      60,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world2',
      'CULTURAL',
      'Event3',
      50,
      1200000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const report = getChronicleReport(state, 'world1', clock);
    if (typeof report === 'object') {
      expect(report.totalEntries).toBe(2);
    }
  });

  it('should count total eras', () => {
    createEra(state, 'world1', 'First', 1000000n, idGen, clock, logger);
    createEra(state, 'world1', 'Second', 2000000n, idGen, clock, logger);
    const report = getChronicleReport(state, 'world1', clock);
    if (typeof report === 'object') {
      expect(report.totalEras).toBe(2);
    }
  });

  it('should include current era', () => {
    createEra(state, 'world1', 'Current Era', 1000000n, idGen, clock, logger);
    const report = getChronicleReport(state, 'world1', clock);
    if (typeof report === 'object') {
      expect(report.currentEra).not.toBe(null);
      if (report.currentEra) {
        expect(report.currentEra.name).toBe('Current Era');
      }
    }
  });

  it('should count turning points', () => {
    const metadata = new Map<string, string>();
    createEra(state, 'world1', 'Era', 1000000n, idGen, clock, logger);
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      85,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Revolution',
      90,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const report = getChronicleReport(state, 'world1', clock);
    if (typeof report === 'object') {
      expect(report.turningPointCount).toBe(2);
    }
  });

  it('should identify most significant entry', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'POLITICAL',
      'Revolution',
      95,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'ECONOMIC',
      'Trade',
      60,
      1200000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const report = getChronicleReport(state, 'world1', clock);
    if (typeof report === 'object' && report.mostSignificantEntry) {
      expect(report.mostSignificantEntry.significance).toBe(95);
    }
  });

  it('should count events by category', () => {
    const metadata = new Map<string, string>();
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'War',
      70,
      1000000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'MILITARY',
      'Battle',
      60,
      1100000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    addChronicleEntry(
      state,
      'world1',
      'ECONOMIC',
      'Trade',
      50,
      1200000n,
      [],
      metadata,
      idGen,
      clock,
      logger,
    );
    const report = getChronicleReport(state, 'world1', clock);
    if (typeof report === 'object') {
      const militaryCount = report.categoryCounts.get('MILITARY');
      expect(militaryCount).toBe(2);
    }
  });
});
