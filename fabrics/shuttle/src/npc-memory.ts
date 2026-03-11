/**
 * NPC Memory Service — Persistent memory and event recall for AI-driven NPCs.
 *
 * Each NPC accumulates memories of interactions, observations, rumors,
 * experiences, and relationships. Memories carry an importance level and
 * a strength value that decays over time. Low-strength memories are
 * eventually forgotten via applyDecay, while reinforced memories grow
 * stronger and resist decay.
 *
 * Key concepts:
 *   - MemoryType: classifies what kind of event was memorized
 *   - MemoryImportance: four-tier salience bucket (trivial → critical)
 *   - Decay: time-based strength reduction, configurable per-instance
 *   - Reinforcement: repeated encounters strengthen existing memories
 *   - RelationshipSummary: aggregated memory statistics per entity pair
 *
 * "The Shuttle remembers, so the agents can dream."
 */

// ── Ports ────────────────────────────────────────────────────────

interface MemoryClock {
  readonly nowMicroseconds: () => number;
}

interface MemoryIdGenerator {
  readonly next: () => string;
}

export interface MemoryDeps {
  readonly clock: MemoryClock;
  readonly idGenerator: MemoryIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

export type MemoryType = 'INTERACTION' | 'OBSERVATION' | 'RUMOR' | 'EXPERIENCE' | 'RELATIONSHIP';

export type MemoryImportance = 'trivial' | 'normal' | 'important' | 'critical';

export interface MemoryDecayConfig {
  readonly decayRatePerDay: number;
  readonly minimumStrength: number;
  readonly criticalDecayMultiplier: number;
  readonly importantDecayMultiplier: number;
  readonly normalDecayMultiplier: number;
  readonly trivialDecayMultiplier: number;
}

export interface StoreMemoryParams {
  readonly type: MemoryType;
  readonly entityId: string;
  readonly content: string;
  readonly importance: MemoryImportance;
  readonly location?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface MemoryRecord {
  readonly memoryId: string;
  readonly npcId: string;
  readonly type: MemoryType;
  readonly entityId: string;
  readonly content: string;
  readonly importance: MemoryImportance;
  readonly strength: number;
  readonly reinforcements: number;
  readonly forgotten: boolean;
  readonly createdAt: number;
  readonly lastReinforcedAt: number;
  readonly location: string | null;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface MemoryQuery {
  readonly type?: MemoryType;
  readonly entityId?: string;
  readonly importance?: MemoryImportance;
  readonly minStrength?: number;
  readonly limit?: number;
  readonly includeForgotten?: boolean;
}

export interface RelationshipSummary {
  readonly npcId: string;
  readonly entityId: string;
  readonly totalMemories: number;
  readonly positiveCount: number;
  readonly negativeCount: number;
  readonly neutralCount: number;
  readonly strongestMemory: MemoryRecord | null;
  readonly mostRecentMemory: MemoryRecord | null;
}

export interface MemoryStats {
  readonly totalMemories: number;
  readonly totalNpcs: number;
  readonly totalForgotten: number;
  readonly averageStrength: number;
  readonly importanceBreakdown: Readonly<Record<MemoryImportance, number>>;
  readonly typeBreakdown: Readonly<Record<MemoryType, number>>;
}

// ── Constants ────────────────────────────────────────────────────

export const DEFAULT_DECAY_CONFIG: MemoryDecayConfig = {
  decayRatePerDay: 0.05,
  minimumStrength: 0.01,
  criticalDecayMultiplier: 0.1,
  importantDecayMultiplier: 0.3,
  normalDecayMultiplier: 1.0,
  trivialDecayMultiplier: 2.0,
};

export const MAX_MEMORIES_PER_NPC = 1000;

export const IMPORTANCE_THRESHOLDS: Readonly<Record<MemoryImportance, number>> = {
  trivial: 0.25,
  normal: 0.5,
  important: 0.75,
  critical: 1.0,
};

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;
const REINFORCEMENT_STRENGTH_BONUS = 0.15;
const REINFORCEMENT_MAX_STRENGTH = 1.0;

// ── State ────────────────────────────────────────────────────────

interface MutableMemory {
  readonly memoryId: string;
  readonly npcId: string;
  readonly type: MemoryType;
  readonly entityId: string;
  readonly content: string;
  importance: MemoryImportance;
  strength: number;
  reinforcements: number;
  forgotten: boolean;
  readonly createdAt: number;
  lastReinforcedAt: number;
  readonly location: string | null;
  readonly metadata: Readonly<Record<string, string>>;
}

interface MemoryState {
  readonly deps: MemoryDeps;
  readonly config: MemoryDecayConfig;
  readonly entries: Map<string, MutableMemory>;
  readonly npcIndex: Map<string, Set<string>>;
}

// ── Helpers ──────────────────────────────────────────────────────

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function importanceToStrength(importance: MemoryImportance): number {
  return IMPORTANCE_THRESHOLDS[importance];
}

function decayMultiplier(importance: MemoryImportance, config: MemoryDecayConfig): number {
  if (importance === 'critical') return config.criticalDecayMultiplier;
  if (importance === 'important') return config.importantDecayMultiplier;
  if (importance === 'normal') return config.normalDecayMultiplier;
  return config.trivialDecayMultiplier;
}

function toReadonly(entry: MutableMemory): MemoryRecord {
  return {
    memoryId: entry.memoryId,
    npcId: entry.npcId,
    type: entry.type,
    entityId: entry.entityId,
    content: entry.content,
    importance: entry.importance,
    strength: entry.strength,
    reinforcements: entry.reinforcements,
    forgotten: entry.forgotten,
    createdAt: entry.createdAt,
    lastReinforcedAt: entry.lastReinforcedAt,
    location: entry.location,
    metadata: entry.metadata,
  };
}

function addToNpcIndex(state: MemoryState, npcId: string, memoryId: string): void {
  const existing = state.npcIndex.get(npcId);
  if (existing !== undefined) {
    existing.add(memoryId);
  } else {
    state.npcIndex.set(npcId, new Set([memoryId]));
  }
}

function removeFromNpcIndex(state: MemoryState, npcId: string, memoryId: string): void {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return;
  ids.delete(memoryId);
  if (ids.size === 0) state.npcIndex.delete(npcId);
}

function getNpcMemoryIds(state: MemoryState, npcId: string): Set<string> | undefined {
  return state.npcIndex.get(npcId);
}

// ── Store ────────────────────────────────────────────────────────

function storeMemoryImpl(
  state: MemoryState,
  npcId: string,
  params: StoreMemoryParams,
): MemoryRecord {
  enforceCapacity(state, npcId);
  const now = state.deps.clock.nowMicroseconds();
  const entry: MutableMemory = {
    memoryId: state.deps.idGenerator.next(),
    npcId,
    type: params.type,
    entityId: params.entityId,
    content: params.content,
    importance: params.importance,
    strength: importanceToStrength(params.importance),
    reinforcements: 0,
    forgotten: false,
    createdAt: now,
    lastReinforcedAt: now,
    location: params.location ?? null,
    metadata: params.metadata ?? {},
  };
  state.entries.set(entry.memoryId, entry);
  addToNpcIndex(state, npcId, entry.memoryId);
  return toReadonly(entry);
}

function enforceCapacity(state: MemoryState, npcId: string): void {
  const ids = getNpcMemoryIds(state, npcId);
  if (ids === undefined) return;
  const activeCount = countActiveMemories(state, ids);
  if (activeCount < MAX_MEMORIES_PER_NPC) return;
  evictWeakest(state, npcId, ids);
}

function countActiveMemories(state: MemoryState, ids: Set<string>): number {
  let count = 0;
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry !== undefined && !entry.forgotten) count++;
  }
  return count;
}

function evictWeakest(state: MemoryState, npcId: string, ids: Set<string>): void {
  let weakest: MutableMemory | undefined;
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined || entry.forgotten) continue;
    if (weakest === undefined || entry.strength < weakest.strength) {
      weakest = entry;
    }
  }
  if (weakest !== undefined) {
    weakest.forgotten = true;
  }
}

