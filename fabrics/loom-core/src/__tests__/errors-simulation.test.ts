import { describe, expect, it } from 'vitest';
import {
  componentNotFound,
  entityAlreadyExists,
  entityNotFound,
  eventBusClosed,
  worldCapacityReached,
} from '../errors.js';

describe('errors simulation', () => {
  it('simulates structured domain error emission with context for observability', () => {
    const missing = entityNotFound('e-404', 'corr-a');
    const exists = entityAlreadyExists('e-101', 'corr-b');
    const component = componentNotFound('e-404', 'Position', 'corr-c');
    const closed = eventBusClosed('corr-d');
    const capacity = worldCapacityReached('world-9', 500, 'corr-e');

    expect(missing.code).toBe('ENTITY_NOT_FOUND');
    expect(exists.context['entityId']).toBe('e-101');
    expect(component.context['componentType']).toBe('Position');
    expect(closed.message).toContain('closed');
    expect(capacity.context['capacity']).toBe(500);
  });
});
