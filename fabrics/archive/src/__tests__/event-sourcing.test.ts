import { describe, it, expect, beforeEach } from 'vitest';
import type { EventSourcingState, Clock, IdGenerator, Logger } from '../event-sourcing.js';
import {
  createEventSourcingState,
  createAggregate,
  getAggregate,
  listAggregates,
  appendEvent,
  getEventStream,
  getEvent,
  countEvents,
} from '../event-sourcing.js';

function makeClock(): Clock {
  let time = 1_000_000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n = n + 1;
      return 'id-' + String(n);
    },
  };
}

function makeLogger(): Logger {
  return { info: () => undefined, error: () => undefined };
}

// ============================================================================
// TESTS: AGGREGATE CREATION
// ============================================================================

describe('Event Sourcing - Aggregate Creation', () => {
  let state: EventSourcingState;
  let clock: Clock;
  let logger: Logger;

  beforeEach(() => {
    state = createEventSourcingState();
    clock = makeClock();
    logger = makeLogger();
  });

  it('creates an aggregate successfully', () => {
    const result = createAggregate(state, 'agg-1', 'Order', clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.aggregateId).toBe('agg-1');
      expect(result.aggregateType).toBe('Order');
      expect(result.currentVersion).toBe(0);
      expect(result.eventCount).toBe(0);
    }
  });

  it('stores aggregate in state', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    expect(state.aggregates.has('agg-1')).toBe(true);
  });

  it('initialises empty stream for new aggregate', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    const stream = state.streamsByAggregate.get('agg-1');
    expect(stream).toBeDefined();
    expect(stream?.length).toBe(0);
  });

  it('returns version-conflict for duplicate aggregate id', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    const result = createAggregate(state, 'agg-1', 'Order', clock, logger);
    expect(result).toBe('version-conflict');
  });

  it('allows aggregates with different ids', () => {
    const r1 = createAggregate(state, 'a', 'TypeA', clock, logger);
    const r2 = createAggregate(state, 'b', 'TypeB', clock, logger);
    expect(typeof r1).toBe('object');
    expect(typeof r2).toBe('object');
  });
});

// ============================================================================
// TESTS: GET / LIST AGGREGATES
// ============================================================================

describe('Event Sourcing - Query Aggregates', () => {
  let state: EventSourcingState;
  let clock: Clock;
  let logger: Logger;

  beforeEach(() => {
    state = createEventSourcingState();
    clock = makeClock();
    logger = makeLogger();
  });

  it('getAggregate returns undefined for unknown id', () => {
    expect(getAggregate(state, 'missing')).toBeUndefined();
  });

  it('getAggregate returns the aggregate after creation', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    const agg = getAggregate(state, 'agg-1');
    expect(agg?.aggregateId).toBe('agg-1');
  });

  it('listAggregates returns all when no type filter', () => {
    createAggregate(state, 'a', 'Order', clock, logger);
    createAggregate(state, 'b', 'Invoice', clock, logger);
    expect(listAggregates(state).length).toBe(2);
  });

  it('listAggregates filters by aggregateType', () => {
    createAggregate(state, 'a', 'Order', clock, logger);
    createAggregate(state, 'b', 'Invoice', clock, logger);
    createAggregate(state, 'c', 'Order', clock, logger);
    const orders = listAggregates(state, 'Order');
    expect(orders.length).toBe(2);
    expect(orders.every((a) => a.aggregateType === 'Order')).toBe(true);
  });
});

// ============================================================================
// TESTS: APPEND EVENTS — VALIDATION
// ============================================================================

describe('Event Sourcing - Append Events (validation)', () => {
  let state: EventSourcingState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createEventSourcingState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('returns aggregate-not-found for unknown aggregate', () => {
    const result = appendEvent(state, 'ghost', 'SomeEvent', { x: 1 }, idGen, clock, logger);
    expect(result).toBe('aggregate-not-found');
  });

  it('returns empty-payload for empty payload object', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    const result = appendEvent(state, 'agg-1', 'BadEvent', {}, idGen, clock, logger);
    expect(result).toBe('empty-payload');
  });

  it('returns version-conflict when expectedVersion does not match', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    appendEvent(state, 'agg-1', 'OrderPlaced', { qty: 1 }, idGen, clock, logger);
    const result = appendEvent(
      state,
      'agg-1',
      'OrderShipped',
      { carrier: 'FedEx' },
      idGen,
      clock,
      logger,
      0,
    );
    expect(result).toBe('version-conflict');
  });

  it('succeeds when expectedVersion matches currentVersion', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    const result = appendEvent(state, 'agg-1', 'OrderPlaced', { qty: 1 }, idGen, clock, logger, 0);
    expect(typeof result).toBe('object');
  });
});

