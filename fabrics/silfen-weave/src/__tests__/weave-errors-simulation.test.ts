import { describe, expect, it } from 'vitest';
import {
  corridorEntityInTransit,
  lockInvalidTransition,
  missionInvalidPhase,
  routeNotFound,
  WeaveError,
} from '../weave-errors.js';

describe('weave-errors simulation', () => {
  it('encodes operational failures with stable codes and context', () => {
    const errors = [
      routeNotFound('origin-1', 'dest-1'),
      lockInvalidTransition('lock-1', 'initiated', 'arrived'),
      missionInvalidPhase('mission-1', 'planning', 'in_transit'),
      corridorEntityInTransit('entity-9'),
    ];

    for (const err of errors) {
      expect(err).toBeInstanceOf(WeaveError);
      expect(err.code.length).toBeGreaterThan(3);
      expect(Object.keys(err.context).length).toBeGreaterThan(0);
    }
  });
});
