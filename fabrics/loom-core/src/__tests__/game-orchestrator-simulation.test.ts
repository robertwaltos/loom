import { describe, expect, it } from 'vitest';
import { createGameOrchestrator } from '../game-orchestrator.js';
import { createSilentLogger } from '../logger.js';

describe('game-orchestrator simulation', () => {
  it('simulates player connection plus world seeding on a composed orchestrator', () => {
    const pushedTicks: number[] = [];
    const orchestrator = createGameOrchestrator({
      renderingFabric: {
        pushStateSnapshot: (snapshot) => {
          pushedTicks.push(snapshot.tickNumber);
        },
        spawnVisual: () => Promise.resolve(),
        despawnVisual: () => Promise.resolve(),
      },
      coreConfig: { logger: createSilentLogger() },
    });

    const seed = orchestrator.seedWorld();
    orchestrator.connections.connect({
      connectionId: 'conn-1',
      playerId: 'player-1',
      displayName: 'Player One',
    });
    orchestrator.core.systems.runAll({
      deltaMs: 16,
      tickNumber: 1,
      wallTimeMicroseconds: 16_000,
    });

    expect(seed.worldId).toBe('default');
    expect(orchestrator.connections.getStats().pendingConnections).toBe(1);
    expect(pushedTicks.length).toBeGreaterThan(0);

    orchestrator.stop();
  });
});
