import { describe, expect, it } from 'vitest';
import { createBridgeService } from '../bridge-service.js';

describe('bridge-service simulation', () => {
  it('simulates mapper buffer push with spawn tracking into rendering fabric', () => {
    const spawned: string[] = [];
    const pushes: number[] = [];
    const service = createBridgeService({
      visualStateMapper: {
        getLatestBuffer: () => ({
          tickNumber: 1,
          timestamp: 1_000,
          states: [
            {
              entityId: 'ent-1',
              transform: {
                position: { x: 1, y: 2, z: 3 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 },
              },
              mesh: { contentHash: 'hash', assetName: 'mesh', availableTiers: ['high'] },
              animation: { clipName: 'Idle', normalizedTime: 0, blendWeight: 1, playbackRate: 1 },
              visibility: true,
              renderPriority: 10,
            },
          ],
        }),
        system: () => undefined,
      },
      renderingFabric: {
        pushStateSnapshot: (updates) => pushes.push(updates.length),
        spawnVisual: async (id) => {
          spawned.push(id);
        },
        despawnVisual: async () => undefined,
      },
      clock: { nowMicroseconds: () => 1_000 },
    });

    service.system({ deltaMs: 33, tickNumber: 1, wallTimeMicroseconds: 33_000 });

    expect(spawned).toContain('ent-1');
    expect(pushes[0]).toBe(1);
    expect(service.getStats().totalPushes).toBe(1);
  });
});
