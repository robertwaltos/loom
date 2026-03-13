import { describe, expect, it } from 'vitest';
import type { EntityId } from '@loom/entities-contracts';
import { createPlayerConnectOrchestrator } from '../player-connect-orchestrator.js';

describe('player-connect-orchestrator simulation', () => {
  it('simulates validated connect flow from token to spawn and spawned-connection mark', () => {
    const disconnected: string[] = [];
    const orchestrator = createPlayerConnectOrchestrator({
      token: {
        validate: () => ({ valid: true, dynastyId: 'dynasty-1', reason: null }),
      },
      identity: {
        resolve: () => ({
          dynastyId: 'dynasty-1',
          displayName: 'Aria',
          homeWorldId: 'earth',
          status: 'active',
        }),
      },
      connections: {
        connect: () => true,
        markSpawned: () => true,
        disconnect: (connectionId) => {
          disconnected.push(connectionId);
          return true;
        },
      },
      spawns: {
        spawnPlayer: () => ({ ok: true as const, entityId: 'player-1' as EntityId }),
      },
      spawnPoints: {
        findSpawnPoint: () => 'spawn-earth-1',
      },
    });

    const result = orchestrator.connect({
      connectionId: 'conn-1',
      tokenId: 'token-1',
      meshContentHash: 'mesh-hero',
      assetName: 'HeroAvatar',
    });
    orchestrator.disconnect('conn-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.worldId).toBe('earth');
      expect(result.value.entityId).toBe('player-1');
    }
    expect(disconnected).toEqual(['conn-1']);
  });
});
