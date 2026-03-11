/**
 * Cost Analyser Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCostAnalyser,
  recordCost,
  recordOperationCost,
  getServiceCosts,
  detectWaste,
  computeEfficiency,
  getCostTrend,
  getCostReport,
  compareServices,
  listServices,
  clearService,
  type CostAnalyserError,
  type ResourceType,
  type ServiceCosts,
  type WasteReport,
  type EfficiencyScore,
  type CostTrend,
  type CostReport,
} from '../cost-analyser.js';

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

describe('Cost Analyser', () => {
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('recordCost', () => {
    it('should record cost for service', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = recordCost(state, 'service-1', 'CPU', 1000n);
      expect(result).toBe('ok');
    });

    it('should reject negative amount', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = recordCost(state, 'service-1', 'CPU', -100n);
      expect(result).toBe('invalid-amount');
    });

    it('should accumulate costs', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-1', 'CPU', 2000n);
      const costs = getServiceCosts(state, 'service-1');
      if (typeof costs !== 'string') {
        const cpuCost = costs.costs.get('CPU');
        expect(cpuCost).toBe(3000n);
      }
    });

    it('should track multiple resource types', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-1', 'MEMORY', 2000n);
      recordCost(state, 'service-1', 'NETWORK', 3000n);
      const costs = getServiceCosts(state, 'service-1');
      if (typeof costs !== 'string') {
        expect(costs.costs.size).toBe(3);
      }
    });

    it('should track multiple services', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-2', 'CPU', 2000n);
      const services = listServices(state);
      expect(services.length).toBe(2);
    });

    it('should create cost history', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 2000n);
      const trend = getCostTrend(state, 'service-1', 'CPU', 0n, clock.nowUs());
      if (typeof trend !== 'string') {
        expect(trend.dataPoints.length).toBe(2);
      }
    });
  });

  describe('recordOperationCost', () => {
    it('should record operation cost', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      expect(result).toBe('ok');
    });

    it('should reject negative allocated', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = recordOperationCost(state, 'service-1', 'op-1', 'CPU', -1000n, 800n);
      expect(result).toBe('invalid-amount');
    });

    it('should reject negative used', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, -800n);
      expect(result).toBe('invalid-amount');
    });

    it('should calculate waste', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      const waste = detectWaste(state, 'service-1', 'CPU');
      if (typeof waste !== 'string') {
        expect(waste.totalWasted).toBe(200n);
      }
    });

    it('should accumulate operation costs', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      recordOperationCost(state, 'service-1', 'op-2', 'CPU', 2000n, 1500n);
      const waste = detectWaste(state, 'service-1', 'CPU');
      if (typeof waste !== 'string') {
        expect(waste.totalAllocated).toBe(3000n);
        expect(waste.totalUsed).toBe(2300n);
        expect(waste.totalWasted).toBe(700n);
      }
    });
  });

  describe('getServiceCosts', () => {
    it('should get service costs', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-1', 'MEMORY', 2000n);
      const costs = getServiceCosts(state, 'service-1');
      if (typeof costs !== 'string') {
        expect(costs.serviceId).toBe('service-1');
        expect(costs.totalCost).toBe(3000n);
      }
    });

    it('should reject unknown service', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = getServiceCosts(state, 'unknown-service');
      expect(result).toBe('service-not-found');
    });

    it('should calculate total cost', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-1', 'MEMORY', 2000n);
      recordCost(state, 'service-1', 'NETWORK', 3000n);
      const costs = getServiceCosts(state, 'service-1');
      if (typeof costs !== 'string') {
        expect(costs.totalCost).toBe(6000n);
      }
    });
  });

  describe('detectWaste', () => {
    it('should detect waste', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 600n);
      const waste = detectWaste(state, 'service-1', 'CPU');
      if (typeof waste !== 'string') {
        expect(waste.totalWasted).toBe(400n);
        expect(waste.wastePercentage).toBe(40);
      }
    });

    it('should reject unknown service', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = detectWaste(state, 'unknown-service', 'CPU');
      expect(result).toBe('service-not-found');
    });

    it('should handle zero waste', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 1000n);
      const waste = detectWaste(state, 'service-1', 'CPU');
      if (typeof waste !== 'string') {
        expect(waste.totalWasted).toBe(0n);
        expect(waste.wastePercentage).toBe(0);
      }
    });

    it('should handle high waste', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 100n);
      const waste = detectWaste(state, 'service-1', 'CPU');
      if (typeof waste !== 'string') {
        expect(waste.totalWasted).toBe(900n);
        expect(waste.wastePercentage).toBe(90);
      }
    });

    it('should filter by resource type', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      recordOperationCost(state, 'service-1', 'op-2', 'MEMORY', 2000n, 1500n);
      const cpuWaste = detectWaste(state, 'service-1', 'CPU');
      const memWaste = detectWaste(state, 'service-1', 'MEMORY');
      if (typeof cpuWaste !== 'string' && typeof memWaste !== 'string') {
        expect(cpuWaste.totalWasted).toBe(200n);
        expect(memWaste.totalWasted).toBe(500n);
      }
    });
  });

  describe('computeEfficiency', () => {
    it('should compute efficiency score', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      recordOperationCost(state, 'service-1', 'op-2', 'MEMORY', 1000n, 900n);
      recordOperationCost(state, 'service-1', 'op-3', 'NETWORK', 1000n, 950n);
      recordOperationCost(state, 'service-1', 'op-4', 'STORAGE', 1000n, 850n);
      const efficiency = computeEfficiency(state, 'service-1');
      if (typeof efficiency !== 'string') {
        expect(efficiency.score).toBeGreaterThan(0);
        expect(efficiency.score).toBeLessThanOrEqual(1);
      }
    });

    it('should reject unknown service', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = computeEfficiency(state, 'unknown-service');
      expect(result).toBe('service-not-found');
    });

    it('should compute per-resource efficiency', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      recordOperationCost(state, 'service-1', 'op-2', 'MEMORY', 1000n, 900n);
      const efficiency = computeEfficiency(state, 'service-1');
      if (typeof efficiency !== 'string') {
        expect(efficiency.cpuEfficiency).toBeCloseTo(0.8, 2);
        expect(efficiency.memoryEfficiency).toBeCloseTo(0.9, 2);
      }
    });

    it('should handle perfect efficiency', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 1000n);
      recordOperationCost(state, 'service-1', 'op-2', 'MEMORY', 1000n, 1000n);
      recordOperationCost(state, 'service-1', 'op-3', 'NETWORK', 1000n, 1000n);
      recordOperationCost(state, 'service-1', 'op-4', 'STORAGE', 1000n, 1000n);
      const efficiency = computeEfficiency(state, 'service-1');
      if (typeof efficiency !== 'string') {
        expect(efficiency.score).toBe(1.0);
      }
    });

    it('should handle poor efficiency', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 100n);
      recordOperationCost(state, 'service-1', 'op-2', 'MEMORY', 1000n, 200n);
      recordOperationCost(state, 'service-1', 'op-3', 'NETWORK', 1000n, 150n);
      recordOperationCost(state, 'service-1', 'op-4', 'STORAGE', 1000n, 250n);
      const efficiency = computeEfficiency(state, 'service-1');
      if (typeof efficiency !== 'string') {
        expect(efficiency.score).toBeLessThan(0.3);
      }
    });
  });

  describe('getCostTrend', () => {
    it('should get cost trend', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const start = clock.nowUs();
      recordCost(state, 'service-1', 'CPU', 1000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 2000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 3000n);
      const end = clock.nowUs();
      const trend = getCostTrend(state, 'service-1', 'CPU', start, end);
      if (typeof trend !== 'string') {
        expect(trend.dataPoints.length).toBe(3);
      }
    });

    it('should reject invalid time window', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = getCostTrend(state, 'service-1', 'CPU', 1000000n, 500000n);
      expect(result).toBe('invalid-time-window');
    });

    it('should filter by time window', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const start = clock.nowUs();
      recordCost(state, 'service-1', 'CPU', 1000n);
      clock.advance(1000000n);
      const midpoint = clock.nowUs();
      recordCost(state, 'service-1', 'CPU', 2000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 3000n);
      const trend = getCostTrend(state, 'service-1', 'CPU', midpoint, clock.nowUs());
      if (typeof trend !== 'string') {
        expect(trend.dataPoints.length).toBe(2);
      }
    });

    it('should compute average cost', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const start = clock.nowUs();
      recordCost(state, 'service-1', 'CPU', 1000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 2000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 3000n);
      const end = clock.nowUs();
      const trend = getCostTrend(state, 'service-1', 'CPU', start, end);
      if (typeof trend !== 'string') {
        expect(trend.averageCost).toBe(2000n);
      }
    });

    it('should compute peak cost', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const start = clock.nowUs();
      recordCost(state, 'service-1', 'CPU', 1000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 5000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 2000n);
      const end = clock.nowUs();
      const trend = getCostTrend(state, 'service-1', 'CPU', start, end);
      if (typeof trend !== 'string') {
        expect(trend.peakCost).toBe(5000n);
      }
    });

    it('should reject unknown service', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = getCostTrend(state, 'unknown-service', 'CPU', 0n, 1000000n);
      expect(result).toBe('service-not-found');
    });
  });

  describe('getCostReport', () => {
    it('should generate cost report', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-2', 'MEMORY', 2000n);
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      const report = getCostReport(state);
      if (typeof report !== 'string') {
        expect(report.services.length).toBeGreaterThan(0);
        expect(report.totalCost).toBeGreaterThan(0n);
      }
    });

    it('should include top wasters', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 500n);
      recordOperationCost(state, 'service-2', 'op-2', 'MEMORY', 2000n, 1800n);
      const report = getCostReport(state);
      if (typeof report !== 'string') {
        expect(report.topWasters.length).toBeGreaterThan(0);
      }
    });

    it('should include efficiency scores', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      const report = getCostReport(state);
      if (typeof report !== 'string') {
        expect(report.efficiencyScores.length).toBeGreaterThan(0);
      }
    });

    it('should calculate total cost', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-2', 'MEMORY', 2000n);
      recordCost(state, 'service-3', 'NETWORK', 3000n);
      const report = getCostReport(state);
      if (typeof report !== 'string') {
        expect(report.totalCost).toBe(6000n);
      }
    });

    it('should sort top wasters by waste amount', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 900n);
      recordOperationCost(state, 'service-2', 'op-2', 'MEMORY', 2000n, 1000n);
      recordOperationCost(state, 'service-3', 'op-3', 'NETWORK', 3000n, 2500n);
      const report = getCostReport(state);
      if (typeof report !== 'string') {
        if (report.topWasters.length >= 2) {
          const first = report.topWasters[0];
          const second = report.topWasters[1];
          if (first !== undefined && second !== undefined) {
            expect(first.totalWasted).toBeGreaterThanOrEqual(second.totalWasted);
          }
        }
      }
    });
  });

  describe('compareServices', () => {
    it('should compare two services', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-2', 'CPU', 2000n);
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      recordOperationCost(state, 'service-2', 'op-2', 'CPU', 1000n, 900n);
      const comparison = compareServices(state, 'service-1', 'service-2');
      if (typeof comparison !== 'string') {
        expect(comparison.serviceA.serviceId).toBe('service-1');
        expect(comparison.serviceB.serviceId).toBe('service-2');
      }
    });

    it('should compute cost difference', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-2', 'CPU', 3000n);
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      recordOperationCost(state, 'service-2', 'op-2', 'CPU', 1000n, 900n);
      const comparison = compareServices(state, 'service-1', 'service-2');
      if (typeof comparison !== 'string') {
        expect(comparison.costDiff).toBe(2000n);
      }
    });

    it('should compute efficiency difference', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      recordOperationCost(state, 'service-2', 'op-2', 'CPU', 1000n, 900n);
      const comparison = compareServices(state, 'service-1', 'service-2');
      if (typeof comparison !== 'string') {
        expect(typeof comparison.efficiencyDiff).toBe('number');
      }
    });

    it('should reject unknown service A', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-2', 'CPU', 2000n);
      const result = compareServices(state, 'unknown-service', 'service-2');
      expect(result).toBe('service-not-found');
    });

    it('should reject unknown service B', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      const result = compareServices(state, 'service-1', 'unknown-service');
      expect(result).toBe('service-not-found');
    });
  });

  describe('listServices', () => {
    it('should list all services', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordCost(state, 'service-2', 'MEMORY', 2000n);
      recordCost(state, 'service-3', 'NETWORK', 3000n);
      const services = listServices(state);
      expect(services.length).toBe(3);
    });

    it('should return empty array when no services', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const services = listServices(state);
      expect(services.length).toBe(0);
    });
  });

  describe('clearService', () => {
    it('should clear service', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      const result = clearService(state, 'service-1');
      expect(result).toBe('ok');
      const getResult = getServiceCosts(state, 'service-1');
      expect(getResult).toBe('service-not-found');
    });

    it('should reject unknown service', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const result = clearService(state, 'unknown-service');
      expect(result).toBe('service-not-found');
    });

    it('should clear operation costs', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 1000n, 800n);
      clearService(state, 'service-1');
      const waste = detectWaste(state, 'service-1', 'CPU');
      expect(waste).toBe('service-not-found');
    });

    it('should clear cost history', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const start = clock.nowUs();
      recordCost(state, 'service-1', 'CPU', 1000n);
      clock.advance(1000000n);
      recordCost(state, 'service-1', 'CPU', 2000n);
      const end = clock.nowUs();
      clearService(state, 'service-1');
      const trend = getCostTrend(state, 'service-1', 'CPU', start, end);
      expect(trend).toBe('service-not-found');
    });
  });

  describe('edge cases', () => {
    it('should handle zero allocated', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordOperationCost(state, 'service-1', 'op-1', 'CPU', 0n, 0n);
      const waste = detectWaste(state, 'service-1', 'CPU');
      if (typeof waste !== 'string') {
        expect(waste.totalWasted).toBe(0n);
        expect(waste.wastePercentage).toBe(0);
      }
    });

    it('should handle service with no operation costs', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      const efficiency = computeEfficiency(state, 'service-1');
      expect(efficiency).toBe('service-not-found');
    });

    it('should handle empty time window', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      recordCost(state, 'service-1', 'CPU', 1000n);
      const trend = getCostTrend(state, 'service-1', 'CPU', 0n, 1n);
      if (typeof trend !== 'string') {
        expect(trend.dataPoints.length).toBe(0);
      }
    });

    it('should handle large cost values', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const largeCost = 999999999999999n;
      recordCost(state, 'service-1', 'CPU', largeCost);
      const costs = getServiceCosts(state, 'service-1');
      if (typeof costs !== 'string') {
        expect(costs.totalCost).toBe(largeCost);
      }
    });

    it('should handle many data points', () => {
      const state = createCostAnalyser({ clock, idGen, logger });
      const start = clock.nowUs();
      for (let i = 0; i < 100; i = i + 1) {
        recordCost(state, 'service-1', 'CPU', BigInt(i + 1) * 1000n);
        clock.advance(1000n);
      }
      const end = clock.nowUs();
      const trend = getCostTrend(state, 'service-1', 'CPU', start, end);
      if (typeof trend !== 'string') {
        expect(trend.dataPoints.length).toBe(100);
      }
    });
  });
});
