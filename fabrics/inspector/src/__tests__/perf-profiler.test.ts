import { describe, it, expect } from 'vitest';
import { createPerfProfiler } from '../perf-profiler.js';
import type { PerfProfiler, PerfProfilerDeps } from '../perf-profiler.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createTestProfiler(): {
  profiler: PerfProfiler;
  advanceTime: (us: number) => void;
} {
  let time = 1000;
  let idCounter = 0;
  const deps: PerfProfilerDeps = {
    clock: { nowMicroseconds: () => time },
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'span-' + String(idCounter);
      },
    },
  };
  return {
    profiler: createPerfProfiler(deps),
    advanceTime: (us: number) => {
      time += us;
    },
  };
}

// ─── Basic Spans ────────────────────────────────────────────────────

describe('PerfProfiler basic spans', () => {
  it('begins and ends a span', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const spanId = profiler.beginSpan('test-op');
    advanceTime(100);
    const entry = profiler.endSpan(spanId);
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('test-op');
    expect(entry?.durationUs).toBe(100);
  });

  it('returns undefined for unknown span id', () => {
    const { profiler } = createTestProfiler();
    expect(profiler.endSpan('nonexistent')).toBeUndefined();
  });

  it('records span in recent entries', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const spanId = profiler.beginSpan('op');
    advanceTime(50);
    profiler.endSpan(spanId);
    const recent = profiler.getRecentSpans(10);
    expect(recent).toHaveLength(1);
    expect(recent[0]?.name).toBe('op');
  });

  it('tracks multiple spans independently', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const s1 = profiler.beginSpan('op-a');
    advanceTime(100);
    const s2 = profiler.beginSpan('op-b');
    advanceTime(200);
    profiler.endSpan(s1);
    advanceTime(50);
    profiler.endSpan(s2);
    const recent = profiler.getRecentSpans(10);
    expect(recent).toHaveLength(2);
  });
});

// ─── Nested Spans ───────────────────────────────────────────────────

describe('PerfProfiler nested spans', () => {
  it('creates child span with parent reference', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const parent = profiler.beginSpan('parent');
    advanceTime(10);
    const child = profiler.beginSpan('child', parent);
    advanceTime(50);
    const childEntry = profiler.endSpan(child);
    advanceTime(10);
    profiler.endSpan(parent);
    expect(childEntry?.parentSpanId).toBe(parent);
  });

  it('queries child spans by parent', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const parent = profiler.beginSpan('parent');
    advanceTime(10);
    const c1 = profiler.beginSpan('child-a', parent);
    advanceTime(20);
    profiler.endSpan(c1);
    const c2 = profiler.beginSpan('child-b', parent);
    advanceTime(30);
    profiler.endSpan(c2);
    advanceTime(10);
    profiler.endSpan(parent);
    const children = profiler.getChildSpans(parent);
    expect(children).toHaveLength(2);
  });

  it('root span has null parent', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const root = profiler.beginSpan('root');
    advanceTime(10);
    const entry = profiler.endSpan(root);
    expect(entry?.parentSpanId).toBeNull();
  });
});

// ─── Aggregation ────────────────────────────────────────────────────

describe('PerfProfiler aggregation', () => {
  it('aggregates span statistics', () => {
    const { profiler, advanceTime } = createTestProfiler();
    for (let i = 0; i < 5; i++) {
      const s = profiler.beginSpan('op');
      advanceTime(100 + i * 10);
      profiler.endSpan(s);
    }
    const agg = profiler.getAggregation('op');
    expect(agg?.count).toBe(5);
    expect(agg?.minUs).toBe(100);
    expect(agg?.maxUs).toBe(140);
    expect(agg?.avgUs).toBeGreaterThan(0);
  });

  it('computes p95 percentile', () => {
    const { profiler, advanceTime } = createTestProfiler();
    for (let i = 1; i <= 20; i++) {
      const s = profiler.beginSpan('op');
      advanceTime(i * 10);
      profiler.endSpan(s);
    }
    const agg = profiler.getAggregation('op');
    expect(agg?.p95Us).toBeGreaterThan(0);
  });

  it('lists all aggregations', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const s1 = profiler.beginSpan('a');
    advanceTime(10);
    profiler.endSpan(s1);
    const s2 = profiler.beginSpan('b');
    advanceTime(20);
    profiler.endSpan(s2);
    expect(profiler.listAggregations()).toHaveLength(2);
  });

  it('returns undefined for unknown aggregation', () => {
    const { profiler } = createTestProfiler();
    expect(profiler.getAggregation('nonexistent')).toBeUndefined();
  });
});

