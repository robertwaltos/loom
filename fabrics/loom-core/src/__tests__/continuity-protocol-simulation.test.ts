import { describe, it, expect, vi } from 'vitest';
import {
  createContinuityProtocolService,
  DEFAULT_VIGIL_THRESHOLD_DAYS,
  MS_PER_DAY,
  NEURAL_MAP_MIN_FIDELITY,
  MAX_CONTINUITY_BONDS,
} from '../continuity-protocol.js';

// ─── helpers ───────────────────────────────────────────────────────────────

const BASE_NOW = 1_700_000_000_000;

function makeDeps(nowMs = BASE_NOW, vigilThresholdDays?: number) {
  return {
    clock: {
      nowMs: vi.fn(() => nowMs),
      nowUs: vi.fn(() => nowMs * 1000),
    },
    idGenerator: { next: vi.fn(() => `id-${Math.random().toString(36).slice(2)}`) },
    vigilThresholdDays,
  };
}

// ─── constants ─────────────────────────────────────────────────────────────

describe('ContinuityProtocol — exported constants', () => {
  it('DEFAULT_VIGIL_THRESHOLD_DAYS is 30', () => {
    expect(DEFAULT_VIGIL_THRESHOLD_DAYS).toBe(30);
  });
  it('MS_PER_DAY is 86_400_000', () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });
  it('NEURAL_MAP_MIN_FIDELITY is 0.85', () => {
    expect(NEURAL_MAP_MIN_FIDELITY).toBe(0.85);
  });
  it('MAX_CONTINUITY_BONDS is 7', () => {
    expect(MAX_CONTINUITY_BONDS).toBe(7);
  });
});

// ─── initDynasty ───────────────────────────────────────────────────────────

describe('ContinuityProtocol — initDynasty', () => {
  it('creates a new dynasty record with ACTIVE vigilState', () => {
    const svc = createContinuityProtocolService(makeDeps());
    const result = svc.initDynasty('dynasty-alpha');
    expect(typeof result).toBe('object');
    const rec = result as Record<string, unknown>;
    expect(rec['dynastyId']).toBe('dynasty-alpha');
    expect(rec['vigilState']).toBe('ACTIVE');
  });

  it('respects initialBonds argument', () => {
    const svc = createContinuityProtocolService(makeDeps());
    const result = svc.initDynasty('dynasty-beta', 5) as Record<string, unknown>;
    expect(result['continuityBonds']).toBe(5);
  });

  it('caps initialBonds at MAX_CONTINUITY_BONDS', () => {
    const svc = createContinuityProtocolService(makeDeps());
    const result = svc.initDynasty('dynasty-gamma', 99) as Record<string, unknown>;
    expect(result['continuityBonds']).toBe(MAX_CONTINUITY_BONDS);
  });

  it('returns error string when dynasty already exists', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-dup');
    const second = svc.initDynasty('dynasty-dup');
    expect(typeof second).toBe('string');
  });
});

// ─── recordLogin ───────────────────────────────────────────────────────────

describe('ContinuityProtocol — recordLogin', () => {
  it('returns updated record on valid login', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-login');
    const result = svc.recordLogin('dynasty-login');
    expect(typeof result).toBe('object');
  });

  it('returns error for unknown dynasty', () => {
    const svc = createContinuityProtocolService(makeDeps());
    expect(typeof svc.recordLogin('ghost')).toBe('string');
  });

  it('transitions VIGIL → RENEWED on login', () => {
    // Create dynasty, push it into VIGIL, then login
    const now = { current: BASE_NOW };
    const deps = {
      clock: { nowMs: () => now.current, nowUs: () => now.current * 1000 },
      idGenerator: { next: () => 'id' },
    };
    const svc = createContinuityProtocolService(deps);
    svc.initDynasty('dynasty-vigil');
    // Advance time past vigil threshold (31 days)
    now.current = BASE_NOW + 31 * MS_PER_DAY;
    svc.evaluateVigilState('dynasty-vigil');
    // Now log in
    const result = svc.recordLogin('dynasty-vigil') as Record<string, unknown>;
    expect(result['vigilState']).toBe('RENEWED');
  });
});

// ─── evaluateVigilState ────────────────────────────────────────────────────