// ── Recall ───────────────────────────────────────────────────────

function recallImpl(
  state: MemoryState,
  npcId: string,
  query: MemoryQuery,
): readonly MemoryRecord[] {
  const ids = getNpcMemoryIds(state, npcId);
  if (ids === undefined) return [];
  const results = collectMatchingMemories(state, ids, query);
  results.sort(byStrengthDescending);
  if (query.limit !== undefined && results.length > query.limit) {
    return results.slice(0, query.limit);
  }
  return results;
}

function collectMatchingMemories(
  state: MemoryState,
  ids: Set<string>,
  query: MemoryQuery,
): MemoryRecord[] {
  const results: MemoryRecord[] = [];
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined) continue;
    if (matchesQuery(entry, query)) {
      results.push(toReadonly(entry));
    }
  }
  return results;
}

function matchesQuery(entry: MutableMemory, query: MemoryQuery): boolean {
  if (!query.includeForgotten && entry.forgotten) return false;
  if (query.type !== undefined && entry.type !== query.type) return false;
  if (query.entityId !== undefined && entry.entityId !== query.entityId) return false;
  if (query.importance !== undefined && entry.importance !== query.importance) return false;
  if (query.minStrength !== undefined && entry.strength < query.minStrength) return false;
  return true;
}

function byStrengthDescending(a: MemoryRecord, b: MemoryRecord): number {
  return b.strength - a.strength;
}

