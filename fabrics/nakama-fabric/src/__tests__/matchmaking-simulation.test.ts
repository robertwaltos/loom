import { describe, expect, it } from 'vitest';
import { createMatchmakingEngine } from '../matchmaking.js';
import type { MatchmakingDeps } from '../matchmaking.js';

describe('Matchmaking — simulation', () => {
  it('simulates a full cycle: enqueue, tick, dequeue, open_world assignment', () => {
    let id = 0;
    let timeMs = 1_000;
    const deps: MatchmakingDeps = {
      idGenerator: { generate: () => 'mm-' + String(++id) },
      clock: { nowMs: () => (timeMs += 100) },
      logger: { info: () => {} },
      worldRoster: { getActivePlayerCount: (wid) => (wid === 'world-a' ? 10 : 5) },
      worldIds: ['world-a', 'world-b'],
    };
    const engine = createMatchmakingEngine(deps);

    // Two solo players within ELO range
    engine.enqueue({ playerId: 'p1', bracketType: 'solo_1v1', skillRating: 1500, queuedAt: 1000, preferredWorldIds: [] });
    engine.enqueue({ playerId: 'p2', bracketType: 'solo_1v1', skillRating: 1650, queuedAt: 1000, preferredWorldIds: [] });
    // One open_world player
    engine.enqueue({ playerId: 'p3', bracketType: 'open_world', skillRating: 1500, queuedAt: 1000, preferredWorldIds: [] });
    // Player that will dequeue before tick
    engine.enqueue({ playerId: 'p4', bracketType: 'solo_1v1', skillRating: 1520, queuedAt: 1000, preferredWorldIds: [] });
    engine.dequeue('p4');

    const results = engine.tick();

    // p1+p2 matched; p3 open_world assigned; p4 already gone
    const solo = results.filter((r) => r.bracketType === 'solo_1v1');
    const openWorld = results.filter((r) => r.bracketType === 'open_world');

    expect(solo).toHaveLength(1);
    expect(solo[0]?.playerIds.sort()).toEqual(['p1', 'p2']);

    expect(openWorld).toHaveLength(1);
    expect(openWorld[0]?.playerIds).toEqual(['p3']);
    // world-b has fewer active players (5 < 10), so open_world picks world-b
    expect(openWorld[0]?.assignedWorldId).toBe('world-b');

    // All queues should be empty after the tick
    expect(engine.getQueueDepth('solo_1v1')).toBe(0);
    expect(engine.getQueueDepth('open_world')).toBe(0);
  });
});