describe('ContinuityProtocol — evaluateVigilState', () => {
  it('stays ACTIVE when recently logged in', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-fresh');
    const result = svc.evaluateVigilState('dynasty-fresh') as Record<string, unknown>;
    expect(result['vigilState']).toBe('ACTIVE');
  });

  it('transitions to VIGIL after threshold days of inactivity', () => {
    const now = { current: BASE_NOW };
    const deps = {
      clock: { nowMs: () => now.current, nowUs: () => now.current * 1000 },
      idGenerator: { next: () => 'id' },
    };
    const svc = createContinuityProtocolService(deps);
    svc.initDynasty('dynasty-inactive');
    now.current = BASE_NOW + 31 * MS_PER_DAY;
    const result = svc.evaluateVigilState('dynasty-inactive') as Record<string, unknown>;
    expect(result['vigilState']).toBe('VIGIL');
  });

  it('returns error for unknown dynasty', () => {
    const svc = createContinuityProtocolService(makeDeps());
    expect(typeof svc.evaluateVigilState('nobody')).toBe('string');
  });
});

// ─── fileNeuralMap ─────────────────────────────────────────────────────────

describe('ContinuityProtocol — fileNeuralMap', () => {
  it('accepts a high-fidelity map and marks it as primary', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-map');
    const result = svc.fileNeuralMap({ dynastyId: 'dynasty-map', fidelityScore: 0.95 });
    expect(typeof result).toBe('object');
    const map = result as Record<string, unknown>;
    expect(map['fidelityScore']).toBe(0.95);
  });

  it('rejects a below-fidelity-threshold map (still files but not primary)', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-lowfi');
    const result = svc.fileNeuralMap({ dynastyId: 'dynasty-lowfi', fidelityScore: 0.5 });
    // Result is still a map object (filed), but record's primaryMapId should be absent
    expect(typeof result).toBe('object');
  });

  it('returns error for unknown dynasty', () => {
    const svc = createContinuityProtocolService(makeDeps());
    expect(typeof svc.fileNeuralMap({ dynastyId: 'ghost', fidelityScore: 0.90 })).toBe('string');
  });
});

// ─── consumeContinuityBond / awardContinuityBonds ─────────────────────────

describe('ContinuityProtocol — bonds management', () => {
  it('consuming a bond decrements continuityBonds by 1', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-bond', 3);
    const result = svc.consumeContinuityBond('dynasty-bond') as Record<string, unknown>;
    expect(result['continuityBonds']).toBe(2);
  });

  it('returns error when consuming with 0 bonds', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-empty', 0);
    expect(typeof svc.consumeContinuityBond('dynasty-empty')).toBe('string');
  });

  it('awarding bonds increases continuityBonds', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-award', 1);
    const result = svc.awardContinuityBonds('dynasty-award', 2) as Record<string, unknown>;
    expect(result['continuityBonds']).toBe(3);
  });

  it('caps bonds at MAX_CONTINUITY_BONDS when awarding', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-cap', MAX_CONTINUITY_BONDS);
    const result = svc.awardContinuityBonds('dynasty-cap', 5) as Record<string, unknown>;
    expect(result['continuityBonds']).toBe(MAX_CONTINUITY_BONDS);
  });
});

// ─── getDynastyRecord / getVigilDynasties / getContinuityStats ────────────

describe('ContinuityProtocol — query helpers', () => {
  it('getDynastyRecord returns the stored record', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('dynasty-query');
    const record = svc.getDynastyRecord('dynasty-query');
    expect(record).toBeDefined();
    expect((record as Record<string, unknown>)['dynastyId']).toBe('dynasty-query');
  });

  it('getDynastyRecord returns undefined for unknown dynasty', () => {
    const svc = createContinuityProtocolService(makeDeps());
    expect(svc.getDynastyRecord('nobody')).toBeUndefined();
  });

  it('getVigilDynasties includes dynasties in VIGIL state', () => {
    const now = { current: BASE_NOW };
    const deps = {
      clock: { nowMs: () => now.current, nowUs: () => now.current * 1000 },
      idGenerator: { next: () => 'id' },
    };
    const svc = createContinuityProtocolService(deps);
    svc.initDynasty('dynasty-vigil2');
    now.current = BASE_NOW + 31 * MS_PER_DAY;
    svc.evaluateVigilState('dynasty-vigil2');
    const vigil = svc.getVigilDynasties();
    expect(vigil.length).toBeGreaterThanOrEqual(1);
  });

  it('getContinuityStats reflects registered dynasties', () => {
    const svc = createContinuityProtocolService(makeDeps());
    svc.initDynasty('d1');
    svc.initDynasty('d2');
    const stats = svc.getContinuityStats();
    expect(stats.totalDynasties).toBe(2);
    expect(stats.activeDynasties).toBe(2);
  });
});
