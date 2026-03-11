/**
 * NPC Memory V2 — Enhanced memory with decay, emotional tags, and gossip.
 *
 * Extends the base memory system with:
 *   - Memory types: INTERACTION, OBSERVATION, RUMOR, TRAUMA, ACHIEVEMENT
 *   - Emotional valence tags (positive/negative/neutral)
 *   - Short-term memory (configurable capacity, FIFO)
 *   - Long-term memory (significant events, permanent)
 *   - Decay over time (configurable half-life)
 *   - Memory queries by entity, type, and emotional tag
 *   - Gossip system (NPCs share memories with each other)
 *
 * "The Shuttle remembers what the threads have woven."
 */

// ── Ports ────────────────────────────────────────────────────────

interface MemoryV2Clock {
  readonly nowMicroseconds: () => number;
}

interface MemoryV2IdGenerator {
  readonly next: () => string;
}

interface MemoryV2Deps {
  readonly clock: MemoryV2Clock;
  readonly idGenerator: MemoryV2IdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type MemoryV2Type = 'interaction' | 'observation' | 'rumor' | 'trauma' | 'achievement';

type EmotionalTag = 'positive' | 'negative' | 'neutral';

type MemoryV2Tier = 'short_term' | 'long_term';

interface MemoryV2Entry {
  readonly memoryId: string;
  readonly npcId: string;
  readonly tier: MemoryV2Tier;
  readonly memoryType: MemoryV2Type;
  readonly emotionalTag: EmotionalTag;
  readonly subjectEntityId: string;
  readonly content: string;
  readonly importance: number;
  readonly createdAt: number;
  readonly decayedImportance: number;
  readonly sourceNpcId: string | null;
}

interface RecordMemoryV2Params {
  readonly npcId: string;
  readonly memoryType: MemoryV2Type;
  readonly emotionalTag: EmotionalTag;
  readonly subjectEntityId: string;
  readonly content: string;
  readonly importance: number;
}

interface MemoryV2QueryFilter {
  readonly memoryType?: MemoryV2Type;
  readonly emotionalTag?: EmotionalTag;
  readonly subjectEntityId?: string;
  readonly tier?: MemoryV2Tier;
  readonly minImportance?: number;
  readonly limit?: number;
}

interface ShareMemoryParams {
  readonly fromNpcId: string;
  readonly toNpcId: string;
  readonly memoryId: string;
  readonly importanceModifier?: number;
}

interface ShareMemoryResult {
  readonly originalMemoryId: string;
  readonly newMemoryId: string;
  readonly toNpcId: string;
}

interface MemoryV2Config {
  readonly shortTermCapacity: number;
  readonly longTermThreshold: number;
  readonly decayHalfLifeUs: number;
}

interface MemoryV2Stats {
  readonly totalMemories: number;
  readonly shortTermCount: number;
  readonly longTermCount: number;
  readonly rumorCount: number;
  readonly averageImportance: number;
}

interface NpcMemoryV2System {
  readonly record: (params: RecordMemoryV2Params) => MemoryV2Entry;
  readonly recall: (npcId: string, filter?: MemoryV2QueryFilter) => ReadonlyArray<MemoryV2Entry>;
  readonly recallAbout: (npcId: string, subjectId: string) => ReadonlyArray<MemoryV2Entry>;
  readonly getMemory: (memoryId: string) => MemoryV2Entry | undefined;
  readonly forget: (memoryId: string) => boolean;
  readonly forgetAll: (npcId: string) => number;
  readonly shareMemory: (params: ShareMemoryParams) => ShareMemoryResult | undefined;
  readonly applyDecay: (npcId: string) => number;
  readonly promoteToLongTerm: (memoryId: string) => boolean;
  readonly getStats: (npcId: string) => MemoryV2Stats;
  readonly globalStats: () => MemoryV2Stats;
  readonly count: (npcId: string) => number;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_CONFIG: MemoryV2Config = {
  shortTermCapacity: 50,
  longTermThreshold: 0.7,
  decayHalfLifeUs: 86_400_000_000 * 7,
};

// ── State ────────────────────────────────────────────────────────

interface MutableMemoryV2 {
  readonly memoryId: string;
  readonly npcId: string;
  tier: MemoryV2Tier;
  readonly memoryType: MemoryV2Type;
  readonly emotionalTag: EmotionalTag;
  readonly subjectEntityId: string;
  readonly content: string;
  readonly importance: number;
  readonly createdAt: number;
  readonly sourceNpcId: string | null;
}

interface MemoryV2State {
  readonly deps: MemoryV2Deps;
  readonly config: MemoryV2Config;
  readonly entries: Map<string, MutableMemoryV2>;
  readonly npcIndex: Map<string, string[]>;
}

// ── Operations ───────────────────────────────────────────────────

function recordImpl(state: MemoryV2State, params: RecordMemoryV2Params): MemoryV2Entry {
  const importance = clamp01(params.importance);
  const tier = determineTier(importance, state.config);
  const now = state.deps.clock.nowMicroseconds();

  const memory: MutableMemoryV2 = {
    memoryId: state.deps.idGenerator.next(),
    npcId: params.npcId,
    tier,
    memoryType: params.memoryType,
    emotionalTag: params.emotionalTag,
    subjectEntityId: params.subjectEntityId,
    content: params.content,
    importance,
    createdAt: now,
    sourceNpcId: null,
  };

  state.entries.set(memory.memoryId, memory);
  addToIndex(state, params.npcId, memory.memoryId);
  enforceShortTermCapacity(state, params.npcId);
  return toReadonlyEntry(memory, now, state.config);
}

function determineTier(importance: number, config: MemoryV2Config): MemoryV2Tier {
  return importance >= config.longTermThreshold ? 'long_term' : 'short_term';
}

function addToIndex(state: MemoryV2State, npcId: string, memoryId: string): void {
  const existing = state.npcIndex.get(npcId);
  if (existing !== undefined) {
    existing.push(memoryId);
  } else {
    state.npcIndex.set(npcId, [memoryId]);
  }
}

function enforceShortTermCapacity(state: MemoryV2State, npcId: string): void {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return;
  const shortTermIds = getShortTermIds(state, ids);
  if (shortTermIds.length <= state.config.shortTermCapacity) return;
  evictOldestShortTerm(state, ids, shortTermIds);
}

function getShortTermIds(state: MemoryV2State, ids: readonly string[]): string[] {
  const result: string[] = [];
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry !== undefined && entry.tier === 'short_term') result.push(id);
  }
  return result;
}

