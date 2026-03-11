/**
 * Access Log Tests
 * Fabric: dye-house
 */

import { describe, it, expect } from 'vitest';
import { createAccessLog } from '../access-log.js';

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

describe('AccessLog', () => {
  describe('logAccess', () => {
    it('should log allowed access event', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({});
      expect(events).toHaveLength(1);
    });

    it('should log denied access event', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'DENIED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({ outcome: 'DENIED' });
      expect(events).toHaveLength(1);
    });

    it('should track failure count for denied events', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'DENIED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const failureRate = log.getFailureRate('user-1');
      expect(failureRate).toBe(1);
    });

    it('should log blocked access event', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'DELETE',
        outcome: 'BLOCKED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({ outcome: 'BLOCKED' });
      expect(events).toHaveLength(1);
    });

    it('should log rate limited event', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'RATE_LIMITED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({ outcome: 'RATE_LIMITED' });
      expect(events).toHaveLength(1);
    });

    it('should log access event with metadata', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: { userAgent: 'Mozilla/5.0' },
      });

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Access logged')).toBe(true);
    });
  });

  describe('queryAccess', () => {
    it('should query by userId', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-2',
        resourceId: 'resource-2',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.11',
        metadata: {},
      });

      const events = log.queryAccess({ userId: 'user-1' });
      expect(events).toHaveLength(1);
      expect(events[0]?.userId).toBe('user-1');
    });

    it('should query by resourceId', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-2',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({ resourceId: 'resource-2' });
      expect(events).toHaveLength(1);
      expect(events[0]?.resourceId).toBe('resource-2');
    });

    it('should query by outcome', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'DENIED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({ outcome: 'DENIED' });
      expect(events).toHaveLength(1);
      expect(events[0]?.outcome).toBe('DENIED');
    });

    it('should query by time range', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 5000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({
        startMicros: 2000000n,
        endMicros: 6000000n,
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.timestampMicros).toBe(5000000n);
    });

    it('should respect query limit', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      for (let i = 0; i < 10; i = i + 1) {
        log.logAccess({
          userId: 'user-1',
          resourceId: 'resource-' + String(i),
          action: 'READ',
          outcome: 'ALLOWED',
          timestampMicros: 1000000n,
          ipAddress: '192.168.1.10',
          metadata: {},
        });
      }

      const events = log.queryAccess({ userId: 'user-1', limit: 5 });
      expect(events).toHaveLength(5);
    });

    it('should combine multiple query filters', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'DENIED',
        timestampMicros: 2000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const events = log.queryAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        outcome: 'DENIED',
      });

      expect(events).toHaveLength(1);
      expect(events[0]?.outcome).toBe('DENIED');
    });
  });

  describe('detectSuspiciousPattern', () => {
    it('should detect pattern with multiple failures', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      for (let i = 0; i < 6; i = i + 1) {
        log.logAccess({
          userId: 'user-1',
          resourceId: 'resource-' + String(i),
          action: 'READ',
          outcome: 'DENIED',
          timestampMicros: 1000000n + BigInt(i * 100000),
          ipAddress: '192.168.1.10',
          metadata: {},
        });
      }

      const pattern = log.detectSuspiciousPattern('user-1');

      expect(pattern).not.toBe('NO_PATTERN');
      if (pattern !== 'NO_PATTERN') {
        expect(pattern.failureCount).toBe(6);
        expect(pattern.suspiciousScore).toBeGreaterThan(0);
      }
    });

    it('should return NO_PATTERN for low failure count', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      for (let i = 0; i < 3; i = i + 1) {
        log.logAccess({
          userId: 'user-1',
          resourceId: 'resource-' + String(i),
          action: 'READ',
          outcome: 'DENIED',
          timestampMicros: 1000000n,
          ipAddress: '192.168.1.10',
          metadata: {},
        });
      }

      const pattern = log.detectSuspiciousPattern('user-1');

      expect(pattern).toBe('NO_PATTERN');
    });

    it('should only count failures in time window', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      for (let i = 0; i < 6; i = i + 1) {
        log.logAccess({
          userId: 'user-1',
          resourceId: 'resource-' + String(i),
          action: 'READ',
          outcome: 'DENIED',
          timestampMicros: 1000000n,
          ipAddress: '192.168.1.10',
          metadata: {},
        });
      }

      clock.advance(4000000000n);

      const pattern = log.detectSuspiciousPattern('user-1');

      expect(pattern).toBe('NO_PATTERN');
    });

    it('should calculate suspicion score', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      for (let i = 0; i < 8; i = i + 1) {
        log.logAccess({
          userId: 'user-1',
          resourceId: 'resource-' + String(i),
          action: 'READ',
          outcome: 'DENIED',
          timestampMicros: 1000000n,
          ipAddress: '192.168.1.10',
          metadata: {},
        });
      }

      const pattern = log.detectSuspiciousPattern('user-1');

      expect(pattern).not.toBe('NO_PATTERN');
      if (pattern !== 'NO_PATTERN') {
        expect(pattern.suspiciousScore).toBe(80);
      }
    });

    it('should cap suspicious score at 100', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      for (let i = 0; i < 20; i = i + 1) {
        log.logAccess({
          userId: 'user-1',
          resourceId: 'resource-' + String(i),
          action: 'READ',
          outcome: 'DENIED',
          timestampMicros: 1000000n,
          ipAddress: '192.168.1.10',
          metadata: {},
        });
      }

      const pattern = log.detectSuspiciousPattern('user-1');

      expect(pattern).not.toBe('NO_PATTERN');
      if (pattern !== 'NO_PATTERN') {
        expect(pattern.suspiciousScore).toBe(100);
      }
    });

    it('should log suspicious pattern warning', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      for (let i = 0; i < 6; i = i + 1) {
        log.logAccess({
          userId: 'user-1',
          resourceId: 'resource-' + String(i),
          action: 'READ',
          outcome: 'DENIED',
          timestampMicros: 1000000n,
          ipAddress: '192.168.1.10',
          metadata: {},
        });
      }

      log.detectSuspiciousPattern('user-1');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Suspicious pattern detected')).toBe(true);
    });
  });

  describe('getAccessReport', () => {
    it('should generate report with all outcomes', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'DENIED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-2',
        resourceId: 'resource-2',
        action: 'DELETE',
        outcome: 'BLOCKED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.11',
        metadata: {},
      });

      const report = log.getAccessReport(0n, 2000000n);

      expect(report.totalEvents).toBe(3);
      expect(report.allowedCount).toBe(1);
      expect(report.deniedCount).toBe(1);
      expect(report.blockedCount).toBe(1);
    });

    it('should calculate failure rate', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'DENIED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const report = log.getAccessReport(0n, 2000000n);

      expect(report.failureRate).toBe(0.5);
    });

    it('should count unique users and resources', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-2',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.11',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-2',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const report = log.getAccessReport(0n, 2000000n);

      expect(report.uniqueUsers).toBe(2);
      expect(report.uniqueResources).toBe(2);
    });

    it('should handle empty time range', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      const report = log.getAccessReport(0n, 0n);

      expect(report.totalEvents).toBe(0);
      expect(report.failureRate).toBe(0);
    });
  });

  describe('getFailureRate', () => {
    it('should calculate failure rate for user', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'DENIED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const rate = log.getFailureRate('user-1');

      expect(rate).toBe(0.5);
    });

    it('should return 0 for user with no events', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      const rate = log.getFailureRate('user-999');

      expect(rate).toBe(0);
    });

    it('should count BLOCKED as failure', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'WRITE',
        outcome: 'BLOCKED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const rate = log.getFailureRate('user-1');

      expect(rate).toBe(0.5);
    });
  });

  describe('pruneOldEvents', () => {
    it('should remove events older than threshold', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 5000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const pruned = log.pruneOldEvents(3000000n);

      expect(pruned).toBe(1);

      const events = log.queryAccess({});
      expect(events).toHaveLength(1);
      expect(events[0]?.timestampMicros).toBe(5000000n);
    });

    it('should preserve events newer than threshold', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 5000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      const pruned = log.pruneOldEvents(3000000n);

      expect(pruned).toBe(0);

      const events = log.queryAccess({});
      expect(events).toHaveLength(1);
    });

    it('should log pruning activity', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const log = createAccessLog({ clock, logger });

      log.logAccess({
        userId: 'user-1',
        resourceId: 'resource-1',
        action: 'READ',
        outcome: 'ALLOWED',
        timestampMicros: 1000000n,
        ipAddress: '192.168.1.10',
        metadata: {},
      });

      log.pruneOldEvents(3000000n);

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Pruned old events')).toBe(true);
    });
  });
});
