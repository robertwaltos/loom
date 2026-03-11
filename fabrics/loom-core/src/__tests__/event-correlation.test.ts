import { describe, it, expect } from 'vitest';
import { createEventCorrelationEngine } from '../event-correlation.js';
import type { EventCorrelationDeps } from '../event-correlation.js';

function makeDeps(): EventCorrelationDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'corr-' + String(++id) },
  };
}

describe('EventCorrelationEngine — add events', () => {
  it('adds an event with auto-generated correlation ID', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    const event = engine.addEvent({ eventId: 'e1', eventType: 'player.joined' });
    expect(event.correlationId).toBe('corr-1');
    expect(event.eventType).toBe('player.joined');
  });

  it('adds an event with explicit correlation ID', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    const event = engine.addEvent({
      eventId: 'e1',
      eventType: 'spawn',
      correlationId: 'session-abc',
    });
    expect(event.correlationId).toBe('session-abc');
  });

  it('retrieves an event by ID', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'test' });
    const event = engine.getEvent('e1');
    expect(event?.eventId).toBe('e1');
  });

  it('returns undefined for unknown event', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    expect(engine.getEvent('unknown')).toBeUndefined();
  });
});

describe('EventCorrelationEngine — correlation groups', () => {
  it('creates a group for new correlation ID', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({
      eventId: 'e1',
      eventType: 'a',
      correlationId: 'g1',
    });
    const group = engine.getGroup('g1');
    expect(group?.correlationId).toBe('g1');
    expect(group?.events).toHaveLength(1);
    expect(group?.rootEventId).toBe('e1');
  });

  it('adds events to existing group', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'a', correlationId: 'g1' });
    engine.addEvent({
      eventId: 'e2',
      eventType: 'b',
      correlationId: 'g1',
      causationId: 'e1',
    });
    const group = engine.getGroup('g1');
    expect(group?.events).toHaveLength(2);
    expect(group?.depth).toBe(1);
  });

  it('returns undefined for unknown group', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    expect(engine.getGroup('unknown')).toBeUndefined();
  });

  it('lists all groups', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'a', correlationId: 'g1' });
    engine.addEvent({ eventId: 'e2', eventType: 'b', correlationId: 'g2' });
    expect(engine.listGroups()).toHaveLength(2);
  });
});

describe('EventCorrelationEngine — causation chains', () => {
  it('builds a chain from root to leaf', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'root', correlationId: 'g1' });
    engine.addEvent({
      eventId: 'e2',
      eventType: 'child',
      correlationId: 'g1',
      causationId: 'e1',
    });
    engine.addEvent({
      eventId: 'e3',
      eventType: 'grandchild',
      correlationId: 'g1',
      causationId: 'e2',
    });
    const chain = engine.getChain('e3');
    expect(chain).toHaveLength(3);
    expect(chain[0]?.eventId).toBe('e1');
    expect(chain[2]?.eventId).toBe('e3');
  });

  it('returns single-element chain for root event', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'root' });
    const chain = engine.getChain('e1');
    expect(chain).toHaveLength(1);
  });

  it('returns empty chain for unknown event', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    expect(engine.getChain('unknown')).toHaveLength(0);
  });

  it('gets children of an event', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'root', correlationId: 'g1' });
    engine.addEvent({
      eventId: 'e2',
      eventType: 'c1',
      correlationId: 'g1',
      causationId: 'e1',
    });
    engine.addEvent({
      eventId: 'e3',
      eventType: 'c2',
      correlationId: 'g1',
      causationId: 'e1',
    });
    const children = engine.getChildren('e1');
    expect(children).toHaveLength(2);
  });

  it('computes depth correctly', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'a', correlationId: 'g1' });
    engine.addEvent({
      eventId: 'e2',
      eventType: 'b',
      correlationId: 'g1',
      causationId: 'e1',
    });
    engine.addEvent({
      eventId: 'e3',
      eventType: 'c',
      correlationId: 'g1',
      causationId: 'e2',
    });
    expect(engine.getDepth('e1')).toBe(0);
    expect(engine.getDepth('e2')).toBe(1);
    expect(engine.getDepth('e3')).toBe(2);
  });
});

describe('EventCorrelationEngine — stats', () => {
  it('starts with zero stats', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    const stats = engine.getStats();
    expect(stats.totalEvents).toBe(0);
    expect(stats.totalGroups).toBe(0);
    expect(stats.maxChainDepth).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const engine = createEventCorrelationEngine(makeDeps());
    engine.addEvent({ eventId: 'e1', eventType: 'a', correlationId: 'g1' });
    engine.addEvent({
      eventId: 'e2',
      eventType: 'b',
      correlationId: 'g1',
      causationId: 'e1',
    });
    engine.addEvent({ eventId: 'e3', eventType: 'c', correlationId: 'g2' });
    const stats = engine.getStats();
    expect(stats.totalEvents).toBe(3);
    expect(stats.totalGroups).toBe(2);
    expect(stats.maxChainDepth).toBe(1);
  });
});
