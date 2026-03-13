/**
 * Simulation tests — performance-profiler
 */

import { describe, it, expect } from 'vitest';
import {
  createPerformanceProfiler,
  type PerformanceProfilerDeps,
} from '../performance-profiler.js';

let ts = 1_000_000_000;

function makeDeps(): PerformanceProfilerDeps {
  return {
    clock: { nowMicroseconds: () => (ts += 100) },
  };
}

describe('performance-profiler — operation lifecycle', () => {
  it('begin returns a token string', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const token = profiler.begin('db-query');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('end returns a profile entry with operation name', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const token = profiler.begin('db-query');
    const entry = profiler.end(token);
    expect(entry).toBeDefined();
    expect(entry?.operationName).toBe('db-query');
  });

  it('end returns undefined for unknown token', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    expect(profiler.end('ghost-token')).toBeUndefined();
  });
});

describe('performance-profiler — profiles', () => {
  it('getProfile returns undefined for unrecorded operation', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    expect(profiler.getProfile('ghost')).toBeUndefined();
  });

  it('getProfile returns aggregated profile after operation', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const t1 = profiler.begin('api-call');
    profiler.end(t1);
    const profile = profiler.getProfile('api-call');
    expect(profile).toBeDefined();
    expect(profile?.totalCalls).toBe(1);
  });

  it('listProfiles includes all profiled operations', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const t1 = profiler.begin('op-x');
    profiler.end(t1);
    const t2 = profiler.begin('op-y');
    profiler.end(t2);
    expect(profiler.listProfiles().length).toBe(2);
  });

  it('getRecentEntries returns completed entries', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const t1 = profiler.begin('render');
    profiler.end(t1);
    expect(profiler.getRecentEntries(10).length).toBeGreaterThan(0);
  });
});

describe('performance-profiler — reset and stats', () => {
  it('reset returns true for known operation', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const t1 = profiler.begin('fetch');
    profiler.end(t1);
    expect(profiler.reset('fetch')).toBe(true);
  });

  it('reset returns false for unknown operation', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    expect(profiler.reset('ghost')).toBe(false);
  });

  it('resetAll clears all profiles', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const t1 = profiler.begin('op-a');
    profiler.end(t1);
    profiler.resetAll();
    expect(profiler.listProfiles().length).toBe(0);
  });

  it('getStats returns a stats object', () => {
    const profiler = createPerformanceProfiler(makeDeps());
    const stats = profiler.getStats();
    expect(typeof stats.trackedOperations).toBe('number');
  });
});
