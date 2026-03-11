import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWormholeState,
  createWormhole,
  injectEnergy,
  degradeStability,
  checkCollapse,
  getStabilityLevel,
  getStabilityReport,
  getCollapseHistory,
  getCollapseHistoryForWorld,
  setDecayRate,
  getAllWormholes,
  getActiveWormholes,
  getCriticalWormholes,
  getStabilizationEvents,
  getTotalEnergySpent,
  getWormholeCount,
  getCollapseCount,
  getWormhole,
  emergencyStabilization,
  batchDegrade,
  getWormholesForWorld,
  getAverageStability,
  type WormholeState,
  type Clock,
  type IdGenerator,
  type Logger,
  type StabilityLevel,
} from '../wormhole-stabilizer.js';

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
    return 'wormhole-' + String(this.counter);
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

describe('Wormhole Stabilizer', () => {
  let state: WormholeState;
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    state = createWormholeState();
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('createWormholeState', () => {
    it('creates empty state', () => {
      expect(state.wormholes.size).toBe(0);
      expect(state.events.length).toBe(0);
      expect(state.collapses.length).toBe(0);
      expect(state.totalEnergySpent).toBe(0n);
      expect(state.decayMultiplier).toBe(100n);
    });
  });

  describe('createWormhole', () => {
    it('creates wormhole with valid parameters', () => {
      const result = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      );

      expect(result).toBe('wormhole-1');
      expect(state.wormholes.size).toBe(1);
    });

    it('creates wormhole with correct properties', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-alpha',
        'world-beta',
        20000n,
        200n,
      );

      const wormhole = state.wormholes.get(id as string);
      expect(wormhole).toBeDefined();
      if (wormhole === undefined) return;

      expect(wormhole.id).toBe('wormhole-1');
      expect(wormhole.originWorldId).toBe('world-alpha');
      expect(wormhole.destinationWorldId).toBe('world-beta');
      expect(wormhole.energy).toBe(20000n);
      expect(wormhole.baseDecayRate).toBe(200n);
      expect(wormhole.stability).toBe(100n);
      expect(wormhole.createdAt).toBe(1000000n);
      expect(wormhole.collapsedAt).toBeUndefined();
    });

    it('rejects zero initial energy', () => {
      const result = createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 0n, 100n);

      expect(result).toBe('invalid-energy');
      expect(state.wormholes.size).toBe(0);
      expect(logger.errors.length).toBe(1);
    });

    it('rejects negative initial energy', () => {
      const result = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        -5000n,
        100n,
      );

      expect(result).toBe('invalid-energy');
    });

    it('rejects zero decay rate', () => {
      const result = createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 0n);

      expect(result).toBe('invalid-decay-rate');
      expect(state.wormholes.size).toBe(0);
    });

    it('rejects negative decay rate', () => {
      const result = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        -100n,
      );

      expect(result).toBe('invalid-decay-rate');
    });

    it('logs wormhole creation', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('Created wormhole');
    });

    it('generates unique IDs for multiple wormholes', () => {
      const id1 = createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      const id2 = createWormhole(state, clock, idGen, logger, 'world-3', 'world-4', 10000n, 100n);

      expect(id1).not.toBe(id2);
      expect(state.wormholes.size).toBe(2);
    });
  });

  describe('injectEnergy', () => {
    it('injects energy into wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const result = injectEnergy(state, clock, logger, id, 5000n);

      expect(result).toBe('success');

      const wormhole = state.wormholes.get(id);
      expect(wormhole?.energy).toBe(15000n);
    });

    it('increases stability with energy injection', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 50n;

      injectEnergy(state, clock, logger, id, 10000n);

      expect(wormhole.stability).toBe(60n);
    });

    it('caps stability at 100', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 95n;

      injectEnergy(state, clock, logger, id, 100000n);

      expect(wormhole.stability).toBe(100n);
    });

    it('creates stabilization event', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      injectEnergy(state, clock, logger, id, 5000n);

      expect(state.events.length).toBe(1);

      const event = state.events[0];
      expect(event?.wormholeId).toBe(id);
      expect(event?.energyInjected).toBe(5000n);
      expect(event?.stabilityBefore).toBe(100n);
      expect(event?.stabilityAfter).toBe(100n);
    });

    it('updates total energy spent', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      injectEnergy(state, clock, logger, id, 3000n);
      injectEnergy(state, clock, logger, id, 2000n);

      expect(state.totalEnergySpent).toBe(5000n);
    });

    it('rejects zero energy injection', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const result = injectEnergy(state, clock, logger, id, 0n);

      expect(result).toBe('invalid-energy');
      expect(state.events.length).toBe(0);
    });

    it('rejects negative energy injection', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const result = injectEnergy(state, clock, logger, id, -1000n);

      expect(result).toBe('invalid-energy');
    });

    it('rejects injection into nonexistent wormhole', () => {
      const result = injectEnergy(state, clock, logger, 'fake-id', 5000n);

      expect(result).toBe('wormhole-not-found');
      expect(logger.errors.length).toBe(1);
    });

    it('rejects injection into collapsed wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.collapsedAt = clock.now();

      const result = injectEnergy(state, clock, logger, id, 5000n);

      expect(result).toBe('wormhole-collapsed');
    });
  });

  describe('degradeStability', () => {
    it('drains energy over time', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      degradeStability(state, clock, logger, id);

      const wormhole = state.wormholes.get(id);
      expect(wormhole?.energy).toBe(9900n);
    });

    it('reduces stability when energy is low', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        1000n,
        100n,
      ) as string;

      degradeStability(state, clock, logger, id);

      const wormhole = state.wormholes.get(id);
      expect(wormhole?.stability).toBe(95n);
    });

    it('collapses wormhole when stability reaches zero', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 5n;

      degradeStability(state, clock, logger, id);

      expect(wormhole.collapsedAt).toBeDefined();
      expect(state.collapses.length).toBe(1);
    });

    it('does not go below zero energy', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        50n,
        100n,
      ) as string;

      degradeStability(state, clock, logger, id);

      const wormhole = state.wormholes.get(id);
      expect(wormhole?.energy).toBe(0n);
    });

    it('does not go below zero stability', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 2n;

      degradeStability(state, clock, logger, id);

      expect(wormhole.stability).toBe(0n);
    });

    it('respects decay multiplier', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      setDecayRate(state, logger, 200n);
      degradeStability(state, clock, logger, id);

      const wormhole = state.wormholes.get(id);
      expect(wormhole?.energy).toBe(9800n);
    });

    it('logs collapse warning', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 5n;

      degradeStability(state, clock, logger, id);

      expect(logger.warnings.length).toBe(1);
      expect(logger.warnings[0]).toContain('collapsed');
    });

    it('returns error for nonexistent wormhole', () => {
      const result = degradeStability(state, clock, logger, 'fake-id');

      expect(result).toBe('wormhole-not-found');
    });

    it('returns error for already collapsed wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.collapsedAt = clock.now();

      const result = degradeStability(state, clock, logger, id);

      expect(result).toBe('wormhole-collapsed');
    });
  });

  describe('checkCollapse', () => {
    it('returns false for active wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const result = checkCollapse(state, id);

      expect(result).toBe(false);
    });

    it('returns true for collapsed wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.collapsedAt = clock.now();

      const result = checkCollapse(state, id);

      expect(result).toBe(true);
    });

    it('returns error for nonexistent wormhole', () => {
      const result = checkCollapse(state, 'fake-id');

      expect(result).toBe('wormhole-not-found');
    });
  });

  describe('getStabilityLevel', () => {
    it('returns STABLE for stability >= 70', () => {
      expect(getStabilityLevel(70n)).toBe('STABLE');
      expect(getStabilityLevel(100n)).toBe('STABLE');
    });

    it('returns DEGRADING for stability 40-69', () => {
      expect(getStabilityLevel(40n)).toBe('DEGRADING');
      expect(getStabilityLevel(69n)).toBe('DEGRADING');
    });

    it('returns UNSTABLE for stability 20-39', () => {
      expect(getStabilityLevel(20n)).toBe('UNSTABLE');
      expect(getStabilityLevel(39n)).toBe('UNSTABLE');
    });

    it('returns CRITICAL for stability 1-19', () => {
      expect(getStabilityLevel(1n)).toBe('CRITICAL');
      expect(getStabilityLevel(19n)).toBe('CRITICAL');
    });

    it('returns COLLAPSED for stability 0', () => {
      expect(getStabilityLevel(0n)).toBe('COLLAPSED');
    });
  });

  describe('getStabilityReport', () => {
    it('returns report for active wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const report = getStabilityReport(state, id);

      expect(report).not.toBe('wormhole-not-found');
      if (typeof report === 'string') return;

      expect(report.wormholeId).toBe(id);
      expect(report.currentEnergy).toBe(10000n);
      expect(report.stability).toBe(100n);
      expect(report.level).toBe('STABLE');
    });

    it('returns COLLAPSED time for collapsed wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 0n;
      wormhole.collapsedAt = clock.now();

      const report = getStabilityReport(state, id);

      expect(report).not.toBe('wormhole-not-found');
      if (typeof report === 'string') return;

      expect(report.timeToCollapse).toBe('COLLAPSED');
    });

    it('returns STABLE time for healthy wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        20000n,
        100n,
      ) as string;

      const report = getStabilityReport(state, id);

      expect(report).not.toBe('wormhole-not-found');
      if (typeof report === 'string') return;

      expect(report.timeToCollapse).toBe('STABLE');
    });

    it('estimates time to collapse for degrading wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        1000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 30n;

      const report = getStabilityReport(state, id);

      expect(report).not.toBe('wormhole-not-found');
      if (typeof report === 'string') return;

      expect(typeof report.timeToCollapse).toBe('bigint');
      expect(report.timeToCollapse).toBeGreaterThan(0n);
    });

    it('returns error for nonexistent wormhole', () => {
      const result = getStabilityReport(state, 'fake-id');

      expect(result).toBe('wormhole-not-found');
    });
  });

  describe('getCollapseHistory', () => {
    it('returns empty array initially', () => {
      const history = getCollapseHistory(state);

      expect(history.length).toBe(0);
    });

    it('returns collapse records', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 5n;

      degradeStability(state, clock, logger, id);

      const history = getCollapseHistory(state);

      expect(history.length).toBe(1);
      expect(history[0]?.wormholeId).toBe(id);
    });

    it('includes energy spent in collapse record', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      injectEnergy(state, clock, logger, id, 5000n);
      injectEnergy(state, clock, logger, id, 3000n);

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 1n;

      degradeStability(state, clock, logger, id);

      const history = getCollapseHistory(state);

      expect(history[0]?.totalEnergySpent).toBe(8000n);
    });

    it('includes lifespan in collapse record', () => {
      clock.set(2000000n);

      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      clock.advance(500000n);

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 5n;

      degradeStability(state, clock, logger, id);

      const history = getCollapseHistory(state);

      expect(history[0]?.lifespan).toBe(500000n);
    });
  });

  describe('getCollapseHistoryForWorld', () => {
    it('returns collapses for origin world', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-alpha',
        'world-beta',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 5n;

      degradeStability(state, clock, logger, id);

      const history = getCollapseHistoryForWorld(state, 'world-alpha');

      expect(history.length).toBe(1);
    });

    it('returns collapses for destination world', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-alpha',
        'world-beta',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 5n;

      degradeStability(state, clock, logger, id);

      const history = getCollapseHistoryForWorld(state, 'world-beta');

      expect(history.length).toBe(1);
    });

    it('filters out other worlds', () => {
      const id1 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const id2 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-3',
        'world-4',
        100n,
        100n,
      ) as string;

      const wh1 = state.wormholes.get(id1);
      const wh2 = state.wormholes.get(id2);
      if (wh1 === undefined || wh2 === undefined) return;

      wh1.stability = 5n;
      wh2.stability = 5n;

      degradeStability(state, clock, logger, id1);
      degradeStability(state, clock, logger, id2);

      const history = getCollapseHistoryForWorld(state, 'world-1');

      expect(history.length).toBe(1);
      expect(history[0]?.wormholeId).toBe(id1);
    });
  });

  describe('setDecayRate', () => {
    it('sets decay multiplier', () => {
      const result = setDecayRate(state, logger, 150n);

      expect(result).toBe('success');
      expect(state.decayMultiplier).toBe(150n);
    });

    it('rejects zero multiplier', () => {
      const result = setDecayRate(state, logger, 0n);

      expect(result).toBe('invalid-decay-rate');
      expect(state.decayMultiplier).toBe(100n);
    });

    it('rejects negative multiplier', () => {
      const result = setDecayRate(state, logger, -50n);

      expect(result).toBe('invalid-decay-rate');
    });

    it('logs multiplier change', () => {
      setDecayRate(state, logger, 200n);

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('200');
    });
  });

  describe('getAllWormholes', () => {
    it('returns all wormholes', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      createWormhole(state, clock, idGen, logger, 'world-3', 'world-4', 10000n, 100n);

      const all = getAllWormholes(state);

      expect(all.length).toBe(2);
    });

    it('includes collapsed wormholes', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 0n;
      wormhole.collapsedAt = clock.now();

      const all = getAllWormholes(state);

      expect(all.length).toBe(1);
    });
  });

  describe('getActiveWormholes', () => {
    it('returns only active wormholes', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      const id2 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-3',
        'world-4',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id2);
      if (wormhole === undefined) return;
      wormhole.collapsedAt = clock.now();

      const active = getActiveWormholes(state);

      expect(active.length).toBe(1);
      expect(active[0]?.id).toBe('wormhole-1');
    });
  });

  describe('getCriticalWormholes', () => {
    it('returns wormholes with stability < 20', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 15n;

      const critical = getCriticalWormholes(state);

      expect(critical.length).toBe(1);
    });

    it('excludes stable wormholes', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      const critical = getCriticalWormholes(state);

      expect(critical.length).toBe(0);
    });

    it('excludes collapsed wormholes', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 10n;
      wormhole.collapsedAt = clock.now();

      const critical = getCriticalWormholes(state);

      expect(critical.length).toBe(0);
    });
  });

  describe('getStabilizationEvents', () => {
    it('returns events for specific wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      injectEnergy(state, clock, logger, id, 5000n);
      injectEnergy(state, clock, logger, id, 3000n);

      const events = getStabilizationEvents(state, id);

      expect(events.length).toBe(2);
      expect(events[0]?.energyInjected).toBe(5000n);
      expect(events[1]?.energyInjected).toBe(3000n);
    });

    it('filters events by wormhole ID', () => {
      const id1 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const id2 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-3',
        'world-4',
        10000n,
        100n,
      ) as string;

      injectEnergy(state, clock, logger, id1, 5000n);
      injectEnergy(state, clock, logger, id2, 3000n);

      const events = getStabilizationEvents(state, id1);

      expect(events.length).toBe(1);
      expect(events[0]?.wormholeId).toBe(id1);
    });
  });

  describe('getTotalEnergySpent', () => {
    it('returns total energy across all wormholes', () => {
      const id1 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const id2 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-3',
        'world-4',
        10000n,
        100n,
      ) as string;

      injectEnergy(state, clock, logger, id1, 5000n);
      injectEnergy(state, clock, logger, id2, 3000n);

      expect(getTotalEnergySpent(state)).toBe(8000n);
    });
  });

  describe('emergencyStabilization', () => {
    it('injects large amount of energy', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        1000n,
        100n,
      ) as string;

      emergencyStabilization(state, clock, logger, id);

      const wormhole = state.wormholes.get(id);
      expect(wormhole?.energy).toBeGreaterThan(40000n);
    });

    it('logs emergency action', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        1000n,
        100n,
      ) as string;

      emergencyStabilization(state, clock, logger, id);

      expect(logger.warnings.length).toBe(1);
      expect(logger.warnings[0]).toContain('Emergency');
    });

    it('returns error for nonexistent wormhole', () => {
      const result = emergencyStabilization(state, clock, logger, 'fake-id');

      expect(result).toBe('wormhole-not-found');
    });

    it('returns error for collapsed wormhole', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        1000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.collapsedAt = clock.now();

      const result = emergencyStabilization(state, clock, logger, id);

      expect(result).toBe('wormhole-collapsed');
    });
  });

  describe('batchDegrade', () => {
    it('degrades all active wormholes', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      createWormhole(state, clock, idGen, logger, 'world-3', 'world-4', 10000n, 100n);

      const count = batchDegrade(state, clock, logger);

      expect(count).toBe(2);
    });

    it('skips collapsed wormholes', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      const id2 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-3',
        'world-4',
        10000n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id2);
      if (wormhole === undefined) return;
      wormhole.collapsedAt = clock.now();

      const count = batchDegrade(state, clock, logger);

      expect(count).toBe(1);
    });
  });

  describe('getWormholesForWorld', () => {
    it('returns wormholes with world as origin', () => {
      createWormhole(state, clock, idGen, logger, 'world-alpha', 'world-beta', 10000n, 100n);

      const wormholes = getWormholesForWorld(state, 'world-alpha');

      expect(wormholes.length).toBe(1);
    });

    it('returns wormholes with world as destination', () => {
      createWormhole(state, clock, idGen, logger, 'world-alpha', 'world-beta', 10000n, 100n);

      const wormholes = getWormholesForWorld(state, 'world-beta');

      expect(wormholes.length).toBe(1);
    });

    it('filters out unrelated wormholes', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      createWormhole(state, clock, idGen, logger, 'world-3', 'world-4', 10000n, 100n);

      const wormholes = getWormholesForWorld(state, 'world-1');

      expect(wormholes.length).toBe(1);
    });
  });

  describe('getAverageStability', () => {
    it('returns average stability of active wormholes', () => {
      const id1 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const id2 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-3',
        'world-4',
        10000n,
        100n,
      ) as string;

      const wh1 = state.wormholes.get(id1);
      const wh2 = state.wormholes.get(id2);
      if (wh1 === undefined || wh2 === undefined) return;

      wh1.stability = 80n;
      wh2.stability = 60n;

      expect(getAverageStability(state)).toBe(70n);
    });

    it('returns 0 when no active wormholes', () => {
      expect(getAverageStability(state)).toBe(0n);
    });

    it('excludes collapsed wormholes from average', () => {
      const id1 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const id2 = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-3',
        'world-4',
        10000n,
        100n,
      ) as string;

      const wh1 = state.wormholes.get(id1);
      const wh2 = state.wormholes.get(id2);
      if (wh1 === undefined || wh2 === undefined) return;

      wh1.stability = 80n;
      wh2.stability = 0n;
      wh2.collapsedAt = clock.now();

      expect(getAverageStability(state)).toBe(80n);
    });
  });

  describe('getWormholeCount', () => {
    it('returns total wormhole count', () => {
      createWormhole(state, clock, idGen, logger, 'world-1', 'world-2', 10000n, 100n);

      createWormhole(state, clock, idGen, logger, 'world-3', 'world-4', 10000n, 100n);

      expect(getWormholeCount(state)).toBe(2);
    });
  });

  describe('getCollapseCount', () => {
    it('returns total collapse count', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        100n,
        100n,
      ) as string;

      const wormhole = state.wormholes.get(id);
      if (wormhole === undefined) return;
      wormhole.stability = 5n;

      degradeStability(state, clock, logger, id);

      expect(getCollapseCount(state)).toBe(1);
    });
  });

  describe('getWormhole', () => {
    it('returns wormhole by ID', () => {
      const id = createWormhole(
        state,
        clock,
        idGen,
        logger,
        'world-1',
        'world-2',
        10000n,
        100n,
      ) as string;

      const wormhole = getWormhole(state, id);

      expect(wormhole).not.toBe('wormhole-not-found');
      if (typeof wormhole === 'string') return;

      expect(wormhole.id).toBe(id);
    });

    it('returns error for nonexistent wormhole', () => {
      const result = getWormhole(state, 'fake-id');

      expect(result).toBe('wormhole-not-found');
    });
  });
});
