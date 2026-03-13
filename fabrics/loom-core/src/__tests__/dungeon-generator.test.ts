import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDungeonGeneratorState,
  generateLayout,
  addRoom,
  connectRooms,
  validateConnectivity,
  getLayout,
  scaleDifficulty,
  getRoomsByType,
  getPathBetween,
  getTotalEnemyBudget,
  getRoom,
  getAdjacentRooms,
  type Clock,
  type IdGenerator,
  type Logger,
  type GenerationParams,
  type DungeonGeneratorState,
  type DungeonLayout,
} from '../dungeon-generator.js';

// --- Test Doubles ---

class TestClock implements Clock {
  private time = 1000000n;

  nowMicros(): bigint {
    this.time += 1000n;
    return this.time;
  }
}

class TestIdGenerator implements IdGenerator {
  private counter = 0;

  nextId(): string {
    this.counter += 1;
    return 'room-' + String(this.counter);
  }
}

class TestLogger implements Logger {
  logs: string[] = [];

  info(message: string): void {
    this.logs.push('INFO: ' + message);
  }

  warn(message: string): void {
    this.logs.push('WARN: ' + message);
  }

  error(message: string): void {
    this.logs.push('ERROR: ' + message);
  }
}

// --- Helper Functions ---

function createTestState(): DungeonGeneratorState {
  return createDungeonGeneratorState(new TestClock(), new TestIdGenerator(), new TestLogger());
}

function createBasicParams(): GenerationParams {
  return {
    minRooms: 5,
    maxRooms: 10,
    difficultyTier: 2,
    minRoomArea: 100,
    maxRoomArea: 500,
    connectionDensity: 0.5,
    secretRoomChance: 0.1,
    treasureRoomCount: 2,
  };
}

// --- Tests ---

