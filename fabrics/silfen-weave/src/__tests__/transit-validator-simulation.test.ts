import { describe, expect, it } from 'vitest';
import {
  createTransitValidator,
  entityLockRule,
  requiredComponentsRule,
  worldCapacityRule,
} from '../transit-validator.js';

function makeValidator() {
  let now = 1_000_000;
  const validator = createTransitValidator({
    clock: { nowMicroseconds: () => (now += 1_000) },
  });
  validator.registerRule(requiredComponentsRule(['Position', 'Health']));
  validator.registerRule(worldCapacityRule());
  validator.registerRule(entityLockRule());
  return validator;
}

describe('transit-validator simulation', () => {
  it('blocks invalid entities and allows corrected entities', () => {
    const validator = makeValidator();

    const blocked = validator.validatePreTransit({
      entityId: 'e-1',
      originWorldId: 'w-a',
      destinationWorldId: 'w-b',
      entityComponents: ['Position'],
      entityState: { locked: 'true' },
      destinationCapacity: { currentPopulation: 100, maxPopulation: 100 },
    });
    expect(blocked.valid).toBe(false);
    expect(blocked.issues.length).toBeGreaterThan(0);

    const ok = validator.validatePreTransit({
      entityId: 'e-1',
      originWorldId: 'w-a',
      destinationWorldId: 'w-b',
      entityComponents: ['Position', 'Health'],
      entityState: { locked: 'false' },
      destinationCapacity: { currentPopulation: 99, maxPopulation: 100 },
    });
    expect(ok.valid).toBe(true);
    expect(ok.issues).toHaveLength(0);
  });
});
