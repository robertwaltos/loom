/**
 * transit-analytics.test.ts — Unit tests for transit analytics service.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTransitAnalyticsService } from '../transit-analytics.js';
import type {
  TransitAnalyticsService,
  TransitAnalyticsDeps,
  TransitRecord,
} from '../transit-analytics.js';

// ── Test Helpers ─────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  return { nowMicroseconds: () => start };
}

function mockIdGenerator(): { generate: () => string } {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return 'pattern-' + String(counter);
    },
  };
}

function createDeps(): TransitAnalyticsDeps {
  return { clock: mockClock(), idGenerator: mockIdGenerator() };
}

function successTransit(
  from: string,
  to: string,
  entityId = 'entity-1',
  dynastyId = 'dynasty-1',
  duration = 1000,
): TransitRecord {
  return {
    transitId: 'transit-' + from + '-' + to,
    entityId,
    dynastyId,
    fromWorldId: from,
    toWorldId: to,
    corridorId: 'corridor-' + from + '-' + to,
    startedAt: 1000,
    completedAt: 1000 + duration,
    durationMicroseconds: duration,
    success: true,
    failureReason: null,
  };
}

function failedTransit(from: string, to: string): TransitRecord {
  return {
    transitId: 'transit-fail-' + from + '-' + to,
    entityId: 'entity-1',
    dynastyId: 'dynasty-1',
    fromWorldId: from,
    toWorldId: to,
    corridorId: 'corridor-' + from + '-' + to,
    startedAt: 1000,
    completedAt: 1500,
    durationMicroseconds: 500,
    success: false,
    failureReason: 'coherence_failure',
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('TransitAnalyticsService — record collection', () => {
  let service: TransitAnalyticsService;

  beforeEach(() => {
    service = createTransitAnalyticsService(createDeps());
  });

  it('records a transit', () => {
    service.recordTransit(successTransit('world-a', 'world-b'));
    const stats = service.getStats();
    expect(stats.totalRecords).toBe(1);
  });

  it('tracks multiple transits', () => {
    service.recordTransit(successTransit('world-a', 'world-b'));
    service.recordTransit(successTransit('world-b', 'world-c'));
    service.recordTransit(failedTransit('world-a', 'world-b'));
    const stats = service.getStats();
    expect(stats.totalRecords).toBe(3);
    expect(stats.totalRoutes).toBe(2);
  });
});

describe('TransitAnalyticsService — route summaries', () => {
  let service: TransitAnalyticsService;

  beforeEach(() => {
    service = createTransitAnalyticsService(createDeps());
    service.recordTransit(successTransit('world-a', 'world-b', 'e1', 'd1', 1000));
    service.recordTransit(successTransit('world-a', 'world-b', 'e2', 'd2', 2000));
    service.recordTransit(failedTransit('world-a', 'world-b'));
  });

  it('returns route summary', () => {
    const summary = service.getRouteSummary('world-a', 'world-b');
    expect(summary).toBeDefined();
    if (summary === undefined) return;
    expect(summary.totalTransits).toBe(3);
    expect(summary.successfulTransits).toBe(2);
    expect(summary.failedTransits).toBe(1);
  });

  it('calculates average duration', () => {
    const summary = service.getRouteSummary('world-a', 'world-b');
    expect(summary).toBeDefined();
    if (summary === undefined) return;
    expect(summary.averageDuration).toBe(1500);
  });

  it('calculates success rate', () => {
    const summary = service.getRouteSummary('world-a', 'world-b');
    expect(summary).toBeDefined();
    if (summary === undefined) return;
    expect(summary.successRate).toBeCloseTo(0.667, 2);
  });

  it('returns undefined for unknown route', () => {
    expect(service.getRouteSummary('unknown', 'route')).toBeUndefined();
  });
});

describe('TransitAnalyticsService — world summaries', () => {
  let service: TransitAnalyticsService;

  beforeEach(() => {
    service = createTransitAnalyticsService(createDeps());
    service.recordTransit(successTransit('world-a', 'world-b', 'e1', 'd1'));
    service.recordTransit(successTransit('world-c', 'world-b', 'e2', 'd2'));
  });

  it('tracks inbound transits', () => {
    const summary = service.getWorldSummary('world-b');
    expect(summary).toBeDefined();
    if (summary === undefined) return;
    expect(summary.inboundTransits).toBe(2);
  });

  it('tracks outbound transits', () => {
    const summary = service.getWorldSummary('world-a');
    expect(summary).toBeDefined();
    if (summary === undefined) return;
    expect(summary.outboundTransits).toBe(1);
  });

  it('counts unique dynasties', () => {
    const summary = service.getWorldSummary('world-b');
    expect(summary).toBeDefined();
    if (summary === undefined) return;
    expect(summary.uniqueDynasties).toBe(2);
  });

  it('returns undefined for unknown world', () => {
    expect(service.getWorldSummary('unknown')).toBeUndefined();
  });
});

describe('TransitAnalyticsService — bottleneck detection', () => {
  it('detects high failure rate bottleneck', () => {
    const service = createTransitAnalyticsService(createDeps());

    for (let i = 0; i < 3; i++) {
      service.recordTransit(successTransit('world-a', 'world-b'));
    }
    for (let i = 0; i < 5; i++) {
      service.recordTransit(failedTransit('world-a', 'world-b'));
    }

    const bottlenecks = service.detectBottlenecks();
    expect(bottlenecks.length).toBeGreaterThan(0);
    expect(bottlenecks[0]?.severity).toBe('critical');
  });

  it('does not detect bottleneck with few transits', () => {
    const service = createTransitAnalyticsService(createDeps());
    service.recordTransit(failedTransit('world-a', 'world-b'));
    service.recordTransit(failedTransit('world-a', 'world-b'));

    const bottlenecks = service.detectBottlenecks();
    expect(bottlenecks).toHaveLength(0);
  });

  it('does not detect bottleneck with high success rate', () => {
    const service = createTransitAnalyticsService(createDeps());
    for (let i = 0; i < 10; i++) {
      service.recordTransit(successTransit('world-a', 'world-b'));
    }

    const bottlenecks = service.detectBottlenecks();
    expect(bottlenecks).toHaveLength(0);
  });
});

describe('TransitAnalyticsService — pattern detection', () => {
  it('detects dynasty migration pattern', () => {
    const service = createTransitAnalyticsService(createDeps());

    for (let i = 0; i < 15; i++) {
      service.recordTransit(successTransit('world-exodus', 'world-' + String(i)));
    }

    const patterns = service.detectPatterns();
    const migration = patterns.find((p) => p.patternType === 'dynasty_migration');
    expect(migration).toBeDefined();
  });

  it('detects circular transit pattern', () => {
    const service = createTransitAnalyticsService(createDeps());

    for (let i = 0; i < 12; i++) {
      service.recordTransit(successTransit('world-a', 'world-b'));
      service.recordTransit(successTransit('world-b', 'world-a'));
    }

    const patterns = service.detectPatterns();
    const circular = patterns.find((p) => p.patternType === 'circular_transit');
    expect(circular).toBeDefined();
  });
});

describe('TransitAnalyticsService — top routes', () => {
  it('returns routes sorted by traffic', () => {
    const service = createTransitAnalyticsService(createDeps());

    for (let i = 0; i < 5; i++) {
      service.recordTransit(successTransit('world-a', 'world-b'));
    }
    for (let i = 0; i < 10; i++) {
      service.recordTransit(successTransit('world-c', 'world-d'));
    }

    const top = service.getTopRoutes(2);
    expect(top).toHaveLength(2);
    expect(top[0]?.totalTransits).toBe(10);
    expect(top[1]?.totalTransits).toBe(5);
  });

  it('limits results to requested count', () => {
    const service = createTransitAnalyticsService(createDeps());
    service.recordTransit(successTransit('a', 'b'));
    service.recordTransit(successTransit('c', 'd'));
    service.recordTransit(successTransit('e', 'f'));

    const top = service.getTopRoutes(1);
    expect(top).toHaveLength(1);
  });
});

describe('TransitAnalyticsService — statistics', () => {
  it('reports overall stats', () => {
    const service = createTransitAnalyticsService(createDeps());
    service.recordTransit(successTransit('a', 'b', 'e1', 'd1', 1000));
    service.recordTransit(successTransit('a', 'b', 'e2', 'd2', 2000));
    service.recordTransit(failedTransit('a', 'b'));

    const stats = service.getStats();
    expect(stats.totalRecords).toBe(3);
    expect(stats.overallSuccessRate).toBeCloseTo(0.667, 2);
    expect(stats.averageDuration).toBe(1500);
  });

  it('starts with empty stats', () => {
    const service = createTransitAnalyticsService(createDeps());
    const stats = service.getStats();
    expect(stats.totalRecords).toBe(0);
    expect(stats.overallSuccessRate).toBe(0);
  });
});
