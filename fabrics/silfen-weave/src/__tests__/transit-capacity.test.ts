import { describe, it, expect, beforeEach } from 'vitest';
import { createTransitCapacityModule } from '../transit-capacity.js';

interface TestClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface TestLoggerPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
  readonly error: (message: string, context: Record<string, unknown>) => void;
}

function createTestClock(initialMicros: bigint): {
  clock: TestClockPort;
  setTime: (micros: bigint) => void;
} {
  let currentMicros = initialMicros;
  return {
    clock: { nowMicroseconds: () => currentMicros },
    setTime: (micros: bigint) => {
      currentMicros = micros;
    },
  };
}

function createTestLogger(): TestLoggerPort {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

const ONE_HOUR_MICROS = 3600n * 1000000n;

describe('TransitCapacityModule', () => {
  let clock: ReturnType<typeof createTestClock>;
  let logger: TestLoggerPort;

  beforeEach(() => {
    clock = createTestClock(1000000n);
    logger = createTestLogger();
  });

  describe('setCapacity', () => {
    it('configures corridor capacity', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      const result = module.getCapacityReport('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.report.maxEntitiesPerHour).toBe(100);
      }
    });

    it('initializes empty transit list', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      const result = module.getCapacityReport('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.report.currentLoad).toBe(0);
      }
    });

    it('can update existing capacity', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      module.setCapacity('corridor-1', 200, ONE_HOUR_MICROS);
      const result = module.getCapacityReport('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.report.maxEntitiesPerHour).toBe(200);
      }
    });
  });

  describe('recordTransit', () => {
    it('returns error when corridor not configured', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      const result = module.recordTransit('unknown', 'entity-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Corridor capacity not configured');
      }
    });

    it('records transit successfully', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      const result = module.recordTransit('corridor-1', 'entity-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.currentLoad).toBe(1);
      }
    });

    it('increments current load', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      module.recordTransit('corridor-1', 'entity-1');
      module.recordTransit('corridor-1', 'entity-2');
      const result = module.recordTransit('corridor-1', 'entity-3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.currentLoad).toBe(3);
      }
    });

    it('tracks multiple corridors independently', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      module.setCapacity('corridor-2', 50, ONE_HOUR_MICROS);
      module.recordTransit('corridor-1', 'entity-1');
      module.recordTransit('corridor-1', 'entity-2');
      module.recordTransit('corridor-2', 'entity-3');
      const report1 = module.getCapacityReport('corridor-1');
      const report2 = module.getCapacityReport('corridor-2');
      expect(report1.found && report1.report.currentLoad).toBe(2);
      expect(report2.found && report2.report.currentLoad).toBe(1);
    });

    it('prunes old transits before recording new one', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      module.recordTransit('corridor-1', 'entity-1');
      clock.setTime(ONE_HOUR_MICROS + 2000000n);
      module.recordTransit('corridor-1', 'entity-2');
      const result = module.getCapacityReport('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.report.currentLoad).toBe(1);
      }
    });
  });

  describe('getCongestionLevel', () => {
    it('returns error when corridor not found', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      const result = module.getCongestionLevel('unknown');
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.error).toBe('Corridor not found');
      }
    });

    it('returns CLEAR when no transits', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      const result = module.getCongestionLevel('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.level).toBe('CLEAR');
      }
    });

    it('returns CLEAR for utilization under 25 percent', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      for (let i = 0; i < 20; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getCongestionLevel('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.level).toBe('CLEAR');
      }
    });

    it('returns LIGHT for utilization 25-49 percent', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      for (let i = 0; i < 40; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getCongestionLevel('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.level).toBe('LIGHT');
      }
    });

    it('returns MODERATE for utilization 50-74 percent', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      for (let i = 0; i < 60; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getCongestionLevel('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.level).toBe('MODERATE');
      }
    });

    it('returns HEAVY for utilization 75-99 percent', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      for (let i = 0; i < 90; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getCongestionLevel('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.level).toBe('HEAVY');
      }
    });

    it('returns BLOCKED for utilization at or above 100 percent', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      for (let i = 0; i < 100; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getCongestionLevel('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.level).toBe('BLOCKED');
      }
    });

    it('returns BLOCKED for over-capacity', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 50, ONE_HOUR_MICROS);
      for (let i = 0; i < 75; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getCongestionLevel('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.level).toBe('BLOCKED');
      }
    });
  });

  describe('getAvailableCapacity', () => {
    it('returns error when corridor not found', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      const result = module.getAvailableCapacity('unknown');
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.error).toBe('Corridor not found');
      }
    });

    it('returns max capacity when no transits', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      const result = module.getAvailableCapacity('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.available).toBe(100);
      }
    });

    it('calculates available capacity correctly', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      for (let i = 0; i < 30; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getAvailableCapacity('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.available).toBe(70);
      }
    });

    it('returns zero when at capacity', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 50, ONE_HOUR_MICROS);
      for (let i = 0; i < 50; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getAvailableCapacity('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.available).toBe(0);
      }
    });

    it('returns zero when over capacity', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 50, ONE_HOUR_MICROS);
      for (let i = 0; i < 75; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getAvailableCapacity('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.available).toBe(0);
      }
    });
  });

  describe('getCapacityReport', () => {
    it('returns error when corridor not found', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      const result = module.getCapacityReport('unknown');
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.error).toBe('Corridor not found');
      }
    });

    it('returns complete report', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      for (let i = 0; i < 60; i = i + 1) {
        module.recordTransit('corridor-1', 'entity-' + String(i));
      }
      const result = module.getCapacityReport('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.report.corridorId).toBe('corridor-1');
        expect(result.report.maxEntitiesPerHour).toBe(100);
        expect(result.report.currentLoad).toBe(60);
        expect(result.report.availableCapacity).toBe(40);
        expect(result.report.congestionLevel).toBe('MODERATE');
      }
    });

    it('includes window timestamps', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      clock.setTime(5000000n);
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      const result = module.getCapacityReport('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.report.windowEndMicros).toBe(5000000n);
        expect(result.report.windowStartMicros).toBe(5000000n - ONE_HOUR_MICROS);
      }
    });

    it('prunes old transits before generating report', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      module.recordTransit('corridor-1', 'entity-1');
      module.recordTransit('corridor-1', 'entity-2');
      clock.setTime(ONE_HOUR_MICROS + 1000000n);
      module.recordTransit('corridor-1', 'entity-3');
      const result = module.getCapacityReport('corridor-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.report.currentLoad).toBe(1);
      }
    });
  });

  describe('pruneOldTransits', () => {
    it('returns zero when corridor not found', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      const pruned = module.pruneOldTransits('unknown');
      expect(pruned).toBe(0);
    });

    it('returns zero when no transits', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      const pruned = module.pruneOldTransits('corridor-1');
      expect(pruned).toBe(0);
    });

    it('removes transits outside time window', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      clock.setTime(1000000n);
      module.recordTransit('corridor-1', 'entity-1');
      clock.setTime(2000000n);
      module.recordTransit('corridor-1', 'entity-2');
      clock.setTime(ONE_HOUR_MICROS + 3000000n);
      const pruned = module.pruneOldTransits('corridor-1');
      expect(pruned).toBe(2);
    });

    it('keeps transits within time window', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      clock.setTime(5000000n);
      module.recordTransit('corridor-1', 'entity-1');
      clock.setTime(6000000n);
      module.recordTransit('corridor-1', 'entity-2');
      clock.setTime(7000000n);
      const pruned = module.pruneOldTransits('corridor-1');
      expect(pruned).toBe(0);
      const report = module.getCapacityReport('corridor-1');
      expect(report.found && report.report.currentLoad).toBe(2);
    });

    it('handles partial pruning', () => {
      const module = createTransitCapacityModule({ clock: clock.clock, logger });
      module.setCapacity('corridor-1', 100, ONE_HOUR_MICROS);
      clock.setTime(1000000n);
      module.recordTransit('corridor-1', 'entity-1');
      clock.setTime(ONE_HOUR_MICROS + 500000n);
      module.recordTransit('corridor-1', 'entity-2');
      clock.setTime(ONE_HOUR_MICROS + 1000000n);
      const pruned = module.pruneOldTransits('corridor-1');
      expect(pruned).toBe(1);
      const report = module.getCapacityReport('corridor-1');
      expect(report.found && report.report.currentLoad).toBe(1);
    });
  });
});
