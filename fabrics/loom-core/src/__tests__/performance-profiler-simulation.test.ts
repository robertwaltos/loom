import { describe, expect, it } from 'vitest';
import { createPerformanceProfilerSystem } from '../performance-profiler.js';

describe('performance-profiler simulation', () => {
  it('simulates frame capture lifecycle and system hot-spot stats extraction', () => {
    let now = 1_000_000n;
    let id = 0;
    const profiler = createPerformanceProfilerSystem({
      clock: { nowUs: () => (now += 1_000n) },
      idGen: { generate: () => `sess-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    const session = profiler.startSession('tick-loop');
    profiler.recordFrame(session.sessionId, 'render', 1_200n, 1_024n);
    profiler.recordFrame(session.sessionId, 'render', 1_800n, 1_048n);
    profiler.recordFrame(session.sessionId, 'physics', 700n, 1_000n);
    const renderStats = profiler.getSystemStats(session.sessionId, 'render');
    const ended = profiler.endSession(session.sessionId);

    expect('error' in renderStats).toBe(false);
    if (!('error' in renderStats)) {
      expect(renderStats.totalSamples).toBe(2);
      expect(renderStats.maxDurationUs).toBe(1_800n);
    }
    expect(ended.success).toBe(true);
  });
});
