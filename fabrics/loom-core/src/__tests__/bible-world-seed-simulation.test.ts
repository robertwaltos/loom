import { describe, it, expect } from 'vitest';
import {
  createBibleWorldSeed,
  getAvailableBibleWorldIds,
} from '../bible-world-seed.js';

describe('bible-world-seed simulation', () => {
  // ── getAvailableBibleWorldIds ─────────────────────────────────────

  describe('getAvailableBibleWorldIds', () => {
    it('returns a non-empty readonly array', () => {
      const ids = getAvailableBibleWorldIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
    });

    it('every id is a non-empty string', () => {
      const ids = getAvailableBibleWorldIds();
      for (const id of ids) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    });

    it('ids are unique', () => {
      const ids = getAvailableBibleWorldIds();
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  // ── createBibleWorldSeed ──────────────────────────────────────────

  describe('createBibleWorldSeed', () => {
    it('returns a WorldSeedConfig for a valid bible world id', () => {
      const ids = getAvailableBibleWorldIds();
      const config = createBibleWorldSeed(ids[0]);
      expect(config).not.toBeNull();
      expect(config).toHaveProperty('worldId');
      expect(config!.worldId).toBe(ids[0]);
    });

    it('returns null for an unknown world id', () => {
      const config = createBibleWorldSeed('__not-a-bible-world__');
      expect(config).toBeNull();
    });

    it('returned config has spawnPoints array', () => {
      const ids = getAvailableBibleWorldIds();
      const config = createBibleWorldSeed(ids[0]);
      expect(config).not.toBeNull();
      expect(Array.isArray(config!.spawnPoints)).toBe(true);
    });

    it('returned config has npcs array', () => {
      const ids = getAvailableBibleWorldIds();
      const config = createBibleWorldSeed(ids[0]);
      expect(config).not.toBeNull();
      expect(Array.isArray(config!.npcs)).toBe(true);
    });

    it('covers multiple available worlds without error', () => {
      const ids = getAvailableBibleWorldIds();
      // Check the first 3 (or all if fewer)
      const sample = ids.slice(0, Math.min(3, ids.length));
      for (const id of sample) {
        const config = createBibleWorldSeed(id);
        expect(config).not.toBeNull();
      }
    });
  });
});
