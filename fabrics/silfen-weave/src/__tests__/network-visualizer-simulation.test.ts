import { describe, expect, it } from 'vitest';
import { createNetworkVisualizer } from '../network-visualizer.js';
import type { WeaveCorridor } from '../weave-network.js';

function corridor(overrides: Partial<WeaveCorridor> = {}): WeaveCorridor {
  return {
    corridorId: 'c-1',
    worldIdA: 'w1',
    worldIdB: 'w2',
    tier: 'standard',
    status: 'stable',
    stability: 80,
    transitDurationMs: 180_000,
    dangerRating: 2,
    tollKalon: 10,
    discoveredBy: 'p1',
    stabilizationContributors: [],
    stabilizationProgress: 100,
    activeEvents: [],
    trafficCount: 0,
    createdAt: 1_000n,
    stabilizedAt: 2_000n,
    ...overrides,
  };
}

describe('network-visualizer simulation', () => {
  it('builds map frame, applies filters, and highlights selected route', async () => {
    const viz = createNetworkVisualizer({
      worlds: {
        getWorld: async () => undefined,
        listWorlds: async () => [
          { worldId: 'w1', name: 'One', playerCount: 100, tier: 'anchor' },
          { worldId: 'w2', name: 'Two', playerCount: 20, tier: 'frontier' },
        ],
      },
      corridors: {
        getAll: async () => [corridor(), corridor({ corridorId: 'c-2', tier: 'hazardous', stability: 30 })],
      },
    });

    await viz.refresh();
    viz.selectWorld('w1');
    viz.highlightPath(['w1', 'w2']);
    viz.setFilter({ tiers: ['standard'], minStability: 60 });

    const frame = viz.buildFrame();
    expect(frame.nodes).toHaveLength(2);
    expect(frame.edges).toHaveLength(1);
    expect(frame.nodes.find((n) => n.worldId === 'w1')?.selected).toBe(true);
    expect(frame.edges[0]?.highlighted).toBe(true);
  });
});
