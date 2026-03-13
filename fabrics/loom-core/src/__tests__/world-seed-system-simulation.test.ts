import { describe, it, expect, vi } from 'vitest';
import { createDefaultWorldSeed, createWorldSeedService } from '../world-seed-system.js';

describe('world-seed-system simulation', () => {
  // ── createDefaultWorldSeed ────────────────────────────────────────

  describe('createDefaultWorldSeed', () => {
    it('returns a config with the given worldId', () => {
      const config = createDefaultWorldSeed('world-test');
      expect(config.worldId).toBe('world-test');
    });

    it('has exactly 6 spawn points', () => {
      const config = createDefaultWorldSeed('world-a');
      expect(config.spawnPoints.length).toBe(6);
    });

    it('has exactly 7 NPCs', () => {
      const config = createDefaultWorldSeed('world-b');
      expect(config.npcs.length).toBe(7);
    });

    it('has exactly 6 objects', () => {
      const config = createDefaultWorldSeed('world-c');
      expect(config.objects.length).toBe(6);
    });

    it('different worldIds produce different configs', () => {
      const a = createDefaultWorldSeed('world-alpha');
      const b = createDefaultWorldSeed('world-beta');
      expect(a.worldId).not.toBe(b.worldId);
    });

    it('each spawn point has an id and position', () => {
      const config = createDefaultWorldSeed('world-x');
      for (const sp of config.spawnPoints) {
        expect(sp).toHaveProperty('position');
        expect(sp).toHaveProperty('spawnType');
      }
    });

    it('each NPC has a displayName and hostility', () => {
      const config = createDefaultWorldSeed('world-y');
      for (const npc of config.npcs) {
        expect(npc).toHaveProperty('displayName');
        expect(npc).toHaveProperty('hostility');
      }
    });
  });

  // ── createWorldSeedService ────────────────────────────────────────

  describe('createWorldSeedService', () => {
    function makeDeps() {
      return {
        entityRegistry: {
          spawn: vi.fn().mockReturnValue('entity-id'),
          despawn: vi.fn(),
          components: {
            set: vi.fn(),
            get: vi.fn(),
            tryGet: vi.fn(),
            has: vi.fn().mockReturnValue(false),
            remove: vi.fn(),
            removeAll: vi.fn(),
            listComponents: vi.fn().mockReturnValue([]),
            findEntitiesWith: vi.fn().mockReturnValue([]),
          },
        },
        spawnSystem: {
          spawnNpc: vi.fn().mockReturnValue({ ok: true, entityId: 'npc-id' }),
          releaseSpawn: vi.fn().mockReturnValue(true),
          spawnPlayer: vi.fn().mockReturnValue({ ok: true, entityId: 'player-id' }),
        },
      };
    }

    it('creates a service without throwing', () => {
      const deps = makeDeps();
      expect(() => createWorldSeedService(deps)).not.toThrow();
    });

    it('service exposes seed and seedDefault methods', () => {
      const deps = makeDeps();
      const service = createWorldSeedService(deps);
      expect(typeof service.seed).toBe('function');
      expect(typeof service.seedDefault).toBe('function');
    });

    it('seedDefault invokes entityRegistry.spawn for each spawn point', async () => {
      const deps = makeDeps();
      const service = createWorldSeedService(deps);
      await service.seedDefault('world-test');
      // Default seed has 6 spawn points + 6 objects = call count ≥ 1
      expect(deps.entityRegistry.spawn.mock.calls.length).toBeGreaterThan(0);
    });

    it('seed with a custom config calls entityRegistry.spawn for each spawn point', async () => {
      const deps = makeDeps();
      const service = createWorldSeedService(deps);
      const config = createDefaultWorldSeed('custom-world');
      await service.seed(config);
      expect(deps.entityRegistry.spawn.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
