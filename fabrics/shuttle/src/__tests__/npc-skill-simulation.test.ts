import { describe, expect, it } from 'vitest';
import { XP_PER_LEVEL, createNpcSkillSystem } from '../npc-skill.js';

describe('npc-skill simulation', () => {
  it('simulates acquisition and multi-session training progression', () => {
    let now = 1_000_000;
    let id = 0;
    const sys = createNpcSkillSystem({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `sk-${id++}` },
    });

    sys.acquire({ npcId: 'npc-1', name: 'swordsmanship' });
    sys.train('npc-1', 'swordsmanship', XP_PER_LEVEL / 2);
    const final = sys.train('npc-1', 'swordsmanship', XP_PER_LEVEL * 2);

    expect(final?.newLevel).toBeGreaterThan(2);
    expect(sys.getSkill('npc-1', 'swordsmanship')?.experience).toBeGreaterThan(200);
  });
});