describe('DungeonGenerator', () => {
  let state: DungeonGeneratorState;

  beforeEach(() => {
    state = createTestState();
  });

  describe('createDungeonGeneratorState', () => {
    it('should create initial state', () => {
      expect(state.layouts.size).toBe(0);
      expect(state.clock).toBeDefined();
      expect(state.idGen).toBeDefined();
      expect(state.logger).toBeDefined();
    });

    it('should accept custom ports', () => {
      const customClock = new TestClock();
      const customIdGen = new TestIdGenerator();
      const customLogger = new TestLogger();

      const custom = createDungeonGeneratorState(customClock, customIdGen, customLogger);

      expect(custom.clock).toBe(customClock);
      expect(custom.idGen).toBe(customIdGen);
      expect(custom.logger).toBe(customLogger);
    });
  });

  describe('generateLayout', () => {
    it('should generate a basic layout', () => {
      const params = createBasicParams();
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.layoutId).toBeDefined();
      expect(result.rooms.size).toBeGreaterThanOrEqual(params.minRooms);
      expect(result.rooms.size).toBeLessThanOrEqual(params.maxRooms);
      expect(result.entryRoomId).toBeTruthy();
      expect(result.bossRoomId).toBeTruthy();
      expect(result.difficultyTier).toBe(2);
    });

    it('should create entry room', () => {
      const params = createBasicParams();
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      const entry = result.rooms.get(result.entryRoomId || '');
      expect(entry).toBeDefined();
      if (entry === undefined) return;
      expect(entry.type).toBe('ENTRY');
    });

    it('should create boss room', () => {
      const params = createBasicParams();
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      const boss = result.rooms.get(result.bossRoomId || '');
      expect(boss).toBeDefined();
      if (boss === undefined) return;
      expect(boss.type).toBe('BOSS');
    });

    it('should create treasure rooms', () => {
      const params = createBasicParams();
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      let treasureCount = 0;
      for (const room of result.rooms.values()) {
        if (room.type === 'TREASURE') treasureCount++;
      }

      expect(treasureCount).toBe(params.treasureRoomCount);
    });

    it('should create connections', () => {
      const params = createBasicParams();
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.connections.length).toBeGreaterThan(0);
    });

    it('should store layout in state', () => {
      const params = createBasicParams();
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      const stored = state.layouts.get(result.layoutId);
      expect(stored).toBeDefined();
      expect(stored).toEqual(result);
    });

    it('should respect difficulty tier', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        difficultyTier: 4,
      };
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.difficultyTier).toBe(4);

      for (const room of result.rooms.values()) {
        expect(room.difficultyTier).toBe(4);
      }
    });

    it('should return error for invalid min rooms', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        minRooms: 1,
      };
      const result = generateLayout(state, params);

      expect(result).toBe('invalid-params');
    });

    it('should return error for invalid max rooms', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        minRooms: 10,
        maxRooms: 5,
      };
      const result = generateLayout(state, params);

      expect(result).toBe('invalid-params');
    });

    it('should return error for invalid difficulty tier', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        difficultyTier: 6 as never,
      };
      const result = generateLayout(state, params);

      expect(result).toBe('invalid-difficulty');
    });

    it('should return error for invalid area', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        minRoomArea: 5,
      };
      const result = generateLayout(state, params);

      expect(result).toBe('invalid-area');
    });

    it('should return error for invalid connection density', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        connectionDensity: 1.5,
      };
      const result = generateLayout(state, params);

      expect(result).toBe('invalid-params');
    });

    it('should log generation', () => {
      const logger = state.logger as TestLogger;
      const params = createBasicParams();
      generateLayout(state, params);

      const hasLog = logger.logs.some((log) => log.includes('Generated layout'));
      expect(hasLog).toBe(true);
    });

    it('should generate unique layout IDs', () => {
      const params = createBasicParams();
      const layout1 = generateLayout(state, params);
      const layout2 = generateLayout(state, params);

      expect(typeof layout1).not.toBe('string');
      expect(typeof layout2).not.toBe('string');
      if (typeof layout1 === 'string' || typeof layout2 === 'string') return;

      expect(layout1.layoutId).not.toBe(layout2.layoutId);
    });

    it('should scale enemy budget with difficulty', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const params1: GenerationParams = {
        ...createBasicParams(),
        difficultyTier: 0,
      };
      const params2: GenerationParams = {
        ...createBasicParams(),
        difficultyTier: 5,
      };

      const layout1 = generateLayout(state, params1);
      const layout2 = generateLayout(state, params2);

      expect(typeof layout1).not.toBe('string');
      expect(typeof layout2).not.toBe('string');
      if (typeof layout1 === 'string' || typeof layout2 === 'string') return;

      const budget1 = getTotalEnemyBudget(state, layout1.layoutId);
      const budget2 = getTotalEnemyBudget(state, layout2.layoutId);

      expect(typeof budget1).toBe('number');
      expect(typeof budget2).toBe('number');
      if (typeof budget1 === 'string' || typeof budget2 === 'string') {
        randomSpy.mockRestore();
        return;
      }

      expect(budget2).toBeGreaterThan(budget1);
      randomSpy.mockRestore();
    });

    it('should create bidirectional connections', () => {
      const params = createBasicParams();
      const result = generateLayout(state, params);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      const bidirectional = result.connections.filter((c) => c.bidirectional);
      expect(bidirectional.length).toBeGreaterThan(0);
    });
  });

  describe('addRoom', () => {
    it('should add a room to layout', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const initialSize = layout.rooms.size;
      const result = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.type).toBe('CORRIDOR');
      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);

      const updated = getLayout(state, layout.layoutId);
      expect(typeof updated).not.toBe('string');
      if (typeof updated === 'string') return;
      expect(updated.rooms.size).toBe(initialSize + 1);
    });

    it('should calculate area correctly', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = addRoom(state, layout.layoutId, 'PUZZLE', 0, 0, 15, 20, 3);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.area).toBe(300);
    });

    it('should calculate enemy budget', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = addRoom(state, layout.layoutId, 'ELITE', 0, 0, 20, 20, 3);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.enemyBudget).toBeGreaterThan(0);
    });

    it('should return error for non-existent layout', () => {
      const result = addRoom(state, 'fake-layout', 'CORRIDOR', 0, 0, 10, 10, 2);

      expect(result).toBe('layout-not-found');
    });

    it('should prevent duplicate entry rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = addRoom(state, layout.layoutId, 'ENTRY', 0, 0, 10, 10, 2);

      expect(result).toBe('entry-room-exists');
    });

    it('should prevent duplicate boss rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = addRoom(state, layout.layoutId, 'BOSS', 0, 0, 10, 10, 2);

      expect(result).toBe('boss-room-exists');
    });

    it('should log room addition', () => {
      const logger = state.logger as TestLogger;
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      addRoom(state, layout.layoutId, 'REST', 0, 0, 10, 10, 2);

      const hasLog = logger.logs.some((log) => log.includes('Added room'));
      expect(hasLog).toBe(true);
    });

    it('should set correct difficulty tier', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = addRoom(state, layout.layoutId, 'TRAP', 0, 0, 10, 10, 5);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.difficultyTier).toBe(5);
    });

    it('should set enemy budget to zero for rest rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = addRoom(state, layout.layoutId, 'REST', 0, 0, 20, 20, 3);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.enemyBudget).toBe(0);
    });

    it('should set enemy budget to zero for merchant rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = addRoom(state, layout.layoutId, 'MERCHANT', 0, 0, 20, 20, 3);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.enemyBudget).toBe(0);
    });

    it('should generate unique room IDs', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const room1 = addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      const room2 = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof room1).not.toBe('string');
      expect(typeof room2).not.toBe('string');
      if (typeof room1 === 'string' || typeof room2 === 'string') return;

      expect(room1.id).not.toBe(room2.id);
    });
  });

  describe('connectRooms', () => {
    it('should connect two rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const room1 = addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      const room2 = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof room1).not.toBe('string');
      expect(typeof room2).not.toBe('string');
      if (typeof room1 === 'string' || typeof room2 === 'string') return;

      const result = connectRooms(state, layout.layoutId, room1.id, room2.id, 5, true);

      expect(result).toBe('ok');

      const updated = getLayout(state, layout.layoutId);
      expect(typeof updated).not.toBe('string');
      if (typeof updated === 'string') return;

      const conn = updated.connections.find(
        (c) => c.fromRoomId === room1.id && c.toRoomId === room2.id,
      );
      expect(conn).toBeDefined();
      if (conn === undefined) return;
      expect(conn.traversalCost).toBe(5);
      expect(conn.bidirectional).toBe(true);
    });

    it('should return error for non-existent layout', () => {
      const result = connectRooms(state, 'fake-layout', 'room1', 'room2', 5, true);

      expect(result).toBe('layout-not-found');
    });

    it('should return error for non-existent from room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = connectRooms(
        state,
        layout.layoutId,
        'fake-room',
        layout.entryRoomId || '',
        5,
        true,
      );

      expect(result).toBe('room-not-found');
    });

    it('should return error for non-existent to room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = connectRooms(
        state,
        layout.layoutId,
        layout.entryRoomId || '',
        'fake-room',
        5,
        true,
      );

      expect(result).toBe('room-not-found');
    });

    it('should prevent duplicate connections', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const room1 = addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      const room2 = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof room1).not.toBe('string');
      expect(typeof room2).not.toBe('string');
      if (typeof room1 === 'string' || typeof room2 === 'string') return;

      connectRooms(state, layout.layoutId, room1.id, room2.id, 5, true);
      const result = connectRooms(state, layout.layoutId, room1.id, room2.id, 5, true);

      expect(result).toBe('connection-exists');
    });

    it('should log connection', () => {
      const logger = state.logger as TestLogger;
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const room1 = addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      const room2 = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof room1).not.toBe('string');
      expect(typeof room2).not.toBe('string');
      if (typeof room1 === 'string' || typeof room2 === 'string') return;

      connectRooms(state, layout.layoutId, room1.id, room2.id, 5, true);

      const hasLog = logger.logs.some((log) => log.includes('Connected rooms'));
      expect(hasLog).toBe(true);
    });

    it('should support unidirectional connections', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const room1 = addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      const room2 = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof room1).not.toBe('string');
      expect(typeof room2).not.toBe('string');
      if (typeof room1 === 'string' || typeof room2 === 'string') return;

      connectRooms(state, layout.layoutId, room1.id, room2.id, 5, false);

      const updated = getLayout(state, layout.layoutId);
      expect(typeof updated).not.toBe('string');
      if (typeof updated === 'string') return;

      const conn = updated.connections.find(
        (c) => c.fromRoomId === room1.id && c.toRoomId === room2.id,
      );
      expect(conn).toBeDefined();
      if (conn === undefined) return;
      expect(conn.bidirectional).toBe(false);
    });
  });

  describe('validateConnectivity', () => {
    it('should validate a valid layout', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = validateConnectivity(state, layout.layoutId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.hasEntry).toBe(true);
      expect(result.hasBoss).toBe(true);
    });

    it('should return error for non-existent layout', () => {
      const result = validateConnectivity(state, 'fake-layout');

      expect(result).toBe('layout-not-found');
    });

    it('should detect missing entry room', () => {
      const layout: DungeonLayout = {
        layoutId: 'test',
        rooms: new Map(),
        connections: [],
        entryRoomId: null,
        bossRoomId: 'boss-1',
        difficultyTier: 2,
        createdAt: 1000000n,
      };
      state.layouts.set('test', layout);

      const result = validateConnectivity(state, 'test');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.hasEntry).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should detect missing boss room', () => {
      const layout: DungeonLayout = {
        layoutId: 'test',
        rooms: new Map(),
        connections: [],
        entryRoomId: 'entry-1',
        bossRoomId: null,
        difficultyTier: 2,
        createdAt: 1000000n,
      };
      state.layouts.set('test', layout);

      const result = validateConnectivity(state, 'test');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.hasBoss).toBe(false);
      expect(result.isValid).toBe(false);
    });

    it('should detect unreachable rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const orphan = addRoom(state, layout.layoutId, 'CORRIDOR', 100, 100, 10, 10, 2);
      expect(typeof orphan).not.toBe('string');
      if (typeof orphan === 'string') return;

      const result = validateConnectivity(state, layout.layoutId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.allRoomsReachable).toBe(false);
      expect(result.unreachableRooms).toContain(orphan.id);
      expect(result.isValid).toBe(false);
    });

    it('should report errors', () => {
      const layout: DungeonLayout = {
        layoutId: 'test',
        rooms: new Map(),
        connections: [],
        entryRoomId: null,
        bossRoomId: null,
        difficultyTier: 2,
        createdAt: 1000000n,
      };
      state.layouts.set('test', layout);

      const result = validateConnectivity(state, 'test');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getLayout', () => {
    it('should retrieve a layout', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = getLayout(state, layout.layoutId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result).toEqual(layout);
    });

    it('should return error for non-existent layout', () => {
      const result = getLayout(state, 'fake-layout');

      expect(result).toBe('layout-not-found');
    });
  });

  describe('scaleDifficulty', () => {
    it('should scale difficulty up', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        difficultyTier: 1,
      };
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = scaleDifficulty(state, layout.layoutId, 4);

      expect(result).toBe('ok');

      const updated = getLayout(state, layout.layoutId);
      expect(typeof updated).not.toBe('string');
      if (typeof updated === 'string') return;

      expect(updated.difficultyTier).toBe(4);

      for (const room of updated.rooms.values()) {
        expect(room.difficultyTier).toBe(4);
      }
    });

    it('should scale difficulty down', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        difficultyTier: 5,
      };
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = scaleDifficulty(state, layout.layoutId, 1);

      expect(result).toBe('ok');

      const updated = getLayout(state, layout.layoutId);
      expect(typeof updated).not.toBe('string');
      if (typeof updated === 'string') return;

      expect(updated.difficultyTier).toBe(1);
    });

    it('should update enemy budgets', () => {
      const params: GenerationParams = {
        ...createBasicParams(),
        difficultyTier: 0,
      };
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const budget1 = getTotalEnemyBudget(state, layout.layoutId);

      scaleDifficulty(state, layout.layoutId, 5);

      const budget2 = getTotalEnemyBudget(state, layout.layoutId);

      expect(typeof budget1).toBe('number');
      expect(typeof budget2).toBe('number');
      if (typeof budget1 === 'string' || typeof budget2 === 'string') return;

      expect(budget2).toBeGreaterThan(budget1);
    });

    it('should return error for non-existent layout', () => {
      const result = scaleDifficulty(state, 'fake-layout', 3);

      expect(result).toBe('layout-not-found');
    });

    it('should return error for invalid difficulty', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = scaleDifficulty(state, layout.layoutId, 10 as never);

      expect(result).toBe('invalid-difficulty');
    });

    it('should log scaling', () => {
      const logger = state.logger as TestLogger;
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      scaleDifficulty(state, layout.layoutId, 4);

      const hasLog = logger.logs.some((log) => log.includes('Scaled difficulty'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getRoomsByType', () => {
    it('should retrieve rooms by type', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = getRoomsByType(state, layout.layoutId, 'TREASURE');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(params.treasureRoomCount);

      for (const room of result) {
        expect(room.type).toBe('TREASURE');
      }
    });

    it('should return empty array for non-existent type', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      addRoom(state, layout.layoutId, 'PUZZLE', 5, 5, 10, 10, 2);

      const result = getRoomsByType(state, layout.layoutId, 'SECRET');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      // May have secret rooms from generation chance
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return error for non-existent layout', () => {
      const result = getRoomsByType(state, 'fake-layout', 'CORRIDOR');

      expect(result).toBe('layout-not-found');
    });

    it('should handle entry room query', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = getRoomsByType(state, layout.layoutId, 'ENTRY');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(1);
      const entry = result[0];
      if (entry === undefined) return;
      expect(entry.type).toBe('ENTRY');
    });

    it('should handle boss room query', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = getRoomsByType(state, layout.layoutId, 'BOSS');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(1);
      const boss = result[0];
      if (boss === undefined) return;
      expect(boss.type).toBe('BOSS');
    });
  });

  describe('getPathBetween', () => {
    it('should find path between connected rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      if (layout.entryRoomId === null || layout.bossRoomId === null) return;

      const result = getPathBetween(state, layout.layoutId, layout.entryRoomId, layout.bossRoomId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBeGreaterThan(0);
      const first = result[0];
      const last = result[result.length - 1];
      if (first === undefined || last === undefined) return;
      expect(first).toBe(layout.entryRoomId);
      expect(last).toBe(layout.bossRoomId);
    });

    it('should return error for non-existent layout', () => {
      const result = getPathBetween(state, 'fake-layout', 'room1', 'room2');

      expect(result).toBe('layout-not-found');
    });

    it('should return error for non-existent from room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      if (layout.bossRoomId === null) return;

      const result = getPathBetween(state, layout.layoutId, 'fake-room', layout.bossRoomId);

      expect(result).toBe('room-not-found');
    });

    it('should return error for non-existent to room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      if (layout.entryRoomId === null) return;

      const result = getPathBetween(state, layout.layoutId, layout.entryRoomId, 'fake-room');

      expect(result).toBe('room-not-found');
    });

    it('should return error for unreachable room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const orphan = addRoom(state, layout.layoutId, 'CORRIDOR', 100, 100, 10, 10, 2);
      expect(typeof orphan).not.toBe('string');
      if (typeof orphan === 'string') return;

      if (layout.entryRoomId === null) return;

      const result = getPathBetween(state, layout.layoutId, layout.entryRoomId, orphan.id);

      expect(result).toBe('room-not-reachable');
    });
  });

  describe('getTotalEnemyBudget', () => {
    it('should calculate total enemy budget', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = getTotalEnemyBudget(state, layout.layoutId);

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBeGreaterThan(0);
    });

    it('should return error for non-existent layout', () => {
      const result = getTotalEnemyBudget(state, 'fake-layout');

      expect(result).toBe('layout-not-found');
    });

    it('should sum all room budgets', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      let manual = 0;
      for (const room of layout.rooms.values()) {
        manual += room.enemyBudget;
      }

      const result = getTotalEnemyBudget(state, layout.layoutId);

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(manual);
    });
  });

  describe('getRoom', () => {
    it('should retrieve a room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      if (layout.entryRoomId === null) return;

      const result = getRoom(state, layout.layoutId, layout.entryRoomId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.id).toBe(layout.entryRoomId);
      expect(result.type).toBe('ENTRY');
    });

    it('should return error for non-existent layout', () => {
      const result = getRoom(state, 'fake-layout', 'room-1');

      expect(result).toBe('layout-not-found');
    });

    it('should return error for non-existent room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const result = getRoom(state, layout.layoutId, 'fake-room');

      expect(result).toBe('room-not-found');
    });
  });

  describe('getAdjacentRooms', () => {
    it('should get adjacent rooms', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      if (layout.entryRoomId === null) return;

      const result = getAdjacentRooms(state, layout.layoutId, layout.entryRoomId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return error for non-existent layout', () => {
      const result = getAdjacentRooms(state, 'fake-layout', 'room-1');

      expect(result).toBe('layout-not-found');
    });

    it('should handle bidirectional connections', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const room1 = addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      const room2 = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof room1).not.toBe('string');
      expect(typeof room2).not.toBe('string');
      if (typeof room1 === 'string' || typeof room2 === 'string') return;

      connectRooms(state, layout.layoutId, room1.id, room2.id, 5, true);

      const result1 = getAdjacentRooms(state, layout.layoutId, room1.id);
      const result2 = getAdjacentRooms(state, layout.layoutId, room2.id);

      expect(typeof result1).not.toBe('string');
      expect(typeof result2).not.toBe('string');
      if (typeof result1 === 'string' || typeof result2 === 'string') return;

      expect(result1).toContain(room2.id);
      expect(result2).toContain(room1.id);
    });

    it('should handle unidirectional connections', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const room1 = addRoom(state, layout.layoutId, 'CORRIDOR', 0, 0, 10, 10, 2);
      const room2 = addRoom(state, layout.layoutId, 'CORRIDOR', 5, 5, 10, 10, 2);

      expect(typeof room1).not.toBe('string');
      expect(typeof room2).not.toBe('string');
      if (typeof room1 === 'string' || typeof room2 === 'string') return;

      connectRooms(state, layout.layoutId, room1.id, room2.id, 5, false);

      const result1 = getAdjacentRooms(state, layout.layoutId, room1.id);
      const result2 = getAdjacentRooms(state, layout.layoutId, room2.id);

      expect(typeof result1).not.toBe('string');
      expect(typeof result2).not.toBe('string');
      if (typeof result1 === 'string' || typeof result2 === 'string') return;

      expect(result1).toContain(room2.id);
      expect(result2).not.toContain(room1.id);
    });

    it('should return empty for isolated room', () => {
      const params = createBasicParams();
      const layout = generateLayout(state, params);
      expect(typeof layout).not.toBe('string');
      if (typeof layout === 'string') return;

      const isolated = addRoom(state, layout.layoutId, 'CORRIDOR', 100, 100, 10, 10, 2);
      expect(typeof isolated).not.toBe('string');
      if (typeof isolated === 'string') return;

      const result = getAdjacentRooms(state, layout.layoutId, isolated.id);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(0);
    });
  });
});