// ============================================================================
// TESTS: APPEND EVENTS — HAPPY PATH
// ============================================================================

describe('Event Sourcing - Append Events (happy path)', () => {
  let state: EventSourcingState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createEventSourcingState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    createAggregate(state, 'agg-1', 'Order', clock, logger);
  });

  it('appends an event and returns DomainEvent', () => {
    const result = appendEvent(state, 'agg-1', 'OrderPlaced', { qty: 1 }, idGen, clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.aggregateId).toBe('agg-1');
      expect(result.eventType).toBe('OrderPlaced');
      expect(result.version).toBe(1);
    }
  });

  it('increments version with each event', () => {
    appendEvent(state, 'agg-1', 'OrderPlaced', { qty: 1 }, idGen, clock, logger);
    const second = appendEvent(
      state,
      'agg-1',
      'OrderShipped',
      { carrier: 'DHL' },
      idGen,
      clock,
      logger,
    );
    if (typeof second === 'object') {
      expect(second.version).toBe(2);
    }
  });

  it('updates aggregate eventCount after append', () => {
    appendEvent(state, 'agg-1', 'E1', { v: 1 }, idGen, clock, logger);
    appendEvent(state, 'agg-1', 'E2', { v: 2 }, idGen, clock, logger);
    expect(getAggregate(state, 'agg-1')?.eventCount).toBe(2);
  });
});

// ============================================================================
// TESTS: EVENT STREAM QUERIES
// ============================================================================

describe('Event Sourcing - Event Stream', () => {
  let state: EventSourcingState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createEventSourcingState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('returns aggregate-not-found for stream of unknown aggregate', () => {
    const result = getEventStream(state, 'ghost');
    expect(result).toBe('aggregate-not-found');
  });

  it('returns full event stream by default', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    appendEvent(state, 'agg-1', 'E1', { v: 1 }, idGen, clock, logger);
    appendEvent(state, 'agg-1', 'E2', { v: 2 }, idGen, clock, logger);
    const stream = getEventStream(state, 'agg-1');
    if (typeof stream === 'object') expect(stream.events.length).toBe(2);
  });

  it('filters stream by fromVersion', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    appendEvent(state, 'agg-1', 'E1', { v: 1 }, idGen, clock, logger);
    appendEvent(state, 'agg-1', 'E2', { v: 2 }, idGen, clock, logger);
    appendEvent(state, 'agg-1', 'E3', { v: 3 }, idGen, clock, logger);
    const stream = getEventStream(state, 'agg-1', 2);
    if (typeof stream === 'object') {
      expect(stream.events.length).toBe(2);
      expect(stream.events[0]?.version).toBeGreaterThanOrEqual(2);
    }
  });

  it('getEvent returns undefined for unknown eventId', () => {
    expect(getEvent(state, 'unknown')).toBeUndefined();
  });

  it('getEvent returns the event by id', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    const ev = appendEvent(state, 'agg-1', 'OrderPlaced', { qty: 5 }, idGen, clock, logger);
    if (typeof ev === 'object') {
      const found = getEvent(state, ev.eventId);
      expect(found?.eventId).toBe(ev.eventId);
    }
  });

  it('countEvents returns aggregate-not-found for unknown aggregate', () => {
    expect(countEvents(state, 'ghost')).toBe('aggregate-not-found');
  });

  it('countEvents returns correct event count', () => {
    createAggregate(state, 'agg-1', 'Order', clock, logger);
    appendEvent(state, 'agg-1', 'E1', { v: 1 }, idGen, clock, logger);
    appendEvent(state, 'agg-1', 'E2', { v: 2 }, idGen, clock, logger);
    expect(countEvents(state, 'agg-1')).toBe(2);
  });
});
