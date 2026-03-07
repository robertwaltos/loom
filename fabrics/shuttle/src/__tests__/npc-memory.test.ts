import { describe, it, expect } from 'vitest';
import { createNpcMemoryService } from '../npc-memory.js';
import type {
  NpcMemoryService,
  NpcMemoryDeps,
  RecordMemoryParams,
} from '../npc-memory.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createTestService(): { service: NpcMemoryService; advanceTime: (us: number) => void } {
  let time = 1_000_000;
  let idCounter = 0;
  const deps: NpcMemoryDeps = {
    clock: { nowMicroseconds: () => time },
    idGenerator: { next: () => 'mem-' + String(++idCounter) },
  };
  return {
    service: createNpcMemoryService(deps),
    advanceTime: (us: number) => { time += us; },
  };
}

function memory(overrides?: Partial<RecordMemoryParams>): RecordMemoryParams {
  return {
    npcId: 'npc-1',
    worldId: 'world-1',
    category: 'social',
    subject: 'player-1',
    content: 'Traded goods at market',
    salience: 0.5,
    ...overrides,
  };
}

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

// ─── Recording ─────────────────────────────────────────────────────

describe('NPC memory recording', () => {
  it('records a memory entry', () => {
    const { service } = createTestService();
    const entry = service.record(memory());
    expect(entry.memoryId).toBe('mem-1');
    expect(entry.npcId).toBe('npc-1');
    expect(entry.category).toBe('social');
  });

  it('clamps salience to [0, 1]', () => {
    const { service } = createTestService();
    const low = service.record(memory({ salience: -0.5 }));
    const high = service.record(memory({ salience: 1.5 }));
    expect(low.salience).toBe(0);
    expect(high.salience).toBe(1);
  });

  it('assigns unique IDs', () => {
    const { service } = createTestService();
    const a = service.record(memory());
    const b = service.record(memory());
    expect(a.memoryId).not.toBe(b.memoryId);
  });

  it('counts total memories', () => {
    const { service } = createTestService();
    service.record(memory({ npcId: 'npc-1' }));
    service.record(memory({ npcId: 'npc-2' }));
    expect(service.count()).toBe(2);
  });

  it('counts per NPC', () => {
    const { service } = createTestService();
    service.record(memory({ npcId: 'npc-1' }));
    service.record(memory({ npcId: 'npc-1' }));
    service.record(memory({ npcId: 'npc-2' }));
    expect(service.countForNpc('npc-1')).toBe(2);
    expect(service.countForNpc('npc-2')).toBe(1);
  });
});

// ─── Recall ─────────────────────────────────────────────────────────

describe('NPC memory recall', () => {
  it('returns memories for NPC in recency order', () => {
    const { service, advanceTime } = createTestService();
    service.record(memory({ content: 'first' }));
    advanceTime(1000);
    service.record(memory({ content: 'second' }));
    const results = service.recall('npc-1');
    expect(results).toHaveLength(2);
    expect(results[0]?.content).toBe('second');
    expect(results[1]?.content).toBe('first');
  });

  it('returns empty for unknown NPC', () => {
    const { service } = createTestService();
    expect(service.recall('unknown')).toHaveLength(0);
  });

  it('filters by category', () => {
    const { service } = createTestService();
    service.record(memory({ category: 'social' }));
    service.record(memory({ category: 'economic' }));
    const results = service.recall('npc-1', { category: 'economic' });
    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe('economic');
  });

  it('filters by world', () => {
    const { service } = createTestService();
    service.record(memory({ worldId: 'world-1' }));
    service.record(memory({ worldId: 'world-2' }));
    const results = service.recall('npc-1', { worldId: 'world-2' });
    expect(results).toHaveLength(1);
    expect(results[0]?.worldId).toBe('world-2');
  });

  it('filters by minimum salience', () => {
    const { service } = createTestService();
    service.record(memory({ salience: 0.2 }));
    service.record(memory({ salience: 0.8 }));
    const results = service.recall('npc-1', { minSalience: 0.5 });
    expect(results).toHaveLength(1);
    expect(results[0]?.salience).toBe(0.8);
  });

  it('applies limit', () => {
    const { service, advanceTime } = createTestService();
    for (let i = 0; i < 5; i++) {
      service.record(memory());
      advanceTime(1000);
    }
    const results = service.recall('npc-1', { limit: 3 });
    expect(results).toHaveLength(3);
  });
});

// ─── Stats ──────────────────────────────────────────────────────────

