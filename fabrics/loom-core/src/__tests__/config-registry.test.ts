import { describe, it, expect } from 'vitest';
import { createConfigRegistry } from '../config-registry.js';
import type { ConfigRegistryDeps } from '../config-registry.js';

function makeDeps(): ConfigRegistryDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('ConfigRegistry — set and get', () => {
  it('sets and gets a config value', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'game', key: 'tickRate', value: '60' });
    expect(reg.get('game', 'tickRate')).toBe('60');
  });

  it('returns undefined for missing key', () => {
    const reg = createConfigRegistry(makeDeps());
    expect(reg.get('game', 'missing')).toBeUndefined();
  });

  it('overwrites existing value', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'game', key: 'tickRate', value: '60' });
    reg.set({ namespace: 'game', key: 'tickRate', value: '120' });
    expect(reg.get('game', 'tickRate')).toBe('120');
  });

  it('returns default when missing', () => {
    const reg = createConfigRegistry(makeDeps());
    expect(reg.getOrDefault('game', 'missing', 'default')).toBe('default');
  });

  it('returns value instead of default when present', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'game', key: 'mode', value: 'pvp' });
    expect(reg.getOrDefault('game', 'mode', 'pve')).toBe('pvp');
  });
});

describe('ConfigRegistry — typed getters', () => {
  it('gets number value', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'physics', key: 'gravity', value: '9.81' });
    expect(reg.getNumber('physics', 'gravity')).toBe(9.81);
  });

  it('returns undefined for non-numeric', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'game', key: 'name', value: 'loom' });
    expect(reg.getNumber('game', 'name')).toBeUndefined();
  });

  it('returns undefined for missing number', () => {
    const reg = createConfigRegistry(makeDeps());
    expect(reg.getNumber('x', 'y')).toBeUndefined();
  });

  it('gets boolean true', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'debug', key: 'enabled', value: 'true' });
    expect(reg.getBoolean('debug', 'enabled')).toBe(true);
  });

  it('gets boolean false', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'debug', key: 'enabled', value: 'false' });
    expect(reg.getBoolean('debug', 'enabled')).toBe(false);
  });

  it('returns undefined for non-boolean', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'x', key: 'y', value: 'maybe' });
    expect(reg.getBoolean('x', 'y')).toBeUndefined();
  });
});

describe('ConfigRegistry — has and remove', () => {
  it('checks key existence', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'a', key: 'b', value: 'c' });
    expect(reg.has('a', 'b')).toBe(true);
    expect(reg.has('a', 'missing')).toBe(false);
  });

  it('removes a key', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'a', key: 'b', value: 'c' });
    expect(reg.remove('a', 'b')).toBe(true);
    expect(reg.has('a', 'b')).toBe(false);
  });

  it('returns false for unknown removal', () => {
    const reg = createConfigRegistry(makeDeps());
    expect(reg.remove('a', 'b')).toBe(false);
  });
});

describe('ConfigRegistry — namespace listing', () => {
  it('lists entries in a namespace', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'game', key: 'a', value: '1' });
    reg.set({ namespace: 'game', key: 'b', value: '2' });
    reg.set({ namespace: 'other', key: 'c', value: '3' });
    expect(reg.listNamespace('game')).toHaveLength(2);
  });

  it('returns empty for unknown namespace', () => {
    const reg = createConfigRegistry(makeDeps());
    expect(reg.listNamespace('unknown')).toHaveLength(0);
  });
});

describe('ConfigRegistry — bulk load', () => {
  it('loads multiple entries', () => {
    const reg = createConfigRegistry(makeDeps());
    const count = reg.loadBulk([
      { namespace: 'a', key: 'x', value: '1' },
      { namespace: 'a', key: 'y', value: '2' },
      { namespace: 'b', key: 'z', value: '3' },
    ]);
    expect(count).toBe(3);
    expect(reg.get('a', 'x')).toBe('1');
    expect(reg.get('b', 'z')).toBe('3');
  });
});

describe('ConfigRegistry — stats', () => {
  it('tracks aggregate statistics', () => {
    const reg = createConfigRegistry(makeDeps());
    reg.set({ namespace: 'a', key: 'x', value: '1' });
    reg.set({ namespace: 'b', key: 'y', value: '2' });
    reg.set({ namespace: 'a', key: 'x', value: 'updated' });
    const stats = reg.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.namespaces).toBe(2);
    expect(stats.totalSets).toBe(3);
  });

  it('starts with zero stats', () => {
    const reg = createConfigRegistry(makeDeps());
    const stats = reg.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalSets).toBe(0);
  });
});
