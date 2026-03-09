/**
 * Inspector Integration — Health probe registration tests.
 */

import { describe, it, expect } from 'vitest';
import { registerFabricHealthProbes } from '../inspector-integration.js';
import type {
  InspectorProbeRegistration,
  InspectorIntegrationDeps,
} from '../inspector-integration.js';

// ── Mock Health Engine ──────────────────────────────────────────

function createMockHealth(): {
  readonly port: { readonly registerProbe: (p: InspectorProbeRegistration) => void };
  readonly probes: () => ReadonlyArray<InspectorProbeRegistration>;
} {
  const registered: InspectorProbeRegistration[] = [];
  return {
    port: { registerProbe: (p) => { registered.push(p); } },
    probes: () => [...registered],
  };
}

function mockClock(): { readonly nowMicroseconds: () => number } {
  let t = 1_000_000;
  return { nowMicroseconds: () => t++ };
}

// ── Registration Tests ──────────────────────────────────────────

describe('InspectorIntegration — probe registration', () => {
  it('registers no probes when no fabrics provided', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
    });
    expect(health.probes()).toHaveLength(0);
  });

  it('registers nakama probe when nakama provided', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      nakama: { getTickCount: () => 5 },
    });

    const probes = health.probes();
    expect(probes).toHaveLength(1);
    expect(probes[0]?.name).toBe('nakama-orchestrator');
    expect(probes[0]?.fabric).toBe('nakama-fabric');
  });

  it('registers all five probes when all fabrics provided', () => {
    const health = createMockHealth();
    const deps = buildFullDeps(health);
    registerFabricHealthProbes(deps);
    expect(health.probes()).toHaveLength(5);
  });
});

// ── Probe Evaluation Tests ──────────────────────────────────────

describe('InspectorIntegration — probe evaluation', () => {
  it('nakama probe reports healthy when ticking', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      nakama: { getTickCount: () => 10 },
    });

    const result = health.probes()[0]?.evaluate();
    expect(result?.status).toBe('healthy');
    expect(result?.message).toContain('10');
  });

  it('nakama probe reports degraded when no ticks', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      nakama: { getTickCount: () => 0 },
    });

    const result = health.probes()[0]?.evaluate();
    expect(result?.status).toBe('degraded');
  });
});

describe('InspectorIntegration — weave health classification', () => {
  it('reports healthy when abort rate is low', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      weave: {
        getTickCount: () => 100,
        getStats: () => ({ totalTransitsCompleted: 95, totalTransitsAborted: 5 }),
      },
    });

    const probe = health.probes().find((p) => p.name === 'weave-orchestrator');
    const result = probe?.evaluate();
    expect(result?.status).toBe('healthy');
  });

  it('reports degraded when abort rate exceeds 20%', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      weave: {
        getTickCount: () => 100,
        getStats: () => ({ totalTransitsCompleted: 7, totalTransitsAborted: 3 }),
      },
    });

    const probe = health.probes().find((p) => p.name === 'weave-orchestrator');
    const result = probe?.evaluate();
    expect(result?.status).toBe('degraded');
  });

  it('reports unhealthy when abort rate exceeds 50%', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      weave: {
        getTickCount: () => 100,
        getStats: () => ({ totalTransitsCompleted: 3, totalTransitsAborted: 7 }),
      },
    });

    const probe = health.probes().find((p) => p.name === 'weave-orchestrator');
    const result = probe?.evaluate();
    expect(result?.status).toBe('unhealthy');
  });
});

describe('InspectorIntegration — connection and bridge probes', () => {
  it('connection probe reports active count', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      connections: {
        getStats: () => ({ activeConnections: 42, pendingConnections: 3 }),
      },
    });

    const probe = health.probes().find((p) => p.name === 'player-connections');
    const result = probe?.evaluate();
    expect(result?.status).toBe('healthy');
    expect(result?.message).toContain('42');
  });

  it('bridge probe reports healthy when pushes > 0', () => {
    const health = createMockHealth();
    registerFabricHealthProbes({
      health: health.port,
      clock: mockClock(),
      bridge: { getStats: () => ({ totalPushes: 100 }) },
    });

    const probe = health.probes().find((p) => p.name === 'bridge-service');
    const result = probe?.evaluate();
    expect(result?.status).toBe('healthy');
  });
});

// ── Helper ──────────────────────────────────────────────────────

function buildFullDeps(
  health: ReturnType<typeof createMockHealth>,
): InspectorIntegrationDeps {
  return {
    health: health.port,
    clock: mockClock(),
    nakama: { getTickCount: () => 10 },
    shuttle: {
      getTickCount: () => 10,
      getStats: () => ({ totalNpcsProcessed: 50 }),
    },
    weave: {
      getTickCount: () => 10,
      getStats: () => ({ totalTransitsCompleted: 8, totalTransitsAborted: 2 }),
    },
    connections: {
      getStats: () => ({ activeConnections: 5, pendingConnections: 1 }),
    },
    bridge: { getStats: () => ({ totalPushes: 100 }) },
  };
}
