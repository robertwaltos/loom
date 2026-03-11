/**
 * Transit Request Service — Player-side world transit initiation.
 *
 * Bible v1.1 Part 6: The Silfen Weave — Seamless World Transitions
 *
 * Players request transit between worlds. This service validates
 * eligibility and queues approved requests for the WeaveOrchestrator:
 *
 *   1. Validate the requesting dynasty is active and present
 *   2. Validate the destination world exists and is accessible
 *   3. Check lattice integrity (degraded worlds may block transit)
 *   4. Ensure the entity is not already in transit
 *   5. Queue the transit request for WeaveOrchestrator processing
 *
 * The service never executes the transit — it only validates and queues.
 * The WeaveOrchestrator + WeaveSystem handle the actual ECS mutation
 * and event emission.
 */

// ─── Port Interfaces ────────────────────────────────────────────────

export interface TransitPresencePort {
  readonly getStatus: (dynastyId: string) => string;
  readonly getWorldId: (dynastyId: string) => string | undefined;
}

export interface TransitWorldPort {
  readonly exists: (worldId: string) => boolean;
  readonly getIntegrity: (worldId: string) => number;
}

export interface TransitEntityPort {
  readonly getEntityForDynasty: (dynastyId: string) => string | undefined;
  readonly isInTransit: (entityId: string) => boolean;
}

export interface TransitQueuePort {
  readonly enqueue: (request: QueuedTransitRequest) => void;
  readonly getPendingCount: () => number;
}

export interface QueuedTransitRequest {
  readonly requestId: string;
  readonly entityId: string;
  readonly dynastyId: string;
  readonly sourceWorldId: string;
  readonly destinationWorldId: string;
  readonly requestedAt: number;
}

export interface TransitIdPort {
  readonly next: () => string;
}

export interface TransitClockPort {
  readonly nowMicroseconds: () => number;
}

// ─── Types ──────────────────────────────────────────────────────────

export interface TransitRequestParams {
  readonly dynastyId: string;
  readonly destinationWorldId: string;
}

export type TransitRequestResult =
  | { readonly ok: true; readonly value: TransitRequestSuccess }
  | { readonly ok: false; readonly error: TransitRequestError };

export interface TransitRequestSuccess {
  readonly requestId: string;
  readonly entityId: string;
  readonly sourceWorldId: string;
  readonly destinationWorldId: string;
}

export interface TransitRequestError {
  readonly code: TransitErrorCode;
  readonly message: string;
}

export type TransitErrorCode =
  | 'dynasty_offline'
  | 'dynasty_no_world'
  | 'entity_not_found'
  | 'already_in_transit'
  | 'destination_unknown'
  | 'same_world'
  | 'integrity_too_low';

// ─── Config ─────────────────────────────────────────────────────────

export interface TransitRequestConfig {
  readonly minIntegrityForTransit: number;
}

export const DEFAULT_TRANSIT_CONFIG: TransitRequestConfig = {
  minIntegrityForTransit: 10,
};

// ─── Deps ───────────────────────────────────────────────────────────