function evictOldestShortTerm(
  state: MemoryV2State,
  allIds: string[],
  shortTermIds: string[],
): void {
  shortTermIds.sort((a, b) => {
    const ea = state.entries.get(a);
    const eb = state.entries.get(b);
    return (ea?.createdAt ?? 0) - (eb?.createdAt ?? 0);
  });
  const toRemove = shortTermIds.slice(0, shortTermIds.length - state.config.shortTermCapacity);
  for (const id of toRemove) {
    state.entries.delete(id);
    const idx = allIds.indexOf(id);
    if (idx >= 0) allIds.splice(idx, 1);
  }
}

function recallImpl(
  state: MemoryV2State,
  npcId: string,
  filter?: MemoryV2QueryFilter,
): ReadonlyArray<MemoryV2Entry> {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return [];
  const now = state.deps.clock.nowMicroseconds();
  let results: MemoryV2Entry[] = [];
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined) continue;
    if (matchesFilter(entry, filter)) {
      results.push(toReadonlyEntry(entry, now, state.config));
    }
  }
  results.sort(byDecayedImportance);
  if (filter?.limit !== undefined) results = results.slice(0, filter.limit);
  return results;
}

function matchesFilter(entry: MutableMemoryV2, filter?: MemoryV2QueryFilter): boolean {
  if (filter === undefined) return true;
  if (filter.memoryType !== undefined && entry.memoryType !== filter.memoryType) return false;
  if (filter.emotionalTag !== undefined && entry.emotionalTag !== filter.emotionalTag) return false;
  if (filter.subjectEntityId !== undefined && entry.subjectEntityId !== filter.subjectEntityId)
    return false;
  if (filter.tier !== undefined && entry.tier !== filter.tier) return false;
  if (filter.minImportance !== undefined && entry.importance < filter.minImportance) return false;
  return true;
}

