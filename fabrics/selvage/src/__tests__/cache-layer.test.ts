import { describe, it, expect, beforeEach } from 'vitest';
import { createCacheLayer, DEFAULT_CACHE_LAYER_CONFIG } from '../cache-layer.js';
import type { CacheLayerDeps } from '../cache-layer.js';

function createDeps(startTime = 0): { deps: CacheLayerDeps; advance: (micro: number) => void } {
  let time = startTime;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      log: { info: () => {} },
    },
    advance: (micro: number) => {
      time += micro;
    },
  };
}

const TTL = 30_000_000; // 30 seconds default

describe('CacheLayerService — get and set', () => {
  it('stores and retrieves a value', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'k1', value: { data: 'hello' } });
    expect(cache.get('k1')).toEqual({ data: 'hello' });
  });

  it('returns undefined for unknown key', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    expect(cache.get('unknown')).toBeUndefined();
  });

  it('returns undefined for expired entry', () => {
    const { deps, advance } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 100, defaultTtlMicro: TTL });
    cache.set({ key: 'k1', value: 'test' });
    advance(TTL);
    expect(cache.get('k1')).toBeUndefined();
  });

  it('respects custom TTL per entry', () => {
    const { deps, advance } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 100, defaultTtlMicro: TTL });
    cache.set({ key: 'short', value: 'a', ttlMicro: 1000 });
    advance(1000);
    expect(cache.get('short')).toBeUndefined();
  });

  it('overwrites existing key', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'k1', value: 'old' });
    cache.set({ key: 'k1', value: 'new' });
    expect(cache.get('k1')).toBe('new');
  });

  it('has returns true for valid entry', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'k1', value: 'v' });
    expect(cache.has('k1')).toBe(true);
  });

  it('has returns false for expired entry', () => {
    const { deps, advance } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 100, defaultTtlMicro: 1000 });
    cache.set({ key: 'k1', value: 'v' });
    advance(1000);
    expect(cache.has('k1')).toBe(false);
  });

  it('has returns false for unknown key', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    expect(cache.has('nope')).toBe(false);
  });
});

describe('CacheLayerService — LRU eviction', () => {
  it('evicts least recently used when at capacity', () => {
    const { deps, advance } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 3, defaultTtlMicro: TTL });
    cache.set({ key: 'a', value: 1 });
    advance(10);
    cache.set({ key: 'b', value: 2 });
    advance(10);
    cache.set({ key: 'c', value: 3 });
    advance(10);
    // 'a' is LRU -- adding 'd' should evict 'a'
    cache.set({ key: 'd', value: 4 });
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('d')).toBe(4);
  });

  it('access updates LRU order', () => {
    const { deps, advance } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 3, defaultTtlMicro: TTL });
    cache.set({ key: 'a', value: 1 });
    advance(10);
    cache.set({ key: 'b', value: 2 });
    advance(10);
    cache.set({ key: 'c', value: 3 });
    advance(10);
    // Access 'a' so it is no longer LRU
    cache.get('a');
    advance(10);
    // 'b' is now LRU -- evict it
    cache.set({ key: 'd', value: 4 });
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
  });

  it('tracks eviction count', () => {
    const { deps, advance } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 2, defaultTtlMicro: TTL });
    cache.set({ key: 'a', value: 1 });
    advance(10);
    cache.set({ key: 'b', value: 2 });
    advance(10);
    cache.set({ key: 'c', value: 3 });
    expect(cache.getStats().evictionCount).toBe(1);
  });

  it('does not evict when updating existing key', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 2, defaultTtlMicro: TTL });
    cache.set({ key: 'a', value: 1 });
    cache.set({ key: 'b', value: 2 });
    cache.set({ key: 'a', value: 3 }); // update, not insert
    expect(cache.getStats().evictionCount).toBe(0);
    expect(cache.getStats().totalEntries).toBe(2);
  });
});

