/**
 * lore-compendium.ts — In-world lore, faction histories, mythology.
 *
 * Stores and retrieves lore entries: historical events, faction origins,
 * myths, legends. Categorized by world, faction, era. Tag-based search.
 * Lore can be locked (secret) until conditions are met.
 */

// ── Ports ────────────────────────────────────────────────────────

interface LoreClockPort {
  readonly nowMicroseconds: () => number;
}

interface LoreIdPort {
  readonly generate: () => string;
}

interface LoreLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface LoreDeps {
  readonly clock: LoreClockPort;
  readonly idGenerator: LoreIdPort;
  readonly logger: LoreLoggerPort;
}

// ── Types ────────────────────────────────────────────────────────

type LoreCategory = 'HISTORY' | 'MYTHOLOGY' | 'FACTION' | 'GEOGRAPHY' | 'BIOGRAPHY' | 'PROPHECY';

type LoreTag = string;

interface LoreLock {
  readonly locked: boolean;
  readonly unlockCondition: string;
  readonly unlockedBy?: string;
  readonly unlockedAt?: number;
}

interface LoreEntry {
  readonly entryId: string;
  readonly worldId: string;
  readonly category: LoreCategory;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly LoreTag[];
  readonly authorDynastyId?: string;
  readonly lock: LoreLock;
  readonly createdAt: number;
  readonly updatedAt: number;
}

interface AddEntryParams {
  readonly worldId: string;
  readonly category: LoreCategory;
  readonly title: string;
  readonly content: string;
  readonly tags: readonly LoreTag[];
  readonly authorDynastyId?: string;
  readonly locked?: boolean;
  readonly unlockCondition?: string;
}

interface UpdateEntryParams {
  readonly entryId: string;
  readonly content?: string;
  readonly tags?: readonly LoreTag[];
}

interface LoreQuery {
  readonly worldId?: string;
  readonly category?: LoreCategory;
  readonly tags?: readonly LoreTag[];
  readonly includeSecret?: boolean;
}

interface UnlockResult {
  readonly entryId: string;
  readonly success: boolean;
  readonly error?: string;
}

interface CompendiumStats {
  readonly totalEntries: number;
  readonly lockedEntries: number;
  readonly entriesByCategory: Record<LoreCategory, number>;
  readonly totalTags: number;
  readonly worldCount: number;
}

