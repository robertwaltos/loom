import { describe, it, expect } from 'vitest';
import {
  createNpcMemoryService,
  DEFAULT_DECAY_CONFIG,
  MAX_MEMORIES_PER_NPC,
  IMPORTANCE_THRESHOLDS,
} from '../npc-memory.js';
import type {
  NpcMemoryService,
  MemoryDeps,
  StoreMemoryParams,
  MemoryType,
  MemoryImportance,
} from '../npc-memory.js';

// ── Test Helpers ─────────────────────────────────────────────────

function makeDeps(): { deps: MemoryDeps; advanceTime: (us: number) => void } {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'mem-' + String(++idCounter) },
    },
    advanceTime: (us: number) => {
      time += us;
    },
  };
}

function createTestService(): {
  service: NpcMemoryService;
  advanceTime: (us: number) => void;
} {
  const { deps, advanceTime } = makeDeps();
  return { service: createNpcMemoryService(deps), advanceTime };
}

function defaultParams(overrides?: Partial<StoreMemoryParams>): StoreMemoryParams {
  return {
    type: 'INTERACTION',
    entityId: 'entity-1',
    content: 'Traded goods at market',
    importance: 'normal',
    ...overrides,
  };
}

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

// ── Store Memory ─────────────────────────────────────────────────

describe('NPC Memory — storeMemory', () => {
  it('stores a memory and returns a record', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    expect(record.memoryId).toBe('mem-1');
    expect(record.npcId).toBe('npc-1');
    expect(record.type).toBe('INTERACTION');
    expect(record.entityId).toBe('entity-1');
    expect(record.content).toBe('Traded goods at market');
    expect(record.importance).toBe('normal');
    expect(record.forgotten).toBe(false);
    expect(record.reinforcements).toBe(0);
  });

  it('assigns strength based on importance level', () => {
    const { service } = createTestService();
    const trivial = service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    const normal = service.storeMemory('npc-1', defaultParams({ importance: 'normal' }));
    const important = service.storeMemory('npc-1', defaultParams({ importance: 'important' }));
    const critical = service.storeMemory('npc-1', defaultParams({ importance: 'critical' }));
    expect(trivial.strength).toBe(IMPORTANCE_THRESHOLDS.trivial);
    expect(normal.strength).toBe(IMPORTANCE_THRESHOLDS.normal);
    expect(important.strength).toBe(IMPORTANCE_THRESHOLDS.important);
    expect(critical.strength).toBe(IMPORTANCE_THRESHOLDS.critical);
  });

  it('assigns unique IDs to each memory', () => {
    const { service } = createTestService();
    const a = service.storeMemory('npc-1', defaultParams());
    const b = service.storeMemory('npc-1', defaultParams());
    expect(a.memoryId).not.toBe(b.memoryId);
  });

  it('stores optional location and metadata', () => {
    const { service } = createTestService();
    const record = service.storeMemory(
      'npc-1',
      defaultParams({ location: 'market-square', metadata: { mood: 'happy' } }),
    );
    expect(record.location).toBe('market-square');
    expect(record.metadata).toEqual({ mood: 'happy' });
  });

  it('defaults location to null and metadata to empty', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    expect(record.location).toBeNull();
    expect(record.metadata).toEqual({});
  });

  it('stores all five memory types', () => {
    const { service } = createTestService();
    const types: MemoryType[] = [
      'INTERACTION',
      'OBSERVATION',
      'RUMOR',
      'EXPERIENCE',
      'RELATIONSHIP',
    ];
    for (const type of types) {
      const record = service.storeMemory('npc-1', defaultParams({ type }));
      expect(record.type).toBe(type);
    }
  });
});

// ── Recall ───────────────────────────────────────────────────────

