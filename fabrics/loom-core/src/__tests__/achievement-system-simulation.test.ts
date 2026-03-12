/**
 * Achievement System — Simulation Tests
 *
 * Exercises the full achievement lifecycle: definition, player registration,
 * unlock, progress tracking with auto-unlock, player stats, and hidden
 * achievement filtering.
 */

import { describe, it, expect } from 'vitest';
import { createAchievementSystem } from '../achievement-system.js';
import type { AchievementSystem, AchievementRarity } from '../achievement-system.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeDeps() {
  let time = 1_000_000n;
  let idCounter = 0;
  return {
    clock: { nowUs: () => time },
    idGen: { generate: () => `ach-${++idCounter}` },
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    advance: (us: bigint) => { time += us; },
  };
}

function setupWithAchievements() {
  const deps = makeDeps();
  const sys = createAchievementSystem(deps);
  sys.defineAchievement('first-kill', 'First Kill', 'Defeat an enemy', 'COMMON', 10, false);
  sys.defineAchievement('dragon-slayer', 'Dragon Slayer', 'Defeat the dragon', 'LEGENDARY', 500, false);
  sys.defineAchievement('hidden-gem', 'Hidden Gem', 'Secret achievement', 'EPIC', 200, true);
  sys.defineAchievement('explorer', 'Explorer', 'Discover 10 areas', 'UNCOMMON', 50, false);
  sys.defineAchievement('master-craft', 'Master Craft', 'Craft 100 items', 'RARE', 100, false);
  sys.registerPlayer('player-1');
  return { deps, sys };
}

// ── Define Achievement ──────────────────────────────────────────

