import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcMemoryState, NpcMemorySystemDeps } from '../npc-memory-system.js';
import {
  createNpcMemoryState,
  registerNpc,
  recordMemory,
  recallMemories,
  forgetMemory,
  applyDecay,
  getMemory,
  getMemoryProfile,
  listMemories,
} from '../npc-memory-system.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcMemorySystemDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'mem-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcMemorySystem - Registration', () => {
  let state: NpcMemoryState;

  beforeEach(() => {
    state = createNpcMemoryState(createMockDeps());
  });

  it('should register a new NPC successfully', () => {
    const result = registerNpc(state, 'npc-1');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate NPC', () => {
    registerNpc(state, 'npc-1');
    const result = registerNpc(state, 'npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should allow multiple distinct NPCs', () => {
    const r1 = registerNpc(state, 'npc-1');
    const r2 = registerNpc(state, 'npc-2');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});

// ============================================================================
// TESTS: RECORD MEMORY — FIELDS
// ============================================================================

describe('NpcMemorySystem - Record Memory fields', () => {
  let state: NpcMemoryState;

  beforeEach(() => {
    state = createNpcMemoryState(createMockDeps());
    registerNpc(state, 'npc-1');
  });

  it('should record a memory and return Memory object', () => {
    const result = recordMemory(
      state,
      'npc-1',
      'ENCOUNTER',
      'HIGH',
      'Met the merchant',
      null,
      'world-1',
    );
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.npcId).toBe('npc-1');
      expect(result.type).toBe('ENCOUNTER');
      expect(result.importance).toBe('HIGH');
      expect(result.summary).toBe('Met the merchant');
      expect(result.decayScore).toBe(1.0);
    }
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = recordMemory(state, 'unknown', 'TRADE', 'LOW', 'sold wheat', null, 'world-1');
    expect(result).toBe('npc-not-found');
  });

  it('should store relatedEntityId when provided', () => {
    const result = recordMemory(
      state,
      'npc-1',
      'COMBAT',
      'CRITICAL',
      'fought the dragon',
      'dragon-1',
      'world-2',
    );
    if (typeof result === 'object') {
      expect(result.relatedEntityId).toBe('dragon-1');
    }
  });
});

// ============================================================================
// TESTS: RECORD MEMORY — IDS
// ============================================================================

describe('NpcMemorySystem - Record Memory ids', () => {
  let state: NpcMemoryState;

  beforeEach(() => {
    state = createNpcMemoryState(createMockDeps());
    registerNpc(state, 'npc-1');
  });

  it('should store null relatedEntityId when not provided', () => {
    const result = recordMemory(
      state,
      'npc-1',
      'OBSERVATION',
      'LOW',
      'saw a sunset',
      null,
      'world-1',
    );
    if (typeof result === 'object') {
      expect(result.relatedEntityId).toBeNull();
    }
  });

  it('should generate unique memoryIds', () => {
    const m1 = recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'first', null, 'w1');
    const m2 = recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'second', null, 'w1');
    if (typeof m1 === 'object' && typeof m2 === 'object') {
      expect(m1.memoryId).not.toBe(m2.memoryId);
    }
  });
});

// ============================================================================
// TESTS: RECALL
// ============================================================================

describe('NpcMemorySystem - Recall Memories', () => {
  let state: NpcMemoryState;

  beforeEach(() => {
    state = createNpcMemoryState(createMockDeps());
    registerNpc(state, 'npc-1');
    recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'met the baker at market', null, 'w1');
    recordMemory(state, 'npc-1', 'TRADE', 'HIGH', 'traded bread at market', null, 'w1');
    recordMemory(state, 'npc-1', 'COMBAT', 'CRITICAL', 'fought the market thief', null, 'w1');
  });

  it('should recall memories matching query (case-insensitive)', () => {
    const result = recallMemories(state, 'npc-1', 'market', 10);
    if (typeof result === 'object') {
      expect(result.matches.length).toBe(3);
    }
  });

  it('should return empty matches for non-matching query', () => {
    const result = recallMemories(state, 'npc-1', 'dragon', 10);
    if (typeof result === 'object') {
      expect(result.matches.length).toBe(0);
    }
  });

  it('should sort by importance descending (CRITICAL first)', () => {
    const result = recallMemories(state, 'npc-1', 'market', 10);
    if (typeof result === 'object') {
      expect(result.matches[0]?.importance).toBe('CRITICAL');
      expect(result.matches[1]?.importance).toBe('HIGH');
      expect(result.matches[2]?.importance).toBe('LOW');
    }
  });

  it('should respect the limit parameter', () => {
    const result = recallMemories(state, 'npc-1', 'market', 2);
    if (typeof result === 'object') {
      expect(result.matches.length).toBe(2);
    }
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = recallMemories(state, 'ghost', 'market', 10);
    expect(result).toBe('npc-not-found');
  });

  it('should include recalledAt timestamp', () => {
    const result = recallMemories(state, 'npc-1', 'market', 10);
    if (typeof result === 'object') {
      expect(typeof result.recalledAt).toBe('bigint');
    }
  });
});

// ============================================================================
// TESTS: FORGET
// ============================================================================

