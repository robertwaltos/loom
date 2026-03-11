import { describe, it, expect } from 'vitest';
import { createEventFactory } from '../event-factory.js';
import { createFakeClock } from '../clock.js';
import { createSequentialIdGenerator } from '../id-generator.js';

describe('EventFactory', () => {
  it('creates events with proper metadata', () => {
    const clock = createFakeClock(5_000_000);
    const idGen = createSequentialIdGenerator('ef');
    const factory = createEventFactory(clock, idGen);

    const event = factory.create(
      'entity.spawned',
      { entityId: 'ent-1' },
      { worldId: 'world-1', fabricId: 'loom-core' },
    );

    expect(event.type).toBe('entity.spawned');
    expect(event.payload).toEqual({ entityId: 'ent-1' });
    expect(event.metadata.eventId).toBe('ef-000001');
    expect(event.metadata.timestamp).toBe(5_000_000);
    expect(event.metadata.sourceWorldId).toBe('world-1');
    expect(event.metadata.sourceFabricId).toBe('loom-core');
    expect(event.metadata.schemaVersion).toBe(1);
  });

  it('assigns incrementing sequence numbers per source', () => {
    const factory = createEventFactory(createFakeClock(), createSequentialIdGenerator());
    const source = { worldId: 'w1', fabricId: 'f1' };

    const e1 = factory.create('a', {}, source);
    const e2 = factory.create('b', {}, source);

    expect(e1.metadata.sequenceNumber).toBe(1);
    expect(e2.metadata.sequenceNumber).toBe(2);
  });

  it('maintains separate sequences per source', () => {
    const factory = createEventFactory(createFakeClock(), createSequentialIdGenerator());

    const e1 = factory.create('a', {}, { worldId: 'w1', fabricId: 'f1' });
    const e2 = factory.create('b', {}, { worldId: 'w2', fabricId: 'f1' });

    expect(e1.metadata.sequenceNumber).toBe(1);
    expect(e2.metadata.sequenceNumber).toBe(1);
  });

  it('uses correlation from causation when provided', () => {
    const factory = createEventFactory(createFakeClock(), createSequentialIdGenerator());
    const source = { worldId: 'w1', fabricId: 'f1' };

    const event = factory.create('b', {}, source, {
      correlationId: 'original-corr',
      causationId: 'cause-1',
    });

    expect(event.metadata.correlationId).toBe('original-corr');
    expect(event.metadata.causationId).toBe('cause-1');
  });

  it('uses eventId as correlationId when no causation', () => {
    const factory = createEventFactory(createFakeClock(), createSequentialIdGenerator('x'));
    const source = { worldId: 'w1', fabricId: 'f1' };

    const event = factory.create('test', {}, source);
    expect(event.metadata.correlationId).toBe(event.metadata.eventId);
    expect(event.metadata.causationId).toBeNull();
  });
});
