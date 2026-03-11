/**
 * transit-bookings.ts — World transit schedule and passenger booking system.
 *
 * Manages planned transit events between worlds. Each schedule defines a
 * departure/arrival window with a fixed passenger capacity. Bookings are
 * tracked per passenger and per schedule. Status flows through a strict
 * state machine: SCHEDULED → BOARDING → DEPARTED → ARRIVED (or CANCELLED).
 */

// ── Ports ────────────────────────────────────────────────────────

export interface BookingClock {
  now(): bigint;
}

export interface BookingIdGenerator {
  generate(): string;
}

export interface BookingLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type ScheduleId = string;
export type PassengerId = string;
export type TransitEventId = string;

export type ScheduleStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';

export type ScheduleError =
  | 'schedule-not-found'
  | 'transit-full'
  | 'already-booked'
  | 'not-booked'
  | 'invalid-time'
  | 'invalid-capacity'
  | 'cannot-cancel';

export interface TransitSchedule {
  readonly scheduleId: ScheduleId;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly departureAt: bigint;
  readonly arrivalAt: bigint;
  readonly capacity: number;
  bookedCount: number;
  status: ScheduleStatus;
  readonly passengers: PassengerId[];
}

export interface TransitBooking {
  readonly bookingId: string;
  readonly scheduleId: ScheduleId;
  readonly passengerId: PassengerId;
  readonly bookedAt: bigint;
}

export interface TransitEvent {
  readonly eventId: TransitEventId;
  readonly scheduleId: ScheduleId;
  readonly type: 'BOARDING_OPEN' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';
  readonly occurredAt: bigint;
}

export interface SchedulerStats {
  readonly totalScheduled: number;
  readonly totalCompleted: number;
  readonly totalCancelled: number;
  readonly averagePassengersPerTransit: number;
}

