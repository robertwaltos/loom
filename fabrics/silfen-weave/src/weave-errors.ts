/**
 * Silfen Weave errors — structured error types for lattice transit.
 *
 * Follows the same pattern as nakama-fabric/kalon-errors but scoped
 * to the Silfen Weave fabric. Hexagonal: no cross-fabric imports.
 */

export type WeaveErrorCode =
  | 'NODE_NOT_FOUND'
  | 'NODE_ALREADY_EXISTS'
  | 'ROUTE_NOT_FOUND'
  | 'LOCK_NOT_FOUND'
  | 'LOCK_ALREADY_EXISTS'
  | 'LOCK_INVALID_TRANSITION'
  | 'COHERENCE_OUT_OF_RANGE'
  | 'BEACON_INVALID_STATUS'
  | 'TRANSIT_FAILED'
  | 'VESSEL_NOT_FOUND'
  | 'VESSEL_ALREADY_EXISTS'
  | 'VESSEL_INSUFFICIENT_FUEL'
  | 'VESSEL_NOT_DOCKED'
  | 'MISSION_NOT_FOUND'
  | 'MISSION_INVALID_PHASE'
  | 'WORLD_ALREADY_SURVEYED'
  | 'SURVEY_PRIORITY_DENIED';

export class WeaveError extends Error {
  readonly code: WeaveErrorCode;
  readonly context: Readonly<Record<string, unknown>>;

  constructor(code: WeaveErrorCode, message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'WeaveError';
    this.code = code;
    this.context = context;
  }
}

export function nodeNotFound(nodeId: string): WeaveError {
  return new WeaveError('NODE_NOT_FOUND', `Lattice node ${nodeId} not found`, { nodeId });
}

export function nodeAlreadyExists(nodeId: string): WeaveError {
  return new WeaveError('NODE_ALREADY_EXISTS', `Lattice node ${nodeId} already exists`, { nodeId });
}

export function routeNotFound(originId: string, destinationId: string): WeaveError {
  return new WeaveError('ROUTE_NOT_FOUND', `No route from ${originId} to ${destinationId}`, {
    originId,
    destinationId,
  });
}

export function lockNotFound(lockId: string): WeaveError {
  return new WeaveError('LOCK_NOT_FOUND', `Frequency lock ${lockId} not found`, { lockId });
}

export function lockAlreadyExists(lockId: string): WeaveError {
  return new WeaveError('LOCK_ALREADY_EXISTS', `Frequency lock ${lockId} already exists`, {
    lockId,
  });
}

export function lockInvalidTransition(lockId: string, from: string, to: string): WeaveError {
  return new WeaveError(
    'LOCK_INVALID_TRANSITION',
    `Invalid lock transition for ${lockId}: ${from} -> ${to}`,
    { lockId, from, to },
  );
}

export function coherenceOutOfRange(lockId: string, value: number): WeaveError {
  return new WeaveError(
    'COHERENCE_OUT_OF_RANGE',
    `Coherence ${String(value)} out of range [0, 1] for lock ${lockId}`,
    { lockId, value },
  );
}

export function beaconInvalidStatus(nodeId: string, status: string): WeaveError {
  return new WeaveError(
    'BEACON_INVALID_STATUS',
    `Invalid beacon status ${status} for node ${nodeId}`,
    { nodeId, status },
  );
}

export function transitFailed(lockId: string, reason: string): WeaveError {
  return new WeaveError('TRANSIT_FAILED', `Transit ${lockId} failed: ${reason}`, {
    lockId,
    reason,
  });
}

export function vesselNotFound(vesselId: string): WeaveError {
  return new WeaveError('VESSEL_NOT_FOUND', `Survey vessel ${vesselId} not found`, { vesselId });
}

export function vesselAlreadyExists(vesselId: string): WeaveError {
  return new WeaveError('VESSEL_ALREADY_EXISTS', `Survey vessel ${vesselId} already exists`, {
    vesselId,
  });
}

export function vesselInsufficientFuel(vesselId: string, required: number): WeaveError {
  return new WeaveError(
    'VESSEL_INSUFFICIENT_FUEL',
    `Vessel ${vesselId} has insufficient fuel (needs ${required.toFixed(2)})`,
    { vesselId, required },
  );
}

export function vesselNotDocked(vesselId: string): WeaveError {
  return new WeaveError('VESSEL_NOT_DOCKED', `Vessel ${vesselId} is not docked`, { vesselId });
}

export function missionNotFound(missionId: string): WeaveError {
  return new WeaveError('MISSION_NOT_FOUND', `Survey mission ${missionId} not found`, {
    missionId,
  });
}

export function missionInvalidPhase(missionId: string, current: string, expected: string): WeaveError {
  return new WeaveError(
    'MISSION_INVALID_PHASE',
    `Mission ${missionId} is in phase ${current}, expected ${expected}`,
    { missionId, current, expected },
  );
}

export function worldAlreadySurveyed(worldId: string): WeaveError {
  return new WeaveError('WORLD_ALREADY_SURVEYED', `World ${worldId} has already been surveyed`, {
    worldId,
  });
}

export function surveyPriorityDenied(dynastyId: string, priority: string): WeaveError {
  return new WeaveError(
    'SURVEY_PRIORITY_DENIED',
    `Dynasty ${dynastyId} has survey priority ${priority} which cannot initiate missions`,
    { dynastyId, priority },
  );
}
