import { describe, expect, it } from 'vitest';
import { createShuttleOrchestrator } from '../shuttle-orchestrator.js';

describe('shuttle-orchestrator simulation', () => {
  it('simulates one world tick across tiered npc processing lanes', () => {
    const orchestrator = createShuttleOrchestrator({
      population: {
        listActiveNpcs: () => [
          { npcId: 'a', worldId: 'earth', tier: 1, displayName: 'A' },
          { npcId: 'b', worldId: 'earth', tier: 2, displayName: 'B' },
          { npcId: 'c', worldId: 'earth', tier: 3, displayName: 'C' },
        ],
      },
      decision: {
        decide: (req) => ({ npcId: req.npcId, actionType: 'move', outcome: 'act', confidence: 0.8 }),
        decideBatch: (reqs) =>
          reqs.map((req) => ({ npcId: req.npcId, actionType: 'move', outcome: 'act', confidence: 0.8 })),
      },
      behaviorTree: {
        hasTree: () => true,
        tickTree: () => 'success',
      },
      memory: {
        record: () => 'mem-1',
        recall: () => [],
        prune: () => 0,
      },
      schedule: {
        getActiveBlock: () => null,
      },
      clock: { nowMicroseconds: () => 1_000_000 },
    });

    const tick = orchestrator.tick('earth', 33_000);
    expect(tick.npcsProcessed).toBe(3);
    expect(orchestrator.getTickCount()).toBe(1);
  });
});