function byDecayedImportance(a: MemoryV2Entry, b: MemoryV2Entry): number {
  return b.decayedImportance - a.decayedImportance;
}

function shareMemoryImpl(
  state: MemoryV2State,
  params: ShareMemoryParams,
): ShareMemoryResult | undefined {
  const original = state.entries.get(params.memoryId);
  if (original === undefined) return undefined;
  if (original.npcId !== params.fromNpcId) return undefined;

  const modifier = params.importanceModifier ?? 0.8;
  const rumorImportance = clamp01(original.importance * modifier);
  const now = state.deps.clock.nowMicroseconds();
  const rumor: MutableMemoryV2 = {
    memoryId: state.deps.idGenerator.next(),
    npcId: params.toNpcId,
    tier: determineTier(rumorImportance, state.config),
    memoryType: 'rumor',
    emotionalTag: original.emotionalTag,
    subjectEntityId: original.subjectEntityId,
    content: original.content,
    importance: rumorImportance,
    createdAt: now,
    sourceNpcId: params.fromNpcId,
  };
  state.entries.set(rumor.memoryId, rumor);
  addToIndex(state, params.toNpcId, rumor.memoryId);
  return {
    originalMemoryId: params.memoryId,
    newMemoryId: rumor.memoryId,
    toNpcId: params.toNpcId,
  };
}

function applyDecayImpl(state: MemoryV2State, npcId: string): number {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return 0;
  const now = state.deps.clock.nowMicroseconds();
  const toRemove: string[] = [];
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined) continue;
    if (entry.tier === 'long_term') continue;
    const decayed = computeDecay(entry.importance, entry.createdAt, now, state.config);
    if (decayed < 0.01) toRemove.push(id);
  }
  for (const id of toRemove) {
    state.entries.delete(id);
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1);
  }
  return toRemove.length;
}

function computeDecay(
  importance: number,
  createdAt: number,
  now: number,
  config: MemoryV2Config,
): number {
  const age = now - createdAt;
  if (age <= 0) return importance;
  const halfLives = age / config.decayHalfLifeUs;
  return importance * Math.pow(0.5, halfLives);
}

function promoteImpl(state: MemoryV2State, memoryId: string): boolean {
  const entry = state.entries.get(memoryId);
  if (entry === undefined) return false;
  if (entry.tier === 'long_term') return false;
  entry.tier = 'long_term';
  return true;
}

function forgetImpl(state: MemoryV2State, memoryId: string): boolean {
  const entry = state.entries.get(memoryId);
  if (entry === undefined) return false;
  removeFromIndex(state, entry.npcId, memoryId);
  state.entries.delete(memoryId);
  return true;
}

function forgetAllImpl(state: MemoryV2State, npcId: string): number {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return 0;
  const count = ids.length;
  for (const id of ids) {
    state.entries.delete(id);
  }
  state.npcIndex.delete(npcId);
  return count;
}

function removeFromIndex(state: MemoryV2State, npcId: string, memoryId: string): void {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return;
  const idx = ids.indexOf(memoryId);
  if (idx >= 0) ids.splice(idx, 1);
  if (ids.length === 0) state.npcIndex.delete(npcId);
}

function getStatsForNpc(state: MemoryV2State, npcId: string): MemoryV2Stats {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return emptyStats();
  return computeStatsFromIds(state, ids);
}

