import { describe, it, expect } from 'vitest';
import {
  LoomError,
  entityNotFound,
  entityAlreadyExists,
  componentNotFound,
  worldNotFound,
  worldAlreadyExists,
  eventBusClosed,
  worldCapacityReached,
} from '../errors.js';

describe('LoomError', () => {
  it('carries code, message, and context', () => {
    const err = new LoomError('ENTITY_NOT_FOUND', 'oops', { id: 'e1' }, 'corr-1');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('ENTITY_NOT_FOUND');
    expect(err.message).toBe('oops');
    expect(err.context).toEqual({ id: 'e1' });
    expect(err.correlationId).toBe('corr-1');
    expect(err.name).toBe('LoomError');
  });

  it('defaults context to empty object when omitted', () => {
    const err = new LoomError('EVENT_BUS_CLOSED', 'closed');
    expect(err.context).toEqual({});
    expect(err.correlationId).toBeUndefined();
  });
});

describe('entityNotFound', () => {
  it('creates error with correct code and context', () => {
    const err = entityNotFound('e42', 'req-1');
    expect(err.code).toBe('ENTITY_NOT_FOUND');
    expect(err.context['entityId']).toBe('e42');
    expect(err.correlationId).toBe('req-1');
  });
});

describe('entityAlreadyExists', () => {
  it('creates error with correct code', () => {
    const err = entityAlreadyExists('e1');
    expect(err.code).toBe('ENTITY_ALREADY_EXISTS');
    expect(err.context['entityId']).toBe('e1');
  });
});

describe('componentNotFound', () => {
  it('includes entityId and componentType in context', () => {
    const err = componentNotFound('e1', 'Position');
    expect(err.code).toBe('COMPONENT_NOT_FOUND');
    expect(err.context['entityId']).toBe('e1');
    expect(err.context['componentType']).toBe('Position');
  });
});

describe('worldNotFound', () => {
  it('creates error with worldId in context', () => {
    const err = worldNotFound('w1');
    expect(err.code).toBe('WORLD_NOT_FOUND');
    expect(err.context['worldId']).toBe('w1');
  });
});

describe('worldAlreadyExists', () => {
  it('creates error with correct code', () => {
    const err = worldAlreadyExists('w1');
    expect(err.code).toBe('WORLD_ALREADY_EXISTS');
  });
});

describe('eventBusClosed', () => {
  it('creates error with correct code and empty context', () => {
    const err = eventBusClosed();
    expect(err.code).toBe('EVENT_BUS_CLOSED');
    expect(err.context).toEqual({});
  });
});

describe('worldCapacityReached', () => {
  it('carries worldId and capacity in context', () => {
    const err = worldCapacityReached('w1', 100, 'corr-2');
    expect(err.code).toBe('WORLD_CAPACITY_REACHED');
    expect(err.context['worldId']).toBe('w1');
    expect(err.context['capacity']).toBe(100);
    expect(err.correlationId).toBe('corr-2');
  });
});
