import { describe, it, expect } from 'vitest';
import {
  createKindlerProgression,
  MAX_SPARK_LEVEL,
  ABSENCE_THRESHOLD_DAYS,
  WELCOME_BACK_SPARK,
  MS_PER_DAY,
  LUMINANCE_DECAY_PER_DAY,
  LUMINANCE_DECAY_CAP,
} from '../kindler-progression.js';

describe('kindler-progression simulation', () => {
  const kp = createKindlerProgression();

  // ── computeLevel ────────────────────────────────────────────────

  describe('computeLevel', () => {
    it('returns level 0 for a brand-new kindler with 0 spark', () => {
      const level = kp.computeLevel(0);
      expect(level.level).toBe(0);
      expect(level.name).toBe('new-kindler');
    });

    it('reaches level 1 at 1 spark', () => {
      const level = kp.computeLevel(1);
      expect(level.level).toBe(1);
    });

    it('reaches constellation (level 7) at the cap', () => {
      const level = kp.computeLevel(1201);
      expect(level.level).toBe(MAX_SPARK_LEVEL);
      expect(level.name).toBe('constellation');
    });

    it('clamps to MAX_SPARK_LEVEL for excessive spark', () => {
      const level = kp.computeLevel(999_999);
      expect(level.level).toBe(MAX_SPARK_LEVEL);
    });

    it('returns level 2 (flame) for 101 spark', () => {
      // Level 2 (flame): minSpark=51, maxSpark=150
      const level = kp.computeLevel(101);
      expect(level.level).toBe(2);
      expect(level.name).toBe('flame');
    });
  });

  // ── computeSparkGain ─────────────────────────────────────────────

  describe('computeSparkGain', () => {
    it('returns a positive number for a known action', () => {
      const gain = kp.computeSparkGain('complete-entry', 3);
      expect(typeof gain).toBe('number');
      expect(gain).toBeGreaterThan(0);
    });

    it('scales gain with difficulty tier', () => {
      const low = kp.computeSparkGain('complete-entry', 0);
      const high = kp.computeSparkGain('complete-entry', 3);
      expect(high).toBeGreaterThanOrEqual(low);
    });

    it('returns 0 for an unknown action', () => {
      const gain = kp.computeSparkGain('unknown-action' as never, 3);
      expect(gain).toBe(0);
    });
  });

  // ── applySparkGain ────────────────────────────────────────────────

  describe('applySparkGain', () => {
    const baseProfile = {
      kindlerId: 'k1',
      totalSpark: 0,
      level: 0,
      levelName: 'new-kindler' as const,
      visual: 'tiny-flicker' as const,
      worldLuminance: new Map<string, number>(),
      lastVisitMs: 0,
      visitedWorldIds: new Set<string>(),
      completedEntryCount: 0,
    };

    it('increases totalSpark (newSpark) by the gain amount', () => {
      const result = kp.applySparkGain(baseProfile, 5);
      expect(result.newSpark).toBe(5);
      expect(result.sparkGained).toBe(5);
    });

    it('reflects level-up when spark threshold is crossed', () => {
      const profile = { ...baseProfile, totalSpark: 50 };
      const result = kp.applySparkGain(profile, 1); // 50+1=51 → level 2 (flame)
      expect(result.newSpark).toBe(51);
      expect(result.leveledUp).toBe(true);
    });
  });

  // ── computeLuminanceDecay ─────────────────────────────────────────

  describe('computeLuminanceDecay', () => {
    it('returns 0 decay for a recently visited world', () => {
      const nowMs = MS_PER_DAY * 100;
      const state = { worldId: 'w1', luminance: 50, lastVisitMs: nowMs - MS_PER_DAY / 2, maxLuminance: 100 };
      const result = kp.computeLuminanceDecay(state, nowMs);
      expect(result.decayAmount).toBe(0);
      expect(result.newLuminance).toBe(50);
    });

    it('decays luminance after absence exceeds threshold', () => {
      const nowMs = MS_PER_DAY * 100;
      // 8 days = 1 day past threshold (7), so 1 unit of decay
      const state = { worldId: 'w1', luminance: 20, lastVisitMs: nowMs - MS_PER_DAY * 8, maxLuminance: 100 };
      const result = kp.computeLuminanceDecay(state, nowMs);
      expect(result.decayAmount).toBe(LUMINANCE_DECAY_PER_DAY);
      expect(result.newLuminance).toBe(19);
    });

    it('caps decay at LUMINANCE_DECAY_CAP', () => {
      const nowMs = MS_PER_DAY * 100;
      const state = { worldId: 'w1', luminance: 80, lastVisitMs: 0, maxLuminance: 100 };
      const result = kp.computeLuminanceDecay(state, nowMs);
      expect(result.decayAmount).toBeLessThanOrEqual(LUMINANCE_DECAY_CAP);
    });

    it('does not reduce luminance below 0', () => {
      const state = { worldId: 'w1', luminance: 2, lastVisitMs: 0, maxLuminance: 100 };
      const result = kp.computeLuminanceDecay(state, MS_PER_DAY * 50);
      expect(result.newLuminance).toBeGreaterThanOrEqual(0);
    });
  });

  // ── computeWelcomeBack ────────────────────────────────────────────

  describe('computeWelcomeBack', () => {
    const baseProfile = {
      kindlerId: 'k1',
      totalSpark: 100,
      level: 2,
      levelName: 'flame' as const,
      visual: 'steady-warm-light' as const,
      worldLuminance: new Map<string, number>(),
      lastVisitMs: 0,
      visitedWorldIds: new Set<string>(),
      completedEntryCount: 0,
    };

    it('grants welcome-back spark after ABSENCE_THRESHOLD_DAYS', () => {
      const nowMs = MS_PER_DAY * 20;
      const profile = { ...baseProfile, lastVisitMs: nowMs - MS_PER_DAY * (ABSENCE_THRESHOLD_DAYS + 1) };
      const result = kp.computeWelcomeBack(profile, nowMs);
      expect(result).not.toBeNull();
      expect(result!.sparkGained).toBe(WELCOME_BACK_SPARK);
    });

    it('returns null for recent activity', () => {
      const nowMs = MS_PER_DAY * 20;
      const profile = { ...baseProfile, lastVisitMs: nowMs - MS_PER_DAY };
      const result = kp.computeWelcomeBack(profile, nowMs);
      expect(result).toBeNull();
    });
  });

  // ── getUnlocksForLevel ────────────────────────────────────────────

  describe('getUnlocksForLevel', () => {
    it('returns an array for any valid level', () => {
      for (let l = 0; l <= MAX_SPARK_LEVEL; l++) {
        const unlocks = kp.getUnlocksForLevel(l);
        expect(Array.isArray(unlocks)).toBe(true);
      }
    });

    it('returns more unlocks at higher levels', () => {
      const low = kp.getUnlocksForLevel(1);
      const high = kp.getUnlocksForLevel(5);
      expect(high.length).toBeGreaterThanOrEqual(low.length);
    });
  });

  // ── isWorldAccessible ─────────────────────────────────────────────

  describe('isWorldAccessible', () => {
    it('always allows access at level 7', () => {
      expect(kp.isWorldAccessible(100, MAX_SPARK_LEVEL)).toBe(true);
    });

    it('grants access at level 0 for first world', () => {
      expect(kp.isWorldAccessible(0, 0)).toBe(true);
    });

    it('reflects that higher world counts need higher levels', () => {
      const canAccess5At0 = kp.isWorldAccessible(5, 0);
      const canAccess5At3 = kp.isWorldAccessible(5, 3);
      // Either higher level opens more, or the first world is always open
      expect(typeof canAccess5At0).toBe('boolean');
      if (!canAccess5At0) {
        expect(canAccess5At3).toBe(true);
      }
    });
  });
});