function globalStatsImpl(state: MemoryV2State): MemoryV2Stats {
  const allIds = [...state.entries.keys()];
  return computeStatsFromIds(state, allIds);
}

function computeStatsFromIds(state: MemoryV2State, ids: readonly string[]): MemoryV2Stats {
  let shortTerm = 0;
  let longTerm = 0;
  let rumors = 0;
  let totalImportance = 0;
  let count = 0;
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined) continue;
    count++;
    totalImportance += entry.importance;
    if (entry.tier === 'short_term') shortTerm++;
    else longTerm++;
    if (entry.memoryType === 'rumor') rumors++;
  }
  return {
    totalMemories: count,
    shortTermCount: shortTerm,
    longTermCount: longTerm,
    rumorCount: rumors,
    averageImportance: count > 0 ? totalImportance / count : 0,
  };
}

function emptyStats(): MemoryV2Stats {
  return {
    totalMemories: 0,
    shortTermCount: 0,
    longTermCount: 0,
    rumorCount: 0,
    averageImportance: 0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toReadonlyEntry(
  entry: MutableMemoryV2,
  now: number,
  config: MemoryV2Config,
): MemoryV2Entry {
  const decayed =
    entry.tier === 'long_term'
      ? entry.importance
      : computeDecay(entry.importance, entry.createdAt, now, config);
  return {
    memoryId: entry.memoryId,
    npcId: entry.npcId,
    tier: entry.tier,
    memoryType: entry.memoryType,
    emotionalTag: entry.emotionalTag,
    subjectEntityId: entry.subjectEntityId,
    content: entry.content,
    importance: entry.importance,
    createdAt: entry.createdAt,
    decayedImportance: decayed,
    sourceNpcId: entry.sourceNpcId,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcMemoryV2System(
  deps: MemoryV2Deps,
  config?: Partial<MemoryV2Config>,
): NpcMemoryV2System {
  const fullConfig: MemoryV2Config = {
    shortTermCapacity: config?.shortTermCapacity ?? DEFAULT_CONFIG.shortTermCapacity,
    longTermThreshold: config?.longTermThreshold ?? DEFAULT_CONFIG.longTermThreshold,
    decayHalfLifeUs: config?.decayHalfLifeUs ?? DEFAULT_CONFIG.decayHalfLifeUs,
  };
  const state: MemoryV2State = {
    deps,
    config: fullConfig,
    entries: new Map(),
    npcIndex: new Map(),
  };

  return {
    record: (params) => recordImpl(state, params),
    recall: (npcId, filter) => recallImpl(state, npcId, filter),
    recallAbout: (npcId, subjectId) => recallImpl(state, npcId, { subjectEntityId: subjectId }),
    getMemory: (memoryId) => {
      const e = state.entries.get(memoryId);
      if (e === undefined) return undefined;
      return toReadonlyEntry(e, state.deps.clock.nowMicroseconds(), state.config);
    },
    forget: (memoryId) => forgetImpl(state, memoryId),
    forgetAll: (npcId) => forgetAllImpl(state, npcId),
    shareMemory: (params) => shareMemoryImpl(state, params),
    applyDecay: (npcId) => applyDecayImpl(state, npcId),
    promoteToLongTerm: (memoryId) => promoteImpl(state, memoryId),
    getStats: (npcId) => getStatsForNpc(state, npcId),
    globalStats: () => globalStatsImpl(state),
    count: (npcId) => state.npcIndex.get(npcId)?.length ?? 0,
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcMemoryV2System, DEFAULT_CONFIG as DEFAULT_MEMORY_V2_CONFIG };
export type {
  NpcMemoryV2System,
  MemoryV2Deps,
  MemoryV2Type,
  EmotionalTag,
  MemoryV2Tier,
  MemoryV2Entry,
  RecordMemoryV2Params,
  MemoryV2QueryFilter,
  ShareMemoryParams,
  ShareMemoryResult,
  MemoryV2Config,
  MemoryV2Stats,
};
