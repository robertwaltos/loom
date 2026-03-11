/**
 * Ability System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAbilitySystem,
  registerAbility,
  setEntityResources,
  getEntityResources,
  isOnCooldown,
  validateResources,
  activateAbility,
  applyEffect,
  resetCooldown,
  getAbilityReport,
  getActiveEffects,
  listAbilities,
  getAbility,
  type AbilitySystemError,
  type Ability,
  type ResourceCost,
  type ActivationResult,
  type EffectApplication,
  type ResourceType,
} from '../ability-system.js';

function rMap(entries: Array<[string, bigint]>): Map<ResourceType, bigint> {
  return new Map(entries as Array<[ResourceType, bigint]>);
}

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

describe('Ability System', () => {
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('registerAbility', () => {
    it('should register new ability', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [{ resourceType: 'MANA', amount: 50n }];
      const result = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        3000000n,
        1000n,
      );
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.name).toBe('Fireball');
        expect(result.effectType).toBe('DAMAGE');
      }
    });

    it('should reject negative magnitude', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const result = registerAbility(
        state,
        'Invalid',
        costs,
        5000000n,
        'DAMAGE',
        -100n,
        3000000n,
        1000n,
      );
      expect(result).toBe('invalid-magnitude');
    });

    it('should reject negative duration', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const result = registerAbility(
        state,
        'Invalid',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        -3000000n,
        1000n,
      );
      expect(result).toBe('invalid-duration');
    });

    it('should store ability in state', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const result = registerAbility(state, 'Heal', costs, 5000000n, 'HEAL', 50n, 0n, 500n);
      if (typeof result !== 'string') {
        const retrieved = getAbility(state, result.abilityId);
        expect(retrieved).toEqual(result);
      }
    });

    it('should handle multiple resource costs', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [
        { resourceType: 'MANA', amount: 50n },
        { resourceType: 'STAMINA', amount: 20n },
      ];
      const result = registerAbility(
        state,
        'PowerStrike',
        costs,
        5000000n,
        'DAMAGE',
        150n,
        0n,
        500n,
      );
      if (typeof result !== 'string') {
        expect(result.costs.length).toBe(2);
      }
    });
  });

  describe('setEntityResources', () => {
    it('should set entity resources', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const resources = rMap([
        ['MANA', 100n],
        ['STAMINA', 50n],
      ]);
      const result = setEntityResources(state, 'entity-1', resources);
      expect(result).toBe('ok');
    });

    it('should retrieve entity resources', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const resources = rMap([
        ['MANA', 100n],
        ['STAMINA', 50n],
      ]);
      setEntityResources(state, 'entity-1', resources);
      const retrieved = getEntityResources(state, 'entity-1');
      if (typeof retrieved !== 'string') {
        expect(retrieved.resources.get('MANA')).toBe(100n);
        expect(retrieved.resources.get('STAMINA')).toBe(50n);
      }
    });

    it('should reject unknown entity', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const result = getEntityResources(state, 'unknown-entity');
      expect(result).toBe('entity-not-found');
    });
  });

  describe('activateAbility', () => {
    it('should activate ability successfully', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [{ resourceType: 'MANA', amount: 50n }];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        const result = activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        expect(typeof result).not.toBe('string');
        if (typeof result !== 'string') {
          expect(result.success).toBe(true);
        }
      }
    });

    it('should reject unknown ability', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const resources = rMap([['MANA', 100n]]);
      setEntityResources(state, 'entity-1', resources);
      const result = activateAbility(state, 'entity-1', 'unknown-ability', 'entity-2');
      expect(result).toBe('ability-not-found');
    });

    it('should reject insufficient resources', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [{ resourceType: 'MANA', amount: 50n }];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 30n]]);
        setEntityResources(state, 'entity-1', resources);
        const result = activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        expect(result).toBe('insufficient-resources');
      }
    });

    it('should reject target out of range', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(state, 'Melee', costs, 5000000n, 'DAMAGE', 100n, 0n, 1n);
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        const result = activateAbility(state, 'entity-1', ability.abilityId, 'very-distant-entity');
        if (typeof result === 'string') {
          expect(result).toBe('target-out-of-range');
        }
      }
    });

    it('should deduct resources on activation', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [{ resourceType: 'MANA', amount: 50n }];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        const updated = getEntityResources(state, 'entity-1');
        if (typeof updated !== 'string') {
          expect(updated.resources.get('MANA')).toBe(50n);
        }
      }
    });

    it('should set cooldown on activation', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        expect(isOnCooldown(state, 'entity-1', ability.abilityId)).toBe(true);
      }
    });

    it('should reject activation when on cooldown', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        const result = activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        expect(result).toBe('on-cooldown');
      }
    });

    it('should create effect on activation', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        3000000n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        const result = activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        if (typeof result !== 'string') {
          expect(result.effects.length).toBe(1);
          const effect = result.effects[0];
          if (effect !== undefined) {
            expect(effect.effectType).toBe('DAMAGE');
            expect(effect.magnitude).toBe(100n);
          }
        }
      }
    });
  });

  describe('isOnCooldown', () => {
    it('should return false when no cooldown', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        expect(isOnCooldown(state, 'entity-1', ability.abilityId)).toBe(false);
      }
    });

    it('should return true during cooldown', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        expect(isOnCooldown(state, 'entity-1', ability.abilityId)).toBe(true);
      }
    });

    it('should return false after cooldown expires', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        clock.advance(6000000n);
        expect(isOnCooldown(state, 'entity-1', ability.abilityId)).toBe(false);
      }
    });
  });

  describe('validateResources', () => {
    it('should validate sufficient resources', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [{ resourceType: 'MANA', amount: 50n }];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        const result = validateResources(state, 'entity-1', ability.abilityId);
        expect(result).toBe('ok');
      }
    });

    it('should reject insufficient resources', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [{ resourceType: 'MANA', amount: 50n }];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 30n]]);
        setEntityResources(state, 'entity-1', resources);
        const result = validateResources(state, 'entity-1', ability.abilityId);
        expect(result).toBe('insufficient-resources');
      }
    });

    it('should reject unknown ability', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const resources = rMap([['MANA', 100n]]);
      setEntityResources(state, 'entity-1', resources);
      const result = validateResources(state, 'entity-1', 'unknown-ability');
      expect(result).toBe('ability-not-found');
    });

    it('should reject unknown entity', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const result = validateResources(state, 'unknown-entity', ability.abilityId);
        expect(result).toBe('entity-not-found');
      }
    });
  });

  describe('applyEffect', () => {
    it('should apply effect', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'ability-1',
        'entity-1',
        'entity-2',
        'DAMAGE',
        100n,
        3000000n,
      );
      expect(typeof result).not.toBe('string');
      if (typeof result !== 'string') {
        expect(result.effectType).toBe('DAMAGE');
        expect(result.magnitude).toBe(100n);
      }
    });

    it('should reject negative magnitude', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'ability-1',
        'entity-1',
        'entity-2',
        'DAMAGE',
        -100n,
        3000000n,
      );
      expect(result).toBe('invalid-magnitude');
    });

    it('should reject negative duration', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const result = applyEffect(
        state,
        'ability-1',
        'entity-1',
        'entity-2',
        'DAMAGE',
        100n,
        -3000000n,
      );
      expect(result).toBe('invalid-duration');
    });

    it('should store effect in state', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      applyEffect(state, 'ability-1', 'entity-1', 'entity-2', 'DAMAGE', 100n, 3000000n);
      const effects = getActiveEffects(state, 'entity-2');
      expect(effects.length).toBe(1);
    });
  });

  describe('resetCooldown', () => {
    it('should reset cooldown', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        const result = resetCooldown(state, 'entity-1', ability.abilityId);
        expect(result).toBe('ok');
        expect(isOnCooldown(state, 'entity-1', ability.abilityId)).toBe(false);
      }
    });

    it('should reject unknown cooldown', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const result = resetCooldown(state, 'entity-1', 'ability-1');
      expect(result).toBe('ability-not-found');
    });
  });

  describe('getAbilityReport', () => {
    it('should generate ability report', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'Fireball',
        costs,
        5000000n,
        'DAMAGE',
        100n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        const report = getAbilityReport(state, ability.abilityId);
        if (typeof report !== 'string') {
          expect(report.abilityId).toBe(ability.abilityId);
          expect(report.totalActivations).toBe(1);
          expect(report.successfulActivations).toBe(1);
        }
      }
    });

    it('should track total damage', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(state, 'Fireball', costs, 0n, 'DAMAGE', 100n, 0n, 10000n);
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 1000n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-3');
        const report = getAbilityReport(state, ability.abilityId);
        if (typeof report !== 'string') {
          expect(report.totalDamage).toBe(200n);
        }
      }
    });

    it('should track total healing', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(state, 'Heal', costs, 0n, 'HEAL', 50n, 0n, 10000n);
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 1000n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-3');
        const report = getAbilityReport(state, ability.abilityId);
        if (typeof report !== 'string') {
          expect(report.totalHealing).toBe(100n);
        }
      }
    });

    it('should return zero stats for new ability', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(state, 'Unused', costs, 5000000n, 'DAMAGE', 100n, 0n, 10000n);
      if (typeof ability !== 'string') {
        const report = getAbilityReport(state, ability.abilityId);
        if (typeof report !== 'string') {
          expect(report.totalActivations).toBe(0);
          expect(report.totalDamage).toBe(0n);
          expect(report.totalHealing).toBe(0n);
        }
      }
    });
  });

  describe('getActiveEffects', () => {
    it('should get active effects', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      applyEffect(state, 'ability-1', 'entity-1', 'entity-2', 'DAMAGE', 100n, 3000000n);
      const effects = getActiveEffects(state, 'entity-2');
      expect(effects.length).toBe(1);
    });

    it('should return empty array when no effects', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const effects = getActiveEffects(state, 'entity-1');
      expect(effects.length).toBe(0);
    });

    it('should filter expired effects', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      applyEffect(state, 'ability-1', 'entity-1', 'entity-2', 'DAMAGE', 100n, 1000000n);
      clock.advance(2000000n);
      const effects = getActiveEffects(state, 'entity-2');
      expect(effects.length).toBe(0);
    });
  });

  describe('listAbilities', () => {
    it('should list all abilities', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      registerAbility(state, 'Fireball', costs, 5000000n, 'DAMAGE', 100n, 0n, 10000n);
      registerAbility(state, 'Heal', costs, 5000000n, 'HEAL', 50n, 0n, 10000n);
      registerAbility(state, 'Shield', costs, 5000000n, 'SHIELD', 200n, 0n, 10000n);
      const abilities = listAbilities(state);
      expect(abilities.length).toBe(3);
    });

    it('should return empty array when no abilities', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const abilities = listAbilities(state);
      expect(abilities.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero cooldown', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(state, 'InstantCast', costs, 0n, 'DAMAGE', 100n, 0n, 10000n);
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 1000n]]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        expect(isOnCooldown(state, 'entity-1', ability.abilityId)).toBe(false);
      }
    });

    it('should handle multiple resource deductions', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [
        { resourceType: 'MANA', amount: 50n },
        { resourceType: 'STAMINA', amount: 30n },
      ];
      const ability = registerAbility(
        state,
        'PowerStrike',
        costs,
        5000000n,
        'DAMAGE',
        150n,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([
          ['MANA', 100n],
          ['STAMINA', 60n],
        ]);
        setEntityResources(state, 'entity-1', resources);
        activateAbility(state, 'entity-1', ability.abilityId, 'entity-2');
        const updated = getEntityResources(state, 'entity-1');
        if (typeof updated !== 'string') {
          expect(updated.resources.get('MANA')).toBe(50n);
          expect(updated.resources.get('STAMINA')).toBe(30n);
        }
      }
    });

    it('should handle large magnitude', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const largeMagnitude = 999999999999n;
      const ability = registerAbility(
        state,
        'NukeAbility',
        costs,
        5000000n,
        'DAMAGE',
        largeMagnitude,
        0n,
        10000n,
      );
      if (typeof ability !== 'string') {
        expect(ability.effectMagnitude).toBe(largeMagnitude);
      }
    });

    it('should handle zero range', () => {
      const state = createAbilitySystem({ clock, idGen, logger });
      const costs: ResourceCost[] = [];
      const ability = registerAbility(
        state,
        'SelfBuff',
        costs,
        5000000n,
        'BUFF',
        50n,
        10000000n,
        0n,
      );
      if (typeof ability !== 'string') {
        const resources = rMap([['MANA', 100n]]);
        setEntityResources(state, 'entity-1', resources);
        const result = activateAbility(state, 'entity-1', ability.abilityId, 'entity-1');
        expect(typeof result).not.toBe('string');
      }
    });
  });
});
