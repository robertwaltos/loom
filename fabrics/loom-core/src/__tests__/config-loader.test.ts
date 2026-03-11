/**
 * config-loader.test.ts — Tests for ConfigLoaderSystem
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConfigLoaderSystem,
  type ConfigLoaderSystem,
  type ConfigLoaderDeps,
} from '../config-loader.js';

function makeDeps(): ConfigLoaderDeps {
  let time = 1_000_000n;
  let id = 0;
  return {
    clock: { nowUs: () => (time += 1_000n) },
    idGen: { generate: () => 'cfg-' + String(id++) },
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

let sys: ConfigLoaderSystem;

beforeEach(() => {
  sys = createConfigLoaderSystem(makeDeps());
});

describe('ConfigLoader — setConfig', () => {
  it('creates a new entry with version 1', () => {
    const result = sys.setConfig('tick.rate', 'SYSTEM', 64);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.entry.key).toBe('tick.rate');
      expect(result.entry.scope).toBe('SYSTEM');
      expect(result.entry.value).toBe(64);
      expect(result.entry.version).toBe(1);
    }
  });

  it('updates existing entry and increments version', () => {
    sys.setConfig('max.players', 'GLOBAL', 100);
    const result = sys.setConfig('max.players', 'GLOBAL', 200);
    expect(result.success).toBe(true);
    if (result.success) expect(result.entry.version).toBe(2);
  });

  it('stores bigint values', () => {
    const result = sys.setConfig('spawn.cooldown', 'SYSTEM', 5_000_000n);
    expect(result.success).toBe(true);
    if (result.success) expect(result.entry.value).toBe(5_000_000n);
  });

  it('stores boolean values', () => {
    const result = sys.setConfig('feature.pvp', 'WORLD', true);
    expect(result.success).toBe(true);
    if (result.success) expect(result.entry.value).toBe(true);
  });

  it('returns read-only error when key is marked read-only', () => {
    sys.setConfig('engine.version', 'GLOBAL', '1.0.0');
    sys.markReadOnly('engine.version');
    const result = sys.setConfig('engine.version', 'GLOBAL', '2.0.0');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('read-only');
  });
});

describe('ConfigLoader — getConfig', () => {
  it('retrieves a stored config entry', () => {
    sys.setConfig('world.seed', 'WORLD', 'abc123');
    const entry = sys.getConfig('world.seed');
    expect(entry).toBeDefined();
    expect(entry?.value).toBe('abc123');
  });

  it('returns undefined for missing key', () => {
    expect(sys.getConfig('missing.key')).toBeUndefined();
  });
});

describe('ConfigLoader — getConfigByScope', () => {
  it('returns all entries for a given scope', () => {
    sys.setConfig('a', 'GLOBAL', 1);
    sys.setConfig('b', 'WORLD', 2);
    sys.setConfig('c', 'GLOBAL', 3);
    const global = sys.getConfigByScope('GLOBAL');
    expect(global).toHaveLength(2);
    expect(global.every((e) => e.scope === 'GLOBAL')).toBe(true);
  });

  it('returns empty array when no entries match scope', () => {
    sys.setConfig('a', 'SYSTEM', 1);
    expect(sys.getConfigByScope('PLAYER')).toHaveLength(0);
  });
});

describe('ConfigLoader — markReadOnly', () => {
  it('marks an entry read-only and blocks updates', () => {
    sys.setConfig('core.tick', 'SYSTEM', 60);
    sys.markReadOnly('core.tick');
    const result = sys.updateConfig('core.tick', 120);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('read-only');
  });

  it('returns key-not-found for missing key', () => {
    const result = sys.markReadOnly('ghost.key');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('key-not-found');
  });
});

describe('ConfigLoader — updateConfig', () => {
  it('updates value and increments version', () => {
    sys.setConfig('lod.bias', 'GLOBAL', 1.0);
    const result = sys.updateConfig('lod.bias', 2.0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.entry.value).toBe(2.0);
      expect(result.entry.version).toBe(2);
    }
  });

  it('returns key-not-found for missing key', () => {
    const result = sys.updateConfig('missing', 42);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('key-not-found');
  });

  it('returns read-only for locked key', () => {
    sys.setConfig('locked', 'SYSTEM', 'v1');
    sys.markReadOnly('locked');
    const result = sys.updateConfig('locked', 'v2');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('read-only');
  });
});

describe('ConfigLoader — deleteConfig', () => {
  it('deletes an existing entry', () => {
    sys.setConfig('temp.flag', 'GLOBAL', true);
    const result = sys.deleteConfig('temp.flag');
    expect(result.success).toBe(true);
    expect(sys.getConfig('temp.flag')).toBeUndefined();
  });

  it('returns key-not-found for missing key', () => {
    const result = sys.deleteConfig('nope');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('key-not-found');
  });

  it('returns read-only for locked key', () => {
    sys.setConfig('read.only.key', 'GLOBAL', 'locked');
    sys.markReadOnly('read.only.key');
    const result = sys.deleteConfig('read.only.key');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('read-only');
  });
});

describe('ConfigLoader — getChangeHistory', () => {
  it('records history on setConfig', () => {
    sys.setConfig('npc.cap', 'WORLD', 50);
    const history = sys.getChangeHistory('npc.cap', 10);
    expect(history).toHaveLength(1);
    expect(history[0]?.oldValue).toBeNull();
    expect(history[0]?.newValue).toBe(50);
  });

  it('records old and new value on update', () => {
    sys.setConfig('npc.cap', 'WORLD', 50);
    sys.updateConfig('npc.cap', 100);
    const history = sys.getChangeHistory('npc.cap', 10);
    expect(history).toHaveLength(2);
    expect(history[1]?.oldValue).toBe(50);
    expect(history[1]?.newValue).toBe(100);
  });

  it('respects limit parameter', () => {
    sys.setConfig('rate', 'SYSTEM', 1);
    sys.updateConfig('rate', 2);
    sys.updateConfig('rate', 3);
    const history = sys.getChangeHistory('rate', 2);
    expect(history).toHaveLength(2);
  });

  it('returns empty array for limit 0', () => {
    sys.setConfig('rate', 'SYSTEM', 1);
    expect(sys.getChangeHistory('rate', 0)).toHaveLength(0);
  });
});

describe('ConfigLoader — takeSnapshot & getSnapshot', () => {
  it('captures entries for a given scope', () => {
    sys.setConfig('world.gravity', 'WORLD', 9.8);
    sys.setConfig('world.day', 'WORLD', 86400);
    sys.setConfig('global.flag', 'GLOBAL', true);
    const snap = sys.takeSnapshot('WORLD');
    expect(snap.scope).toBe('WORLD');
    expect(snap.entries).toHaveLength(2);
  });

  it('retrieves snapshot by id', () => {
    const snap = sys.takeSnapshot('GLOBAL');
    const fetched = sys.getSnapshot(snap.snapshotId);
    expect(fetched).toBeDefined();
    expect(fetched?.snapshotId).toBe(snap.snapshotId);
  });

  it('returns undefined for unknown snapshot id', () => {
    expect(sys.getSnapshot('ghost-snap')).toBeUndefined();
  });
});
