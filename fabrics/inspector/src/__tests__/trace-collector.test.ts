/**
 * Trace Collector Tests
 * Fabric: inspector
 */

import { describe, it, expect } from 'vitest';
import { createTraceCollector } from '../trace-collector.js';

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

describe('TraceCollector', () => {
  describe('startSpan', () => {
    it('should start a new span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const result = collector.startSpan('trace-1', 'span-1', 'http.request');

      expect(result).toBe('OK');
    });

    it('should reject duplicate span ID', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      const result = collector.startSpan('trace-1', 'span-1', 'http.request');

      expect(result).toBe('SPAN_ALREADY_EXISTS');
    });

    it('should start span with parent', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      const result = collector.startSpan('trace-1', 'span-2', 'db.query', 'span-1');

      expect(result).toBe('OK');
    });

    it('should increment total spans', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      collector.startSpan('trace-1', 'span-2', 'db.query');

      const stats = collector.getStats();
      expect(stats.totalSpans).toBe(2n);
    });

    it('should increment total traces for new trace', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      collector.startSpan('trace-2', 'span-2', 'http.request');

      const stats = collector.getStats();
      expect(stats.totalTraces).toBe(2n);
    });

    it('should log span start', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Span started')).toBe(true);
    });
  });

  describe('endSpan', () => {
    it('should end active span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(500000n);

      const result = collector.endSpan('span-1');

      expect(result).toBe('OK');
    });

    it('should return error for non-existent span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const result = collector.endSpan('span-999');

      expect(result).toBe('SPAN_NOT_FOUND');
    });

    it('should return error for already ended span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      collector.endSpan('span-1');

      const result = collector.endSpan('span-1');

      expect(result).toBe('SPAN_ALREADY_ENDED');
    });

    it('should calculate span duration', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(500000n);
      collector.endSpan('span-1');

      const span = collector.getSpan('span-1');

      expect(span).not.toBe('SPAN_NOT_FOUND');
      if (span !== 'SPAN_NOT_FOUND') {
        expect(span.endMicros).toBe(1500000n);
      }
    });

    it('should log span end', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(500000n);
      collector.endSpan('span-1');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Span ended')).toBe(true);
    });

    it('should warn on slow span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(2000000n);
      collector.endSpan('span-1');

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Slow span detected')).toBe(true);
    });
  });

  describe('addSpanTag', () => {
    it('should add tag to span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');

      const result = collector.addSpanTag('span-1', 'http.method', 'GET');

      expect(result).toBe('OK');
    });

    it('should return error for non-existent span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const result = collector.addSpanTag('span-999', 'key', 'value');

      expect(result).toBe('SPAN_NOT_FOUND');
    });

    it('should store tag value', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      collector.addSpanTag('span-1', 'http.method', 'GET');

      const span = collector.getSpan('span-1');

      expect(span).not.toBe('SPAN_NOT_FOUND');
      if (span !== 'SPAN_NOT_FOUND') {
        expect(span.tags.get('http.method')).toBe('GET');
      }
    });
  });

  describe('addSpanLog', () => {
    it('should add log to span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');

      const result = collector.addSpanLog('span-1', 'Query executed');

      expect(result).toBe('OK');
    });

    it('should return error for non-existent span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const result = collector.addSpanLog('span-999', 'Log message');

      expect(result).toBe('SPAN_NOT_FOUND');
    });

    it('should store log with timestamp', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(100000n);
      collector.addSpanLog('span-1', 'Query executed');

      const span = collector.getSpan('span-1');

      expect(span).not.toBe('SPAN_NOT_FOUND');
      if (span !== 'SPAN_NOT_FOUND') {
        expect(span.logs).toHaveLength(1);
        expect(span.logs[0]?.message).toBe('Query executed');
        expect(span.logs[0]?.timestampMicros).toBe(1100000n);
      }
    });
  });

  describe('getSpan', () => {
    it('should return span by ID', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');

      const span = collector.getSpan('span-1');

      expect(span).not.toBe('SPAN_NOT_FOUND');
      if (span !== 'SPAN_NOT_FOUND') {
        expect(span.spanId).toBe('span-1');
        expect(span.operationName).toBe('http.request');
      }
    });

    it('should return error for non-existent span', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const span = collector.getSpan('span-999');

      expect(span).toBe('SPAN_NOT_FOUND');
    });
  });

  describe('getTrace', () => {
    it('should return all spans in trace', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      collector.startSpan('trace-1', 'span-2', 'db.query', 'span-1');
      collector.startSpan('trace-1', 'span-3', 'cache.get', 'span-1');

      const spans = collector.getTrace('trace-1');

      expect(spans).toHaveLength(3);
    });

    it('should return empty array for non-existent trace', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const spans = collector.getTrace('trace-999');

      expect(spans).toHaveLength(0);
    });

    it('should not return spans from other traces', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      collector.startSpan('trace-2', 'span-2', 'http.request');

      const spans = collector.getTrace('trace-1');

      expect(spans).toHaveLength(1);
      expect(spans[0]?.spanId).toBe('span-1');
    });
  });

  describe('getSlowSpans', () => {
    it('should return spans exceeding threshold', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(2000000n);
      collector.endSpan('span-1');

      collector.startSpan('trace-1', 'span-2', 'db.query');
      clock.advance(100000n);
      collector.endSpan('span-2');

      const slowSpans = collector.getSlowSpans(1000000n);

      expect(slowSpans).toHaveLength(1);
      expect(slowSpans[0]?.spanId).toBe('span-1');
    });

    it('should sort by duration descending', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'op1');
      clock.advance(500000n);
      collector.endSpan('span-1');

      collector.startSpan('trace-1', 'span-2', 'op2');
      clock.advance(2000000n);
      collector.endSpan('span-2');

      collector.startSpan('trace-1', 'span-3', 'op3');
      clock.advance(1000000n);
      collector.endSpan('span-3');

      const slowSpans = collector.getSlowSpans(100000n);

      expect(slowSpans).toHaveLength(3);
      expect(slowSpans[0]?.spanId).toBe('span-2');
      expect(slowSpans[1]?.spanId).toBe('span-3');
      expect(slowSpans[2]?.spanId).toBe('span-1');
    });

    it('should exclude active spans', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(5000000n);

      const slowSpans = collector.getSlowSpans(1000000n);

      expect(slowSpans).toHaveLength(0);
    });
  });

  describe('getTraceReport', () => {
    it('should generate report for complete trace', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(100000n);
      collector.startSpan('trace-1', 'span-2', 'db.query', 'span-1');
      clock.advance(200000n);
      collector.endSpan('span-2');
      clock.advance(100000n);
      collector.endSpan('span-1');

      const report = collector.getTraceReport('trace-1');

      expect(report).not.toBe('TRACE_NOT_FOUND');
      if (report !== 'TRACE_NOT_FOUND') {
        expect(report.spanCount).toBe(2);
        expect(report.totalDurationMicros).toBe(400000n);
      }
    });

    it('should return error for non-existent trace', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const report = collector.getTraceReport('trace-999');

      expect(report).toBe('TRACE_NOT_FOUND');
    });

    it('should calculate max depth', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'root');
      collector.startSpan('trace-1', 'span-2', 'child1', 'span-1');
      collector.startSpan('trace-1', 'span-3', 'grandchild', 'span-2');

      collector.endSpan('span-3');
      collector.endSpan('span-2');
      collector.endSpan('span-1');

      const report = collector.getTraceReport('trace-1');

      expect(report).not.toBe('TRACE_NOT_FOUND');
      if (report !== 'TRACE_NOT_FOUND') {
        expect(report.maxDepth).toBe(3);
      }
    });

    it('should calculate critical path', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'root');
      clock.advance(100000n);
      collector.endSpan('span-1');

      collector.startSpan('trace-1', 'span-2', 'child', 'span-1');
      clock.advance(200000n);
      collector.endSpan('span-2');

      const report = collector.getTraceReport('trace-1');

      expect(report).not.toBe('TRACE_NOT_FOUND');
      if (report !== 'TRACE_NOT_FOUND') {
        expect(report.criticalPath).toContain('span-1');
        expect(report.criticalPath).toContain('span-2');
      }
    });
  });

  describe('pruneCompletedTraces', () => {
    it('should remove completed old traces', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(100000n);
      collector.endSpan('span-1');

      clock.advance(5000000n);

      const pruned = collector.pruneCompletedTraces(5000000n);

      expect(pruned).toBe(1);

      const spans = collector.getTrace('trace-1');
      expect(spans).toHaveLength(0);
    });

    it('should preserve incomplete traces', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');

      clock.advance(5000000n);

      const pruned = collector.pruneCompletedTraces(5000000n);

      expect(pruned).toBe(0);
    });

    it('should preserve recent completed traces', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(100000n);
      collector.endSpan('span-1');

      clock.advance(100000n);

      const pruned = collector.pruneCompletedTraces(5000000n);

      expect(pruned).toBe(0);
    });

    it('should log pruning activity', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      clock.advance(100000n);
      collector.endSpan('span-1');

      clock.advance(5000000n);

      collector.pruneCompletedTraces(5000000n);

      const logs = logger.getLogs();
      expect(logs.some((l) => l.msg === 'Pruned completed traces')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      collector.startSpan('trace-1', 'span-1', 'http.request');
      collector.startSpan('trace-1', 'span-2', 'db.query');
      collector.startSpan('trace-2', 'span-3', 'http.request');

      collector.endSpan('span-1');

      const stats = collector.getStats();

      expect(stats.totalSpans).toBe(3n);
      expect(stats.totalTraces).toBe(2n);
      expect(stats.activeSpans).toBe(2);
    });

    it('should handle empty collector', () => {
      const clock = createMockClock(1000000n);
      const logger = createMockLogger();
      const collector = createTraceCollector({ clock, logger });

      const stats = collector.getStats();

      expect(stats.totalSpans).toBe(0n);
      expect(stats.totalTraces).toBe(0n);
      expect(stats.activeSpans).toBe(0);
    });
  });
});
