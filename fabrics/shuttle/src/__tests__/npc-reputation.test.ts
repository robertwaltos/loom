import { describe, it, expect } from 'vitest';
import { createNpcReputationService, REPUTATION_MIN, REPUTATION_MAX } from '../npc-reputation.js';
import type { NpcReputationDeps } from '../npc-reputation.js';

function createDeps(): NpcReputationDeps {
  let time = 1000;
  return { clock: { nowMicroseconds: () => time++ } };
}

describe('NpcReputationService — adjust', () => {
  it('creates entry on first adjustment and returns score', () => {
    const svc = createNpcReputationService(createDeps());
    const score = svc.adjust({ npcId: 'npc-1', targetId: 'npc-2', delta: 10 });
    expect(score).toBe(10);
  });

  it('accumulates adjustments', () => {
    const svc = createNpcReputationService(createDeps());
    svc.adjust({ npcId: 'npc-1', targetId: 'npc-2', delta: 30 });
    const score = svc.adjust({ npcId: 'npc-1', targetId: 'npc-2', delta: 25 });
    expect(score).toBe(55);
  });

  it('clamps at maximum', () => {
    const svc = createNpcReputationService(createDeps());
    const score = svc.adjust({ npcId: 'a', targetId: 'b', delta: 200 });
    expect(score).toBe(REPUTATION_MAX);
  });

  it('clamps at minimum', () => {
    const svc = createNpcReputationService(createDeps());
    const score = svc.adjust({ npcId: 'a', targetId: 'b', delta: -200 });
    expect(score).toBe(REPUTATION_MIN);
  });
});

describe('NpcReputationService — getScore and getLevel', () => {
  it('returns zero for unknown pair', () => {
    const svc = createNpcReputationService(createDeps());
    expect(svc.getScore('a', 'b')).toBe(0);
  });

  it('maps scores to correct levels', () => {
    const svc = createNpcReputationService(createDeps());
    expect(svc.getLevel('a', 'b')).toBe('neutral'); // 0

    svc.adjust({ npcId: 'a', targetId: 'b', delta: -80 });
    expect(svc.getLevel('a', 'b')).toBe('hostile');

    svc.adjust({ npcId: 'c', targetId: 'd', delta: -30 });
    expect(svc.getLevel('c', 'd')).toBe('unfriendly');

    svc.adjust({ npcId: 'e', targetId: 'f', delta: 30 });
    expect(svc.getLevel('e', 'f')).toBe('friendly');

    svc.adjust({ npcId: 'g', targetId: 'h', delta: 80 });
    expect(svc.getLevel('g', 'h')).toBe('allied');
  });
});

describe('NpcReputationService — getRelations', () => {
  it('returns all relations for an NPC', () => {
    const svc = createNpcReputationService(createDeps());
    svc.adjust({ npcId: 'npc-1', targetId: 'a', delta: 10 });
    svc.adjust({ npcId: 'npc-1', targetId: 'b', delta: -5 });
    svc.adjust({ npcId: 'npc-2', targetId: 'c', delta: 20 });
    const relations = svc.getRelations('npc-1');
    expect(relations).toHaveLength(2);
  });

  it('returns empty for NPC with no relations', () => {
    const svc = createNpcReputationService(createDeps());
    expect(svc.getRelations('lonely')).toHaveLength(0);
  });
});

describe('NpcReputationService — decay', () => {
  it('decays scores toward zero', () => {
    const svc = createNpcReputationService(createDeps());
    svc.adjust({ npcId: 'a', targetId: 'b', delta: 50 });
    svc.adjust({ npcId: 'c', targetId: 'd', delta: -40 });
    const decayed = svc.decay(10);
    expect(decayed).toBe(2);
    expect(svc.getScore('a', 'b')).toBe(40);
    expect(svc.getScore('c', 'd')).toBe(-30);
  });

  it('does not overshoot zero', () => {
    const svc = createNpcReputationService(createDeps());
    svc.adjust({ npcId: 'a', targetId: 'b', delta: 5 });
    svc.decay(20);
    expect(svc.getScore('a', 'b')).toBe(0);
  });
});

describe('NpcReputationService — stats', () => {
  it('reports total entry count', () => {
    const svc = createNpcReputationService(createDeps());
    svc.adjust({ npcId: 'a', targetId: 'b', delta: 10 });
    svc.adjust({ npcId: 'a', targetId: 'c', delta: 5 });
    expect(svc.getStats().totalEntries).toBe(2);
  });
});
