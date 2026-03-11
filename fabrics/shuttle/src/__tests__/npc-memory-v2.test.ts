import { describe, it, expect } from 'vitest';
import { createNpcMemoryV2System } from '../npc-memory-v2.js';
import type { MemoryV2Deps, MemoryV2Config } from '../npc-memory-v2.js';

function makeDeps(startTime?: number): { deps: MemoryV2Deps; setTime: (t: number) => void } {
  let time = startTime ?? 1_000_000;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'mem-' + String(++id) },
    },
    setTime: (t: number) => {
      time = t;
    },
  };
}

describe('MemoryV2 — recording', () => {
  it('records a short-term memory', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const mem = sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'player-1',
      content: 'Player gave a gift',
      importance: 0.3,
    });
    expect(mem.memoryId).toBe('mem-1');
    expect(mem.tier).toBe('short_term');
    expect(mem.emotionalTag).toBe('positive');
  });

  it('records a long-term memory for high importance', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const mem = sys.record({
      npcId: 'npc-1',
      memoryType: 'trauma',
      emotionalTag: 'negative',
      subjectEntityId: 'enemy-1',
      content: 'Village was attacked',
      importance: 0.9,
    });
    expect(mem.tier).toBe('long_term');
  });

  it('clamps importance to [0,1]', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const high = sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'x',
      content: 'test',
      importance: 5.0,
    });
    const low = sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'x',
      content: 'test',
      importance: -1.0,
    });
    expect(high.importance).toBe(1);
    expect(low.importance).toBe(0);
  });

  it('counts memories per NPC', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'neutral',
      subjectEntityId: 'x',
      content: 'a',
      importance: 0.3,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'y',
      content: 'b',
      importance: 0.4,
    });
    expect(sys.count('npc-1')).toBe(2);
  });
});

describe('MemoryV2 — recall', () => {
  it('recalls all memories for an NPC', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'p1',
      content: 'a',
      importance: 0.5,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'p2',
      content: 'b',
      importance: 0.3,
    });
    const memories = sys.recall('npc-1');
    expect(memories).toHaveLength(2);
  });

  it('filters by memory type', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'p1',
      content: 'a',
      importance: 0.5,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'p2',
      content: 'b',
      importance: 0.3,
    });
    const memories = sys.recall('npc-1', { memoryType: 'interaction' });
    expect(memories).toHaveLength(1);
    expect(memories[0]?.memoryType).toBe('interaction');
  });

  it('filters by emotional tag', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'p1',
      content: 'a',
      importance: 0.5,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'negative',
      subjectEntityId: 'p2',
      content: 'b',
      importance: 0.4,
    });
    const memories = sys.recall('npc-1', { emotionalTag: 'negative' });
    expect(memories).toHaveLength(1);
  });

  it('filters by subject entity', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'player-1',
      content: 'a',
      importance: 0.5,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'player-2',
      content: 'b',
      importance: 0.5,
    });
    const memories = sys.recallAbout('npc-1', 'player-1');
    expect(memories).toHaveLength(1);
  });

  it('limits results', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    for (let i = 0; i < 10; i++) {
      sys.record({
        npcId: 'npc-1',
        memoryType: 'observation',
        emotionalTag: 'neutral',
        subjectEntityId: 'x',
        content: 'entry-' + String(i),
        importance: 0.5,
      });
    }
    const memories = sys.recall('npc-1', { limit: 3 });
    expect(memories).toHaveLength(3);
  });

  it('returns empty for unknown NPC', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    expect(sys.recall('missing')).toHaveLength(0);
  });
});

describe('MemoryV2 — forget', () => {
  it('forgets a single memory', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const mem = sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'x',
      content: 'a',
      importance: 0.5,
    });
    expect(sys.forget(mem.memoryId)).toBe(true);
    expect(sys.count('npc-1')).toBe(0);
  });

  it('forgets all memories for an NPC', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'x',
      content: 'a',
      importance: 0.5,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'y',
      content: 'b',
      importance: 0.3,
    });
    expect(sys.forgetAll('npc-1')).toBe(2);
    expect(sys.count('npc-1')).toBe(0);
  });
});

describe('MemoryV2 — short-term capacity', () => {
  it('evicts oldest short-term memories when capacity exceeded', () => {
    const { deps } = makeDeps();
    const config: Partial<MemoryV2Config> = { shortTermCapacity: 3 };
    const sys = createNpcMemoryV2System(deps, config);
    for (let i = 0; i < 5; i++) {
      sys.record({
        npcId: 'npc-1',
        memoryType: 'observation',
        emotionalTag: 'neutral',
        subjectEntityId: 'x',
        content: 'entry-' + String(i),
        importance: 0.2,
      });
    }
    expect(sys.count('npc-1')).toBe(3);
  });

  it('does not evict long-term memories', () => {
    const { deps } = makeDeps();
    const config: Partial<MemoryV2Config> = { shortTermCapacity: 2 };
    const sys = createNpcMemoryV2System(deps, config);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'trauma',
      emotionalTag: 'negative',
      subjectEntityId: 'x',
      content: 'permanent',
      importance: 0.9,
    });
    for (let i = 0; i < 4; i++) {
      sys.record({
        npcId: 'npc-1',
        memoryType: 'observation',
        emotionalTag: 'neutral',
        subjectEntityId: 'x',
        content: 'short-' + String(i),
        importance: 0.1,
      });
    }
    const stats = sys.getStats('npc-1');
    expect(stats.longTermCount).toBe(1);
  });
});

