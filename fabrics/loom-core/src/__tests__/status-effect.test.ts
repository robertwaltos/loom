/**
 * Status Effect System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStatusEffectSystem,
  applyEffect,
  removeEffect,
  grantImmunity,
  revokeImmunity,
  tickEffects,
  getActiveEffects,
  getStatusReport,
  clearAllEffects,
  clearAllImmunities,
  removeEffectsByType,
  type StatusEffectError,
  type StatusEffect,
  type ActiveEffect,
  type ImmunityRecord,
  type StatusReport,
  type TickResult,
  type EffectType,
  type StackBehavior,
} from '../status-effect.js';

class TestClock {
  private currentUs = 1000000000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter = this.counter + 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

describe('Status Effect System', () => {
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('applyEffect', () => {
    it('should apply effect successfully', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.effectType).toBe('POISON');
        expect(result.magnitude).toBe(10n);
      }
    });

    it('should reject negative magnitude', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        -10n,
        5000000n,
        'STACK',
        1000000n,
      );
      expect(result).toBe('invalid-magnitude');
    });

    it('should reject zero duration', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        0n,
        'STACK',
        1000000n,
      );
      expect(result).toBe('invalid-duration');
    });

    it('should reject negative duration', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        -5000000n,
        'STACK',
        1000000n,
      );
      expect(result).toBe('invalid-duration');
    });

    it('should reject zero tick interval', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        0n,
      );
      expect(result).toBe('invalid-tick-interval');
    });

    it('should reject when immune', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'target-1', 'POISON', 10000000n);
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      expect(result).toBe('immune-to-effect');
    });

    it('should handle REPLACE stack behavior', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'REPLACE', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'POISON', 20n, 6000000n, 'REPLACE', 1000000n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(1);
      const first = effects[0];
      if (first !== undefined) {
        expect(first.magnitude).toBe(20n);
      }
    });

    it('should handle EXTEND stack behavior', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'EXTEND', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'POISON', 10n, 3000000n, 'EXTEND', 1000000n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(1);
    });

    it('should handle STACK stack behavior', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(2);
    });

    it('should handle REFRESH stack behavior', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'REFRESH', 1000000n);
      clock.advance(3000000n);
      applyEffect(state, 'source-2', 'target-1', 'POISON', 20n, 5000000n, 'REFRESH', 1000000n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(1);
      const first = effects[0];
      if (first !== undefined) {
        expect(first.magnitude).toBe(20n);
      }
    });
  });

  describe('removeEffect', () => {
    it('should remove effect', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const effect = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      if (typeof effect !== 'string') {
        const result = removeEffect(state, 'target-1', effect.effectId);
        expect(result).toBe('ok');
      }
    });

    it('should reject unknown entity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = removeEffect(state, 'unknown-entity', 'effect-id');
      expect(result).toBe('entity-not-found');
    });

    it('should reject unknown effect', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      const result = removeEffect(state, 'target-1', 'unknown-effect');
      expect(result).toBe('effect-not-found');
    });

    it('should remove only specified effect', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const effect1 = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      applyEffect(state, 'source-2', 'target-1', 'BURN', 20n, 5000000n, 'STACK', 1000000n);
      if (typeof effect1 !== 'string') {
        removeEffect(state, 'target-1', effect1.effectId);
        const effects = getActiveEffects(state, 'target-1');
        expect(effects.length).toBe(1);
      }
    });
  });

  describe('grantImmunity', () => {
    it('should grant immunity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = grantImmunity(state, 'entity-1', 'POISON', 10000000n);
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.effectType).toBe('POISON');
      }
    });

    it('should reject zero duration', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = grantImmunity(state, 'entity-1', 'POISON', 0n);
      expect(result).toBe('invalid-duration');
    });

    it('should reject negative duration', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = grantImmunity(state, 'entity-1', 'POISON', -10000000n);
      expect(result).toBe('invalid-duration');
    });

    it('should prevent effect application', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'entity-1', 'POISON', 10000000n);
      const result = applyEffect(
        state,
        'source-1',
        'entity-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      expect(result).toBe('immune-to-effect');
    });

    it('should allow other effect types', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'entity-1', 'POISON', 10000000n);
      const result = applyEffect(
        state,
        'source-1',
        'entity-1',
        'BURN',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      expect(typeof result).not.toBe('string');
    });

    it('should expire after duration', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'entity-1', 'POISON', 5000000n);
      clock.advance(6000000n);
      const result = applyEffect(
        state,
        'source-1',
        'entity-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      expect(typeof result).not.toBe('string');
    });
  });

  describe('revokeImmunity', () => {
    it('should revoke immunity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'entity-1', 'POISON', 10000000n);
      const result = revokeImmunity(state, 'entity-1', 'POISON');
      expect(result).toBe('ok');
    });

    it('should reject unknown entity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = revokeImmunity(state, 'unknown-entity', 'POISON');
      expect(result).toBe('entity-not-found');
    });

    it('should allow effect after revoke', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'entity-1', 'POISON', 10000000n);
      revokeImmunity(state, 'entity-1', 'POISON');
      const result = applyEffect(
        state,
        'source-1',
        'entity-1',
        'POISON',
        10n,
        5000000n,
        'STACK',
        1000000n,
      );
      expect(typeof result).not.toBe('string');
    });
  });

  describe('tickEffects', () => {
    it('should tick effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 10000000n, 'STACK', 1000000n);
      const result = tickEffects(state, 'target-1');
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.length).toBe(1);
      }
    });

    it('should respect tick interval', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 10000000n, 'STACK', 1000000n);
      tickEffects(state, 'target-1');
      clock.advance(500000n);
      const result = tickEffects(state, 'target-1');
      if (typeof result !== 'string') {
        expect(result.length).toBe(0);
      }
    });

    it('should tick after interval passes', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 10000000n, 'STACK', 1000000n);
      tickEffects(state, 'target-1');
      clock.advance(1000000n);
      const result = tickEffects(state, 'target-1');
      if (typeof result !== 'string') {
        expect(result.length).toBe(1);
      }
    });

    it('should return empty array when no effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = tickEffects(state, 'target-1');
      if (typeof result !== 'string') {
        expect(result.length).toBe(0);
      }
    });

    it('should clean expired effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 1000000n, 'STACK', 500000n);
      clock.advance(2000000n);
      tickEffects(state, 'target-1');
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(0);
    });

    it('should tick multiple effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 10000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'BURN', 20n, 10000000n, 'STACK', 1000000n);
      const result = tickEffects(state, 'target-1');
      if (typeof result !== 'string') {
        expect(result.length).toBe(2);
      }
    });
  });

  describe('getActiveEffects', () => {
    it('should get active effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(1);
    });

    it('should return empty array when no effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(0);
    });

    it('should filter expired effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 1000000n, 'STACK', 500000n);
      clock.advance(2000000n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(0);
    });

    it('should compute remaining duration', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      clock.advance(2000000n);
      const effects = getActiveEffects(state, 'target-1');
      const first = effects[0];
      if (first !== undefined) {
        expect(first.remainingDurationUs).toBe(3000000n);
      }
    });

    it('should count stacks', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      const effects = getActiveEffects(state, 'target-1');
      const first = effects[0];
      if (first !== undefined) {
        expect(first.stackCount).toBe(2);
      }
    });
  });

  describe('getStatusReport', () => {
    it('should generate status report', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      grantImmunity(state, 'target-1', 'BURN', 10000000n);
      const report = getStatusReport(state, 'target-1');
      expect(report.entityId).toBe('target-1');
      expect(report.activeEffects.length).toBe(1);
      expect(report.immunities.length).toBe(1);
      expect(report.totalEffects).toBe(1);
    });

    it('should filter expired immunities', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'target-1', 'POISON', 1000000n);
      clock.advance(2000000n);
      const report = getStatusReport(state, 'target-1');
      expect(report.immunities.length).toBe(0);
    });

    it('should return empty report for new entity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const report = getStatusReport(state, 'target-1');
      expect(report.activeEffects.length).toBe(0);
      expect(report.immunities.length).toBe(0);
      expect(report.totalEffects).toBe(0);
    });
  });

  describe('clearAllEffects', () => {
    it('should clear all effects', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'BURN', 20n, 5000000n, 'STACK', 1000000n);
      const result = clearAllEffects(state, 'target-1');
      expect(result).toBe('ok');
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(0);
    });

    it('should reject unknown entity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = clearAllEffects(state, 'unknown-entity');
      expect(result).toBe('entity-not-found');
    });
  });

  describe('clearAllImmunities', () => {
    it('should clear all immunities', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      grantImmunity(state, 'entity-1', 'POISON', 10000000n);
      grantImmunity(state, 'entity-1', 'BURN', 10000000n);
      const result = clearAllImmunities(state, 'entity-1');
      expect(result).toBe('ok');
      const report = getStatusReport(state, 'entity-1');
      expect(report.immunities.length).toBe(0);
    });

    it('should reject unknown entity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = clearAllImmunities(state, 'unknown-entity');
      expect(result).toBe('entity-not-found');
    });
  });

  describe('removeEffectsByType', () => {
    it('should remove effects by type', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-3', 'target-1', 'BURN', 20n, 5000000n, 'STACK', 1000000n);
      const result = removeEffectsByType(state, 'target-1', 'POISON');
      expect(result).toBe('ok');
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(1);
      const first = effects[0];
      if (first !== undefined) {
        expect(first.effectType).toBe('BURN');
      }
    });

    it('should reject unknown entity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = removeEffectsByType(state, 'unknown-entity', 'POISON');
      expect(result).toBe('entity-not-found');
    });
  });

  describe('edge cases', () => {
    it('should handle very short duration', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 1n, 'STACK', 1n);
      clock.advance(2n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(0);
    });

    it('should handle very large magnitude', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const largeMagnitude = 999999999999999n;
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        largeMagnitude,
        5000000n,
        'STACK',
        1000000n,
      );
      if (typeof result !== 'string') {
        expect(result.magnitude).toBe(largeMagnitude);
      }
    });

    it('should handle many effects on one entity', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      for (let i = 0; i < 50; i = i + 1) {
        applyEffect(
          state,
          'source-' + String(i),
          'target-1',
          'POISON',
          10n,
          5000000n,
          'STACK',
          1000000n,
        );
      }
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(50);
    });

    it('should handle many immunities', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const types: EffectType[] = [
        'POISON',
        'BURN',
        'FREEZE',
        'STUN',
        'SLOW',
        'HASTE',
        'REGEN',
        'SHIELD',
        'WEAKNESS',
        'STRENGTH',
      ];
      for (const type of types) {
        grantImmunity(state, 'entity-1', type, 10000000n);
      }
      const report = getStatusReport(state, 'entity-1');
      expect(report.immunities.length).toBe(10);
    });

    it('should handle EXTEND with first application', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        5000000n,
        'EXTEND',
        1000000n,
      );
      expect(typeof result).not.toBe('string');
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(1);
    });

    it('should handle REFRESH with first application', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'source-1',
        'target-1',
        'POISON',
        10n,
        5000000n,
        'REFRESH',
        1000000n,
      );
      expect(typeof result).not.toBe('string');
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(1);
    });

    it('should handle mixed effect types', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 5000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-2', 'target-1', 'BURN', 20n, 5000000n, 'STACK', 1000000n);
      applyEffect(state, 'source-3', 'target-1', 'FREEZE', 30n, 5000000n, 'STACK', 1000000n);
      const effects = getActiveEffects(state, 'target-1');
      expect(effects.length).toBe(3);
    });

    it('should handle effect expiring during tick', () => {
      const state = createStatusEffectSystem({ clock, idGen, logger });
      applyEffect(state, 'source-1', 'target-1', 'POISON', 10n, 2000000n, 'STACK', 1000000n);
      tickEffects(state, 'target-1');
      clock.advance(1000000n);
      tickEffects(state, 'target-1');
      clock.advance(1000000n);
      const result = tickEffects(state, 'target-1');
      if (typeof result !== 'string') {
        expect(result.length).toBe(0);
      }
    });
  });
});
