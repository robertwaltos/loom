import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpawnBudgetState,
  setBudget,
  requestSpawn,
  recordDespawn,
  getBudgetReport,
  getQueueDepth,
  processQueue,
  emergencyPurge,
  refillBudgets,
  getAllReports,
  clearQueue,
  getQueueSnapshot,
  cancelRequest,
  getBudget,
  incrementActiveCount,
  getTotalActiveEntities,
  getTotalMaxEntities,
  type Clock,
  type IdGenerator,
  type Logger,
  type SpawnBudgetState,
} from '../spawn-budget.js';

// --- Test Doubles ---

class TestClock implements Clock {
  private time = 1000000n;

  nowMicros(): bigint {
    return this.time;
  }

  advance(micros: bigint): void {
    this.time += micros;
  }
}

class TestIdGenerator implements IdGenerator {
  private counter = 0;

  nextId(): string {
    this.counter += 1;
    return 'req-' + String(this.counter);
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

function createTestState(): SpawnBudgetState {
  return createSpawnBudgetState(new TestClock(), new TestIdGenerator(), new TestLogger());
}

// --- Tests ---

describe('SpawnBudget', () => {
  let state: SpawnBudgetState;

  beforeEach(() => {
    state = createTestState();
  });

  describe('createSpawnBudgetState', () => {
    it('should create initial state', () => {
      expect(state.budgets.size).toBe(0);
      expect(state.queues.size).toBe(0);
      expect(state.clock).toBeDefined();
      expect(state.idGen).toBeDefined();
      expect(state.logger).toBeDefined();
    });

    it('should accept custom ports', () => {
      const customClock = new TestClock();
      const customIdGen = new TestIdGenerator();
      const customLogger = new TestLogger();

      const custom = createSpawnBudgetState(customClock, customIdGen, customLogger);

      expect(custom.clock).toBe(customClock);
      expect(custom.idGen).toBe(customIdGen);
      expect(custom.logger).toBe(customLogger);
    });
  });

  describe('setBudget', () => {
    it('should create a budget', () => {
      const result = setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.maxNpc).toBe(100);
      expect(result.maxMonster).toBe(200);
      expect(result.maxCreature).toBe(50);
      expect(result.maxItem).toBe(500);
      expect(result.maxStructure).toBe(10);
      expect(result.refillRateMicros).toBe(60000000n);
    });

    it('should initialize active counts to zero', () => {
      const result = setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.activeNpc).toBe(0);
      expect(result.activeMonster).toBe(0);
      expect(result.activeCreature).toBe(0);
      expect(result.activeItem).toBe(0);
      expect(result.activeStructure).toBe(0);
    });

    it('should store budget in state', () => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      const stored = state.budgets.get('world-1');
      expect(stored).toBeDefined();
    });

    it('should return error for invalid refill rate', () => {
      const result = setBudget(state, 'world-1', 100, 200, 50, 500, 10, 0n);

      expect(result).toBe('invalid-refill-rate');
    });

    it('should update existing budget', () => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      incrementActiveCount(state, 'world-1', 'NPC', 50);

      const result = setBudget(state, 'world-1', 200, 300, 100, 1000, 20, 60000000n);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.maxNpc).toBe(200);
      expect(result.activeNpc).toBe(50);
    });

    it('should log budget creation', () => {
      const logger = state.logger as TestLogger;
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      const hasLog = logger.logs.some((log) => log.includes('Set budget'));
      expect(hasLog).toBe(true);
    });

