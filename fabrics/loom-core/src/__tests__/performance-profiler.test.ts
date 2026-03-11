/**
 * performance-profiler.test.ts — Tests for PerformanceProfilerSystem
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPerformanceProfilerSystem,
  type PerformanceProfilerSystem,
  type PerformanceProfilerDeps,
} from '../performance-profiler.js';

function makeDeps(): PerformanceProfilerDeps {
  let time = 1_000_000n;
  let id = 0;
  return {
    clock: { nowUs: () => (time += 1_000n) },
    idGen: { generate: () => 'sess-' + String(id++) },
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

let sys: PerformanceProfilerSystem;

beforeEach(() => {
  sys = createPerformanceProfilerSystem(makeDeps());
});

describe('PerformanceProfiler — session lifecycle', () => {
  it('creates a session with correct initial state', () => {
    const sess = sys.startSession('boot');
    expect(sess.name).toBe('boot');
    expect(sess.endedAt).toBeNull();
    expect(sess.sampleCount).toBe(0);
    expect(sess.totalDurationUs).toBe(0n);
  });

  it('ends a session and sets endedAt', () => {
    const sess = sys.startSession('test');
    const result = sys.endSession(sess.sessionId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.session.endedAt).not.toBeNull();
    }
  });

  it('returns session-not-found when ending unknown session', () => {
    const result = sys.endSession('ghost-id');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('session-not-found');
  });

  it('returns session-already-ended when ending twice', () => {
    const sess = sys.startSession('x');
    sys.endSession(sess.sessionId);
    const result = sys.endSession(sess.sessionId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('session-already-ended');
  });

  it('lists all sessions', () => {
    sys.startSession('a');
    sys.startSession('b');
    expect(sys.listSessions()).toHaveLength(2);
  });

  it('getSession returns undefined for unknown id', () => {
    expect(sys.getSession('nope')).toBeUndefined();
  });
});

describe('PerformanceProfiler — recordFrame', () => {
  it('records a frame and increments sampleCount', () => {
    const sess = sys.startSession('run');
    const result = sys.recordFrame(sess.sessionId, 'physics', 400n, 1024n);
    expect(result.success).toBe(true);
    const updated = sys.getSession(sess.sessionId);
    expect(updated?.sampleCount).toBe(1);
  });

  it('returns invalid-duration for negative durationUs', () => {
    const sess = sys.startSession('run');
    const result = sys.recordFrame(sess.sessionId, 'physics', -1n, 1024n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-duration');
  });

  it('returns invalid-memory for negative memoryBytes', () => {
    const sess = sys.startSession('run');
    const result = sys.recordFrame(sess.sessionId, 'ai', 100n, -1n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-memory');
  });

  it('returns session-not-found for unknown session', () => {
    const result = sys.recordFrame('ghost', 'ai', 100n, 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('session-not-found');
  });

  it('returns session-already-ended for ended session', () => {
    const sess = sys.startSession('ended');
    sys.endSession(sess.sessionId);
    const result = sys.recordFrame(sess.sessionId, 'physics', 100n, 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('session-already-ended');
  });
});

describe('PerformanceProfiler — getSystemStats', () => {
  it('returns zeroed stats for system with no frames', () => {
    const sess = sys.startSession('profiling');
    const stats = sys.getSystemStats(sess.sessionId, 'render');
    if ('error' in stats) throw new Error('expected stats');
    expect(stats.totalSamples).toBe(0);
    expect(stats.totalDurationUs).toBe(0n);
  });

  it('computes min, max, avg correctly', () => {
    const sess = sys.startSession('metrics');
    sys.recordFrame(sess.sessionId, 'physics', 100n, 0n);
    sys.recordFrame(sess.sessionId, 'physics', 300n, 0n);
    sys.recordFrame(sess.sessionId, 'physics', 200n, 0n);
    const stats = sys.getSystemStats(sess.sessionId, 'physics');
    if ('error' in stats) throw new Error('expected stats');
    expect(stats.minDurationUs).toBe(100n);
    expect(stats.maxDurationUs).toBe(300n);
    expect(stats.totalDurationUs).toBe(600n);
    expect(stats.avgDurationUs).toBe(200);
  });

  it('computes p95 correctly', () => {
    const sess = sys.startSession('p95test');
    for (let i = 1; i <= 20; i++) {
      sys.recordFrame(sess.sessionId, 'render', BigInt(i * 10), 0n);
    }
    const stats = sys.getSystemStats(sess.sessionId, 'render');
    if ('error' in stats) throw new Error('expected stats');
    // sorted: 10,20,...,200; index = floor(20 * 0.95) = 19 => 200
    expect(stats.p95DurationUs).toBe(200n);
  });

  it('returns session-not-found for unknown session', () => {
    const stats = sys.getSystemStats('ghost', 'render');
    expect('error' in stats).toBe(true);
    if ('error' in stats) expect(stats.error).toBe('session-not-found');
  });
});

describe('PerformanceProfiler — getSlowFrames', () => {
  it('returns frames exceeding threshold', () => {
    const sess = sys.startSession('slow-check');
    sys.recordFrame(sess.sessionId, 'ai', 100n, 0n);
    sys.recordFrame(sess.sessionId, 'ai', 600n, 0n);
    sys.recordFrame(sess.sessionId, 'ai', 450n, 0n);
    const slow = sys.getSlowFrames(sess.sessionId, 500n);
    expect(slow).toHaveLength(1);
    expect(slow[0]?.durationUs).toBe(600n);
  });

  it('returns empty array when no frames exceed threshold', () => {
    const sess = sys.startSession('fast');
    sys.recordFrame(sess.sessionId, 'physics', 50n, 0n);
    expect(sys.getSlowFrames(sess.sessionId, 500n)).toHaveLength(0);
  });
});

describe('PerformanceProfiler — clearSession', () => {
  it('clears frames but retains session', () => {
    const sess = sys.startSession('clear-test');
    sys.recordFrame(sess.sessionId, 'render', 200n, 0n);
    const result = sys.clearSession(sess.sessionId);
    expect(result.success).toBe(true);
    expect(sys.getSession(sess.sessionId)).toBeDefined();
    expect(sys.getSlowFrames(sess.sessionId, 0n)).toHaveLength(0);
  });

  it('returns session-not-found for unknown session', () => {
    const result = sys.clearSession('ghost');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('session-not-found');
  });
});

describe('PerformanceProfiler — endSession totalDurationUs', () => {
  it('sums all frame durations on end', () => {
    const sess = sys.startSession('duration-sum');
    sys.recordFrame(sess.sessionId, 'ai', 100n, 0n);
    sys.recordFrame(sess.sessionId, 'physics', 200n, 0n);
    sys.recordFrame(sess.sessionId, 'render', 300n, 0n);
    const result = sys.endSession(sess.sessionId);
    expect(result.success).toBe(true);
    if (result.success) expect(result.session.totalDurationUs).toBe(600n);
  });
});