describe('Achievement System', () => {
  describe('defineAchievement', () => {
    it('creates an achievement with correct fields', () => {
      const { sys } = setupWithAchievements();
      const all = sys.listAchievements(true);
      const firstKill = all.find(a => a.achievementId === 'first-kill');
      expect(firstKill).toBeDefined();
      expect(firstKill!.title).toBe('First Kill');
      expect(firstKill!.description).toBe('Defeat an enemy');
      expect(firstKill!.rarity).toBe('COMMON');
      expect(firstKill!.pointValue).toBe(10);
      expect(firstKill!.hidden).toBe(false);
    });

    it('rejects duplicate achievement IDs', () => {
      const { sys } = setupWithAchievements();
      const result = sys.defineAchievement('first-kill', 'Dup', 'Dup', 'COMMON', 5, false);
      expect(result).toBe('already-defined');
    });

    it('supports all five rarity tiers', () => {
      const deps = makeDeps();
      const sys = createAchievementSystem(deps);
      const rarities: AchievementRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
      for (const r of rarities) {
        const result = sys.defineAchievement(`ach-${r}`, r, 'desc', r, 10, false);
        expect(typeof result).toBe('object');
        expect((result as { rarity: string }).rarity).toBe(r);
      }
    });
  });

  // ── Player Registration ─────────────────────────────────────────

  describe('registerPlayer', () => {
    it('registers a new player successfully', () => {
      const deps = makeDeps();
      const sys = createAchievementSystem(deps);
      const result = sys.registerPlayer('p1');
      expect(result).toEqual({ success: true });
    });

    it('rejects duplicate registration', () => {
      const deps = makeDeps();
      const sys = createAchievementSystem(deps);
      sys.registerPlayer('p1');
      const result = sys.registerPlayer('p1');
      expect(result).toEqual({ success: false, error: 'already-registered' });
    });

    it('initializes empty stats on registration', () => {
      const deps = makeDeps();
      const sys = createAchievementSystem(deps);
      sys.registerPlayer('p1');
      const stats = sys.getPlayerStats('p1');
      expect(stats).toBeDefined();
      expect(stats!.totalPoints).toBe(0);
      expect(stats!.completionPercent).toBe(0);
    });
  });

  // ── Unlock Achievement ──────────────────────────────────────────

  describe('unlockAchievement', () => {
    it('unlocks an achievement and awards points', () => {
      const { sys, deps } = setupWithAchievements();
      deps.advance(5_000n);
      const result = sys.unlockAchievement('player-1', 'first-kill');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.playerAchievement.achievementId).toBe('first-kill');
        expect(result.playerAchievement.playerId).toBe('player-1');
        expect(result.playerAchievement.pointsEarned).toBe(10);
        expect(result.playerAchievement.unlockedAt).toBe(1_005_000n);
      }
    });

    it('rejects unlock for unknown player', () => {
      const { sys } = setupWithAchievements();
      const result = sys.unlockAchievement('unknown', 'first-kill');
      expect(result).toEqual({ success: false, error: 'player-not-found' });
    });

    it('rejects unlock for unknown achievement', () => {
      const { sys } = setupWithAchievements();
      const result = sys.unlockAchievement('player-1', 'nonexistent');
      expect(result).toEqual({ success: false, error: 'achievement-not-found' });
    });

    it('rejects duplicate unlock', () => {
      const { sys } = setupWithAchievements();
      sys.unlockAchievement('player-1', 'first-kill');
      const result = sys.unlockAchievement('player-1', 'first-kill');
      expect(result).toEqual({ success: false, error: 'already-unlocked' });
    });

    it('accumulates points across multiple unlocks', () => {
      const { sys } = setupWithAchievements();
      sys.unlockAchievement('player-1', 'first-kill');     // 10
      sys.unlockAchievement('player-1', 'dragon-slayer');  // 500
      const stats = sys.getPlayerStats('player-1');
      expect(stats!.totalPoints).toBe(510);
    });
  });

  // ── Progress Tracking ───────────────────────────────────────────

  describe('trackProgress', () => {
    it('initializes and increments progress', () => {
      const { sys } = setupWithAchievements();
      sys.initProgress('player-1', 'explorer', 10);
      const r1 = sys.trackProgress('player-1', 'explorer', 3);
      expect(r1).toEqual({ success: true, completed: false });
      const prog = sys.getProgress('player-1', 'explorer');
      expect(prog).toBeDefined();
      expect(prog!.currentProgress).toBe(3);
      expect(prog!.requiredProgress).toBe(10);
      expect(prog!.completed).toBe(false);
    });

    it('auto-unlocks when progress reaches threshold', () => {
      const { sys } = setupWithAchievements();
      sys.initProgress('player-1', 'master-craft', 100);
      sys.trackProgress('player-1', 'master-craft', 50);
      const result = sys.trackProgress('player-1', 'master-craft', 50);
      expect(result).toEqual({ success: true, completed: true });
      // Should now appear in unlocked list
      const unlocked = sys.listUnlocked('player-1');
      expect(unlocked.some(u => u.achievementId === 'master-craft')).toBe(true);
      // Points should be awarded
      const stats = sys.getPlayerStats('player-1');
      expect(stats!.totalPoints).toBe(100);
    });

    it('auto-unlocks when progress exceeds threshold', () => {
      const { sys } = setupWithAchievements();
      sys.initProgress('player-1', 'explorer', 10);
      const result = sys.trackProgress('player-1', 'explorer', 15);
      expect(result).toEqual({ success: true, completed: true });
    });

    it('rejects progress on unknown player', () => {
      const { sys } = setupWithAchievements();
      sys.initProgress('player-1', 'explorer', 10);
      const result = sys.trackProgress('ghost', 'explorer', 1);
      expect(result).toEqual({ success: false, error: 'player-not-found' });
    });

    it('rejects progress on unknown achievement', () => {
      const { sys } = setupWithAchievements();
      const result = sys.trackProgress('player-1', 'no-exist', 1);
      expect(result).toEqual({ success: false, error: 'achievement-not-found' });
    });

    it('rejects further progress after completed', () => {
      const { sys } = setupWithAchievements();
      sys.initProgress('player-1', 'explorer', 10);
      sys.trackProgress('player-1', 'explorer', 10);
      const result = sys.trackProgress('player-1', 'explorer', 1);
      expect(result).toEqual({ success: false, error: 'already-unlocked' });
    });

    it('rejects initProgress for unknown player', () => {
      const { sys } = setupWithAchievements();
      const result = sys.initProgress('ghost', 'explorer', 10);
      expect(result).toEqual({ success: false, error: 'player-not-found' });
    });

    it('rejects initProgress for unknown achievement', () => {
      const { sys } = setupWithAchievements();
      const result = sys.initProgress('player-1', 'no-exist', 10);
      expect(result).toEqual({ success: false, error: 'achievement-not-found' });
    });
  });

  // ── Player Stats ────────────────────────────────────────────────

  describe('getPlayerStats', () => {
    it('returns undefined for unregistered player', () => {
      const { sys } = setupWithAchievements();
      expect(sys.getPlayerStats('ghost')).toBeUndefined();
    });

    it('tracks points by rarity bucket', () => {
      const { sys } = setupWithAchievements();
      sys.unlockAchievement('player-1', 'first-kill');     // COMMON
      sys.unlockAchievement('player-1', 'dragon-slayer');  // LEGENDARY
      sys.unlockAchievement('player-1', 'hidden-gem');     // EPIC
      const stats = sys.getPlayerStats('player-1')!;
      expect(stats.byRarity.COMMON).toBe(1);
      expect(stats.byRarity.LEGENDARY).toBe(1);
      expect(stats.byRarity.EPIC).toBe(1);
      expect(stats.byRarity.UNCOMMON).toBe(0);
      expect(stats.byRarity.RARE).toBe(0);
    });

    it('computes correct completion percentage', () => {
      const { sys } = setupWithAchievements();
      // 5 achievements total, unlock 2 = 40%
      sys.unlockAchievement('player-1', 'first-kill');
      sys.unlockAchievement('player-1', 'explorer');
      const stats = sys.getPlayerStats('player-1')!;
      expect(stats.completionPercent).toBe(40);
    });

    it('returns 0% completion when no achievements defined', () => {
      const deps = makeDeps();
      const sys = createAchievementSystem(deps);
      sys.registerPlayer('p1');
      const stats = sys.getPlayerStats('p1')!;
      expect(stats.completionPercent).toBe(0);
    });
  });

  // ── Listing ─────────────────────────────────────────────────────

  describe('listAchievements', () => {
    it('excludes hidden achievements by default', () => {
      const { sys } = setupWithAchievements();
      const visible = sys.listAchievements();
      expect(visible.length).toBe(4);
      expect(visible.find(a => a.achievementId === 'hidden-gem')).toBeUndefined();
    });

    it('includes hidden achievements when requested', () => {
      const { sys } = setupWithAchievements();
      const all = sys.listAchievements(true);
      expect(all.length).toBe(5);
      expect(all.find(a => a.achievementId === 'hidden-gem')).toBeDefined();
    });
  });

  describe('listUnlocked', () => {
    it('returns empty array for player with no unlocks', () => {
      const { sys } = setupWithAchievements();
      expect(sys.listUnlocked('player-1')).toEqual([]);
    });

    it('returns all unlocked achievements for a player', () => {
      const { sys } = setupWithAchievements();
      sys.unlockAchievement('player-1', 'first-kill');
      sys.unlockAchievement('player-1', 'explorer');
      const unlocked = sys.listUnlocked('player-1');
      expect(unlocked.length).toBe(2);
      const ids = unlocked.map(u => u.achievementId);
      expect(ids).toContain('first-kill');
      expect(ids).toContain('explorer');
    });
  });

  // ── Progress Query ──────────────────────────────────────────────

  describe('getProgress', () => {
    it('returns undefined for uninitialized progress', () => {
      const { sys } = setupWithAchievements();
      expect(sys.getProgress('player-1', 'explorer')).toBeUndefined();
    });

    it('returns a readonly snapshot of progress', () => {
      const { sys } = setupWithAchievements();
      sys.initProgress('player-1', 'explorer', 10);
      sys.trackProgress('player-1', 'explorer', 7);
      const prog = sys.getProgress('player-1', 'explorer')!;
      expect(prog.currentProgress).toBe(7);
      expect(prog.requiredProgress).toBe(10);
      expect(prog.completed).toBe(false);
      expect(prog.playerId).toBe('player-1');
      expect(prog.achievementId).toBe('explorer');
    });
  });
});