// ── Recall by Entity ─────────────────────────────────────────────

function recallByEntityImpl(
  state: MemoryState,
  npcId: string,
  entityId: string,
): readonly MemoryRecord[] {
  return recallImpl(state, npcId, { entityId });
}

// ── Recall by Type ───────────────────────────────────────────────

function recallByTypeImpl(
  state: MemoryState,
  npcId: string,
  type: MemoryType,
): readonly MemoryRecord[] {
  return recallImpl(state, npcId, { type });
}

// ── Forget ───────────────────────────────────────────────────────

function forgetImpl(state: MemoryState, npcId: string, memoryId: string): boolean {
  const entry = state.entries.get(memoryId);
  if (entry === undefined) return false;
  if (entry.npcId !== npcId) return false;
  if (entry.forgotten) return false;
  entry.forgotten = true;
  return true;
}

// ── Reinforce ────────────────────────────────────────────────────

function reinforceMemoryImpl(
  state: MemoryState,
  npcId: string,
  memoryId: string,
): MemoryRecord | string {
  const entry = state.entries.get(memoryId);
  if (entry === undefined) return 'MEMORY_NOT_FOUND';
  if (entry.npcId !== npcId) return 'MEMORY_NOT_FOUND';
  if (entry.forgotten) return 'MEMORY_FORGOTTEN';
  entry.strength = clamp01(entry.strength + REINFORCEMENT_STRENGTH_BONUS);
  if (entry.strength > REINFORCEMENT_MAX_STRENGTH) {
    entry.strength = REINFORCEMENT_MAX_STRENGTH;
  }
  entry.reinforcements += 1;
  entry.lastReinforcedAt = state.deps.clock.nowMicroseconds();
  promoteImportance(entry);
  return toReadonly(entry);
}

function promoteImportance(entry: MutableMemory): void {
  if (entry.reinforcements >= 5 && entry.importance === 'trivial') {
    entry.importance = 'normal';
  }
  if (entry.reinforcements >= 10 && entry.importance === 'normal') {
    entry.importance = 'important';
  }
  if (entry.reinforcements >= 20 && entry.importance === 'important') {
    entry.importance = 'critical';
  }
}