describe('NPC Memory — recall', () => {
  it('recalls all memories for an NPC sorted by strength', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ importance: 'trivial', content: 'low' }));
    service.storeMemory('npc-1', defaultParams({ importance: 'critical', content: 'high' }));
    const results = service.recall('npc-1', {});
    expect(results).toHaveLength(2);
    const first = results[0];
    const second = results[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first?.content).toBe('high');
    expect(second?.content).toBe('low');
  });

  it('returns empty for unknown NPC', () => {
    const { service } = createTestService();
    expect(service.recall('unknown', {})).toHaveLength(0);
  });

  it('filters by type', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ type: 'INTERACTION' }));
    service.storeMemory('npc-1', defaultParams({ type: 'RUMOR' }));
    const results = service.recall('npc-1', { type: 'RUMOR' });
    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe('RUMOR');
  });

  it('filters by entityId', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ entityId: 'e-1' }));
    service.storeMemory('npc-1', defaultParams({ entityId: 'e-2' }));
    const results = service.recall('npc-1', { entityId: 'e-2' });
    expect(results).toHaveLength(1);
    expect(results[0]?.entityId).toBe('e-2');
  });

  it('filters by importance', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    service.storeMemory('npc-1', defaultParams({ importance: 'critical' }));
    const results = service.recall('npc-1', { importance: 'critical' });
    expect(results).toHaveLength(1);
    expect(results[0]?.importance).toBe('critical');
  });

  it('filters by minimum strength', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    service.storeMemory('npc-1', defaultParams({ importance: 'critical' }));
    const results = service.recall('npc-1', { minStrength: 0.8 });
    expect(results).toHaveLength(1);
    expect(results[0]?.importance).toBe('critical');
  });

  it('applies limit', () => {
    const { service } = createTestService();
    for (let i = 0; i < 5; i++) {
      service.storeMemory('npc-1', defaultParams());
    }
    const results = service.recall('npc-1', { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('excludes forgotten memories by default', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    service.forget('npc-1', record.memoryId);
    const results = service.recall('npc-1', {});
    expect(results).toHaveLength(0);
  });

  it('includes forgotten memories when requested', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    service.forget('npc-1', record.memoryId);
    const results = service.recall('npc-1', { includeForgotten: true });
    expect(results).toHaveLength(1);
    expect(results[0]?.forgotten).toBe(true);
  });
});

// ── Recall by Entity ─────────────────────────────────────────────

describe('NPC Memory — recallByEntity', () => {
  it('returns only memories about a specific entity', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ entityId: 'player-1' }));
    service.storeMemory('npc-1', defaultParams({ entityId: 'player-2' }));
    service.storeMemory('npc-1', defaultParams({ entityId: 'player-1' }));
    const results = service.recallByEntity('npc-1', 'player-1');
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.entityId).toBe('player-1');
    }
  });

  it('returns empty for unknown entity', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams());
    const results = service.recallByEntity('npc-1', 'unknown');
    expect(results).toHaveLength(0);
  });
});

// ── Recall by Type ───────────────────────────────────────────────

describe('NPC Memory — recallByType', () => {
  it('returns only memories of a specific type', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ type: 'OBSERVATION' }));
    service.storeMemory('npc-1', defaultParams({ type: 'RUMOR' }));
    service.storeMemory('npc-1', defaultParams({ type: 'OBSERVATION' }));
    const results = service.recallByType('npc-1', 'OBSERVATION');
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.type).toBe('OBSERVATION');
    }
  });
});

// ── Forget ───────────────────────────────────────────────────────

describe('NPC Memory — forget', () => {
  it('marks a memory as forgotten', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    const result = service.forget('npc-1', record.memoryId);
    expect(result).toBe(true);
  });

  it('returns false for unknown memory', () => {
    const { service } = createTestService();
    expect(service.forget('npc-1', 'nonexistent')).toBe(false);
  });

  it('returns false for wrong NPC', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    expect(service.forget('npc-2', record.memoryId)).toBe(false);
  });

  it('returns false if already forgotten', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    service.forget('npc-1', record.memoryId);
    expect(service.forget('npc-1', record.memoryId)).toBe(false);
  });

  it('reduces active memory count', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    service.storeMemory('npc-1', defaultParams());
    expect(service.getNpcMemoryCount('npc-1')).toBe(2);
    service.forget('npc-1', record.memoryId);
    expect(service.getNpcMemoryCount('npc-1')).toBe(1);
  });
});

// ── Reinforce ────────────────────────────────────────────────────

