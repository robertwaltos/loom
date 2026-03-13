import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTraceCollectorSystem,
  type TraceCollectorSystemDeps,
} from '../trace-collector-system.js'

let t = 1_000_000_000n
let seq = 0

function makeDeps(): TraceCollectorSystemDeps {
  return {
    clock: { nowMicroseconds: () => (t += 1000n) },
    idGen: { next: () => `tcs-${++seq}` },
    logger: { info: vi.fn(), warn: vi.fn() },
  }
}

beforeEach(() => {
  t = 1_000_000_000n
  seq = 0
})

describe('trace-collector-system simulation', () => {
  describe('startTrace', () => {
    it('creates a new trace', () => {
      const c = createTraceCollectorSystem(makeDeps())
      const trace = c.startTrace('trace-1', 'api', 'GET /users')
      expect(typeof trace).toBe('object')
      const t2 = trace as any
      expect(t2.traceId).toBe('trace-1')
      expect(t2.serviceName).toBe('api')
    })

    it('returns error for duplicate traceId', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('trace-1', 'api', 'GET /users')
      const dup = c.startTrace('trace-1', 'api', 'GET /users')
      expect(typeof dup).toBe('string') // TracerError
    })

    it('accepts optional tags', () => {
      const c = createTraceCollectorSystem(makeDeps())
      const trace = c.startTrace('trace-2', 'svc', 'op', { env: 'test' })
      expect(typeof trace).toBe('object')
    })
  })

  describe('startSpan', () => {
    it('adds a span to an existing trace', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('trace-1', 'api', 'GET /users')
      const span = c.startSpan('trace-1', 'db', 'SELECT users', null)
      expect(typeof span).toBe('object')
      const s = span as any
      expect(s.traceId).toBe('trace-1')
      expect(s.serviceName).toBe('db')
    })

    it('errors for non-existent trace', () => {
      const c = createTraceCollectorSystem(makeDeps())
      const result = c.startSpan('ghost-trace', 'db', 'op', null)
      expect(typeof result).toBe('string')
    })

    it('creates a child span with parentSpanId', () => {
      const c = createTraceCollectorSystem(makeDeps())
      const trace = c.startTrace('trace-1', 'api', 'root') as any
      const rootSpanId = trace.rootSpanId
      const child = c.startSpan('trace-1', 'cache', 'GET key', rootSpanId)
      expect(typeof child).toBe('object')
    })
  })

  describe('endSpan', () => {
    it('ends a span in progress', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('trace-1', 'api', 'root')
      const span = c.startSpan('trace-1', 'db', 'query', null) as any
      const result = c.endSpan(span.spanId, 'SUCCESS')
      expect(result).toMatchObject({ success: true })
    })

    it('errors for non-existent spanId', () => {
      const c = createTraceCollectorSystem(makeDeps())
      const result = c.endSpan('no-span', 'SUCCESS')
      expect(result).toMatchObject({ success: false })
    })

    it('supports error status with message', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('trace-1', 'api', 'root')
      const span = c.startSpan('trace-1', 'db', 'query', null) as any
      const result = c.endSpan(span.spanId, 'ERROR', 'DB connection failed')
      expect(result).toMatchObject({ success: true })
    })
  })

  describe('getTrace and getSpan', () => {
    it('retrieves a trace by id', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('trace-1', 'api', 'root')
      const found = c.getTrace('trace-1')
      expect(found).toBeDefined()
      expect((found as any).traceId).toBe('trace-1')
    })

    it('returns undefined for unknown traceId', () => {
      const c = createTraceCollectorSystem(makeDeps())
      expect(c.getTrace('ghost')).toBeUndefined()
    })

    it('retrieves a span by id', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('trace-1', 'api', 'root')
      const span = c.startSpan('trace-1', 'db', 'query', null) as any
      const found = c.getSpan(span.spanId)
      expect(found).toBeDefined()
    })

    it('returns undefined for unknown spanId', () => {
      const c = createTraceCollectorSystem(makeDeps())
      expect(c.getSpan('ghost')).toBeUndefined()
    })
  })

  describe('listSpans', () => {
    it('returns spans for a trace', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('trace-1', 'api', 'root')
      c.startSpan('trace-1', 'db', 'query1', null)
      c.startSpan('trace-1', 'cache', 'get key', null)
      const spans = c.listSpans('trace-1')
      expect(spans.length).toBeGreaterThanOrEqual(2)
    })

    it('returns empty array for unknown trace', () => {
      const c = createTraceCollectorSystem(makeDeps())
      expect(c.listSpans('ghost').length).toBe(0)
    })
  })

  describe('getStats', () => {
    it('reflects trace count after activity', () => {
      const c = createTraceCollectorSystem(makeDeps())
      c.startTrace('t1', 'api', 'op1')
      c.startTrace('t2', 'svc', 'op2')
      const stats = c.getStats()
      expect(stats.totalTraces).toBe(2)
    })
  })
})