export interface TransitRequestDeps {
  readonly presence: TransitPresencePort;
  readonly worlds: TransitWorldPort;
  readonly entities: TransitEntityPort;
  readonly queue: TransitQueuePort;
  readonly idGenerator: TransitIdPort;
  readonly clock: TransitClockPort;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface TransitRequestService {
  readonly requestTransit: (params: TransitRequestParams) => TransitRequestResult;
  readonly getPendingCount: () => number;
  readonly getStats: () => TransitRequestStats;
}

export interface TransitRequestStats {
  readonly totalRequests: number;
  readonly approvedRequests: number;
  readonly rejectedRequests: number;
}

// ─── State ──────────────────────────────────────────────────────────

interface TransitState {
  readonly deps: TransitRequestDeps;
  readonly config: TransitRequestConfig;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createTransitRequestService(
  deps: TransitRequestDeps,
  config?: Partial<TransitRequestConfig>,
): TransitRequestService {
  const state: TransitState = {
    deps,
    config: { ...DEFAULT_TRANSIT_CONFIG, ...config },
    totalRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
  };

  return {
    requestTransit: (params) => requestTransitImpl(state, params),
    getPendingCount: () => deps.queue.getPendingCount(),
    getStats: () => buildStats(state),
  };
}

// ─── Request Processing ─────────────────────────────────────────────

function requestTransitImpl(
  state: TransitState,
  params: TransitRequestParams,
): TransitRequestResult {
  state.totalRequests += 1;

  const validation = validateRequest(state, params);
  if (!validation.ok) {
    state.rejectedRequests += 1;
    return validation;
  }

  return enqueueTransit(state, params, validation.value);
}

// ─── Validation ─────────────────────────────────────────────────────

interface ValidatedTransit {
  readonly entityId: string;
  readonly sourceWorldId: string;
}

type ValidationResult =
  | { readonly ok: true; readonly value: ValidatedTransit }
  | { readonly ok: false; readonly error: TransitRequestError };

function validateRequest(state: TransitState, params: TransitRequestParams): ValidationResult {
  const sourceWorldId = resolveSourceWorld(state, params.dynastyId);
  if (!sourceWorldId.ok) return sourceWorldId;

  const entityId = resolveEntity(state, params.dynastyId);
  if (!entityId.ok) return entityId;

  const destCheck = validateDestination(state, params, sourceWorldId.value);
  if (!destCheck.ok) return destCheck;

  return {
    ok: true,
    value: { entityId: entityId.value, sourceWorldId: sourceWorldId.value },
  };
}

type StringResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: TransitRequestError };

function resolveSourceWorld(state: TransitState, dynastyId: string): StringResult {
  const status = state.deps.presence.getStatus(dynastyId);
  if (status === 'offline') {
    return fail('dynasty_offline', 'Dynasty must be online to request transit');
  }

  const worldId = state.deps.presence.getWorldId(dynastyId);
  if (worldId === undefined) {
    return fail('dynasty_no_world', 'Dynasty has no current world');
  }

  return { ok: true, value: worldId };
}

function resolveEntity(state: TransitState, dynastyId: string): StringResult {
  const entityId = state.deps.entities.getEntityForDynasty(dynastyId);
  if (entityId === undefined) {
    return fail('entity_not_found', 'No entity found for dynasty');
  }

  if (state.deps.entities.isInTransit(entityId)) {
    return fail('already_in_transit', 'Entity is already in transit');
  }

  return { ok: true, value: entityId };
}

function validateDestination(
  state: TransitState,
  params: TransitRequestParams,
  sourceWorldId: string,
): ValidationResult {
  if (!state.deps.worlds.exists(params.destinationWorldId)) {
    return fail('destination_unknown', 'Destination world does not exist');
  }

  if (sourceWorldId === params.destinationWorldId) {
    return fail('same_world', 'Cannot transit to the same world');
  }

  const integrity = state.deps.worlds.getIntegrity(params.destinationWorldId);
  if (integrity < state.config.minIntegrityForTransit) {
    return fail('integrity_too_low', 'Destination world lattice integrity too low for transit');
  }

  return { ok: true, value: { entityId: '', sourceWorldId } };
}

// ─── Queue ──────────────────────────────────────────────────────────

function enqueueTransit(
  state: TransitState,
  params: TransitRequestParams,
  validated: ValidatedTransit,
): TransitRequestResult {
  const requestId = state.deps.idGenerator.next();
  const now = state.deps.clock.nowMicroseconds();

  state.deps.queue.enqueue({
    requestId,
    entityId: validated.entityId,
    dynastyId: params.dynastyId,
    sourceWorldId: validated.sourceWorldId,
    destinationWorldId: params.destinationWorldId,
    requestedAt: now,
  });

  state.approvedRequests += 1;

  return {
    ok: true,
    value: {
      requestId,
      entityId: validated.entityId,
      sourceWorldId: validated.sourceWorldId,
      destinationWorldId: params.destinationWorldId,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function fail(
  code: TransitErrorCode,
  message: string,
): { readonly ok: false; readonly error: TransitRequestError } {
  return { ok: false, error: { code, message } };
}

function buildStats(state: TransitState): TransitRequestStats {
  return {
    totalRequests: state.totalRequests,
    approvedRequests: state.approvedRequests,
    rejectedRequests: state.rejectedRequests,
  };
}