interface LoreCompendium {
  readonly addEntry: (params: AddEntryParams) => LoreEntry;
  readonly updateEntry: (params: UpdateEntryParams) => LoreEntry | string;
  readonly unlockEntry: (entryId: string, dynastyId: string) => UnlockResult;
  readonly getEntry: (entryId: string) => LoreEntry | undefined;
  readonly queryByTags: (query: LoreQuery) => readonly LoreEntry[];
  readonly queryByWorld: (worldId: string, includeSecret: boolean) => readonly LoreEntry[];
  readonly queryByCategory: (category: LoreCategory) => readonly LoreEntry[];
  readonly getStats: () => CompendiumStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableLoreEntry {
  readonly entryId: string;
  readonly worldId: string;
  readonly category: LoreCategory;
  readonly title: string;
  content: string;
  tags: readonly LoreTag[];
  readonly authorDynastyId?: string;
  lock: LoreLock;
  readonly createdAt: number;
  updatedAt: number;
}

interface LoreState {
  readonly deps: LoreDeps;
  readonly entries: Map<string, MutableLoreEntry>;
  readonly tagIndex: Map<LoreTag, Set<string>>;
  readonly worldIndex: Map<string, Set<string>>;
  readonly categoryIndex: Map<LoreCategory, Set<string>>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toLoreEntry(entry: MutableLoreEntry): LoreEntry {
  return {
    entryId: entry.entryId,
    worldId: entry.worldId,
    category: entry.category,
    title: entry.title,
    content: entry.content,
    tags: entry.tags,
    authorDynastyId: entry.authorDynastyId,
    lock: entry.lock,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function addToTagIndex(state: LoreState, entryId: string, tags: readonly LoreTag[]): void {
  for (const tag of tags) {
    const existing = state.tagIndex.get(tag);
    if (existing === undefined) {
      state.tagIndex.set(tag, new Set([entryId]));
    } else {
      existing.add(entryId);
    }
  }
}

function removeFromTagIndex(state: LoreState, entryId: string, tags: readonly LoreTag[]): void {
  for (const tag of tags) {
    const existing = state.tagIndex.get(tag);
    if (existing !== undefined) {
      existing.delete(entryId);
      if (existing.size === 0) {
        state.tagIndex.delete(tag);
      }
    }
  }
}

function addToWorldIndex(state: LoreState, worldId: string, entryId: string): void {
  const existing = state.worldIndex.get(worldId);
  if (existing === undefined) {
    state.worldIndex.set(worldId, new Set([entryId]));
  } else {
    existing.add(entryId);
  }
}

function addToCategoryIndex(state: LoreState, category: LoreCategory, entryId: string): void {
  const existing = state.categoryIndex.get(category);
  if (existing === undefined) {
    state.categoryIndex.set(category, new Set([entryId]));
  } else {
    existing.add(entryId);
  }
}

function matchesQuery(entry: MutableLoreEntry, query: LoreQuery): boolean {
  if (query.worldId !== undefined && entry.worldId !== query.worldId) {
    return false;
  }
  if (query.category !== undefined && entry.category !== query.category) {
    return false;
  }
  if (query.tags !== undefined && query.tags.length > 0) {
    const hasAllTags = query.tags.every((tag) => entry.tags.includes(tag));
    if (!hasAllTags) return false;
  }
  if (!query.includeSecret && entry.lock.locked) {
    return false;
  }
  return true;
}

// ── Operations ───────────────────────────────────────────────────

function addEntryImpl(state: LoreState, params: AddEntryParams): LoreEntry {
  const now = state.deps.clock.nowMicroseconds();
  const entryId = state.deps.idGenerator.generate();
  const locked = params.locked ?? false;
  const unlockCondition = params.unlockCondition ?? '';
  const lock: LoreLock = {
    locked,
    unlockCondition,
  };
  const mutableEntry: MutableLoreEntry = {
    entryId,
    worldId: params.worldId,
    category: params.category,
    title: params.title,
    content: params.content,
    tags: params.tags,
    authorDynastyId: params.authorDynastyId,
    lock,
    createdAt: now,
    updatedAt: now,
  };
  state.entries.set(entryId, mutableEntry);
  addToTagIndex(state, entryId, params.tags);
  addToWorldIndex(state, params.worldId, entryId);
  addToCategoryIndex(state, params.category, entryId);
  state.deps.logger.info('lore-entry-added', {
    entryId,
    worldId: params.worldId,
    category: params.category,
  });
  return toLoreEntry(mutableEntry);
}

function updateEntryImpl(state: LoreState, params: UpdateEntryParams): LoreEntry | string {
  const existing = state.entries.get(params.entryId);
  if (existing === undefined) {
    return 'ENTRY_NOT_FOUND';
  }
  if (existing.lock.locked) {
    return 'ENTRY_LOCKED';
  }
  const now = state.deps.clock.nowMicroseconds();
  if (params.content !== undefined) {
    existing.content = params.content;
  }
  if (params.tags !== undefined) {
    removeFromTagIndex(state, params.entryId, existing.tags);
    existing.tags = params.tags;
    addToTagIndex(state, params.entryId, params.tags);
  }
  existing.updatedAt = now;
  state.deps.logger.info('lore-entry-updated', { entryId: params.entryId });
  return toLoreEntry(existing);
}

function unlockEntryImpl(state: LoreState, entryId: string, dynastyId: string): UnlockResult {
  const existing = state.entries.get(entryId);
  if (existing === undefined) {
    return { entryId, success: false, error: 'ENTRY_NOT_FOUND' };
  }
  if (!existing.lock.locked) {
    return { entryId, success: false, error: 'ALREADY_UNLOCKED' };
  }
  const now = state.deps.clock.nowMicroseconds();
  existing.lock = {
    locked: false,
    unlockCondition: existing.lock.unlockCondition,
    unlockedBy: dynastyId,
    unlockedAt: now,
  };
  state.deps.logger.info('lore-entry-unlocked', { entryId, dynastyId });
  return { entryId, success: true };
}

function queryByTagsImpl(state: LoreState, query: LoreQuery): readonly LoreEntry[] {
  const results: LoreEntry[] = [];
  for (const entry of state.entries.values()) {
    if (matchesQuery(entry, query)) {
      results.push(toLoreEntry(entry));
    }
  }
  return results;
}

function queryByWorldImpl(
  state: LoreState,
  worldId: string,
  includeSecret: boolean,
): readonly LoreEntry[] {
  const entryIds = state.worldIndex.get(worldId);
  if (entryIds === undefined) return [];
  const results: LoreEntry[] = [];
  for (const entryId of entryIds) {
    const entry = state.entries.get(entryId);
    if (entry === undefined) continue;
    if (!includeSecret && entry.lock.locked) continue;
    results.push(toLoreEntry(entry));
  }
  return results;
}

function queryByCategoryImpl(state: LoreState, category: LoreCategory): readonly LoreEntry[] {
  const entryIds = state.categoryIndex.get(category);
  if (entryIds === undefined) return [];
  const results: LoreEntry[] = [];
  for (const entryId of entryIds) {
    const entry = state.entries.get(entryId);
    if (entry === undefined) continue;
    results.push(toLoreEntry(entry));
  }
  return results;
}

function getStatsImpl(state: LoreState): CompendiumStats {
  let lockedCount = 0;
  const categoryCounts: Record<LoreCategory, number> = {
    HISTORY: 0,
    MYTHOLOGY: 0,
    FACTION: 0,
    GEOGRAPHY: 0,
    BIOGRAPHY: 0,
    PROPHECY: 0,
  };
  for (const entry of state.entries.values()) {
    if (entry.lock.locked) lockedCount++;
    categoryCounts[entry.category]++;
  }
  return {
    totalEntries: state.entries.size,
    lockedEntries: lockedCount,
    entriesByCategory: categoryCounts,
    totalTags: state.tagIndex.size,
    worldCount: state.worldIndex.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createLoreCompendium(deps: LoreDeps): LoreCompendium {
  const state: LoreState = {
    deps,
    entries: new Map(),
    tagIndex: new Map(),
    worldIndex: new Map(),
    categoryIndex: new Map(),
  };
  return {
    addEntry: (p) => addEntryImpl(state, p),
    updateEntry: (p) => updateEntryImpl(state, p),
    unlockEntry: (id, dId) => unlockEntryImpl(state, id, dId),
    getEntry: (id) => {
      const e = state.entries.get(id);
      if (e === undefined) return undefined;
      return toLoreEntry(e);
    },
    queryByTags: (q) => queryByTagsImpl(state, q),
    queryByWorld: (wId, incl) => queryByWorldImpl(state, wId, incl),
    queryByCategory: (cat) => queryByCategoryImpl(state, cat),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createLoreCompendium };
export type {
  LoreCompendium,
  LoreDeps,
  LoreClockPort,
  LoreIdPort,
  LoreLoggerPort,
  LoreEntry,
  LoreCategory,
  LoreTag,
  LoreLock,
  AddEntryParams,
  UpdateEntryParams,
  LoreQuery,
  UnlockResult,
  CompendiumStats,
};