describe('NpcMemorySystem - Forget Memory', () => {
  let state: NpcMemoryState;

  beforeEach(() => {
    state = createNpcMemoryState(createMockDeps());
    registerNpc(state, 'npc-1');
  });

  it('should forget a memory successfully', () => {
    const mem = recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'saw a cat', null, 'w1');
    if (typeof mem === 'object') {
      const result = forgetMemory(state, 'npc-1', mem.memoryId);
      expect(result.success).toBe(true);
    }
  });

  it('should remove memory from listMemories after forget', () => {
    const mem = recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'saw a cat', null, 'w1');
    if (typeof mem === 'object') {
      forgetMemory(state, 'npc-1', mem.memoryId);
      const list = listMemories(state, 'npc-1');
      expect(list.length).toBe(0);
    }
  });

  it('should return npc-not-found when NPC is not registered', () => {
    const result = forgetMemory(state, 'ghost', 'any-id');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return memory-not-found for non-existent memoryId', () => {
    const result = forgetMemory(state, 'npc-1', 'bad-id');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('memory-not-found');
  });
});

// ============================================================================
// TESTS: DECAY
// ============================================================================

describe('NpcMemorySystem - Apply Decay', () => {
  let state: NpcMemoryState;

  beforeEach(() => {
    state = createNpcMemoryState(createMockDeps());
    registerNpc(state, 'npc-1');
  });

  it('should reduce decayScore by the given amount', () => {
    const mem = recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'saw a dog', null, 'w1');
    applyDecay(state, 'npc-1', 0.3);
    if (typeof mem === 'object') {
      const updated = getMemory(state, 'npc-1', mem.memoryId);
      expect(updated?.decayScore).toBeCloseTo(0.7);
    }
  });

  it('should remove LOW memories when decayScore reaches 0', () => {
    recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'saw a bird', null, 'w1');
    const result = applyDecay(state, 'npc-1', 1.0);
    if (result.success) expect(result.decayed).toBe(1);
    expect(listMemories(state, 'npc-1').length).toBe(0);
  });

  it('should clamp CRITICAL memories at 0.01 minimum (immune to full decay)', () => {
    const mem = recordMemory(
      state,
      'npc-1',
      'COMBAT',
      'CRITICAL',
      'near-death experience',
      null,
      'w1',
    );
    applyDecay(state, 'npc-1', 2.0);
    if (typeof mem === 'object') {
      const updated = getMemory(state, 'npc-1', mem.memoryId);
      expect(updated?.decayScore).toBeCloseTo(0.01);
      expect(updated).toBeDefined();
    }
  });

  it('should return count of forgotten memories', () => {
    recordMemory(state, 'npc-1', 'TRADE', 'LOW', 'small trade', null, 'w1');
    recordMemory(state, 'npc-1', 'TRADE', 'LOW', 'another trade', null, 'w1');
    const result = applyDecay(state, 'npc-1', 1.0);
    if (result.success) expect(result.decayed).toBe(2);
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = applyDecay(state, 'ghost', 0.5);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });
});

// ============================================================================
// TESTS: PROFILE AND LIST
// ============================================================================

describe('NpcMemorySystem - Profile and List', () => {
  let state: NpcMemoryState;

  beforeEach(() => {
    state = createNpcMemoryState(createMockDeps());
    registerNpc(state, 'npc-1');
    recordMemory(state, 'npc-1', 'ENCOUNTER', 'LOW', 'event 1', null, 'w1');
    recordMemory(state, 'npc-1', 'TRADE', 'HIGH', 'event 2', null, 'w1');
    recordMemory(state, 'npc-1', 'COMBAT', 'CRITICAL', 'event 3', null, 'w1');
  });

  it('should return correct totalMemories in profile', () => {
    const profile = getMemoryProfile(state, 'npc-1');
    expect(profile?.totalMemories).toBe(3);
  });

  it('should count byType correctly', () => {
    const profile = getMemoryProfile(state, 'npc-1');
    expect(profile?.byType.ENCOUNTER).toBe(1);
    expect(profile?.byType.TRADE).toBe(1);
    expect(profile?.byType.COMBAT).toBe(1);
  });

  it('should count byImportance correctly', () => {
    const profile = getMemoryProfile(state, 'npc-1');
    expect(profile?.byImportance.LOW).toBe(1);
    expect(profile?.byImportance.HIGH).toBe(1);
    expect(profile?.byImportance.CRITICAL).toBe(1);
  });

  it('should return undefined profile for unregistered NPC', () => {
    expect(getMemoryProfile(state, 'ghost')).toBeUndefined();
  });

  it('should list all memories when no type filter', () => {
    const list = listMemories(state, 'npc-1');
    expect(list.length).toBe(3);
  });

  it('should filter listMemories by type', () => {
    const list = listMemories(state, 'npc-1', 'TRADE');
    expect(list.length).toBe(1);
    expect(list[0]?.type).toBe('TRADE');
  });

  it('should return empty list for NPC with no memories', () => {
    registerNpc(state, 'npc-2');
    const list = listMemories(state, 'npc-2');
    expect(list.length).toBe(0);
  });

  it('should getMemory by npcId and memoryId', () => {
    const mem = recordMemory(state, 'npc-1', 'DIALOGUE', 'MEDIUM', 'spoke with elder', null, 'w1');
    if (typeof mem === 'object') {
      const found = getMemory(state, 'npc-1', mem.memoryId);
      expect(found?.memoryId).toBe(mem.memoryId);
    }
  });

  it('should return undefined getMemory for wrong npcId', () => {
    registerNpc(state, 'npc-2');
    const mem = recordMemory(state, 'npc-1', 'DIALOGUE', 'MEDIUM', 'spoke with elder', null, 'w1');
    if (typeof mem === 'object') {
      const found = getMemory(state, 'npc-2', mem.memoryId);
      expect(found).toBeUndefined();
    }
  });
});