describe('NPC Memory — reinforceMemory', () => {
  it('increases memory strength', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    const result = service.reinforceMemory('npc-1', record.memoryId);
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.strength).toBeGreaterThan(record.strength);
      expect(result.reinforcements).toBe(1);
    }
  });

  it('caps strength at 1.0', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams({ importance: 'critical' }));
    const result = service.reinforceMemory('npc-1', record.memoryId);
    if (typeof result !== 'string') {
      expect(result.strength).toBeLessThanOrEqual(1.0);
    }
  });

  it('returns error for unknown memory', () => {
    const { service } = createTestService();
    expect(service.reinforceMemory('npc-1', 'missing')).toBe('MEMORY_NOT_FOUND');
  });

  it('returns error for forgotten memory', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    service.forget('npc-1', record.memoryId);
    expect(service.reinforceMemory('npc-1', record.memoryId)).toBe('MEMORY_FORGOTTEN');
  });

  it('promotes importance after enough reinforcements', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    let result = record;
    for (let i = 0; i < 5; i++) {
      const r = service.reinforceMemory('npc-1', record.memoryId);
      if (typeof r !== 'string') result = r;
    }
    expect(result.importance).toBe('normal');
  });

  it('returns error for wrong NPC', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    expect(service.reinforceMemory('npc-2', record.memoryId)).toBe('MEMORY_NOT_FOUND');
  });
});

// ── Apply Decay ──────────────────────────────────────────────────

describe('NPC Memory — applyDecay', () => {
  it('decays old trivial memories to forgotten', () => {
    const { service, advanceTime } = createTestService();
    service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    advanceTime(30 * US_PER_DAY);
    const forgotten = service.applyDecay('npc-1');
    expect(forgotten).toBe(1);
    expect(service.getNpcMemoryCount('npc-1')).toBe(0);
  });

  it('preserves critical memories longer', () => {
    const { service, advanceTime } = createTestService();
    service.storeMemory('npc-1', defaultParams({ importance: 'critical' }));
    advanceTime(30 * US_PER_DAY);
    const forgotten = service.applyDecay('npc-1');
    expect(forgotten).toBe(0);
    expect(service.getNpcMemoryCount('npc-1')).toBe(1);
  });

  it('returns 0 for unknown NPC', () => {
    const { service } = createTestService();
    expect(service.applyDecay('unknown')).toBe(0);
  });

  it('does not decay already forgotten memories', () => {
    const { service, advanceTime } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    service.forget('npc-1', record.memoryId);
    advanceTime(100 * US_PER_DAY);
    expect(service.applyDecay('npc-1')).toBe(0);
  });

  it('returns count of newly forgotten memories', () => {
    const { service, advanceTime } = createTestService();
    service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    service.storeMemory('npc-1', defaultParams({ importance: 'trivial' }));
    service.storeMemory('npc-1', defaultParams({ importance: 'critical' }));
    advanceTime(30 * US_PER_DAY);
    const forgotten = service.applyDecay('npc-1');
    expect(forgotten).toBe(2);
  });
});

// ── Relationship Summary ─────────────────────────────────────────

describe('NPC Memory — getRelationshipSummary', () => {
  it('summarizes memories about a specific entity', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ entityId: 'player-1', type: 'INTERACTION' }));
    service.storeMemory('npc-1', defaultParams({ entityId: 'player-1', type: 'RUMOR' }));
    service.storeMemory('npc-1', defaultParams({ entityId: 'player-1', type: 'OBSERVATION' }));
    const summary = service.getRelationshipSummary('npc-1', 'player-1');
    expect(summary.totalMemories).toBe(3);
    expect(summary.positiveCount).toBe(1);
    expect(summary.negativeCount).toBe(1);
    expect(summary.neutralCount).toBe(1);
    expect(summary.npcId).toBe('npc-1');
    expect(summary.entityId).toBe('player-1');
  });

  it('returns empty summary for unknown NPC', () => {
    const { service } = createTestService();
    const summary = service.getRelationshipSummary('unknown', 'entity-1');
    expect(summary.totalMemories).toBe(0);
    expect(summary.strongestMemory).toBeNull();
    expect(summary.mostRecentMemory).toBeNull();
  });

  it('identifies strongest and most recent memories', () => {
    const { service, advanceTime } = createTestService();
    service.storeMemory(
      'npc-1',
      defaultParams({ entityId: 'e-1', importance: 'trivial', content: 'weak' }),
    );
    advanceTime(1000);
    service.storeMemory(
      'npc-1',
      defaultParams({ entityId: 'e-1', importance: 'critical', content: 'strong' }),
    );
    advanceTime(1000);
    service.storeMemory(
      'npc-1',
      defaultParams({ entityId: 'e-1', importance: 'normal', content: 'recent' }),
    );
    const summary = service.getRelationshipSummary('npc-1', 'e-1');
    expect(summary.strongestMemory?.content).toBe('strong');
    expect(summary.mostRecentMemory?.content).toBe('recent');
  });
});