// ── Decay ────────────────────────────────────────────────────────

function applyDecayImpl(state: MemoryState, npcId: string): number {
  const ids = getNpcMemoryIds(state, npcId);
  if (ids === undefined) return 0;
  const now = state.deps.clock.nowMicroseconds();
  let forgottenCount = 0;
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined || entry.forgotten) continue;
    if (decaySingle(entry, now, state.config)) {
      forgottenCount++;
    }
  }
  return forgottenCount;
}

function decaySingle(entry: MutableMemory, now: number, config: MemoryDecayConfig): boolean {
  const ageDays = (now - entry.lastReinforcedAt) / US_PER_DAY;
  if (ageDays <= 0) return false;
  const multiplier = decayMultiplier(entry.importance, config);
  const loss = config.decayRatePerDay * multiplier * ageDays;
  entry.strength = clamp01(entry.strength - loss);
  if (entry.strength <= config.minimumStrength) {
    entry.forgotten = true;
    return true;
  }
  return false;
}

// ── Relationship Summary ─────────────────────────────────────────

function getRelationshipSummaryImpl(
  state: MemoryState,
  npcId: string,
  entityId: string,
): RelationshipSummary {
  const ids = getNpcMemoryIds(state, npcId);
  if (ids === undefined) {
    return emptyRelationshipSummary(npcId, entityId);
  }
  return buildRelationshipSummary(state, npcId, entityId, ids);
}

function buildRelationshipSummary(
  state: MemoryState,
  npcId: string,
  entityId: string,
  ids: Set<string>,
): RelationshipSummary {
  let total = 0;
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  let strongest: MutableMemory | null = null;
  let mostRecent: MutableMemory | null = null;
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined || entry.forgotten) continue;
    if (entry.entityId !== entityId) continue;
    total++;
    const bucket = categorizeMemory(entry);
    if (bucket === 'positive') positive++;
    else if (bucket === 'negative') negative++;
    else neutral++;
    if (strongest === null || entry.strength > strongest.strength) strongest = entry;
    if (mostRecent === null || entry.createdAt > mostRecent.createdAt) mostRecent = entry;
  }
  return {
    npcId,
    entityId,
    totalMemories: total,
    positiveCount: positive,
    negativeCount: negative,
    neutralCount: neutral,
    strongestMemory: strongest !== null ? toReadonly(strongest) : null,
    mostRecentMemory: mostRecent !== null ? toReadonly(mostRecent) : null,
  };
}

function categorizeMemory(entry: MutableMemory): 'positive' | 'negative' | 'neutral' {
  if (entry.type === 'INTERACTION' || entry.type === 'RELATIONSHIP') return 'positive';
  if (entry.type === 'RUMOR') return 'negative';
  return 'neutral';
}

function emptyRelationshipSummary(npcId: string, entityId: string): RelationshipSummary {
  return {
    npcId,
    entityId,
    totalMemories: 0,
    positiveCount: 0,
    negativeCount: 0,
    neutralCount: 0,
    strongestMemory: null,
    mostRecentMemory: null,
  };
}

// ── NPC Memory Count ─────────────────────────────────────────────

function getNpcMemoryCountImpl(state: MemoryState, npcId: string): number {
  const ids = getNpcMemoryIds(state, npcId);
  if (ids === undefined) return 0;
  return countActiveMemories(state, ids);
}

// ── Stats ────────────────────────────────────────────────────────

function getStatsImpl(state: MemoryState): MemoryStats {
  let totalMemories = 0;
  let totalForgotten = 0;
  let totalStrength = 0;
  const importanceBreakdown = emptyImportanceBreakdown();
  const typeBreakdown = emptyTypeBreakdown();
  for (const entry of state.entries.values()) {
    totalMemories++;
    if (entry.forgotten) totalForgotten++;
    totalStrength += entry.strength;
    importanceBreakdown[entry.importance]++;
    typeBreakdown[entry.type]++;
  }
  return {
    totalMemories,
    totalNpcs: state.npcIndex.size,
    totalForgotten,
    averageStrength: totalMemories > 0 ? totalStrength / totalMemories : 0,
    importanceBreakdown,
    typeBreakdown,
  };
}

