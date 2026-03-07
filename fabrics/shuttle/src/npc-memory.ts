/**
 * NPC Memory Service — Persistent memory for AI-driven NPCs.
 *
 * Bible v1.1: NPCs retain memories based on their tier:
 *   Tier 1 (Crowd):       No memory — stateless reactions
 *   Tier 2 (Inhabitants): Rolling 90-day window — short-term relationships
 *   Tier 3 (Notable):     Permanent memory — long-term goals, grudges, alliances
 *   Tier 4 (Architect's): Permanent + universe-aware — cross-world knowledge
 *
 * Each memory entry captures:
 *   - What happened (category + content)
 *   - Who was involved (subject entity)
 *   - Emotional significance (salience score 0-1)
 *   - When it occurred (microsecond timestamp)
 *
 * Memory retrieval supports:
 *   - Recency-weighted recall (newer = more salient)
 *   - Category filtering (economic, social, conflict, discovery)
 *   - Salience threshold (forget trivial events)
 *   - Cross-world queries for Tier 4 universe-aware agents
 *
 * "The Shuttle remembers, so the agents can dream."
 */

import type { MemoryModel } from './npc-tiers.js';

// ─── Types ──────────────────────────────────────────────────────────

export type MemoryCategory =
  | 'economic'
  | 'social'
  | 'conflict'
  | 'discovery'
  | 'governance'
  | 'narrative';

export interface MemoryEntry {
  readonly memoryId: string;
  readonly npcId: string;
  readonly worldId: string;
  readonly category: MemoryCategory;
  readonly subject: string;
  readonly content: string;
  readonly salience: number;
  readonly createdAt: number;
}

export interface RecordMemoryParams {
  readonly npcId: string;
  readonly worldId: string;
  readonly category: MemoryCategory;
  readonly subject: string;
  readonly content: string;
  readonly salience: number;
}

export interface RecallFilter {
  readonly category?: MemoryCategory;
  readonly worldId?: string;
  readonly minSalience?: number;
  readonly limit?: number;
}

export interface MemoryStats {
  readonly totalEntries: number;
  readonly oldestAt: number | null;
  readonly newestAt: number | null;
  readonly categoryBreakdown: Readonly<Record<MemoryCategory, number>>;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface NpcMemoryDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly idGenerator: { next(): string };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface NpcMemoryService {
  record(params: RecordMemoryParams): MemoryEntry;
  recall(npcId: string, filter?: RecallFilter): ReadonlyArray<MemoryEntry>;
  getMemory(memoryId: string): MemoryEntry | undefined;
  getStats(npcId: string): MemoryStats;
  forget(memoryId: string): boolean;
  forgetAll(npcId: string): number;
  prune(npcId: string, model: MemoryModel): number;
  count(): number;
  countForNpc(npcId: string): number;
}

// ─── Constants ──────────────────────────────────────────────────────

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;
const ROLLING_WINDOW_DAYS = 90;
const ROLLING_WINDOW_US = ROLLING_WINDOW_DAYS * US_PER_DAY;

// ─── State ──────────────────────────────────────────────────────────

interface MemoryState {
  readonly entries: Map<string, MemoryEntry>;
  readonly npcIndex: Map<string, Set<string>>; // npcId → memoryIds
  readonly deps: NpcMemoryDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createNpcMemoryService(
  deps: NpcMemoryDeps,
): NpcMemoryService {
  const state: MemoryState = {
    entries: new Map(),
    npcIndex: new Map(),
    deps,
  };

  return {
    record: (p) => recordImpl(state, p),
    recall: (id, f) => recallImpl(state, id, f),
    getMemory: (id) => state.entries.get(id),
    getStats: (id) => getStatsImpl(state, id),
    forget: (id) => forgetImpl(state, id),
    forgetAll: (id) => forgetAllImpl(state, id),
    prune: (id, m) => pruneImpl(state, id, m),
    count: () => state.entries.size,
    countForNpc: (id) => state.npcIndex.get(id)?.size ?? 0,
  };
}

// ─── Record ─────────────────────────────────────────────────────────

function recordImpl(
  state: MemoryState,
  params: RecordMemoryParams,
): MemoryEntry {
  const clamped = clampSalience(params.salience);
  const entry: MemoryEntry = {
    memoryId: state.deps.idGenerator.next(),
    npcId: params.npcId,
    worldId: params.worldId,
    category: params.category,
    subject: params.subject,
    content: params.content,
    salience: clamped,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.entries.set(entry.memoryId, entry);
  addToNpcIndex(state, entry.npcId, entry.memoryId);
  return entry;
}

function clampSalience(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function addToNpcIndex(
  state: MemoryState,
  npcId: string,
  memoryId: string,
): void {
  const existing = state.npcIndex.get(npcId);
  if (existing !== undefined) {
    existing.add(memoryId);
  } else {
    state.npcIndex.set(npcId, new Set([memoryId]));
  }
}

// ─── Recall ─────────────────────────────────────────────────────────

function recallImpl(
  state: MemoryState,
  npcId: string,
  filter?: RecallFilter,
): ReadonlyArray<MemoryEntry> {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return [];

  let results: MemoryEntry[] = [];
  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry !== undefined && matchesFilter(entry, filter)) {
      results.push(entry);
    }
  }

  results.sort(byRecencyDescending);
  results = applyLimit(results, filter?.limit);
  return results;
}

function matchesFilter(
  entry: MemoryEntry,
  filter?: RecallFilter,
): boolean {
  if (filter === undefined) return true;
  if (filter.category !== undefined && entry.category !== filter.category) {
    return false;
  }
  if (filter.worldId !== undefined && entry.worldId !== filter.worldId) {
    return false;
  }
  if (filter.minSalience !== undefined && entry.salience < filter.minSalience) {
    return false;
  }
  return true;
}

function byRecencyDescending(a: MemoryEntry, b: MemoryEntry): number {
  return b.createdAt - a.createdAt;
}

function applyLimit(
  entries: MemoryEntry[],
  limit: number | undefined,
): MemoryEntry[] {
  if (limit === undefined || limit >= entries.length) return entries;
  return entries.slice(0, limit);
}

// ─── Stats ──────────────────────────────────────────────────────────

function getStatsImpl(
  state: MemoryState,
  npcId: string,
): MemoryStats {
  const ids = state.npcIndex.get(npcId);
  const breakdown = emptyBreakdown();
  if (ids === undefined || ids.size === 0) {
    return {
      totalEntries: 0,
      oldestAt: null,
      newestAt: null,
      categoryBreakdown: breakdown,
    };
  }
  return computeStats(state, ids, breakdown);
}

function computeStats(
  state: MemoryState,
  ids: Set<string>,
  breakdown: Record<MemoryCategory, number>,
): MemoryStats {
  let oldest = Infinity;
  let newest = -Infinity;
  let total = 0;

  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry === undefined) continue;
    total += 1;
    breakdown[entry.category] += 1;
    if (entry.createdAt < oldest) oldest = entry.createdAt;
    if (entry.createdAt > newest) newest = entry.createdAt;
  }