// ─── Budget Tracking ────────────────────────────────────────────────

describe('PerfProfiler budget tracking', () => {
  it('marks span as budget exceeded', () => {
    const { profiler, advanceTime } = createTestProfiler();
    profiler.setBudget('op', 100);
    const s = profiler.beginSpan('op');
    advanceTime(200);
    const entry = profiler.endSpan(s);
    expect(entry?.budgetExceeded).toBe(true);
  });

  it('does not mark span within budget', () => {
    const { profiler, advanceTime } = createTestProfiler();
    profiler.setBudget('op', 100);
    const s = profiler.beginSpan('op');
    advanceTime(50);
    const entry = profiler.endSpan(s);
    expect(entry?.budgetExceeded).toBe(false);
  });

  it('records budget violations', () => {
    const { profiler, advanceTime } = createTestProfiler();
    profiler.setBudget('op', 100);
    const s = profiler.beginSpan('op');
    advanceTime(200);
    profiler.endSpan(s);
    const violations = profiler.getViolations(10);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.exceededByUs).toBe(100);
  });

  it('tracks violation count in stats', () => {
    const { profiler, advanceTime } = createTestProfiler();
    profiler.setBudget('op', 50);
    const s1 = profiler.beginSpan('op');
    advanceTime(100);
    profiler.endSpan(s1);
    const s2 = profiler.beginSpan('op');
    advanceTime(200);
    profiler.endSpan(s2);
    expect(profiler.getStats().budgetViolationCount).toBe(2);
  });
});

// ─── Frame Budget ───────────────────────────────────────────────────

describe('PerfProfiler frame budget', () => {
  it('reports frame within budget', () => {
    const { profiler, advanceTime } = createTestProfiler();
    profiler.setFrameBudget(500);
    const frame = profiler.beginFrame();
    advanceTime(300);
    const report = profiler.endFrame(frame);
    expect(report?.withinBudget).toBe(true);
    expect(report?.totalFrameUs).toBe(300);
  });

  it('reports frame exceeding budget', () => {
    const { profiler, advanceTime } = createTestProfiler();
    profiler.setFrameBudget(500);
    const frame = profiler.beginFrame();
    advanceTime(600);
    const report = profiler.endFrame(frame);
    expect(report?.withinBudget).toBe(false);
  });

  it('counts child spans in frame report', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const frame = profiler.beginFrame();
    const c1 = profiler.beginSpan('a', frame);
    advanceTime(10);
    profiler.endSpan(c1);
    const c2 = profiler.beginSpan('b', frame);
    advanceTime(10);
    profiler.endSpan(c2);
    advanceTime(10);
    const report = profiler.endFrame(frame);
    expect(report?.spanCount).toBe(2);
  });
});

// ─── Hot Paths ──────────────────────────────────────────────────────

describe('PerfProfiler hot paths', () => {
  it('identifies hottest span by total time', () => {
    const { profiler, advanceTime } = createTestProfiler();
    for (let i = 0; i < 10; i++) {
      const s = profiler.beginSpan('hot');
      advanceTime(100);
      profiler.endSpan(s);
    }
    for (let i = 0; i < 10; i++) {
      const s = profiler.beginSpan('cold');
      advanceTime(10);
      profiler.endSpan(s);
    }
    const hotPaths = profiler.getHotPaths(2);
    expect(hotPaths[0]?.name).toBe('hot');
    expect(hotPaths[0]?.percentOfTotal).toBeGreaterThan(50);
  });

  it('returns empty for no spans', () => {
    const { profiler } = createTestProfiler();
    expect(profiler.getHotPaths(5)).toHaveLength(0);
  });
});

// ─── Reset & Stats ──────────────────────────────────────────────────

describe('PerfProfiler reset and stats', () => {
  it('resets all data', () => {
    const { profiler, advanceTime } = createTestProfiler();
    const s = profiler.beginSpan('op');
    advanceTime(10);
    profiler.endSpan(s);
    profiler.reset();
    expect(profiler.getStats().trackedSpanNames).toBe(0);
    expect(profiler.getStats().totalCompletedSpans).toBe(0);
  });

  it('tracks active span count', () => {
    const { profiler } = createTestProfiler();
    profiler.beginSpan('a');
    profiler.beginSpan('b');
    expect(profiler.getStats().activeSpans).toBe(2);
  });
});