describe('NPC memory stats', () => {
  it('returns empty stats for unknown NPC', () => {
    const { service } = createTestService();
    const stats = service.getStats('unknown');
    expect(stats.totalEntries).toBe(0);
    expect(stats.oldestAt).toBeNull();
    expect(stats.newestAt).toBeNull();
  });

  it('computes category breakdown', () => {
    const { service } = createTestService();
    service.record(memory({ category: 'social' }));
    service.record(memory({ category: 'social' }));
    service.record(memory({ category: 'economic' }));
    const stats = service.getStats('npc-1');
    expect(stats.totalEntries).toBe(3);
    expect(stats.categoryBreakdown.social).toBe(2);
    expect(stats.categoryBreakdown.economic).toBe(1);
    expect(stats.categoryBreakdown.conflict).toBe(0);
  });

  it('tracks oldest and newest', () => {
    const { service, advanceTime } = createTestService();
    service.record(memory());
    advanceTime(5000);
    service.record(memory());
    const stats = service.getStats('npc-1');
    expect(stats.oldestAt).toBe(1_000_000);
    expect(stats.newestAt).toBe(1_005_000);
  });
});

// ─── Forget ─────────────────────────────────────────────────────────

describe('NPC memory forget', () => {
  it('forgets a specific memory', () => {
    const { service } = createTestService();
    const entry = service.record(memory());
    const result = service.forget(entry.memoryId);
    expect(result).toBe(true);
    expect(service.count()).toBe(0);
  });

  it('returns false for unknown memory', () => {
    const { service } = createTestService();
    expect(service.forget('unknown')).toBe(false);
  });

  it('forgets all memories for NPC', () => {
    const { service } = createTestService();
    service.record(memory({ npcId: 'npc-1' }));
    service.record(memory({ npcId: 'npc-1' }));
    service.record(memory({ npcId: 'npc-2' }));
    const removed = service.forgetAll('npc-1');
    expect(removed).toBe(2);
    expect(service.countForNpc('npc-1')).toBe(0);
    expect(service.countForNpc('npc-2')).toBe(1);
  });

  it('getMemory returns undefined after forget', () => {
    const { service } = createTestService();
    const entry = service.record(memory());
    service.forget(entry.memoryId);
    expect(service.getMemory(entry.memoryId)).toBeUndefined();
  });
});

// ─── Prune by Memory Model ─────────────────────────────────────────

describe('NPC memory prune by model', () => {
  it('prune with none removes all', () => {
    const { service } = createTestService();
    service.record(memory());
    service.record(memory());
    const removed = service.prune('npc-1', 'none');
    expect(removed).toBe(2);
    expect(service.countForNpc('npc-1')).toBe(0);
  });

  it('prune with permanent removes nothing', () => {
    const { service } = createTestService();
    service.record(memory());
    const removed = service.prune('npc-1', 'permanent');
    expect(removed).toBe(0);
    expect(service.countForNpc('npc-1')).toBe(1);
  });

  it('prune with permanent_universe removes nothing', () => {
    const { service } = createTestService();
    service.record(memory());
    const removed = service.prune('npc-1', 'permanent_universe');
    expect(removed).toBe(0);
  });

  it('prune with rolling_90d removes old entries', () => {
    const { service, advanceTime } = createTestService();
    service.record(memory({ content: 'old' }));
    advanceTime(91 * US_PER_DAY);
    service.record(memory({ content: 'recent' }));
    const removed = service.prune('npc-1', 'rolling_90d');
    expect(removed).toBe(1);
    expect(service.countForNpc('npc-1')).toBe(1);
    const remaining = service.recall('npc-1');
    expect(remaining[0]?.content).toBe('recent');
  });

  it('prune with rolling_90d keeps entries within window', () => {
    const { service, advanceTime } = createTestService();
    service.record(memory());
    advanceTime(89 * US_PER_DAY);
    const removed = service.prune('npc-1', 'rolling_90d');
    expect(removed).toBe(0);
    expect(service.countForNpc('npc-1')).toBe(1);
  });
});

// ─── Get Memory ─────────────────────────────────────────────────────

describe('NPC memory retrieval', () => {
  it('retrieves by ID', () => {
    const { service } = createTestService();
    const entry = service.record(memory());
    const found = service.getMemory(entry.memoryId);
    expect(found).toBeDefined();
    expect(found?.content).toBe('Traded goods at market');
  });

  it('returns undefined for unknown ID', () => {
    const { service } = createTestService();
    expect(service.getMemory('unknown')).toBeUndefined();
  });
});
