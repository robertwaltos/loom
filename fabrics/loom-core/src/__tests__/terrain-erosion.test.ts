import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTerrainErosion,
  type TerrainErosionDeps,
  type ErosionFactor,
  type TerrainQuality,
} from '../terrain-erosion.js';

function createMockDeps(): TerrainErosionDeps {
  let currentTime = BigInt(1000000);
  const logs: Array<{ level: string; msg: string; ctx: Record<string, unknown> }> = [];

  return {
    clock: {
      nowMicroseconds: () => currentTime,
    },
    logger: {
      info: (msg, ctx) => {
        logs.push({ level: 'info', msg, ctx });
      },
      warn: (msg, ctx) => {
        logs.push({ level: 'warn', msg, ctx });
      },
    },
  };
}

describe('TerrainErosion', () => {
  let deps: TerrainErosionDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('registerCell', () => {
    it('registers a new terrain cell', () => {
      const erosion = createTerrainErosion(deps);
      const result = erosion.registerCell('cell-1', 'world-1');
      expect(result).toBe('OK');
    });

    it('returns error if cell already registered', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      const result = erosion.registerCell('cell-1', 'world-1');
      expect(result).toBe('CELL_ALREADY_REGISTERED');
    });

    it('initializes cell with PRISTINE quality', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('PRISTINE');
    });

    it('allows registering multiple cells', () => {
      const erosion = createTerrainErosion(deps);
      expect(erosion.registerCell('cell-1', 'world-1')).toBe('OK');
      expect(erosion.registerCell('cell-2', 'world-1')).toBe('OK');
      expect(erosion.registerCell('cell-3', 'world-2')).toBe('OK');
    });
  });

  describe('applyErosion', () => {
    it('applies weather erosion to a cell', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      const factor: ErosionFactor = {
        type: 'WEATHER',
        intensity: 0.5,
      };

      const result = erosion.applyErosion('cell-1', factor);
      expect(result).toBe('OK');
    });

    it('returns error if cell not found', () => {
      const erosion = createTerrainErosion(deps);
      const factor: ErosionFactor = {
        type: 'WEATHER',
        intensity: 0.5,
      };
      const result = erosion.applyErosion('nonexistent', factor);
      expect(result).toBe('CELL_NOT_FOUND');
    });

    it('returns error if intensity is negative', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      const factor: ErosionFactor = {
        type: 'WEATHER',
        intensity: -0.1,
      };
      const result = erosion.applyErosion('cell-1', factor);
      expect(result).toBe('INVALID_INTENSITY');
    });

    it('returns error if intensity exceeds 1', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      const factor: ErosionFactor = {
        type: 'WEATHER',
        intensity: 1.5,
      };
      const result = erosion.applyErosion('cell-1', factor);
      expect(result).toBe('INVALID_INTENSITY');
    });

    it('degrades quality from PRISTINE to WORN', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 5; i = i + 1) {
        erosion.applyErosion('cell-1', { type: 'WEATHER', intensity: 1.0 });
      }

      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('WORN');
    });

    it('degrades quality to DEGRADED with sustained erosion', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.applyErosion('cell-1', { type: 'WEATHER', intensity: 1.0 });
      }

      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('DEGRADED');
    });

    it('degrades quality to DAMAGED', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 15; i = i + 1) {
        erosion.applyErosion('cell-1', { type: 'WEATHER', intensity: 1.0 });
      }

      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('DAMAGED');
    });

    it('degrades quality to DESTROYED', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 20; i = i + 1) {
        erosion.applyErosion('cell-1', { type: 'WEATHER', intensity: 1.0 });
      }

      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('DESTROYED');
    });

    it('caps erosion score at 100', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 50; i = i + 1) {
        erosion.applyErosion('cell-1', { type: 'TRAFFIC', intensity: 1.0 });
      }

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report, got error');
      }
      expect(report.erosionScore).toBe(100);
    });
  });

  describe('recordTraffic', () => {
    it('records traffic as TRAFFIC erosion factor', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      const result = erosion.recordTraffic('cell-1', 0.8);
      expect(result).toBe('OK');
    });

    it('returns error for invalid intensity', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      const result = erosion.recordTraffic('cell-1', -0.5);
      expect(result).toBe('INVALID_TRAFFIC_INTENSITY');
    });

    it('degrades terrain from heavy traffic', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 3; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
      }

      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('WORN');
    });

    it('applies traffic erosion faster than weather', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      erosion.registerCell('cell-2', 'world-1');

      erosion.recordTraffic('cell-1', 1.0);
      erosion.applyErosion('cell-2', { type: 'WEATHER', intensity: 1.0 });

      const report1 = erosion.getErosionReport('cell-1');
      const report2 = erosion.getErosionReport('cell-2');

      if (typeof report1 === 'string' || typeof report2 === 'string') {
        throw new Error('Expected reports');
      }

      expect(report1.erosionScore).toBeGreaterThan(report2.erosionScore);
    });
  });

  describe('getTerrainQuality', () => {
    it('returns current quality for registered cell', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('PRISTINE');
    });

    it('returns error for unregistered cell', () => {
      const erosion = createTerrainErosion(deps);
      const result = erosion.getTerrainQuality('nonexistent');
      expect(result).toBe('CELL_NOT_FOUND');
    });
  });

  describe('scheduleRestoration', () => {
    it('schedules restoration event', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
      }

      const result = erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(3600000000));
      expect(result).toBe('OK');
    });

    it('returns error if cell not found', () => {
      const erosion = createTerrainErosion(deps);
      const result = erosion.scheduleRestoration('nonexistent', 'PRISTINE', BigInt(3600000000));
      expect(result).toBe('CELL_NOT_FOUND');
    });

    it('returns error if target quality is not better', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      const result = erosion.scheduleRestoration('cell-1', 'WORN', BigInt(3600000000));
      expect(result).toBe('TARGET_QUALITY_NOT_BETTER');
    });

    it('allows multiple restoration schedules', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      erosion.registerCell('cell-2', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
        erosion.recordTraffic('cell-2', 1.0);
      }

      expect(erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(1000))).toBe('OK');
      expect(erosion.scheduleRestoration('cell-2', 'PRISTINE', BigInt(2000))).toBe('OK');
    });
  });

  describe('processRestorations', () => {
    it('processes no restorations when queue is empty', () => {
      const erosion = createTerrainErosion(deps);
      const count = erosion.processRestorations();
      expect(count).toBe(0);
    });

    it('does not process restoration before completion time', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
      }

      erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(3600000000));
      const count = erosion.processRestorations();
      expect(count).toBe(0);
    });

    it('processes restoration after completion time', () => {
      let currentTime = BigInt(1000000);
      const mockDeps = { ...createMockDeps(), clock: { nowMicroseconds: () => currentTime } };

      const erosion = createTerrainErosion(mockDeps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
      }

      erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(1000));
      currentTime = currentTime + BigInt(2000);

      const count = erosion.processRestorations();
      expect(count).toBe(1);
    });

    it('restores terrain quality', () => {
      let currentTime = BigInt(1000000);
      const mockDeps = { ...createMockDeps(), clock: { nowMicroseconds: () => currentTime } };

      const erosion = createTerrainErosion(mockDeps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
      }

      erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(1000));
      currentTime = currentTime + BigInt(2000);
      erosion.processRestorations();

      const quality = erosion.getTerrainQuality('cell-1');
      expect(quality).toBe('PRISTINE');
    });

    it('processes multiple restorations', () => {
      let currentTime = BigInt(1000000);
      const mockDeps = { ...createMockDeps(), clock: { nowMicroseconds: () => currentTime } };

      const erosion = createTerrainErosion(mockDeps);
      erosion.registerCell('cell-1', 'world-1');
      erosion.registerCell('cell-2', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
        erosion.recordTraffic('cell-2', 1.0);
      }

      erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(1000));
      erosion.scheduleRestoration('cell-2', 'PRISTINE', BigInt(1000));

      currentTime = currentTime + BigInt(2000);
      const count = erosion.processRestorations();
      expect(count).toBe(2);
    });

    it('keeps pending restorations in queue', () => {
      let currentTime = BigInt(1000000);
      const mockDeps = { ...createMockDeps(), clock: { nowMicroseconds: () => currentTime } };

      const erosion = createTerrainErosion(mockDeps);
      erosion.registerCell('cell-1', 'world-1');
      erosion.registerCell('cell-2', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
        erosion.recordTraffic('cell-2', 1.0);
      }

      erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(1000));
      erosion.scheduleRestoration('cell-2', 'PRISTINE', BigInt(10000));

      currentTime = currentTime + BigInt(2000);
      const count = erosion.processRestorations();
      expect(count).toBe(1);

      const report2 = erosion.getErosionReport('cell-2');
      if (typeof report2 === 'string') {
        throw new Error('Expected report');
      }
      expect(report2.pendingRestoration).not.toBe(null);
    });
  });

  describe('getErosionReport', () => {
    it('returns report for registered cell', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report, got error');
      }

      expect(report.cellId).toBe('cell-1');
      expect(report.currentQuality).toBe('PRISTINE');
      expect(report.erosionScore).toBe(0);
      expect(report.history).toHaveLength(0);
      expect(report.pendingRestoration).toBe(null);
    });

    it('returns error for unregistered cell', () => {
      const erosion = createTerrainErosion(deps);
      const result = erosion.getErosionReport('nonexistent');
      expect(result).toBe('CELL_NOT_FOUND');
    });

    it('includes erosion history', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      erosion.applyErosion('cell-1', { type: 'WEATHER', intensity: 0.5 });
      erosion.recordTraffic('cell-1', 0.8);

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.history.length).toBeGreaterThan(0);
    });

    it('includes pending restoration', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 10; i = i + 1) {
        erosion.recordTraffic('cell-1', 1.0);
      }

      erosion.scheduleRestoration('cell-1', 'PRISTINE', BigInt(3600000000));

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.pendingRestoration).not.toBe(null);
      if (report.pendingRestoration !== null) {
        expect(report.pendingRestoration.targetQuality).toBe('PRISTINE');
      }
    });

    it('limits history to 100 records', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      for (let i = 0; i < 150; i = i + 1) {
        erosion.applyErosion('cell-1', { type: 'TIME', intensity: 0.1 });
      }

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getAllCells', () => {
    it('returns empty array when no cells registered', () => {
      const erosion = createTerrainErosion(deps);
      const cells = erosion.getAllCells();
      expect(cells).toHaveLength(0);
    });

    it('returns all registered cells', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      erosion.registerCell('cell-2', 'world-1');
      erosion.registerCell('cell-3', 'world-2');

      const cells = erosion.getAllCells();
      expect(cells).toHaveLength(3);
    });

    it('returns cells with current state', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');
      erosion.recordTraffic('cell-1', 1.0);
      erosion.recordTraffic('cell-1', 1.0);
      erosion.recordTraffic('cell-1', 1.0);

      const cells = erosion.getAllCells();
      const cell1 = cells[0];
      if (cell1 === undefined) {
        throw new Error('Expected cell');
      }

      expect(cell1.quality).toBe('WORN');
    });
  });

  describe('erosion factor types', () => {
    it('applies TIME erosion at slowest rate', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      erosion.applyErosion('cell-1', { type: 'TIME', intensity: 1.0 });

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.erosionScore).toBe(2);
    });

    it('applies WEATHER erosion at medium rate', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      erosion.applyErosion('cell-1', { type: 'WEATHER', intensity: 1.0 });

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.erosionScore).toBe(5);
    });

    it('applies TRAFFIC erosion at fastest rate', () => {
      const erosion = createTerrainErosion(deps);
      erosion.registerCell('cell-1', 'world-1');

      erosion.applyErosion('cell-1', { type: 'TRAFFIC', intensity: 1.0 });

      const report = erosion.getErosionReport('cell-1');
      if (typeof report === 'string') {
        throw new Error('Expected report');
      }

      expect(report.erosionScore).toBe(10);
    });
  });
});
