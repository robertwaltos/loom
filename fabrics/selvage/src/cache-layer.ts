/**
 * cache-layer.ts — Advanced response caching layer for the Selvage gateway.
 *
 * TTL-based cache with LRU eviction, cache key generation from
 * request parameters, pattern-based invalidation, and hit/miss
 * tracking. Size-bounded with configurable max entries.
 *
 * Distinct from response-cache.ts: this module adds LRU eviction,
 * pattern invalidation, and structured cache key generation.
 *
 * "The loom remembers what was recently woven."
 */

// ── Ports ────────────────────────────────────────────────────────

interface CacheLayerClock {
  readonly nowMicroseconds: () => number;
}

interface CacheLayerLogPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
}

interface CacheLayerDeps {
  readonly clock: CacheLayerClock;
  readonly log: CacheLayerLogPort;
}

// ── Types ────────────────────────────────────────────────────────

interface CacheLayerConfig {
  readonly maxEntries: number;
  readonly defaultTtlMicro: number;
}

interface CacheLayerEntry {
  readonly key: string;
  readonly value: unknown;
  readonly storedAt: number;
  readonly expiresAt: number;
  readonly sizeEstimate: number;
}

interface CacheKeyParams {
  readonly method: string;
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  readonly version: string | undefined;
}

interface SetCacheLayerParams {
  readonly key: string;
  readonly value: unknown;
  readonly ttlMicro?: number;
  readonly sizeEstimate?: number;
}

interface CacheLayerStats {
  readonly totalEntries: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly evictionCount: number;
  readonly invalidationCount: number;
  readonly totalSizeEstimate: number;
  readonly hitRate: number;
}

interface InvalidateByPatternResult {
  readonly removedCount: number;
  readonly pattern: string;
}

