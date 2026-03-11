import { describe, it, expect } from 'vitest';
import { createTraceCollectorSystem } from '../trace-collector-system.js';
import type { TraceCollectorSystem, Trace, TraceSpan } from '../trace-collector-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): { system: TraceCollectorSystem; advanceTime: (us: bigint) => void } {
  let now = 1_000_000n;
  return {
    system: createTraceCollectorSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'id-' + String(++idCounter) },
      logger: { info: () => undefined, warn: () => undefined },
    }),
    advanceTime(us: bigint) {
      now += us;
    },
  };
}

function asTrace(r: Trace | string): Trace {
  if (typeof r === 'string') throw new Error('Expected Trace, got: ' + r);
  return r;
}

function asSpan(r: TraceSpan | string): TraceSpan {
  if (typeof r === 'string') throw new Error('Expected TraceSpan, got: ' + r);
  return r;
}

// ─── startTrace ───────────────────────────────────────────────────────────────

describe('startTrace', () => {
  it('creates a trace with a root span', () => {
    const { system } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'auth-service', 'login'));
    expect(trace.traceId).toBe('t1');
    expect(trace.serviceName).toBe('auth-service');
    expect(trace.totalSpans).toBe(1);
    expect(trace.errorCount).toBe(0);
    expect(trace.endedAt).toBeNull();
  });

  it('creates a root span for the trace', () => {
    const { system } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'op'));
    const span = system.getSpan(trace.rootSpanId);
    expect(span?.operationName).toBe('op');
    expect(span?.parentSpanId).toBeNull();
    expect(span?.status).toBe('IN_PROGRESS');
  });

  it('returns already-exists for duplicate traceId', () => {
    const { system } = createTestSystem();
    system.startTrace('t1', 'svc', 'op');
    expect(system.startTrace('t1', 'svc', 'op')).toBe('already-exists');
  });

  it('stores tags on root span', () => {
    const { system } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'op', { env: 'prod' }));
    const span = system.getSpan(trace.rootSpanId);
    expect(span?.tags['env']).toBe('prod');
  });
});

// ─── startSpan ────────────────────────────────────────────────────────────────

describe('startSpan', () => {
  it('adds a child span to an existing trace', () => {
    const { system } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc-a', 'op-a'));
    const span = asSpan(system.startSpan('t1', 'svc-b', 'op-b', trace.rootSpanId));
    expect(span.traceId).toBe('t1');
    expect(span.parentSpanId).toBe(trace.rootSpanId);
    expect(system.getTrace('t1')?.totalSpans).toBe(2);
  });

  it('allows null parentSpanId when trace has no root (additional root)', () => {
    const { system } = createTestSystem();
    system.startTrace('t1', 'svc-a', 'op-a');
    const span = asSpan(system.startSpan('t1', 'svc-b', 'op-b', null));
    expect(span.parentSpanId).toBeNull();
  });

  it('returns trace-not-found for unknown traceId', () => {
    const { system } = createTestSystem();
    expect(system.startSpan('bad-trace', 'svc', 'op', null)).toBe('trace-not-found');
  });

  it('returns parent-not-found when parentSpanId not in trace', () => {
    const { system } = createTestSystem();
    system.startTrace('t1', 'svc', 'op');
    expect(system.startSpan('t1', 'svc', 'op', 'nonexistent-span')).toBe('parent-not-found');
  });
});

// ─── endSpan ──────────────────────────────────────────────────────────────────

describe('endSpan', () => {
  it('ends a span and sets duration', () => {
    const { system, advanceTime } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'op'));
    advanceTime(500n);
    const result = system.endSpan(trace.rootSpanId, 'SUCCESS');
    expect(result).toEqual({ success: true });
    const span = system.getSpan(trace.rootSpanId);
    expect(span?.status).toBe('SUCCESS');
    expect(span?.durationUs).toBe(500n);
    expect(span?.endedAt).not.toBeNull();
  });

  it('increments trace errorCount on ERROR status', () => {
    const { system } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'op'));
    system.endSpan(trace.rootSpanId, 'ERROR', 'something failed');
    expect(system.getTrace('t1')?.errorCount).toBe(1);
  });

  it('sets trace endedAt when all spans complete', () => {
    const { system, advanceTime } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'op'));
    advanceTime(1000n);
    system.endSpan(trace.rootSpanId, 'SUCCESS');
    expect(system.getTrace('t1')?.endedAt).not.toBeNull();
  });

  it('does not set trace endedAt when some spans still in progress', () => {
    const { system, advanceTime } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'op-root'));
    const child = asSpan(system.startSpan('t1', 'svc', 'op-child', trace.rootSpanId));
    advanceTime(500n);
    system.endSpan(trace.rootSpanId, 'SUCCESS');
    expect(system.getTrace('t1')?.endedAt).toBeNull();
    system.endSpan(child.spanId, 'SUCCESS');
    expect(system.getTrace('t1')?.endedAt).not.toBeNull();
  });

  it('records errorMessage on span', () => {
    const { system } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'op'));
    system.endSpan(trace.rootSpanId, 'ERROR', 'timeout exceeded');
    expect(system.getSpan(trace.rootSpanId)?.errorMessage).toBe('timeout exceeded');
  });

  it('returns span-not-found for unknown spanId', () => {
    const { system } = createTestSystem();
    expect(system.endSpan('bad-id', 'SUCCESS')).toEqual({
      success: false,
      error: 'span-not-found',
    });
  });
});

// ─── listSpans ────────────────────────────────────────────────────────────────

describe('listSpans', () => {
  it('returns all spans for a trace', () => {
    const { system } = createTestSystem();
    const trace = asTrace(system.startTrace('t1', 'svc', 'root-op'));
    system.startSpan('t1', 'svc-b', 'child-op', trace.rootSpanId);
    expect(system.listSpans('t1')).toHaveLength(2);
  });

  it('returns empty for unknown traceId', () => {
    const { system } = createTestSystem();
    expect(system.listSpans('unknown')).toHaveLength(0);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns zero stats for empty system', () => {
    const { system } = createTestSystem();
    const stats = system.getStats();
    expect(stats.totalTraces).toBe(0);
    expect(stats.completedTraces).toBe(0);
    expect(stats.errorRate).toBe(0);
    expect(stats.avgDurationUs).toBe(0n);
  });

  it('counts completed traces correctly', () => {
    const { system, advanceTime } = createTestSystem();
    const t1 = asTrace(system.startTrace('t1', 'svc', 'op'));
    system.startTrace('t2', 'svc', 'op');
    advanceTime(100n);
    system.endSpan(t1.rootSpanId, 'SUCCESS');
    const stats = system.getStats();
    expect(stats.totalTraces).toBe(2);
    expect(stats.completedTraces).toBe(1);
  });

  it('calculates error rate correctly', () => {
    const { system } = createTestSystem();
    const t1 = asTrace(system.startTrace('t1', 'svc', 'op'));
    system.endSpan(t1.rootSpanId, 'ERROR');
    const stats = system.getStats();
    expect(stats.errorRate).toBe(1);
  });

  it('calculates avgDurationUs for completed traces', () => {
    const { system, advanceTime } = createTestSystem();
    const t1 = asTrace(system.startTrace('t1', 'svc', 'op'));
    advanceTime(200n);
    system.endSpan(t1.rootSpanId, 'SUCCESS');
    const stats = system.getStats();
    expect(stats.avgDurationUs).toBeGreaterThan(0n);
  });
});
