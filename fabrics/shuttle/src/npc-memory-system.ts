/**
 * NPC Memory System - Episodic memory with recall and decay for AI-driven NPCs.
 *
 * Each NPC accumulates typed memories (encounters, trades, combat, dialogue, observations).
 * Memories carry an importance tier and a decayScore that decrements over time.
 * CRITICAL memories resist full decay — they floor at 0.01 minimum.
 *
 * Recall is scored by importance tier (CRITICAL > HIGH > MEDIUM > LOW) then
 * by decayScore descending, allowing recently reinforced memories to surface first.
 *
 * "The Shuttle remembers, so the agents can dream."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcMemorySystemClock = {
  now(): bigint;
};

export type NpcMemorySystemIdGen = {
  generate(): string;
};

export type NpcMemorySystemLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcMemorySystemDeps = {
  readonly clock: NpcMemorySystemClock;
  readonly idGen: NpcMemorySystemIdGen;
  readonly logger: NpcMemorySystemLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type MemoryId = string;

export type MemoryType = 'ENCOUNTER' | 'TRADE' | 'COMBAT' | 'DIALOGUE' | 'OBSERVATION';

export type MemoryImportance = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MemoryError =
  | 'npc-not-found'
  | 'memory-not-found'
  | 'invalid-importance'
  | 'already-registered';

export type Memory = {
  readonly memoryId: MemoryId;
  readonly npcId: NpcId;
  readonly type: MemoryType;
  readonly importance: MemoryImportance;
  readonly summary: string;
  readonly relatedEntityId: string | null;
  readonly worldId: string;
  readonly createdAt: bigint;
  decayScore: number; // 1.0 = fresh; decrements over time; min 0 (or 0.01 for CRITICAL)
};

export type MemoryRecall = {
  readonly query: string;
  readonly matches: ReadonlyArray<Memory>;
  readonly recalledAt: bigint;
};

export type NpcMemoryProfile = {
  readonly npcId: NpcId;
  readonly totalMemories: number;
  readonly byType: Record<MemoryType, number>;
  readonly byImportance: Record<MemoryImportance, number>;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcMemoryState = {
  readonly deps: NpcMemorySystemDeps;
  readonly npcs: Set<NpcId>;
  readonly memories: Map<MemoryId, Memory>;
  readonly npcMemoryIndex: Map<NpcId, Set<MemoryId>>;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const IMPORTANCE_ORDER: Record<MemoryImportance, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const CRITICAL_DECAY_FLOOR = 0.01;

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcMemoryState(deps: NpcMemorySystemDeps): NpcMemoryState {
  return {
    deps,
    npcs: new Set(),
    memories: new Map(),
    npcMemoryIndex: new Map(),
  };
}

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerNpc(
  state: NpcMemoryState,
  npcId: NpcId,
): { success: true } | { success: false; error: MemoryError } {
  if (state.npcs.has(npcId)) {
    return { success: false, error: 'already-registered' };
  }
  state.npcs.add(npcId);
  state.npcMemoryIndex.set(npcId, new Set());
  state.deps.logger.info('npc-memory-system: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// RECORD MEMORY
// ============================================================================

export function recordMemory(
  state: NpcMemoryState,
  npcId: NpcId,
  type: MemoryType,
  importance: MemoryImportance,
  summary: string,
  relatedEntityId: string | null,
  worldId: string,
): Memory | MemoryError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';
  const memoryId = state.deps.idGen.generate();
  const memory: Memory = {
    memoryId,
    npcId,
    type,
    importance,
    summary,
    relatedEntityId,
    worldId,
    createdAt: state.deps.clock.now(),
    decayScore: 1.0,
  };
  state.memories.set(memoryId, memory);
  const index = state.npcMemoryIndex.get(npcId);
  if (index !== undefined) index.add(memoryId);
  state.deps.logger.info('npc-memory-system: recorded ' + type + ' memory for ' + npcId);
  return memory;
}

// ============================================================================
// RECALL
// ============================================================================

export function recallMemories(
  state: NpcMemoryState,
  npcId: NpcId,
  query: string,
  limit: number,
): MemoryRecall | MemoryError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';
  const lowerQuery = query.toLowerCase();
  const index = state.npcMemoryIndex.get(npcId) ?? new Set<MemoryId>();
  const matches = collectMatchingMemories(state, index, lowerQuery);
  matches.sort(compareByImportanceThenDecay);
  return {
    query,
    matches: matches.slice(0, limit),
    recalledAt: state.deps.clock.now(),
  };
}

function collectMatchingMemories(
  state: NpcMemoryState,
  index: Set<MemoryId>,
  lowerQuery: string,
): Memory[] {
  const matches: Memory[] = [];
  for (const id of index) {
    const memory = state.memories.get(id);
    if (memory === undefined) continue;
    if (memory.summary.toLowerCase().includes(lowerQuery)) {
      matches.push(memory);
    }
  }
  return matches;
}

function compareByImportanceThenDecay(a: Memory, b: Memory): number {
  const importanceDiff = IMPORTANCE_ORDER[b.importance] - IMPORTANCE_ORDER[a.importance];
  if (importanceDiff !== 0) return importanceDiff;
  return b.decayScore - a.decayScore;
}

// ============================================================================
// FORGET
// ============================================================================

export function forgetMemory(
  state: NpcMemoryState,
  npcId: NpcId,
  memoryId: MemoryId,
): { success: true } | { success: false; error: MemoryError } {
  if (!state.npcs.has(npcId)) return { success: false, error: 'npc-not-found' };
  const memory = state.memories.get(memoryId);
  if (memory === undefined || memory.npcId !== npcId) {
    return { success: false, error: 'memory-not-found' };
  }
  state.memories.delete(memoryId);
  state.npcMemoryIndex.get(npcId)?.delete(memoryId);
  return { success: true };
}

// ============================================================================
// DECAY
// ============================================================================

export function applyDecay(
  state: NpcMemoryState,
  npcId: NpcId,
  decayAmount: number,
): { success: true; decayed: number } | { success: false; error: MemoryError } {
  if (!state.npcs.has(npcId)) return { success: false, error: 'npc-not-found' };
  const index = state.npcMemoryIndex.get(npcId) ?? new Set<MemoryId>();
  let forgotten = 0;
  const toRemove: MemoryId[] = [];
  for (const id of index) {
    const memory = state.memories.get(id);
    if (memory === undefined) continue;
    const floor = memory.importance === 'CRITICAL' ? CRITICAL_DECAY_FLOOR : 0;
    memory.decayScore = Math.max(floor, memory.decayScore - decayAmount);
    if (memory.decayScore <= 0) {
      toRemove.push(id);
      forgotten++;
    }
  }
  for (const id of toRemove) {
    state.memories.delete(id);
    index.delete(id);
  }
  return { success: true, decayed: forgotten };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getMemory(
  state: NpcMemoryState,
  npcId: NpcId,
  memoryId: MemoryId,
): Memory | undefined {
  const memory = state.memories.get(memoryId);
  if (memory === undefined || memory.npcId !== npcId) return undefined;
  return memory;
}

export function getMemoryProfile(
  state: NpcMemoryState,
  npcId: NpcId,
): NpcMemoryProfile | undefined {
  if (!state.npcs.has(npcId)) return undefined;
  const index = state.npcMemoryIndex.get(npcId) ?? new Set<MemoryId>();
  const byType = emptyByType();
  const byImportance = emptyByImportance();
  for (const id of index) {
    const memory = state.memories.get(id);
    if (memory === undefined) continue;
    byType[memory.type]++;
    byImportance[memory.importance]++;
  }
  return { npcId, totalMemories: index.size, byType, byImportance };
}

export function listMemories(
  state: NpcMemoryState,
  npcId: NpcId,
  type?: MemoryType,
): ReadonlyArray<Memory> {
  const index = state.npcMemoryIndex.get(npcId) ?? new Set<MemoryId>();
  const results: Memory[] = [];
  for (const id of index) {
    const memory = state.memories.get(id);
    if (memory === undefined) continue;
    if (type === undefined || memory.type === type) results.push(memory);
  }
  return results;
}

// ============================================================================
// HELPERS
// ============================================================================

function emptyByType(): Record<MemoryType, number> {
  return { ENCOUNTER: 0, TRADE: 0, COMBAT: 0, DIALOGUE: 0, OBSERVATION: 0 };
}

function emptyByImportance(): Record<MemoryImportance, number> {
  return { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
}