interface CacheLayerService {
  readonly get: (key: string) => unknown;
  readonly set: (params: SetCacheLayerParams) => void;
  readonly has: (key: string) => boolean;
  readonly invalidate: (key: string) => boolean;
  readonly invalidateByPattern: (pattern: string) => InvalidateByPatternResult;
  readonly invalidateByPrefix: (prefix: string) => InvalidateByPatternResult;
  readonly generateKey: (params: CacheKeyParams) => string;
  readonly sweep: () => number;
  readonly clear: () => void;
  readonly getEntry: (key: string) => CacheLayerEntry | undefined;
  readonly getStats: () => CacheLayerStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_CACHE_LAYER_CONFIG: CacheLayerConfig = {
  maxEntries: 2000,
  defaultTtlMicro: 30_000_000, // 30 seconds
};

const DEFAULT_SIZE_ESTIMATE = 1;

// ── State ────────────────────────────────────────────────────────

interface MutableCacheEntry {
  readonly key: string;
  readonly value: unknown;
  readonly storedAt: number;
  readonly expiresAt: number;
  readonly sizeEstimate: number;
  lastAccessedAt: number;
}

interface CacheLayerState {
  readonly deps: CacheLayerDeps;
  readonly config: CacheLayerConfig;
  readonly entries: Map<string, MutableCacheEntry>;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  invalidationCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonlyEntry(entry: MutableCacheEntry): CacheLayerEntry {
  return {
    key: entry.key,
    value: entry.value,
    storedAt: entry.storedAt,
    expiresAt: entry.expiresAt,
    sizeEstimate: entry.sizeEstimate,
  };
}

function isExpired(entry: MutableCacheEntry, now: number): boolean {
  return now >= entry.expiresAt;
}

function findLruKey(entries: Map<string, MutableCacheEntry>): string | undefined {
  let oldestKey: string | undefined;
  let oldestAccess = Infinity;
  for (const [key, entry] of entries) {
    if (entry.lastAccessedAt < oldestAccess) {
      oldestAccess = entry.lastAccessedAt;
      oldestKey = key;
    }
  }
  return oldestKey;
}

function computeTotalSize(entries: Map<string, MutableCacheEntry>): number {
  let total = 0;
  for (const entry of entries.values()) {
    total += entry.sizeEstimate;
  }
  return total;
}

function sortQueryKeys(query: Readonly<Record<string, string>>): string {
  const keys = Object.keys(query);
  keys.sort();
  const parts: string[] = [];
  for (const k of keys) {
    const val = query[k];
    if (val !== undefined) {
      parts.push(k + '=' + val);
    }
  }
  return parts.join('&');
}

// ── Operations ───────────────────────────────────────────────────

function getImpl(state: CacheLayerState, key: string): unknown {
  const entry = state.entries.get(key);
  if (!entry) {
    state.missCount += 1;
    return undefined;
  }
  const now = state.deps.clock.nowMicroseconds();
  if (isExpired(entry, now)) {
    state.entries.delete(key);
    state.missCount += 1;
    return undefined;
  }
  entry.lastAccessedAt = now;
  state.hitCount += 1;
  return entry.value;
}

function setImpl(state: CacheLayerState, params: SetCacheLayerParams): void {
  evictIfNeeded(state, params.key);
  const now = state.deps.clock.nowMicroseconds();
  const ttl = params.ttlMicro ?? state.config.defaultTtlMicro;
  state.entries.set(params.key, {
    key: params.key,
    value: params.value,
    storedAt: now,
    expiresAt: now + ttl,
    sizeEstimate: params.sizeEstimate ?? DEFAULT_SIZE_ESTIMATE,
    lastAccessedAt: now,
  });
}

function evictIfNeeded(state: CacheLayerState, incomingKey: string): void {
  if (state.entries.has(incomingKey)) return;
  if (state.entries.size < state.config.maxEntries) return;
  evictLru(state);
}

function evictLru(state: CacheLayerState): void {
  const lruKey = findLruKey(state.entries);
  if (lruKey !== undefined) {
    state.entries.delete(lruKey);
    state.evictionCount += 1;
  }
}

function hasImpl(state: CacheLayerState, key: string): boolean {
  const entry = state.entries.get(key);
  if (!entry) return false;
  if (isExpired(entry, state.deps.clock.nowMicroseconds())) {
    state.entries.delete(key);
    return false;
  }
  return true;
}

function invalidateImpl(state: CacheLayerState, key: string): boolean {
  const deleted = state.entries.delete(key);
  if (deleted) state.invalidationCount += 1;
  return deleted;
}

function invalidateByPatternImpl(
  state: CacheLayerState,
  pattern: string,
): InvalidateByPatternResult {
  let removed = 0;
  const keysToRemove: string[] = [];
  for (const key of state.entries.keys()) {
    if (key.includes(pattern)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    state.entries.delete(key);
    removed += 1;
  }
  state.invalidationCount += removed;
  return { removedCount: removed, pattern };
}

function invalidateByPrefixImpl(state: CacheLayerState, prefix: string): InvalidateByPatternResult {
  let removed = 0;
  const keysToRemove: string[] = [];
  for (const key of state.entries.keys()) {
    if (key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    state.entries.delete(key);
    removed += 1;
  }
  state.invalidationCount += removed;
  return { removedCount: removed, pattern: prefix };
}

function generateKeyImpl(params: CacheKeyParams): string {
  let key = params.method + ':' + params.path;
  const queryStr = sortQueryKeys(params.query);
  if (queryStr.length > 0) {
    key = key + '?' + queryStr;
  }
  if (params.version !== undefined) {
    key = key + '#' + params.version;
  }
  return key;
}

function sweepImpl(state: CacheLayerState): number {
  const now = state.deps.clock.nowMicroseconds();
  let removed = 0;
  const keysToRemove: string[] = [];
  for (const [key, entry] of state.entries) {
    if (isExpired(entry, now)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    state.entries.delete(key);
    removed += 1;
  }
  return removed;
}

function getStatsImpl(state: CacheLayerState): CacheLayerStats {
  const total = state.hitCount + state.missCount;
  const hitRate = total > 0 ? state.hitCount / total : 0;
  return {
    totalEntries: state.entries.size,
    hitCount: state.hitCount,
    missCount: state.missCount,
    evictionCount: state.evictionCount,
    invalidationCount: state.invalidationCount,
    totalSizeEstimate: computeTotalSize(state.entries),
    hitRate,
  };
}

// ── Accessors ────────────────────────────────────────────────────

function getEntryImpl(state: CacheLayerState, key: string): CacheLayerEntry | undefined {
  const e = state.entries.get(key);
  return e ? toReadonlyEntry(e) : undefined;
}

function initState(deps: CacheLayerDeps, config: CacheLayerConfig): CacheLayerState {
  return {
    deps,
    config,
    entries: new Map(),
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    invalidationCount: 0,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createCacheLayer(
  deps: CacheLayerDeps,
  config: CacheLayerConfig = DEFAULT_CACHE_LAYER_CONFIG,
): CacheLayerService {
  const state = initState(deps, config);
  return {
    get: (k) => getImpl(state, k),
    set: (p) => {
      setImpl(state, p);
    },
    has: (k) => hasImpl(state, k),
    invalidate: (k) => invalidateImpl(state, k),
    invalidateByPattern: (p) => invalidateByPatternImpl(state, p),
    invalidateByPrefix: (p) => invalidateByPrefixImpl(state, p),
    generateKey: (p) => generateKeyImpl(p),
    sweep: () => sweepImpl(state),
    clear: () => {
      state.entries.clear();
    },
    getEntry: (k) => getEntryImpl(state, k),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createCacheLayer, DEFAULT_CACHE_LAYER_CONFIG };
export type {
  CacheLayerService,
  CacheLayerDeps,
  CacheLayerClock,
  CacheLayerLogPort,
  CacheLayerConfig,
  CacheLayerEntry,
  CacheKeyParams,
  SetCacheLayerParams,
  CacheLayerStats,
  InvalidateByPatternResult,
};
