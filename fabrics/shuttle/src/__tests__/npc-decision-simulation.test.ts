import { describe, expect, it } from 'vitest';
import { createNpcDecisionEngine } from '../npc-decision.js';

describe('npc-decision simulation', () => {
  it('simulates tier-routed decisions and aggregate stats', () => {
    let now = 1_000_000;
    const engine = createNpcDecisionEngine({
      backends: [
        { backend: 'mass_entity', decide: () => ({ actionType: 'move', parameters: {}, outcome: 'act', confidence: 0.8, reasoningTrace: 'mass move' }) },
        { backend: 'behavior_tree', decide: () => ({ actionType: 'trade', parameters: {}, outcome: 'act', confidence: 0.9, reasoningTrace: 'bt trade' }) },
        { backend: 'llm_haiku', decide: () => ({ actionType: 'idle', parameters: {}, outcome: 'defer', confidence: 0.4, reasoningTrace: 'haiku defer' }) },
      ],
      tierToBackend: {
        resolve: (tier) => {
          if (tier === 1) return 'mass_entity';
          if (tier === 2) return 'behavior_tree';
          return 'llm_haiku';
        },
      },
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    engine.decide({ perception: { npcId: 'n1', worldId: 'w1', tier: 1, context: [], timestamp: 1 }, availableActions: ['move'] });
    engine.decide({ perception: { npcId: 'n2', worldId: 'w1', tier: 2, context: [], timestamp: 2 }, availableActions: ['trade'] });
    engine.decide({ perception: { npcId: 'n3', worldId: 'w1', tier: 3, context: [], timestamp: 3 }, availableActions: ['idle'] });

    const stats = engine.getStats();
    expect(stats.totalDecisions).toBe(3);
    expect(stats.byBackend.mass_entity).toBe(1);
    expect(stats.byBackend.behavior_tree).toBe(1);
    expect(stats.byBackend.llm_haiku).toBe(1);
  });
});
