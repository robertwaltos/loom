import { describe, it, expect } from 'vitest';
import { createHealthCheckEngine } from '../health-check.js';
import type {
  HealthCheckEngine,
  HealthCheckDeps,
  ProbeRegistration,
  ProbeResult,
  HealthStatus,
} from '../health-check.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createTestEngine(maxHistory = 10): HealthCheckEngine {
  let time = 1_000_000;
  const deps: HealthCheckDeps = {
    clock: { nowMicroseconds: () => time++ },
    maxHistory,
  };
  return createHealthCheckEngine(deps);
}

function probe(
  name: string,
  fabric: string,
  status: HealthStatus = 'healthy',
  message = 'OK',
): ProbeRegistration {
  return {
    name,
    fabric,
    evaluate: (): ProbeResult => ({
      status,
      message,
      durationMicroseconds: 100,
    }),
  };
}

// ─── Registration ───────────────────────────────────────────────────

describe('Health check probe registration', () => {
  it('starts with zero probes', () => {
    const engine = createTestEngine();
    expect(engine.probeCount()).toBe(0);
    expect(engine.getProbeNames()).toHaveLength(0);
  });

  it('registers a probe', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('kalon-ledger', 'nakama'));
    expect(engine.probeCount()).toBe(1);
    expect(engine.getProbeNames()).toContain('kalon-ledger');
  });

  it('lists unique fabrics', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    engine.registerProbe(probe('vault', 'nakama'));
    engine.registerProbe(probe('tokens', 'dye-house'));
    const fabrics = engine.getFabrics();
    expect(fabrics).toHaveLength(2);
    expect(fabrics).toContain('nakama');
    expect(fabrics).toContain('dye-house');
  });

  it('overwrites probe with same name', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama', 'healthy'));
    engine.registerProbe(probe('ledger', 'nakama', 'degraded'));
    expect(engine.probeCount()).toBe(1);
    const report = engine.evaluate();
    expect(report.probes[0]?.status).toBe('degraded');
  });

  it('removes a probe', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    const removed = engine.removeProbe('ledger');
    expect(removed).toBe(true);
    expect(engine.probeCount()).toBe(0);
  });

  it('returns false when removing nonexistent probe', () => {
    const engine = createTestEngine();
    expect(engine.removeProbe('nope')).toBe(false);
  });
});

// ─── Evaluation ─────────────────────────────────────────────────────

describe('Health check evaluation', () => {
  it('returns healthy when all probes healthy', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama', 'healthy'));
    engine.registerProbe(probe('tokens', 'dye-house', 'healthy'));
    const report = engine.evaluate();
    expect(report.overallStatus).toBe('healthy');
    expect(report.healthyCount).toBe(2);
    expect(report.degradedCount).toBe(0);
    expect(report.unhealthyCount).toBe(0);
  });

  it('returns degraded when any probe degraded', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama', 'healthy'));
    engine.registerProbe(probe('tokens', 'dye-house', 'degraded'));
    const report = engine.evaluate();
    expect(report.overallStatus).toBe('degraded');
    expect(report.degradedCount).toBe(1);
  });

  it('returns unhealthy when any probe unhealthy', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama', 'degraded'));
    engine.registerProbe(probe('tokens', 'dye-house', 'unhealthy'));
    const report = engine.evaluate();
    expect(report.overallStatus).toBe('unhealthy');
    expect(report.unhealthyCount).toBe(1);
  });

  it('unhealthy overrides degraded in overall', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('a', 'f', 'healthy'));
    engine.registerProbe(probe('b', 'f', 'degraded'));
    engine.registerProbe(probe('c', 'f', 'unhealthy'));
    const report = engine.evaluate();
    expect(report.overallStatus).toBe('unhealthy');
  });

  it('reports healthy for empty probe set', () => {
    const engine = createTestEngine();
    const report = engine.evaluate();
    expect(report.overallStatus).toBe('healthy');
    expect(report.totalProbes).toBe(0);
  });

  it('includes checked-at timestamp', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    const report = engine.evaluate();
    expect(report.checkedAt).toBeGreaterThan(0);
  });
});

// ─── Probe Reports ─────────────────────────────────────────────────

describe('Health check probe reports', () => {
  it('includes probe name and fabric', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('kalon-ledger', 'nakama', 'healthy', 'All good'));
    const report = engine.evaluate();
    expect(report.probes).toHaveLength(1);
    expect(report.probes[0]?.name).toBe('kalon-ledger');
    expect(report.probes[0]?.fabric).toBe('nakama');
    expect(report.probes[0]?.message).toBe('All good');
  });

  it('includes duration from probe result', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    const report = engine.evaluate();
    expect(report.probes[0]?.durationMicroseconds).toBe(100);
  });

  it('reports correct counts', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('a', 'f', 'healthy'));
    engine.registerProbe(probe('b', 'f', 'healthy'));
    engine.registerProbe(probe('c', 'f', 'degraded'));
    const report = engine.evaluate();
    expect(report.totalProbes).toBe(3);
    expect(report.healthyCount).toBe(2);
    expect(report.degradedCount).toBe(1);
  });
});

// ─── Fabric Filtering ───────────────────────────────────────────────

describe('Health check fabric filtering', () => {
  it('evaluates only probes for specified fabric', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama', 'healthy'));
    engine.registerProbe(probe('tokens', 'dye-house', 'unhealthy'));
    const report = engine.evaluateFabric('nakama');
    expect(report.totalProbes).toBe(1);
    expect(report.overallStatus).toBe('healthy');
  });

  it('returns empty for unknown fabric', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    const report = engine.evaluateFabric('unknown');
    expect(report.totalProbes).toBe(0);
    expect(report.overallStatus).toBe('healthy');
  });

  it('fabric evaluation does not add to history', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    engine.evaluateFabric('nakama');
    expect(engine.getHistory(10)).toHaveLength(0);
  });
});

// ─── History ────────────────────────────────────────────────────────

describe('Health check history', () => {
  it('records evaluation in history', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    engine.evaluate();
    const history = engine.getHistory(10);
    expect(history).toHaveLength(1);
    expect(history[0]?.overallStatus).toBe('healthy');
  });

  it('accumulates multiple evaluations', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    engine.evaluate();
    engine.evaluate();
    engine.evaluate();
    expect(engine.getHistory(10)).toHaveLength(3);
  });

  it('limits history to maxHistory', () => {
    const engine = createTestEngine(3);
    engine.registerProbe(probe('ledger', 'nakama'));
    for (let i = 0; i < 5; i++) {
      engine.evaluate();
    }
    expect(engine.getHistory(10)).toHaveLength(3);
  });

  it('returns last N entries when limit specified', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    for (let i = 0; i < 5; i++) {
      engine.evaluate();
    }
    const recent = engine.getHistory(2);
    expect(recent).toHaveLength(2);
  });

  it('returns all entries when limit exceeds count', () => {
    const engine = createTestEngine();
    engine.registerProbe(probe('ledger', 'nakama'));
    engine.evaluate();
    const history = engine.getHistory(100);
    expect(history).toHaveLength(1);
  });
});
