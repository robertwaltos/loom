import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeDriftScore,
  getDriftIntensity,
  computeAgingDriftProfile,
  getDialogueDriftModifiers,
  type DriftIntensity,
  type AgingDriftProfile,
  type DialogueDriftModifiers,
} from '../npc-aging-simulation.js';

describe('npc-aging-simulation', () => {
  describe('computeDriftScore', () => {
    it('returns 0 for tier 4 regardless of age', () => {
      expect(computeDriftScore(9999, 4, 'NOT_ELIGIBLE')).toBe(0);
    });

    it('returns 0 for tier 3 below age 100', () => {
      expect(computeDriftScore(50, 3, 'NOT_ELIGIBLE')).toBe(0);
    });

    it('returns 0 at exactly drift start for tier 3', () => {
      const score = computeDriftScore(99, 3, 'NOT_ELIGIBLE');
      expect(score).toBe(0);
    });

    it('returns value between 0 and 1 for tier 3 at age 125', () => {
      const score = computeDriftScore(125, 3, 'NOT_ELIGIBLE');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
      expect(score).toBeCloseTo(0.5, 5);
    });

    it('returns 1 for tier 3 at age 150 or above', () => {
      expect(computeDriftScore(150, 3, 'NOT_ELIGIBLE')).toBe(1);
      expect(computeDriftScore(200, 3, 'NOT_ELIGIBLE')).toBe(1);
    });

    it('returns 0 for tier 2 enrolled below age 150', () => {
      expect(computeDriftScore(100, 2, 'ENROLLED')).toBe(0);
    });

    it('returns 1 for tier 2 enrolled at age 220', () => {
      expect(computeDriftScore(220, 2, 'ENROLLED')).toBe(1);
    });

    it('returns drift for tier 2 enrolled at age 185', () => {
      const score = computeDriftScore(185, 2, 'ENROLLED');
      expect(score).toBeCloseTo(0.5, 5);
    });

    it('returns 0 for tier 2 refused below age 60', () => {
      expect(computeDriftScore(30, 2, 'REFUSED')).toBe(0);
    });

    it('returns 1 for tier 2 refused at age 80', () => {
      expect(computeDriftScore(80, 2, 'REFUSED')).toBe(1);
    });

    it('returns drift for tier 2 refused at age 70', () => {
      const score = computeDriftScore(70, 2, 'REFUSED');
      expect(score).toBeCloseTo(0.5, 5);
    });
  });

  describe('getDriftIntensity', () => {
    it('returns NONE for score 0', () => {
      expect(getDriftIntensity(0)).toBe('NONE');
    });

    it('returns MILD for score 0.1', () => {
      expect(getDriftIntensity(0.1)).toBe('MILD');
    });

    it('returns MODERATE for score 0.3', () => {
      expect(getDriftIntensity(0.3)).toBe('MODERATE');
    });

    it('returns SIGNIFICANT for score 0.6', () => {
      expect(getDriftIntensity(0.6)).toBe('SIGNIFICANT');
    });

    it('returns INTENSE for score 0.75', () => {
      expect(getDriftIntensity(0.75)).toBe('INTENSE');
    });

    it('returns INTENSE for score 1', () => {
      expect(getDriftIntensity(1)).toBe('INTENSE');
    });
  });

  describe('computeAgingDriftProfile', () => {
    it('returns a profile with zero drift for young NPC', () => {
      const profile = computeAgingDriftProfile(1, 30, 3, 'NOT_ELIGIBLE');
      expect(profile.characterId).toBe(1);
      expect(profile.age).toBe(30);
      expect(profile.driftScore).toBe(0);
      expect(profile.intensity).toBe('NONE');
      expect(profile.dialogueDirectnessModifier).toBe(0);
    });

    it('returns wound expression intensifier of 1 for no drift', () => {
      const profile = computeAgingDriftProfile(1, 30, 3, 'NOT_ELIGIBLE');
      expect(profile.woundExpressionIntensifier).toBe(1);
    });

    it('returns wound expression intensifier of 3 for full drift', () => {
      const profile = computeAgingDriftProfile(1, 200, 3, 'NOT_ELIGIBLE');
      expect(profile.woundExpressionIntensifier).toBe(3);
    });

    it('returns secret concealment difficulty of 0.8 at full drift', () => {
      const profile = computeAgingDriftProfile(1, 200, 3, 'NOT_ELIGIBLE');
      expect(profile.secretConcealmentDifficulty).toBeCloseTo(0.8, 5);
    });

    it('returns question urgency modifier of 2.5 at full drift', () => {
      const profile = computeAgingDriftProfile(1, 200, 3, 'NOT_ELIGIBLE');
      expect(profile.questionUrgencyModifier).toBeCloseTo(2.5, 5);
    });

    it('contains a non-empty description', () => {
      const profile = computeAgingDriftProfile(1, 130, 3, 'NOT_ELIGIBLE');
      expect(profile.description.length).toBeGreaterThan(0);
    });

    it('returns accelerated drift description for tier 2 refused', () => {
      const profile = computeAgingDriftProfile(1, 62, 2, 'REFUSED');
      expect(profile.intensity).toBe('MILD');
      expect(profile.description).toContain('Accelerated');
    });
  });

  describe('getDialogueDriftModifiers', () => {
    it('returns guarded directness for score 0', () => {
      const mods = getDialogueDriftModifiers(0);
      expect(mods.directnessLevel).toBe('guarded');
      expect(mods.willRevealWound).toBe(false);
      expect(mods.willRevealSecretFragment).toBe(false);
      expect(mods.willRaiseQuestion).toBe(false);
      expect(mods.unlocksPillarDialogue).toBe(false);
    });

    it('returns neutral directness for mild drift', () => {
      const mods = getDialogueDriftModifiers(0.1);
      expect(mods.directnessLevel).toBe('neutral');
    });

    it('reveals wound at score 0.3', () => {
      const mods = getDialogueDriftModifiers(0.3);
      expect(mods.willRevealWound).toBe(true);
    });

    it('raises question at score 0.2', () => {
      const mods = getDialogueDriftModifiers(0.2);
      expect(mods.willRaiseQuestion).toBe(true);
    });

    it('unlocks pillar dialogue at score 0.5', () => {
      const mods = getDialogueDriftModifiers(0.5);
      expect(mods.unlocksPillarDialogue).toBe(true);
    });

    it('reveals secret fragment at score 0.6', () => {
      const mods = getDialogueDriftModifiers(0.6);
      expect(mods.willRevealSecretFragment).toBe(true);
    });

    it('returns fully_candid at score 1.0', () => {
      const mods = getDialogueDriftModifiers(1.0);
      expect(mods.directnessLevel).toBe('fully_candid');
      expect(mods.willRevealWound).toBe(true);
      expect(mods.willRevealSecretFragment).toBe(true);
      expect(mods.willRaiseQuestion).toBe(true);
      expect(mods.unlocksPillarDialogue).toBe(true);
    });
  });
});
