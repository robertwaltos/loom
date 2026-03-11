/**
 * Load Tester Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLoadTester,
  defineScenario,
  addOperation,
  createOperationMix,
  runScenario,
  recordLatency,
  computePercentiles,
  getReport,
  compareScenarios,
  getScenario,
  listScenarios,
  getVirtualUsers,
  clearScenario,
  type LoadTesterError,
  type Operation,
  type OperationMix,
  type LoadScenario,
  type PercentileData,
  type LoadTestReport,
  type ScenarioComparison,
} from '../load-tester.js';

class TestClock {
  private currentUs = 1000000000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter = this.counter + 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

describe('Load Tester', () => {
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('createOperationMix', () => {
    it('should create empty operation mix', () => {
      const mix = createOperationMix();
      expect(mix.operations).toEqual([]);
      expect(mix.totalWeight).toBe(0);
    });
  });

  describe('addOperation', () => {
    it('should add operation to mix', () => {
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const newMix = addOperation(mix, op);
      expect(newMix.operations.length).toBe(1);
      expect(newMix.totalWeight).toBe(5);
    });

    it('should accumulate weight', () => {
      let mix = createOperationMix();
      const op1: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const op2: Operation = {
        type: 'WRITE',
        weight: 3,
        minLatencyUs: 200n,
        maxLatencyUs: 2000n,
      };
      mix = addOperation(mix, op1);
      mix = addOperation(mix, op2);
      expect(mix.operations.length).toBe(2);
      expect(mix.totalWeight).toBe(8);
    });

    it('should handle multiple operations', () => {
      let mix = createOperationMix();
      for (let i = 0; i < 10; i = i + 1) {
        const op: Operation = {
          type: 'COMPUTE',
          weight: 1,
          minLatencyUs: 100n,
          maxLatencyUs: 1000n,
        };
        mix = addOperation(mix, op);
      }
      expect(mix.operations.length).toBe(10);
      expect(mix.totalWeight).toBe(10);
    });
  });

  describe('defineScenario', () => {
    it('should define valid scenario', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const result = defineScenario(state, 10, 5000000n, 60000000n, opMix);
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.virtualUserCount).toBe(10);
        expect(result.rampUpDurationUs).toBe(5000000n);
        expect(result.testDurationUs).toBe(60000000n);
      }
    });

    it('should reject invalid user count', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const result = defineScenario(state, 0, 5000000n, 60000000n, mix);
      expect(result).toBe('invalid-user-count');
    });

    it('should reject negative user count', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const result = defineScenario(state, -5, 5000000n, 60000000n, mix);
      expect(result).toBe('invalid-user-count');
    });

    it('should reject invalid duration', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const result = defineScenario(state, 10, 5000000n, 0n, mix);
      expect(result).toBe('invalid-duration');
    });

    it('should reject empty operation mix', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const result = defineScenario(state, 10, 5000000n, 60000000n, mix);
      expect(result).toBe('invalid-operation-mix');
    });

    it('should store scenario in state', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const result = defineScenario(state, 10, 5000000n, 60000000n, opMix);
      if (typeof result !== 'string') {
        const retrieved = getScenario(state, result.scenarioId);
        expect(retrieved).toEqual(result);
      }
    });
  });

  describe('runScenario', () => {
    it('should run scenario successfully', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        const result = runScenario(state, scenario.scenarioId);
        expect(result).toBe('ok');
      }
    });

    it('should reject invalid scenario id', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const result = runScenario(state, 'invalid-id');
      expect(result).toBe('scenario-not-found');
    });

    it('should create virtual users', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 3, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const users = getVirtualUsers(state, scenario.scenarioId);
        if (typeof users !== 'string') {
          expect(users.length).toBe(3);
        }
      }
    });

    it('should record latencies', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const percentiles = computePercentiles(state, scenario.scenarioId);
        expect(typeof percentiles).not.toBe('string');
      }
    });

    it('should track throughput', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const report = getReport(state, scenario.scenarioId);
        if (typeof report !== 'string') {
          expect(report.throughput.totalOps).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('recordLatency', () => {
    it('should record latency for scenario', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        const result = recordLatency(state, scenario.scenarioId, 5000n);
        expect(result).toBe('ok');
      }
    });

    it('should reject invalid scenario', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const result = recordLatency(state, 'invalid-id', 5000n);
      expect(result).toBe('scenario-not-found');
    });

    it('should accumulate latencies', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        recordLatency(state, scenario.scenarioId, 1000n);
        recordLatency(state, scenario.scenarioId, 2000n);
        recordLatency(state, scenario.scenarioId, 3000n);
        const percentiles = computePercentiles(state, scenario.scenarioId);
        if (typeof percentiles !== 'string') {
          expect(percentiles.p50).toBe(2000n);
        }
      }
    });
  });

  describe('computePercentiles', () => {
    it('should compute p50, p95, p99', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        for (let i = 1; i <= 100; i = i + 1) {
          recordLatency(state, scenario.scenarioId, BigInt(i * 1000));
        }
        const percentiles = computePercentiles(state, scenario.scenarioId);
        if (typeof percentiles !== 'string') {
          expect(percentiles.p50).toBeGreaterThan(0n);
          expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
          expect(percentiles.p99).toBeGreaterThan(percentiles.p95);
        }
      }
    });

    it('should compute min and max', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        recordLatency(state, scenario.scenarioId, 1000n);
        recordLatency(state, scenario.scenarioId, 5000n);
        recordLatency(state, scenario.scenarioId, 10000n);
        const percentiles = computePercentiles(state, scenario.scenarioId);
        if (typeof percentiles !== 'string') {
          expect(percentiles.min).toBe(1000n);
          expect(percentiles.max).toBe(10000n);
        }
      }
    });

    it('should compute mean', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        recordLatency(state, scenario.scenarioId, 1000n);
        recordLatency(state, scenario.scenarioId, 2000n);
        recordLatency(state, scenario.scenarioId, 3000n);
        const percentiles = computePercentiles(state, scenario.scenarioId);
        if (typeof percentiles !== 'string') {
          expect(percentiles.mean).toBe(2000n);
        }
      }
    });

    it('should reject empty latencies', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        const result = computePercentiles(state, scenario.scenarioId);
        expect(result).toBe('empty-latencies');
      }
    });
  });

  describe('getReport', () => {
    it('should generate load test report', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const report = getReport(state, scenario.scenarioId);
        if (typeof report !== 'string') {
          expect(report.scenarioId).toBe(scenario.scenarioId);
          expect(report.virtualUsers).toBe(5);
          expect(report.latencies.p50).toBeGreaterThan(0n);
        }
      }
    });

    it('should include throughput data', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const report = getReport(state, scenario.scenarioId);
        if (typeof report !== 'string') {
          expect(report.throughput.totalOps).toBeGreaterThan(0);
          expect(report.throughput.opsPerSecond).toBeGreaterThan(0);
        }
      }
    });

    it('should include latency buckets', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const report = getReport(state, scenario.scenarioId);
        if (typeof report !== 'string') {
          expect(report.buckets.length).toBeGreaterThan(0);
        }
      }
    });

    it('should reject invalid scenario', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const result = getReport(state, 'invalid-id');
      expect(result).toBe('scenario-not-found');
    });
  });

  describe('compareScenarios', () => {
    it('should compare two scenarios', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario1 = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      const scenario2 = defineScenario(state, 10, 1000000n, 10000000n, opMix);
      if (typeof scenario1 !== 'string' && typeof scenario2 !== 'string') {
        runScenario(state, scenario1.scenarioId);
        runScenario(state, scenario2.scenarioId);
        const comparison = compareScenarios(state, scenario1.scenarioId, scenario2.scenarioId);
        if (typeof comparison !== 'string') {
          expect(comparison.scenarioA).toBe(scenario1.scenarioId);
          expect(comparison.scenarioB).toBe(scenario2.scenarioId);
        }
      }
    });

    it('should compute p50 diff', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario1 = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      const scenario2 = defineScenario(state, 10, 1000000n, 10000000n, opMix);
      if (typeof scenario1 !== 'string' && typeof scenario2 !== 'string') {
        runScenario(state, scenario1.scenarioId);
        runScenario(state, scenario2.scenarioId);
        const comparison = compareScenarios(state, scenario1.scenarioId, scenario2.scenarioId);
        if (typeof comparison !== 'string') {
          expect(typeof comparison.p50Diff).toBe('bigint');
        }
      }
    });

    it('should compute throughput diff', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario1 = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      const scenario2 = defineScenario(state, 10, 1000000n, 10000000n, opMix);
      if (typeof scenario1 !== 'string' && typeof scenario2 !== 'string') {
        runScenario(state, scenario1.scenarioId);
        runScenario(state, scenario2.scenarioId);
        const comparison = compareScenarios(state, scenario1.scenarioId, scenario2.scenarioId);
        if (typeof comparison !== 'string') {
          expect(typeof comparison.throughputDiff).toBe('number');
        }
      }
    });

    it('should reject missing scenario', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const result = compareScenarios(state, scenario.scenarioId, 'invalid-id');
        expect(result).toBe('comparison-missing-scenario');
      }
    });
  });

  describe('listScenarios', () => {
    it('should list all scenarios', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      defineScenario(state, 5, 1000000n, 10000000n, opMix);
      defineScenario(state, 10, 1000000n, 10000000n, opMix);
      const scenarios = listScenarios(state);
      expect(scenarios.length).toBe(2);
    });

    it('should return empty array when no scenarios', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const scenarios = listScenarios(state);
      expect(scenarios.length).toBe(0);
    });
  });

  describe('clearScenario', () => {
    it('should clear scenario', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        const result = clearScenario(state, scenario.scenarioId);
        expect(result).toBe('ok');
        const getResult = getScenario(state, scenario.scenarioId);
        expect(getResult).toBe('scenario-not-found');
      }
    });

    it('should reject invalid scenario', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const result = clearScenario(state, 'invalid-id');
      expect(result).toBe('scenario-not-found');
    });
  });

  describe('edge cases', () => {
    it('should handle single latency', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        recordLatency(state, scenario.scenarioId, 5000n);
        const percentiles = computePercentiles(state, scenario.scenarioId);
        if (typeof percentiles !== 'string') {
          expect(percentiles.p50).toBe(5000n);
          expect(percentiles.p95).toBe(5000n);
          expect(percentiles.p99).toBe(5000n);
          expect(percentiles.min).toBe(5000n);
          expect(percentiles.max).toBe(5000n);
          expect(percentiles.mean).toBe(5000n);
        }
      }
    });

    it('should handle large number of latencies', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        for (let i = 0; i < 1000; i = i + 1) {
          recordLatency(state, scenario.scenarioId, BigInt(i + 1) * 1000n);
        }
        const percentiles = computePercentiles(state, scenario.scenarioId);
        expect(typeof percentiles).not.toBe('string');
      }
    });

    it('should handle operation mix with many operations', () => {
      let mix = createOperationMix();
      for (let i = 0; i < 50; i = i + 1) {
        const op: Operation = {
          type: 'COMPUTE',
          weight: 1,
          minLatencyUs: BigInt(i) * 100n,
          maxLatencyUs: BigInt(i + 1) * 100n,
        };
        mix = addOperation(mix, op);
      }
      expect(mix.operations.length).toBe(50);
      expect(mix.totalWeight).toBe(50);
    });

    it('should handle zero ramp-up duration', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 0n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        const result = runScenario(state, scenario.scenarioId);
        expect(result).toBe('ok');
      }
    });

    it('should track error rate', () => {
      const state = createLoadTester({ clock, idGen, logger });
      const mix = createOperationMix();
      const op: Operation = {
        type: 'READ',
        weight: 5,
        minLatencyUs: 100n,
        maxLatencyUs: 1000n,
      };
      const opMix = addOperation(mix, op);
      const scenario = defineScenario(state, 5, 1000000n, 10000000n, opMix);
      if (typeof scenario !== 'string') {
        runScenario(state, scenario.scenarioId);
        const report = getReport(state, scenario.scenarioId);
        if (typeof report !== 'string') {
          expect(typeof report.throughput.errorRate).toBe('number');
          expect(report.throughput.errorRate).toBeGreaterThanOrEqual(0);
          expect(report.throughput.errorRate).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});