// ── Memory Count ─────────────────────────────────────────────────

describe('NPC Memory — getNpcMemoryCount', () => {
  it('returns 0 for unknown NPC', () => {
    const { service } = createTestService();
    expect(service.getNpcMemoryCount('unknown')).toBe(0);
  });

  it('counts only active (non-forgotten) memories', () => {
    const { service } = createTestService();
    const a = service.storeMemory('npc-1', defaultParams());
    service.storeMemory('npc-1', defaultParams());
    service.forget('npc-1', a.memoryId);
    expect(service.getNpcMemoryCount('npc-1')).toBe(1);
  });
});

// ── Stats ────────────────────────────────────────────────────────

describe('NPC Memory — getStats', () => {
  it('returns empty stats when no memories exist', () => {
    const { service } = createTestService();
    const stats = service.getStats();
    expect(stats.totalMemories).toBe(0);
    expect(stats.totalNpcs).toBe(0);
    expect(stats.totalForgotten).toBe(0);
    expect(stats.averageStrength).toBe(0);
  });

  it('computes aggregate statistics', () => {
    const { service } = createTestService();
    service.storeMemory('npc-1', defaultParams({ importance: 'trivial', type: 'INTERACTION' }));
    service.storeMemory('npc-1', defaultParams({ importance: 'critical', type: 'RUMOR' }));
    service.storeMemory('npc-2', defaultParams({ importance: 'normal', type: 'OBSERVATION' }));
    const stats = service.getStats();
    expect(stats.totalMemories).toBe(3);
    expect(stats.totalNpcs).toBe(2);
    expect(stats.totalForgotten).toBe(0);
    expect(stats.averageStrength).toBeGreaterThan(0);
    expect(stats.importanceBreakdown.trivial).toBe(1);
    expect(stats.importanceBreakdown.critical).toBe(1);
    expect(stats.importanceBreakdown.normal).toBe(1);
    expect(stats.typeBreakdown.INTERACTION).toBe(1);
    expect(stats.typeBreakdown.RUMOR).toBe(1);
    expect(stats.typeBreakdown.OBSERVATION).toBe(1);
  });

  it('tracks forgotten count', () => {
    const { service } = createTestService();
    const record = service.storeMemory('npc-1', defaultParams());
    service.forget('npc-1', record.memoryId);
    const stats = service.getStats();
    expect(stats.totalForgotten).toBe(1);
  });
});

// ── Constants ────────────────────────────────────────────────────

describe('NPC Memory — constants', () => {
  it('exports DEFAULT_DECAY_CONFIG', () => {
    expect(DEFAULT_DECAY_CONFIG.decayRatePerDay).toBe(0.05);
    expect(DEFAULT_DECAY_CONFIG.minimumStrength).toBe(0.01);
  });

  it('exports MAX_MEMORIES_PER_NPC', () => {
    expect(MAX_MEMORIES_PER_NPC).toBe(1000);
  });

  it('exports IMPORTANCE_THRESHOLDS', () => {
    expect(IMPORTANCE_THRESHOLDS.trivial).toBe(0.25);
    expect(IMPORTANCE_THRESHOLDS.normal).toBe(0.5);
    expect(IMPORTANCE_THRESHOLDS.important).toBe(0.75);
    expect(IMPORTANCE_THRESHOLDS.critical).toBe(1.0);
  });
});
