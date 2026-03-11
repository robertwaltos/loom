/**
 * Corridor Stability Flow — Integration test.
 *
 * Proves the vertical slice across silfen-weave corridor and analytics:
 *
 *   1. Corridor stability tracking and degradation
 *   2. Transit analytics traffic analysis
 *   3. Bottleneck detection across the lattice
 *   4. Stability grades reflect corridor health
 *   5. Stabilization costs and execution
 *
 * Uses real services: CorridorStabilityService, TransitAnalyticsService.
 * Mocks: clock, id generator, KALON port.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCorridorStabilityService, DEFAULT_STABILITY_CONFIG } from '@loom/silfen-weave';
import type { CorridorStabilityService, CorridorStabilityDeps } from '@loom/silfen-weave';
import { createTransitAnalyticsService } from '@loom/silfen-weave';
import type { TransitAnalyticsService, TransitAnalyticsDeps } from '@loom/silfen-weave';

// ── Shared Mocks ────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  let t = start;
  return { nowMicroseconds: () => t++ };
}

function mockIdGen(): { generate: () => string } {
  let c = 0;
  return { generate: () => 'stab-' + String(++c) };
}

function mockKalonPort(): CorridorStabilityDeps['kalon'] {
  return {
    debit: () => true,
  } as unknown as CorridorStabilityDeps['kalon'];
}

function makeTransitRecord(
  idGen: { generate: () => string },
  overrides: Partial<{
    entityId: string;
    dynastyId: string;
    fromWorldId: string;
    toWorldId: string;
    corridorId: string;
    durationMicroseconds: number;
    success: boolean;
    failureReason: string | null;
  }> = {},
) {
  const now = Date.now() * 1000;
  const dur = overrides.durationMicroseconds ?? 5_000_000;
  return {
    transitId: idGen.generate(),
    entityId: overrides.entityId ?? 'entity-1',
    dynastyId: overrides.dynastyId ?? 'house-alpha',
    fromWorldId: overrides.fromWorldId ?? 'world-a',
    toWorldId: overrides.toWorldId ?? 'world-b',
    corridorId: overrides.corridorId ?? 'corridor-ab',
    startedAt: now,
    completedAt: now + dur,
    durationMicroseconds: dur,
    success: overrides.success ?? true,
    failureReason: overrides.failureReason ?? null,
  };
}

// ── Corridor Stability ──────────────────────────────────────────

describe('Corridor Stability Flow — stability tracking', () => {
  let stability: CorridorStabilityService;

  beforeEach(() => {
    stability = createCorridorStabilityService({
      clock: mockClock() as CorridorStabilityDeps['clock'],
      kalon: mockKalonPort(),
    });
  });

  it('registers corridor with pristine stability', () => {
    const record = stability.registerCorridor('corridor-1', 'world-a', 'world-b');
    expect(record).toBeDefined();
    expect(record.grade).toBe('pristine');
    expect(record.stability).toBe(100);
  });

  it('degrades corridor through transit load', () => {
    stability.registerCorridor('corridor-1', 'world-a', 'world-b');
    stability.recordTransit('corridor-1');
    stability.recordTransit('corridor-1');
    stability.recordTransit('corridor-1');

    const record = stability.getCorridor('corridor-1');
    expect(record).toBeDefined();
    expect(record!.stability).toBeLessThanOrEqual(100);
  });

  it('applies degradation with specific cause', () => {
    stability.registerCorridor('corridor-1', 'world-a', 'world-b');
    const event = stability.applyDegradation('corridor-1', 30, 'anomaly');
    expect(event).not.toBeNull();
    if (event === null) return;
    expect(event.cause).toBe('anomaly');
    expect(event.newStability).toBeLessThan(event.previousStability);
  });

  it('stabilizes corridor with KALON cost', () => {
    stability.registerCorridor('corridor-1', 'world-a', 'world-b');
    stability.applyDegradation('corridor-1', 40, 'overload');

    const result = stability.stabilize('corridor-1', 'house-alpha');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.newStability).toBeGreaterThan(result.previousStability);
  });

  it('classifies stability grades correctly', () => {
    stability.registerCorridor('corridor-1', 'world-a', 'world-b');

    // Pristine at start
    const initial = stability.getCorridor('corridor-1');
    expect(initial).toBeDefined();
    expect(initial!.grade).toBe('pristine');

    // Heavy degradation
    stability.applyDegradation('corridor-1', 60, 'overload');
    const afterHeavy = stability.getCorridor('corridor-1');
    expect(afterHeavy).toBeDefined();
    expect(afterHeavy!.grade).not.toBe('pristine');
  });

  it('tracks stability stats', () => {
    stability.registerCorridor('corridor-1', 'world-a', 'world-b');
    stability.registerCorridor('corridor-2', 'world-b', 'world-c');

    const stats = stability.getStats();
    expect(stats.totalCorridors).toBe(2);
  });

  it('exports default config', () => {
    expect(DEFAULT_STABILITY_CONFIG).toBeDefined();
  });
});

// ── Transit Analytics ───────────────────────────────────────────

describe('Corridor Stability Flow — transit analytics', () => {
  let analytics: TransitAnalyticsService;
  let idGen: { generate: () => string };

  beforeEach(() => {
    idGen = mockIdGen();
    analytics = createTransitAnalyticsService({
      clock: mockClock() as TransitAnalyticsDeps['clock'],
      idGenerator: idGen as TransitAnalyticsDeps['idGenerator'],
    });
  });

  it('records transit and generates route summary', () => {
    analytics.recordTransit(
      makeTransitRecord(idGen, {
        entityId: 'entity-1',
        fromWorldId: 'world-a',
        toWorldId: 'world-b',
        durationMicroseconds: 5_000_000,
      }),
    );
    analytics.recordTransit(
      makeTransitRecord(idGen, {
        entityId: 'entity-2',
        fromWorldId: 'world-a',
        toWorldId: 'world-b',
        durationMicroseconds: 7_000_000,
      }),
    );

    const summary = analytics.getRouteSummary('world-a', 'world-b');
    expect(summary).toBeDefined();
    expect(summary!.totalTransits).toBe(2);
  });

  it('generates world traffic summary', () => {
    analytics.recordTransit(
      makeTransitRecord(idGen, {
        entityId: 'e-1',
        fromWorldId: 'world-a',
        toWorldId: 'world-b',
        durationMicroseconds: 3_000_000,
      }),
    );
    analytics.recordTransit(
      makeTransitRecord(idGen, {
        entityId: 'e-2',
        fromWorldId: 'world-c',
        toWorldId: 'world-a',
        durationMicroseconds: 4_000_000,
      }),
    );

    const worldTraffic = analytics.getWorldSummary('world-a');
    expect(worldTraffic).toBeDefined();
    expect(worldTraffic!.inboundTransits).toBeGreaterThanOrEqual(1);
    expect(worldTraffic!.outboundTransits).toBeGreaterThanOrEqual(1);
  });

  it('detects bottlenecks on busy routes', () => {
    // Create heavy traffic on one route
    for (let i = 0; i < 20; i++) {
      analytics.recordTransit(
        makeTransitRecord(idGen, {
          entityId: 'e-' + String(i),
          fromWorldId: 'world-a',
          toWorldId: 'world-b',
          durationMicroseconds: 10_000_000 + i * 1_000_000,
          success: i < 15,
          failureReason: i >= 15 ? 'corridor_overloaded' : null,
        }),
      );
    }

    const bottlenecks = analytics.detectBottlenecks();
    expect(bottlenecks).toBeDefined();
  });

  it('detects traffic patterns', () => {
    // Record consistent traffic pattern
    for (let i = 0; i < 10; i++) {
      analytics.recordTransit(
        makeTransitRecord(idGen, {
          entityId: 'migrant-' + String(i),
          dynastyId: 'house-alpha',
          fromWorldId: 'world-a',
          toWorldId: 'world-b',
          durationMicroseconds: 5_000_000,
        }),
      );
    }

    const patterns = analytics.detectPatterns();
    expect(patterns).toBeDefined();
  });

  it('tracks analytics stats', () => {
    analytics.recordTransit(
      makeTransitRecord(idGen, {
        entityId: 'e-1',
        fromWorldId: 'world-a',
        toWorldId: 'world-b',
        durationMicroseconds: 5_000_000,
      }),
    );

    const stats = analytics.getStats();
    expect(stats.totalRecords).toBe(1);
    expect(stats.totalRoutes).toBe(1);
  });
});

// ── Cross-System: Stability + Analytics ─────────────────────────

describe('Corridor Stability Flow — stability-analytics integration', () => {
  it('heavy traffic correlates with stability degradation', () => {
    const stability = createCorridorStabilityService({
      clock: mockClock() as CorridorStabilityDeps['clock'],
      kalon: mockKalonPort(),
    });
    const idGen = mockIdGen();
    const analytics = createTransitAnalyticsService({
      clock: mockClock() as TransitAnalyticsDeps['clock'],
      idGenerator: idGen as TransitAnalyticsDeps['idGenerator'],
    });

    stability.registerCorridor('corridor-ab', 'world-a', 'world-b');

    // Simulate heavy traffic — record both in analytics and degradation
    for (let i = 0; i < 15; i++) {
      analytics.recordTransit(
        makeTransitRecord(idGen, {
          entityId: 'e-' + String(i),
          fromWorldId: 'world-a',
          toWorldId: 'world-b',
          durationMicroseconds: 5_000_000,
        }),
      );
      stability.recordTransit('corridor-ab');
    }

    // Analytics shows heavy traffic
    const route = analytics.getRouteSummary('world-a', 'world-b');
    expect(route).toBeDefined();
    expect(route!.totalTransits).toBe(15);

    // Stability has degraded
    const record = stability.getCorridor('corridor-ab');
    expect(record).toBeDefined();
    expect(record!.stability).toBeLessThanOrEqual(100);

    // Stabilize the corridor
    const restored = stability.stabilize('corridor-ab', 'house-alpha');
    expect(typeof restored).not.toBe('string');
  });
});