    it('should set last refill time', () => {
      const result = setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.lastRefillAt).toBeGreaterThan(0n);
    });
  });

  describe('requestSpawn', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should queue a spawn request', () => {
      const result = requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.category).toBe('NPC');
      expect(result.priority).toBe('NORMAL');
      expect(result.entityType).toBe('villager');
      expect(result.count).toBe(5);
    });

    it('should generate unique request IDs', () => {
      const req1 = requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);
      const req2 = requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);

      expect(typeof req1).not.toBe('string');
      expect(typeof req2).not.toBe('string');
      if (typeof req1 === 'string' || typeof req2 === 'string') return;

      expect(req1.requestId).not.toBe(req2.requestId);
    });

    it('should return error for non-existent budget', () => {
      const result = requestSpawn(state, 'fake-world', 'NPC', 'NORMAL', 'villager', 5);

      expect(result).toBe('budget-not-found');
    });

    it('should return error for invalid count', () => {
      const result = requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 0);

      expect(result).toBe('invalid-count');
    });

    it('should return error for invalid priority', () => {
      const result = requestSpawn(state, 'world-1', 'NPC', 'INVALID' as never, 'villager', 5);

      expect(result).toBe('invalid-priority');
    });

    it('should return error for invalid category', () => {
      const result = requestSpawn(state, 'world-1', 'INVALID' as never, 'NORMAL', 'villager', 5);

      expect(result).toBe('invalid-category');
    });

    it('should log request', () => {
      const logger = state.logger as TestLogger;
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);

      const hasLog = logger.logs.some((log) => log.includes('Spawn request queued'));
      expect(hasLog).toBe(true);
    });

    it('should order by priority', () => {
      requestSpawn(state, 'world-1', 'NPC', 'LOW', 'villager', 1);
      requestSpawn(state, 'world-1', 'NPC', 'CRITICAL', 'guard', 1);
      requestSpawn(state, 'world-1', 'NPC', 'HIGH', 'merchant', 1);

      const queue = state.queues.get('world-1');
      expect(queue).toBeDefined();
      if (queue === undefined) return;

      const priorities = queue.map((r) => r.priority);
      expect(priorities).toEqual(['CRITICAL', 'HIGH', 'LOW']);
    });

    it('should support all priorities', () => {
      requestSpawn(state, 'world-1', 'NPC', 'CRITICAL', 'boss', 1);
      requestSpawn(state, 'world-1', 'NPC', 'HIGH', 'elite', 1);
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'npc', 1);
      requestSpawn(state, 'world-1', 'NPC', 'LOW', 'critter', 1);
      requestSpawn(state, 'world-1', 'NPC', 'BACKGROUND', 'ambient', 1);

      const queue = state.queues.get('world-1');
      expect(queue).toBeDefined();
      if (queue === undefined) return;

      expect(queue.length).toBe(5);
    });

    it('should support all categories', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 1);
      requestSpawn(state, 'world-1', 'MONSTER', 'NORMAL', 'goblin', 1);
      requestSpawn(state, 'world-1', 'CREATURE', 'NORMAL', 'deer', 1);
      requestSpawn(state, 'world-1', 'ITEM', 'NORMAL', 'sword', 1);
      requestSpawn(state, 'world-1', 'STRUCTURE', 'NORMAL', 'tower', 1);

      const queue = state.queues.get('world-1');
      expect(queue).toBeDefined();
      if (queue === undefined) return;

      expect(queue.length).toBe(5);
    });
  });

  describe('recordDespawn', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      incrementActiveCount(state, 'world-1', 'NPC', 50);
      incrementActiveCount(state, 'world-1', 'MONSTER', 100);
    });

    it('should decrement active count', () => {
      const result = recordDespawn(state, 'world-1', 'NPC', 10);

      expect(result).toBe('ok');

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(40);
    });

    it('should not go below zero', () => {
      recordDespawn(state, 'world-1', 'NPC', 100);

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(0);
    });

    it('should return error for non-existent budget', () => {
      const result = recordDespawn(state, 'fake-world', 'NPC', 10);

      expect(result).toBe('budget-not-found');
    });

    it('should return error for invalid count', () => {
      const result = recordDespawn(state, 'world-1', 'NPC', 0);

      expect(result).toBe('invalid-count');
    });

    it('should return error for invalid category', () => {
      const result = recordDespawn(state, 'world-1', 'INVALID' as never, 10);

      expect(result).toBe('invalid-category');
    });

    it('should log despawn', () => {
      const logger = state.logger as TestLogger;
      recordDespawn(state, 'world-1', 'NPC', 10);

      const hasLog = logger.logs.some((log) => log.includes('Despawn recorded'));
      expect(hasLog).toBe(true);
    });

    it('should handle all categories', () => {
      incrementActiveCount(state, 'world-1', 'CREATURE', 20);
      incrementActiveCount(state, 'world-1', 'ITEM', 200);
      incrementActiveCount(state, 'world-1', 'STRUCTURE', 5);

      recordDespawn(state, 'world-1', 'NPC', 10);
      recordDespawn(state, 'world-1', 'MONSTER', 20);
      recordDespawn(state, 'world-1', 'CREATURE', 5);
      recordDespawn(state, 'world-1', 'ITEM', 50);
      recordDespawn(state, 'world-1', 'STRUCTURE', 2);

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(40);
      expect(budget.activeMonster).toBe(80);
      expect(budget.activeCreature).toBe(15);
      expect(budget.activeItem).toBe(150);
      expect(budget.activeStructure).toBe(3);
    });
  });

  describe('getBudgetReport', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      incrementActiveCount(state, 'world-1', 'NPC', 75);
    });

    it('should generate a report', () => {
      const result = getBudgetReport(state, 'world-1', 'NPC');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.category).toBe('NPC');
      expect(result.active).toBe(75);
      expect(result.max).toBe(100);
      expect(result.available).toBe(25);
      expect(result.utilizationPercent).toBe(75);
    });

    it('should calculate utilization percentage', () => {
      const result = getBudgetReport(state, 'world-1', 'NPC');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.utilizationPercent).toBeCloseTo(75);
    });

    it('should include queue depth', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'guard', 3);

      const result = getBudgetReport(state, 'world-1', 'NPC');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.queueDepth).toBe(2);
    });

    it('should return error for non-existent budget', () => {
      const result = getBudgetReport(state, 'fake-world', 'NPC');

      expect(result).toBe('budget-not-found');
    });

    it('should return error for invalid category', () => {
      const result = getBudgetReport(state, 'world-1', 'INVALID' as never);

      expect(result).toBe('invalid-category');
    });

    it('should handle zero max', () => {
      setBudget(state, 'world-2', 0, 0, 0, 0, 0, 60000000n);

      const result = getBudgetReport(state, 'world-2', 'NPC');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.utilizationPercent).toBe(0);
    });

    it('should report all categories correctly', () => {
      incrementActiveCount(state, 'world-1', 'MONSTER', 150);
      incrementActiveCount(state, 'world-1', 'CREATURE', 25);
      incrementActiveCount(state, 'world-1', 'ITEM', 400);
      incrementActiveCount(state, 'world-1', 'STRUCTURE', 8);

      const npcReport = getBudgetReport(state, 'world-1', 'NPC');
      const monsterReport = getBudgetReport(state, 'world-1', 'MONSTER');
      const creatureReport = getBudgetReport(state, 'world-1', 'CREATURE');
      const itemReport = getBudgetReport(state, 'world-1', 'ITEM');
      const structureReport = getBudgetReport(state, 'world-1', 'STRUCTURE');

      expect(typeof npcReport).not.toBe('string');
      expect(typeof monsterReport).not.toBe('string');
      expect(typeof creatureReport).not.toBe('string');
      expect(typeof itemReport).not.toBe('string');
      expect(typeof structureReport).not.toBe('string');
      if (
        typeof npcReport === 'string' ||
        typeof monsterReport === 'string' ||
        typeof creatureReport === 'string' ||
        typeof itemReport === 'string' ||
        typeof structureReport === 'string'
      )
        return;

      expect(npcReport.active).toBe(75);
      expect(monsterReport.active).toBe(150);
      expect(creatureReport.active).toBe(25);
      expect(itemReport.active).toBe(400);
      expect(structureReport.active).toBe(8);
    });
  });

  describe('getQueueDepth', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should return queue depth', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);
      requestSpawn(state, 'world-1', 'MONSTER', 'HIGH', 'dragon', 1);

      const result = getQueueDepth(state, 'world-1');

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(2);
    });

    it('should return zero for empty queue', () => {
      const result = getQueueDepth(state, 'world-1');

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(0);
    });

    it('should return error for non-existent budget', () => {
      const result = getQueueDepth(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });
  });

  describe('processQueue', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should process spawn requests', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 10);
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'guard', 5);

      const result = processQueue(state, 'world-1', 10);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(2);
    });

    it('should increment active counts', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 10);

      processQueue(state, 'world-1', 10);

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(10);
    });

    it('should respect max to process', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 1);
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'guard', 1);
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'merchant', 1);

      const result = processQueue(state, 'world-1', 2);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(2);

      const depth = getQueueDepth(state, 'world-1');
      expect(typeof depth).toBe('number');
      if (typeof depth === 'string') return;

      expect(depth).toBe(1);
    });

    it('should skip requests exceeding budget', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 150);

      const result = processQueue(state, 'world-1', 10);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(0);
    });

    it('should return error for non-existent budget', () => {
      const result = processQueue(state, 'fake-world', 10);

      expect(result).toBe('budget-not-found');
    });

    it('should return empty array for empty queue', () => {
      const result = processQueue(state, 'world-1', 10);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(0);
    });

    it('should log processed requests', () => {
      const logger = state.logger as TestLogger;
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 10);

      processQueue(state, 'world-1', 10);

      const hasLog = logger.logs.some((log) => log.includes('Processed spawn request'));
      expect(hasLog).toBe(true);
    });

    it('should process by priority order', () => {
      requestSpawn(state, 'world-1', 'NPC', 'LOW', 'villager', 10);
      requestSpawn(state, 'world-1', 'NPC', 'CRITICAL', 'boss', 5);
      requestSpawn(state, 'world-1', 'NPC', 'HIGH', 'elite', 8);

      const result = processQueue(state, 'world-1', 2);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result[0]?.priority).toBe('CRITICAL');
      expect(result[1]?.priority).toBe('HIGH');
    });

    it('should not exceed budget', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 60);
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'guard', 60);

      processQueue(state, 'world-1', 10);

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBeLessThanOrEqual(budget.maxNpc);
    });
  });

  describe('emergencyPurge', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      incrementActiveCount(state, 'world-1', 'NPC', 80);
    });

    it('should purge entities', () => {
      const result = emergencyPurge(state, 'world-1', 'NPC', 50);

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(30);

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(50);
    });

    it('should not purge below target', () => {
      const result = emergencyPurge(state, 'world-1', 'NPC', 90);

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(0);
    });

    it('should return error for non-existent budget', () => {
      const result = emergencyPurge(state, 'fake-world', 'NPC', 50);

      expect(result).toBe('budget-not-found');
    });

    it('should return error for invalid category', () => {
      const result = emergencyPurge(state, 'world-1', 'INVALID' as never, 50);

      expect(result).toBe('invalid-category');
    });

    it('should log purge', () => {
      const logger = state.logger as TestLogger;
      emergencyPurge(state, 'world-1', 'NPC', 50);

      const hasLog = logger.logs.some((log) => log.includes('Emergency purge'));
      expect(hasLog).toBe(true);
    });

    it('should purge to zero if target is zero', () => {
      const result = emergencyPurge(state, 'world-1', 'NPC', 0);

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(80);

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(0);
    });
  });

  describe('refillBudgets', () => {
    it('should refill after elapsed time', () => {
      const clock = state.clock as TestClock;
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      incrementActiveCount(state, 'world-1', 'NPC', 50);

      clock.advance(120000000n);

      const result = refillBudgets(state, 'world-1');

      expect(result).toBe('ok');

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBeLessThan(50);
    });

    it('should not refill before elapsed time', () => {
      const clock = state.clock as TestClock;
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      incrementActiveCount(state, 'world-1', 'NPC', 50);

      clock.advance(30000000n);

      refillBudgets(state, 'world-1');

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(50);
    });

    it('should return error for non-existent budget', () => {
      const result = refillBudgets(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });

    it('should update last refill time', () => {
      const clock = state.clock as TestClock;
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      const before = getBudget(state, 'world-1');
      expect(typeof before).not.toBe('string');
      if (typeof before === 'string') return;

      clock.advance(120000000n);
      refillBudgets(state, 'world-1');

      const after = getBudget(state, 'world-1');
      expect(typeof after).not.toBe('string');
      if (typeof after === 'string') return;

      expect(after.lastRefillAt).toBeGreaterThan(before.lastRefillAt);
    });

    it('should log refill', () => {
      const clock = state.clock as TestClock;
      const logger = state.logger as TestLogger;
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      clock.advance(120000000n);
      refillBudgets(state, 'world-1');

      const hasLog = logger.logs.some((log) => log.includes('Refilled budgets'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getAllReports', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should return reports for all categories', () => {
      const result = getAllReports(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.length).toBe(5);

      const categories = result.map((r) => r.category);
      expect(categories).toContain('NPC');
      expect(categories).toContain('MONSTER');
      expect(categories).toContain('CREATURE');
      expect(categories).toContain('ITEM');
      expect(categories).toContain('STRUCTURE');
    });

    it('should return error for non-existent budget', () => {
      const result = getAllReports(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });
  });

  describe('clearQueue', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);
      requestSpawn(state, 'world-1', 'MONSTER', 'HIGH', 'dragon', 1);
    });

    it('should clear queue', () => {
      const result = clearQueue(state, 'world-1');

      expect(result).toBe('ok');

      const depth = getQueueDepth(state, 'world-1');
      expect(typeof depth).toBe('number');
      if (typeof depth === 'string') return;

      expect(depth).toBe(0);
    });

    it('should return error for non-existent budget', () => {
      const result = clearQueue(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });

    it('should log clear', () => {
      const logger = state.logger as TestLogger;
      clearQueue(state, 'world-1');

      const hasLog = logger.logs.some((log) => log.includes('Cleared spawn queue'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getQueueSnapshot', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should return queue snapshot', () => {
      requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);
      requestSpawn(state, 'world-1', 'MONSTER', 'HIGH', 'dragon', 1);

      const result = getQueueSnapshot(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.totalPending).toBe(2);
      expect(result.requests.length).toBe(2);
    });

    it('should return error for non-existent budget', () => {
      const result = getQueueSnapshot(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });

    it('should return empty snapshot for empty queue', () => {
      const result = getQueueSnapshot(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.totalPending).toBe(0);
      expect(result.requests.length).toBe(0);
    });
  });

  describe('cancelRequest', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should cancel a request', () => {
      const req = requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);
      expect(typeof req).not.toBe('string');
      if (typeof req === 'string') return;

      const result = cancelRequest(state, 'world-1', req.requestId);

      expect(result).toBe('ok');

      const depth = getQueueDepth(state, 'world-1');
      expect(typeof depth).toBe('number');
      if (typeof depth === 'string') return;

      expect(depth).toBe(0);
    });

    it('should return error for non-existent budget', () => {
      const result = cancelRequest(state, 'fake-world', 'req-1');

      expect(result).toBe('budget-not-found');
    });

    it('should return error for non-existent request', () => {
      const result = cancelRequest(state, 'world-1', 'fake-req');

      expect(result).toBe('request-not-found');
    });

    it('should log cancellation', () => {
      const logger = state.logger as TestLogger;
      const req = requestSpawn(state, 'world-1', 'NPC', 'NORMAL', 'villager', 5);
      expect(typeof req).not.toBe('string');
      if (typeof req === 'string') return;

      cancelRequest(state, 'world-1', req.requestId);

      const hasLog = logger.logs.some((log) => log.includes('Cancelled spawn request'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getBudget', () => {
    it('should retrieve a budget', () => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);

      const result = getBudget(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
    });

    it('should return error for non-existent budget', () => {
      const result = getBudget(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });
  });

  describe('incrementActiveCount', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should increment active count', () => {
      const result = incrementActiveCount(state, 'world-1', 'NPC', 25);

      expect(result).toBe('ok');

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(25);
    });

    it('should not exceed max', () => {
      incrementActiveCount(state, 'world-1', 'NPC', 150);

      const budget = getBudget(state, 'world-1');
      expect(typeof budget).not.toBe('string');
      if (typeof budget === 'string') return;

      expect(budget.activeNpc).toBe(100);
    });

    it('should return error for non-existent budget', () => {
      const result = incrementActiveCount(state, 'fake-world', 'NPC', 10);

      expect(result).toBe('budget-not-found');
    });

    it('should return error for invalid count', () => {
      const result = incrementActiveCount(state, 'world-1', 'NPC', 0);

      expect(result).toBe('invalid-count');
    });

    it('should return error for invalid category', () => {
      const result = incrementActiveCount(state, 'world-1', 'INVALID' as never, 10);

      expect(result).toBe('invalid-category');
    });

    it('should log increment', () => {
      const logger = state.logger as TestLogger;
      incrementActiveCount(state, 'world-1', 'NPC', 25);

      const hasLog = logger.logs.some((log) => log.includes('Incremented active'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getTotalActiveEntities', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
      incrementActiveCount(state, 'world-1', 'NPC', 50);
      incrementActiveCount(state, 'world-1', 'MONSTER', 100);
      incrementActiveCount(state, 'world-1', 'CREATURE', 25);
      incrementActiveCount(state, 'world-1', 'ITEM', 300);
      incrementActiveCount(state, 'world-1', 'STRUCTURE', 8);
    });

    it('should calculate total active entities', () => {
      const result = getTotalActiveEntities(state, 'world-1');

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(483);
    });

    it('should return error for non-existent budget', () => {
      const result = getTotalActiveEntities(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });

    it('should return zero for fresh budget', () => {
      setBudget(state, 'world-2', 100, 200, 50, 500, 10, 60000000n);

      const result = getTotalActiveEntities(state, 'world-2');

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(0);
    });
  });

  describe('getTotalMaxEntities', () => {
    beforeEach(() => {
      setBudget(state, 'world-1', 100, 200, 50, 500, 10, 60000000n);
    });

    it('should calculate total max entities', () => {
      const result = getTotalMaxEntities(state, 'world-1');

      expect(typeof result).toBe('number');
      if (typeof result === 'string') return;

      expect(result).toBe(860);
    });

    it('should return error for non-existent budget', () => {
      const result = getTotalMaxEntities(state, 'fake-world');

      expect(result).toBe('budget-not-found');
    });
  });
});
