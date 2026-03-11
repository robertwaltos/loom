/**
 * frequency-lock.test.ts — Unit tests for frequency lock service.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFrequencyLockService,
  classifyCoherence,
  DEFAULT_LOCK_CONFIG,
  COHERENCE_THRESHOLDS,
} from '../frequency-lock.js';
import type { FrequencyLockService } from '../frequency-lock.js';

// ── Test Helpers ─────────────────────────────────────────────────

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

function mockIdGenerator(prefix = 'conn'): {
  next: () => string;
} {
  let counter = 0;
  return {
    next: () => {
      counter += 1;
      return prefix + '-' + String(counter);
    },
  };
}

function createService(config?: Partial<typeof DEFAULT_LOCK_CONFIG>): {
  service: FrequencyLockService;
  clock: ReturnType<typeof mockClock>;
  idGen: ReturnType<typeof mockIdGenerator>;
} {
  const clock = mockClock();
  const idGen = mockIdGenerator();
  const service = createFrequencyLockService({ clock, idGenerator: idGen }, config);
  return { service, clock, idGen };
}

// ── Constants ────────────────────────────────────────────────────

describe('FrequencyLock constants', () => {
  it('exports default config with expected thresholds', () => {
    expect(DEFAULT_LOCK_CONFIG.lockThreshold).toBe(0.95);
    expect(DEFAULT_LOCK_CONFIG.disruptionThreshold).toBe(0.5);
    expect(DEFAULT_LOCK_CONFIG.breakThreshold).toBe(0.05);
    expect(DEFAULT_LOCK_CONFIG.maxCoherence).toBe(1.0);
  });

  it('exports coherence thresholds', () => {
    expect(COHERENCE_THRESHOLDS.VOID).toBe(0);
    expect(COHERENCE_THRESHOLDS.FAINT).toBe(0.25);
    expect(COHERENCE_THRESHOLDS.WEAK).toBe(0.5);
    expect(COHERENCE_THRESHOLDS.MODERATE).toBe(0.75);
    expect(COHERENCE_THRESHOLDS.STRONG).toBe(0.95);
    expect(COHERENCE_THRESHOLDS.RESONANT).toBe(1.0);
  });
});

// ── Coherence Classification ─────────────────────────────────────

describe('classifyCoherence', () => {
  it('returns VOID for zero', () => {
    expect(classifyCoherence(0)).toBe('VOID');
  });

  it('returns FAINT for low values', () => {
    expect(classifyCoherence(0.1)).toBe('FAINT');
    expect(classifyCoherence(0.25)).toBe('FAINT');
  });

  it('returns WEAK for mid-low values', () => {
    expect(classifyCoherence(0.26)).toBe('WEAK');
    expect(classifyCoherence(0.5)).toBe('WEAK');
  });

  it('returns MODERATE for mid values', () => {
    expect(classifyCoherence(0.51)).toBe('MODERATE');
    expect(classifyCoherence(0.75)).toBe('MODERATE');
  });

  it('returns STRONG for high values', () => {
    expect(classifyCoherence(0.76)).toBe('STRONG');
    expect(classifyCoherence(0.95)).toBe('STRONG');
  });

  it('returns RESONANT for maximum values', () => {
    expect(classifyCoherence(0.96)).toBe('RESONANT');
    expect(classifyCoherence(1.0)).toBe('RESONANT');
  });

  it('returns VOID for negative values', () => {
    expect(classifyCoherence(-0.5)).toBe('VOID');
  });
});

// ── Connection Registration ──────────────────────────────────────

describe('FrequencyLockService — registerConnection', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('creates a new connection in UNLOCKED state', () => {
    const record = service.registerConnection('world-a', 'world-b');
    expect(record.fromWorldId).toBe('world-a');
    expect(record.toWorldId).toBe('world-b');
    expect(record.state).toBe('UNLOCKED');
    expect(record.coherence).toBe(0);
  });

  it('assigns unique connection ids', () => {
    const r1 = service.registerConnection('world-a', 'world-b');
    const r2 = service.registerConnection('world-c', 'world-d');
    expect(r1.connectionId).not.toBe(r2.connectionId);
  });

  it('initializes timestamps and counters', () => {
    const record = service.registerConnection('world-a', 'world-b');
    expect(record.attunementStartedAt).toBeNull();
    expect(record.lockedAt).toBeNull();
    expect(record.brokenAt).toBeNull();
    expect(record.disruptionCount).toBe(0);
    expect(record.totalRepairApplied).toBe(0);
  });
});

// ── Attunement ───────────────────────────────────────────────────

describe('FrequencyLockService — startAttunement', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('transitions to ATTUNING state', () => {
    const record = service.registerConnection('world-a', 'world-b');
    const result = service.startAttunement(record.connectionId, 'dynasty-1');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.state).toBe('ATTUNING');
      expect(result.dynastyId).toBe('dynasty-1');
      expect(result.progress).toBe(0);
    }
  });

  it('returns error for unknown connection', () => {
    const result = service.startAttunement('nonexistent', 'dynasty-1');
    expect(result).toBe('connection_not_found');
  });

  it('returns error when already attuning', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    const result = service.startAttunement(record.connectionId, 'dynasty-2');
    expect(result).toBe('already_attuning');
  });

  it('returns error when already locked', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    const result = service.startAttunement(record.connectionId, 'dynasty-2');
    expect(result).toBe('already_locked');
  });

  it('returns error when connection is broken', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 1.0, 'catastrophe');
    const result = service.startAttunement(record.connectionId, 'dynasty-1');
    expect(result).toBe('connection_broken');
  });
});

describe('FrequencyLockService — advanceAttunement', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('advances progress and coherence', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    const result = service.advanceAttunement(record.connectionId, 0.5);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.progress).toBe(0.5);
      expect(result.coherence).toBe(0.5);
    }
  });

  it('clamps progress to 1.0', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 0.8);
    const result = service.advanceAttunement(record.connectionId, 0.5);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.progress).toBe(1.0);
      expect(result.coherence).toBe(1.0);
    }
  });

  it('returns error for non-attuning connection', () => {
    const record = service.registerConnection('world-a', 'world-b');
    const result = service.advanceAttunement(record.connectionId, 0.5);
    expect(result).toBe('not_attuning');
  });

  it('returns error for unknown connection', () => {
    const result = service.advanceAttunement('nonexistent', 0.5);
    expect(result).toBe('connection_not_found');
  });

  it('returns error for zero progress delta', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    const result = service.advanceAttunement(record.connectionId, 0);
    expect(result).toBe('invalid_progress_delta');
  });

  it('returns error for negative progress delta', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    const result = service.advanceAttunement(record.connectionId, -0.1);
    expect(result).toBe('invalid_progress_delta');
  });
});

// ── Lock Frequency ───────────────────────────────────────────────

describe('FrequencyLockService — lockFrequency', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('locks when coherence meets threshold', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 0.95);
    const result = service.lockFrequency(record.connectionId);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.state).toBe('LOCKED');
      expect(result.lockedAt).not.toBeNull();
    }
  });

  it('rejects lock when coherence too low', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 0.5);
    const result = service.lockFrequency(record.connectionId);
    expect(result).toBe('coherence_too_low');
  });

  it('rejects lock when already locked', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    const result = service.lockFrequency(record.connectionId);
    expect(result).toBe('already_locked');
  });

  it('returns error for unknown connection', () => {
    const result = service.lockFrequency('nonexistent');
    expect(result).toBe('connection_not_found');
  });

  it('rejects lock on broken connection', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 1.0, 'catastrophe');
    const result = service.lockFrequency(record.connectionId);
    expect(result).toBe('connection_broken');
  });
});

// ── Disruption ───────────────────────────────────────────────────

describe('FrequencyLockService — disrupt coherence', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('reduces coherence by severity', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    const result = service.disrupt(record.connectionId, 0.3, 'solar flare');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.previousCoherence).toBe(1.0);
      expect(result.newCoherence).toBeCloseTo(0.7, 10);
      expect(result.cause).toBe('solar flare');
    }
  });

  it('transitions to DISRUPTED below disruption threshold', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    const result = service.disrupt(record.connectionId, 0.6, 'interference');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.newState).toBe('DISRUPTED');
    }
  });

  it('transitions to BROKEN below break threshold', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    const result = service.disrupt(record.connectionId, 0.96, 'catastrophe');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.newState).toBe('BROKEN');
    }
  });

  it('clamps severity to [0, 1]', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    const result = service.disrupt(record.connectionId, 5.0, 'overflow');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.newCoherence).toBe(0);
    }
  });
});

describe('FrequencyLockService — disrupt errors', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('increments disruption count', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 0.1, 'minor');
    service.disrupt(record.connectionId, 0.1, 'minor');
    const updated = service.getRecord(record.connectionId);
    expect(updated?.disruptionCount).toBe(2);
  });

  it('returns error for unlocked connection', () => {
    const record = service.registerConnection('world-a', 'world-b');
    const result = service.disrupt(record.connectionId, 0.5, 'test');
    expect(result).toBe('connection_unlocked');
  });

  it('returns error for broken connection', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 1.0, 'fatal');
    const result = service.disrupt(record.connectionId, 0.1, 'again');
    expect(result).toBe('connection_broken');
  });

  it('returns error for unknown connection', () => {
    const result = service.disrupt('nonexistent', 0.5, 'test');
    expect(result).toBe('connection_not_found');
  });
});

// ── Repair ───────────────────────────────────────────────────────

describe('FrequencyLockService — repair coherence', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('increases coherence', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 0.4, 'damage');
    const result = service.repair(record.connectionId, 0.2);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.coherence).toBeCloseTo(0.8, 10);
      expect(result.totalRepairApplied).toBeCloseTo(0.2, 10);
    }
  });

  it('clamps coherence to max', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 0.1, 'minor');
    const result = service.repair(record.connectionId, 0.5);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.coherence).toBe(1.0);
    }
  });

  it('can restore DISRUPTED to LOCKED', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 0.6, 'damage');
    const result = service.repair(record.connectionId, 0.7);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.state).toBe('LOCKED');
    }
  });
});

describe('FrequencyLockService — repair errors', () => {
  let service: FrequencyLockService;

  beforeEach(() => {
    ({ service } = createService());
  });

  it('returns error for broken connection', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 1.0, 'fatal');
    const result = service.repair(record.connectionId, 0.5);
    expect(result).toBe('connection_broken');
  });

  it('returns error for unlocked connection', () => {
    const record = service.registerConnection('world-a', 'world-b');
    const result = service.repair(record.connectionId, 0.5);
    expect(result).toBe('connection_unlocked');
  });

  it('returns error for zero amount', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 0.3, 'damage');
    const result = service.repair(record.connectionId, 0);
    expect(result).toBe('invalid_repair_amount');
  });

  it('returns error for negative amount', () => {
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    service.disrupt(record.connectionId, 0.3, 'damage');
    const result = service.repair(record.connectionId, -0.1);
    expect(result).toBe('invalid_repair_amount');
  });

  it('returns error for unknown connection', () => {
    const result = service.repair('nonexistent', 0.5);
    expect(result).toBe('connection_not_found');
  });
});

// ── Queries ──────────────────────────────────────────────────────

describe('FrequencyLockService — getRecord', () => {
  it('returns the record for a known connection', () => {
    const { service } = createService();
    const record = service.registerConnection('world-a', 'world-b');
    const found = service.getRecord(record.connectionId);
    expect(found).toBeDefined();
    expect(found?.connectionId).toBe(record.connectionId);
  });

  it('returns undefined for unknown connection', () => {
    const { service } = createService();
    expect(service.getRecord('nonexistent')).toBeUndefined();
  });
});

describe('FrequencyLockService — getCoherenceLevel', () => {
  it('returns VOID for unknown connection', () => {
    const { service } = createService();
    expect(service.getCoherenceLevel('nonexistent')).toBe('VOID');
  });

  it('returns VOID for fresh connection', () => {
    const { service } = createService();
    const record = service.registerConnection('world-a', 'world-b');
    expect(service.getCoherenceLevel(record.connectionId)).toBe('VOID');
  });

  it('returns correct level after attunement', () => {
    const { service } = createService();
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 0.6);
    expect(service.getCoherenceLevel(record.connectionId)).toBe('MODERATE');
  });
});

describe('FrequencyLockService — listByState', () => {
  it('lists connections by state', () => {
    const { service } = createService();
    service.registerConnection('world-a', 'world-b');
    service.registerConnection('world-c', 'world-d');
    const unlocked = service.listByState('UNLOCKED');
    expect(unlocked).toHaveLength(2);
  });

  it('returns empty array for unmatched state', () => {
    const { service } = createService();
    service.registerConnection('world-a', 'world-b');
    expect(service.listByState('LOCKED')).toHaveLength(0);
  });

  it('filters by ATTUNING state', () => {
    const { service } = createService();
    const r1 = service.registerConnection('world-a', 'world-b');
    service.registerConnection('world-c', 'world-d');
    service.startAttunement(r1.connectionId, 'dynasty-1');
    expect(service.listByState('ATTUNING')).toHaveLength(1);
    expect(service.listByState('UNLOCKED')).toHaveLength(1);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('FrequencyLockService — getStats', () => {
  it('returns zero stats initially', () => {
    const { service } = createService();
    const stats = service.getStats();
    expect(stats.totalConnections).toBe(0);
    expect(stats.averageCoherence).toBe(0);
    expect(stats.totalDisruptions).toBe(0);
  });

  it('counts connections by state', () => {
    const { service } = createService();
    const r1 = service.registerConnection('world-a', 'world-b');
    service.registerConnection('world-c', 'world-d');
    service.startAttunement(r1.connectionId, 'dynasty-1');

    const stats = service.getStats();
    expect(stats.totalConnections).toBe(2);
    expect(stats.byState.UNLOCKED).toBe(1);
    expect(stats.byState.ATTUNING).toBe(1);
  });

  it('calculates average coherence', () => {
    const { service } = createService();
    const r1 = service.registerConnection('world-a', 'world-b');
    const r2 = service.registerConnection('world-c', 'world-d');
    service.startAttunement(r1.connectionId, 'dynasty-1');
    service.advanceAttunement(r1.connectionId, 0.8);
    service.startAttunement(r2.connectionId, 'dynasty-2');
    service.advanceAttunement(r2.connectionId, 0.2);

    const stats = service.getStats();
    expect(stats.averageCoherence).toBeCloseTo(0.5, 10);
  });

  it('tracks total disruptions', () => {
    const { service } = createService();
    const r1 = service.registerConnection('world-a', 'world-b');
    service.startAttunement(r1.connectionId, 'dynasty-1');
    service.advanceAttunement(r1.connectionId, 1.0);
    service.lockFrequency(r1.connectionId);
    service.disrupt(r1.connectionId, 0.1, 'glitch');
    service.disrupt(r1.connectionId, 0.1, 'glitch');

    const stats = service.getStats();
    expect(stats.totalDisruptions).toBe(2);
  });
});

// ── Full Lifecycle ───────────────────────────────────────────────

describe('FrequencyLockService — full lifecycle', () => {
  it('registers, attunes, locks, disrupts, repairs', () => {
    const { service } = createService();
    const record = service.registerConnection('earth', 'mars');
    expect(record.state).toBe('UNLOCKED');

    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 0.5);
    service.advanceAttunement(record.connectionId, 0.5);
    service.lockFrequency(record.connectionId);

    const locked = service.getRecord(record.connectionId);
    expect(locked?.state).toBe('LOCKED');
    expect(locked?.coherence).toBe(1.0);

    service.disrupt(record.connectionId, 0.6, 'anomaly');
    const disrupted = service.getRecord(record.connectionId);
    expect(disrupted?.state).toBe('DISRUPTED');

    service.repair(record.connectionId, 0.7);
    const repaired = service.getRecord(record.connectionId);
    expect(repaired?.state).toBe('LOCKED');
  });

  it('can attune from DISRUPTED after repair to UNLOCKED path', () => {
    const { service } = createService();
    const record = service.registerConnection('earth', 'mars');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 0.6);

    const result = service.disrupt(record.connectionId, 0.2, 'minor');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.newCoherence).toBeCloseTo(0.4, 10);
    }

    const afterDisrupt = service.getRecord(record.connectionId);
    expect(afterDisrupt?.state).toBe('DISRUPTED');
  });
});

// ── Custom Config ────────────────────────────────────────────────

describe('FrequencyLockService — custom config', () => {
  it('respects custom lock threshold', () => {
    const { service } = createService({ lockThreshold: 0.5 });
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 0.5);
    const result = service.lockFrequency(record.connectionId);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.state).toBe('LOCKED');
    }
  });

  it('respects custom break threshold', () => {
    const { service } = createService({ breakThreshold: 0.3 });
    const record = service.registerConnection('world-a', 'world-b');
    service.startAttunement(record.connectionId, 'dynasty-1');
    service.advanceAttunement(record.connectionId, 1.0);
    service.lockFrequency(record.connectionId);
    const result = service.disrupt(record.connectionId, 0.75, 'catastrophe');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.newState).toBe('BROKEN');
    }
  });
});
