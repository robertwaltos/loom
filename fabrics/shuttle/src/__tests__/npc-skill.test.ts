import { describe, it, expect } from 'vitest';
import { createNpcSkillSystem, XP_PER_LEVEL } from '../npc-skill.js';
import type { NpcSkillDeps } from '../npc-skill.js';

function createDeps(): NpcSkillDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'sk-' + String(id++) },
  };
}

describe('NpcSkillSystem — acquire / getSkill', () => {
  it('acquires a new skill at level 1', () => {
    const sys = createNpcSkillSystem(createDeps());
    const skill = sys.acquire({ npcId: 'npc-1', name: 'swordsmanship' });
    expect(skill.skillId).toBe('sk-0');
    expect(skill.level).toBe(1);
    expect(skill.experience).toBe(0);
    expect(skill.name).toBe('swordsmanship');
  });

  it('retrieves a skill by npc and name', () => {
    const sys = createNpcSkillSystem(createDeps());
    sys.acquire({ npcId: 'npc-1', name: 'archery' });
    const skill = sys.getSkill('npc-1', 'archery');
    expect(skill).toBeDefined();
    expect(skill?.name).toBe('archery');
  });

  it('returns undefined for unknown skill', () => {
    const sys = createNpcSkillSystem(createDeps());
    expect(sys.getSkill('npc-1', 'magic')).toBeUndefined();
  });
});

describe('NpcSkillSystem — train', () => {
  it('adds experience without leveling up', () => {
    const sys = createNpcSkillSystem(createDeps());
    sys.acquire({ npcId: 'npc-1', name: 'crafting' });
    const result = sys.train('npc-1', 'crafting', 50);
    expect(result).toBeDefined();
    expect(result?.leveledUp).toBe(false);
    expect(result?.totalExperience).toBe(50);
    expect(result?.newLevel).toBe(1);
  });

  it('levels up when crossing threshold', () => {
    const sys = createNpcSkillSystem(createDeps());
    sys.acquire({ npcId: 'npc-1', name: 'mining' });
    const result = sys.train('npc-1', 'mining', XP_PER_LEVEL);
    expect(result?.leveledUp).toBe(true);
    expect(result?.previousLevel).toBe(1);
    expect(result?.newLevel).toBe(2);
  });

  it('supports multiple level-ups in one training', () => {
    const sys = createNpcSkillSystem(createDeps());
    sys.acquire({ npcId: 'npc-1', name: 'combat' });
    const result = sys.train('npc-1', 'combat', XP_PER_LEVEL * 3);
    expect(result?.newLevel).toBe(4);
  });

  it('returns undefined for unknown skill', () => {
    const sys = createNpcSkillSystem(createDeps());
    expect(sys.train('npc-1', 'nope', 10)).toBeUndefined();
  });
});

describe('NpcSkillSystem — getSkills', () => {
  it('lists all skills for an npc', () => {
    const sys = createNpcSkillSystem(createDeps());
    sys.acquire({ npcId: 'npc-1', name: 'sword' });
    sys.acquire({ npcId: 'npc-1', name: 'shield' });
    expect(sys.getSkills('npc-1')).toHaveLength(2);
  });

  it('returns empty for unknown npc', () => {
    const sys = createNpcSkillSystem(createDeps());
    expect(sys.getSkills('ghost')).toHaveLength(0);
  });
});

describe('NpcSkillSystem — getStats', () => {
  it('reports skill statistics', () => {
    const sys = createNpcSkillSystem(createDeps());
    sys.acquire({ npcId: 'npc-1', name: 'sword' });
    sys.acquire({ npcId: 'npc-2', name: 'bow' });
    sys.train('npc-1', 'sword', XP_PER_LEVEL * 2);
    const stats = sys.getStats();
    expect(stats.totalNpcs).toBe(2);
    expect(stats.totalSkills).toBe(2);
    expect(stats.averageLevel).toBe(2); // (3 + 1) / 2 = 2
  });

  it('exports XP_PER_LEVEL constant', () => {
    expect(XP_PER_LEVEL).toBe(100);
  });
});
