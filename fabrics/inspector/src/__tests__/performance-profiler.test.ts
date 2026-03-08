import { describe, it, expect } from 'vitest';
import { createPerformanceProfiler } from '../performance-profiler.js';
import type { PerformanceProfilerDeps } from '../performance-profiler.js';

function makeDeps(step?: number): PerformanceProfilerDeps {
  let time = 0;
  const increment = step ?? 100;
  return {
    clock: { nowMicroseconds: () => (time += increment) },
  };
}

describe('PerformanceProfiler — begin and end', () => {
  it('measures operation duration', () => {
    const profiler = createPerformanceProfiler(makeDeps(50));
    const token = profiler.begin('tick');
    const entry = profiler.end(token);
    expect(entry?.operationName).toBe('tick');
    expect(entry?.durationUs).toBe(50);
  });

  it('returns undefined for unknown token', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    expect(profiler.end('unknown')).toBeUndefined();
  });

  it('assigns unique tokens', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const t1 = profiler.begin('a');
    const t2 = profiler.begin('b');
    expect(t1).not.toBe(t2);
  });
});

describe('PerformanceProfiler — operation profiles', () => {
  it('tracks min, max, and average', () => {
    let time = 0;
    const profiler = createPerformanceProfiler({
      clock: { nowMicroseconds: () => (time += 1) },
    });

    // Measurement 1: duration = 1
    time = 0;
    const t1 = profiler.begin('op');
    time = 1;
    profiler.end(t1);

    // Measurement 2: duration = 3
    time = 10;
    const t2 = profiler.begin('op');
    time = 13;
    profiler.end(t2);

    const profile = profiler.getProfile('op');
    expect(profile?.totalCalls).toBe(2);
    expect(profile?.minDurationUs).toBe(1);
    expect(profile?.maxDurationUs).toBe(3);
    expect(profile?.averageDurationUs).toBe(2);
  });

  it('returns undefined for unknown operation', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    expect(profiler.getProfile('unknown')).toBeUndefined();
  });

  it('lists all profiles', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    profiler.end(profiler.begin('a'));
    profiler.end(profiler.begin('b'));
    profiler.end(profiler.begin('c'));
    expect(profiler.listProfiles()).toHaveLength(3);
  });
});

describe('PerformanceProfiler — recent entries', () => {
  it('returns recent entries', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    profiler.end(profiler.begin('a'));
    profiler.end(profiler.begin('b'));
    profiler.end(profiler.begin('c'));
    const recent = profiler.getRecentEntries(2);
    expect(recent).toHaveLength(2);
    expect(recent[0]?.operationName).toBe('b');
    expect(recent[1]?.operationName).toBe('c');
  });

  it('limits entries to maxEntries', () => {
    const profiler = createPerformanceProfiler(makeDeps(), 3);
    for (let i = 0; i < 5; i++) {
      profiler.end(profiler.begin('op'));
    }
    expect(profiler.getRecentEntries(10)).toHaveLength(3);
  });
});

describe('PerformanceProfiler — reset', () => {
  it('resets a single operation', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    profiler.end(profiler.begin('a'));
    expect(profiler.reset('a')).toBe(true);
    expect(profiler.getProfile('a')).toBeUndefined();
  });

  it('returns false for unknown operation', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    expect(profiler.reset('unknown')).toBe(false);
  });

  it('resets all operations', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    profiler.end(profiler.begin('a'));
    profiler.end(profiler.begin('b'));
    profiler.resetAll();
    expect(profiler.listProfiles()).toHaveLength(0);
    expect(profiler.getRecentEntries(10)).toHaveLength(0);
  });
});

describe('PerformanceProfiler — stats', () => {
  it('tracks aggregate statistics', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    profiler.end(profiler.begin('a'));
    profiler.end(profiler.begin('a'));
    profiler.end(profiler.begin('b'));

    const stats = profiler.getStats();
    expect(stats.trackedOperations).toBe(2);
    expect(stats.totalMeasurements).toBe(3);
    expect(stats.totalEntries).toBe(3);
  });

  it('starts with zero stats', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const stats = profiler.getStats();
    expect(stats.trackedOperations).toBe(0);
    expect(stats.totalMeasurements).toBe(0);
  });
});
