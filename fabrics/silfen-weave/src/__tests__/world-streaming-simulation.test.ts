/**
 * World Streaming Manager — Simulation Tests
 *
 * Tests chunk-based world streaming with proximity loading,
 * hysteresis unloading, reference counting, and priority sorting.
 *
 * Phase 9.22 — Silfen Weave Streaming
 * Thread: test/silfen-weave/world-streaming
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createWorldStreamingManager,
  type StreamingConfig,
  type StreamCommand,
} from '../world-streaming.js';

// ─── Helpers ────────────────────────────────────────────────────

function tinyConfig(overrides?: Partial<StreamingConfig>): StreamingConfig {
  return {
    chunkSizeUnits: 100,
    loadRadiusChunks: 2,
    unloadHysteresis: 1,
    maxConcurrentLoads: 50,
    priorityDecayFactor: 0.9,
    ...overrides,
  };
}

function loadCommands(cmds: ReadonlyArray<StreamCommand>) {
  return cmds.filter((c): c is Extract<StreamCommand, { kind: 'load' }> => c.kind === 'load');
}

function unloadCommands(cmds: ReadonlyArray<StreamCommand>) {
  return cmds.filter((c): c is Extract<StreamCommand, { kind: 'unload' }> => c.kind === 'unload');
}

// ─── Tests ──────────────────────────────────────────────────────

describe('WorldStreamingManager', () => {

  // ─── Player Tracking ──────────────────────────────────────

  describe('player tracking', () => {
    it('starts with zero players', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      expect(mgr.playerCount()).toBe(0);
      expect(mgr.totalLoadedChunks()).toBe(0);
    });

    it('tracks added players', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.updatePlayerPosition('p2', 'world-1', 150, 150, 0);
      expect(mgr.playerCount()).toBe(2);
    });

    it('removes a player and cleans up chunks', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.computeCommands(); // load chunks
      expect(mgr.totalLoadedChunks()).toBeGreaterThan(0);

      mgr.removePlayer('p1');
      expect(mgr.playerCount()).toBe(0);
      expect(mgr.totalLoadedChunks()).toBe(0);
    });

    it('removing unknown player is a no-op', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      mgr.removePlayer('nonexistent');
      expect(mgr.playerCount()).toBe(0);
    });
  });

  // ─── Chunk Loading ──────────────────────────────────────────

  describe('chunk loading', () => {
    it('generates load commands for new player position', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);

      const cmds = mgr.computeCommands();
      const loads = loadCommands(cmds);

      expect(loads.length).toBeGreaterThan(0);
      // All loads should be for world-1
      for (const cmd of loads) {
        expect(cmd.chunk.worldId).toBe('world-1');
      }
    });

    it('does not re-load already loaded chunks', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);

      const cmds1 = mgr.computeCommands();
      const loads1 = loadCommands(cmds1);

      // Same position, no new loads
      const cmds2 = mgr.computeCommands();
      const loads2 = loadCommands(cmds2);

      expect(loads1.length).toBeGreaterThan(0);
      expect(loads2.length).toBe(0);
    });

    it('loads spherical chunk radius (uses distance check)', () => {
      const config = tinyConfig({ loadRadiusChunks: 1 });
      const mgr = createWorldStreamingManager(config);
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);

      const cmds = mgr.computeCommands();
      const loads = loadCommands(cmds);

      // radius=1 sphere in 3D: center + 6 faces = 7 chunks
      // (dx²+dy²+dz² <= 1 gives: 0,0,0 + ±1,0,0 + 0,±1,0 + 0,0,±1 = 7)
      expect(loads.length).toBe(7);
    });

    it('center chunk has highest priority', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);

      const cmds = mgr.computeCommands();
      const loads = loadCommands(cmds);

      // Commands are sorted by priority descending
      expect(loads[0]!.priority).toBe(1); // center dist=0 → priority=1
      // Subsequent chunks have lower priority
      for (let i = 1; i < loads.length; i++) {
        expect(loads[i]!.priority).toBeLessThanOrEqual(loads[0]!.priority);
      }
    });

    it('respects maxConcurrentLoads', () => {
      const config = tinyConfig({ maxConcurrentLoads: 3 });
      const mgr = createWorldStreamingManager(config);
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);

      const cmds = mgr.computeCommands();
      const loads = loadCommands(cmds);

      expect(loads.length).toBeLessThanOrEqual(3);
    });
  });

  // ─── Chunk Unloading ────────────────────────────────────────

  describe('chunk unloading', () => {
    it('unloads chunks when player moves far away', () => {
      const config = tinyConfig({ loadRadiusChunks: 1, unloadHysteresis: 0 });
      const mgr = createWorldStreamingManager(config);

      // Load at origin
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.computeCommands();

      // Move very far away
      mgr.updatePlayerPosition('p1', 'world-1', 5000, 5000, 0);
      const cmds = mgr.computeCommands();

      const unloads = unloadCommands(cmds);
      expect(unloads.length).toBeGreaterThan(0);
    });

    it('hysteresis prevents premature unload', () => {
      const config = tinyConfig({ loadRadiusChunks: 2, unloadHysteresis: 3 });
      const mgr = createWorldStreamingManager(config);

      // Load at position
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.computeCommands();

      // Move slightly — still within hysteresis zone
      mgr.updatePlayerPosition('p1', 'world-1', 350, 50, 0);
      const cmds = mgr.computeCommands();
      const unloads = unloadCommands(cmds);

      // With large hysteresis, original chunks should still be loaded
      // (unload radius = load radius + hysteresis = 5)
      expect(unloads.length).toBe(0);
    });

    it('unloads chunks when world changes', () => {
      const config = tinyConfig({ loadRadiusChunks: 1 });
      const mgr = createWorldStreamingManager(config);

      // Load in world-1
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.computeCommands();

      // Move to world-2
      mgr.updatePlayerPosition('p1', 'world-2', 50, 50, 0);
      const cmds = mgr.computeCommands();
      const unloads = unloadCommands(cmds);

      // All world-1 chunks should be unloaded
      for (const cmd of unloads) {
        expect(cmd.chunk.worldId).toBe('world-1');
      }
      expect(unloads.length).toBeGreaterThan(0);
    });
  });

  // ─── getLoadedChunks ────────────────────────────────────────

  describe('getLoadedChunks', () => {
    it('returns empty for unknown player', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      expect(mgr.getLoadedChunks('nobody')).toEqual([]);
    });

    it('returns loaded chunks after compute', () => {
      const mgr = createWorldStreamingManager(tinyConfig({ loadRadiusChunks: 1, maxConcurrentLoads: 100 }));
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.computeCommands();

      const chunks = mgr.getLoadedChunks('p1');
      expect(chunks.length).toBe(7); // radius=1 sphere
      for (const c of chunks) {
        expect(c.worldId).toBe('world-1');
      }
    });
  });

  // ─── Reference Counting ─────────────────────────────────────

  describe('reference counting', () => {
    it('tracks shared chunks between players', () => {
      const config = tinyConfig({ loadRadiusChunks: 1, maxConcurrentLoads: 100 });
      const mgr = createWorldStreamingManager(config);

      // Two players at same position
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.updatePlayerPosition('p2', 'world-1', 50, 50, 0);
      mgr.computeCommands();

      // Total unique chunks = 7 (overlapping)
      expect(mgr.totalLoadedChunks()).toBe(7);

      // Remove one player — chunks stay because p2 still needs them
      mgr.removePlayer('p1');
      expect(mgr.totalLoadedChunks()).toBe(7);

      // Remove second — all gone
      mgr.removePlayer('p2');
      expect(mgr.totalLoadedChunks()).toBe(0);
    });
  });

  // ─── Priority Sorting ──────────────────────────────────────

  describe('priority sorting', () => {
    it('sorts load commands by priority descending', () => {
      const mgr = createWorldStreamingManager(tinyConfig());
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);

      const cmds = mgr.computeCommands();
      const loads = loadCommands(cmds);

      for (let i = 1; i < loads.length; i++) {
        expect(loads[i]!.priority).toBeLessThanOrEqual(loads[i - 1]!.priority);
      }
    });

    it('load commands appear before unload commands', () => {
      const config = tinyConfig({ loadRadiusChunks: 1, unloadHysteresis: 0 });
      const mgr = createWorldStreamingManager(config);

      // Load at origin
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 0);
      mgr.computeCommands();

      // Move to generate both loads and unloads
      mgr.updatePlayerPosition('p1', 'world-1', 5000, 5000, 0);
      const cmds = mgr.computeCommands();

      const loads = loadCommands(cmds);
      const unloads = unloadCommands(cmds);

      if (loads.length > 0 && unloads.length > 0) {
        const lastLoadIdx = cmds.lastIndexOf(loads[loads.length - 1]!);
        const firstUnloadIdx = cmds.indexOf(unloads[0]!);
        expect(lastLoadIdx).toBeLessThan(firstUnloadIdx);
      }
    });
  });

  // ─── 3D Streaming ──────────────────────────────────────────

  describe('3D streaming', () => {
    it('loads chunks in 3D sphere around player', () => {
      const config = tinyConfig({ loadRadiusChunks: 1, maxConcurrentLoads: 100 });
      const mgr = createWorldStreamingManager(config);
      // Position at chunk grid origin
      mgr.updatePlayerPosition('p1', 'world-1', 50, 50, 50);
      mgr.computeCommands();

      const chunks = mgr.getLoadedChunks('p1');
      // Verify chunks span all three axes
      const zValues = new Set(chunks.map(c => c.cz));
      expect(zValues.size).toBeGreaterThan(1); // confirms 3D loading
    });
  });

  // ─── Default Config ─────────────────────────────────────────

  describe('default config', () => {
    it('works with default streaming config', () => {
      const mgr = createWorldStreamingManager();
      mgr.updatePlayerPosition('p1', 'world-1', 500, 500, 0);

      const cmds = mgr.computeCommands();
      expect(cmds.length).toBeGreaterThan(0);
      expect(mgr.playerCount()).toBe(1);
    });
  });
});
