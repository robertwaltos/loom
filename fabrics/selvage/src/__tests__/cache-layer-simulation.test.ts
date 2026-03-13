import { describe, it, expect } from 'vitest';
import { createCacheLayer, DEFAULT_CACHE_LAYER_CONFIG } from '../cache-layer.js';

function makeDeps(start = 0) {
  let time = start;
  return {
    deps: { clock: { nowMicroseconds: () => time }, log: { info: () => {} } },
    advance: (us: number) => { time += us; },
  };
}

describe('Cache Layer Simulation', () => {
  it('stores and retrieves entries within TTL', () => {
    const { deps } = makeDeps(0);
    const cache = createCacheLayer(deps);

    cache.set({ key: 'player:1', value: { x: 10, y: 20 }, ttlMicro: 5_000_000 });
    cache.set({ key: 'player:2', value: { x: 30, y: 40 } });
    cache.set({ key: 'world:info', value: 'open', ttlMicro: 1_000_000 });

    expect(cache.get('player:1')).toEqual({ x: 10, y: 20 });
    expect(cache.get('player:2')).toBeDefined();
    expect(cache.has('world:info')).toBe(true);
    expect(cache.getStats().totalEntries).toBe(3);
  });

  it('expires entries after TTL and sweeps them', () => {
    const { deps, advance } = makeDeps(0);
    const cache = createCacheLayer(deps);

    cache.set({ key: 'short-lived', value: 'transient', ttlMicro: 1_000 });
    cache.set({ key: 'long-lived', value: 'persistent', ttlMicro: 10_000_000 });

    advance(2_000);
    expect(cache.get('short-lived')).toBeUndefined();
    expect(cache.get('long-lived')).toBe('persistent');

    cache.sweep();
    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(1);
  });

  it('deletes entries explicitly', () => {
    const { deps } = makeDeps(0);
    const cache = createCacheLayer(deps);

    cache.set({ key: 'session:abc', value: { token: 'xyz' } });
    expect(cache.has('session:abc')).toBe(true);

    cache.invalidate('session:abc');
    expect(cache.has('session:abc')).toBe(false);
    expect(cache.get('session:abc')).toBeUndefined();
  });

  it('uses DEFAULT_CACHE_LAYER_CONFIG values', () => {
    expect(DEFAULT_CACHE_LAYER_CONFIG.maxEntries).toBeGreaterThan(0);
    expect(DEFAULT_CACHE_LAYER_CONFIG.defaultTtlMicro).toBeGreaterThan(0);
  });
});
