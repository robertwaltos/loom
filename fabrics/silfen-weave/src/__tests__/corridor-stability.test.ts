/**
 * corridor-stability.test.ts — Unit tests for corridor stability service.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCorridorStabilityService, DEFAULT_STABILITY_CONFIG } from '../corridor-stability.js';
import type { CorridorStabilityService, CorridorStabilityDeps } from '../corridor-stability.js';

// ── Test Helpers ─────────────────────────────────────────────────

const US_PER_HOUR = 3_600_000_000;

function mockClock(start = 1_000_000): {
  nowMicroseconds: () => number;
  advance: (us: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advance: (us: number) => {
      t += us;
    },
  };
}

function richKalon(): CorridorStabilityDeps['kalon'] {
  return { debit: () => true };
}

function poorKalon(): CorridorStabilityDeps['kalon'] {
  return { debit: () => false };
}

function createDeps(
  clock?: ReturnType<typeof mockClock>,
  kalon?: CorridorStabilityDeps['kalon'],
): CorridorStabilityDeps {
  return {
    clock: clock ?? mockClock(),
    kalon: kalon ?? richKalon(),
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('CorridorStabilityService — registration', () => {
  let service: CorridorStabilityService;

  beforeEach(() => {
    service = createCorridorStabilityService(createDeps());
  });

  it('registers a corridor with max stability', () => {
    const record = service.registerCorridor('corridor-1', 'world-a', 'world-b');
    expect(record.corridorId).toBe('corridor-1');
    expect(record.stability).toBe(DEFAULT_STABILITY_CONFIG.maxStability);
    expect(record.grade).toBe('pristine');
  });

  it('removes a corridor', () => {
    service.registerCorridor('corridor-1', 'world-a', 'world-b');
    expect(service.removeCorridor('corridor-1')).toBe(true);
    expect(service.getCorridor('corridor-1')).toBeUndefined();
  });

  it('returns false when removing non-existent corridor', () => {
    expect(service.removeCorridor('nonexistent')).toBe(false);
  });
});

describe('CorridorStabilityService — transit degradation', () => {
  let service: CorridorStabilityService;

  beforeEach(() => {
    service = createCorridorStabilityService(createDeps());
    service.registerCorridor('corridor-1', 'world-a', 'world-b');
  });

  it('degrades stability on transit', () => {
    const event = service.recordTransit('corridor-1');
    expect(event).not.toBeNull();
    if (event === null) return;
    expect(event.cause).toBe('transit_wear');
    const record = service.getCorridor('corridor-1');
    expect(record).toBeDefined();
    if (record === undefined) return;
    expect(record.stability).toBeLessThan(DEFAULT_STABILITY_CONFIG.maxStability);
    expect(record.totalTransits).toBe(1);
  });

  it('degrades further with multiple transits', () => {
    for (let i = 0; i < 10; i++) {
      service.recordTransit('corridor-1');
    }
    const record = service.getCorridor('corridor-1');
    expect(record).toBeDefined();
    if (record === undefined) return;
    expect(record.totalTransits).toBe(10);
    expect(record.stability).toBe(
      DEFAULT_STABILITY_CONFIG.maxStability - 10 * DEFAULT_STABILITY_CONFIG.degradationPerTransit,
    );
  });

  it('returns null for unknown corridor', () => {
    expect(service.recordTransit('unknown')).toBeNull();
  });
});

describe('CorridorStabilityService — time decay', () => {
  it('applies decay after hours elapsed', () => {
    const clock = mockClock();
    const service = createCorridorStabilityService(createDeps(clock));
    service.registerCorridor('corridor-1', 'world-a', 'world-b');

    clock.advance(10 * US_PER_HOUR);
    const events = service.applyTimeDecay();
    expect(events.length).toBeGreaterThan(0);

    const record = service.getCorridor('corridor-1');
    expect(record).toBeDefined();
    if (record === undefined) return;
    expect(record.stability).toBeLessThan(DEFAULT_STABILITY_CONFIG.maxStability);
  });

  it('does not decay within first hour', () => {
    const clock = mockClock();
    const service = createCorridorStabilityService(createDeps(clock));
    service.registerCorridor('corridor-1', 'world-a', 'world-b');

    clock.advance(US_PER_HOUR / 2);
    const events = service.applyTimeDecay();
    expect(events).toHaveLength(0);
  });
});

describe('CorridorStabilityService — stabilization', () => {
  it('stabilizes a degraded corridor', () => {
    const service = createCorridorStabilityService(createDeps());
    service.registerCorridor('corridor-1', 'world-a', 'world-b');

    for (let i = 0; i < 50; i++) {
      service.recordTransit('corridor-1');
    }

    const result = service.stabilize('corridor-1', 'dynasty-1');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.newStability).toBeGreaterThan(result.previousStability);
  });

  it('fails with insufficient kalon', () => {
    const service = createCorridorStabilityService(createDeps(undefined, poorKalon()));
    service.registerCorridor('corridor-1', 'world-a', 'world-b');
    for (let i = 0; i < 10; i++) {
      service.recordTransit('corridor-1');
    }

    const result = service.stabilize('corridor-1', 'dynasty-1');
    expect(result).toBe('insufficient_kalon');
  });

  it('fails for unknown corridor', () => {
    const service = createCorridorStabilityService(createDeps());
    expect(service.stabilize('unknown', 'dynasty-1')).toBe('corridor_not_found');
  });

  it('fails for collapsed corridor', () => {
    const service = createCorridorStabilityService(createDeps());
    service.registerCorridor('corridor-1', 'world-a', 'world-b');

    for (let i = 0; i < 200; i++) {
      service.recordTransit('corridor-1');
    }

    const result = service.stabilize('corridor-1', 'dynasty-1');
    expect(result).toBe('corridor_collapsed');
  });
});

describe('CorridorStabilityService — external degradation', () => {
  it('applies external degradation', () => {
    const service = createCorridorStabilityService(createDeps());
    service.registerCorridor('corridor-1', 'world-a', 'world-b');

    const event = service.applyDegradation('corridor-1', 30, 'anomaly');
    expect(event).not.toBeNull();
    if (event === null) return;
    expect(event.cause).toBe('anomaly');

    const record = service.getCorridor('corridor-1');
    expect(record).toBeDefined();
    if (record === undefined) return;
    expect(record.stability).toBe(70);
  });

  it('returns null for unknown corridor', () => {
    const service = createCorridorStabilityService(createDeps());
    expect(service.applyDegradation('unknown', 10, 'external')).toBeNull();
  });
});

describe('CorridorStabilityService — grade classification', () => {
  let service: CorridorStabilityService;

  beforeEach(() => {
    service = createCorridorStabilityService(createDeps());
  });

  it('starts pristine', () => {
    const record = service.registerCorridor('c1', 'a', 'b');
    expect(record.grade).toBe('pristine');
  });

  it('becomes stable after some degradation', () => {
    service.registerCorridor('c1', 'a', 'b');
    service.applyDegradation('c1', 30, 'external');
    const record = service.getCorridor('c1');
    expect(record?.grade).toBe('stable');
  });

  it('becomes degraded below 50', () => {
    service.registerCorridor('c1', 'a', 'b');
    service.applyDegradation('c1', 55, 'external');
    const record = service.getCorridor('c1');
    expect(record?.grade).toBe('degraded');
  });

  it('becomes critical below threshold', () => {
    service.registerCorridor('c1', 'a', 'b');
    service.applyDegradation('c1', 85, 'external');
    const record = service.getCorridor('c1');
    expect(record?.grade).toBe('critical');
  });

  it('collapses below collapse threshold', () => {
    service.registerCorridor('c1', 'a', 'b');
    service.applyDegradation('c1', 96, 'external');
    const record = service.getCorridor('c1');
    expect(record?.grade).toBe('collapsed');
  });
});

describe('CorridorStabilityService — queries', () => {
  let service: CorridorStabilityService;

  beforeEach(() => {
    service = createCorridorStabilityService(createDeps());
    service.registerCorridor('c1', 'a', 'b');
    service.registerCorridor('c2', 'b', 'c');
    service.registerCorridor('c3', 'c', 'd');
    service.applyDegradation('c2', 55, 'external');
    service.applyDegradation('c3', 85, 'external');
  });

  it('gets corridors by grade', () => {
    expect(service.getCorridorsByGrade('pristine')).toHaveLength(1);
    expect(service.getCorridorsByGrade('degraded')).toHaveLength(1);
    expect(service.getCorridorsByGrade('critical')).toHaveLength(1);
  });

  it('gets critical corridors', () => {
    const critical = service.getCriticalCorridors();
    expect(critical).toHaveLength(1);
    expect(critical[0]?.corridorId).toBe('c3');
  });

  it('gets recent events', () => {
    const events = service.getRecentEvents(5);
    expect(events).toHaveLength(2);
  });

  it('reports stats', () => {
    const stats = service.getStats();
    expect(stats.totalCorridors).toBe(3);
    expect(stats.pristineCount).toBe(1);
    expect(stats.degradedCount).toBe(1);
    expect(stats.criticalCount).toBe(1);
  });
});