function emptyImportanceBreakdown(): Record<MemoryImportance, number> {
  return { trivial: 0, normal: 0, important: 0, critical: 0 };
}

function emptyTypeBreakdown(): Record<MemoryType, number> {
  return {
    INTERACTION: 0,
    OBSERVATION: 0,
    RUMOR: 0,
    EXPERIENCE: 0,
    RELATIONSHIP: 0,
  };
}

// ── Public Interface ─────────────────────────────────────────────

export interface NpcMemoryService {
  storeMemory(npcId: string, params: StoreMemoryParams): MemoryRecord;
  recall(npcId: string, query: MemoryQuery): readonly MemoryRecord[];
  recallByEntity(npcId: string, entityId: string): readonly MemoryRecord[];
  recallByType(npcId: string, type: MemoryType): readonly MemoryRecord[];
  forget(npcId: string, memoryId: string): boolean;
  reinforceMemory(npcId: string, memoryId: string): MemoryRecord | string;
  applyDecay(npcId: string): number;
  getRelationshipSummary(npcId: string, entityId: string): RelationshipSummary;
  getNpcMemoryCount(npcId: string): number;
  getStats(): MemoryStats;
}

// ── Factory ──────────────────────────────────────────────────────

export function createNpcMemoryService(
  deps: MemoryDeps,
  config?: Partial<MemoryDecayConfig>,
): NpcMemoryService {
  const fullConfig: MemoryDecayConfig = {
    decayRatePerDay: config?.decayRatePerDay ?? DEFAULT_DECAY_CONFIG.decayRatePerDay,
    minimumStrength: config?.minimumStrength ?? DEFAULT_DECAY_CONFIG.minimumStrength,
    criticalDecayMultiplier:
      config?.criticalDecayMultiplier ?? DEFAULT_DECAY_CONFIG.criticalDecayMultiplier,
    importantDecayMultiplier:
      config?.importantDecayMultiplier ?? DEFAULT_DECAY_CONFIG.importantDecayMultiplier,
    normalDecayMultiplier:
      config?.normalDecayMultiplier ?? DEFAULT_DECAY_CONFIG.normalDecayMultiplier,
    trivialDecayMultiplier:
      config?.trivialDecayMultiplier ?? DEFAULT_DECAY_CONFIG.trivialDecayMultiplier,
  };
  const state: MemoryState = {
    deps,
    config: fullConfig,
    entries: new Map(),
    npcIndex: new Map(),
  };
  return {
    storeMemory: (npcId, params) => storeMemoryImpl(state, npcId, params),
    recall: (npcId, query) => recallImpl(state, npcId, query),
    recallByEntity: (npcId, entityId) => recallByEntityImpl(state, npcId, entityId),
    recallByType: (npcId, type) => recallByTypeImpl(state, npcId, type),
    forget: (npcId, memoryId) => forgetImpl(state, npcId, memoryId),
    reinforceMemory: (npcId, memoryId) => reinforceMemoryImpl(state, npcId, memoryId),
    applyDecay: (npcId) => applyDecayImpl(state, npcId),
    getRelationshipSummary: (npcId, entityId) => getRelationshipSummaryImpl(state, npcId, entityId),
    getNpcMemoryCount: (npcId) => getNpcMemoryCountImpl(state, npcId),
    getStats: () => getStatsImpl(state),
  };
}

// ── Backward-Compatible Type Aliases ─────────────────────────────
// index.ts re-exports these names; keep them available.

export type NpcMemoryDeps = MemoryDeps;
export type MemoryEntry = MemoryRecord;
export type MemoryCategory = MemoryType;
export type RecordMemoryParams = StoreMemoryParams;
export type RecallFilter = MemoryQuery;
