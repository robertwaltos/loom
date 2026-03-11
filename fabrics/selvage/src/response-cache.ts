/**
 * response-cache.ts — Response cache for API endpoints.
 *
 * TTL-based cache with configurable maximum entries. Supports
 * get, set, invalidation, and sweep for expired entries.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CacheClock {
  readonly nowMicroseconds: () => number;
}

interface ResponseCacheDeps {
  readonly clock: CacheClock;
}

// ── Types ────────────────────────────────────────────────────────

interface CacheEntry {
  readonly key: string;
  readonly value: unknown;
  readonly storedAt: number;
  readonly expiresAt: number;
}

interface CacheConfig {
  readonly maxEntries: number;
  readonly defaultTtlMicro: number;
}

interface SetCacheParams {
  readonly key: string;
  readonly value: unknown;
  readonly ttlMicro?: number;
}

interface ResponseCacheStats {
  readonly totalEntries: number;
  readonly hitCount: number;
  readonly missCount: number;
}

interface ResponseCacheService {
  readonly get: (key: string) => unknown;
  readonly set: (params: SetCacheParams) => void;
  readonly invalidate: (key: string) => boolean;
  readonly sweep: () => number;
  readonly clear: () => void;
  readonly getStats: () => ResponseCacheStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxEntries: 1000,
  defaultTtlMicro: 60_000_000, // 60 seconds
};

// ── State ────────────────────────────────────────────────────────

interface CacheState {
  readonly deps: ResponseCacheDeps;
  readonly config: CacheConfig;
  readonly entries: Map<string, CacheEntry>;
  hitCount: number;
  missCount: number;
}

// ── Operations ───────────────────────────────────────────────────

function getImpl(state: CacheState, key: string): unknown {
  const entry = state.entries.get(key);
  if (!entry) {
    state.missCount++;
    return undefined;
  }
  if (state.deps.clock.nowMicroseconds() >= entry.expiresAt) {
    state.entries.delete(key);
    state.missCount++;
    return undefined;
  }
  state.hitCount++;
  return entry.value;
}

function setImpl(state: CacheState, params: SetCacheParams): void {
  if (state.entries.size >= state.config.maxEntries && !state.entries.has(params.key)) {
    return;
  }
  const now = state.deps.clock.nowMicroseconds();
  const ttl = params.ttlMicro ?? state.config.defaultTtlMicro;
  state.entries.set(params.key, {
    key: params.key,
    value: params.value,
    storedAt: now,
    expiresAt: now + ttl,
  });
}

function sweepImpl(state: CacheState): number {
  const now = state.deps.clock.nowMicroseconds();
  let removed = 0;
  for (const [key, entry] of state.entries) {
    if (now >= entry.expiresAt) {
      state.entries.delete(key);
      removed++;
    }
  }
  return removed;
}

// ── Factory ──────────────────────────────────────────────────────

function createResponseCache(
  deps: ResponseCacheDeps,
  config: CacheConfig = DEFAULT_CACHE_CONFIG,
): ResponseCacheService {
  const state: CacheState = { deps, config, entries: new Map(), hitCount: 0, missCount: 0 };
  return {
    get: (key) => getImpl(state, key),
    set: (p) => {
      setImpl(state, p);
    },
    invalidate: (key) => state.entries.delete(key),
    sweep: () => sweepImpl(state),
    clear: () => {
      state.entries.clear();
    },
    getStats: () => ({
      totalEntries: state.entries.size,
      hitCount: state.hitCount,
      missCount: state.missCount,
    }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createResponseCache, DEFAULT_CACHE_CONFIG };
export type {
  ResponseCacheService,
  ResponseCacheDeps,
  CacheEntry,
  CacheConfig,
  SetCacheParams,
  ResponseCacheStats,
};
