/**
 * event-correlation.ts — Event correlation engine.
 *
 * Groups related events by correlation ID. Tracks event chains
 * (causation), computes chain depth, and provides correlation
 * group queries with aggregate metadata.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CorrelationClock {
  readonly nowMicroseconds: () => number;
}

interface CorrelationIdGenerator {
  readonly next: () => string;
}

interface EventCorrelationDeps {
  readonly clock: CorrelationClock;
  readonly idGenerator: CorrelationIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface CorrelatedEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly causationId: string | undefined;
  readonly eventType: string;
  readonly timestamp: number;
}

interface AddEventParams {
  readonly eventId: string;
  readonly eventType: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}

interface CorrelationGroup {
  readonly correlationId: string;
  readonly events: readonly CorrelatedEvent[];
  readonly rootEventId: string;
  readonly depth: number;
  readonly createdAt: number;
}

interface CorrelationStats {
  readonly totalEvents: number;
  readonly totalGroups: number;
  readonly maxChainDepth: number;
}

interface EventCorrelationEngine {
  readonly addEvent: (params: AddEventParams) => CorrelatedEvent;
  readonly getEvent: (eventId: string) => CorrelatedEvent | undefined;
  readonly getGroup: (correlationId: string) => CorrelationGroup | undefined;
  readonly getChain: (eventId: string) => readonly CorrelatedEvent[];
  readonly getChildren: (eventId: string) => readonly CorrelatedEvent[];
  readonly getDepth: (eventId: string) => number;
  readonly listGroups: () => readonly CorrelationGroup[];
  readonly getStats: () => CorrelationStats;
}

// ── State ────────────────────────────────────────────────────────

interface CorrelationState {
  readonly deps: EventCorrelationDeps;
  readonly events: Map<string, CorrelatedEvent>;
  readonly groups: Map<string, MutableGroup>;
  readonly children: Map<string, string[]>;
  maxChainDepth: number;
}

interface MutableGroup {
  readonly correlationId: string;
  readonly events: CorrelatedEvent[];
  readonly rootEventId: string;
  readonly createdAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function computeDepth(state: CorrelationState, eventId: string): number {
  let depth = 0;
  let current = state.events.get(eventId);
  while (current?.causationId !== undefined) {
    depth += 1;
    current = state.events.get(current.causationId);
  }
  return depth;
}

function buildChain(state: CorrelationState, eventId: string): CorrelatedEvent[] {
  const chain: CorrelatedEvent[] = [];
  let current = state.events.get(eventId);
  while (current !== undefined) {
    chain.unshift(current);
    if (current.causationId === undefined) break;
    current = state.events.get(current.causationId);
  }
  return chain;
}

// ── Operations ───────────────────────────────────────────────────

function addEventImpl(state: CorrelationState, params: AddEventParams): CorrelatedEvent {
  const correlationId = params.correlationId ?? state.deps.idGenerator.next();
  const event: CorrelatedEvent = {
    eventId: params.eventId,
    correlationId,
    causationId: params.causationId,
    eventType: params.eventType,
    timestamp: state.deps.clock.nowMicroseconds(),
  };
  state.events.set(params.eventId, event);
  addToGroup(state, event, correlationId);
  addToChildren(state, event);
  const depth = computeDepth(state, params.eventId);
  if (depth > state.maxChainDepth) {
    state.maxChainDepth = depth;
  }
  return event;
}

function addToGroup(state: CorrelationState, event: CorrelatedEvent, correlationId: string): void {
  let group = state.groups.get(correlationId);
  if (!group) {
    group = {
      correlationId,
      events: [],
      rootEventId: event.eventId,
      createdAt: event.timestamp,
    };
    state.groups.set(correlationId, group);
  }
  group.events.push(event);
}

function addToChildren(state: CorrelationState, event: CorrelatedEvent): void {
  if (event.causationId === undefined) return;
  const list = state.children.get(event.causationId);
  if (list) {
    list.push(event.eventId);
  } else {
    state.children.set(event.causationId, [event.eventId]);
  }
}

function getGroupImpl(
  state: CorrelationState,
  correlationId: string,
): CorrelationGroup | undefined {
  const g = state.groups.get(correlationId);
  if (!g) return undefined;
  const maxDepth = g.events.reduce((max, e) => Math.max(max, computeDepth(state, e.eventId)), 0);
  return {
    correlationId: g.correlationId,
    events: [...g.events],
    rootEventId: g.rootEventId,
    depth: maxDepth,
    createdAt: g.createdAt,
  };
}

function getChildrenImpl(state: CorrelationState, eventId: string): CorrelatedEvent[] {
  const childIds = state.children.get(eventId) ?? [];
  const result: CorrelatedEvent[] = [];
  for (const id of childIds) {
    const e = state.events.get(id);
    if (e) result.push(e);
  }
  return result;
}

function listGroupsImpl(state: CorrelationState): CorrelationGroup[] {
  const result: CorrelationGroup[] = [];
  for (const g of state.groups.values()) {
    const maxDepth = g.events.reduce((max, e) => Math.max(max, computeDepth(state, e.eventId)), 0);
    result.push({
      correlationId: g.correlationId,
      events: [...g.events],
      rootEventId: g.rootEventId,
      depth: maxDepth,
      createdAt: g.createdAt,
    });
  }
  return result;
}

function getStatsImpl(state: CorrelationState): CorrelationStats {
  return {
    totalEvents: state.events.size,
    totalGroups: state.groups.size,
    maxChainDepth: state.maxChainDepth,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createEventCorrelationEngine(deps: EventCorrelationDeps): EventCorrelationEngine {
  const state: CorrelationState = {
    deps,
    events: new Map(),
    groups: new Map(),
    children: new Map(),
    maxChainDepth: 0,
  };
  return {
    addEvent: (p) => addEventImpl(state, p),
    getEvent: (id) => state.events.get(id),
    getGroup: (id) => getGroupImpl(state, id),
    getChain: (id) => buildChain(state, id),
    getChildren: (id) => getChildrenImpl(state, id),
    getDepth: (id) => computeDepth(state, id),
    listGroups: () => listGroupsImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createEventCorrelationEngine };
export type {
  EventCorrelationEngine,
  EventCorrelationDeps,
  CorrelatedEvent,
  AddEventParams,
  CorrelationGroup,
  CorrelationStats,
};
