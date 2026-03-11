/**
 * cosmic-event.ts — Rare astronomical events affecting multiple worlds simultaneously.
 *
 * Cosmic events propagate across the Silfen Weave, disrupting or enhancing
 * world conditions. Events progress through a status lifecycle:
 *   PREDICTED → ACTIVE → WANING → ENDED
 */

// ── Ports ────────────────────────────────────────────────────────

export interface CosmicClockPort {
  now(): bigint;
}

export interface CosmicIdGeneratorPort {
  generate(): string;
}

export interface CosmicLoggerPort {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type EventId = string;
export type WorldId = string;

export type CosmicError =
  | 'event-not-found'
  | 'world-not-found'
  | 'already-registered'
  | 'invalid-magnitude'
  | 'already-active'
  | 'event-ended';

export type CosmicEventType =
  | 'SOLAR_FLARE'
  | 'NEBULA_BLOOM'
  | 'GRAVITY_SURGE'
  | 'VOID_RIFT'
  | 'STELLAR_CONVERGENCE'
  | 'DARK_MATTER_WAVE';

export type CosmicEventStatus = 'PREDICTED' | 'ACTIVE' | 'WANING' | 'ENDED';

export interface CosmicEvent {
  readonly eventId: EventId;
  readonly type: CosmicEventType;
  readonly magnitude: number;
  readonly affectedWorldIds: ReadonlyArray<WorldId>;
  readonly predictedAt: bigint;
  status: CosmicEventStatus;
  activatedAt: bigint | null;
  endedAt: bigint | null;
  readonly durationUs: bigint;
}

export interface WorldImpact {
  readonly impactId: string;
  readonly eventId: EventId;
  readonly worldId: WorldId;
  readonly effectType: string;
  readonly severity: number;
  readonly measuredAt: bigint;
}

export interface CosmicForecast {
  readonly upcomingCount: number;
  readonly activeCount: number;
  readonly highMagnitudeCount: number;
}

// ── System Interface ──────────────────────────────────────────────

export interface CosmicEventSystem {
  readonly registerWorld: (
    worldId: WorldId,
  ) => { success: true } | { success: false; error: CosmicError };
  readonly predictEvent: (
    type: CosmicEventType,
    magnitude: number,
    affectedWorldIds: ReadonlyArray<WorldId>,
    durationUs: bigint,
  ) => CosmicEvent | CosmicError;
  readonly activateEvent: (
    eventId: EventId,
  ) => { success: true } | { success: false; error: CosmicError };
  readonly waneEvent: (
    eventId: EventId,
  ) => { success: true } | { success: false; error: CosmicError };
  readonly endEvent: (
    eventId: EventId,
  ) => { success: true } | { success: false; error: CosmicError };
  readonly measureImpact: (eventId: EventId, worldId: WorldId) => WorldImpact | CosmicError;
  readonly getEvent: (eventId: EventId) => CosmicEvent | undefined;
  readonly listEvents: (
    worldId?: WorldId,
    status?: CosmicEventStatus,
  ) => ReadonlyArray<CosmicEvent>;
  readonly getForecast: () => CosmicForecast;
}

// ── State ────────────────────────────────────────────────────────

interface CosmicEventState {
  readonly worlds: Set<WorldId>;
  readonly events: Map<EventId, CosmicEvent>;
  readonly clock: CosmicClockPort;
  readonly idGen: CosmicIdGeneratorPort;
  readonly logger: CosmicLoggerPort;
}

// ── Helpers ──────────────────────────────────────────────────────

const EFFECT_TYPE_MAP: Record<CosmicEventType, string> = {
  SOLAR_FLARE: 'radiation_burst',
  NEBULA_BLOOM: 'energy_boost',
  GRAVITY_SURGE: 'tidal_stress',
  VOID_RIFT: 'dimensional_tear',
  STELLAR_CONVERGENCE: 'gravitational_lens',
  DARK_MATTER_WAVE: 'dark_matter_flux',
};

const SEVERITY_MULTIPLIER = 0.85;

function computeSeverity(magnitude: number): number {
  return (magnitude / 10) * SEVERITY_MULTIPLIER;
}

function transitionEvent(
  state: CosmicEventState,
  eventId: EventId,
  requiredStatus: CosmicEventStatus,
  nextStatus: CosmicEventStatus,
  errorIfNotFound: CosmicError,
  errorIfWrongStatus: CosmicError,
): { success: true } | { success: false; error: CosmicError } {
  const event = state.events.get(eventId);
  if (event === undefined) {
    state.logger.error('Event not found: ' + eventId);
    return { success: false, error: errorIfNotFound };
  }
  if (event.status !== requiredStatus) {
    state.logger.warn('Invalid transition for event ' + eventId + ' in status ' + event.status);
    return { success: false, error: errorIfWrongStatus };
  }
  event.status = nextStatus;
  if (nextStatus === 'ACTIVE') event.activatedAt = state.clock.now();
  if (nextStatus === 'ENDED') event.endedAt = state.clock.now();
  state.logger.info('Event ' + eventId + ' transitioned to ' + nextStatus);
  return { success: true };
}

// ── Operations ───────────────────────────────────────────────────

function registerWorld(
  state: CosmicEventState,
  worldId: WorldId,
): { success: true } | { success: false; error: CosmicError } {
  if (state.worlds.has(worldId)) {
    state.logger.warn('World already registered: ' + worldId);
    return { success: false, error: 'already-registered' };
  }
  state.worlds.add(worldId);
  state.logger.info('World registered for cosmic events: ' + worldId);
  return { success: true };
}

function validatePredictInputs(
  state: CosmicEventState,
  magnitude: number,
  affectedWorldIds: ReadonlyArray<WorldId>,
): CosmicError | null {
  if (magnitude < 1 || magnitude > 10 || !Number.isInteger(magnitude)) {
    state.logger.error('Invalid magnitude: ' + String(magnitude));
    return 'invalid-magnitude';
  }
  for (const worldId of affectedWorldIds) {
    if (!state.worlds.has(worldId)) {
      state.logger.error('Affected world not registered: ' + worldId);
      return 'world-not-found';
    }
  }
  return null;
}

function buildCosmicEvent(
  state: CosmicEventState,
  type: CosmicEventType,
  magnitude: number,
  affectedWorldIds: ReadonlyArray<WorldId>,
  durationUs: bigint,
): CosmicEvent {
  return {
    eventId: state.idGen.generate(),
    type,
    magnitude,
    affectedWorldIds,
    status: 'PREDICTED',
    predictedAt: state.clock.now(),
    activatedAt: null,
    endedAt: null,
    durationUs,
  };
}

function predictEvent(
  state: CosmicEventState,
  type: CosmicEventType,
  magnitude: number,
  affectedWorldIds: ReadonlyArray<WorldId>,
  durationUs: bigint,
): CosmicEvent | CosmicError {
  const err = validatePredictInputs(state, magnitude, affectedWorldIds);
  if (err !== null) return err;
  const event = buildCosmicEvent(state, type, magnitude, affectedWorldIds, durationUs);
  state.events.set(event.eventId, event);
  state.logger.info('Cosmic event predicted: ' + event.eventId + ' type=' + type);
  return event;
}

function activateEvent(
  state: CosmicEventState,
  eventId: EventId,
): { success: true } | { success: false; error: CosmicError } {
  return transitionEvent(
    state,
    eventId,
    'PREDICTED',
    'ACTIVE',
    'event-not-found',
    'already-active',
  );
}

function waneEvent(
  state: CosmicEventState,
  eventId: EventId,
): { success: true } | { success: false; error: CosmicError } {
  return transitionEvent(state, eventId, 'ACTIVE', 'WANING', 'event-not-found', 'already-active');
}

function endEvent(
  state: CosmicEventState,
  eventId: EventId,
): { success: true } | { success: false; error: CosmicError } {
  return transitionEvent(state, eventId, 'WANING', 'ENDED', 'event-not-found', 'already-active');
}

function measureImpact(
  state: CosmicEventState,
  eventId: EventId,
  worldId: WorldId,
): WorldImpact | CosmicError {
  const event = state.events.get(eventId);
  if (event === undefined) {
    state.logger.error('Event not found: ' + eventId);
    return 'event-not-found';
  }
  if (event.status === 'ENDED') {
    state.logger.warn('Cannot measure impact on ended event: ' + eventId);
    return 'event-ended';
  }
  if (!state.worlds.has(worldId)) {
    state.logger.error('World not found: ' + worldId);
    return 'world-not-found';
  }
  const impact: WorldImpact = {
    impactId: state.idGen.generate(),
    eventId,
    worldId,
    effectType: EFFECT_TYPE_MAP[event.type],
    severity: computeSeverity(event.magnitude),
    measuredAt: state.clock.now(),
  };
  state.logger.info('Impact measured for event ' + eventId + ' on world ' + worldId);
  return impact;
}

function getEvent(state: CosmicEventState, eventId: EventId): CosmicEvent | undefined {
  return state.events.get(eventId);
}

function listEvents(
  state: CosmicEventState,
  worldId?: WorldId,
  status?: CosmicEventStatus,
): ReadonlyArray<CosmicEvent> {
  const result: CosmicEvent[] = [];
  for (const event of state.events.values()) {
    if (status !== undefined && event.status !== status) continue;
    if (worldId !== undefined && !event.affectedWorldIds.includes(worldId)) continue;
    result.push(event);
  }
  return result;
}

function getForecast(state: CosmicEventState): CosmicForecast {
  let upcomingCount = 0;
  let activeCount = 0;
  let highMagnitudeCount = 0;
  for (const event of state.events.values()) {
    if (event.status === 'PREDICTED') upcomingCount++;
    if (event.status === 'ACTIVE' || event.status === 'WANING') activeCount++;
    if (event.magnitude >= 7 && event.status !== 'ENDED') highMagnitudeCount++;
  }
  return { upcomingCount, activeCount, highMagnitudeCount };
}

// ── Factory ──────────────────────────────────────────────────────

export function createCosmicEventSystem(deps: {
  clock: CosmicClockPort;
  idGen: CosmicIdGeneratorPort;
  logger: CosmicLoggerPort;
}): CosmicEventSystem {
  const state: CosmicEventState = {
    worlds: new Set(),
    events: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerWorld: (worldId) => registerWorld(state, worldId),
    predictEvent: (type, magnitude, affectedWorldIds, durationUs) =>
      predictEvent(state, type, magnitude, affectedWorldIds, durationUs),
    activateEvent: (eventId) => activateEvent(state, eventId),
    waneEvent: (eventId) => waneEvent(state, eventId),
    endEvent: (eventId) => endEvent(state, eventId),
    measureImpact: (eventId, worldId) => measureImpact(state, eventId, worldId),
    getEvent: (eventId) => getEvent(state, eventId),
    listEvents: (worldId, status) => listEvents(state, worldId, status),
    getForecast: () => getForecast(state),
  };
}
