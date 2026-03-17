import { describe, it, expect, beforeEach } from 'vitest';
import { createAchievementEngine } from '../achievement-system.js';
import type { AchievementEngine } from '../achievement-system.js';

describe('achievement-system', () => {
  let engine: AchievementEngine;

  beforeEach(() => {
    engine = createAchievementEngine();
  });

  // ── define() and listDefinitions() ──────────────────────────────────────────

  describe('define() and listDefinitions()', () => {
    it('lists all 10 starter achievements', () => {
      expect(engine.listDefinitions()).toHaveLength(10);
    });

    it('registers a new custom achievement', () => {
      const before = engine.listDefinitions().length;
      engine.define({
        id: 'custom_1',
        name: 'Custom',
        description: 'A new one',
        category: 'lore',
        points: 5,
      });
      expect(engine.listDefinitions()).toHaveLength(before + 1);
    });

    it('define() is idempotent — redefining same id does not add a duplicate', () => {
      const before = engine.listDefinitions().length;
      engine.define({
        id: 'first_step',
        name: 'First Step v2',
        description: 'Updated',
        category: 'lore',
        points: 99,
      });
      expect(engine.listDefinitions()).toHaveLength(before);
    });

    it('define() updates the definition when id already exists', () => {
      engine.define({
        id: 'first_step',
        name: 'Renamed',
        description: 'Updated',
        category: 'lore',
        points: 99,
      });
      const def = engine.listDefinitions().find((d) => d.id === 'first_step');
      expect(def?.name).toBe('Renamed');
      expect(def?.points).toBe(99);
    });
  });

  // ── Starter achievements ─────────────────────────────────────────────────────

  describe('starter achievements', () => {
    it('all 10 starter IDs are present', () => {
      const ids = new Set(engine.listDefinitions().map((d) => d.id));
      expect(ids.has('first_step')).toBe(true);
      expect(ids.has('world_traveler_3')).toBe(true);
      expect(ids.has('world_traveler_10')).toBe(true);
      expect(ids.has('kalon_1000')).toBe(true);
      expect(ids.has('kalon_1m')).toBe(true);
      expect(ids.has('dynasty_30_days')).toBe(true);
      expect(ids.has('chronicle_1')).toBe(true);
      expect(ids.has('chronicle_10')).toBe(true);
      expect(ids.has('alliance_1')).toBe(true);
      expect(ids.has('pvp_10_wins')).toBe(true);
    });
  });

  // ── incrementProgress() ──────────────────────────────────────────────────────

  describe('incrementProgress()', () => {
    it('unlocks when progress reaches target', () => {
      const result = engine.incrementProgress('p1', 'world_traveler_3', 3);
      expect(result.isUnlocked).toBe(true);
      expect(result.currentProgress).toBe(3);
      expect(result.unlockedAt).not.toBeNull();
    });

    it('ignores delta after achievement is already unlocked', () => {
      engine.incrementProgress('p1', 'first_step');
      const result = engine.incrementProgress('p1', 'first_step', 100);
      expect(result.currentProgress).toBe(1);
      expect(result.isUnlocked).toBe(true);
    });

    it('binary achievement (no targetProgress) unlocks on first default increment', () => {
      const result = engine.incrementProgress('p1', 'first_step');
      expect(result.targetProgress).toBe(1);
      expect(result.isUnlocked).toBe(true);
    });

    it('increments by custom delta without unlocking mid-way', () => {
      const result = engine.incrementProgress('p1', 'world_traveler_3', 2);
      expect(result.currentProgress).toBe(2);
      expect(result.isUnlocked).toBe(false);
    });

    it('does not unlock if prerequisite is not met', () => {
      const result = engine.incrementProgress('p1', 'world_traveler_10', 10);
      expect(result.isUnlocked).toBe(false);
      expect(result.currentProgress).toBe(0);
    });

    it('progresses partway without unlocking', () => {
      const result = engine.incrementProgress('p1', 'pvp_10_wins', 5);
      expect(result.currentProgress).toBe(5);
      expect(result.isUnlocked).toBe(false);
    });

    it('caps currentProgress at targetProgress even with oversized delta', () => {
      const result = engine.incrementProgress('p1', 'pvp_10_wins', 999);
      expect(result.currentProgress).toBe(10);
      expect(result.isUnlocked).toBe(true);
    });
  });

  // ── setProgress() ────────────────────────────────────────────────────────────

  describe('setProgress()', () => {
    it('directly unlocks when set exactly to target', () => {
      const result = engine.setProgress('p1', 'chronicle_1', 1);
      expect(result.isUnlocked).toBe(true);
    });

    it('is idempotent once already unlocked — cannot revert progress', () => {
      engine.setProgress('p1', 'first_step', 1);
      const result = engine.setProgress('p1', 'first_step', 0);
      expect(result.isUnlocked).toBe(true);
      expect(result.currentProgress).toBe(1);
    });

    it('partial setProgress does not unlock', () => {
      const result = engine.setProgress('p1', 'pvp_10_wins', 6);
      expect(result.currentProgress).toBe(6);
      expect(result.isUnlocked).toBe(false);
    });
  });

  // ── drainUnlockQueue() ───────────────────────────────────────────────────────

  describe('drainUnlockQueue()', () => {
    it('returns IDs of newly unlocked achievements', () => {
      engine.incrementProgress('p1', 'first_step');
      engine.incrementProgress('p1', 'kalon_1000');
      const queue = engine.drainUnlockQueue('p1');
      expect(queue).toContain('first_step');
      expect(queue).toContain('kalon_1000');
      expect(queue).toHaveLength(2);
    });

    it('clears the queue after draining', () => {
      engine.incrementProgress('p1', 'first_step');
      engine.drainUnlockQueue('p1');
      expect(engine.drainUnlockQueue('p1')).toHaveLength(0);
    });

    it('already-unlocked achievement is not re-queued on duplicate increment', () => {
      engine.incrementProgress('p1', 'first_step');
      engine.drainUnlockQueue('p1'); // clear
      engine.incrementProgress('p1', 'first_step'); // noop — already unlocked
      expect(engine.drainUnlockQueue('p1')).toHaveLength(0);
    });

    it('returns empty array for a player with no unlocks', () => {
      expect(engine.drainUnlockQueue('nobody')).toHaveLength(0);
    });
  });

  // ── getTotalPoints() ─────────────────────────────────────────────────────────

  describe('getTotalPoints()', () => {
    it('returns 0 for a player with no unlocks', () => {
      expect(engine.getTotalPoints('p1')).toBe(0);
    });

    it('accumulates points across multiple unlocks', () => {
      engine.incrementProgress('p1', 'first_step'); // 10 pts
      engine.incrementProgress('p1', 'kalon_1000'); // 15 pts
      expect(engine.getTotalPoints('p1')).toBe(25);
    });

    it('does not count points for partially-progressed achievements', () => {
      engine.incrementProgress('p1', 'pvp_10_wins', 9); // not unlocked yet
      expect(engine.getTotalPoints('p1')).toBe(0);
    });
  });

  // ── getPlayerAchievements() ──────────────────────────────────────────────────

  describe('getPlayerAchievements()', () => {
    it('returns one entry per definition for a fresh player', () => {
      expect(engine.getPlayerAchievements('p1')).toHaveLength(10);
    });

    it('returns zero currentProgress for untouched achievements', () => {
      const all = engine.getPlayerAchievements('p1');
      for (const a of all) {
        expect(a.currentProgress).toBe(0);
        expect(a.isUnlocked).toBe(false);
        expect(a.unlockedAt).toBeNull();
      }
    });

    it('shows correct progress and unlocked state after incrementing', () => {
      engine.incrementProgress('p1', 'first_step');
      const all = engine.getPlayerAchievements('p1');
      const entry = all.find((a) => a.achievementId === 'first_step');
      expect(entry?.isUnlocked).toBe(true);
      expect(entry?.currentProgress).toBe(1);
      expect(entry?.unlockedAt).not.toBeNull();
    });
  });

  // ── Multiple players independence ────────────────────────────────────────────

  describe('multiple players', () => {
    it('progress is stored separately per player', () => {
      engine.incrementProgress('p1', 'pvp_10_wins', 5);
      engine.incrementProgress('p2', 'pvp_10_wins', 3);
      const p1 = engine.getPlayerAchievements('p1').find((a) => a.achievementId === 'pvp_10_wins');
      const p2 = engine.getPlayerAchievements('p2').find((a) => a.achievementId === 'pvp_10_wins');
      expect(p1?.currentProgress).toBe(5);
      expect(p2?.currentProgress).toBe(3);
    });

    it('unlocking for one player does not affect another', () => {
      engine.incrementProgress('p1', 'first_step');
      expect(engine.getTotalPoints('p2')).toBe(0);
      expect(engine.drainUnlockQueue('p2')).toHaveLength(0);
    });
  });

  // ── Prerequisite chain ───────────────────────────────────────────────────────

  describe('prerequisite chain', () => {
    it('unlocks gated achievement after prerequisite is met', () => {
      engine.incrementProgress('p1', 'chronicle_1'); // prereq for chronicle_10
      const result = engine.incrementProgress('p1', 'chronicle_10', 10);
      expect(result.isUnlocked).toBe(true);
    });

    it('cannot unlock gated achievement without meeting prerequisite', () => {
      const result = engine.incrementProgress('p1', 'kalon_1m', 1);
      expect(result.isUnlocked).toBe(false);
      expect(result.currentProgress).toBe(0);
    });

    it('full two-step chain: unlock prereq then unlock dependent', () => {
      engine.incrementProgress('p1', 'world_traveler_3', 3); // unlock world_traveler_3
      const second = engine.incrementProgress('p1', 'world_traveler_10', 10);
      expect(second.isUnlocked).toBe(true);
      expect(engine.getTotalPoints('p1')).toBe(125); // 25 + 100
    });
  });
});
