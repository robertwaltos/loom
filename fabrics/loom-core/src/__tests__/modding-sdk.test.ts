import { describe, it, expect, vi } from 'vitest';
import { createModRegistry, ModHook, CURRENT_API_VERSION } from '../modding-sdk.js';
import type { ModManifest, ModContext } from '../modding-sdk.js';

function makeManifest(overrides: Partial<ModManifest> = {}): ModManifest {
  return {
    modId: 'mod-test',
    name: 'Test Mod',
    version: '1.0.0',
    author: 'alice',
    hooks: [ModHook.WORLD_TICK, ModHook.TRADE_EXECUTE],
    description: 'A test mod',
    apiVersion: CURRENT_API_VERSION,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ModContext> = {}): ModContext {
  return {
    modId: 'mod-test',
    worldId: 'world-alpha',
    tick: 1n,
    clock: () => 1000n,
    log: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  };
}

describe('modding-sdk', () => {
  describe('CURRENT_API_VERSION', () => {
    it('is defined and starts with "1"', () => {
      expect(CURRENT_API_VERSION).toBeDefined();
      expect(CURRENT_API_VERSION.startsWith('1')).toBe(true);
    });
  });

  describe('ModHook', () => {
    it('has 10 hooks', () => {
      expect(Object.keys(ModHook)).toHaveLength(10);
    });

    it('includes expected hooks', () => {
      const expected = ['WORLD_TICK', 'ENTITY_SPAWN', 'TRADE_EXECUTE', 'ASSEMBLY_VOTE', 'TRANSIT_END'];
      for (const h of expected) {
        expect(ModHook).toHaveProperty(h);
      }
    });
  });

  describe('registerMod', () => {
    it('registers a valid mod', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest());
      expect(reg.isRegistered('mod-test')).toBe(true);
    });

    it('throws on duplicate mod registration', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest());
      expect(() => reg.registerMod(makeManifest())).toThrow();
    });

    it('throws when apiVersion major differs', () => {
      const reg = createModRegistry();
      expect(() => reg.registerMod(makeManifest({ apiVersion: '2.0' }))).toThrow();
    });

    it('getRegisteredMods returns all mods', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest({ modId: 'mod-a' }));
      reg.registerMod(makeManifest({ modId: 'mod-b' }));
      expect(reg.getRegisteredMods()).toHaveLength(2);
    });
  });

  describe('on / off / fire', () => {
    it('fires a handler and passes payload through', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest());
      reg.on('mod-test', ModHook.TRADE_EXECUTE, (_ctx, payload: { amount: number }) => payload);
      const ctx = makeCtx();
      const result = reg.fire(ModHook.TRADE_EXECUTE, ctx, { amount: 100 });
      expect(result).toEqual({ amount: 100 });
    });

    it('chains multiple handlers — each sees mutated payload', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest({ modId: 'mod-a', hooks: [ModHook.WORLD_TICK] }));
      reg.registerMod(makeManifest({ modId: 'mod-b', hooks: [ModHook.WORLD_TICK] }));
      const ctx = makeCtx();
      reg.on('mod-a', ModHook.WORLD_TICK, (_ctx, p: { value: number }) => ({ value: p.value + 10 }));
      reg.on('mod-b', ModHook.WORLD_TICK, (_ctx, p: { value: number }) => ({ value: p.value * 2 }));
      const result = reg.fire(ModHook.WORLD_TICK, ctx, { value: 5 }) as { value: number };
      expect(result.value).toBe(30);  // (5 + 10) * 2
    });

    it('off removes handler', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest());
      reg.on('mod-test', ModHook.ASSEMBLY_VOTE, (_ctx, p: { votes: number }) => ({ votes: p.votes + 1 }));
      reg.off('mod-test', ModHook.ASSEMBLY_VOTE);
      const ctx = makeCtx();
      const result = reg.fire(ModHook.ASSEMBLY_VOTE, ctx, { votes: 0 }) as { votes: number };
      expect(result.votes).toBe(0);
    });

    it('fire with no handlers returns original payload', () => {
      const reg = createModRegistry();
      const ctx = makeCtx();
      const payload = { x: 42 };
      const result = reg.fire(ModHook.TRANSIT_START, ctx, payload);
      expect(result).toBe(payload);
    });

    it('throws on() for unregistered mod', () => {
      const reg = createModRegistry();
      expect(() => reg.on('ghost-mod', ModHook.WORLD_TICK, vi.fn())).toThrow();
    });

    it('getHandlerCount returns correct count', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest({ modId: 'ma', hooks: [ModHook.NPC_DIALOGUE] }));
      reg.registerMod(makeManifest({ modId: 'mb', hooks: [ModHook.NPC_DIALOGUE] }));
      reg.on('ma', ModHook.NPC_DIALOGUE, vi.fn());
      reg.on('mb', ModHook.NPC_DIALOGUE, vi.fn());
      expect(reg.getHandlerCount(ModHook.NPC_DIALOGUE)).toBe(2);
    });
  });

  describe('unregisterMod', () => {
    it('removes mod and clears its handlers', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest());
      reg.on('mod-test', ModHook.ECONOMY_TICK, (_ctx, p: number) => p + 1);
      reg.unregisterMod('mod-test');
      expect(reg.isRegistered('mod-test')).toBe(false);
      expect(reg.getHandlerCount(ModHook.ECONOMY_TICK)).toBe(0);
    });

    it('unregistering unknown mod is a no-op', () => {
      const reg = createModRegistry();
      expect(() => reg.unregisterMod('phantom')).not.toThrow();
    });
  });

  describe('handler null/undefined return passthrough', () => {
    it('does not mutate payload when handler returns undefined', () => {
      const reg = createModRegistry();
      reg.registerMod(makeManifest());
      reg.on('mod-test', ModHook.TRANSIT_END, (_ctx, _p) => undefined);
      const ctx = makeCtx();
      const original = { done: true };
      const result = reg.fire(ModHook.TRANSIT_END, ctx, original);
      expect(result).toBe(original);
    });
  });
});
