/**
 * Inspector Health Flow — Integration test.
 *
 * Proves the vertical slice from fabric orchestrators through
 * inspector health probe registration and evaluation. The flow:
 *
 *   1. GameOrchestrator wires inspector health probes on construction
 *   2. Health probes evaluate fabric orchestrator state
 *   3. HealthCheckEngine consolidates all probes into a report
 *   4. Probe results reflect actual tick counts and metrics
 *   5. Degraded/unhealthy classification works correctly
 *
 * Uses real services: HealthCheckEngine, registerFabricHealthProbes.
 * Mocks: fabric orchestrator stats, clock.
 */

import { describe, it, expect } from 'vitest';
import { createHealthCheckEngine } from '@loom/inspector';
import type { HealthCheckEngine } from '@loom/inspector';
import { registerFabricHealthProbes } from '@loom/loom-core';
import type { InspectorHealthPort } from '@loom/loom-core';

// ── Clock ───────────────────────────────────────────────────────

function mockClock(start = 1_000_000): {
  readonly nowMicroseconds: () => number;
} {
  return { nowMicroseconds: () => start };
}

// ── Mock Orchestrator Stats ─────────────────────────────────────

function createMockNakama(ticks: number): { readonly getTickCount: () => number } {
  return { getTickCount: () => ticks };
}

function createMockShuttle(
  ticks: number,
  npcs: number,
): {
  readonly getTickCount: () => number;
  readonly getStats: () => { readonly totalNpcsProcessed: number };
} {
  return {
    getTickCount: () => ticks,
    getStats: () => ({ totalNpcsProcessed: npcs }),
  };
}

function createMockWeave(
  ticks: number,
  completed: number,
  aborted: number,
): {
  readonly getTickCount: () => number;
  readonly getStats: () => {
    readonly totalTransitsCompleted: number;
    readonly totalTransitsAborted: number;
  };
} {
  return {
    getTickCount: () => ticks,
    getStats: () => ({
      totalTransitsCompleted: completed,
      totalTransitsAborted: aborted,
    }),
  };
}

// ── Health Port Adapter ─────────────────────────────────────────

function createHealthAdapter(engine: HealthCheckEngine): InspectorHealthPort {
  return {
    registerProbe: (probe) => {
      engine.registerProbe({
        name: probe.name,
        fabric: probe.fabric,
        evaluate: probe.evaluate,
      });
    },
  };
}

// ── Integration: Probe Registration ─────────────────────────────

describe('Inspector Health Flow — probe registration', () => {
  it('registers probes for all fabric orchestrators', () => {
    const clock = mockClock();
    const engine = createHealthCheckEngine({ clock, maxHistory: 10 });

    registerFabricHealthProbes({
      health: createHealthAdapter(engine),
      clock,
      nakama: createMockNakama(5),
      shuttle: createMockShuttle(3, 100),
      weave: createMockWeave(4, 10, 0),
    });

    expect(engine.probeCount()).toBe(3);
    const names = engine.getProbeNames();
    expect(names).toContain('nakama-orchestrator');
    expect(names).toContain('shuttle-orchestrator');
    expect(names).toContain('weave-orchestrator');
  });

  it('registers only provided orchestrators', () => {
    const clock = mockClock();
    const engine = createHealthCheckEngine({ clock, maxHistory: 10 });

    registerFabricHealthProbes({
      health: createHealthAdapter(engine),
      clock,
      nakama: createMockNakama(1),
    });

    expect(engine.probeCount()).toBe(1);
    expect(engine.getProbeNames()).toContain('nakama-orchestrator');
  });
});

// ── Integration: Health Evaluation ──────────────────────────────

describe('Inspector Health Flow — probe evaluation', () => {
  it('evaluates healthy status for active orchestrators', () => {
    const clock = mockClock();
    const engine = createHealthCheckEngine({ clock, maxHistory: 10 });

    registerFabricHealthProbes({
      health: createHealthAdapter(engine),
      clock,
      nakama: createMockNakama(10),
      shuttle: createMockShuttle(8, 500),
      weave: createMockWeave(6, 20, 1),
    });

    const report = engine.evaluate();
    expect(report.overallStatus).toBe('healthy');
    expect(report.totalProbes).toBe(3);
    expect(report.healthyCount).toBe(3);
  });

  it('reports degraded for zero-tick orchestrators', () => {
    const clock = mockClock();
    const engine = createHealthCheckEngine({ clock, maxHistory: 10 });

    registerFabricHealthProbes({
      health: createHealthAdapter(engine),
      clock,
      nakama: createMockNakama(0),
      weave: createMockWeave(5, 10, 0),
    });

    const report = engine.evaluate();
    expect(report.overallStatus).toBe('degraded');
    expect(report.degradedCount).toBe(1);
    expect(report.healthyCount).toBe(1);
  });

  it('reports unhealthy for high abort rate', () => {
    const clock = mockClock();
    const engine = createHealthCheckEngine({ clock, maxHistory: 10 });

    registerFabricHealthProbes({
      health: createHealthAdapter(engine),
      clock,
      weave: createMockWeave(10, 3, 7),
    });

    const report = engine.evaluate();
    expect(report.overallStatus).toBe('unhealthy');
    expect(report.unhealthyCount).toBe(1);
  });
});

// ── Integration: Fabric-Level Query ─────────────────────────────

describe('Inspector Health Flow — fabric grouping', () => {
  it('groups probes by fabric name', () => {
    const clock = mockClock();
    const engine = createHealthCheckEngine({ clock, maxHistory: 10 });

    registerFabricHealthProbes({
      health: createHealthAdapter(engine),
      clock,
      nakama: createMockNakama(5),
      shuttle: createMockShuttle(3, 50),
      weave: createMockWeave(4, 8, 0),
    });

    const fabrics = engine.getFabrics();
    expect(fabrics).toContain('nakama-fabric');
    expect(fabrics).toContain('shuttle');
    expect(fabrics).toContain('silfen-weave');

    const nakamaReport = engine.evaluateFabric('nakama-fabric');
    expect(nakamaReport.totalProbes).toBe(1);
    expect(nakamaReport.overallStatus).toBe('healthy');
  });
});

// ── Integration: History Tracking ───────────────────────────────

describe('Inspector Health Flow — health history', () => {
  it('records evaluation history', () => {
    const clock = mockClock();
    const engine = createHealthCheckEngine({ clock, maxHistory: 10 });

    registerFabricHealthProbes({
      health: createHealthAdapter(engine),
      clock,
      nakama: createMockNakama(5),
    });

    engine.evaluate();
    engine.evaluate();
    engine.evaluate();

    const history = engine.getHistory(5);
    expect(history).toHaveLength(3);
  });
});
