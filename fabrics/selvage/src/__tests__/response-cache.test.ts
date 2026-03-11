import { describe, it, expect } from 'vitest';
import { createResponseCache } from '../response-cache.js';
import type { ResponseCacheDeps } from '../response-cache.js';

function createDeps(): { deps: ResponseCacheDeps; advance: (micro: number) => void } {
  let time = 0;
  return {
    deps: { clock: { nowMicroseconds: () => time } },
    advance: (micro: number) => {
      time += micro;
    },
  };
}

const TTL = 60_000_000; // 60 seconds

describe('ResponseCacheService — get and set', () => {
  it('stores and retrieves a value', () => {
    const { deps } = createDeps();
    const cache = createResponseCache(deps);
    cache.set({ key: 'k1', value: { data: 'hello' } });
    expect(cache.get('k1')).toEqual({ data: 'hello' });
  });

  it('returns undefined for unknown key', () => {
    const { deps } = createDeps();
    const cache = createResponseCache(deps);
    expect(cache.get('unknown')).toBeUndefined();
  });

  it('returns undefined for expired entry', () => {
    const { deps, advance } = createDeps();
    const cache = createResponseCache(deps, { maxEntries: 100, defaultTtlMicro: TTL });
    cache.set({ key: 'k1', value: 'test' });
    advance(TTL);
    expect(cache.get('k1')).toBeUndefined();
  });

  it('respects custom TTL per entry', () => {
    const { deps, advance } = createDeps();
    const cache = createResponseCache(deps, { maxEntries: 100, defaultTtlMicro: TTL });
    cache.set({ key: 'short', value: 'a', ttlMicro: 1000 });
    advance(1000);
    expect(cache.get('short')).toBeUndefined();
  });

  it('rejects new entries when at capacity', () => {
    const { deps } = createDeps();
    const cache = createResponseCache(deps, { maxEntries: 2, defaultTtlMicro: TTL });
    cache.set({ key: 'a', value: 1 });
    cache.set({ key: 'b', value: 2 });
    cache.set({ key: 'c', value: 3 });
    expect(cache.get('c')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
  });
});

describe('ResponseCacheService — invalidate and sweep', () => {
  it('invalidates a specific key', () => {
    const { deps } = createDeps();
    const cache = createResponseCache(deps);
    cache.set({ key: 'k1', value: 'data' });
    expect(cache.invalidate('k1')).toBe(true);
    expect(cache.get('k1')).toBeUndefined();
  });

  it('returns false when invalidating unknown key', () => {
    const { deps } = createDeps();
    const cache = createResponseCache(deps);
    expect(cache.invalidate('unknown')).toBe(false);
  });

  it('sweeps expired entries', () => {
    const { deps, advance } = createDeps();
    const cache = createResponseCache(deps, { maxEntries: 100, defaultTtlMicro: TTL });
    cache.set({ key: 'a', value: 1 });
    cache.set({ key: 'b', value: 2 });
    advance(TTL);
    cache.set({ key: 'c', value: 3 });
    const removed = cache.sweep();
    expect(removed).toBe(2);
    expect(cache.getStats().totalEntries).toBe(1);
  });
});

describe('ResponseCacheService — clear and stats', () => {
  it('clears all entries', () => {
    const { deps } = createDeps();
    const cache = createResponseCache(deps);
    cache.set({ key: 'a', value: 1 });
    cache.set({ key: 'b', value: 2 });
    cache.clear();
    expect(cache.getStats().totalEntries).toBe(0);
  });

  it('tracks hit and miss counts', () => {
    const { deps } = createDeps();
    const cache = createResponseCache(deps);
    cache.set({ key: 'k1', value: 'v1' });
    cache.get('k1'); // hit
    cache.get('k1'); // hit
    cache.get('miss'); // miss
    const stats = cache.getStats();
    expect(stats.hitCount).toBe(2);
    expect(stats.missCount).toBe(1);
  });
});
