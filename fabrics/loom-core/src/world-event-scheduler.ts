/**
 * World Event Scheduler — Timed world event orchestration.
 *
 * Schedules events to fire at specific timestamps or after delays.
 * Each tick, the scheduler checks for due events and fires their
 * callbacks. Supports one-shot and recurring events.
 *
 * Use cases:
 *   - Day/night cycle transitions
 *   - Seasonal weather changes
 *   - NPC festival schedules
 *   - World decay/regrowth timers
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ScheduledEventStatus = 'pending' | 'fired' | 'cancelled';
export type EventRecurrence = 'once' | 'recurring';

export interface ScheduledEvent {
  readonly eventId: string;
  readonly name: string;
  readonly fireAt: number;
  readonly recurrence: EventRecurrence;
  readonly intervalUs: number;
  readonly status: ScheduledEventStatus;
  readonly firedCount: number;
}

export interface ScheduleEventParams {
  readonly name: string;
  readonly fireAt: number;
  readonly recurrence?: EventRecurrence;
  readonly intervalUs?: number;
}

export type ScheduledEventCallback = (event: ScheduledEvent) => void;

export interface TickResult {
  readonly firedCount: number;
  readonly eventNames: ReadonlyArray<string>;
}

export interface SchedulerStats {
  readonly pendingEvents: number;
  readonly totalScheduled: number;
  readonly totalFired: number;
  readonly totalCancelled: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface WorldEventSchedulerDeps {
  readonly idGenerator: { next(): string };
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface WorldEventScheduler {
  schedule(params: ScheduleEventParams, callback: ScheduledEventCallback): string;
  cancel(eventId: string): boolean;
  tick(): TickResult;
  getEvent(eventId: string): ScheduledEvent | undefined;
  listPending(): ReadonlyArray<ScheduledEvent>;
  getStats(): SchedulerStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface MutableEvent {
  readonly eventId: string;
  readonly name: string;
  fireAt: number;
  readonly recurrence: EventRecurrence;
  readonly intervalUs: number;
  readonly callback: ScheduledEventCallback;
  status: ScheduledEventStatus;
  firedCount: number;
}

interface SchedulerState {
  readonly events: Map<string, MutableEvent>;
  readonly deps: WorldEventSchedulerDeps;
  totalScheduled: number;
  totalFired: number;
  totalCancelled: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createWorldEventScheduler(
  deps: WorldEventSchedulerDeps,
): WorldEventScheduler {
  const state: SchedulerState = {
    events: new Map(),
    deps,
    totalScheduled: 0,
    totalFired: 0,
    totalCancelled: 0,
  };

  return {
    schedule: (p, cb) => scheduleImpl(state, p, cb),
    cancel: (eid) => cancelImpl(state, eid),
    tick: () => tickImpl(state),
    getEvent: (eid) => toReadonly(state.events.get(eid)),
    listPending: () => listPendingImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Schedule ───────────────────────────────────────────────────────

function scheduleImpl(
  state: SchedulerState,
  params: ScheduleEventParams,
  callback: ScheduledEventCallback,
): string {
  const event: MutableEvent = {
    eventId: state.deps.idGenerator.next(),
    name: params.name,
    fireAt: params.fireAt,
    recurrence: params.recurrence ?? 'once',
    intervalUs: params.intervalUs ?? 0,
    callback,
    status: 'pending',
    firedCount: 0,
  };
  state.events.set(event.eventId, event);
  state.totalScheduled += 1;
  return event.eventId;
}

// ─── Cancel ─────────────────────────────────────────────────────────

function cancelImpl(state: SchedulerState, eventId: string): boolean {
  const event = state.events.get(eventId);
  if (event === undefined || event.status !== 'pending') return false;
  event.status = 'cancelled';
  state.totalCancelled += 1;
  return true;
}

// ─── Tick ───────────────────────────────────────────────────────────

function tickImpl(state: SchedulerState): TickResult {
  const now = state.deps.clock.nowMicroseconds();
  const names: string[] = [];
  for (const event of state.events.values()) {
    if (event.status !== 'pending') continue;
    if (event.fireAt > now) continue;
    fireEvent(state, event, names);
  }
  return { firedCount: names.length, eventNames: names };
}

function fireEvent(
  state: SchedulerState,
  event: MutableEvent,
  names: string[],
): void {
  event.firedCount += 1;
  state.totalFired += 1;
  names.push(event.name);
  const snapshot = toReadonly(event) as ScheduledEvent;
  event.callback(snapshot);
  if (event.recurrence === 'recurring' && event.intervalUs > 0) {
    event.fireAt += event.intervalUs;
  } else {
    event.status = 'fired';
  }
}

// ─── Queries ────────────────────────────────────────────────────────

function listPendingImpl(
  state: SchedulerState,
): ReadonlyArray<ScheduledEvent> {
  const result: ScheduledEvent[] = [];
  for (const event of state.events.values()) {
    if (event.status === 'pending') {
      result.push(toReadonly(event) as ScheduledEvent);
    }
  }
  return result;
}

function toReadonly(
  event: MutableEvent | undefined,
): ScheduledEvent | undefined {
  return event;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: SchedulerState): SchedulerStats {
  let pending = 0;
  for (const event of state.events.values()) {
    if (event.status === 'pending') pending += 1;
  }
  return {
    pendingEvents: pending,
    totalScheduled: state.totalScheduled,
    totalFired: state.totalFired,
    totalCancelled: state.totalCancelled,
  };
}
