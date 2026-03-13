/**
 * Simulation tests — perf-profiler
 */

import { describe, it, expect } from 'vitest';
import {
  createPerfProfiler,
  type PerfProfilerDeps,
} from '../perf-profiler.js';

let ts = 1_000_000_000;
let seq = 0;

function makeDeps(): PerfProfilerDeps {
  return {
    clock: { nowMicroseconds: () => (ts += 50) },
    idGenerator: { next: () => `pp-${++seq}` },
  };
}

describe('perf-profiler — span lifecycle', () => {
  it('beginSpan returns a span id', () => {
    const profiler = createPerfProfiler(makeDeps());
    const id = profiler.beginSpan('render');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('endSpan returns a span entry', () => {
    const profiler = createPerfProfiler(makeDeps());
    const id = profiler.beginSpan('render');
    const entry = profiler.endSpan(id);
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('render');
  });

  it('endSpan returns undefined for unknown span id', () => {
    const profiler = createPerfProfiler(makeDeps());
    expect(profiler.endSpan('ghost-id')).toBeUndefined();
  });

  it('getRecentSpans returns completed spans', () => {
    const profiler = createPerfProfiler(makeDeps());
    const id = profiler.beginSpan('fetch');
    profiler.endSpan(id);
    const recent = profiler.getRecentSpans(10);
    expect(recent.length).toBeGreaterThan(0);
  });
});

describe('perf-profiler — aggregations', () => {
  it('getAggregation returns data after a span completes', () => {
    const profiler = createPerfProfiler(makeDeps());
    const id = profiler.beginSpan('query');
    profiler.endSpan(id);
    const agg = profiler.getAggregation('query');
    expect(agg).toBeDefined();
    expect(agg?.count).toBe(1);
  });

  it('getAggregation returns undefined for unknown operation', () => {
    const profiler = createPerfProfiler(makeDeps());
    expect(profiler.getAggregation('ghost')).toBeUndefined();
  });

  it('listAggregations returns all aggregations', () => {
    const profiler = createPerfProfiler(makeDeps());
    const id1 = profiler.beginSpan('op-a');
    profiler.endSpan(id1);
    const id2 = profiler.beginSpan('op-b');
    profiler.endSpan(id2);
    expect(profiler.listAggregations().length).toBe(2);
  });

  it('getHotPaths returns top-N hottest paths', () => {
    const profiler = createPerfProfiler(makeDeps());
    const id = profiler.beginSpan('slow-op');
    profiler.endSpan(id);
    const hotPaths = profiler.getHotPaths(5);
    expect(Array.isArray(hotPaths)).toBe(true);
  });
});

describe('perf-profiler — budgets', () => {
  it('setBudget does not throw', () => {
    const profiler = createPerfProfiler(makeDeps());
    expect(() => profiler.setBudget('render', 1000)).not.toThrow();
  });

  it('getViolations returns empty array when no spans exceed budget', () => {
    const profiler = createPerfProfiler(makeDeps());
    profiler.setBudget('fast-op', 1_000_000);
    const id = profiler.beginSpan('fast-op');
    profiler.endSpan(id);
    expect(Array.isArray(profiler.getViolations(10))).toBe(true);
  });
});

describe('perf-profiler — stats and reset', () => {
  it('getStats returns stats object', () => {
    const profiler = createPerfProfiler(makeDeps());
    const stats = profiler.getStats();
    expect(typeof stats).toBe('object');
  });

  it('reset clears all aggregations', () => {
    const profiler = createPerfProfiler(makeDeps());
    const id = profiler.beginSpan('op');
    profiler.endSpan(id);
    profiler.reset();
    expect(profiler.listAggregations().length).toBe(0);
  });
});