  return {
    totalEntries: total,
    oldestAt: total > 0 ? oldest : null,
    newestAt: total > 0 ? newest : null,
    categoryBreakdown: breakdown,
  };
}

function emptyBreakdown(): Record<MemoryCategory, number> {
  return {
    economic: 0,
    social: 0,
    conflict: 0,
    discovery: 0,
    governance: 0,
    narrative: 0,
  };
}

// ─── Forget ─────────────────────────────────────────────────────────

function forgetImpl(state: MemoryState, memoryId: string): boolean {
  const entry = state.entries.get(memoryId);
  if (entry === undefined) return false;
  removeFromIndex(state, entry.npcId, memoryId);
  state.entries.delete(memoryId);
  return true;
}

function forgetAllImpl(state: MemoryState, npcId: string): number {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return 0;
  const count = ids.size;
  for (const id of ids) {
    state.entries.delete(id);
  }
  state.npcIndex.delete(npcId);
  return count;
}

function removeFromIndex(
  state: MemoryState,
  npcId: string,
  memoryId: string,
): void {
  const ids = state.npcIndex.get(npcId);
  if (ids !== undefined) {
    ids.delete(memoryId);
    if (ids.size === 0) state.npcIndex.delete(npcId);
  }
}

// ─── Prune ──────────────────────────────────────────────────────────

function pruneImpl(
  state: MemoryState,
  npcId: string,
  model: MemoryModel,
): number {
  if (model === 'none') return forgetAllImpl(state, npcId);
  if (model === 'permanent' || model === 'permanent_universe') return 0;
  return pruneRolling(state, npcId);
}

function pruneRolling(state: MemoryState, npcId: string): number {
  const ids = state.npcIndex.get(npcId);
  if (ids === undefined) return 0;

  const now = state.deps.clock.nowMicroseconds();
  const cutoff = now - ROLLING_WINDOW_US;
  const toRemove: string[] = [];

  for (const id of ids) {
    const entry = state.entries.get(id);
    if (entry !== undefined && entry.createdAt < cutoff) {
      toRemove.push(id);
    }
  }

  for (const id of toRemove) {
    ids.delete(id);
    state.entries.delete(id);
  }
  if (ids.size === 0) state.npcIndex.delete(npcId);
  return toRemove.length;
}
