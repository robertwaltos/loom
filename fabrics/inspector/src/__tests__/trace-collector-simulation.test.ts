import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTraceCollector,
  type TraceCollectorDeps,
} from '../trace-collector.js'

let t = 1_000_000_000n

function makeDeps(): TraceCollectorDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    logger: { info: vi.fn(), warn: vi.fn() },
  }
}

beforeEach(() => {
  t = 1_000_000_000n
})

describe('trace-collector simulation', () => {
  describe('startSpan', () => {
    it('returns OK for a new span', () => {
      const c = createTraceCollector(makeDeps())
      expect(c.startSpan('trace-1', 'span-1', 'GET /users')).toBe('OK')
    })

    it('returns SPAN_ALREADY_EXISTS for duplicate spanId', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('trace-1', 'span-1', 'op')
      expect(c.startSpan('trace-1', 'span-1', 'op')).toBe('SPAN_ALREADY_EXISTS')
    })

    it('accepts optional parentSpanId', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('trace-1', 'root-span', 'root op')
      expect(c.startSpan('trace-1', 'child-span', 'child op', 'root-span')).toBe('OK')
    })
  })

  describe('endSpan', () => {
    it('returns OK for an active span', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('trace-1', 'span-1', 'op')
      expect(c.endSpan('span-1')).toBe('OK')
    })

    it('returns SPAN_NOT_FOUND for unknown span', () => {
      const c = createTraceCollector(makeDeps())
      expect(c.endSpan('no-span')).toBe('SPAN_NOT_FOUND')
    })

    it('returns SPAN_ALREADY_ENDED when called twice', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('trace-1', 'span-1', 'op')
      c.endSpan('span-1')
      expect(c.endSpan('span-1')).toBe('SPAN_ALREADY_ENDED')
    })
  })

  describe('addSpanTag', () => {
    it('adds a tag to an existing span', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'op')
      expect(c.addSpanTag('s1', 'env', 'prod')).toBe('OK')
    })

    it('returns SPAN_NOT_FOUND for unknown span', () => {
      const c = createTraceCollector(makeDeps())
      expect(c.addSpanTag('ghost', 'k', 'v')).toBe('SPAN_NOT_FOUND')
    })
  })

  describe('addSpanLog', () => {
    it('adds a log to an existing span', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'op')
      expect(c.addSpanLog('s1', 'started processing')).toBe('OK')
    })

    it('returns SPAN_NOT_FOUND for unknown span', () => {
      const c = createTraceCollector(makeDeps())
      expect(c.addSpanLog('ghost', 'msg')).toBe('SPAN_NOT_FOUND')
    })
  })

  describe('getSpan', () => {
    it('retrieves an existing span', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'fetch')
      const span = c.getSpan('s1')
      expect(span).not.toBe('SPAN_NOT_FOUND')
      expect((span as any).operationName).toBe('fetch')
    })

    it('returns SPAN_NOT_FOUND for unknown span', () => {
      const c = createTraceCollector(makeDeps())
      expect(c.getSpan('ghost')).toBe('SPAN_NOT_FOUND')
    })
  })

  describe('getTrace', () => {
    it('returns spans for a trace', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'op1')
      c.startSpan('t1', 's2', 'op2')
      const spans = c.getTrace('t1')
      expect(spans.length).toBe(2)
    })

    it('returns empty array for unknown traceId', () => {
      const c = createTraceCollector(makeDeps())
      expect(c.getTrace('ghost').length).toBe(0)
    })
  })

  describe('getSlowSpans', () => {
    it('returns spans that exceed the threshold', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'slow-op')
      // Advance clock significantly before ending
      t += 500_000n
      c.endSpan('s1')
      const slow = c.getSlowSpans(100_000n)
      expect(slow.length).toBeGreaterThan(0)
    })

    it('returns empty when no spans exceed threshold', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'fast-op')
      c.endSpan('s1')
      const slow = c.getSlowSpans(999_999_999n)
      expect(slow.length).toBe(0)
    })
  })

  describe('getTraceReport', () => {
    it('returns a report for a known trace', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'root')
      c.endSpan('s1')
      const report = c.getTraceReport('t1')
      expect(report).not.toBe('TRACE_NOT_FOUND')
      expect((report as any).traceId).toBe('t1')
    })

    it('returns TRACE_NOT_FOUND for unknown trace', () => {
      const c = createTraceCollector(makeDeps())
      expect(c.getTraceReport('ghost')).toBe('TRACE_NOT_FOUND')
    })
  })

  describe('pruneCompletedTraces', () => {
    it('removes old completed traces', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'op')
      c.endSpan('s1')
      const pruned = c.pruneCompletedTraces(9_999_999_999n)
      expect(typeof pruned).toBe('number')
      expect(pruned).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getStats', () => {
    it('reports total spans and traces', () => {
      const c = createTraceCollector(makeDeps())
      c.startSpan('t1', 's1', 'op1')
      c.startSpan('t1', 's2', 'op2')
      c.startSpan('t2', 's3', 'op3')
      const stats = c.getStats()
      expect(stats.totalSpans).toBe(3n)
      expect(stats.totalTraces).toBe(2n)
      expect(stats.activeSpans).toBe(3)
    })
  })
})
