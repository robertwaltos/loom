import { describe, it, expect } from 'vitest';
import { createResponseCache } from '../response-cache.js';

function makeCache(start = 0) {
  let time = start;
  return {
    cache: createResponseCache({ clock: { nowMicroseconds: () => time } }, { maxEntries: 100, defaultTtlMicro: 10_000_000 }),
    advance: (us: number) => { time += us; },
  };
}

describe('Response Cache Simulation', () => {
  it('stores and retrieves cached responses', () => {
    const { cache } = makeCache();

    cache.set({ key: 'GET:/players', value: { data: [{ id: 1 }] } });
    cache.set({ key: 'GET:/world', value: { status: 'active' } });

    const r = cache.get('GET:/players');
    expect(r).toBeDefined();
    expect((r as { data: unknown[] }).data).toHaveLength(1);

    expect(cache.get('GET:/world')).toBeDefined();
    expect(cache.getStats().totalEntries).toBe(2);
  });

  it('returns undefined for missing or expired entries', () => {
    const { cache, advance } = makeCache(0);

    cache.set({ key: 'short', value: 'transient', ttlMicro: 500 });
    advance(1_000);

    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('invalidates entries on demand', () => {
    const { cache } = makeCache();

    cache.set({ key: 'GET:/config', value: { version: 1 } });
    cache.invalidate('GET:/config');

    expect(cache.get('GET:/config')).toBeUndefined();
  });

  it('sweeps stale entries but preserves valid ones', () => {
    const { cache, advance } = makeCache(0);

    cache.set({ key: 'old', value: 1, ttlMicro: 1_000 });
    cache.set({ key: 'new', value: 2, ttlMicro: 10_000_000 });

    advance(2_000);
    cache.sweep();

    expect(cache.get('old')).toBeUndefined();
    expect(cache.get('new')).toBe(2);
    expect(cache.getStats().totalEntries).toBe(1);
  });
});
