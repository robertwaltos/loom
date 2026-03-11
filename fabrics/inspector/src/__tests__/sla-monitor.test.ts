/**
 * SLA Monitor Tests
 * Fabric: inspector
 */

import { describe, it, expect } from 'vitest';
import { createSlaMonitor } from '../sla-monitor.js';

// ============================================================================
// Test Ports
// ============================================================================

function createMockClock(startMicros = 1000000n) {
  let current = startMicros;
  return {
    nowMicroseconds: () => current,
    advance: (deltaMicros: bigint) => {
      current = current + deltaMicros;
    },
  };
}

function createMockLogger() {
  const logs: Array<{ level: string; msg: string; ctx: Record<string, unknown> }> = [];
  return {
    info: (msg: string, ctx: Record<string, unknown>) => {
      logs.push({ level: 'info', msg, ctx });
    },
    warn: (msg: string, ctx: Record<string, unknown>) => {
      logs.push({ level: 'warn', msg, ctx });
    },
    getLogs: () => logs,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('SlaMonitor', () => {
  describe('setSlaTarget', () => {
    it('should set SLA target', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      const result = monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      expect(result).toBe('OK');
    });

    it('should log target setting', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'SLA target set')).toBe(true);
    });

    it('should update existing target', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 200,
        windowMicros: 60000000n,
        alertThreshold: 250,
      });

      const stats = monitor.getStats();
      expect(stats.activeTargets).toBe(1);
    });
  });

  describe('recordMetric', () => {
    it('should record metric within target', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      const result = monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 50,
        timestampMicros: 1000000n,
      });

      expect(result).toBe('OK');
    });

    it('should return error for metric without target', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      const result = monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 50,
        timestampMicros: 1000000n,
      });

      expect(result).toBe('TARGET_NOT_FOUND');
    });

    it('should create alert for metric exceeding target', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 120,
        timestampMicros: 1000000n,
      });

      const alerts = monitor.getAlerts(0n);
      expect(alerts).toHaveLength(1);
    });

    it('should create WARNING alert for minor violation', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 120,
        timestampMicros: 1000000n,
      });

      const alerts = monitor.getAlerts(0n);
      expect(alerts[0]?.severity).toBe('WARNING');
    });

    it('should create CRITICAL alert for major violation', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 200,
        timestampMicros: 1000000n,
      });

      const alerts = monitor.getAlerts(0n);
      expect(alerts[0]?.severity).toBe('CRITICAL');
    });

    it('should increment total metrics', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 50,
        timestampMicros: 1000000n,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 60,
        timestampMicros: 1000000n,
      });

      const stats = monitor.getStats();
      expect(stats.totalMetrics).toBe(2n);
    });

    it('should increment total violations', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 120,
        timestampMicros: 1000000n,
      });

      const stats = monitor.getStats();
      expect(stats.totalViolations).toBe(1n);
    });

    it('should log SLA violation', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 120,
        timestampMicros: 1000000n,
      });

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'SLA violation detected')).toBe(true);
    });
  });

  describe('computeCompliance', () => {
    it('should compute compliance for P99 latency', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'LATENCY_P99',
          value: i < 99 ? 50 : 120,
          timestampMicros: 1000000n,
        });
      }

      const report = monitor.computeCompliance('LATENCY_P99');

      expect(report).not.toBe('TARGET_NOT_FOUND');
      if (report !== 'TARGET_NOT_FOUND') {
        expect(report.actualValue).toBeGreaterThan(100);
        expect(report.compliant).toBe(false);
      }
    });

    it('should return error for unknown metric type', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      const report = monitor.computeCompliance('LATENCY_P99');

      expect(report).toBe('TARGET_NOT_FOUND');
    });

    it('should compute compliance for P95 latency', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P95',
        targetValue: 80,
        windowMicros: 60000000n,
        alertThreshold: 100,
      });

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'LATENCY_P95',
          value: i < 95 ? 40 : 90,
          timestampMicros: 1000000n,
        });
      }

      const report = monitor.computeCompliance('LATENCY_P95');

      expect(report).not.toBe('TARGET_NOT_FOUND');
      if (report !== 'TARGET_NOT_FOUND') {
        expect(report.actualValue).toBeGreaterThan(80);
      }
    });

    it('should compute compliance for uptime', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'UPTIME',
        targetValue: 0.99,
        windowMicros: 60000000n,
        alertThreshold: 0.95,
      });

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'UPTIME',
          value: i < 98 ? 1 : 0,
          timestampMicros: 1000000n,
        });
      }

      const report = monitor.computeCompliance('UPTIME');

      expect(report).not.toBe('TARGET_NOT_FOUND');
      if (report !== 'TARGET_NOT_FOUND') {
        expect(report.actualValue).toBeLessThan(0.99);
        expect(report.compliant).toBe(false);
      }
    });

    it('should compute compliance for error rate', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'ERROR_RATE',
        targetValue: 0.01,
        windowMicros: 60000000n,
        alertThreshold: 0.05,
      });

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'ERROR_RATE',
          value: 0.005,
          timestampMicros: 1000000n,
        });
      }

      const report = monitor.computeCompliance('ERROR_RATE');

      expect(report).not.toBe('TARGET_NOT_FOUND');
      if (report !== 'TARGET_NOT_FOUND') {
        expect(report.actualValue).toBeLessThan(0.01);
        expect(report.compliant).toBe(true);
      }
    });

    it('should use rolling window', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 10000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 200,
        timestampMicros: 1000000n,
      });

      clock.advance(20000000n);

      const report = monitor.computeCompliance('LATENCY_P99');

      expect(report).not.toBe('TARGET_NOT_FOUND');
      if (report !== 'TARGET_NOT_FOUND') {
        expect(report.actualValue).toBe(0);
        expect(report.compliant).toBe(true);
      }
    });
  });

  describe('checkBreaches', () => {
    it('should detect active SLA breaches', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'LATENCY_P99',
          value: 120,
          timestampMicros: 1000000n,
        });
      }

      const breaches = monitor.checkBreaches();

      expect(breaches).toHaveLength(1);
      expect(breaches[0]?.metricType).toBe('LATENCY_P99');
    });

    it('should return empty array when no breaches', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'LATENCY_P99',
          value: 50,
          timestampMicros: 1000000n,
        });
      }

      const breaches = monitor.checkBreaches();

      expect(breaches).toHaveLength(0);
    });

    it('should check all metric types', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.setSlaTarget({
        metricType: 'ERROR_RATE',
        targetValue: 0.01,
        windowMicros: 60000000n,
        alertThreshold: 0.05,
      });

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'LATENCY_P99',
          value: 120,
          timestampMicros: 1000000n,
        });
      }

      for (let i = 0; i < 100; i = i + 1) {
        monitor.recordMetric({
          metricType: 'ERROR_RATE',
          value: 0.02,
          timestampMicros: 1000000n,
        });
      }

      const breaches = monitor.checkBreaches();

      expect(breaches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getComplianceReport', () => {
    it('should generate report for time range', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 50,
        timestampMicros: 1000000n,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 150,
        timestampMicros: 5000000n,
      });

      const report = monitor.getComplianceReport('LATENCY_P99', 0n, 10000000n);

      expect(report).not.toBe('TARGET_NOT_FOUND');
      if (report !== 'TARGET_NOT_FOUND') {
        expect(report.violationCount).toBe(1);
      }
    });

    it('should exclude metrics outside time range', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 200,
        timestampMicros: 1000000n,
      });

      const report = monitor.getComplianceReport('LATENCY_P99', 2000000n, 10000000n);

      expect(report).not.toBe('TARGET_NOT_FOUND');
      if (report !== 'TARGET_NOT_FOUND') {
        expect(report.violationCount).toBe(0);
      }
    });
  });

  describe('getAlerts', () => {
    it('should return alerts since timestamp', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 120,
        timestampMicros: 1000000n,
      });

      clock.advance(5000000n);

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 130,
        timestampMicros: 6000000n,
      });

      const alerts = monitor.getAlerts(5000000n);

      expect(alerts).toHaveLength(1);
      expect(alerts[0]?.timestampMicros).toBeGreaterThanOrEqual(5000000n);
    });

    it('should return empty array when no recent alerts', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      const alerts = monitor.getAlerts(1000000n);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('pruneOldMetrics', () => {
    it('should remove metrics older than threshold', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 50,
        timestampMicros: 1000000n,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 60,
        timestampMicros: 5000000n,
      });

      const pruned = monitor.pruneOldMetrics(3000000n);

      expect(pruned).toBe(1);
    });

    it('should preserve metrics newer than threshold', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 50,
        timestampMicros: 5000000n,
      });

      const pruned = monitor.pruneOldMetrics(3000000n);

      expect(pruned).toBe(0);
    });

    it('should log pruning activity', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 50,
        timestampMicros: 1000000n,
      });

      monitor.pruneOldMetrics(3000000n);

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Pruned old metrics')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      monitor.setSlaTarget({
        metricType: 'LATENCY_P99',
        targetValue: 100,
        windowMicros: 60000000n,
        alertThreshold: 150,
      });

      monitor.setSlaTarget({
        metricType: 'ERROR_RATE',
        targetValue: 0.01,
        windowMicros: 60000000n,
        alertThreshold: 0.05,
      });

      monitor.recordMetric({
        metricType: 'LATENCY_P99',
        value: 120,
        timestampMicros: 1000000n,
      });

      monitor.recordMetric({
        metricType: 'ERROR_RATE',
        value: 0.005,
        timestampMicros: 1000000n,
      });

      const stats = monitor.getStats();

      expect(stats.totalMetrics).toBe(2n);
      expect(stats.totalViolations).toBe(1n);
      expect(stats.activeTargets).toBe(2);
      expect(stats.alertCount).toBe(1);
    });

    it('should handle empty monitor', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const monitor = createSlaMonitor({ clock, logger });

      const stats = monitor.getStats();

      expect(stats.totalMetrics).toBe(0n);
      expect(stats.totalViolations).toBe(0n);
      expect(stats.activeTargets).toBe(0);
      expect(stats.alertCount).toBe(0);
    });
  });
});