export interface TransitSchedulerSystem {
  readonly scheduleTransit: (
    fromWorldId: string,
    toWorldId: string,
    departureAt: bigint,
    arrivalAt: bigint,
    capacity: number,
  ) => TransitSchedule | ScheduleError;
  readonly bookPassenger: (
    scheduleId: ScheduleId,
    passengerId: PassengerId,
  ) => { success: true; booking: TransitBooking } | { success: false; error: ScheduleError };
  readonly cancelBooking: (
    scheduleId: ScheduleId,
    passengerId: PassengerId,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly openBoarding: (
    scheduleId: ScheduleId,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly departTransit: (
    scheduleId: ScheduleId,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly arriveTransit: (
    scheduleId: ScheduleId,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly cancelTransit: (
    scheduleId: ScheduleId,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly getSchedule: (scheduleId: ScheduleId) => TransitSchedule | undefined;
  readonly listSchedules: (worldId?: string) => ReadonlyArray<TransitSchedule>;
  readonly getStats: () => SchedulerStats;
}

// ── State ────────────────────────────────────────────────────────

interface TransitBookingsState {
  readonly schedules: Map<ScheduleId, TransitSchedule>;
  readonly bookings: Map<string, TransitBooking>;
  readonly events: TransitEvent[];
  readonly clock: BookingClock;
  readonly idGen: BookingIdGenerator;
  readonly logger: BookingLogger;
}

// ── Helpers ──────────────────────────────────────────────────────

function emitEvent(
  state: TransitBookingsState,
  scheduleId: ScheduleId,
  type: TransitEvent['type'],
): void {
  state.events.push({
    eventId: state.idGen.generate(),
    scheduleId,
    type,
    occurredAt: state.clock.now(),
  });
}

function bookingKey(scheduleId: ScheduleId, passengerId: PassengerId): string {
  return `${scheduleId}::${passengerId}`;
}

function canBook(status: ScheduleStatus): boolean {
  return status === 'SCHEDULED' || status === 'BOARDING';
}

// ── Operations ───────────────────────────────────────────────────

function validateSchedule(
  state: TransitBookingsState,
  departureAt: bigint,
  arrivalAt: bigint,
  capacity: number,
): ScheduleError | null {
  if (arrivalAt <= departureAt) {
    state.logger.error('arrivalAt must be greater than departureAt');
    return 'invalid-time';
  }
  if (capacity < 1) {
    state.logger.error('Capacity must be at least 1');
    return 'invalid-capacity';
  }
  return null;
}

function scheduleTransit(
  state: TransitBookingsState,
  fromWorldId: string,
  toWorldId: string,
  departureAt: bigint,
  arrivalAt: bigint,
  capacity: number,
): TransitSchedule | ScheduleError {
  const err = validateSchedule(state, departureAt, arrivalAt, capacity);
  if (err !== null) return err;
  const schedule: TransitSchedule = {
    scheduleId: state.idGen.generate(),
    fromWorldId,
    toWorldId,
    departureAt,
    arrivalAt,
    capacity,
    bookedCount: 0,
    status: 'SCHEDULED',
    passengers: [],
  };
  state.schedules.set(schedule.scheduleId, schedule);
  state.logger.info('Transit scheduled: ' + schedule.scheduleId);
  return schedule;
}

function bookPassenger(
  state: TransitBookingsState,
  scheduleId: ScheduleId,
  passengerId: PassengerId,
): { success: true; booking: TransitBooking } | { success: false; error: ScheduleError } {
  const schedule = state.schedules.get(scheduleId);
  if (schedule === undefined) return { success: false, error: 'schedule-not-found' };
  if (!canBook(schedule.status)) return { success: false, error: 'cannot-cancel' };

  const key = bookingKey(scheduleId, passengerId);
  if (state.bookings.has(key)) return { success: false, error: 'already-booked' };
  if (schedule.bookedCount >= schedule.capacity) return { success: false, error: 'transit-full' };

  const booking: TransitBooking = {
    bookingId: state.idGen.generate(),
    scheduleId,
    passengerId,
    bookedAt: state.clock.now(),
  };
  state.bookings.set(key, booking);
  schedule.passengers.push(passengerId);
  schedule.bookedCount += 1;
  state.logger.info('Passenger booked: ' + passengerId + ' on ' + scheduleId);
  return { success: true, booking };
}

function cancelBooking(
  state: TransitBookingsState,
  scheduleId: ScheduleId,
  passengerId: PassengerId,
): { success: true } | { success: false; error: ScheduleError } {
  const schedule = state.schedules.get(scheduleId);
  if (schedule === undefined) return { success: false, error: 'schedule-not-found' };
  if (!canBook(schedule.status)) return { success: false, error: 'cannot-cancel' };

  const key = bookingKey(scheduleId, passengerId);
  if (!state.bookings.has(key)) return { success: false, error: 'not-booked' };

  state.bookings.delete(key);
  const idx = schedule.passengers.indexOf(passengerId);
  if (idx !== -1) schedule.passengers.splice(idx, 1);
  schedule.bookedCount -= 1;
  state.logger.info('Booking cancelled: ' + passengerId + ' from ' + scheduleId);
  return { success: true };
}

function openBoarding(
  state: TransitBookingsState,
  scheduleId: ScheduleId,
): { success: true } | { success: false; error: ScheduleError } {
  const schedule = state.schedules.get(scheduleId);
  if (schedule === undefined) return { success: false, error: 'schedule-not-found' };
  if (schedule.status !== 'SCHEDULED') return { success: false, error: 'cannot-cancel' };
  schedule.status = 'BOARDING';
  emitEvent(state, scheduleId, 'BOARDING_OPEN');
  state.logger.info('Boarding opened: ' + scheduleId);
  return { success: true };
}

function departTransit(
  state: TransitBookingsState,
  scheduleId: ScheduleId,
): { success: true } | { success: false; error: ScheduleError } {
  const schedule = state.schedules.get(scheduleId);
  if (schedule === undefined) return { success: false, error: 'schedule-not-found' };
  if (schedule.status !== 'BOARDING') return { success: false, error: 'cannot-cancel' };
  schedule.status = 'DEPARTED';
  emitEvent(state, scheduleId, 'DEPARTED');
  state.logger.info('Transit departed: ' + scheduleId);
  return { success: true };
}

function arriveTransit(
  state: TransitBookingsState,
  scheduleId: ScheduleId,
): { success: true } | { success: false; error: ScheduleError } {
  const schedule = state.schedules.get(scheduleId);
  if (schedule === undefined) return { success: false, error: 'schedule-not-found' };
  if (schedule.status !== 'DEPARTED') return { success: false, error: 'cannot-cancel' };
  schedule.status = 'ARRIVED';
  emitEvent(state, scheduleId, 'ARRIVED');
  state.logger.info('Transit arrived: ' + scheduleId);
  return { success: true };
}

function cancelTransit(
  state: TransitBookingsState,
  scheduleId: ScheduleId,
): { success: true } | { success: false; error: ScheduleError } {
  const schedule = state.schedules.get(scheduleId);
  if (schedule === undefined) return { success: false, error: 'schedule-not-found' };
  if (schedule.status !== 'SCHEDULED' && schedule.status !== 'BOARDING') {
    return { success: false, error: 'cannot-cancel' };
  }
  schedule.status = 'CANCELLED';
  emitEvent(state, scheduleId, 'CANCELLED');
  state.logger.warn('Transit cancelled: ' + scheduleId);
  return { success: true };
}

function listSchedules(
  state: TransitBookingsState,
  worldId?: string,
): ReadonlyArray<TransitSchedule> {
  if (worldId === undefined) return Array.from(state.schedules.values());
  const result: TransitSchedule[] = [];
  for (const s of state.schedules.values()) {
    if (s.fromWorldId === worldId || s.toWorldId === worldId) result.push(s);
  }
  return result;
}

function getStats(state: TransitBookingsState): SchedulerStats {
  let totalCompleted = 0;
  let totalCancelled = 0;
  let arrivedPassengersTotal = 0;
  let arrivedCount = 0;
  for (const s of state.schedules.values()) {
    if (s.status === 'ARRIVED') {
      totalCompleted++;
      arrivedPassengersTotal += s.bookedCount;
      arrivedCount++;
    }
    if (s.status === 'CANCELLED') totalCancelled++;
  }
  const averagePassengersPerTransit =
    arrivedCount === 0 ? 0 : arrivedPassengersTotal / arrivedCount;
  return {
    totalScheduled: state.schedules.size,
    totalCompleted,
    totalCancelled,
    averagePassengersPerTransit,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createTransitSchedulerSystem(deps: {
  clock: BookingClock;
  idGen: BookingIdGenerator;
  logger: BookingLogger;
}): TransitSchedulerSystem {
  const state: TransitBookingsState = {
    schedules: new Map(),
    bookings: new Map(),
    events: [],
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    scheduleTransit: (from, to, dep, arr, cap) => scheduleTransit(state, from, to, dep, arr, cap),
    bookPassenger: (sid, pid) => bookPassenger(state, sid, pid),
    cancelBooking: (sid, pid) => cancelBooking(state, sid, pid),
    openBoarding: (sid) => openBoarding(state, sid),
    departTransit: (sid) => departTransit(state, sid),
    arriveTransit: (sid) => arriveTransit(state, sid),
    cancelTransit: (sid) => cancelTransit(state, sid),
    getSchedule: (sid) => state.schedules.get(sid),
    listSchedules: (worldId) => listSchedules(state, worldId),
    getStats: () => getStats(state),
  };
}
