import { describe, expect, it } from 'vitest';
import { createTransitAnalyticsService } from '../transit-analytics.js';

function makeService() {
  let i = 0;
  return createTransitAnalyticsService({
    clock: { nowMicroseconds: () => 1_000_000 },
    idGenerator: { generate: () => `pattern-${++i}` },
  });
}

describe('transit-analytics simulation', () => {
  it('captures route health and flags bottlenecks under repeated failures', () => {
    const analytics = makeService();
    for (let i = 0; i < 3; i++) {
      analytics.recordTransit({
        transitId: `ok-${i}`,
        entityId: 'e',
        dynastyId: 'd1',
        fromWorldId: 'a',
        toWorldId: 'b',
        corridorId: 'c-ab',
        startedAt: 1,
        completedAt: 1001,
        durationMicroseconds: 1000,
        success: true,
        failureReason: null,
      });
    }
    for (let i = 0; i < 6; i++) {
      analytics.recordTransit({
        transitId: `fail-${i}`,
        entityId: 'e',
        dynastyId: 'd1',
        fromWorldId: 'a',
        toWorldId: 'b',
        corridorId: 'c-ab',
        startedAt: 1,
        completedAt: 501,
        durationMicroseconds: 500,
        success: false,
        failureReason: 'coherence_failure',
      });
    }

    const summary = analytics.getRouteSummary('a', 'b');
    expect(summary?.totalTransits).toBe(9);
    const bottlenecks = analytics.detectBottlenecks();
    expect(bottlenecks.length).toBeGreaterThan(0);
  });
});