describe('CacheLayerService — invalidation', () => {
  it('invalidates a specific key', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'k1', value: 'data' });
    expect(cache.invalidate('k1')).toBe(true);
    expect(cache.get('k1')).toBeUndefined();
  });

  it('returns false when invalidating unknown key', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    expect(cache.invalidate('nope')).toBe(false);
  });

  it('invalidates by pattern (substring match)', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: '/api/users/1', value: 'u1' });
    cache.set({ key: '/api/users/2', value: 'u2' });
    cache.set({ key: '/api/posts/1', value: 'p1' });
    const result = cache.invalidateByPattern('/api/users');
    expect(result.removedCount).toBe(2);
    expect(cache.get('/api/posts/1')).toBe('p1');
  });

  it('invalidates by prefix', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'GET:/api/v1/users', value: 'u' });
    cache.set({ key: 'GET:/api/v1/posts', value: 'p' });
    cache.set({ key: 'POST:/api/v1/users', value: 'c' });
    const result = cache.invalidateByPrefix('GET:/api/v1');
    expect(result.removedCount).toBe(2);
    expect(cache.get('POST:/api/v1/users')).toBe('c');
  });

  it('tracks invalidation count', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'a', value: 1 });
    cache.set({ key: 'b', value: 2 });
    cache.invalidate('a');
    cache.invalidate('b');
    expect(cache.getStats().invalidationCount).toBe(2);
  });

  it('pattern invalidation with no matches returns zero', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'a', value: 1 });
    const result = cache.invalidateByPattern('zzz');
    expect(result.removedCount).toBe(0);
  });
});

describe('CacheLayerService — cache key generation', () => {
  it('generates key from method and path', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    const key = cache.generateKey({ method: 'GET', path: '/users', query: {}, version: undefined });
    expect(key).toBe('GET:/users');
  });

  it('includes sorted query params', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    const key = cache.generateKey({
      method: 'GET',
      path: '/users',
      query: { z: '1', a: '2' },
      version: undefined,
    });
    expect(key).toBe('GET:/users?a=2&z=1');
  });

  it('includes version when provided', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    const key = cache.generateKey({
      method: 'GET',
      path: '/users',
      query: {},
      version: 'v2',
    });
    expect(key).toBe('GET:/users#v2');
  });

  it('includes query and version together', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    const key = cache.generateKey({
      method: 'POST',
      path: '/data',
      query: { limit: '10' },
      version: 'v3',
    });
    expect(key).toBe('POST:/data?limit=10#v3');
  });
});

describe('CacheLayerService — sweep, clear, and stats', () => {
  it('sweeps expired entries', () => {
    const { deps, advance } = createDeps();
    const cache = createCacheLayer(deps, { maxEntries: 100, defaultTtlMicro: TTL });
    cache.set({ key: 'a', value: 1 });
    cache.set({ key: 'b', value: 2 });
    advance(TTL);
    cache.set({ key: 'c', value: 3 });
    const removed = cache.sweep();
    expect(removed).toBe(2);
    expect(cache.getStats().totalEntries).toBe(1);
  });

  it('clears all entries', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'a', value: 1 });
    cache.set({ key: 'b', value: 2 });
    cache.clear();
    expect(cache.getStats().totalEntries).toBe(0);
  });

  it('tracks hit and miss counts', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'k1', value: 'v1' });
    cache.get('k1'); // hit
    cache.get('k1'); // hit
    cache.get('miss'); // miss
    const stats = cache.getStats();
    expect(stats.hitCount).toBe(2);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3);
  });

  it('reports zero hit rate when no requests', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    expect(cache.getStats().hitRate).toBe(0);
  });

  it('tracks total size estimate', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'a', value: 1, sizeEstimate: 100 });
    cache.set({ key: 'b', value: 2, sizeEstimate: 200 });
    expect(cache.getStats().totalSizeEstimate).toBe(300);
  });

  it('getEntry returns entry details', () => {
    const { deps } = createDeps(5000);
    const cache = createCacheLayer(deps, { maxEntries: 100, defaultTtlMicro: TTL });
    cache.set({ key: 'k1', value: 'v1', sizeEstimate: 42 });
    const entry = cache.getEntry('k1');
    expect(entry).toBeDefined();
    expect(entry?.key).toBe('k1');
    expect(entry?.storedAt).toBe(5000);
    expect(entry?.sizeEstimate).toBe(42);
  });

  it('getEntry returns undefined for missing key', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    expect(cache.getEntry('nope')).toBeUndefined();
  });

  it('uses default size estimate of 1', () => {
    const { deps } = createDeps();
    const cache = createCacheLayer(deps);
    cache.set({ key: 'k1', value: 'v1' });
    expect(cache.getEntry('k1')?.sizeEstimate).toBe(1);
  });
});
