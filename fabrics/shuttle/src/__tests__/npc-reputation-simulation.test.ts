import { describe, expect, it } from 'vitest';
import { createNpcReputationService } from '../npc-reputation.js';

describe('npc-reputation simulation', () => {
  it('simulates reputation rise after aid and partial decay over time', () => {
    let now = 1_000_000;
    const svc = createNpcReputationService({
      clock: { nowMicroseconds: () => now++ },
    });

    svc.adjust({ npcId: 'npc-1', targetId: 'player-1', delta: 40 });
    svc.adjust({ npcId: 'npc-1', targetId: 'player-1', delta: 15 });
    const beforeDecay = svc.getScore('npc-1', 'player-1');
    svc.decay(10);

    expect(beforeDecay).toBe(55);
    expect(svc.getScore('npc-1', 'player-1')).toBe(45);
    expect(svc.getLevel('npc-1', 'player-1')).toBe('friendly');
  });
});