describe('MemoryV2 — decay', () => {
  it('removes decayed short-term memories', () => {
    const { deps, setTime } = makeDeps(1_000_000);
    const halfLife = 100_000;
    const sys = createNpcMemoryV2System(deps, { decayHalfLifeUs: halfLife });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'x',
      content: 'old',
      importance: 0.01,
    });
    setTime(1_000_000 + halfLife * 20);
    const removed = sys.applyDecay('npc-1');
    expect(removed).toBe(1);
  });

  it('does not decay long-term memories', () => {
    const { deps, setTime } = makeDeps(1_000_000);
    const halfLife = 100_000;
    const sys = createNpcMemoryV2System(deps, { decayHalfLifeUs: halfLife });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'trauma',
      emotionalTag: 'negative',
      subjectEntityId: 'x',
      content: 'permanent',
      importance: 0.9,
    });
    setTime(1_000_000 + halfLife * 100);
    const removed = sys.applyDecay('npc-1');
    expect(removed).toBe(0);
    expect(sys.count('npc-1')).toBe(1);
  });

  it('computes decayed importance in recall', () => {
    const { deps, setTime } = makeDeps(1_000_000);
    const halfLife = 1_000_000;
    const sys = createNpcMemoryV2System(deps, {
      decayHalfLifeUs: halfLife,
      longTermThreshold: 0.95,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'x',
      content: 'fading',
      importance: 0.6,
    });
    setTime(1_000_000 + halfLife);
    const memories = sys.recall('npc-1');
    expect(memories[0]?.decayedImportance).toBeCloseTo(0.3, 1);
  });
});

describe('MemoryV2 — gossip (share)', () => {
  it('shares a memory between NPCs as a rumor', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const original = sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'negative',
      subjectEntityId: 'villain',
      content: 'saw theft',
      importance: 0.6,
    });
    const result = sys.shareMemory({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      memoryId: original.memoryId,
    });
    expect(result).toBeDefined();
    expect(result?.toNpcId).toBe('npc-2');
    const npc2Memories = sys.recall('npc-2');
    expect(npc2Memories).toHaveLength(1);
    expect(npc2Memories[0]?.memoryType).toBe('rumor');
    expect(npc2Memories[0]?.sourceNpcId).toBe('npc-1');
  });

  it('applies importance modifier to rumors', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const original = sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'x',
      content: 'test',
      importance: 0.5,
    });
    sys.shareMemory({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      memoryId: original.memoryId,
      importanceModifier: 0.5,
    });
    const memories = sys.recall('npc-2');
    expect(memories[0]?.importance).toBeCloseTo(0.25, 2);
  });

  it('returns undefined for unknown memory', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    expect(
      sys.shareMemory({ fromNpcId: 'npc-1', toNpcId: 'npc-2', memoryId: 'missing' }),
    ).toBeUndefined();
  });
});

describe('MemoryV2 — promote', () => {
  it('promotes short-term to long-term', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const mem = sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'x',
      content: 'test',
      importance: 0.3,
    });
    expect(mem.tier).toBe('short_term');
    expect(sys.promoteToLongTerm(mem.memoryId)).toBe(true);
    const retrieved = sys.getMemory(mem.memoryId);
    expect(retrieved?.tier).toBe('long_term');
  });

  it('returns false for already long-term', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const mem = sys.record({
      npcId: 'npc-1',
      memoryType: 'trauma',
      emotionalTag: 'negative',
      subjectEntityId: 'x',
      content: 'test',
      importance: 0.9,
    });
    expect(sys.promoteToLongTerm(mem.memoryId)).toBe(false);
  });
});

describe('MemoryV2 — stats', () => {
  it('returns empty stats for unknown NPC', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    const stats = sys.getStats('missing');
    expect(stats.totalMemories).toBe(0);
  });

  it('computes global stats', () => {
    const { deps } = makeDeps();
    const sys = createNpcMemoryV2System(deps);
    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'x',
      content: 'a',
      importance: 0.5,
    });
    sys.record({
      npcId: 'npc-2',
      memoryType: 'observation',
      emotionalTag: 'neutral',
      subjectEntityId: 'y',
      content: 'b',
      importance: 0.3,
    });
    const stats = sys.globalStats();
    expect(stats.totalMemories).toBe(2);
    expect(stats.averageImportance).toBeCloseTo(0.4, 1);
  });
});
