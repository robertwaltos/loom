import { describe, expect, it } from 'vitest';
import {
  registerFabricHealthProbes,
  type InspectorProbeRegistration,
} from '../inspector-integration.js';

describe('inspector-integration simulation', () => {
  it('simulates multi-fabric probe wiring and evaluates resulting health states', () => {
    const probes: InspectorProbeRegistration[] = [];
    let now = 1_000_000;

    registerFabricHealthProbes({
      health: {
        registerProbe: (probe) => {
          probes.push(probe);
        },
      },
      clock: { nowMicroseconds: () => now++ },
      nakama: { getTickCount: () => 12 },
      shuttle: {
        getTickCount: () => 5,
        getStats: () => ({ totalNpcsProcessed: 80 }),
      },
      weave: {
        getTickCount: () => 9,
        getStats: () => ({ totalTransitsCompleted: 18, totalTransitsAborted: 2 }),
      },
      connections: {
        getStats: () => ({ activeConnections: 3, pendingConnections: 1 }),
      },
      bridge: {
        getStats: () => ({ totalPushes: 25 }),
      },
    });

    const statuses = probes.map((probe) => probe.evaluate().status);

    expect(probes).toHaveLength(5);
    expect(statuses.every((status) => status === 'healthy')).toBe(true);
  });
});
