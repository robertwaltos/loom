import { describe, expect, it } from 'vitest';
import { createPlayerConnectionSystem } from '../player-connection-system.js';

describe('player-connection-system simulation', () => {
  it('simulates connect, spawn binding, and disconnect lifecycle with stats updates', () => {
    let now = 1_000_000;
    const system = createPlayerConnectionSystem({
      clock: { nowMicroseconds: () => now++ },
    });

    const connected = system.connect({
      connectionId: 'conn-1',
      playerId: 'player-1',
      displayName: 'Aria',
    });
    const spawned = system.markSpawned('conn-1', 'ent-1' as never, 'earth');
    const disconnected = system.disconnect('conn-1');

    expect(connected).toBe(true);
    expect(spawned).toBe(true);
    expect(disconnected).toBe(true);
    expect(system.getConnection('conn-1')?.state).toBe('disconnected');
  });
});
