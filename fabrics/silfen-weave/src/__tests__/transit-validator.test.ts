import { describe, it, expect } from 'vitest';
import {
  createTransitValidator,
  requiredComponentsRule,
  worldCapacityRule,
  entityLockRule,
} from '../transit-validator.js';
import type {
  ValidationContext,
  TransitValidationRule,
  TransitValidatorDeps,
} from '../transit-validator.js';

function makeDeps(): TransitValidatorDeps {
  let time = 1_000_000;
  return { clock: { nowMicroseconds: () => (time += 1_000_000) } };
}

function makeContext(overrides?: Partial<ValidationContext>): ValidationContext {
  return {
    entityId: 'entity-1',
    originWorldId: 'world-a',
    destinationWorldId: 'world-b',
    entityComponents: ['Position', 'Health', 'Inventory'],
    entityState: {},
    destinationCapacity: { currentPopulation: 50, maxPopulation: 1000 },
    ...overrides,
  };
}

describe('TransitValidator — rule registration', () => {
  it('registers a rule', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(requiredComponentsRule(['Position']));
    expect(v.ruleCount()).toBe(1);
    expect(v.listRules()).toContain('required_components');
  });

  it('removes a rule', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(requiredComponentsRule(['Position']));
    const removed = v.removeRule('required_components');
    expect(removed).toBe(true);
    expect(v.ruleCount()).toBe(0);
  });

  it('returns false when removing unknown rule', () => {
    const v = createTransitValidator(makeDeps());
    expect(v.removeRule('nonexistent')).toBe(false);
  });
});

describe('TransitValidator — pre-transit validation', () => {
  it('passes when all required components present', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(requiredComponentsRule(['Position', 'Health']));

    const result = v.validatePreTransit(makeContext());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('fails when required component missing', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(requiredComponentsRule(['Position', 'Shield']));

    const result = v.validatePreTransit(makeContext());
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe('MISSING_COMPONENT');
  });

  it('reports multiple missing components', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(requiredComponentsRule(['Shield', 'Weapon', 'Armor']));

    const result = v.validatePreTransit(makeContext());
    expect(result.issues).toHaveLength(3);
  });

  it('fails when world at capacity', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(worldCapacityRule());

    const result = v.validatePreTransit(makeContext({
      destinationCapacity: { currentPopulation: 1000, maxPopulation: 1000 },
    }));
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('WORLD_AT_CAPACITY');
  });

  it('passes when world has room', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(worldCapacityRule());

    const result = v.validatePreTransit(makeContext({
      destinationCapacity: { currentPopulation: 999, maxPopulation: 1000 },
    }));
    expect(result.valid).toBe(true);
  });

  it('fails when entity is locked', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(entityLockRule());

    const result = v.validatePreTransit(makeContext({
      entityState: { locked: 'true' },
    }));
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('ENTITY_LOCKED');
  });

  it('passes when entity is not locked', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(entityLockRule());

    const result = v.validatePreTransit(makeContext({
      entityState: { locked: 'false' },
    }));
    expect(result.valid).toBe(true);
  });
});

describe('TransitValidator — post-transit validation', () => {
  it('runs rules with phase both', () => {
    const bothRule: TransitValidationRule = {
      name: 'both_phase',
      phase: 'both',
      check: (ctx) => [{
        code: 'CHECK_RAN',
        severity: 'warning',
        message: 'Post-transit check for ' + ctx.entityId,
        entityId: ctx.entityId,
      }],
    };

    const v = createTransitValidator(makeDeps());
    v.registerRule(bothRule);

    const result = v.validatePostTransit(makeContext());
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe('CHECK_RAN');
  });

  it('skips pre-transit-only rules during post-transit', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(requiredComponentsRule(['Nonexistent']));

    const result = v.validatePostTransit(makeContext());
    expect(result.issues).toHaveLength(0);
  });

  it('runs post-transit-only rules', () => {
    const postOnly: TransitValidationRule = {
      name: 'post_only',
      phase: 'post_transit',
      check: () => [{
        code: 'POST_CHECK',
        severity: 'warning',
        message: 'Post-transit reconciliation',
        entityId: 'entity-1',
      }],
    };

    const v = createTransitValidator(makeDeps());
    v.registerRule(postOnly);

    const pre = v.validatePreTransit(makeContext());
    const post = v.validatePostTransit(makeContext());

    expect(pre.issues).toHaveLength(0);
    expect(post.issues).toHaveLength(1);
  });
});

describe('TransitValidator — result metadata', () => {
  it('includes entity and world IDs', () => {
    const v = createTransitValidator(makeDeps());
    const result = v.validatePreTransit(makeContext({
      entityId: 'entity-42',
      originWorldId: 'earth',
      destinationWorldId: 'mars',
    }));

    expect(result.entityId).toBe('entity-42');
    expect(result.originWorldId).toBe('earth');
    expect(result.destinationWorldId).toBe('mars');
  });

  it('includes timestamp', () => {
    const v = createTransitValidator(makeDeps());
    const result = v.validatePreTransit(makeContext());
    expect(result.validatedAt).toBeGreaterThan(0);
  });

  it('warnings do not invalidate result', () => {
    const warnRule: TransitValidationRule = {
      name: 'warn_rule',
      phase: 'pre_transit',
      check: () => [{
        code: 'MILD_ISSUE',
        severity: 'warning',
        message: 'Non-blocking issue',
        entityId: 'entity-1',
      }],
    };

    const v = createTransitValidator(makeDeps());
    v.registerRule(warnRule);

    const result = v.validatePreTransit(makeContext());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
  });
});

describe('TransitValidator — multiple rules', () => {
  it('aggregates issues from all rules', () => {
    const v = createTransitValidator(makeDeps());
    v.registerRule(requiredComponentsRule(['Shield']));
    v.registerRule(entityLockRule());

    const result = v.validatePreTransit(makeContext({
      entityState: { locked: 'true' },
    }));

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(2);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('MISSING_COMPONENT');
    expect(codes).toContain('ENTITY_LOCKED');
  });

  it('no rules means valid result', () => {
    const v = createTransitValidator(makeDeps());
    const result = v.validatePreTransit(makeContext());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
