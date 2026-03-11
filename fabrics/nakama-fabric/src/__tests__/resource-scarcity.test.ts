import { describe, it, expect, beforeEach } from 'vitest';
import {
  createResourceScarcitySystem,
  type ResourceScarcitySystem,
  type ScarcityLevel,
} from '../resource-scarcity.js';

function createMockClock() {
  let currentTime = 1000000n;
  return {
    nowMicroseconds: () => currentTime,
    advance: (delta: bigint) => {
      currentTime += delta;
    },
  };
}

function createMockIdGen() {
  let counter = 1;
  return {
    generateId: () => {
      const id = 'alert-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  const logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logs.push({ message, meta });
    },
    getLogs: () => logs,
    clear: () => {
      logs.length = 0;
    },
  };
}

describe('ResourceScarcitySystem', () => {
  let system: ResourceScarcitySystem;
  let clock: ReturnType<typeof createMockClock>;
  let idGen: ReturnType<typeof createMockIdGen>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
    system = createResourceScarcitySystem({ clock, idGen, logger });
  });

  describe('registerResource', () => {
    it('registers a new resource with full capacity as ABUNDANT', () => {
      system.registerResource('water', 'earth', 1000000n);
      const resource = system.getResource('water', 'earth');
      expect(resource).toBeDefined();
      expect(resource?.resourceId).toBe('water');
      expect(resource?.worldId).toBe('earth');
      expect(resource?.capacity).toBe(1000000n);
      expect(resource?.availableAmount).toBe(1000000n);
      expect(resource?.scarcityLevel).toBe('ABUNDANT');
    });

    it('registers resource with initial amount as ADEQUATE', () => {
      system.registerResource('iron', 'mars', 100000n, 60000n);
      const resource = system.getResource('iron', 'mars');
      expect(resource?.availableAmount).toBe(60000n);
      expect(resource?.scarcityLevel).toBe('ADEQUATE');
    });

    it('registers resource with low initial amount as SCARCE', () => {
      system.registerResource('gold', 'venus', 100000n, 15000n);
      const resource = system.getResource('gold', 'venus');
      expect(resource?.availableAmount).toBe(15000n);
      expect(resource?.scarcityLevel).toBe('SCARCE');
    });

    it('registers resource with critical amount as CRITICAL', () => {
      system.registerResource('uranium', 'jupiter', 100000n, 6000n);
      const resource = system.getResource('uranium', 'jupiter');
      expect(resource?.availableAmount).toBe(6000n);
      expect(resource?.scarcityLevel).toBe('CRITICAL');
    });

    it('registers resource with zero amount as DEPLETED', () => {
      system.registerResource('platinum', 'saturn', 100000n, 0n);
      const resource = system.getResource('platinum', 'saturn');
      expect(resource?.availableAmount).toBe(0n);
      expect(resource?.scarcityLevel).toBe('DEPLETED');
    });

    it('does not re-register existing resource', () => {
      system.registerResource('water', 'earth', 1000000n);
      system.registerResource('water', 'earth', 500000n);
      const resource = system.getResource('water', 'earth');
      expect(resource?.capacity).toBe(1000000n);
    });

    it('logs resource registration', () => {
      system.registerResource('oil', 'earth', 500000n, 400000n);
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Resource registered');
      expect(log?.meta?.resourceId).toBe('oil');
      expect(log?.meta?.worldId).toBe('earth');
    });
  });

  describe('updateAvailability', () => {
    beforeEach(() => {
      system.registerResource('water', 'earth', 100000n, 80000n);
    });

    it('updates resource amount within capacity', () => {
      const result = system.updateAvailability('water', 'earth', 50000n);
      expect(result.success).toBe(true);
      const resource = system.getResource('water', 'earth');
      expect(resource?.availableAmount).toBe(50000n);
      expect(resource?.scarcityLevel).toBe('ADEQUATE');
    });

    it('returns error for non-existent resource', () => {
      const result = system.updateAvailability('oil', 'earth', 10000n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('resource-not-found');
    });

    it('returns error for negative amount', () => {
      const result = system.updateAvailability('water', 'earth', -1000n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-amount');
    });

    it('returns error when amount exceeds capacity', () => {
      const result = system.updateAvailability('water', 'earth', 200000n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('exceeds-capacity');
    });

    it('triggers alert on scarcity level degradation', () => {
      const result = system.updateAvailability('water', 'earth', 10000n);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.alert).toBeDefined();
        expect(result.alert?.previousLevel).toBe('ADEQUATE');
        expect(result.alert?.currentLevel).toBe('SCARCE');
      }
    });

    it('does not trigger alert on scarcity level improvement', () => {
      system.updateAvailability('water', 'earth', 10000n);
      const result = system.updateAvailability('water', 'earth', 90000n);
      expect(result.success).toBe(true);
      if (result.success) expect(result.alert).toBeUndefined();
    });

    it('does not trigger alert when level unchanged', () => {
      const result = system.updateAvailability('water', 'earth', 85000n);
      expect(result.success).toBe(true);
      if (result.success) expect(result.alert).toBeUndefined();
    });

    it('creates shortage alert with correct details', () => {
      const result = system.updateAvailability('water', 'earth', 6000n);
      expect(result.success).toBe(true);
      if (result.success && result.alert) {
        expect(result.alert.alertId).toBe('alert-1');
        expect(result.alert.resourceId).toBe('water');
        expect(result.alert.worldId).toBe('earth');
        expect(result.alert.previousLevel).toBe('ADEQUATE');
        expect(result.alert.currentLevel).toBe('CRITICAL');
        expect(result.alert.triggeredAt).toBe(1000000n);
      }
    });

    it('updates lastUpdated timestamp', () => {
      system.updateAvailability('water', 'earth', 50000n);
      const resource1 = system.getResource('water', 'earth');
      clock.advance(5000n);
      system.updateAvailability('water', 'earth', 40000n);
      const resource2 = system.getResource('water', 'earth');
      expect(resource2?.lastUpdated).toBeGreaterThan(resource1?.lastUpdated ?? 0n);
    });

    it('logs availability updates', () => {
      logger.clear();
      system.updateAvailability('water', 'earth', 25000n);
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Resource availability updated');
      expect(log?.meta?.newAmount).toBe('25000');
    });
  });

  describe('scarcity classification', () => {
    it('classifies >= 80% as ABUNDANT', () => {
      system.registerResource('res1', 'w1', 100000n, 90000n);
      const resource = system.getResource('res1', 'w1');
      expect(resource?.scarcityLevel).toBe('ABUNDANT');
    });

    it('classifies >= 50% as ADEQUATE', () => {
      system.registerResource('res2', 'w1', 100000n, 50000n);
      const resource = system.getResource('res2', 'w1');
      expect(resource?.scarcityLevel).toBe('ADEQUATE');
    });

    it('classifies >= 20% as SCARCE', () => {
      system.registerResource('res3', 'w1', 100000n, 20000n);
      const resource = system.getResource('res3', 'w1');
      expect(resource?.scarcityLevel).toBe('SCARCE');
    });

    it('classifies > 5% as CRITICAL', () => {
      system.registerResource('res4', 'w1', 100000n, 6000n);
      const resource = system.getResource('res4', 'w1');
      expect(resource?.scarcityLevel).toBe('CRITICAL');
    });

    it('classifies <= 5% as DEPLETED', () => {
      system.registerResource('res5', 'w1', 100000n, 5000n);
      const resource = system.getResource('res5', 'w1');
      expect(resource?.scarcityLevel).toBe('DEPLETED');
    });

    it('classifies zero capacity as DEPLETED', () => {
      system.registerResource('res6', 'w1', 0n, 0n);
      const resource = system.getResource('res6', 'w1');
      expect(resource?.scarcityLevel).toBe('DEPLETED');
    });
  });

  describe('checkThresholds', () => {
    beforeEach(() => {
      system.registerResource('copper', 'earth', 100000n, 15000n);
    });

    it('returns scarcity level for existing resource', () => {
      const result = system.checkThresholds('copper', 'earth');
      expect(result.found).toBe(true);
      if (result.found) expect(result.scarcityLevel).toBe('SCARCE');
    });

    it('returns not found for non-existent resource', () => {
      const result = system.checkThresholds('silver', 'earth');
      expect(result.found).toBe(false);
    });

    it('returns updated level after availability change', () => {
      system.updateAvailability('copper', 'earth', 85000n);
      const result = system.checkThresholds('copper', 'earth');
      expect(result.found).toBe(true);
      if (result.found) expect(result.scarcityLevel).toBe('ABUNDANT');
    });
  });

  describe('applyRationing', () => {
    beforeEach(() => {
      system.registerResource('fuel', 'earth', 100000n, 10000n);
    });

    it('applies rationing protocol successfully', () => {
      const result = system.applyRationing('fuel', 'earth', 0.5);
      expect(result.success).toBe(true);
    });

    it('returns error for invalid rate below zero', () => {
      const result = system.applyRationing('fuel', 'earth', -0.1);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-rate');
    });

    it('returns error for invalid rate above one', () => {
      const result = system.applyRationing('fuel', 'earth', 1.5);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-rate');
    });

    it('returns error for non-existent resource', () => {
      const result = system.applyRationing('coal', 'earth', 0.75);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('resource-not-found');
    });

    it('updates existing rationing protocol', () => {
      system.applyRationing('fuel', 'earth', 0.5);
      clock.advance(10000n);
      const result = system.applyRationing('fuel', 'earth', 0.3);
      expect(result.success).toBe(true);
    });

    it('logs rationing application', () => {
      logger.clear();
      system.applyRationing('fuel', 'earth', 0.6);
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Rationing applied');
      expect(log?.meta?.consumptionRate).toBe(0.6);
    });
  });

  describe('removeRationing', () => {
    beforeEach(() => {
      system.registerResource('gas', 'earth', 100000n, 20000n);
      system.applyRationing('gas', 'earth', 0.4);
    });

    it('removes rationing protocol successfully', () => {
      const result = system.removeRationing('gas', 'earth');
      expect(result.success).toBe(true);
    });

    it('returns error when rationing not found', () => {
      const result = system.removeRationing('oil', 'earth');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('rationing-not-found');
    });

    it('returns error when trying to remove twice', () => {
      system.removeRationing('gas', 'earth');
      const result = system.removeRationing('gas', 'earth');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('rationing-not-found');
    });

    it('logs rationing removal', () => {
      logger.clear();
      system.removeRationing('gas', 'earth');
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Rationing removed');
      expect(log?.meta?.resourceId).toBe('gas');
    });
  });

  describe('getPriceMultiplier', () => {
    it('returns 0.8 for ABUNDANT', () => {
      expect(system.getPriceMultiplier('ABUNDANT')).toBe(0.8);
    });

    it('returns 1.0 for ADEQUATE', () => {
      expect(system.getPriceMultiplier('ADEQUATE')).toBe(1.0);
    });

    it('returns 1.5 for SCARCE', () => {
      expect(system.getPriceMultiplier('SCARCE')).toBe(1.5);
    });

    it('returns 3.0 for CRITICAL', () => {
      expect(system.getPriceMultiplier('CRITICAL')).toBe(3.0);
    });

    it('returns 10.0 for DEPLETED', () => {
      expect(system.getPriceMultiplier('DEPLETED')).toBe(10.0);
    });
  });

  describe('getScarcityReport', () => {
    it('returns empty report for world with no resources', () => {
      const report = system.getScarcityReport('empty-world');
      expect(report.worldId).toBe('empty-world');
      expect(report.totalResources).toBe(0);
      expect(report.abundantCount).toBe(0);
      expect(report.adequateCount).toBe(0);
      expect(report.scarceCount).toBe(0);
      expect(report.criticalCount).toBe(0);
      expect(report.depletedCount).toBe(0);
      expect(report.activeAlerts).toBe(0);
      expect(report.activeRationing).toBe(0);
    });

    it('counts resources by scarcity level', () => {
      system.registerResource('r1', 'world1', 100000n, 90000n);
      system.registerResource('r2', 'world1', 100000n, 60000n);
      system.registerResource('r3', 'world1', 100000n, 25000n);
      system.registerResource('r4', 'world1', 100000n, 8000n);
      system.registerResource('r5', 'world1', 100000n, 1000n);

      const report = system.getScarcityReport('world1');
      expect(report.totalResources).toBe(5);
      expect(report.abundantCount).toBe(1);
      expect(report.adequateCount).toBe(1);
      expect(report.scarceCount).toBe(1);
      expect(report.criticalCount).toBe(1);
      expect(report.depletedCount).toBe(1);
    });

    it('excludes resources from other worlds', () => {
      system.registerResource('r1', 'world1', 100000n);
      system.registerResource('r2', 'world2', 100000n);
      const report = system.getScarcityReport('world1');
      expect(report.totalResources).toBe(1);
    });

    it('counts active rationing protocols', () => {
      system.registerResource('r1', 'world1', 100000n, 10000n);
      system.registerResource('r2', 'world1', 100000n, 5000n);
      system.applyRationing('r1', 'world1', 0.5);
      const report = system.getScarcityReport('world1');
      expect(report.activeRationing).toBe(1);
    });

    it('counts active shortage alerts for world', () => {
      system.registerResource('r1', 'world1', 100000n, 80000n);
      system.updateAvailability('r1', 'world1', 10000n);
      const report = system.getScarcityReport('world1');
      expect(report.activeAlerts).toBeGreaterThan(0);
    });
  });

  describe('getShortageHistory', () => {
    it('returns empty array for world with no alerts', () => {
      const history = system.getShortageHistory('world1', 10);
      expect(history.length).toBe(0);
    });

    it('returns alerts for specific world only', () => {
      system.registerResource('r1', 'world1', 100000n, 80000n);
      system.registerResource('r2', 'world2', 100000n, 80000n);
      system.updateAvailability('r1', 'world1', 10000n);
      system.updateAvailability('r2', 'world2', 5000n);

      const history = system.getShortageHistory('world1', 10);
      expect(history.length).toBeGreaterThan(0);
      expect(history.every((a) => a.worldId === 'world1')).toBe(true);
    });

    it('sorts alerts by triggered time descending', () => {
      system.registerResource('r1', 'world1', 100000n, 80000n);
      system.updateAvailability('r1', 'world1', 15000n);
      clock.advance(5000n);
      system.updateAvailability('r1', 'world1', 5000n);
      clock.advance(5000n);
      system.updateAvailability('r1', 'world1', 1000n);

      const history = system.getShortageHistory('world1', 10);
      expect(history.length).toBeGreaterThanOrEqual(2);
      for (let i = 0; i < history.length - 1; i += 1) {
        const curr = history[i];
        const next = history[i + 1];
        if (curr && next) {
          expect(curr.triggeredAt).toBeGreaterThanOrEqual(next.triggeredAt);
        }
      }
    });

    it('limits results to requested count', () => {
      system.registerResource('r1', 'world1', 100000n, 80000n);
      system.updateAvailability('r1', 'world1', 15000n);
      system.updateAvailability('r1', 'world1', 8000n);
      system.updateAvailability('r1', 'world1', 2000n);

      const history = system.getShortageHistory('world1', 2);
      expect(history.length).toBeLessThanOrEqual(2);
    });

    it('includes all alert details', () => {
      system.registerResource('r1', 'world1', 100000n, 80000n);
      system.updateAvailability('r1', 'world1', 10000n);
      const history = system.getShortageHistory('world1', 10);
      const alert = history[0];
      expect(alert?.alertId).toBeDefined();
      expect(alert?.resourceId).toBe('r1');
      expect(alert?.worldId).toBe('world1');
      expect(alert?.previousLevel).toBeDefined();
      expect(alert?.currentLevel).toBeDefined();
      expect(alert?.triggeredAt).toBeDefined();
    });
  });

  describe('getResource', () => {
    it('returns resource details when found', () => {
      system.registerResource('iron', 'mars', 50000n, 30000n);
      const resource = system.getResource('iron', 'mars');
      expect(resource).toBeDefined();
      expect(resource?.resourceId).toBe('iron');
      expect(resource?.worldId).toBe('mars');
      expect(resource?.availableAmount).toBe(30000n);
      expect(resource?.capacity).toBe(50000n);
    });

    it('returns undefined when not found', () => {
      const resource = system.getResource('gold', 'venus');
      expect(resource).toBeUndefined();
    });

    it('distinguishes resources by world', () => {
      system.registerResource('water', 'earth', 100000n, 80000n);
      system.registerResource('water', 'mars', 50000n, 10000n);
      const earthWater = system.getResource('water', 'earth');
      const marsWater = system.getResource('water', 'mars');
      expect(earthWater?.capacity).toBe(100000n);
      expect(marsWater?.capacity).toBe(50000n);
    });
  });

  describe('listResources', () => {
    it('returns empty array for world with no resources', () => {
      const resources = system.listResources('empty-world');
      expect(resources.length).toBe(0);
    });

    it('returns all resources for specific world', () => {
      system.registerResource('r1', 'world1', 100000n);
      system.registerResource('r2', 'world1', 50000n);
      system.registerResource('r3', 'world2', 75000n);

      const resources = system.listResources('world1');
      expect(resources.length).toBe(2);
      expect(resources.every((r) => r.worldId === 'world1')).toBe(true);
    });

    it('includes all resource details', () => {
      system.registerResource('iron', 'earth', 100000n, 60000n);
      const resources = system.listResources('earth');
      const iron = resources[0];
      expect(iron?.resourceId).toBe('iron');
      expect(iron?.worldId).toBe('earth');
      expect(iron?.availableAmount).toBe(60000n);
      expect(iron?.capacity).toBe(100000n);
      expect(iron?.scarcityLevel).toBeDefined();
      expect(iron?.lastUpdated).toBeDefined();
    });
  });

  describe('multiple worlds integration', () => {
    it('tracks resources independently per world', () => {
      system.registerResource('water', 'earth', 1000000n, 900000n);
      system.registerResource('water', 'mars', 500000n, 100000n);

      const earthReport = system.getScarcityReport('earth');
      const marsReport = system.getScarcityReport('mars');

      expect(earthReport.totalResources).toBe(1);
      expect(marsReport.totalResources).toBe(1);
      expect(earthReport.abundantCount).toBe(1);
      expect(marsReport.scarceCount).toBe(1);
    });

    it('triggers alerts independently per world', () => {
      system.registerResource('fuel', 'earth', 100000n, 80000n);
      system.registerResource('fuel', 'mars', 100000n, 80000n);

      system.updateAvailability('fuel', 'earth', 10000n);
      system.updateAvailability('fuel', 'mars', 85000n);

      const earthHistory = system.getShortageHistory('earth', 10);
      const marsHistory = system.getShortageHistory('mars', 10);

      expect(earthHistory.length).toBeGreaterThan(0);
      expect(marsHistory.length).toBe(0);
    });

    it('applies rationing independently per world', () => {
      system.registerResource('oil', 'earth', 100000n, 20000n);
      system.registerResource('oil', 'mars', 100000n, 15000n);

      system.applyRationing('oil', 'earth', 0.5);

      const earthReport = system.getScarcityReport('earth');
      const marsReport = system.getScarcityReport('mars');

      expect(earthReport.activeRationing).toBe(1);
      expect(marsReport.activeRationing).toBe(0);
    });
  });

  describe('scarcity level transitions', () => {
    const levels: ScarcityLevel[] = ['ABUNDANT', 'ADEQUATE', 'SCARCE', 'CRITICAL', 'DEPLETED'];

    it('triggers alert on each degradation step', () => {
      system.registerResource('res', 'world', 100000n, 90000n);
      const amounts = [60000n, 25000n, 8000n, 2000n];

      for (const amount of amounts) {
        logger.clear();
        const result = system.updateAvailability('res', 'world', amount);
        expect(result.success).toBe(true);
        if (result.success) expect(result.alert).toBeDefined();
      }
    });

    it('does not trigger alert on improvement', () => {
      system.registerResource('res', 'world', 100000n, 10000n);
      const amounts = [25000n, 60000n, 85000n];

      for (const amount of amounts) {
        const result = system.updateAvailability('res', 'world', amount);
        expect(result.success).toBe(true);
        if (result.success) expect(result.alert).toBeUndefined();
      }
    });

    it('does not trigger alert when level stays same', () => {
      system.registerResource('res', 'world', 100000n, 85000n);
      const result = system.updateAvailability('res', 'world', 90000n);
      expect(result.success).toBe(true);
      if (result.success) expect(result.alert).toBeUndefined();
    });
  });
});
