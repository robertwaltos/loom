/**
 * Request Deduplicator Tests
 * Fabric: selvage
 */

import { describe, it, expect } from 'vitest';
import { createRequestDeduplicator } from '../request-deduplicator.js';

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

describe('RequestDeduplicator', () => {
  describe('checkDuplicate', () => {
    it('should return NEW for first request', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      const result = dedup.checkDuplicate('key-1');

      expect(result.status).toBe('NEW');
    });

    it('should return IN_PROGRESS for recorded but incomplete request', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      const result = dedup.checkDuplicate('key-1');

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should return COMPLETED for duplicate request with result', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      const result = dedup.checkDuplicate('key-1');

      expect(result.status).toBe('COMPLETED');
      if (result.status === 'COMPLETED') {
        expect(result.result).toBe('SUCCESS');
      }
    });

    it('should increment hit count on duplicate detection', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      dedup.checkDuplicate('key-1');
      dedup.checkDuplicate('key-1');
      dedup.checkDuplicate('key-1');

      const logs = logger.getLogs();
      const duplicateLogs = logs.filter((l) => l.msg === 'Duplicate request detected');
      expect(duplicateLogs).toHaveLength(3);
    });

    it('should calculate age of cached result', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(5000000n);

      const result = dedup.checkDuplicate('key-1');

      expect(result.status).toBe('COMPLETED');
      if (result.status === 'COMPLETED') {
        expect(result.age).toBe(5000000n);
      }
    });

    it('should return NEW for expired entry', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(1000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(2000000n);

      const result = dedup.checkDuplicate('key-1');

      expect(result.status).toBe('NEW');
    });
  });

  describe('recordRequest', () => {
    it('should record new request successfully', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      const result = dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      expect(result).toBe('OK');
    });

    it('should reject duplicate in-progress recording', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      const request = {
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      };

      dedup.recordRequest(request);
      const result = dedup.recordRequest(request);

      expect(result).toBe('ALREADY_RECORDED');
    });

    it('should log request recording', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Request recorded')).toBe(true);
    });
  });

  describe('recordResult', () => {
    it('should record result for in-progress request', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      const result = dedup.recordResult('key-1', 'SUCCESS');

      expect(result).toBe('OK');
    });

    it('should return error for unknown request', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      const result = dedup.recordResult('key-999', 'SUCCESS');

      expect(result).toBe('REQUEST_NOT_FOUND');
    });

    it('should remove request from in-progress set', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      const checkResult = dedup.checkDuplicate('key-1');
      expect(checkResult.status).toBe('COMPLETED');
    });

    it('should set expiry time based on TTL', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(5000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(4000000n);
      const result1 = dedup.checkDuplicate('key-1');
      expect(result1.status).toBe('COMPLETED');

      clock.advance(2000000n);
      const result2 = dedup.checkDuplicate('key-1');
      expect(result2.status).toBe('NEW');
    });

    it('should log result recording', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Result recorded')).toBe(true);
    });
  });

  describe('getResult', () => {
    it('should return result for completed request', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      const result = dedup.getResult('key-1');

      expect(result).toBe('SUCCESS');
    });

    it('should return RESULT_NOT_READY for in-progress request', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      const result = dedup.getResult('key-1');

      expect(result).toBe('RESULT_NOT_READY');
    });

    it('should return REQUEST_NOT_FOUND for unknown key', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      const result = dedup.getResult('key-999');

      expect(result).toBe('REQUEST_NOT_FOUND');
    });
  });

  describe('pruneExpired', () => {
    it('should remove expired entries', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(1000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(2000000n);

      const pruned = dedup.pruneExpired();

      expect(pruned).toBe(1);

      const stats = dedup.getStats();
      expect(stats.cacheSize).toBe(0);
    });

    it('should preserve non-expired entries', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(5000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(2000000n);

      const pruned = dedup.pruneExpired();

      expect(pruned).toBe(0);

      const stats = dedup.getStats();
      expect(stats.cacheSize).toBe(1);
    });

    it('should prune multiple expired entries', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(1000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });
      dedup.recordResult('key-1', 'SUCCESS');

      dedup.recordRequest({
        key: 'key-2',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });
      dedup.recordResult('key-2', 'SUCCESS');

      clock.advance(2000000n);

      const pruned = dedup.pruneExpired();

      expect(pruned).toBe(2);
    });

    it('should log pruning activity', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(1000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(2000000n);

      dedup.pruneExpired();

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Pruned expired entries')).toBe(true);
    });

    it('should not log when nothing pruned', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      logger.getLogs().length = 0;

      dedup.pruneExpired();

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Pruned expired entries')).toBe(false);
    });
  });

  describe('setTtl', () => {
    it('should update TTL for future entries', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(2000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(1500000n);
      const result1 = dedup.checkDuplicate('key-1');
      expect(result1.status).toBe('COMPLETED');

      clock.advance(1000000n);
      const result2 = dedup.checkDuplicate('key-1');
      expect(result2.status).toBe('NEW');
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      dedup.checkDuplicate('key-1');
      dedup.checkDuplicate('key-1');
      dedup.checkDuplicate('key-2');

      const stats = dedup.getStats();

      expect(stats.totalRequests).toBe(3n);
      expect(stats.totalDuplicates).toBe(2n);
      expect(stats.cacheSize).toBe(1);
    });

    it('should track pruning statistics', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      dedup.setTtl(1000000n);

      dedup.recordRequest({
        key: 'key-1',
        method: 'POST',
        path: '/api/test',
        body: '{}',
        timestampMicros: 1000000n,
      });

      dedup.recordResult('key-1', 'SUCCESS');

      clock.advance(2000000n);
      dedup.pruneExpired();

      const stats = dedup.getStats();

      expect(stats.totalPruned).toBe(1n);
    });

    it('should handle empty deduplicator', () => {
      const clock = createMockClock();
      const logger = createMockLogger();
      const dedup = createRequestDeduplicator({ clock, logger });

      const stats = dedup.getStats();

      expect(stats.totalRequests).toBe(0n);
      expect(stats.totalDuplicates).toBe(0n);
      expect(stats.totalPruned).toBe(0n);
      expect(stats.cacheSize).toBe(0);
    });
  });
});
